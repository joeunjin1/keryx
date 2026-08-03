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
  if (!body || !body.total_qty || !body.passed_qty) {
    return NextResponse.json({ error: 'total_qty and passed_qty are required' }, { status: 400 });
  }

  const { total_qty, passed_qty, failed_qty = 0, notes } = body;

  // 주문 정보 조회
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_no, total_cny, deposit_pct, balance_pct, seller_id, status')
    .eq('id', params.orderId)
    .single() as { data: any; error: any };

  if (orderErr || !order) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  // 단가 계산 (잔금 기준 합격 수량)
  const balancePct = order.balance_pct ?? 70;
  const totalCny = Number(order.total_cny ?? 0);
  const balanceTotal = totalCny * balancePct / 100;
  // 원래 주문 총 수량 계산
  const { data: items } = await supabase
    .from('order_items')
    .select('qty, unit_price_cny')
    .eq('order_id', params.orderId) as { data: any[] | null; error: any };

  const totalOrderQty = (items ?? []).reduce((s: number, it: any) => s + Number(it.qty), 0);
  const avgUnitPrice = totalOrderQty > 0 ? totalCny / totalOrderQty : 0;
  const passedAmount = avgUnitPrice * passed_qty * balancePct / 100;

  // invoice_no 생성 (INV-YYYYMMDD-XXXX)
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const invoiceNo = `INV-${dateStr}-${rand}`;

  // 청구서 생성
  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_no: invoiceNo,
      order_id: params.orderId,
      type: 'inspection_balance',
      total_qty,
      passed_qty,
      failed_qty,
      unit_price_cny: avgUnitPrice,
      subtotal_cny: passedAmount,
      total_cny: passedAmount,
      status: 'pending',
      notes_zh: notes ?? null,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
    .select()
    .single() as { data: any; error: any };

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  // 주문 상태 업데이트
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'awaiting_balance',
      inspection_completed_at: now.toISOString(),
      inspection_total_qty: total_qty,
      inspection_passed_qty: passed_qty,
      inspection_failed_qty: failed_qty,
      inspection_result_notes: notes ?? null,
    })
    .eq('id', params.orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoice, message: 'inspection completed and invoice created' });
}
