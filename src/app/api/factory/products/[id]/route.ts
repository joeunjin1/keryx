import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// 시스템 관리 필드 - 절대 수정 불가 목록
const IMMUTABLE_FIELDS = new Set([
  'id', 'factory_id', 'created_at', 'approval_status',
  'is_active', 'is_featured', 'is_hot', 'inquiry_count',
  'order_count', 'rating_avg', 'rating_count', 'view_count',
]);

// 허용된 수정 가능 필드 목록 (화이트리스트 방식 - 안전)
const ALLOWED_FIELDS = new Set([
  'name_zh', 'name_ko', 'name_en', 'brand_name', 'origin_country',
  'hs_code', 'barcode', 'product_code', 'sku', 'product_tags',
  'supplier_type', 'description_zh', 'description_ko',
  'detail_html_ko', 'detail_html_zh', 'key_features',
  'caution_ko', 'caution_zh', 'size_mm', 'product_size_cm',
  'material_detail', 'material_zh', 'primary_material_id',
  'colors', 'sizes', 'print_methods', 'packaging_detail',
  'surface_treatment', 'weight_g', 'box_length_cm', 'box_width_cm',
  'box_height_cm', 'cbm_per_box', 'pcs_per_box', 'inner_box_pcs',
  'outer_box_pcs', 'package_qty_per_box', 'gross_weight_kg',
  'certifications', 'safety_warnings', 'age_restriction',
  'shelf_life_days', 'customizable', 'nda_available',
  'oem_available', 'odm_available', 'image_url', 'image_urls',
  'video_url', 'detail_images', 'certificate_images',
  'supply_price_cny', 'sell_price_cny', 'price_cny',
  'price_usd', 'price_krw', 'sample_cost_cny', 'moq',
  'lead_time_days', 'stock_qty', 'is_in_stock',
  'pricing_tiers', 'variants', 'search_keywords',
  'seo_title_ko', 'seo_desc_ko', 'category_id', 'category',
  'ip_id', 'is_new', 'is_orderable',
]);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const productId = params.id;
  if (!productId) return NextResponse.json({ error: 'product id required' }, { status: 400 });

  // 권한 확인: 해당 상품이 이 공장의 것인지 확인
  const { data: profile } = await supabase
    .from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };

  const isAdmin = profile?.kind === 'admin' || profile?.kind === 'md';

  // 기존 상품 조회 (소유권 확인용)
  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('id, factory_id, approval_status')
    .eq('id', productId)
    .single() as { data: any; error: any };

  if (fetchErr || !existing) {
    return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 관리자가 아닌 경우 자신의 공장 상품만 수정 가능
  if (!isAdmin) {
    const { data: factory } = await supabase
      .from('factories').select('id').eq('shared_login_user_id', user.id).single() as { data: any; error: any };
    if (!factory || factory.id !== existing.factory_id) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }
  }

  // 요청 바디 파싱
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  // 화이트리스트 필터링 - 허용된 필드만 추출, undefined/null 처리
  const updateData: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    // 불변 필드 제외
    if (IMMUTABLE_FIELDS.has(key)) continue;
    // 허용 목록에 없는 필드 제외
    if (!ALLOWED_FIELDS.has(key)) continue;
    // undefined는 건너뜀 (해당 필드 변경 없음)
    if (value === undefined) continue;
    updateData[key] = value;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
  }

  // CBM 자동 계산 (박스 사이즈가 변경된 경우)
  if (
    (updateData.box_length_cm || updateData.box_width_cm || updateData.box_height_cm) &&
    !updateData.cbm_per_box
  ) {
    const l = updateData.box_length_cm ?? existing.box_length_cm;
    const w = updateData.box_width_cm ?? existing.box_width_cm;
    const h = updateData.box_height_cm ?? existing.box_height_cm;
    if (l && w && h) {
      updateData.cbm_per_box = Math.round((l * w * h / 1000000) * 100000) / 100000;
    }
  }

  // image_urls 변경 시 image_url(대표이미지)도 동기화
  if (updateData.image_urls && Array.isArray(updateData.image_urls) && updateData.image_urls.length > 0) {
    updateData.image_url = updateData.image_urls[0];
  }

  // sell_price_cny / price_cny 동기화
  if (updateData.sell_price_cny && !updateData.price_cny) {
    updateData.price_cny = updateData.sell_price_cny;
  }

  // category_id 변경 시 category 이름도 업데이트
  if (updateData.category_id) {
    const { data: cat } = await supabase
      .from('categories').select('name_ko').eq('id', updateData.category_id).single() as { data: any; error: any };
    if (cat?.name_ko) updateData.category = cat.name_ko;
  }

  // updated_at 갱신
  updateData.updated_at = new Date().toISOString();

  // DB 업데이트 (service_role 클라이언트로 RLS 우회)
  const { error: updateErr } = await adminSupabase
    .from('products')
    .update(updateData)
    .eq('id', productId) as { error: any };

  if (updateErr) {
    console.error('[PATCH /api/factory/products/:id]', updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at') });
}
