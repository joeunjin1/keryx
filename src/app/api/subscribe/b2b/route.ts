/**
 * B2B 무료 구독 신청 API
 * - createAdminClient (service_role_key) 사용 → RLS 완전 우회
 * - 익명 사용자도 구독 신청 가능
 * - 관리자에게 알림 이메일 발송
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // 필수 필드 검증
    if (!body.email || !body.company_name) {
      return NextResponse.json(
        { error: '이메일과 회사명은 필수입니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 중복 구독 확인
    const { data: existing } = await supabase
      .from('b2b_subscribers')
      .select('id, status')
      .eq('email', body.email)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json(
          { error: '이미 구독 중인 이메일입니다.' },
          { status: 409 }
        );
      }
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: '이미 신청된 이메일입니다. 승인 대기 중입니다.' },
          { status: 409 }
        );
      }
      // rejected 또는 unsubscribed인 경우 재신청 허용 (기존 레코드 업데이트)
      const { error: updateErr } = await supabase
        .from('b2b_subscribers')
        .update({
          company_name: body.company_name,
          phone: body.phone || null,
          status: 'pending',
          rejection_reason: null,
          subscribed_at: new Date().toISOString(),
          rejected_at: null,
          unsubscribed_at: null,
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('[subscribe/b2b] Update error:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '재신청이 완료되었습니다.' });
    }

    // 신규 구독 신청 삽입
    const { error: dbErr } = await supabase.from('b2b_subscribers').insert({
      email: body.email,
      company_name: body.company_name,
      phone: body.phone || null,
      status: 'pending',
    });

    if (dbErr) {
      console.error('[subscribe/b2b] DB error:', dbErr);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    // 관리자에게 알림 이메일 발송 (비동기, 실패해도 구독 신청은 성공)
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'KERYX <noreply@keryx.kr>',
            to: ['admin@keryx.kr'],
            subject: `[B2B 구독 신청] ${body.company_name} - ${body.email}`,
            html: `
              <h2>새로운 B2B 구독 신청</h2>
              <table style="border-collapse:collapse; width:100%; max-width:500px;">
                <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">회사명</td><td style="padding:8px; border:1px solid #ddd;">${body.company_name}</td></tr>
                <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">이메일</td><td style="padding:8px; border:1px solid #ddd;">${body.email}</td></tr>
                <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">연락처</td><td style="padding:8px; border:1px solid #ddd;">${body.phone || '-'}</td></tr>
              </table>
              <p style="margin-top:16px;">관리자 페이지에서 사업자 등록증 확인 후 승인해 주세요.</p>
            `,
          }),
        });
      }
    } catch (emailErr) {
      console.error('[subscribe/b2b] Email notification failed:', emailErr);
    }

    return NextResponse.json({ success: true, message: '구독 신청이 완료되었습니다.' });
  } catch (err) {
    console.error('[subscribe/b2b] Unexpected error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
