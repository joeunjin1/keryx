import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { translateBidirectional } from '@/lib/translation';

export async function POST(request: NextRequest) {
  try {
    // 1. 요청자 인증 확인 (일반 클라이언트로)
    const authClient = createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 권한 확인 (admin, md, inspector만 허용)
    const { data: profile } = await authClient
      .from('user_profiles')
      .select('kind, display_name')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'md', 'inspector'].includes(profile.kind)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    // 3. 요청 바디 파싱
    const body = await request.json();
    const { request_id, content, reply_type, is_internal } = body;

    if (!request_id || !content?.trim()) {
      return NextResponse.json({ error: 'request_id and content are required' }, { status: 400 });
    }

    // reply_type 결정
    const finalReplyType = reply_type ?? (profile.kind === 'admin' ? 'admin_reply' : 'md_reply');

    // 4. service_role 클라이언트로 INSERT (RLS 우회)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // internal_users에서 author_id 조회
    const { data: internalUser } = await serviceClient
      .from('internal_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // 자동 번역: 한국어 → 중국어, 중국어 → 한국어 (백그라운드, 실패해도 저장 진행)
    let contentKo = content.trim();
    let contentZh = '';
    try {
      const isChinese = /[\u4e00-\u9fff]/.test(content);
      const sourceLang = isChinese ? 'zh' : 'ko';
      const translated = await translateBidirectional(content.trim(), sourceLang);
      contentKo = translated.ko || content.trim();
      contentZh = translated.zh || '';
    } catch (transErr) {
      console.warn('[reply/route] translation skipped:', transErr);
    }

    // 번역 컬럼 포함 insert 데이터 구성
    const insertData: Record<string, unknown> = {
      request_id,
      author_id: internalUser?.id ?? null,
      author_name: profile.display_name ?? profile.kind,
      content: content.trim(),
      reply_type: finalReplyType,
    };
    // content_zh, content_ko 컬럼이 존재하면 추가 (없어도 graceful)
    if (contentZh) insertData.content_zh = contentZh;
    if (contentKo && contentKo !== content.trim()) insertData.content_ko = contentKo;

    const { data: reply, error: insertError } = await serviceClient
      .from('service_request_replies')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      // 번역 컬럼이 없어서 오류가 난 경우 컬럼 없이 재시도
      if (insertError.code === 'PGRST204' || insertError.message?.includes('column')) {
        console.warn('[reply/route] translation columns not found, retrying without:', insertError.message);
        const { data: replyRetry, error: retryError } = await serviceClient
          .from('service_request_replies')
          .insert({
            request_id,
            author_id: internalUser?.id ?? null,
            author_name: profile.display_name ?? profile.kind,
            content: content.trim(),
            reply_type: finalReplyType,
          })
          .select()
          .single();
        if (retryError) {
          console.error('[reply/route] retry insert error:', retryError);
          return NextResponse.json(
            { error: retryError.message, code: retryError.code },
            { status: 500 }
          );
        }
        return NextResponse.json({ reply: replyRetry }, { status: 201 });
      }
      console.error('[reply/route] insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message, code: insertError.code },
        { status: 500 }
      );
    }

    // 5. 서비스 요청 상태 업데이트 (pending/in_progress → replied)
    //    내부 메모(is_internal)일 때는 상태 변경 및 발송 기록 안 함
    if (!is_internal) {
      const { data: sr } = await serviceClient
        .from('service_requests')
        .select('id, status, seller_id, email, contact_name, product_name, service_type, request_no')
        .eq('id', request_id)
        .single();

      if (sr && (sr.status === 'pending' || sr.status === 'in_progress')) {
        await serviceClient
          .from('service_requests')
          .update({ status: 'replied' })
          .eq('id', request_id);
      }

      // 6. 발송 내역 기록 (report_send_logs)
      //    테이블이 없을 수 있으므로 오류 무시
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://keryx.kr';
        const reportUrl = sr?.request_no
          ? `${appUrl}/apply/status?no=${sr.request_no}`
          : `${appUrl}/apply/status?no=${request_id}`;

        const serviceTypeLabel: Record<string, string> = {
          'market-research': '시장조사',
          'factory-matching': '공장매칭',
          'sample-development': '샘플개발',
        };
        const typeLabel = serviceTypeLabel[sr?.service_type ?? ''] ?? '서비스';

        await serviceClient
          .from('report_send_logs')
          .insert({
            report_type: 'market_research',
            report_id: request_id,
            sent_by: internalUser?.id ?? null,
            sent_by_name: profile.display_name ?? profile.kind,
            sent_to_email: sr?.email ?? '',
            sent_to_name: sr?.contact_name ?? '',
            seller_id: sr?.seller_id ?? null,
            service_request_id: request_id,
            report_title: `[${typeLabel} 회신] ${sr?.product_name ?? ''}`,
            report_url: reportUrl,
            status: 'sent',
          });
      } catch (logErr) {
        // report_send_logs 테이블이 없어도 회신 자체는 성공 처리
        console.warn('[reply/route] send log insert skipped:', logErr);
      }

      // 7. 바이어 알림 생성 (seller_notifications)
      //    seller_id가 있을 때만 생성
      if (sr?.seller_id) {
        try {
          const serviceTypeLabelMap: Record<string, string> = {
            'market-research': '시장조사',
            'factory-matching': '공장매칭',
            'sample-development': '샘플개발',
          };
          const serviceTypeLabelZhMap: Record<string, string> = {
            'market-research': '市场调研',
            'factory-matching': '工厂匹配',
            'sample-development': '样品开发',
          };
          const tLabel = serviceTypeLabelMap[sr.service_type] ?? '서비스';
          const tLabelZh = serviceTypeLabelZhMap[sr.service_type] ?? '服务';

          await serviceClient
            .from('seller_notifications')
            .insert({
              seller_id: sr.seller_id,
              type: 'reply_received',
              title: `[${tLabel}] 담당 MD가 회신을 보냈습니다`,
              title_zh: `[${tLabelZh}] 负责MD已回复您的申请`,
              body: `"${sr.product_name ?? ''}" 건에 대한 MD 회신이 도착했습니다. 신청 현황 페이지에서 확인하세요.`,
              body_zh: `"${sr.product_name ?? ''}" 的MD回复已到达，请在申请状态页面查看。`,
              link_url: `/apply/status?no=${sr.request_no ?? request_id}`,
              sent_by_name: profile.display_name ?? 'KERYX MD',
              related_id: request_id,
              related_type: 'service_request',
            });
        } catch (notifErr) {
          // seller_notifications 테이블이 없어도 회신 자체는 성공 처리
          console.warn('[reply/route] notification insert skipped:', notifErr);
        }
      }
    }

    return NextResponse.json({ reply }, { status: 201 });

  } catch (err: any) {
    console.error('[reply/route] unexpected error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
