import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  brief_id: z.string().uuid(),
  product_name_zh: z.string().min(1).max(200),
  product_name_ko: z.string().min(1).max(200),
  unit_price_cny: z.number().positive(),
  moq: z.number().int().positive(),
  lead_time_days: z.number().int().positive(),
  sample_cost_cny: z.number().nonnegative(),
  size_mm: z.string().nullable().optional(),
  primary_material_id: z.string().uuid().nullable().optional(),
  image_urls: z.array(z.string().url()).min(1).max(6),
  notes: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: factory } = await supabase
    .from('factories')
    .select('id, factory_code, approval_status')
    .eq('shared_login_user_id', user.id)
    .single() as { data: any; error: any };

  if (!factory || factory.approval_status !== 'approved') {
    return NextResponse.json({ error: 'approved factory account required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const { data: responseId, error } = await supabase.rpc('factory_submit_proposal', {
    p_brief_id: parsed.data.brief_id,
    p_factory_id: factory.id,
    p_product_name_zh: parsed.data.product_name_zh,
    p_product_name_ko: parsed.data.product_name_ko,
    p_unit_price_cny: parsed.data.unit_price_cny,
    p_moq: parsed.data.moq,
    p_lead_time_days: parsed.data.lead_time_days,
    p_sample_cost_cny: parsed.data.sample_cost_cny,
    p_size_mm: parsed.data.size_mm ?? undefined,
    p_primary_material_id: parsed.data.primary_material_id ?? undefined,
    p_image_urls: parsed.data.image_urls,
    p_notes: parsed.data.notes ?? undefined,
  }) as { data: any; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, response_id: responseId });
}
