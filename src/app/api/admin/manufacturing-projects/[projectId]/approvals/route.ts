import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const ApprovalSchema = z.object({
  approvalType: z.enum(['sample', 'golden_sample', 'quote', 'production_start', 'qc_release', 'shipment']),
  title: z.string().trim().min(1).max(200),
  sampleRoundId: z.string().uuid().optional().nullable(),
  buyerVisibleSnapshot: z.record(z.string(), z.unknown()).default({}),
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const parsed = ApprovalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '승인 종류와 바이어 공개 제목을 확인해 주세요.' }, { status: 400 });

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  if (parsed.data.sampleRoundId) {
    const { data: sample, error: sampleError } = await (context.admin as any)
      .from('manufacturing_sample_rounds')
      .select('id')
      .eq('id', parsed.data.sampleRoundId)
      .eq('project_id', project.id)
      .maybeSingle();
    if (sampleError || !sample) return NextResponse.json({ error: '이 프로젝트의 샘플만 승인 요청에 연결할 수 있습니다.' }, { status: 400 });
  }

  const { data: approval, error: insertError } = await (context.admin as any)
    .from('manufacturing_project_approvals')
    .insert({
      project_id: project.id,
      sample_round_id: parsed.data.sampleRoundId ?? null,
      approval_type: parsed.data.approvalType,
      status: 'pending',
      title: parsed.data.title,
      buyer_visible_snapshot: parsed.data.buyerVisibleSnapshot,
      requested_by: context.user.id,
      requested_at: new Date().toISOString(),
    })
    .select('id, approval_type, status, title, requested_at')
    .single();

  if (insertError || !approval) {
    console.error('[admin manufacturing approval] insert failed', insertError?.message);
    return NextResponse.json({ error: '승인 요청을 만들지 못했습니다.' }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: project.id,
    event_type: 'buyer_approval_requested',
    visibility: 'buyer',
    actor_user_id: context.user.id,
    detail: { approval_id: approval.id, approval_type: approval.approval_type, title: approval.title },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_buyer_approval_requested', 'manufacturing_project_approvals', approval.id, { project_id: project.id, project_no: project.project_no, approval_type: approval.approval_type });

  return NextResponse.json({ approval }, { status: 201 });
}
