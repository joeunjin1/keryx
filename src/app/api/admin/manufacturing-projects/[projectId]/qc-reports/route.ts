import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const QcReportSchema = z.object({
  roundNo: z.number().int().positive().max(100),
  inspectionStage: z.enum(['pre_production', 'during_production', 'pre_shipment', 'container_loading']),
  assignedInspectorUserId: z.string().uuid().nullable().optional(),
  inspectedQuantity: z.number().int().nonnegative().nullable().optional(),
  defectSummary: z.string().trim().max(5000).optional().default(''),
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const { data, error } = await (context.admin as any)
    .from('manufacturing_qc_reports')
    .select('id, round_no, inspection_stage, status, result, inspected_quantity, defect_summary, buyer_visible, buyer_visible_summary_ko, buyer_visible_summary_zh, assigned_inspector_user_id, created_at, completed_at, reviewed_at')
    .eq('project_id', projectId)
    .order('round_no', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'QC 보고서를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const parsed = QcReportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '검수 회차와 검수 단계를 확인해 주세요.' }, { status: 400 });

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects').select('id, project_no').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const body = parsed.data;
  const { data: report, error } = await (context.admin as any)
    .from('manufacturing_qc_reports')
    .insert({
      project_id: projectId,
      round_no: body.roundNo,
      inspection_stage: body.inspectionStage,
      assigned_inspector_user_id: body.assignedInspectorUserId ?? null,
      inspected_quantity: body.inspectedQuantity ?? null,
      defect_summary: body.defectSummary || null,
      status: 'draft',
      buyer_visible: false,
    })
    .select('id, round_no, inspection_stage, status, created_at')
    .single();
  if (error || !report) {
    const message = error?.code === '23505' ? '같은 검수 회차와 단계가 이미 등록되어 있습니다.' : 'QC 보고서를 만들지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: projectId,
    event_type: 'qc_report_created',
    visibility: 'internal',
    actor_user_id: context.user.id,
    detail: { qc_report_id: report.id, round_no: report.round_no, inspection_stage: report.inspection_stage },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_qc_report_created', 'manufacturing_qc_reports', report.id, {
    project_id: projectId,
    project_no: project.project_no,
    round_no: report.round_no,
    inspection_stage: report.inspection_stage,
  });
  return NextResponse.json({ report }, { status: 201 });
}
