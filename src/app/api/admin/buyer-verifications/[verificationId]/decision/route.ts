import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ verificationId: z.string().uuid() });
const DecisionSchema = z.object({
  decision: z.enum(['approved', 'revision_requested', 'rejected', 'revoked']),
  reason: z.string().trim().max(1000).optional().default(''),
}).superRefine((value, context) => {
  if (value.decision !== 'approved' && value.reason.length < 5) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: '보완·반려·해제 사유를 5자 이상 입력해 주세요.' });
  }
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ verificationId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const parsedParams = ParamsSchema.safeParse(await params);
  const parsedBody = DecisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: '결정값 또는 사유가 올바르지 않습니다.' }, { status: 400 });
  }

  const { data, error } = await (context.admin as any).rpc('decide_buyer_company_verification', {
    p_verification_id: parsedParams.data.verificationId,
    p_reviewer_id: context.user.id,
    p_decision: parsedBody.data.decision,
    p_reason: parsedBody.data.reason || null,
  });

  if (error || !data?.[0]) {
    console.error('[admin buyer verification] decision failed', error?.message);
    return NextResponse.json({ error: '회사 인증 결정을 반영하지 못했습니다. 현재 상태를 새로고침한 뒤 다시 시도해 주세요.' }, { status: 500 });
  }

  const result = data[0];
  await writeOperatorLog(
    context.admin,
    context.user.id,
    `buyer_verification_${parsedBody.data.decision}`,
    'buyer_company_verifications',
    parsedParams.data.verificationId,
    {
      seller_id: result.seller_id,
      access_status: result.access_status,
      reason_provided: Boolean(parsedBody.data.reason),
    },
  );

  return NextResponse.json({
    success: true,
    verificationId: result.verification_id,
    verificationStatus: result.verification_status,
    discoveryAccessStatus: result.access_status,
  });
}
