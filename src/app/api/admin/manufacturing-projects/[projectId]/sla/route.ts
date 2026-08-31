import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const SlaSchema = z.object({
  actionKey: z.enum(['scoping', 'factory_matching', 'sample_review', 'golden_sample', 'production_start', 'qc_review', 'shipment_documents', 'delivery_followup']),
  dueAt: z.string().datetime(),
  ownerUserId: z.string().uuid().nullable(),
  ownerRole: z.enum(['admin', 'md', 'factory', 'seller']),
  buyerNoticeEnabled: z.boolean().default(false),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).default('active'),
});

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const { data, error } = await (context.admin as any)
    .from('manufacturing_project_sla_targets')
    .select('id, project_id, current_action_key, due_at, owner_user_id, owner_role, buyer_notice_enabled, status, created_at, updated_at')
    .eq('project_id', projectId).maybeSingle();
  if (error) return NextResponse.json({ error: '프로젝트 기한 정보를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ target: data ?? null });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });
  const parsed = SlaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '기한·담당자·알림 설정을 확인해 주세요.' }, { status: 400 });
  if (parsed.data.ownerRole !== 'seller' && !parsed.data.ownerUserId) return NextResponse.json({ error: '내부 담당자에게 기한을 배정해 주세요.' }, { status: 400 });

  const { data: project, error: projectError } = await (context.admin as any).from('manufacturing_projects').select('id, project_no').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const payload = {
    project_id: projectId,
    current_action_key: parsed.data.actionKey,
    due_at: parsed.data.dueAt,
    owner_user_id: parsed.data.ownerUserId,
    owner_role: parsed.data.ownerRole,
    buyer_notice_enabled: parsed.data.buyerNoticeEnabled,
    status: parsed.data.status,
    created_by_user_id: context.user.id,
  };
  const { data, error } = await (context.admin as any)
    .from('manufacturing_project_sla_targets')
    .upsert(payload, { onConflict: 'project_id' })
    .select('id, current_action_key, due_at, owner_user_id, owner_role, buyer_notice_enabled, status, updated_at')
    .single();
  if (error || !data) return NextResponse.json({ error: '프로젝트 기한 설정을 저장하지 못했습니다.' }, { status: 500 });

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: projectId,
    event_type: 'sla_target_updated',
    visibility: 'internal',
    actor_user_id: context.user.id,
    detail: { target_id: data.id, action_key: data.current_action_key, due_at: data.due_at, owner_role: data.owner_role, buyer_notice_enabled: data.buyer_notice_enabled, status: data.status },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_project_sla_updated', 'manufacturing_project_sla_targets', data.id, { project_id: projectId, project_no: project.project_no, action_key: data.current_action_key, due_at: data.due_at, owner_role: data.owner_role, status: data.status });
  return NextResponse.json({ target: data });
}
