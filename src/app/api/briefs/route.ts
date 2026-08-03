import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  seller_id: z.string().uuid(),
  title_zh: z.string().min(1).max(200),
  title_ko: z.string().min(1).max(200),
  concept: z.string().min(10).max(2000),
  category_id: z.string().uuid(),
  target_price_min: z.number().positive(),
  target_price_max: z.number().positive(),
  moq_min: z.number().int().positive(),
  moq_max: z.number().int().positive(),
  delivery_target: z.string(),  // YYYY-MM-DD
  reference_image_urls: z.array(z.string().url()).default([]),
  md_notes_to_factory: z.string().max(2000).optional(),
  factory_ids: z.array(z.string().uuid()).min(1).max(10),
  is_vip_priority: z.boolean().default(false),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || !['md', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'MD or admin role required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const { data: briefId, error } = await supabase.rpc('create_brief_with_recipients', {
    p_md_internal_user_id: me.id,
    p_seller_id: parsed.data.seller_id,
    p_title_zh: parsed.data.title_zh,
    p_title_ko: parsed.data.title_ko,
    p_concept: parsed.data.concept,
    p_category_id: parsed.data.category_id,
    p_target_price_min: parsed.data.target_price_min,
    p_target_price_max: parsed.data.target_price_max,
    p_moq_min: parsed.data.moq_min,
    p_moq_max: parsed.data.moq_max,
    p_delivery_target: parsed.data.delivery_target,
    p_reference_image_urls: parsed.data.reference_image_urls,
    p_md_notes_to_factory: parsed.data.md_notes_to_factory ?? '',
    p_factory_ids: parsed.data.factory_ids,
    p_is_vip_priority: parsed.data.is_vip_priority,
  }) as { data: any; error: any };

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ brief_id: briefId });
}
