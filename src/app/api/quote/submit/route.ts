/**
 * 견적 요청 제출 API
 * - createAdminClient (service_role_key) 사용 → RLS 완전 우회
 * - 익명 사용자도 견적 제출 가능
 * - Storage 버킷 자동 생성 포함
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // 필수 필드 검증
    if (!body.requester_name || !body.requester_email) {
      return NextResponse.json({ error: '이름과 이메일은 필수입니다.' }, { status: 400 });
    }

    // 추가 정보를 memo에 JSON으로 병합
    const extraFields = [
      'reference_image_url', 'desired_qty', 'desired_deadline',
      'sales_country', 'cert_needed', 'budget_range', 'has_sample', 'contact_method',
    ];
    const extraInfo: Record<string, string | null> = {};
    let hasExtra = false;
    for (const field of extraFields) {
      if (body[field]) {
        extraInfo[field] = body[field];
        hasExtra = true;
      }
    }
    const memoText = [
      body.memo || '',
      hasExtra ? '\n[추가정보] ' + JSON.stringify(extraInfo) : '',
    ].filter(Boolean).join('') || null;

    const { error: dbErr } = await supabase.from('quote_requests').insert({
      requester_name: body.requester_name,
      requester_email: body.requester_email,
      requester_phone: body.requester_phone || null,
      company_name: body.company_name || null,
      lang: body.lang || 'ko',
      product_category: body.product_category,
      product_name: body.product_name,
      product_desc: body.product_desc || null,
      reference_url: body.reference_url || null,
      quantity: body.quantity ? parseInt(body.quantity) : null,
      unit: body.unit || 'pcs',
      size_spec: body.size_spec || null,
      material: body.material || null,
      color_count: body.color_count || null,
      custom_packaging: body.custom_packaging || false,
      ip_design_needed: body.ip_design_needed || false,
      services_needed: body.services_needed || [],
      delivery_country: body.delivery_country || null,
      target_price: body.target_price || null,
      deadline: body.deadline || null,
      memo: memoText,
      status: 'pending',
    });

    if (dbErr) {
      console.error('[quote/submit] DB error:', dbErr);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[quote/submit] Unexpected error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
