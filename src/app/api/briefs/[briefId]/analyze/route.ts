import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { analyzeBriefProposals, type BriefInput, type ProposalInput } from '@/lib/ai-price-analysis';

export const maxDuration = 60;  // Claude API 호출 ≤ 60s

export async function POST(
  _req: Request,
  { params }: { params: { briefId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as { data: any, error: any };

  if (!me || !['md', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'MD or admin role required' }, { status: 403 });
  }

  // Brief 정보
  const { data: brief } = await supabase
    .from('briefs')
    .select(
      `id, brief_no, title_ko, title_zh, concept,
       target_unit_price_min_cny, target_unit_price_max_cny,
       moq_min, moq_max, delivery_target,
       category:categories(name_ko, name_zh),
       seller:sellers(current_grade)`
    )
    .eq('id', params.briefId)
    .single() as { data: any, error: any };

  if (!brief) return NextResponse.json({ error: 'brief not found' }, { status: 404 });

  // 공장 제안 + 제품 + 가격
  const { data: responses } = await supabase
    .from('brief_responses')
    .select(
      `id, notes,
       factory:factories(factory_code, company_name, rating, total_orders),
       product:products(name_ko, name_zh, moq, lead_time_days, sample_cost_cny, size_mm,
         pricing:product_pricing_tiers(min_qty, unit_price_cny))`
    )
    .eq('brief_id', params.briefId) as { data: any, error: any };

  if (!responses || responses.length === 0) {
    return NextResponse.json({ error: '분석할 제안서가 없습니다' }, { status: 400 });
  }

  const briefInput: BriefInput = {
    brief_no: brief.brief_no,
    title: brief.title_ko ?? brief.title_zh,
    concept: brief.concept,
    category_name: (brief.category as any)?.name_ko ?? (brief.category as any)?.name_zh ?? '굿즈',
    target_min_cny: Number(brief.target_unit_price_min_cny ?? 0),
    target_max_cny: Number(brief.target_unit_price_max_cny ?? 0),
    moq_min: brief.moq_min ?? 1000,
    moq_max: brief.moq_max ?? 10000,
    delivery_target: brief.delivery_target ?? '미정',
  };

  const proposalInputs: ProposalInput[] = responses.map((r: any) => {
    const tier = r.product?.pricing?.[0];
    return {
      response_id: r.id,
      factory_code: r.factory?.factory_code ?? 'UNKNOWN',
      factory_company_name: r.factory?.company_name ?? '',
      factory_rating: r.factory?.rating,
      factory_total_orders: r.factory?.total_orders,
      product_name: r.product?.name_ko ?? r.product?.name_zh ?? '',
      unit_price_cny: Number(tier?.unit_price_cny ?? 0),
      moq: r.product?.moq ?? 0,
      lead_time_days: r.product?.lead_time_days ?? 0,
      sample_cost_cny: Number(r.product?.sample_cost_cny ?? 0),
      size_mm: r.product?.size_mm,
      notes: r.notes,
    };
  });

  const sellerGrade = ((brief.seller as any)?.current_grade ?? 'regular') as 'regular' | 'vip';

  let analysis: Awaited<ReturnType<typeof analyzeBriefProposals>>;
  try {
    analysis = await analyzeBriefProposals(briefInput, proposalInputs, sellerGrade);
  } catch (err: any) {
    console.error('AI analysis failed', err);
    return NextResponse.json({ error: `AI 분석 실패: ${err.message}` }, { status: 500 });
  }

  // 저장
  const { data: analysisId, error } = await supabase.rpc('save_ai_price_analysis', {
    p_brief_id: params.briefId,
    p_md_internal_user_id: me.id,
    p_response_count: responses.length,
    p_response_ids: responses.map((r: any) => r.id),
    p_market_estimate_cny: analysis.result.market_estimate_cny,
    p_market_estimate_reasoning: analysis.result.market_estimate_reasoning,
    p_best_proposal_id: analysis.result.best_proposal_id,
    p_best_proposal_reason: analysis.result.best_proposal_reason,
    p_negotiation_points: analysis.result.negotiation_points,
    p_recommended_margin_pct: analysis.result.recommended_margin_pct,
    p_recommended_seller_price_cny: analysis.result.recommended_seller_price_cny,
    p_raw_response: analysis.raw,
    p_cost_usd: analysis.cost_usd,
  } as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    analysis_id: analysisId,
    result: analysis.result,
    cost_usd: analysis.cost_usd,
  });
}
