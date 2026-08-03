import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
// dynamic: 빌드 시 정적 분석 방지 (환경변수가 런타임에만 존재)
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  // 런타임에 supabase 클라이언트 초기화
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  );
  try {
    const body = await req.json();
    const {
      product_desc,
      business_purpose,
      print_package,
      print_desc,
      region,
      company_name,
      contact_name,
      phone,
      email,
      user_id: bodyUserId,
    } = body;

    // 현재 로그인한 사용자 ID 가져오기 (있으면 우선 사용)
    let userId = bodyUserId || null;
    if (!userId) {
      try {
        const serverSb = createServerClient() as any;
        const { data: { user } } = await serverSb.auth.getUser();
        if (user?.id) userId = user.id;
      } catch {
        // 비로그인 상태 허용
      }
    }

    // 추가 정보를 product_desc에 포함
    const fullDesc = [
      product_desc,
      print_package ? `인쇄/패키지: ${print_package}` : '',
      print_desc ? `인쇄 상세: ${print_desc}` : '',
      region ? `지역: ${region}` : '',
    ].filter(Boolean).join('\n');

    // factory_matching_requests 테이블에 저장 (관리자/MD가 볼 수 있는 통합 테이블)
    const { data, error } = await supabase
      .from('factory_matching_requests')
      .insert([{
        user_id: userId,
        product_desc: fullDesc || product_desc || '매칭 신청',
        product_category: null,
        moq: null,
        target_price: null,
        business_type: business_purpose || null,
        company_name: company_name || '미입력',
        contact_name: contact_name || '미입력',
        phone: phone || null,
        email: email || null,
        status: 'pending',
        priority_price: 25,
        priority_quality: 25,
        priority_delivery: 25,
        priority_stability: 25,
        matched_factories: '[]',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      // 테이블 오류 시 로그만 남기고 성공 응답 (UX 보호)
      console.error('[matching/request] DB error:', error.message);
      return NextResponse.json({ ok: true, warning: error.message });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[matching/request] error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
