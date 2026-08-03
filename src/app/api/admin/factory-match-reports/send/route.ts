import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendEmail,
  sendSms,
  buildFactoryMatchReportEmail,
  buildFactoryMatchReportSms,
} from '@/lib/notifications';

// POST: 공장 매칭 보고서 발송 (이메일 + 문자)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { report_id, send_email: doEmail = true, send_sms: doSms = false, lang = 'ko' } = body;

  if (!report_id) {
    return NextResponse.json({ error: 'report_id가 필요합니다.' }, { status: 400 });
  }

  // 보고서 조회
  const { data: report, error: reportError } = await supabase
    .from('factory_match_reports')
    .select(`
      *,
      factory_match_report_items(id)
    `)
    .eq('id', report_id)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: '보고서를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 발송자 프로필
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const senderName = profile?.display_name || '담당 MD';
  const factoryCount = report.factory_match_report_items?.length || 0;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://keryx.kr';
  const reportUrl = `${baseUrl}/seller/factory-matches/${report.id}`;

  const results: Record<string, unknown> = {};

  // 이메일 발송
  if (doEmail && report.buyer_email) {
    const { subject, html } = buildFactoryMatchReportEmail({
      buyerName: report.buyer_name,
      reportTitle: report.title,
      reportUrl,
      factoryCount,
      senderName,
      lang,
    });

    const emailResult = await sendEmail({
      to: report.buyer_email,
      subject,
      html,
    });

    results.email = emailResult;

    // 발송 로그 기록
    await supabase.from('notification_logs').insert({
      target_type: 'factory_match_report',
      target_id: report.id,
      recipient_name: report.buyer_name,
      recipient_email: report.buyer_email,
      channel: 'email',
      subject,
      message_preview: `공장 매칭 보고서: ${report.title}`,
      status: emailResult.success ? 'sent' : 'failed',
      error_message: emailResult.error,
      sent_by: user.id,
    });
  }

  // 문자 발송
  if (doSms && report.buyer_phone) {
    const smsMessage = buildFactoryMatchReportSms({
      buyerName: report.buyer_name,
      reportTitle: report.title,
      reportUrl,
      factoryCount,
      senderName,
      lang,
    });

    const smsResult = await sendSms({
      to: report.buyer_phone,
      message: smsMessage,
      subject: `[KERYX] 공장 매칭 보고서`,
    });

    results.sms = smsResult;

    // 발송 로그 기록
    await supabase.from('notification_logs').insert({
      target_type: 'factory_match_report',
      target_id: report.id,
      recipient_name: report.buyer_name,
      recipient_phone: report.buyer_phone,
      channel: 'sms',
      message_preview: smsMessage.substring(0, 100),
      status: smsResult.success ? 'sent' : 'failed',
      error_message: smsResult.error,
      sent_by: user.id,
    });
  }

  // 보고서 상태 업데이트
  await supabase
    .from('factory_match_reports')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: user.id,
      email_sent: doEmail && report.buyer_email ? true : false,
      sms_sent: doSms && report.buyer_phone ? true : false,
    })
    .eq('id', report.id);

  return NextResponse.json({
    success: true,
    results,
    report_url: reportUrl,
  });
}
