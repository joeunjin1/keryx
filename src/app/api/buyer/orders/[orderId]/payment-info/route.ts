import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const Schema = z.object({
  payment_info: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // admin 또는 md 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'md'].includes(profile.kind)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: internalUser } = await supabase
    .from('internal_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const raw = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  // 주문 확인
  const { data: order } = await supabase
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', params.orderId)
    .single();
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  // 결제 정보 업데이트
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      payment_info: parsed.data.payment_info,
      payment_info_sent_at: new Date().toISOString(),
      payment_info_sent_by: internalUser?.id ?? null,
    })
    .eq('id', params.orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 바이어에게 알림 전송
  await supabase.from('seller_notifications').insert({
    seller_id: order.seller_id,
    type: 'payment_info',
    title: '결제 정보가 도착했습니다',
    title_zh: '付款信息已发送',
    body: parsed.data.payment_info.slice(0, 200),
    body_zh: parsed.data.payment_info.slice(0, 200),
    link_url: `/seller/orders/${params.orderId}`,
    order_id: params.orderId,
    sent_by_name: 'KERYX 관리자',
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
