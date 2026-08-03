import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const ReportSchema = z.object({
  item_id: z.string().uuid().optional(),
  candidate_factories: z.array(
    z.object({
      anon_label: z.string(),  // 공장 A / 공장 B
      city: z.string().optional(),
      unit_price_cny: z.number().positive(),
      moq: z.number().int().positive(),
      lead_time_days: z.number().int().positive(),
      sample_cost_cny: z.number().nonnegative().optional(),
      rating: z.number().min(0).max(5).optional(),
      notes: z.string().optional(),
      factory_id: z.string().uuid().optional(),  // internal only — never sent to seller
    })
  ).min(1).max(5),
  market_price_reference: z.object({
    alibaba_min: z.number().optional(),
    alibaba_max: z.number().optional(),
    market_1688_min: z.number().optional(),
    market_1688_max: z.number().optional(),
    korea_wholesale_min: z.number().optional(),
    korea_wholesale_max: z.number().optional(),
  }).optional(),
  md_recommendation: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || !['md', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = ReportSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('market_research_reports')
    .insert({
      request_id: params.requestId,
      item_id: parsed.data.item_id ?? null,
      written_by_md_id: me.id,
      candidate_factories: parsed.data.candidate_factories as any,
      market_price_reference: parsed.data.market_price_reference ?? {},
      md_recommendation: parsed.data.md_recommendation,
    })
    .select()
    .single() as { data: any; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: data });
}

// MD signals all reports done → admin queue
export async function PATCH(
  _req: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || !['md', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase.rpc('market_research_md_complete', {
    p_request_id: params.requestId,
    p_md_internal_user_id: me.id,
  }) as { data: any; error: any };

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
