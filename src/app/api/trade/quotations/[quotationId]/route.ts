import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 견적서 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { quotationId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('quotations')
    .select(`
      id, quotation_no, status, valid_until, total_cny, notes, notes_zh, created_at, updated_at,
      seller:sellers(id, business_name, user_id),
      md:internal_users(id, name_ko, name_zh),
      factory:factories(id, factory_name, factory_code),
      items:quotation_items(id, product_id, product_name_zh, product_name_ko, variant_desc, quantity, unit_price_cny, total_cny, lead_time_days, notes)
    `)
    .eq('id', params.quotationId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ quotation: data });
}

// PATCH: 견적서 상태 변경 (send / accept / reject / expire)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { quotationId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles').select('kind').eq('id', user.id).single();

  const body = await req.json();
  const { action } = body; // 'send' | 'accept' | 'reject'

  // 현재 견적서 조회
  const { data: quotation } = await supabase
    .from('quotations')
    .select('id, status, seller_id, total_cny')
    .eq('id', params.quotationId)
    .single();

  if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let newStatus = quotation.status;
  let extraUpdate: Record<string, any> = {};

  if (action === 'send') {
    // MD만 발송 가능
    if (!['md', 'admin', 'inspector'].includes(profile?.kind)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    newStatus = 'sent';
  } else if (action === 'accept') {
    // 셀러만 수락 가능
    if (profile?.kind !== 'seller') {
      return NextResponse.json({ error: 'Only seller can accept' }, { status: 403 });
    }
    newStatus = 'accepted';

    // 수락 시 자동으로 주문 생성
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        seller_id: quotation.seller_id,
        status: 'pending',
        total_amount_cny: quotation.total_cny,
        notes: `견적서 ${params.quotationId}에서 자동 생성`,
      })
      .select().single();

    if (!orderErr && order) {
      extraUpdate.converted_order_id = order.id;
    }
  } else if (action === 'reject') {
    // 셀러만 반려 가능
    if (profile?.kind !== 'seller') {
      return NextResponse.json({ error: 'Only seller can reject' }, { status: 403 });
    }
    newStatus = 'rejected';
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('quotations')
    .update({ status: newStatus, updated_at: new Date().toISOString(), ...extraUpdate })
    .eq('id', params.quotationId)
    .select().single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ quotation: updated });
}
