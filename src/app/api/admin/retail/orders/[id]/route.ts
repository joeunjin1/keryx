import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const UpdateOrderSchema = z.object({
  nextStatus: z.enum(['fulfillment_ready', 'shipped', 'delivered']),
  note: z.string().trim().max(500).default(''),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = UpdateOrderSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: '변경 상태를 확인해 주세요.' }, { status: 400 });

  const session = createClient() as any;
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const admin = createAdminClient() as any;
  const { data: profile } = await admin
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.kind !== 'admin') return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { data: updated, error: updateError } = await admin.rpc('advance_retail_order_status', {
    p_actor_user_id: user.id,
    p_order_id: params.id,
    p_next_status: parsed.data.nextStatus,
    p_note: parsed.data.note,
  });
  if (updateError || !updated) {
    const detail = updateError?.message || '';
    console.error('[retail order admin] status update failed', detail);
    if (detail.includes('ORDER_NOT_FOUND')) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    if (detail.includes('ADMIN_ROLE_REQUIRED')) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    return NextResponse.json({ error: '현재 주문 상태에서는 요청한 단계로 변경할 수 없습니다. 새로고침 후 확인해 주세요.' }, { status: 409 });
  }

  return NextResponse.json({ order: updated });
}
