import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // MD 또는 admin 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };
  if (!profile || !['md', 'admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.shipping_method) {
    return NextResponse.json({ error: 'shipping_method is required' }, { status: 400 });
  }

  const { shipping_method, tracking_no, tracking_url, shipping_cost_cny, notes_zh } = body;

  // shipment_no 생성 (SHP-YYYYMMDD-XXXX)
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const shipmentNo = `SHP-${dateStr}-${rand}`;

  // 주문 정보 조회
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, seller_id')
    .eq('id', params.orderId)
    .single() as { data: any; error: any };

  if (orderErr || !order) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  // shipments 테이블에 INSERT
  const { data: shipment, error: shipErr } = await supabase
    .from('shipments')
    .insert({
      shipment_no: shipmentNo,
      order_id: params.orderId,
      seller_id: order.seller_id,
      shipping_method,
      tracking_no: tracking_no || null,
      tracking_url: tracking_url || null,
      shipping_cost_cny: shipping_cost_cny ? Number(shipping_cost_cny) : null,
      notes_zh: notes_zh || null,
      status: 'in_transit',
      shipped_at: now.toISOString(),
    })
    .select()
    .single() as { data: any; error: any };

  if (shipErr) {
    return NextResponse.json({ error: shipErr.message }, { status: 500 });
  }

  // 주문 상태 업데이트
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'shipping_to_korea' })
    .eq('id', params.orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 운송비 청구서 자동 생성 (운송비가 있을 경우)
  if (shipping_cost_cny && Number(shipping_cost_cny) > 0) {
    const shippingInvoiceNo = `INV-SHP-${dateStr}-${rand}`;
    await supabase.from('invoices').insert({
      invoice_no: shippingInvoiceNo,
      order_id: params.orderId,
      type: 'shipping',
      total_cny: Number(shipping_cost_cny),
      shipping_cost_cny: Number(shipping_cost_cny),
      status: 'pending',
      notes_zh: notes_zh || null,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
  }

  return NextResponse.json({ shipment, message: 'shipment created' });
}
