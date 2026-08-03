import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '48');
  const offset = parseInt(searchParams.get('offset') || '0');
  const sort = searchParams.get('sort') || 'new';
  const supplier_type = searchParams.get('supplier_type');
  const featured = searchParams.get('featured');
  const is_new = searchParams.get('is_new');
  const is_hot = searchParams.get('is_hot');
  const price_min = searchParams.get('price_min');
  const price_max = searchParams.get('price_max');
  const moq_max = searchParams.get('moq_max');

  const selectFields = [
    'id', 'product_code', 'sku', 'name_ko', 'name_zh',
    'price_cny', 'sell_price_cny', 'moq', 'lead_time_days',
    'image_url', 'image_urls', 'category', 'factory_id',
    'is_active', 'is_featured', 'is_new', 'is_hot',
    'stock_qty', 'cbm_per_box', 'pcs_per_box',
    'brand_name', 'origin_country', 'supplier_type',
    'customizable', 'oem_available', 'odm_available',
    'material_zh', 'colors',
    'seo_title_ko', 'seo_desc_ko',
    'factory:factories(id, company_name, company_name_ko, factory_code, approval_status, avg_rating, city)',
  ].join(', ');

  let query = supabase
    .from('products')
    .select(selectFields, { count: 'exact' })
    .eq('is_active', true)
    .eq('approval_status', 'approved') // 최종 승인된 상품만 /shop에 노출
    .range(offset, offset + limit - 1);

  if (sort === 'moq') query = query.order('moq', { ascending: true });
  else if (sort === 'price') query = query.order('sell_price_cny', { ascending: true });
  else if (sort === 'featured') {
    query = query.order('is_featured', { ascending: false });
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  if (category && category !== 'all') query = query.eq('category', category);
  if (search) {
    query = query.or(
      `name_ko.ilike.%${search}%,name_zh.ilike.%${search}%,product_code.ilike.%${search}%`
    );
  }
  if (supplier_type && supplier_type !== 'all') query = query.eq('supplier_type', supplier_type);
  if (featured === 'true') query = query.eq('is_featured', true);
  if (is_new === 'true') query = query.eq('is_new', true);
  if (is_hot === 'true') query = query.eq('is_hot', true);
  if (price_min) query = query.gte('sell_price_cny', parseFloat(price_min));
  if (price_max) query = query.lte('sell_price_cny', parseFloat(price_max));
  if (moq_max) query = query.lte('moq', parseInt(moq_max));

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ products: [], total: 0, error: error.message });
  return NextResponse.json({ products: data || [], total: count ?? 0 });
}
