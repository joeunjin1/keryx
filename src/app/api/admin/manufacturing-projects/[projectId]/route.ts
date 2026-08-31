import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign_md'), memberUserId: z.string().uuid().nullable() }),
  z.object({ action: z.literal('transition'), toStatus: z.enum(['scoping', 'matching', 'sampling', 'buyer_sample_review', 'golden_sample', 'production_planning', 'production', 'qc', 'shipment_planning', 'shipped', 'completed', 'cancelled']), buyerVisibleNote: z.string().trim().max(2000).optional().default(''), internalNote: z.string().trim().max(2000).optional().default('') }),
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '변경 요청 내용을 확인해 주세요.' }, { status: 400 });

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no, current_status')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  if (parsed.data.action === 'assign_md') {
    const { error } = await (context.admin as any)
      .from('manufacturing_projects')
      .update({ assigned_md_user_id: parsed.data.memberUserId })
      .eq('id', project.id);
    if (error) return NextResponse.json({ error: '제조 담당자 배정 정보를 저장하지 못했습니다.' }, { status: 500 });
    await writeOperatorLog(context.admin, context.user.id, 'manufacturing_project_md_assigned', 'manufacturing_projects', project.id, { project_no: project.project_no, assigned_md_user_id: parsed.data.memberUserId });
    return NextResponse.json({ success: true });
  }

  // 실제 관리자 세션으로만 RPC를 실행해 auth.uid()를 유지하고 DB 상태 머신을 우회하지 않는다.
  const sessionClient = createClient();
  const { data, error } = await (sessionClient as any).rpc('keryx_transition_manufacturing_project', {
    p_project_id: project.id,
    p_to_status: parsed.data.toStatus,
    p_buyer_visible_note: parsed.data.buyerVisibleNote || null,
    p_internal_note: parsed.data.internalNote || null,
  });
  if (error || !data) {
    console.error('[admin manufacturing project] transition failed', error?.message);
    return NextResponse.json({ error: '상태를 변경하지 못했습니다. 필수 승인과 현재 단계를 확인해 주세요.' }, { status: 409 });
  }

  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_project_transitioned', 'manufacturing_projects', project.id, {
    project_no: project.project_no,
    from_status: project.current_status,
    to_status: parsed.data.toStatus,
  });
  return NextResponse.json({ success: true, project: data });
}
