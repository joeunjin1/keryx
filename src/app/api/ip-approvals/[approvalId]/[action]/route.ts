import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const SubmitSchema = z.object({
  submission_files: z.array(z.string().url()).min(1),
  submission_notes: z.string().max(2000).optional(),
});

const DecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'conditional']),
  decision_notes: z.string().max(2000).optional(),
  conditions: z.string().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { approvalId: string; action: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role, approval_authority')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || me.role !== 'admin') {
    return NextResponse.json({ error: 'admin role required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);

  if (params.action === 'submit') {
    const parsed = SubmitSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    const { error } = await supabase.rpc('ip_admin_submit_to_licensor', {
      p_approval_id: params.approvalId,
      p_admin_internal_user_id: me.id,
      p_submission_files: parsed.data.submission_files,
      p_submission_notes: parsed.data.submission_notes,
    }) as { data: any; error: any };

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (params.action === 'decision') {
    if (!me.approval_authority) {
      return NextResponse.json({ error: 'approval authority required' }, { status: 403 });
    }
    const parsed = DecisionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    const { error } = await supabase.rpc('ip_record_licensor_decision', {
      p_approval_id: params.approvalId,
      p_admin_internal_user_id: me.id,
      p_decision: parsed.data.decision,
      p_decision_notes: parsed.data.decision_notes,
      p_conditions: parsed.data.conditions,
    }) as { data: any; error: any };

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
