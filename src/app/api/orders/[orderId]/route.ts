import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('orders')
    .select(
      `*,
       seller:sellers(id, business_name, current_grade, country),
       md:internal_users(id, name_ko, name_zh, staff_code),
       admin_approved_by_user:internal_users!orders_admin_approved_by_fkey(name_ko, staff_code),
       items:order_items(
         id, qty, unit_price_cny, subtotal_cny,
         product:products(id, name_ko, name_zh,
           images:product_images(url),
           factory:factories(factory_code, company_name)
         )
       ),
       payments(id, payment_no, kind, amount_cny, status, paid_at, payment_currency, amount_charged),
       invoices(id, invoice_no, type, total_qty, passed_qty, unit_price_cny, subtotal_cny, shipping_cost_cny, total_cny, status, due_date, paid_at, notes_zh),
       shipments(id, shipment_no, shipping_method, tracking_no, tracking_url, status, shipped_at, arrived_at, delivered_at, shipping_cost_cny, notes_zh)`
    )
    .eq('id', params.orderId)
    .single() as { data: any; error: any };

  if (error || !data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ order: data });
}

const PatchSchema = z.object({
  status: z.enum(['cancelled']).optional(),
  packaging_notes: z.string().nullable().optional(),
  seller_inspection_notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient() as any;
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

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('orders')
    .update(parsed.data)
    .eq('id', params.orderId)
    .select()
    .single() as { data: any; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
