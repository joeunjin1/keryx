import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireActiveBuyerDiscovery } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireActiveBuyerDiscovery();
  if ('error' in context) return context.error;

  const { projectId } = await params;
  if (!looksLikeUuid(projectId)) {
    return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no, current_status')
    .eq('id', projectId)
    .eq('seller_id', context.seller.id)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: '본인 회사의 제조 프로젝트만 제출할 수 있습니다.' }, { status: 404 });
  }
  if (project.current_status !== 'draft') {
    return NextResponse.json({ error: '초안 상태의 제조 프로젝트만 접수로 제출할 수 있습니다.' }, { status: 409 });
  }

  const { data: brief, error: briefError } = await (context.admin as any)
    .from('manufacturing_project_briefs')
    .select('id, product_name')
    .eq('project_id', project.id)
    .eq('version_no', 1)
    .maybeSingle();

  if (briefError || !brief?.product_name?.trim()) {
    return NextResponse.json({ error: '제품 기획의 제품명을 먼저 입력해 주세요.' }, { status: 400 });
  }

  // 호출자 세션을 유지하는 클라이언트로 RPC를 실행해 DB 함수의 auth.uid()가
  // 실제 바이어인지 검증하도록 한다. service role로 상태 전이를 우회하지 않는다.
  const sessionClient = createClient();
  const { data, error } = await (sessionClient as any).rpc('keryx_transition_manufacturing_project', {
    p_project_id: project.id,
    p_to_status: 'intake_submitted',
    p_buyer_visible_note: '바이어가 제조 프로젝트 접수를 제출했습니다.',
    p_internal_note: null,
  });

  if (error || !data) {
    console.error('[manufacturing project] submit failed', error?.message);
    return NextResponse.json({ error: '프로젝트 접수를 제출하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  await (context.admin as any).from('operator_activity_log').insert({
    actor_id: context.user.id,
    action: 'manufacturing_project_submitted',
    target_table: 'manufacturing_projects',
    target_id: project.id,
    metadata: { project_no: project.project_no, seller_id: context.seller.id },
  });

  return NextResponse.json({
    success: true,
    project: data,
    message: '제조 프로젝트가 접수되었습니다. 운영팀이 기획 범위와 다음 단계를 검토합니다.',
  });
}
