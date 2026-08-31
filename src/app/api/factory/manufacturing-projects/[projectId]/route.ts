import { NextResponse } from 'next/server';
import { requireFactory } from '@/lib/factory/requireFactory';

export const dynamic = 'force-dynamic';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Returns only the authenticated factory's active project execution workspace. */
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireFactory();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const { data: assignment, error: assignmentError } = await (context.admin as any)
    .from('manufacturing_project_factory_assignments')
    .select('id, project_id, factory_id, status, assigned_at, selection_note')
    .eq('project_id', projectId)
    .eq('factory_id', context.factory.id)
    .eq('status', 'active')
    .maybeSingle();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: '이 공장에 배정된 활성 제조 프로젝트가 아닙니다.' }, { status: 403 });
  }

  const [projectResult, briefResult, stagesResult, updatesResult, qcResult, shipmentResult] = await Promise.all([
    (context.admin as any).from('manufacturing_projects')
      .select('id, project_no, project_name, product_category, product_summary, preferred_language, current_status, updated_at')
      .eq('id', projectId).maybeSingle(),
    (context.admin as any).from('manufacturing_project_briefs')
      .select('id, version_no, status, product_name, product_description, target_quantity, target_market, required_by_date, material_preferences, dimensions_text, packaging_requirements, compliance_requirements')
      .eq('project_id', projectId).order('version_no', { ascending: false }).limit(1).maybeSingle(),
    (context.admin as any).from('manufacturing_project_stages')
      .select('id, stage_key, stage_order, stage_status, buyer_visible_note')
      .eq('project_id', projectId).order('stage_order', { ascending: true }),
    (context.admin as any).from('manufacturing_factory_execution_updates')
      .select('id, update_type, factory_note, buyer_visible_note, buyer_visible, status, created_at, reviewed_at')
      .eq('project_id', projectId).eq('factory_assignment_id', assignment.id)
      .order('created_at', { ascending: false }).limit(100),
    (context.admin as any).from('manufacturing_qc_reports')
      .select('id, round_no, inspection_stage, status, result, inspected_quantity, defect_summary, created_at, completed_at')
      .eq('project_id', projectId).order('round_no', { ascending: false }).limit(50),
    (context.admin as any).from('manufacturing_shipments')
      .select('id, status, shipping_method, shipment_reference, shipped_at, delivered_at, created_at, updated_at')
      .eq('project_id', projectId).order('created_at', { ascending: false }).limit(20),
  ]);

  const errors = [projectResult.error, briefResult.error, stagesResult.error, updatesResult.error, qcResult.error, shipmentResult.error].filter(Boolean);
  if (errors.length || !projectResult.data) {
    console.error('[factory manufacturing project] detail failed', errors.map((error: any) => error.message));
    return NextResponse.json({ error: '제조 프로젝트 실행 정보를 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    assignment,
    project: projectResult.data,
    brief: briefResult.data ?? null,
    stages: stagesResult.data ?? [],
    updates: updatesResult.data ?? [],
    qcReports: qcResult.data ?? [],
    shipments: shipmentResult.data ?? [],
  });
}
