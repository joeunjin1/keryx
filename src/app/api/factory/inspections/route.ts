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
        product_name_ko, product_name_cn, factory_id,
        factories(company_name, name_cn, city)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!isInternal) {
      // 공장 계정: shared_login_user_id로 factory_id 조회
      const { data: factory } = await supabase
        .from('factories')
        .select('id')
        .eq('shared_login_user_id', user.id)
        .single();

      if (!factory) return NextResponse.json({ data: [] });

      // 공장에게는 published 이상 상태만 노출
      queryBuilder = queryBuilder
        .eq('factory_id', factory.id)
        .in('status', ['published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved']);
    }
    // 관리자는 필터 없이 전체 조회

    const { data: inspections, error } = await queryBuilder;

    if (error) {
      console.error('factory inspections query error:', error);
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
      factory_name: i.factories?.company_name ?? i.factories?.name_cn,
    }));

    return NextResponse.json({ data: mapped });
  } catch (err) {
    console.error('factory inspections API error:', err);
    return NextResponse.json({ data: [] });
  }
}
