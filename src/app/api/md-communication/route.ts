/**
 * 통합 MD 소통 API
 * conversations + messages 테이블 기반 단일 소통 시스템
 * topic_type: general | market_research | factory_matching | sample_development | order_inquiry | inspection
 * sender enum: seller | md | system | factory
 * attachments: JSONB array [{ url, path, name, size, type, is_image }]
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getTopicTitle(topicType: string): string {
  const titles: Record<string, string> = {
    general: '일반 문의',
    market_research: '시장조사 의뢰',
    factory_matching: '공장발굴·매칭 의뢰',
    sample_development: '샘플개발 의뢰',
    order_inquiry: '주문 문의',
    inspection: '검수 문의',
  };
  return titles[topicType] || '문의';
}

function getSenderRole(kind?: string): 'seller' | 'md' | 'system' | 'factory' {
  if (kind === 'md' || kind === 'admin') return 'md';
  if (kind === 'factory') return 'factory';
  return 'seller';
}

function detectLang(text: string): string {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  return 'ko';
}

// GET: 대화 목록 또는 특정 대화 조회
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('id');
    const topicType = searchParams.get('topic_type');
    const status = searchParams.get('status');

    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('kind, display_name')
      .eq('id', user.id)
      .single();

    const isAdminOrMd = profile?.kind === 'admin' || profile?.kind === 'md';

    if (conversationId) {
      const { data: conv, error } = await adminClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const { data: msgs } = await adminClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      let buyerProfile = null;
      if (conv?.seller_id) {
        const { data: seller } = await adminClient
          .from('sellers')
          .select('id, business_name, contact_name, contact_phone, contact_email, country, current_grade, assigned_md_id')
          .eq('id', conv.seller_id)
          .single();
        buyerProfile = seller;
      }

      // 읽음 처리
      if (!isAdminOrMd && (conv?.unread_count_seller || 0) > 0) {
        await adminClient.from('conversations').update({ unread_count_seller: 0 }).eq('id', conversationId);
      } else if (isAdminOrMd && (conv?.unread_count_md || 0) > 0) {
        await adminClient.from('conversations').update({ unread_count_md: 0 }).eq('id', conversationId);
      }

      return NextResponse.json({ conversation: conv, messages: msgs || [], buyerProfile });
    }

    // 대화 목록 조회
    // seller의 경우 sellers.id로 필터링 (conversations.seller_id는 sellers.id FK)
    let sellerRecordId: string | null = null;
    if (!isAdminOrMd) {
      const { data: sellerRecord } = await adminClient
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      sellerRecordId = sellerRecord?.id || null;
    }

    let query = adminClient
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (!isAdminOrMd) {
      if (sellerRecordId) {
        query = query.eq('seller_id', sellerRecordId);
      } else {
        return NextResponse.json({ conversations: [] });
      }
    }
    if (topicType && topicType !== 'all') {
      query = query.eq('topic_type', topicType);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let enrichedData = data || [];
    if (isAdminOrMd && enrichedData.length > 0) {
      const sellerIds = [...new Set(enrichedData.map((c: any) => c.seller_id).filter(Boolean))];
      if (sellerIds.length > 0) {
        const { data: sellers } = await adminClient
          .from('sellers')
          .select('id, business_name, contact_name')
          .in('id', sellerIds);
        const sellerMap = Object.fromEntries((sellers || []).map((s: any) => [s.id, s]));
        enrichedData = enrichedData.map((c: any) => ({
          ...c,
          buyer_info: sellerMap[c.seller_id] || null,
        }));
      }
    }

    return NextResponse.json({ conversations: enrichedData });
  } catch (err: any) {
    console.error('[md-communication GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: 새 대화 생성 또는 메시지 전송
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('kind, display_name')
      .eq('id', user.id)
      .single();

    // 새 대화 생성
    if (action === 'create_conversation') {
      const {
        topic_type = 'general',
        topic_id,
        title,
        initial_message,
        metadata = {},
        md_id,
      } = body;

      const { data: seller } = await adminClient
        .from('sellers')
        .select('id, business_name, contact_name, contact_phone, contact_email, country, current_grade, assigned_md_id')
        .eq('user_id', user.id)
        .single();

      if (!seller) {
        return NextResponse.json({ error: '셀러 정보를 찾을 수 없습니다. 셀러 등록이 필요합니다.' }, { status: 400 });
      }

      // assigned_md_id는 internal_users.id를 참조해야 함
      let assignedMdId: string | null = md_id || null;
      if (!assignedMdId && seller.assigned_md_id) {
        // assigned_md_id가 internal_users.id인지 확인
        const { data: mdUser } = await adminClient
          .from('internal_users')
          .select('id')
          .eq('id', seller.assigned_md_id)
          .single();
        if (mdUser) assignedMdId = mdUser.id;
      }

      const convData: any = {
        seller_id: seller.id,  // sellers.id (FK to sellers table)
        md_id: assignedMdId,
        topic_type,
        title: title || getTopicTitle(topic_type),
        status: 'open',
        metadata: {
          ...metadata,
          buyer_company: seller?.business_name,
          buyer_name: seller?.contact_name,
          buyer_grade: seller?.current_grade,
        },
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unread_count_seller: 0,
        unread_count_md: initial_message ? 1 : 0,
      };
      if (topic_id) convData.topic_id = topic_id;

      const { data: conv, error: convErr } = await adminClient
        .from('conversations')
        .insert(convData)
        .select()
        .single();

      if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

      if (initial_message) {
        const senderRole = getSenderRole(profile?.kind);
        const msgContent = typeof initial_message === 'string' ? initial_message : initial_message.content || '';
        const msgMeta = typeof initial_message === 'object' ? (initial_message.metadata || {}) : {};
        const msgType = typeof initial_message === 'object' ? (initial_message.message_type || 'form_submission') : 'form_submission';

        const msgAttachments = typeof initial_message === 'object' ? (initial_message.attachments || null) : null;
        const initInsertData: any = {
          conversation_id: conv.id,
          sender: senderRole,
          sender_user_id: user.id,
          body_original: msgContent,
          source_lang: detectLang(msgContent),
          body_ko: msgContent,
          message_type: msgType,
          metadata: { ...msgMeta, topic: topic_type || 'general' },
        };
        if (msgAttachments) initInsertData.attachments = msgAttachments;
        await adminClient.from('messages').insert(initInsertData);

        await adminClient.from('conversations').update({
          last_message: msgContent.slice(0, 100),
        }).eq('id', conv.id);
      }

      return NextResponse.json({ success: true, conversationId: conv.id, conversation: conv });
    }

    // 메시지 전송 (파일 첨부 포함)
    if (action === 'send_message') {
      const {
        conversation_id,
        content,
        message_type = 'text',
        metadata: msgMeta = {},
        attachments = null,  // [{ url, path, name, size, type, is_image }]
      } = body;
      if (!conversation_id || (!content && !(attachments?.length))) {
        return NextResponse.json({ error: 'conversation_id와 content 또는 attachments가 필요합니다.' }, { status: 400 });
      }

      const senderRole = getSenderRole(profile?.kind);

      // 대화의 topic_type 가져오기
      const { data: convForTopic } = await adminClient
        .from('conversations')
        .select('topic_type')
        .eq('id', conversation_id)
        .single();

      const msgBody = content || (attachments?.length ? `[파일 ${attachments.length}개 첨부]` : '');
      const sendInsertData: any = {
        conversation_id,
        sender: senderRole,
        sender_user_id: user.id,
        body_original: msgBody,
        source_lang: detectLang(msgBody),
        body_ko: msgBody,
        message_type: attachments?.length ? 'file' : message_type,
        metadata: { ...msgMeta, topic: convForTopic?.topic_type || 'general' },
      };
      if (attachments?.length) sendInsertData.attachments = attachments;

      const { data: msg, error: msgErr } = await adminClient
        .from('messages')
        .insert(sendInsertData)
        .select()
        .single();

      if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

      // 읽지 않은 메시지 카운트 업데이트
      const { data: conv } = await adminClient
        .from('conversations')
        .select('unread_count_md, unread_count_seller')
        .eq('id', conversation_id)
        .single();

      const updateData: any = {
        last_message: attachments?.length ? `📎 ${attachments[0]?.name || '파일'}` : msgBody.slice(0, 100),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (senderRole === 'seller') {
        updateData.unread_count_md = (conv?.unread_count_md || 0) + 1;
      } else {
        updateData.unread_count_seller = (conv?.unread_count_seller || 0) + 1;
      }

      await adminClient.from('conversations').update(updateData).eq('id', conversation_id);

      return NextResponse.json({ success: true, message: msg });
    }

    return NextResponse.json({ error: '알 수 없는 action입니다.' }, { status: 400 });
  } catch (err: any) {
    console.error('[md-communication POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: 대화 상태 업데이트 (MD/관리자)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const body = await req.json();
    const { conversation_id, status, md_note, assigned_md_id } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (md_note !== undefined) updateData.md_note = md_note;
    if (assigned_md_id) updateData.md_id = assigned_md_id;

    const { error } = await adminClient
      .from('conversations')
      .update(updateData)
      .eq('id', conversation_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
