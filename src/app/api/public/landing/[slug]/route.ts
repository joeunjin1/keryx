import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // service_role로 RLS 우회 (공개 랜딩 페이지 데이터)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );

  try {
    // 랜딩 페이지 설정 조회
    const { data: landing, error: landingError } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();

    if (landingError || !landing) {
      return NextResponse.json({ landing: null, products: [] }, { status: 404 });
    }

    // 조회수 증가 (비동기)
    supabase
      .from('landing_pages')
      .update({ view_count: (landing.view_count ?? 0) + 1 })
      .eq('slug', params.slug)
      .then(() => {});

    // 매칭된 공장의 승인된 상품 조회
    let products: any[] = [];
    if (landing.factory_ids && landing.factory_ids.length > 0) {
      const { data: factoryProducts } = await supabase
        .from('products')
        .select(`
          id, product_code, name_ko, name_zh,
          image_url, image_urls,
          price_cny, sell_price_cny, sample_cost_cny,
          moq, lead_time_days,
          category, is_in_stock, stock_qty,
          approval_status, is_active,
          factory_id,
          factory:factories(id, company_name, company_name_ko, city, avg_rating)
        `)
        .in('factory_id', landing.factory_ids)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      products = factoryProducts ?? [];
    } else {
      // 공장 미매칭 시 카테고리로 조회
      const { data: catProducts } = await supabase
        .from('products')
        .select(`
          id, product_code, name_ko, name_zh,
          image_url, image_urls,
          price_cny, sell_price_cny, sample_cost_cny,
          moq, lead_time_days,
          category, is_in_stock, stock_qty,
          approval_status, is_active,
          factory_id,
          factory:factories(id, company_name, company_name_ko, city, avg_rating)
        `)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      products = catProducts ?? [];
    }

    return NextResponse.json({ landing, products });
  } catch (e) {
    console.error('[GET /api/public/landing/[slug]]', e);
    return NextResponse.json({ landing: null, products: [], error: 'Server error' }, { status: 500 });
  }
}
