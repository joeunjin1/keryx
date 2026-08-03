import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  reference: z.string().max(200).optional(),
  receipt_url: z.string().url().optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as { data: any, error: any };

  if (!me || !['admin', 'finance'].includes(me.role)) {
    return NextResponse.json({ error: 'finance/admin role required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { error } = await supabase.rpc('mark_payment_paid', {
    p_payment_id: params.paymentId,
    p_reference: parsed.data.reference ?? null,
    p_receipt_url: parsed.data.receipt_url ?? null,
  } as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
