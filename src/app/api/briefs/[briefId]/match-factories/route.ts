import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { matchFactoriesForBrief } from '@/lib/ai-matching';

export const maxDuration = 60;

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
       moq_min, moq_max, deadline, category_id,
       category:categories(name_ko, name_zh)`
    )
    .eq('id', params.briefId)
    .single() as { data: any, error: any };
  if (!brief) return NextResponse.json({ error: 'brief not found' }, { status: 404 });

  // 카테고리 기반 공장 통계
  const { data: stats } = (await supabase.rpc('factory_specialty_stats' as any, {
    p_category_id: brief.category_id,
  } as any)) as unknown as { data: any, error: any };

  if (!stats || stats.length === 0) {
    return NextResponse.json({ error: '평가 가능한 공장이 없습니다' }, { status: 400 });
  }

  // 납기 일수 계산
  const deliveryDays = brief.deadline 
    ? Math.max(7, Math.round((new Date(brief.deadline).getTime() - Date.now()) / 86400000))
    : 30;

  let result: Awaited<ReturnType<typeof matchFactoriesForBrief>>;
  try {
    result = await matchFactoriesForBrief({
      title: brief.title_ko ?? brief.title_zh ?? '',
      concept: brief.concept ?? '',
      category_name: (brief.category as any)?.name_ko ?? (brief.category as any)?.name_zh ?? '굿즈',
      target_price_min: Number(brief.target_unit_price_min_cny ?? 0),
      target_price_max: Number(brief.target_unit_price_max_cny ?? 0),
      moq_min: brief.moq_min ?? 1000,
      moq_max: brief.moq_max ?? 10000,
      delivery_days: deliveryDays,
    }, stats as any);
  } catch (err: any) {
    return NextResponse.json({ error: `AI 매칭 실패: ${err.message}` }, { status: 500 });
  }

  // 저장
  const { data: matchId, error } = await supabase.rpc('save_ai_factory_matches', {
    p_brief_id: params.briefId,
    p_md_internal_user_id: me.id,
    p_matches: result.matches as any,
    p_total_evaluated: stats.length,
    p_raw_response: result.raw,
    p_cost_usd: result.cost_usd,
  } as any);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    match_id: matchId,
    matches: result.matches,
    total_evaluated: stats.length,
    cost_usd: result.cost_usd,
  });
}
