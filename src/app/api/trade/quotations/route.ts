import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET: 견적서 목록 조회
export async function GET(req: NextRequest) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles').select('kind').eq('id', user.id).single();

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  let query = supabase
    .from('quotations')
    .select(`
      id, quotation_no, status, valid_until, total_cny, notes, created_at, updated_at,
      seller:sellers(id, business_name),
      md:internal_users(id, name_ko),
      factory:factories(id, factory_name),
      items:quotation_items(id, product_name_zh, product_name_ko, quantity, unit_price_cny, total_cny, lead_time_days)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  // 역할별 필터
  if (profile?.kind === 'seller') {
    const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', user.id).single();
    if (seller) query = query.eq('seller_id', seller.id);
  } else if (profile?.kind === 'md' || profile?.kind === 'inspector') {
    const { data: internal } = await supabase.from('internal_users').select('id').eq('user_id', user.id).single();
    if (internal) query = query.eq('md_id', internal.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ quotations: data || [] });
}

// POST: 견적서 생성 (MD가 작성)
export async function POST(req: NextRequest) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles').select('kind').eq('id', user.id).single();

  // MD 또는 admin만 견적서 생성 가능
  if (!['md', 'admin', 'inspector'].includes(profile?.kind)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = await req.json();
  const { seller_id, factory_id, valid_until, notes, notes_zh, items } = body;

  if (!seller_id || !items || items.length === 0) {
    return NextResponse.json({ error: 'seller_id and items are required' }, { status: 400 });
  }

  // MD 정보 조회
  const { data: internal } = await supabase
    .from('internal_users').select('id').eq('user_id', user.id).single();

  // 견적서 생성
  const { data: quotation, error: qErr } = await adminSupabase
    .from('quotations')
    .insert({
      seller_id,
      md_id: internal?.id,
      factory_id: factory_id || null,
      status: 'draft',
      valid_until: valid_until || null,
      notes: notes || null,
      notes_zh: notes_zh || null,
      total_cny: items.reduce((s: number, item: any) => s + (item.quantity * item.unit_price_cny), 0),
    })
    .select().single();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // 견적서 아이템 삽입
  const itemRows = items.map((item: any) => ({
    quotation_id: quotation.id,
    product_id: item.product_id || null,
    product_name_zh: item.product_name_zh,
    product_name_ko: item.product_name_ko || null,
    variant_desc: item.variant_desc || null,
    quantity: item.quantity,
    unit_price_cny: item.unit_price_cny,
    lead_time_days: item.lead_time_days || null,
    notes: item.notes || null,
  }));

  const { error: itemErr } = await adminSupabase.from('quotation_items').insert(itemRows);
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  return NextResponse.json({ quotation }, { status: 201 });
}
