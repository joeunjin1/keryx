import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  notes: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Admin only
  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role, approval_authority')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || me.role !== 'admin' || !me.approval_authority) {
    return NextResponse.json({ error: 'admin approval authority required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  const notes = parsed.success ? parsed.data.notes : undefined;

  const { data: paymentId, error } = await supabase.rpc('approve_order', {
    p_order_id: params.orderId,
    p_admin_internal_user_id: me.id,
    p_notes: notes ?? null,
  }) as { data: any; error: any };

  if (error) {
    console.error('approve_order failed', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deposit_payment_id: paymentId });
}
