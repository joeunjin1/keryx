import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const IdSchema = z.string().uuid();
const UpdateSchema = z.object({
  status: z.enum(['draft', 'review', 'approved', 'converted', 'cancelled']),
  memo: z.string().trim().max(2000).default(''),
  convertedOrderId: z.string().uuid().nullable().default(null),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const queueId = IdSchema.safeParse(params.id);
  if (!queueId.success) return NextResponse.json({ error: '발주대기 건을 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '변경할 발주 상태를 확인해 주세요.' }, { status: 400 });
  const input = parsed.data;
  if (input.status === 'converted' && !input.convertedOrderId) return NextResponse.json({ error: '실제 주문으로 전환하려면 생성된 주문 ID가 필요합니다.' }, { status: 400 });

  const { data, error } = await auth.admin.from('preorder_purchase_queue').update({
    status: input.status, memo: input.memo, converted_order_id: input.status === 'converted' ? input.convertedOrderId : null,
    converted_at: input.status === 'converted' ? new Date().toISOString() : null, updated_by: auth.user.id,
  }).eq('id', queueId.data).is('deleted_at', null).select('id,reference_no,status,converted_order_id').maybeSingle();
  if (error || !data) return NextResponse.json({ error: '발주 상태를 저장하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'update_preorder_queue', 'preorder_purchase_queue', queueId.data, { referenceNo: data.reference_no, status: data.status, convertedOrderId: data.converted_order_id });
  return NextResponse.json({ item: data });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const queueId = IdSchema.safeParse(params.id);
  if (!queueId.success) return NextResponse.json({ error: '발주대기 건을 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const { data, error } = await auth.admin.from('preorder_purchase_queue').update({ status: 'cancelled', deleted_at: new Date().toISOString(), updated_by: auth.user.id }).eq('id', queueId.data).is('deleted_at', null).select('id,reference_no').maybeSingle();
  if (error || !data) return NextResponse.json({ error: '발주대기 건을 삭제하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'archive_preorder_queue', 'preorder_purchase_queue', queueId.data, { referenceNo: data.reference_no });
  return NextResponse.json({ archived: true });
}
