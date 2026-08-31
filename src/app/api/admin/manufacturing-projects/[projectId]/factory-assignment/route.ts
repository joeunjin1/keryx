import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const AssignmentSchema = z.object({
  factoryId: z.string().uuid(),
  selectionNote: z.string().trim().max(2000).optional().default(''),
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const [projectResult, assignmentsResult, factoriesResult] = await Promise.all([
    (context.admin as any).from('manufacturing_projects').select('id, project_no, project_name, current_status').eq('id', projectId).maybeSingle(),
    (context.admin as any).from('manufacturing_project_factory_assignments')
      .select('id, factory_id, status, selection_note, assigned_at, released_at')
      .eq('project_id', projectId).order('created_at', { ascending: false }),
    (context.admin as any).from('factories')
      .select('id, name, company_name_ko, city, primary_category, status')
      .order('company_name_ko', { ascending: true }).limit(500),
  ]);

  if (projectResult.error || !projectResult.data || assignmentsResult.error || factoriesResult.error) {
    return NextResponse.json({ error: '공장 배정 정보를 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ project: projectResult.data, assignments: assignmentsResult.data ?? [], factories: factoriesResult.data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const parsed = AssignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '공장 선택과 배정 사유를 확인해 주세요.' }, { status: 400 });

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects').select('id, project_no').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const { data: factory, error: factoryError } = await (context.admin as any)
    .from('factories').select('id').eq('id', parsed.data.factoryId).maybeSingle();
  if (factoryError || !factory) return NextResponse.json({ error: '선택한 공장을 찾을 수 없습니다.' }, { status: 404 });

  // Run as the authenticated admin so the SQL function enforces admin authority.
  const sessionClient = createClient();
  const { data: assignment, error } = await (sessionClient as any).rpc('keryx_activate_manufacturing_factory', {
    p_project_id: projectId,
    p_factory_id: parsed.data.factoryId,
    p_selection_note: parsed.data.selectionNote || null,
  });
  if (error || !assignment) {
    console.error('[manufacturing factory assignment] activation failed', error?.message);
    return NextResponse.json({ error: '공장 배정을 저장하지 못했습니다. 기존 배정과 공장 상태를 확인해 주세요.' }, { status: 409 });
  }

  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_project_factory_activated', 'manufacturing_project_factory_assignments', assignment.id, {
    project_id: projectId,
    project_no: project.project_no,
    factory_id: parsed.data.factoryId,
  });
  return NextResponse.json({ assignment });
}
