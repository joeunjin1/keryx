import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient, createAdminClient } from '@/lib/supabase/server';

const Schema = z.object({
  order_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || !['inspector', 'admin', 'md'].includes(me.role)) {
    return NextResponse.json({ error: 'inspector role required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  // First mark order as arrived if not yet
  await supabase.rpc('arrive_at_warehouse', { p_order_id: parsed.data.order_id }) as { data: any; error: any };

  // Start inspection
  const { data: inspectionId, error } = await supabase.rpc('start_inspection', {
    p_order_id: parsed.data.order_id,
    p_inspector_id: me.id,
  }) as { data: any; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auto-seed inspection items from category guides
  const { data: order } = await supabase
    .from('orders')
    .select('seller_inspection_notes, items:order_items(product:products(category_id))')
    .eq('id', parsed.data.order_id)
    .single() as { data: any; error: any };

  if (order) {
    const categoryIds = Array.from(
      new Set(
        (order.items ?? [])
          .map((it: any) => it.product?.category_id)
          .filter(Boolean)
      )
    );

    if (categoryIds.length > 0) {
      const { data: guides } = await supabase
        .from('inspection_guides')
        .select('id, category_id, item_label_zh, item_label_ko, est_minutes_per_100, display_order')
        .in('category_id', categoryIds)
        .eq('is_default', true) as { data: any; error: any };

      if (guides && guides.length > 0) {
        const items = (guides as any[]).map((g: any, idx: number) => ({
          inspection_id: inspectionId as string,
          guide_id: g.id,
          is_seller_request: false,
          label_zh: g.item_label_zh,
          label_ko: g.item_label_ko,
          display_order: g.display_order ?? idx,
        }));
        await adminSupabase.from('inspection_items').insert(items as any) as { data: any; error: any };
      }
    }

    // Add seller request items if any
    if (order.seller_inspection_notes) {
      await adminSupabase.from('inspection_items').insert({
        inspection_id: inspectionId as string,
        is_seller_request: true,
        label_zh: order.seller_inspection_notes,
        label_ko: order.seller_inspection_notes,
        display_order: 99,
      } as any) as { data: any; error: any };
    }
  }

  return NextResponse.json({ inspection_id: inspectionId });
}
