/**
 * /api/admin/matching-direct
 * 관리자가 특정 셀러(user_id)에게 공장을 직접 매칭 완료 처리
 * POST { seller_user_id, factory_id, factory_name, factory_city }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seller_user_id, factory_id, factory_name, factory_city } = body;

    if (!seller_user_id || !factory_id || !factory_name) {
      return NextResponse.json({ error: 'seller_user_id, factory_id, factory_name 필수' }, { status: 400 });
    }

    const sb = getSupabase();

    // 이미 같은 공장으로 매칭된 내역이 있는지 확인
    const { data: existing } = await sb
      .from('factory_matching_requests')
      .select('id, status')
      .eq('user_id', seller_user_id)
      .eq('final_factory_id', factory_id)
      .not('status', 'eq', 'cancelled')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        already_matched: true,
        message: '이미 매칭된 공장입니다.',
        id: existing.id,
      });
    }

    // 셀러 정보 조회
    const { data: seller } = await sb
      .from('sellers')
      .select('business_name, contact_name, phone, email')
      .eq('user_id', seller_user_id)
      .maybeSingle();

    const companyName = seller?.business_name || '바이어';
    const contactName = seller?.contact_name || companyName;

    // 매칭 완료 레코드 생성
    const { data, error } = await sb
      .from('factory_matching_requests')
      .insert({
        user_id: seller_user_id,
        company_name: companyName,
        contact_name: contactName,
        phone: seller?.phone || null,
        email: seller?.email || null,
        product_desc: `관리자 직접 매칭 - ${factory_name}`,
        product_category: null,
        business_type: 'admin_direct',
        status: 'completed',
        final_factory_id: factory_id,
        final_factory_name: factory_name,
        final_conclusion: `관리자가 직접 ${factory_name}(${factory_city || ''})으로 매칭 완료`,
        report_sent_at: new Date().toISOString(),
        priority_price: 25,
        priority_quality: 25,
        priority_delivery: 25,
        priority_stability: 25,
      })
      .select('id, status')
      .single();

    if (error) {
      console.error('[admin/matching-direct] DB error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      already_matched: false,
      message: `${factory_name} 매칭 완료`,
      id: data?.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin/matching-direct] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: 특정 셀러의 매칭 공장 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seller_user_id = searchParams.get('seller_user_id');

  if (!seller_user_id) {
    return NextResponse.json({ error: 'seller_user_id 필수' }, { status: 400 });
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from('factory_matching_requests')
    .select('id, final_factory_id, final_factory_name, status, created_at')
    .eq('user_id', seller_user_id)
    .eq('status', 'completed')
    .not('final_factory_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data || [] });
}
