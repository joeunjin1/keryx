import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { matchProductsForSellerIntent, type CatalogProduct } from '@/lib/ai-matching';

export const maxDuration = 60;

const Schema = z.object({
  seller_id: z.string().uuid(),
  seller_interest_id: z.string().uuid().nullable().optional(),
  description: z.string().min(5).max(2000),
  budget_hint: z.string().nullable().optional(),
  moq_hint: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as unknown as { data: any, error: any };
  if (!me || !['md', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'MD or admin role required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { data: seller } = await supabase
    .from('sellers')
    .select('current_grade')
    .eq('id', parsed.data.seller_id)
    .single() as unknown as { data: any, error: any };
  if (!seller) return NextResponse.json({ error: 'seller not found' }, { status: 404 });

  // 카탈로그에서 후보 추출 (approved + 카테고리 필터 옵션)
  let query: any = supabase
    .from('products')
    .select(
      `id, sku, name_ko, name_zh, moq, lead_time_days, has_ip,
       category:categories(name_ko, name_zh),
       factory:factories(factory_code, rating),
       ip:ips(name_ko),
       pricing:product_pricing_tiers(min_qty, unit_price_cny)`
    )
    .eq('approval_status', 'approved')
    .order('created_at')
    .limit(100);

  if (parsed.data.category_id) {
    query = query.eq('category_id', parsed.data.category_id);
  }

  const { data: products } = await query;
  if (!products || products.length === 0) {
    return NextResponse.json({ error: '평가 가능한 제품이 없습니다' }, { status: 400 });
  }

  // 매칭 입력 형식 변환
  const catalogInput: CatalogProduct[] = products.map((p: any) => ({
    product_id: p.id,
    sku: p.sku,
    name_ko: p.name_ko,
    name_zh: p.name_zh,
    category_name: p.category?.name_ko ?? p.category?.name_zh ?? '',
    factory_code: p.factory?.factory_code ?? 'UNKNOWN',
    factory_rating: p.factory?.rating,
    unit_price_cny: Number(p.pricing?.[0]?.unit_price_cny ?? 0),
    moq: p.moq ?? 0,
    lead_time_days: p.lead_time_days ?? 0,
    has_ip: !!p.has_ip,
    ip_name: p.ip?.name_ko ?? null,
  }));

  let result: Awaited<ReturnType<typeof matchProductsForSellerIntent>>;
  try {
    result = await matchProductsForSellerIntent({
      seller_grade: (seller.current_grade ?? 'regular') as any,
      description: parsed.data.description,
      budget_hint: parsed.data.budget_hint ?? undefined,
      moq_hint: parsed.data.moq_hint ?? undefined,
    }, catalogInput);
  } catch (err: any) {
    return NextResponse.json({ error: `AI 매칭 실패: ${err.message}` }, { status: 500 });
  }

  const { data: matchId, error } = await supabase.rpc('save_ai_seller_product_matches', {
    p_seller_id: parsed.data.seller_id,
    p_seller_interest_id: parsed.data.seller_interest_id ?? null,
    p_md_internal_user_id: me.id,
    p_matches: result.matches as any,
    p_total_evaluated: products.length,
    p_raw_response: result.raw,
    p_cost_usd: result.cost_usd,
  } as any);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    match_id: matchId,
    matches: result.matches,
    total_evaluated: products.length,
    cost_usd: result.cost_usd,
  });
}
