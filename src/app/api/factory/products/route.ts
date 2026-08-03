import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const PricingTierSchema = z.object({
  min_qty: z.number().int().positive(),
  unit_price_cny: z.number().positive(),
  label: z.string().optional(),
});

const VariantSchema = z.object({
  variant_sku: z.string().min(1).max(100),
  color_name: z.string().max(50).optional().default(''),
  size_label: z.string().max(50).optional().default(''),
  unit_price_cny: z.number().positive().nullable().optional(),
  moq: z.number().int().positive().nullable().optional(),
  stock: z.number().int().nonnegative().optional().default(0),
  image_url: z.string().url().nullable().optional(),
});

const Schema = z.object({
  category_id: z.string().uuid().optional().nullable(),
  category: z.string().optional().nullable(),
  name_zh: z.string().min(1).max(200),
  name_ko: z.string().min(1).max(200),
  name_en: z.string().max(200).optional().nullable(),
  brand_name: z.string().max(100).optional().nullable(),
  origin_country: z.string().max(50).optional().default('중국'),
  hs_code: z.string().max(20).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  product_code: z.string().max(50).optional().nullable(),
  product_tags: z.array(z.string()).optional().default([]),
  supplier_type: z.string().optional().default('PB기타'),
  description_zh: z.string().max(5000).optional().default(''),
  description_ko: z.string().max(5000).optional().default(''),
  detail_html_ko: z.string().optional().nullable(),
  detail_html_zh: z.string().optional().nullable(),
  key_features: z.array(z.object({ ko: z.string(), zh: z.string() })).optional().default([]),
  caution_ko: z.string().optional().nullable(),
  caution_zh: z.string().optional().nullable(),
  size_mm: z.string().nullable().optional(),
  product_size_cm: z.string().nullable().optional(),
  material_detail: z.string().nullable().optional(),
  material_zh: z.string().nullable().optional(),
  colors: z.array(z.string()).optional().default([]),
  sizes: z.array(z.string()).optional().default([]),
  print_methods: z.array(z.string()).optional().default([]),
  packaging_detail: z.string().nullable().optional(),
  surface_treatment: z.string().nullable().optional(),
  weight_g: z.number().int().nullable().optional(),
  box_length_cm: z.number().nullable().optional(),
  box_width_cm: z.number().nullable().optional(),
  box_height_cm: z.number().nullable().optional(),
  cbm_per_box: z.number().nullable().optional(),
  pcs_per_box: z.number().int().nullable().optional(),
  inner_box_pcs: z.number().int().nullable().optional(),
  outer_box_pcs: z.number().int().nullable().optional(),
  gross_weight_kg: z.number().nullable().optional(),
  certifications: z.array(z.string()).optional().default([]),
  safety_warnings: z.string().nullable().optional(),
  age_restriction: z.string().nullable().optional(),
  shelf_life_days: z.number().int().nullable().optional(),
  customizable: z.boolean().optional().default(false),
  nda_available: z.boolean().optional().default(false),
  oem_available: z.boolean().optional().default(false),
  odm_available: z.boolean().optional().default(false),
  image_urls: z.array(z.string().url()).min(1).max(20),
  video_url: z.string().url().nullable().optional(),
  detail_images: z.array(z.string().url()).optional().default([]),
  certificate_images: z.array(z.string().url()).optional().default([]),
  unit_price_cny: z.number().positive(),
  supply_price_cny: z.number().positive().optional().nullable(),
  price_usd: z.number().positive().nullable().optional(),
  price_krw: z.number().int().positive().nullable().optional(),
  moq: z.number().int().positive(),
  lead_time_days: z.number().int().positive(),
  sample_cost_cny: z.number().nonnegative(),
  stock_qty: z.number().int().nonnegative().optional().default(0),
  is_in_stock: z.boolean().optional().default(true),
  primary_material_id: z.string().uuid().nullable().optional(),
  ip_id: z.string().uuid().nullable().optional(),
  search_keywords: z.string().nullable().optional(),
  seo_title_ko: z.string().nullable().optional(),
  seo_desc_ko: z.string().nullable().optional(),
  pricing_tiers: z.array(PricingTierSchema).optional().default([]),
  variants: z.array(VariantSchema).optional().default([]),
});

