import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireSeller } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

const DecisionSchema = z.object({
  decision: z.enum(['approved', 'revision_requested', 'rejected']),
  note: z.string().trim().max(2000).optional().default(''),
});

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string; approvalId: string }> }) {
  const context = await requireSeller();
  if ('error' in context) return context.error;

  const { projectId, approvalId } = await params;
  if (!looksLikeUuid(projectId) || !looksLikeUuid(approvalId)) {
    return NextResponse.json({ error: '유효하지 않은 승인 요청 주소입니다.' }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = DecisionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: '승인 결정 내용을 확인해 주세요.' }, { status: 400 });
  }

  const { data: approval, error: approvalError } = await (context.admin as any)
    .from('manufacturing_project_approvals')
    .select('id, approval_type, status, project_id')
    .eq('id', approvalId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (approvalError || !approval) {
    return NextResponse.json({ error: '본인 프로젝트의 승인 요청만 처리할 수 있습니다.' }, { status: 404 });
  }
  if (approval.status !== 'pending') {
    return NextResponse.json({ error: '이미 처리되었거나 아직 발송되지 않은 승인 요청입니다.' }, { status: 409 });
  }

  const sessionClient = createClient();
  const { data, error } = await (sessionClient as any).rpc('keryx_decide_manufacturing_buyer_approval', {
    p_approval_id: approval.id,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note || null,
  });

  if (error || !data) {
    console.error('[manufacturing approval] decision failed', error?.message);
    return NextResponse.json({ error: '승인 결정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  await (context.admin as any).from('operator_activity_log').insert({
    actor_id: context.user.id,
    action: 'manufacturing_buyer_approval_decided',
    target_table: 'manufacturing_project_approvals',
    target_id: approval.id,
    metadata: { project_id: projectId, approval_type: approval.approval_type, decision: parsed.data.decision },
  });

  return NextResponse.json({ success: true, approval: data });
}
