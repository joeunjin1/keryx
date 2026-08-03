export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient() as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: [] });

    // 관리자/MD/검수원 여부 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();

    const isInternal = profile && ['admin', 'md', 'inspector'].includes(profile.kind);

    let queryBuilder = supabase
      .from('inspections')
      .select(`
        id, inspection_no, status, final_verdict, pass_rate, inspection_date,
        product_name_ko, product_name_cn, seller_id,
        sellers(business_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!isInternal) {
      // 셀러 계정: 본인의 seller_id로 필터
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!seller) return NextResponse.json({ data: [] });
      queryBuilder = queryBuilder
        .eq('seller_id', seller.id)
        .in('status', ['published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved']);
    }
    // 관리자는 필터 없이 전체 조회

    const { data: inspections, error } = await queryBuilder;

    if (error) {
      console.error('inspections query error:', error);
      return NextResponse.json({ data: [], error: error.message });
    }

    const mapped = (inspections ?? []).map((i: any) => ({
      id: i.id,
      inspection_no: i.inspection_no,
      result: i.final_verdict,
      status: i.status,
      pass_rate: i.pass_rate,
      inspected_at: i.inspection_date,
      product_name: i.product_name_ko ?? i.product_name_cn,
      business_name: i.sellers?.business_name,
    }));

    return NextResponse.json({ data: mapped });
  } catch (err) {
    console.error('seller inspections API error:', err);
    return NextResponse.json({ data: [] });
  }
}
