import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient, createAdminClient } from '@/lib/supabase/server';

const ItemSchema = z.object({
  description: z.string().min(1).max(2000),
  reference_image_urls: z.array(z.string().url()).default([]),
  desired_unit_price_hint: z.string().max(100).optional(),
  desired_qty_hint: z.string().max(100).optional(),
  desired_timing: z.string().max(100).optional(),
  wants_sample: z.boolean().default(false),
});

const CreateSchema = z.object({
  items: z.array(ItemSchema).min(1).max(10),
  is_urgent: z.boolean().default(false),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, current_grade, assigned_md_id, current_membership')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!seller) {
    return NextResponse.json({ error: 'seller profile required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  // Quota check
  const { data: hasQuota } = await supabase.rpc('market_research_check_quota', {
    p_seller_id: seller.id,
    p_count: parsed.data.items.length,
  }) as { data: any; error: any };

  if (!hasQuota) {
    return NextResponse.json(
      { error: '시장조사 한도 초과. 멤버십 상세를 확인하세요.' },
      { status: 402 }
    );
  }

  // Generate request_no
  const { data: requestNo } = await supabase.rpc('generate_research_no') as { data: any; error: any };

  const { data: request, error } = await adminSupabase
    .from('market_research_requests')
    .insert({
      request_no: requestNo as string,
      seller_id: seller.id,
      assigned_md_id: seller.assigned_md_id,
      product_count: parsed.data.items.length,
      is_urgent: parsed.data.is_urgent,
      status: 'requested',
      expected_deadline: parsed.data.is_urgent
        ? new Date(Date.now() + 3 * 86400 * 1000).toISOString().slice(0, 10)
        : new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10),
    } as any)
    .select()
    .single() as { data: any; error: any };

  if (error || !request) {
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 500 });
  }

  // Create items
  const itemRows = parsed.data.items.map((it, idx) => ({
    request_id: request.id,
    position: idx + 1,
    description: it.description,
    reference_image_urls: it.reference_image_urls,
    desired_unit_price_hint: it.desired_unit_price_hint ?? null,
    desired_qty_hint: it.desired_qty_hint ?? null,
    desired_timing: it.desired_timing ?? null,
    wants_sample: it.wants_sample,
  }));

  await adminSupabase.from('market_research_items').insert(itemRows as any) as { data: any; error: any };

  // Log usage if not VIP/unlimited
  if (seller.current_grade !== 'vip' && !['unlimited', 'vip_auto'].includes(seller.current_membership ?? '')) {
    await adminSupabase.from('membership_usage_log').insert({
      seller_id: seller.id,
      research_request_id: request.id,
      count_used: parsed.data.items.length,
    }) as { data: any; error: any };
  }

  return NextResponse.json({ request });
}
