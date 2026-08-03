import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const PatchSchema = z.object({
  result: z.enum(['pass', 'partial', 'fail']).optional(),
  qty_passed: z.number().int().min(0).optional(),
  qty_failed: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { itemId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('role')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || !['inspector', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  // Auto-calculate pass_rate from qty_passed/qty_failed
  const updates: any = { ...parsed.data };
  if (parsed.data.qty_passed != null && parsed.data.qty_failed != null) {
    const total = parsed.data.qty_passed + parsed.data.qty_failed;
    updates.pass_rate = total > 0 ? +(parsed.data.qty_passed / total * 100).toFixed(2) : null;
  }

  const { data, error } = await supabase
    .from('inspection_items')
    .update(updates)
    .eq('id', params.itemId)
    .select()
    .single() as { data: any; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
