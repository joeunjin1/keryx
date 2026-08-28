import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { RETAIL_PRODUCT_FIELDS } from '@/lib/retail/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  }

  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from('v_retail_products')
    .select(RETAIL_PRODUCT_FIELDS)
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.error('[retail product] detail failed', error.message);
    return NextResponse.json({ error: '상품 정보를 불러오지 못했습니다.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: '판매 중인 상품을 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ product: data }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
