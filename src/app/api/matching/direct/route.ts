/**
 * /api/matching/direct
 * 바이어가 제품 카드에서 "매칭" 버튼을 클릭할 때 즉시 매칭 완료 처리
 * - 로그인한 바이어의 user_id로 factory_matching_requests 생성
 * - status: 'completed', matched_factories에 해당 공장 추가
 * - final_factory_id, final_factory_name 설정
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
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
    const { product_id, product_name, factory_id, factory_name } = body;

    if (!factory_id) {
      return NextResponse.json({ success: false, error: '공장 정보가 없습니다.' }, { status: 400 });
    }

    // 현재 로그인한 사용자 정보 조회
    const serverSb = createServerClient() as any;
    const { data: { user } } = await serverSb.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const sb = getSupabase();

    // 이미 같은 공장으로 매칭 신청한 내역이 있는지 확인
    const { data: existing } = await sb
      .from('factory_matching_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('final_factory_id', factory_id)
      .not('status', 'eq', 'cancelled')
      .limit(1)
      .single();

    if (existing) {
      // 이미 매칭된 경우 - 성공 응답 반환 (중복 방지)
      return NextResponse.json({
        success: true,
        already_matched: true,
        message: '이미 매칭된 공장입니다.',
        id: existing.id,
      });
    }

    // 바이어 정보 조회 (sellers 테이블)
    const { data: seller } = await sb
      .from('sellers')
      .select('business_name, contact_name, phone, email')
      .eq('user_id', user.id)
      .single();

    const companyName = seller?.business_name || user.email?.split('@')[0] || '바이어';
    const contactName = seller?.contact_name || companyName;

    // 즉시 매칭 완료 처리
    const matchedFactories = JSON.stringify([{
      factory_id,
      factory_name: factory_name || '매칭 공장',
      factory_name_zh: null,
      status: 'matched',
      match_score: null,
      note: `제품 "${product_name || product_id}"에서 직접 매칭 신청`,
      recommended_at: new Date().toISOString(),
    }]);

    const { data, error } = await sb
      .from('factory_matching_requests')
      .insert({
        user_id: user.id,
        company_name: companyName,
        contact_name: contactName,
        phone: seller?.phone || null,
        email: seller?.email || user.email || null,
        product_desc: product_name ? `제품 "${product_name}" 공장 직접 매칭 신청` : '제품 카탈로그에서 직접 매칭 신청',
        product_category: null,
        business_type: 'direct_match',
        status: 'completed',
        matched_factories: matchedFactories,
        final_factory_id: factory_id,
        final_factory_name: factory_name || '매칭 공장',
        final_conclusion: `제품 "${product_name || product_id}"에서 직접 매칭 신청으로 즉시 완료`,
        report_sent_at: new Date().toISOString(),
        priority_price: 25,
        priority_quality: 25,
        priority_delivery: 25,
        priority_stability: 25,
      })
      .select('id, status')
      .single();

    if (error) {
      console.error('[matching/direct] DB error:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      already_matched: false,
      message: '매칭이 완료되었습니다. 나의 매칭 공장에서 확인하세요.',
      id: data?.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[matching/direct] error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
