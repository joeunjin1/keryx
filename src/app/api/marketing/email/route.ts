import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/check-role';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'KERYX <noreply@keryx.kr>';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(['admin', 'marketing']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, recipient_ids, subject, body: emailBody } = body;

  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 });
  }
  if (!recipient_ids || recipient_ids.length === 0) {
    return NextResponse.json({ error: '수신자를 선택해주세요.' }, { status: 400 });
  }

  const supabase = createClient();

  // 수신자 이메일 조회
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, display_name')
    .in('id', recipient_ids);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const recipients = profiles ?? [];
  let successCount = 0;
  let failedCount = 0;
  const results: { id: string; email: string; success: boolean; error?: string }[] = [];

  // 개별 발송 (각 수신자에게 개인화된 이메일)
  for (const recipient of recipients) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient.email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #e11d48; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">KERYX</h2>
            </div>
            <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #374151; margin-bottom: 16px;">안녕하세요, ${recipient.display_name}님.</p>
              <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${emailBody.replace(/\n/g, '<br/>')}</div>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">본 이메일은 KERYX에서 발송되었습니다.</p>
            </div>
          </div>
        `,
      });
      successCount++;
      results.push({ id: recipient.id, email: recipient.email, success: true });
    } catch (err) {
      failedCount++;
      results.push({ id: recipient.id, email: recipient.email, success: false, error: String(err) });
    }
  }

  // 발송 이력 저장
  try {
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .insert({
        sender_id: user.id,
        type: type === 'bulk' ? 'bulk' : 'single',
        subject,
        body: emailBody,
        total_count: recipients.length,
        success_count: successCount,
        failed_count: failedCount,
        status: failedCount === 0 ? 'completed' : successCount === 0 ? 'failed' : 'partial',
      })
      .select('id')
      .single();

    if (campaign) {
      // 수신자 이력 저장
      await supabase.from('email_campaign_recipients').insert(
        results.map(r => ({
          campaign_id: campaign.id,
          recipient_id: r.id,
          email: r.email,
          status: r.success ? 'sent' : 'failed',
          error_message: r.error,
        }))
      );
    }
  } catch (historyErr) {
    console.error('이력 저장 실패:', historyErr);
  }

  return NextResponse.json({
    success: successCount,
    failed: failedCount,
    message: successCount > 0
      ? `${successCount}명에게 이메일을 발송했습니다.${failedCount > 0 ? ` (${failedCount}건 실패)` : ''}`
      : '이메일 발송에 실패했습니다.',
  });
}
