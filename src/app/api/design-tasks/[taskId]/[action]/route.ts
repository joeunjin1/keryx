import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const ApproveSchema = z.object({
  notes: z.string().max(500).optional(),
});

const RevisionSchema = z.object({
  revision_notes: z.string().min(1).max(1000),
});

export async function POST(
  req: Request,
  { params }: { params: { taskId: string; action: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };
  if (!profile) return NextResponse.json({ error: 'no profile' }, { status: 403 });

  // 승인 권한: seller (해당 주문의), md, admin
  const { data: task } = await supabase
    .from('design_tasks')
    .select('order_id, order:orders(seller_id, seller:sellers(user_id))')
    .eq('id', params.taskId)
    .single() as { data: any; error: any };
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const isOrderSeller = (task.order as any)?.seller?.user_id === user.id;
  const isInternal = ['md', 'admin'].includes(profile.kind);
  if (!isOrderSeller && !isInternal) {
    return NextResponse.json({ error: 'permission denied' }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));

  if (params.action === 'approve') {
    const parsed = ApproveSchema.safeParse(raw);
    const notes = parsed.success ? parsed.data.notes : undefined;
    const approverKind = isOrderSeller ? 'seller' : 'md';

    const { error } = await supabase.rpc('approve_design_mockup', {
      p_design_task_id: params.taskId,
      p_approved_by_user_id: user.id,
      p_approver_kind: approverKind,
      p_approval_notes: notes,
    }) as { data: any; error: any };

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (params.action === 'revision') {
    const parsed = RevisionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'revision_notes required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('request_design_revision', {
      p_design_task_id: params.taskId,
      p_requested_by_user_id: user.id,
      p_revision_notes: parsed.data.revision_notes,
    }) as { data: any; error: any };
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