export async function POST(req: Request) {
  // 인증 체크는 anon_key 클라이언트로, DB 쓰기는 service_role 클라이언트로
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };

  let factory: any = null;
  if (profile?.kind === 'admin' || profile?.kind === 'md') {
    const { data } = await supabase.from('factories').select('id, approval_status, factory_code').limit(1).single() as { data: any; error: any };
    factory = data;
  } else {
    const { data } = await supabase.from('factories').select('id, approval_status, factory_code').eq('shared_login_user_id', user.id).single() as { data: any; error: any };
    factory = data;
  }

  if (!factory || factory.approval_status !== 'approved') {
    return NextResponse.json({ error: 'approved factory required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const d = parsed.data;

  let categoryName = d.category ?? '기타';
  if (d.category_id) {
    const { data: cat } = await supabase.from('categories').select('name_ko').eq('id', d.category_id).single() as { data: any; error: any };
    if (cat?.name_ko) categoryName = cat.name_ko;
  }

  const productCode = d.product_code ?? `${factory.factory_code ?? 'F'}-${Date.now().toString(36).toUpperCase()}`;

  let cbm = d.cbm_per_box;
  if (!cbm && d.box_length_cm && d.box_width_cm && d.box_height_cm) {
    cbm = Math.round((d.box_length_cm * d.box_width_cm * d.box_height_cm / 1000000) * 100000) / 100000;
  }

  const { data: newProduct, error } = await adminSupabase
    .from('products')
    .insert({
      factory_id: factory.id,
      product_code: productCode,
      sku: productCode,
      category: categoryName,
      category_id: d.category_id ?? null,
      ip_id: d.ip_id ?? null,
      name_zh: d.name_zh,
      name_ko: d.name_ko,
      name_en: d.name_en ?? null,
      description_zh: d.description_zh,
      description_ko: d.description_ko,
      brand_name: d.brand_name ?? null,
      origin_country: d.origin_country,
      hs_code: d.hs_code ?? null,
      barcode: d.barcode ?? null,
      product_tags: d.product_tags,
      supplier_type: d.supplier_type,
      detail_html_ko: d.detail_html_ko ?? null,
      detail_html_zh: d.detail_html_zh ?? null,
      key_features: d.key_features,
      caution_ko: d.caution_ko ?? null,
      caution_zh: d.caution_zh ?? null,
      size_mm: d.size_mm ?? null,
      product_size_cm: d.product_size_cm ?? null,
      material_detail: d.material_detail ?? null,
      material_zh: d.material_zh ?? null,
      primary_material_id: d.primary_material_id ?? null,
      colors: d.colors,
      sizes: d.sizes,
      print_methods: d.print_methods,
      packaging_detail: d.packaging_detail ?? null,
      surface_treatment: d.surface_treatment ?? null,
      weight_g: d.weight_g ?? null,
      box_length_cm: d.box_length_cm ?? null,
      box_width_cm: d.box_width_cm ?? null,
      box_height_cm: d.box_height_cm ?? null,
      cbm_per_box: cbm ?? null,
      pcs_per_box: d.pcs_per_box ?? null,
      inner_box_pcs: d.inner_box_pcs ?? null,
      outer_box_pcs: d.outer_box_pcs ?? null,
      package_qty_per_box: d.pcs_per_box ?? null,
      gross_weight_kg: d.gross_weight_kg ?? null,
      certifications: d.certifications,
      safety_warnings: d.safety_warnings ?? null,
      age_restriction: d.age_restriction ?? null,
      shelf_life_days: d.shelf_life_days ?? null,
      customizable: d.customizable,
      nda_available: d.nda_available,
      oem_available: d.oem_available,
      odm_available: d.odm_available,
      image_url: d.image_urls?.[0] ?? null,
      image_urls: d.image_urls,
      video_url: d.video_url ?? null,
      detail_images: d.detail_images,
      certificate_images: d.certificate_images,
      supply_price_cny: d.supply_price_cny ?? d.unit_price_cny,
      sell_price_cny: d.unit_price_cny,
      price_cny: d.unit_price_cny,
      price_usd: d.price_usd ?? null,
      price_krw: d.price_krw ?? null,
      sample_cost_cny: d.sample_cost_cny,
      moq: d.moq,
      lead_time_days: d.lead_time_days,
      stock_qty: d.stock_qty,
      is_in_stock: d.is_in_stock,
      pricing_tiers: d.pricing_tiers,
      variants: d.variants,
      search_keywords: d.search_keywords ?? null,
      seo_title_ko: d.seo_title_ko ?? null,
      seo_desc_ko: d.seo_desc_ko ?? null,
      is_active: true,
      is_new: true,
      approval_status: 'pending_review',  // DB enum: pending_review | approved | rejected
    })
    .select('id')
    .single() as { data: any; error: any };

  if (error) {
    console.error('[POST /api/factory/products]', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, product_id: newProduct.id });
}

export async function GET(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('products')
    .select('id, sku, product_code, name_zh, name_ko, category, image_url, supply_price_cny, sell_price_cny, moq, approval_status, is_active, is_featured, is_new, is_hot, stock_qty, created_at, supplier_type', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (profile?.kind !== 'admin' && profile?.kind !== 'md') {
    const { data: factory } = await supabase
      .from('factories').select('id').eq('shared_login_user_id', user.id).single() as { data: any; error: any };
    if (!factory) return NextResponse.json({ error: 'factory not found' }, { status: 403 });
    query = query.eq('factory_id', factory.id);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ products: data ?? [], total: count ?? 0, page, limit });
}
