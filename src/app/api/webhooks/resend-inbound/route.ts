/**
 * Resend Inbound Email Webhook
 * POST /api/webhooks/resend-inbound
 *
 * Resend가 keryx.kr로 수신된 이메일을 이 엔드포인트로 전달합니다.
 * 수신된 이메일은 inbound_emails 테이블에 저장되며,
 * 첨부파일은 Supabase Storage의 'email-attachments' 버킷에 저장됩니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 서비스 롤 클라이언트 (RLS 우회, webhook 수신용)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error('Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

// Resend Inbound 이메일 페이로드 타입
interface ResendAttachment {
  filename: string;
  content_type: string;
  size: number;
  content?: string; // Base64 인코딩된 파일 내용
}

interface ResendInboundPayload {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from: string;
    to: string[];
    subject?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    attachments?: ResendAttachment[];
  };
}

// 이메일 주소에서 이름과 주소 파싱
// 예: "홍길동 <hong@example.com>" → { name: "홍길동", email: "hong@example.com" }
function parseEmailAddress(raw: string): { name: string | null; email: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || null, email: match[2].trim() };
  }
  return { name: null, email: raw.trim() };
}

// 안전한 파일명 생성 (특수문자 제거)
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9가-힣\-_.]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

// 첨부파일을 Supabase Storage에 업로드
async function uploadAttachments(
  supabase: ReturnType<typeof createClient> | any, // eslint-disable-line @typescript-eslint/no-explicit-any
  emailId: string,
  attachments: ResendAttachment[]
): Promise<Array<{ filename: string; storage_path: string; content_type: string; size: number; public_url: string }>> {
  const uploaded: Array<{ filename: string; storage_path: string; content_type: string; size: number; public_url: string }> = [];

  for (const attachment of attachments) {
    if (!attachment.content) {
      console.warn(`[Resend Inbound] 첨부파일 내용 없음: ${attachment.filename}`);
      continue;
    }

    try {
      // Base64 디코딩
      const buffer = Buffer.from(attachment.content, 'base64');
      const safeFilename = sanitizeFilename(attachment.filename || 'attachment');
      const timestamp = Date.now();
      // 저장 경로: email-attachments/{emailId}/{timestamp}_{filename}
      const storagePath = `${emailId}/${timestamp}_${safeFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('email-attachments')
        .upload(storagePath, buffer, {
          contentType: attachment.content_type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error(`[Resend Inbound] 첨부파일 업로드 실패: ${attachment.filename}`, uploadError);
        continue;
      }

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('email-attachments')
        .getPublicUrl(storagePath);

      uploaded.push({
        filename: attachment.filename,
        storage_path: storagePath,
        content_type: attachment.content_type || 'application/octet-stream',
        size: attachment.size || buffer.length,
        public_url: urlData.publicUrl,
      });

      console.log(`[Resend Inbound] 첨부파일 저장 완료: ${storagePath}`);
    } catch (err) {
      console.error(`[Resend Inbound] 첨부파일 처리 오류: ${attachment.filename}`, err);
    }
  }

  return uploaded;
}

export async function POST(req: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await req.json() as ResendInboundPayload;

    // Resend 이벤트 타입 확인
    if (body.type !== 'email.received') {
      console.log(`[Resend Inbound] 무시된 이벤트 타입: ${body.type}`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    const emailData = body.data;
    if (!emailData) {
      return NextResponse.json({ error: 'data 필드 없음' }, { status: 400 });
    }

    // 발신자 파싱
    const { name: fromName, email: fromEmail } = parseEmailAddress(emailData.from || '');

    // 수신자 (첫 번째)
    const toEmail = Array.isArray(emailData.to) && emailData.to.length > 0
      ? emailData.to[0]
      : 'unknown@keryx.kr';

    // message_id 중복 방지
    const messageId = emailData.email_id || emailData.headers?.['message-id'] || null;

    const supabase = getServiceClient();

    // to_email 기준으로 담당 직원 자동 라우팅
    let assignedUserId: string | null = null;
    try {
      const { data: staffEmail } = await supabase
        .from('staff_email_addresses')
        .select('user_id')
        .eq('email_address', toEmail.toLowerCase().trim())
        .eq('is_active', true)
        .single();
      if (staffEmail) {
        assignedUserId = staffEmail.user_id;
        console.log(`[Resend Inbound] 담당 직원 라우팅: ${toEmail} → user_id: ${assignedUserId}`);
      }
    } catch (routeErr) {
      // staff_email_addresses 테이블이 없거나 조회 실패 시 무시 (라우팅 없이 저장)
      console.warn('[Resend Inbound] 직원 라우팅 조회 실패 (무시):', routeErr);
    }

    // 첨부파일 처리 (있을 경우)
    let attachmentsMeta: Array<{
      filename: string;
      storage_path: string;
      content_type: string;
      size: number;
      public_url: string;
    }> = [];

    const emailFolderKey = messageId
      ? messageId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60)
      : `email_${Date.now()}`;

    if (emailData.attachments && emailData.attachments.length > 0) {
      console.log(`[Resend Inbound] 첨부파일 ${emailData.attachments.length}개 처리 시작`);
      attachmentsMeta = await uploadAttachments(supabase, emailFolderKey, emailData.attachments);
      console.log(`[Resend Inbound] 첨부파일 ${attachmentsMeta.length}개 저장 완료`);
    }

    // Supabase에 이메일 저장 (첨부파일 메타데이터 포함)
    const { error } = await supabase
      .from('inbound_emails')
      .insert({
        message_id: messageId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject: emailData.subject || '(제목 없음)',
        text_body: emailData.text || null,
        html_body: emailData.html || null,
        attachments: attachmentsMeta.length > 0 ? attachmentsMeta : null,
        raw_payload: body,
        assigned_user_id: assignedUserId,
        is_read: false,
        is_starred: false,
        is_archived: false,
        labels: [],
        received_at: body.created_at ? new Date(body.created_at).toISOString() : new Date().toISOString(),
      });

    if (error) {
      // 중복 message_id는 무시 (unique constraint)
      if (error.code === '23505') {
        console.log(`[Resend Inbound] 중복 이메일 무시: ${messageId}`);
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error('[Resend Inbound] DB 저장 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Resend Inbound] 이메일 저장 완료: ${fromEmail} → ${toEmail} | ${emailData.subject} | 첨부파일: ${attachmentsMeta.length}개`);
    return NextResponse.json({
      ok: true,
      attachments_saved: attachmentsMeta.length,
    });

  } catch (err) {
    console.error('[Resend Inbound] 처리 오류:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}

// Resend webhook 검증을 위해 GET 요청도 허용 (헬스 체크)
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'resend-inbound-webhook', features: ['attachments'] });
}
