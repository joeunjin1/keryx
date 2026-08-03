import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // service_role 사용 (비회원 INSERT 허용)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );

  try {
    const body = await req.json();
    const {
      landing_slug,
      inquiry_type = 'general',
      requester_name,
      requester_email,
      requester_phone,
      requester_company,
      requester_country = '한국',
      subject,
      message,
      product_id,
      product_name_snapshot,
      product_image_snapshot,
      reference_image_url,
      sample_quantity = 1,
      target_price_cny,
      target_moq,
      source_url,
      utm_source,
      utm_medium,
      utm_campaign,
    } = body;

    // 필수 필드 검증
    if (!requester_name || !requester_email || !message) {
      return NextResponse.json(
        { error: '이름, 이메일, 메시지는 필수입니다' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requester_email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다' }, { status: 400 });
    }

    // 랜딩 페이지 ID 조회
    let landing_page_id: string | null = null;
    if (landing_slug) {
      const { data: lp } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('slug', landing_slug)
        .single();
      landing_page_id = lp?.id ?? null;
    }

    // 문의 저장
    const { data, error } = await supabase
      .from('landing_page_inquiries')
      .insert({
        landing_page_id,
        landing_slug,
        inquiry_type,
        requester_name: requester_name.trim(),
        requester_email: requester_email.trim().toLowerCase(),
        requester_phone: requester_phone?.trim() ?? null,
        requester_company: requester_company?.trim() ?? null,
        requester_country,
        subject: subject?.trim() ?? null,
        message: message.trim(),
        product_id: product_id ?? null,
        product_name_snapshot: product_name_snapshot ?? null,
        product_image_snapshot: product_image_snapshot ?? null,
        reference_image_url: reference_image_url ?? null,
        sample_quantity: sample_quantity ?? 1,
        target_price_cny: target_price_cny ?? null,
        target_moq: target_moq ?? null,
        source_url: source_url ?? null,
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[POST /api/public/landing/inquiry]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 랜딩 페이지 문의수 증가
    if (landing_page_id) {
      supabase.rpc('increment_inquiry_count', { p_landing_page_id: landing_page_id }).then(() => {});
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    console.error('[POST /api/public/landing/inquiry]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
