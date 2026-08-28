import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type TossWebhookPayload = {
  eventType?: string;
  createdAt?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    method?: string;
    totalAmount?: number;
  };
};

function eventKey(request: NextRequest, payload: TossWebhookPayload) {
  const transmissionId = request.headers.get('tosspayments-webhook-transmission-id');
  if (transmissionId) return `webhook:${transmissionId}`;
  const paymentKey = payload.data?.paymentKey || 'unknown-payment';
  const status = payload.data?.status || 'unknown-status';
  const createdAt = payload.createdAt || new Date().toISOString();
  return `webhook:${paymentKey}:${status}:${createdAt}`;
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as TossWebhookPayload | null;
  if (!payload?.eventType) return NextResponse.json({ error: 'invalid webhook payload' }, { status: 400 });

  const payment = payload.data;
  const orderNo = payment?.orderId;
  const key = eventKey(request, payload);
  const admin = createAdminClient() as any;

  // 먼저 이력을 저장한다. 재전송 이벤트는 event_key 유니크 제약으로 한 번만 처리한다.
  const { data: event, error: eventError } = await admin
    .from('retail_payment_events')
    .insert({
      provider: 'toss',
      event_key: key,
      toss_order_id: orderNo || null,
      toss_payment_key: payment?.paymentKey || null,
      event_type: payload.eventType,
      payment_status: payment?.status || null,
      payload: {
        eventType: payload.eventType,
        createdAt: payload.createdAt || null,
        orderId: orderNo || null,
        paymentKey: payment?.paymentKey || null,
        status: payment?.status || null,
        method: payment?.method || null,
        totalAmount: payment?.totalAmount || null,
      },
    })
    .select('id')
    .maybeSingle();

  if (eventError?.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
  if (eventError || !event) {
    console.error('[retail webhook] event insert failed', eventError?.message);
    return NextResponse.json({ error: 'webhook event storage failed' }, { status: 500 });
  }

  // 일반 카드·간편결제의 최종 승인은 success URL의 서버 승인 API가 담당한다.
  // 여기서는 실패·만료 결제의 예약 재고만 idempotent 방식으로 해제한다.
  if (
    payload.eventType === 'PAYMENT_STATUS_CHANGED'
    && orderNo
    && ['ABORTED', 'EXPIRED', 'CANCELED', 'PARTIAL_CANCELED'].includes(payment?.status || '')
  ) {
    const nextStatus = payment?.status === 'CANCELED' || payment?.status === 'PARTIAL_CANCELED'
      ? 'cancelled'
      : 'payment_failed';
    const { error: releaseError } = await admin.rpc('release_retail_order_reservation', {
      p_order_no: orderNo,
      p_next_status: nextStatus,
      p_note: `토스페이먼츠 웹훅 상태: ${payment?.status}`,
    });
    if (releaseError) {
      console.error('[retail webhook] reservation release failed', releaseError.message);
      await admin
        .from('retail_payment_events')
        .update({ processing_error: releaseError.message })
        .eq('id', event.id);
      return NextResponse.json({ error: 'webhook reconciliation failed' }, { status: 500 });
    }
  }

  await admin
    .from('retail_payment_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', event.id);

  return NextResponse.json({ ok: true });
}
