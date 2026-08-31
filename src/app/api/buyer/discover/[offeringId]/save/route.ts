import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireActiveBuyerDiscovery } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ offeringId: z.string().uuid() });
const BodySchema = z.object({ action: z.enum(['save', 'unsave']) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ offeringId: string }> }) {
  const context = await requireActiveBuyerDiscovery();
  if ('error' in context) return context.error;

  const parsedParams = ParamsSchema.safeParse(await params);
  const parsedBody = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: '저장 요청이 올바르지 않습니다.' }, { status: 400 });
  }

  // 만료·비공개 항목은 저장할 수 없다. 바이어 세션 권한은 위에서 확인하고,
  // 서버는 게시·14일 조건을 원본 테이블에 명시적으로 적용한다.
  const currentTime = new Date().toISOString();
  const { data: offering, error: offeringError } = await (context.admin as any)
    .from('new_product_offerings')
    .select('id')
    .eq('id', parsedParams.data.offeringId)
    .eq('status', 'published')
    .lte('published_at', currentTime)
    .gt('expires_at', currentTime)
    .maybeSingle();
  if (offeringError) {
    console.error('[buyer discovery] save offering lookup failed', offeringError.message);
    return NextResponse.json({ error: '신상품·샘플 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
  if (!offering) {
    return NextResponse.json({ error: '이 항목은 열람 기간이 지났거나 접근 권한이 없습니다.' }, { status: 404 });
  }

  const eventType = parsedBody.data.action === 'save' ? 'saved' : 'unsaved';
  const { error: eventError } = await (context.admin as any)
    .from('buyer_discovery_events')
    .insert({
      seller_id: context.seller.id,
      offering_id: offering.id,
      event_type: eventType,
    });

  if (eventError) {
    console.error('[buyer discovery] save event failed', eventError.message);
    return NextResponse.json({ error: '저장 상태를 반영하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, saved: parsedBody.data.action === 'save' });
}
