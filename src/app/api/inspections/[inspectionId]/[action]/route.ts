import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const CompleteSchema = z.object({
  outcome: z.enum(['pass', 'partial_pass', 'fail']),
  inspector_comment: z.string().nullable().optional(),
  total_minutes: z.number().int().min(1).optional(),
});

const ApproveSchema = z.object({
  notes: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { inspectionId: string; action: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role, approval_authority')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const raw = await req.json().catch(() => ({}));

  if (params.action === 'complete') {
    if (!['inspector', 'admin', 'md'].includes(me.role)) {
      return NextResponse.json({ error: 'inspector role required' }, { status: 403 });
    }

    const parsed = CompleteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { error } = await supabase.rpc('complete_inspection_capture', {
      p_inspection_id: params.inspectionId,
      p_outcome: parsed.data.outcome,
      p_inspector_comment: parsed.data.inspector_comment ?? null,
      p_total_minutes: parsed.data.total_minutes ?? null,
    }) as { data: any; error: any };

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (params.action === 'approve') {
    if (me.role !== 'admin' || !me.approval_authority) {
      return NextResponse.json({ error: 'admin approval authority required' }, { status: 403 });
    }

    const parsed = ApproveSchema.safeParse(raw);
    const notes = parsed.success ? parsed.data.notes : undefined;

    const { data: balanceId, error } = await supabase.rpc('admin_approve_inspection', {
      p_inspection_id: params.inspectionId,
      p_admin_internal_user_id: me.id,
      p_notes: notes ?? null,
    }) as { data: any; error: any };

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, balance_payment_id: balanceId });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
