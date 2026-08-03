import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient, createAdminClient } from '@/lib/supabase/server';

const ItemSchema = z.object({
  product_id: z.string().uuid(),
  factory_id: z.string(),  // could be UUID or factory_code lookup needed
  qty: z.number().int().min(1),
  unit_price_cny: z.number().positive(),
  subtotal_cny: z.number().positive(),
});

const CreateSchema = z.object({
  seller_id: z.string().uuid(),
  items: z.array(ItemSchema).min(1),
  packaging_type: z.enum(['factory_standard', 'keryx_designer']),
  packaging_notes: z.string().nullable().optional(),
  seller_inspection_notes: z.string().nullable().optional(),
  payment_route: z.enum(['gaza_krw', 'direct_usd', 'direct_cny']),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;

  // Auth — only internal users (MD/admin) can create orders
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: me } = await supabase
    .from('internal_users')
    .select('id')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  // Parse
  const raw = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Resolve factory IDs (the form might pass factory_code; we need UUID)
  // For each item, resolve factory_id from products if needed
  const productIds = input.items.map((i) => i.product_id);
  const { data: products } = await supabase
    .from('products')
    .select('id, factory_id')
    .in('id', productIds);

  const productFactoryMap = new Map(
    ((products ?? []) as any[]).map((p: any) => [p.id, p.factory_id])
  );

  // Generate order_no via DB function
  const { data: orderNoData } = await supabase.rpc('generate_order_no') as { data: any; error: any };
  const order_no = orderNoData as string;

  // Create order in draft state
  const { data: order, error: orderError } = await adminSupabase
    .from('orders')
    .insert({
      order_no,
      seller_id: input.seller_id,
      md_id: me?.id ?? null,
      status: 'draft',
      packaging_type: input.packaging_type,
      packaging_notes: input.packaging_notes ?? null,
      seller_inspection_notes: input.seller_inspection_notes ?? null,
      payment_route: input.payment_route,
      deposit_pct: 30,
      balance_pct: 70,
    })
    .select()
    .single() as { data: any; error: any };

  if (orderError || !order) {
    console.error('order insert failed', orderError);
    return NextResponse.json({ error: 'create failed', detail: orderError?.message }, { status: 500 });
  }

  // Create order items (factory_id resolved from products)
  const itemRows = input.items.map((it) => ({
    order_id: order.id,
    product_id: it.product_id,
    factory_id: productFactoryMap.get(it.product_id) ?? null,
    qty: it.qty,
    unit_price_cny: it.unit_price_cny,
    subtotal_cny: it.subtotal_cny,
  }));

  const { error: itemsError } = await adminSupabase.from('order_items').insert(itemRows as any) as { data: any; error: any };

  if (itemsError) {
    console.error('items insert failed', itemsError);
    // Cleanup
    await adminSupabase.from('orders').delete().eq('id', order.id) as { data: any; error: any };
    return NextResponse.json({ error: 'items insert failed' }, { status: 500 });
  }

  // The trigger auto-recalculates totals. Re-fetch.
  const { data: updated } = await supabase.from('orders').select('*').eq('id', order.id).single() as { data: any; error: any };

  return NextResponse.json({ order: updated });
}
