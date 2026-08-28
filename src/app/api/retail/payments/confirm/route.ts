import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ConfirmSchema = z.object({
  paymentKey: z.string().trim().min(1).max(300),
  orderId: z.string().trim().regex(/^KRYR-\d{8}-\d{6}$/),
  amount: z.number().int().positive(),
});

interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  totalAmount: number;
  method?: string;
  approvedAt?: string;
}

function getTossAuthorization() {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return null;
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

function safePaymentError(message: string) {
  if (message.includes('ORDER_NOT_FOUND')) return '결제 주문을 찾을 수 없습니다.';
  if (message.includes('PAYMENT_AMOUNT_MISMATCH')) return '결제 금액이 주문 금액과 일치하지 않습니다.';
  if (message.includes('ORDER_NOT_PAYABLE')) return '이미 처리되었거나 결제할 수 없는 주문입니다.';
  if (message.includes('ORDER_RESERVATION_EXPIRED')) return '결제 준비 시간이 만료되어 승인된 결제를 취소 처리했습니다. 장바구니에서 다시 주문해 주세요.';
  if (message.includes('STOCK_RESERVATION_MISMATCH')) return '주문 재고 상태를 확인해야 합니다. 고객센터로 문의해 주세요.';
  return '결제 승인 후 주문 확정에 실패했습니다. 승인된 결제는 취소 처리 중이며, 주문 내역을 다시 확인해 주세요.';
}

async function cancelApprovedPayment(authorization: string, paymentKey: string, orderId: string, admin: any) {
  try {
    const cancellation = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason: 'KERYX 주문 확정 처리 실패로 인한 자동 취소' }),
      cache: 'no-store',
    });
    const cancellationBody = await cancellation.json().catch(() => ({}));
    await admin.from('retail_payment_events').insert({
      provider: 'toss',
      event_key: `compensation:${paymentKey}`,
      toss_order_id: orderId,
      toss_payment_key: paymentKey,
      event_type: cancellation.ok ? 'PAYMENT_COMPENSATED' : 'PAYMENT_COMPENSATION_FAILED',
      payment_status: cancellation.ok ? 'CANCELLED' : 'DONE',
      payload: { status: cancellation.status, code: cancellationBody?.code || null },
      processed_at: new Date().toISOString(),
    }).select();
    return cancellation.ok;
  } catch (error) {
    console.error('[retail payment] compensation request failed', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: '결제 정보를 확인해 주세요.' }, { status: 400 });

  const authorization = getTossAuthorization();
  if (!authorization) {
    console.error('[retail payment] TOSS_SECRET_KEY is not configured');
    return NextResponse.json({ error: '결제 설정 준비 중입니다. 잠시 후 다시 시도해 주세요.' }, { status: 503 });
  }

  const { paymentKey, orderId, amount } = parsed.data;
  let tossPayment: TossPaymentResponse;

  try {
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
      cache: 'no-store',
    });
    const tossBody = await tossResponse.json().catch(() => ({}));

    if (!tossResponse.ok) {
      console.error('[retail payment] toss approval rejected', tossResponse.status, tossBody?.code);
      return NextResponse.json({
        error: '결제 승인을 완료하지 못했습니다. 실제 결제 여부는 주문 내역에서 다시 확인해 주세요.',
        code: typeof tossBody?.code === 'string' ? tossBody.code : 'PAYMENT_CONFIRM_FAILED',
      }, { status: 409 });
    }

    tossPayment = tossBody as TossPaymentResponse;
  } catch (error) {
    console.error('[retail payment] toss approval network error', error);
    return NextResponse.json({ error: '결제 확인 중 네트워크 오류가 발생했습니다. 주문 내역에서 다시 확인해 주세요.' }, { status: 503 });
  }

  if (
    tossPayment.status !== 'DONE'
    || tossPayment.orderId !== orderId
    || tossPayment.totalAmount !== amount
    || tossPayment.paymentKey !== paymentKey
  ) {
    console.error('[retail payment] toss response mismatch', {
      expectedOrderId: orderId,
      expectedAmount: amount,
      returnedOrderId: tossPayment.orderId,
      returnedAmount: tossPayment.totalAmount,
      returnedStatus: tossPayment.status,
    });
    return NextResponse.json({ error: '결제 검증 값이 주문 정보와 일치하지 않습니다. 고객센터로 문의해 주세요.' }, { status: 409 });
  }

  const admin = createAdminClient() as any;
  const { data: order, error: confirmError } = await admin.rpc('confirm_retail_payment', {
    p_order_no: orderId,
    p_payment_key: paymentKey,
    p_payment_method: tossPayment.method || '기타',
    p_approved_amount: amount,
    p_event_key: `approval:${paymentKey}`,
    p_payload: {
      paymentKey: tossPayment.paymentKey,
      orderId: tossPayment.orderId,
      status: tossPayment.status,
      totalAmount: tossPayment.totalAmount,
      method: tossPayment.method || null,
      approvedAt: tossPayment.approvedAt || null,
    },
  });

  if (confirmError || !order) {
    const detail = confirmError?.message || 'unknown db confirmation error';
    console.error('[retail payment] db confirmation failed', detail);
    const alreadyProcessed = detail.includes('ORDER_NOT_PAYABLE');
    const cancelled = alreadyProcessed ? false : await cancelApprovedPayment(authorization, paymentKey, orderId, admin);
    const message = alreadyProcessed
      ? '결제 상태를 다시 확인해야 합니다. 동일 주문을 다시 결제하지 말고 주문 내역 또는 고객센터에서 확인해 주세요.'
      : cancelled
        ? safePaymentError(detail)
        : '결제 승인 후 주문 확정에 실패했습니다. 결제 상태를 즉시 확인해야 하므로 동일 주문을 다시 결제하지 말고 고객센터로 문의해 주세요.';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({
    orderNo: order.order_no,
    accessToken: order.access_token,
    status: order.status,
    paymentStatus: order.payment_status,
    totalAmountKrw: Number(order.total_amount_krw),
  });
}
