import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactory } from '@/lib/factory/requireFactory';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  updateType: z.enum(['material', 'sampling', 'production', 'packing', 'shipment_ready', 'issue']),
  factoryNote: z.string().trim().min(1).max(3000),
  buyerVisibleNote: z.string().trim().max(2000).optional().default(''),
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireFactory();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const { data: assignment } = await (context.admin as any)
    .from('manufacturing_project_factory_assignments')
    .select('id')
    .eq('project_id', projectId).eq('factory_id', context.factory.id).eq('status', 'active').maybeSingle();
  if (!assignment) return NextResponse.json({ error: '이 공장에 배정된 활성 제조 프로젝트가 아닙니다.' }, { status: 403 });

  const { data, error } = await (context.admin as any)
    .from('manufacturing_factory_execution_updates')
    .select('id, update_type, factory_note, buyer_visible_note, buyer_visible, status, created_at, reviewed_at')
    .eq('project_id', projectId).eq('factory_assignment_id', assignment.id)
    .order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: '진행 업데이트를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ updates: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireFactory();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '진행 유형과 공장 메모를 확인해 주세요.' }, { status: 400 });

  const { data: assignment, error: assignmentError } = await (context.admin as any)
    .from('manufacturing_project_factory_assignments')
    .select('id')
    .eq('project_id', projectId).eq('factory_id', context.factory.id).eq('status', 'active').maybeSingle();
  if (assignmentError || !assignment) return NextResponse.json({ error: '이 공장에 배정된 활성 제조 프로젝트가 아닙니다.' }, { status: 403 });

  const body = parsed.data;
  const { data: update, error } = await (context.admin as any)
    .from('manufacturing_factory_execution_updates')
    .insert({
      project_id: projectId,
      factory_assignment_id: assignment.id,
      update_type: body.updateType,
      factory_note: body.factoryNote,
      buyer_visible_note: body.buyerVisibleNote || null,
      buyer_visible: false,
      status: 'submitted',
      created_by_user_id: context.user.id,
    })
    .select('id, update_type, status, created_at')
    .single();
  if (error || !update) {
    console.error('[factory manufacturing update] submit failed', error?.message);
    return NextResponse.json({ error: '진행 업데이트를 제출하지 못했습니다.' }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: projectId,
    event_type: 'factory_execution_update_submitted',
    visibility: 'internal',
    actor_user_id: context.user.id,
    detail: { execution_update_id: update.id, update_type: body.updateType, factory_id: context.factory.id },
  });
  await (context.admin as any).from('operator_activity_log').insert({
    actor_id: context.user.id,
    action: 'factory_manufacturing_execution_update_submitted',
    target_table: 'manufacturing_factory_execution_updates',
    target_id: update.id,
    metadata: { project_id: projectId, factory_id: context.factory.id, update_type: body.updateType },
  });

  return NextResponse.json({ update }, { status: 201 });
}
