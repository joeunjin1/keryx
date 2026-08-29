import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { writeOperatorLog } from '@/lib/admin/requireAdmin';

const ProductIdSchema = z.string().uuid();

const RetailSettingsSchema = z.object({
  retailVisible: z.boolean(),
  retailPriceKrw: z.number().int().nonnegative().nullable(),
  retailStockQty: z.number().int().nonnegative(),
  retailShippingPolicy: z.enum(['included', 'fixed', 'collect']),
  retailShippingFeeKrw: z.number().int().nonnegative().nullable(),
  retailSaleStatus: z.enum(['draft', 'active', 'sold_out', 'paused', 'archived']),
  retailDescriptionKo: z.string().trim().max(2000),
  retailDescriptionZh: z.string().trim().max(2000),
});

const PriceRequestSchema = z.object({
  requestedPriceKrw: z.number().int().nonnegative(),
  reason: z.string().trim().max(500).default(''),
});

async function requireAdmin() {
  const session = createClient() as any;
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };

  const admin = createAdminClient() as any;
  const { data: profile } = await admin.from('user_profiles').select('kind').eq('id', user.id).maybeSingle();
  if (profile?.kind !== 'admin') return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }) };

  return { user, admin };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const productId = ProductIdSchema.safeParse(params.id);
  if (!productId.success) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = RetailSettingsSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: '판매 설정을 다시 확인해 주세요.' }, { status: 400 });

  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data: product } = await auth.admin.from('products').select('retail_price_krw').eq('id', productId.data).is('deleted_at', null).maybeSingle();
  if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });

  const input = parsed.data;
  const priceChanged = product.retail_price_krw !== null && input.retailPriceKrw !== product.retail_price_krw;
  if (priceChanged) {
    return NextResponse.json({
      error: '기존 판매가 변경은 가격 변경 요청으로 등록한 뒤 다른 관리자의 승인을 받아야 합니다.',
      code: 'PRICE_APPROVAL_REQUIRED',
    }, { status: 409 });
  }

  const { data: updated, error: updateError } = await auth.admin.rpc('update_retail_product_settings', {
    p_actor_user_id: auth.user.id,
    p_product_id: productId.data,
    p_retail_visible: input.retailVisible,
    p_retail_price_krw: input.retailPriceKrw,
    p_retail_stock_qty: input.retailStockQty,
    p_retail_shipping_policy: input.retailShippingPolicy,
    p_retail_shipping_fee_krw: input.retailShippingPolicy === 'fixed' ? input.retailShippingFeeKrw : null,
    p_retail_sale_status: input.retailSaleStatus,
    p_retail_description_ko: input.retailDescriptionKo,
    p_retail_description_zh: input.retailDescriptionZh,
  });

  if (updateError || !updated) {
    console.error('[retail product admin] update failed', updateError?.message || 'unknown');
    return NextResponse.json({ error: '판매 설정을 저장하지 못했습니다. 공개 조건과 관리자 권한을 확인해 주세요.' }, { status: 409 });
  }

  await writeOperatorLog(auth.admin, auth.user.id, 'update_retail_product_settings', 'products', productId.data, {
    retailVisible: input.retailVisible,
    retailStockQty: input.retailStockQty,
    retailSaleStatus: input.retailSaleStatus,
    retailShippingPolicy: input.retailShippingPolicy,
  });
  return NextResponse.json({ product: updated });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const productId = ProductIdSchema.safeParse(params.id);
  if (!productId.success) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = PriceRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: '변경 요청 내용을 다시 확인해 주세요.' }, { status: 400 });

  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data: priceRequest, error: requestError } = await auth.admin.rpc('request_retail_price_change', {
    p_actor_user_id: auth.user.id,
    p_product_id: productId.data,
    p_requested_price_krw: parsed.data.requestedPriceKrw,
    p_reason: parsed.data.reason,
  });

  if (requestError || !priceRequest) {
    const detail = requestError?.message || '';
    if (detail.includes('INITIAL_PRICE_CAN_BE_SET_DIRECTLY')) return NextResponse.json({ error: '최초 판매가는 판매 설정에서 바로 입력할 수 있습니다.' }, { status: 409 });
    if (detail.includes('PENDING_PRICE_CHANGE_EXISTS')) return NextResponse.json({ error: '이미 검토 중인 판매가 변경 요청이 있습니다.' }, { status: 409 });
    if (detail.includes('PRICE_IS_UNCHANGED')) return NextResponse.json({ error: '현재 판매가와 동일합니다.' }, { status: 409 });
    return NextResponse.json({ error: '판매가 변경 요청을 등록하지 못했습니다.' }, { status: 409 });
  }

  await writeOperatorLog(auth.admin, auth.user.id, 'request_retail_price_change', 'retail_price_change_requests', priceRequest.id ?? null, {
    productId: productId.data,
    requestedPriceKrw: parsed.data.requestedPriceKrw,
  });
  return NextResponse.json({ request: priceRequest }, { status: 201 });
}
