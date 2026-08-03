import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  seller_id: z.string().uuid(),
  margin_pct: z.number().min(0).max(100),
  payment_route: z.enum(['gaza_krw', 'direct_usd', 'direct_cny']),
  packaging_type: z.enum(['factory_standard', 'keryx_designer']),
  packaging_notes: z.string().nullable().optional(),
  expected_warehouse_arrival: z.string(),  // YYYY-MM-DD
  ai_analysis_id: z.string().uuid().nullable().optional(),
  lines: z.array(z.object({
    product_id: z.string().uuid(),
    factory_id: z.string().uuid(),
    qty: z.number().int().positive(),
    factory_cost_cny: z.number().positive(),
  })).min(1).max(20),
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
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const { data: orderId, error } = await supabase.rpc('create_md_order_with_margin', {
    p_md_internal_user_id: me.id,
    p_seller_id: parsed.data.seller_id,
    p_md_margin_pct: parsed.data.margin_pct,
    p_payment_route: parsed.data.payment_route,
    p_packaging_type: parsed.data.packaging_type,
    p_packaging_notes: parsed.data.packaging_notes ?? null,
    p_expected_warehouse_arrival: parsed.data.expected_warehouse_arrival,
    p_ai_analysis_id: parsed.data.ai_analysis_id ?? null,
    p_lines: parsed.data.lines,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, order_id: orderId });
}
