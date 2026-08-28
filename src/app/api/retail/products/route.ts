import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { RETAIL_PRODUCT_FIELDS } from '@/lib/retail/types';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 24;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(searchParams.get('limit') || '12', 10) || 12));
  const offset = (page - 1) * limit;
  const category = searchParams.get('category')?.trim();
  const ipId = searchParams.get('ip')?.trim();
  const featured = searchParams.get('featured');
  const search = searchParams.get('q')?.trim().slice(0, 80);

  const admin = createAdminClient() as any;
  let query = admin
    .from('v_retail_products')
    .select(RETAIL_PRODUCT_FIELDS, { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (ipId) query = query.eq('ip_character_id', ipId);
  if (featured === 'true') query = query.eq('is_featured', true);
  if (search) {
    const escaped = search.replace(/[,%()]/g, '');
    if (escaped) query = query.or(`name_ko.ilike.%${escaped}%,name_zh.ilike.%${escaped}%,product_code.ilike.%${escaped}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('[retail products] list failed', error.message);
    return NextResponse.json({ error: '상품 정보를 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    products: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
