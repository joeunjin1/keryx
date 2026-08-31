import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const SampleSchema = z.object({
  sampleType: z.enum(['development', 'revision', 'golden_sample', 'production_sample']).default('development'),
  buyerVisibleNote: z.string().trim().max(2000).optional().default(''),
  status: z.enum(['planned', 'making', 'dispatched', 'received', 'buyer_review', 'approved', 'revision_requested']).default('planned'),
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });
  const parsed = SampleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '샘플 정보가 올바르지 않습니다.' }, { status: 400 });

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const { data: latestSample } = await (context.admin as any)
    .from('manufacturing_sample_rounds')
    .select('round_no')
    .eq('project_id', project.id)
    .order('round_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sample, error: insertError } = await (context.admin as any)
    .from('manufacturing_sample_rounds')
    .insert({
      project_id: project.id,
      round_no: (latestSample?.round_no ?? 0) + 1,
      sample_type: parsed.data.sampleType,
      status: parsed.data.status,
      buyer_visible_note: parsed.data.buyerVisibleNote || null,
      created_by: context.user.id,
    })
    .select('id, round_no, sample_type, status, buyer_visible_note, created_at')
    .single();
  if (insertError || !sample) {
    console.error('[admin manufacturing sample] insert failed', insertError?.message);
    return NextResponse.json({ error: '샘플 회차를 등록하지 못했습니다.' }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: project.id,
    event_type: 'sample_round_created',
    visibility: 'buyer',
    actor_user_id: context.user.id,
    detail: { sample_round_id: sample.id, round_no: sample.round_no, sample_type: sample.sample_type },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_sample_round_created', 'manufacturing_sample_rounds', sample.id, { project_id: project.id, project_no: project.project_no, round_no: sample.round_no });

  return NextResponse.json({ sample }, { status: 201 });
}
