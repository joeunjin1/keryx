import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // service_role 클라이언트 사용 (RLS 우회, 승인된 상품 조회)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        product_code,
        sku,
        name_zh,
        name_ko,
        name_en,
        description_zh,
        description_ko,
        detail_html_ko,
        detail_html_zh,
        key_features,
        caution_ko,
        caution_zh,
        tagline,
        category,
        category_id,
        brand_name,
        origin_country,
        hs_code,
        supplier_type,
        product_type,
        has_ip,
        price_cny,
        sell_price_cny,
        supply_price_cny,
        price_usd,
        price_krw,
        moq,
        lead_time_days,
        sample_cost_cny,
        stock_qty,
        is_in_stock,
        is_active,
        is_featured,
        is_new,
        is_hot,
        customizable,
        oem_available,
        odm_available,
        nda_available,
        size_mm,
        product_size_cm,
        weight_g,
        material_detail,
        material_zh,
        colors,
        sizes,
        print_methods,
        packaging_detail,
        surface_treatment,
        box_length_cm,
        box_width_cm,
        box_height_cm,
        cbm_per_box,
        pcs_per_box,
        inner_box_pcs,
        outer_box_pcs,
        gross_weight_kg,
        certifications,
        safety_warnings,
        age_restriction,
        image_url,
        image_urls,
        detail_images,
        certificate_images,
        video_url,
        pricing_tiers,
        variants,
        product_tags,
        search_keywords,
        seo_title_ko,
        seo_desc_ko,
        approval_status,
        views,
        total_sold,
        rating_avg,
        rating_count,
        inquiry_count,
        order_count,
        created_at,
        approved_at,
        factory_id,
        factory:factories(
          id,
          factory_code,
          company_name,
          company_name_ko,
          city,
          province,
          avg_rating,
          audit_score,
          contact_name,
          cover_image_url,
          intro_text_zh,
          intro_text_ko,
          approval_status,
          primary_categories,
          employee_count,
          founded_year,
          production_capacity,
          response_rate,
          avg_lead_time_days
        )
      `)
      .eq('id', params.id)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ product: null }, { status: 404 });
    }

    // 조회수 증가 (비동기, 실패해도 무시)
    supabase
      .from('products')
      .update({ views: (data.views ?? 0) + 1 })
      .eq('id', params.id)
      .then(() => {});

    return NextResponse.json({ product: data });
  } catch {
    return NextResponse.json({ product: null, error: 'Server error' }, { status: 500 });
  }
}
