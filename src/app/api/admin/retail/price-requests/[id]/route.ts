import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { writeOperatorLog } from '@/lib/admin/requireAdmin';

const ParamsSchema = z.string().uuid();
const ReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(500).default(''),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = ParamsSchema.safeParse(params.id);
  if (!requestId.success) return NextResponse.json({ error: '가격 변경 요청을 찾을 수 없습니다.' }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = ReviewSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: '승인 또는 반려 상태를 확인해 주세요.' }, { status: 400 });

  const session = createClient() as any;
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const admin = createAdminClient() as any;
  const { data: profile } = await admin.from('user_profiles').select('kind').eq('id', user.id).maybeSingle();
  if (profile?.kind !== 'admin') return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { data: priceRequest, error } = await admin.rpc('review_retail_price_change', {
    p_actor_user_id: user.id,
    p_request_id: requestId.data,
    p_decision: parsed.data.decision,
    p_reviewer_note: parsed.data.note,
  });

  if (error || !priceRequest) {
    const detail = error?.message || '';
    if (detail.includes('SELF_APPROVAL_NOT_ALLOWED')) return NextResponse.json({ error: '요청자는 자신의 가격 변경을 승인할 수 없습니다.' }, { status: 403 });
    if (detail.includes('PRICE_CHANGE_REQUEST_NOT_PENDING')) return NextResponse.json({ error: '이미 처리된 가격 변경 요청입니다. 새로고침 후 확인해 주세요.' }, { status: 409 });
    return NextResponse.json({ error: '가격 변경 요청을 처리하지 못했습니다.' }, { status: 409 });
  }

  await writeOperatorLog(admin, user.id, 'review_retail_price_change', 'retail_price_change_requests', requestId.data, {
    decision: parsed.data.decision,
    reviewerNoteProvided: Boolean(parsed.data.note),
  });
  return NextResponse.json({ request: priceRequest });
}
