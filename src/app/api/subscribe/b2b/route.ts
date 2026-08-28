import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

const SubscribeSchema = z.object({
  email: z.string().trim().email().max(200),
  companyName: z.string().trim().min(1).max(160),
  contactName: z.string().trim().max(80).default(''),
  phone: z.string().trim().max(32).default(''),
  interestIpSlugs: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  interestCategories: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  privacyConsent: z.literal(true),
  marketingConsent: z.boolean().default(false),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] || character));
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: '회사명, 이메일, 개인정보 수집·이용 동의를 확인해 주세요.' }, { status: 400 });
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const now = new Date().toISOString();
  const supabase = createAdminClient() as any;

  const { data: existing, error: lookupError } = await supabase
    .from('b2b_subscribers')
    .select('id, status')
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle();
  if (lookupError) {
    console.error('[sample subscription] lookup failed', lookupError.message);
    return NextResponse.json({ error: '구독 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const subscriberData = {
    company_name: data.companyName,
    contact_name: data.contactName,
    phone: data.phone || null,
    interest_ip_slugs: data.interestIpSlugs,
    interest_categories: data.interestCategories,
    privacy_consent_at: now,
    marketing_consent_at: data.marketingConsent ? now : null,
    source: 'sample_subscription',
  };

  let subscriberId: string;
  if (existing) {
    const { error: updateError } = await supabase
      .from('b2b_subscribers')
      .update({
        ...subscriberData,
        status: existing.status === 'approved' ? 'approved' : 'pending',
        subscribed_at: now,
        rejection_reason: null,
        rejected_at: null,
        unsubscribed_at: null,
      })
      .eq('id', existing.id);
    if (updateError) {
      console.error('[sample subscription] update failed', updateError.message);
      return NextResponse.json({ error: '구독 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }
    subscriberId = existing.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('b2b_subscribers')
      .insert({ email, status: 'pending', ...subscriberData })
      .select('id')
      .single();
    if (insertError || !inserted) {
      console.error('[sample subscription] insert failed', insertError?.message);
      return NextResponse.json({ error: '구독을 신청하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }
    subscriberId = inserted.id;
  }

  // 메일 발송 실패는 신청 저장을 취소하지 않는다. HTML에는 사용자 입력을 이스케이프한다.
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'KERYX <noreply@keryx.kr>',
          to: ['admin@keryx.kr'],
          subject: `[샘플 구독 신청] ${data.companyName}`,
          html: `<h2>새 샘플 구독 신청</h2><table style="border-collapse:collapse;max-width:560px"><tr><th style="text-align:left;padding:8px;border:1px solid #ddd">회사명</th><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.companyName)}</td></tr><tr><th style="text-align:left;padding:8px;border:1px solid #ddd">담당자</th><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.contactName || '-')}</td></tr><tr><th style="text-align:left;padding:8px;border:1px solid #ddd">이메일</th><td style="padding:8px;border:1px solid #ddd">${escapeHtml(email)}</td></tr><tr><th style="text-align:left;padding:8px;border:1px solid #ddd">관심 IP</th><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.interestIpSlugs.join(', ') || '-')}</td></tr></table><p>관리자 화면에서 사업자 확인 후 구독 상태를 검토해 주세요.</p>`,
        }),
      });
    } catch (emailError) {
      console.error('[sample subscription] notification email failed', emailError);
    }
  }

  return NextResponse.json({
    success: true,
    subscriberId,
    status: existing?.status === 'approved' ? 'approved' : 'pending',
    message: existing?.status === 'approved'
      ? '신청 정보를 업데이트했습니다. 신상품·샘플 소식을 계속 받아보실 수 있습니다.'
      : '샘플 구독 신청이 접수되었습니다. 사업자 정보를 확인한 뒤 발송 대상으로 등록합니다.',
  });
}
