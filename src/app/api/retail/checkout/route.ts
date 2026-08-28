import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const CheckoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(8).max(32),
  }),
  shipping: z.object({
    recipientName: z.string().trim().min(1).max(80),
    recipientPhone: z.string().trim().min(8).max(32),
    postcode: z.string().trim().min(3).max(20),
    address1: z.string().trim().min(1).max(240),
    address2: z.string().trim().max(240).default(''),
    message: z.string().trim().max(500).default(''),
  }),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    variantLabel: z.string().trim().max(120).default(''),
  })).min(1).max(20),
});

function safeCheckoutError(message: string) {
  if (message.includes('EMPTY_CART')) return '장바구니에 상품을 담아주세요.';
  if (message.includes('REQUIRED_CHECKOUT_FIELDS_MISSING')) return '주문자와 배송지 정보를 모두 입력해 주세요.';
  if (message.includes('INVALID_QUANTITY')) return '주문 수량을 확인해 주세요.';
  if (message.includes('RETAIL_PRODUCT_NOT_AVAILABLE')) return '판매 중이 아니거나 정보가 변경된 상품이 포함되어 있습니다.';
  if (message.includes('INSUFFICIENT_STOCK')) return '선택한 수량만큼의 재고가 없습니다. 장바구니를 다시 확인해 주세요.';
  return '주문을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: '입력 내용을 확인해 주세요.' }, { status: 400 });
  }

  const sessionClient = createClient() as any;
  const { data: { user } } = await sessionClient.auth.getUser();
  const { customer, shipping, items } = parsed.data;

  const admin = createAdminClient() as any;
  const { data, error } = await admin.rpc('create_retail_checkout', {
    p_buyer_user_id: user?.id ?? null,
    p_customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    p_items: items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      variant_label: item.variantLabel,
    })),
    p_shipping: {
      recipient_name: shipping.recipientName,
      recipient_phone: shipping.recipientPhone,
      postcode: shipping.postcode,
      address1: shipping.address1,
      address2: shipping.address2,
      message: shipping.message,
    },
  });

  if (error || !data?.[0]) {
    const detail = error?.message || 'unknown checkout creation error';
    console.error('[retail checkout] create failed', detail);
    return NextResponse.json({ error: safeCheckoutError(detail) }, { status: 409 });
  }

  const checkout = data[0];
  const { data: orderItems, error: itemError } = await admin
    .from('retail_order_items')
    .select('product_name_ko_snapshot')
    .eq('retail_order_id', checkout.order_id)
    .order('created_at', { ascending: true });

  if (itemError) {
    console.error('[retail checkout] name lookup failed', itemError.message);
  }

  const names = (orderItems || []).map((item: { product_name_ko_snapshot: string }) => item.product_name_ko_snapshot);
  const orderName = names.length > 1
    ? `${names[0]} 외 ${names.length - 1}건`
    : names[0] || 'KERYX 상품';

  return NextResponse.json({
    orderId: checkout.order_id,
    orderNo: checkout.order_no,
    accessToken: checkout.access_token,
    totalAmountKrw: Number(checkout.total_amount_krw),
    orderName: orderName.slice(0, 100),
  }, { status: 201 });
}
