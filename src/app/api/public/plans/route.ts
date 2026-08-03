/**
 * /api/public/plans
 * 스킬 원칙: 가격은 DB 단일 소스 (subscription_plans 테이블)
 * 인증 불필요 — 멤버십 페이지에서 누구나 조회 가능
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );

  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select(`
      id,
      name_ko,
      name_zh,
      tagline_ko,
      tagline_zh,
      price_monthly,
      price_yearly,
      currency,
      description_ko,
      description_zh,
      features_ko,
      features_zh,
      is_active,
      sort_order,
      color_class,
      recommended,
      badge_ko,
      badge_zh,
      trial_days,
      quota_factory_match,
      quota_market_research,
      quota_catalog_view,
      quota_unlimited
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: plans ?? [] });
}
