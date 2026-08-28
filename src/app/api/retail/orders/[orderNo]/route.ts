import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isOrderNo(value: string) {
  return /^KRYR-\d{8}-\d{6}$/.test(value);
}

function isUuid(value: string | null) {
  return Boolean(value && /^[0-9a-f-]{36}$/i.test(value));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orderNo: string } },
) {
  const orderNo = params.orderNo;
  const accessToken = request.nextUrl.searchParams.get('token');
  if (!isOrderNo(orderNo)) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });

  const session = createClient() as any;
  const { data: { user } } = await session.auth.getUser();
  const admin = createAdminClient() as any;

  let query = admin
    .from('retail_orders')
    .select(`
      order_no, status, payment_status, recipient_name, subtotal_krw, shipping_fee_krw,
      discount_krw, total_amount_krw, payment_method, paid_at, shipped_at, delivered_at, created_at,
      items:retail_order_items(
        product_name_ko_snapshot, product_image_url_snapshot, variant_label_snapshot,
        quantity, unit_price_krw, line_total_krw
      )
    `)
    .eq('order_no', orderNo);

  if (user?.id) {
    query = query.eq('buyer_user_id', user.id);
  } else if (isUuid(accessToken)) {
    query = query.eq('access_token', accessToken);
  } else {
    return NextResponse.json({ error: '주문 확인 권한이 없습니다.' }, { status: 401 });
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[retail order] lookup failed', error.message);
    return NextResponse.json({ error: '주문 정보를 불러오지 못했습니다.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ order: data }, { headers: { 'Cache-Control': 'no-store' } });
}
