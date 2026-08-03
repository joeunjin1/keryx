import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { generateBriefDraft } from '@/lib/ai-matching';

export const maxDuration = 60;

const Schema = z.object({
  seller_id: z.string().uuid(),
  seller_interest_id: z.string().uuid().nullable().optional(),
  source_text: z.string().min(5).max(2000),
  budget_hint: z.string().nullable().optional(),
  moq_hint: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single();
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
    .select('id, business_name, current_grade, country')
    .eq('id', parsed.data.seller_id)
    .single();
  if (!seller) return NextResponse.json({ error: 'seller not found' }, { status: 404 });

  const { data: categories } = await supabase
    .from('categories')
    .select('id, code, name_ko, name_zh')
    .eq('is_active', true)
    .order('display_order');

  let result: Awaited<ReturnType<typeof generateBriefDraft>>;
  try {
    result = await generateBriefDraft({
      seller_business_name: seller.business_name,
      seller_grade: (seller.current_grade ?? 'regular') as any,
      seller_country: seller.country ?? 'KR',
      source_text: parsed.data.source_text,
      budget_hint: parsed.data.budget_hint ?? undefined,
      moq_hint: parsed.data.moq_hint ?? undefined,
      available_categories: (categories ?? []) as any,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `AI 생성 실패: ${err.message}` }, { status: 500 });
  }

  // 저장
  const { data: draftId, error } = await supabase.rpc('save_ai_brief_draft', {
    p_seller_id: parsed.data.seller_id,
    p_seller_interest_id: parsed.data.seller_interest_id ?? null,
    p_md_internal_user_id: me.id,
    p_title_ko: result.result.title_ko,
    p_title_zh: result.result.title_zh,
    p_concept: result.result.concept,
    p_category_id: result.result.category_id,
    p_target_price_min: result.result.target_price_min_cny,
    p_target_price_max: result.result.target_price_max_cny,
    p_moq_min: result.result.moq_min,
    p_moq_max: result.result.moq_max,
    p_delivery_target_days: result.result.delivery_target_days,
    p_md_notes_to_factory: result.result.md_notes_to_factory,
    p_source_text: parsed.data.source_text,
    p_raw_response: result.raw,
    p_cost_usd: result.cost_usd,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    draft_id: draftId,
    draft: result.result,
    cost_usd: result.cost_usd,
  });
}
