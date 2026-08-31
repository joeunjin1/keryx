import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ offeringId: z.string().uuid() });
const TransitionSchema = z.object({
  action: z.enum(['submitted', 'revision_requested', 'approved', 'rejected', 'published', 'archived']),
  note: z.string().trim().max(1000).optional().default(''),
}).superRefine((value, context) => {
  if (['revision_requested', 'rejected'].includes(value.action) && value.note.length < 5) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: '보완 또는 반려 사유를 5자 이상 입력해 주세요.' });
  }
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ offeringId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const parsedParams = ParamsSchema.safeParse(await params);
  const parsedBody = TransitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: '상태 전이 값 또는 검토 메모가 올바르지 않습니다.' }, { status: 400 });
  }

  const { data, error } = await (context.admin as any).rpc('transition_new_product_offering', {
    p_offering_id: parsedParams.data.offeringId,
    p_actor_id: context.user.id,
    p_action: parsedBody.data.action,
    p_note: parsedBody.data.note || null,
  });
  if (error || !data?.[0]) {
    console.error('[admin new product offering] transition failed', error?.message);
    return NextResponse.json({ error: '상태를 변경하지 못했습니다. 현재 상태를 새로고침한 뒤 다시 시도해 주세요.' }, { status: 409 });
  }

  const result = data[0];
  await writeOperatorLog(context.admin, context.user.id, `new_product_offering_${parsedBody.data.action}`, 'new_product_offerings', parsedParams.data.offeringId, {
    previous_status: result.previous_status,
    current_status: result.current_status,
    expires_at: result.expires_at,
    note_provided: Boolean(parsedBody.data.note),
  });

  return NextResponse.json({
    success: true,
    previousStatus: result.previous_status,
    status: result.current_status,
    expiresAt: result.expires_at,
  });
}
