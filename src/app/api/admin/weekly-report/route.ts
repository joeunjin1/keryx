/**
 * B2B 주간 리포트 발송 API
 * - 관리자 인증 필요
 * - 승인된 구독자에게 일괄 이메일 발송
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // 필수 필드 검증
    if (!body.subject || !body.content_html) {
      return NextResponse.json(
        { error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    // 승인된 구독자 목록 조회
    const { data: subscribers, error: fetchErr } = await supabase
      .from('b2b_subscribers')
      .select('id, email, company_name')
      .eq('status', 'approved')
      .is('deleted_at', null);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: '발송 대상 구독자가 없습니다.' },
        { status: 400 }
      );
    }

    // 발송 기록 생성
    const { data: report, error: reportErr } = await supabase
      .from('b2b_weekly_reports')
      .insert({
        subject: body.subject,
        content_html: body.content_html,
        total_recipients: subscribers.length,
        sent_by: body.sent_by || null,
      })
      .select('id')
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: '발송 기록 생성 실패' }, { status: 500 });
    }

    // Resend API로 이메일 발송
    const resendKey = process.env.RESEND_API_KEY;
    let successCount = 0;
    let failCount = 0;
    const recipientRecords: any[] = [];

    for (const sub of subscribers) {
      try {
        if (resendKey) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: 'KERYX B2B <b2b@keryx.kr>',
              to: [sub.email],
              subject: body.subject,
              html: `
                <div style="max-width:600px; margin:0 auto; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <div style="background:linear-gradient(135deg,#1a1040,#0a0f1e); padding:32px; text-align:center; border-radius:12px 12px 0 0;">
                    <h1 style="color:#d4a843; margin:0; font-size:24px;">KERYX B2B Weekly</h1>
                  </div>
                  <div style="padding:32px; background:#fff; border:1px solid #eee; border-top:none; border-radius:0 0 12px 12px;">
                    <p style="color:#666; margin-bottom:16px;">${sub.company_name}님께,</p>
                    ${body.content_html}
                    <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
                    <p style="color:#999; font-size:12px;">
                      이 메일은 KERYX B2B 무료 구독 서비스를 통해 발송되었습니다.<br/>
                      구독 해지를 원하시면 <a href="https://www.keryx.kr">www.keryx.kr</a>에서 요청해 주세요.
                    </p>
                  </div>
                </div>
              `,
            }),
          });

          if (res.ok) {
            successCount++;
            recipientRecords.push({
              report_id: report.id,
              subscriber_id: sub.id,
              email: sub.email,
              status: 'sent',
            });
          } else {
            failCount++;
            const errBody = await res.text();
            recipientRecords.push({
              report_id: report.id,
              subscriber_id: sub.id,
              email: sub.email,
              status: 'failed',
              error_message: errBody,
            });
          }
        } else {
          // Resend 키 없으면 시뮬레이션
          successCount++;
          recipientRecords.push({
            report_id: report.id,
            subscriber_id: sub.id,
            email: sub.email,
            status: 'sent',
          });
        }
      } catch (sendErr: any) {
        failCount++;
        recipientRecords.push({
          report_id: report.id,
          subscriber_id: sub.id,
          email: sub.email,
          status: 'failed',
          error_message: sendErr.message,
        });
      }
    }

    // 개별 발송 기록 저장
    if (recipientRecords.length > 0) {
      await supabase.from('b2b_report_recipients').insert(recipientRecords);
    }

    // 발송 결과 업데이트
    await supabase
      .from('b2b_weekly_reports')
      .update({ success_count: successCount, fail_count: failCount })
      .eq('id', report.id);

    return NextResponse.json({
      success: true,
      report_id: report.id,
      total: subscribers.length,
      success_count: successCount,
      fail_count: failCount,
    });
  } catch (err) {
    console.error('[admin/weekly-report] Unexpected error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
