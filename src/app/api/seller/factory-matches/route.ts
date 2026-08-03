import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 셀러 본인의 공장 매칭 보고서 목록 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // 셀러 정보 조회 (seller_id 확인)
  const { data: sellerProfile } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  // 셀러 ID 또는 buyer_email로 보고서 조회 (sent 또는 viewed 상태만)
  let query = supabase
    .from('factory_match_reports')
    .select(`
      id,
      title,
      buyer_name,
      buyer_email,
      status,
      created_at,
      sent_at,
      viewed_at,
      inquiry_summary,
      factory_match_report_items(
        id,
        factory_name_ko,
        factory_name_zh,
        is_recommended,
        sort_order
      )
    `, { count: 'exact' })
    .in('status', ['sent', 'viewed', 'archived'])
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // seller_id가 있으면 seller_id로 필터, 없으면 buyer_email로 필터
  if (sellerProfile?.id) {
    query = query.eq('seller_id', sellerProfile.id);
  } else {
    // 이메일로 fallback
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    if (profile?.email) {
      query = query.eq('buyer_email', profile.email);
    } else {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, limit });
}
