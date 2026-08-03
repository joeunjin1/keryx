import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 공장 매칭 보고서 목록 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const sellerId = searchParams.get('seller_id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('factory_match_reports')
    .select(`
      *,
      factory_match_report_items(id, factory_name_ko, factory_name_zh, is_recommended, sort_order)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (sellerId) query = query.eq('seller_id', sellerId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, limit });
}

// POST: 공장 매칭 보고서 신규 생성
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    title, seller_id, buyer_name, buyer_email, buyer_phone,
    inquiry_summary, service_request_id, internal_memo,
    items = [],
  } = body;

  if (!title || !buyer_name) {
    return NextResponse.json({ error: '제목과 바이어명은 필수입니다.' }, { status: 400 });
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, kind')
    .eq('id', user.id)
    .single();

  // 보고서 생성
  const { data: report, error: reportError } = await supabase
    .from('factory_match_reports')
    .insert({
      created_by: user.id,
      created_by_name: profile?.display_name || user.email,
      created_by_role: profile?.kind || 'admin',
      seller_id,
      buyer_name,
      buyer_email,
      buyer_phone,
      title,
      inquiry_summary,
      service_request_id: service_request_id || null,
      internal_memo,
      status: 'draft',
    })
    .select()
    .single();

  if (reportError) return NextResponse.json({ error: reportError.message }, { status: 500 });

  // 공장 항목 생성
  if (items.length > 0) {
    const itemsToInsert = items.map((item: Record<string, unknown>, idx: number) => ({
      ...item,
      report_id: report.id,
      sort_order: idx,
    }));

    const { error: itemsError } = await supabase
      .from('factory_match_report_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Items insert error:', itemsError);
    }
  }

  return NextResponse.json({ data: report }, { status: 201 });
}
