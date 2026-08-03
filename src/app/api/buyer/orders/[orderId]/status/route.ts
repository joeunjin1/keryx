import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// DB enum order_status 값과 정확히 일치
const VALID_STATUSES = [
  'draft',
  'pending_admin_approval',
  'awaiting_deposit',
  'in_production',
  'production_completed',
  'arrived_warehouse',
  'inspecting',
  'inspection_admin_review',
  'inspection_seller_review',
  'awaiting_balance',
  'shipping_to_korea',
  'arrived_korea',
  'delivered',
  'disputed',
  'cancelled',
] as const;

// 상태 전이 규칙 (관리자/MD가 할 수 있는 전이)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft:                    ['pending_admin_approval', 'cancelled'],
  pending_admin_approval:   ['awaiting_deposit', 'cancelled'],
  awaiting_deposit:         ['in_production', 'cancelled'],
  in_production:            ['production_completed', 'cancelled'],
  production_completed:     ['arrived_warehouse'],
  arrived_warehouse:        ['inspecting'],
  inspecting:               ['inspection_admin_review', 'inspection_seller_review'],
  inspection_admin_review:  ['inspection_seller_review', 'inspecting'],
  inspection_seller_review: ['awaiting_balance', 'inspecting'],
  awaiting_balance:         ['shipping_to_korea', 'cancelled'],
  shipping_to_korea:        ['arrived_korea'],
  arrived_korea:            ['delivered'],
  delivered:                [],
  disputed:                 ['cancelled', 'awaiting_balance'],
  cancelled:                [],
};

const Schema = z.object({
  status: z.enum(VALID_STATUSES),
  note: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // admin 또는 md 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'md'].includes(profile.kind)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  // 현재 주문 상태 확인
  const { data: order } = await supabase
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', params.orderId)
    .single();
  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

  // 전이 가능 여부 확인
  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json({
      error: `Cannot transition from '${order.status}' to '${parsed.data.status}'`,
    }, { status: 400 });
  }

  // 상태 업데이트
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', params.orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 상태별 바이어 알림 메시지
  const STATUS_MESSAGES: Record<string, [string, string]> = {
    awaiting_deposit:         ['주문이 승인되었습니다. 선수금을 입금해 주세요.', '订单已确认，请支付预付款。'],
    in_production:            ['제품 제작이 시작되었습니다.', '产品已开始生产。'],
    production_completed:     ['제품 제작이 완료되었습니다.', '产品生产完成。'],
    arrived_warehouse:        ['제품이 창고에 도착했습니다.', '产品已到达仓库。'],
    inspecting:               ['제품 검수가 시작되었습니다.', '产品正在检验中。'],
    inspection_admin_review:  ['검수 결과를 검토 중입니다.', '正在审核检验结果。'],
    inspection_seller_review: ['검수 결과를 확인해 주세요.', '请确认检验结果。'],
    awaiting_balance:         ['검수가 완료되었습니다. 잔금을 입금해 주세요.', '检验完成，请支付尾款。'],
    shipping_to_korea:        ['제품이 한국으로 발송되었습니다.', '产品已发往韩国。'],
    arrived_korea:            ['제품이 한국에 도착했습니다.', '产品已到达韩国。'],
    delivered:                ['배송이 완료되었습니다.', '产品已送达。'],
    cancelled:                ['주문이 취소되었습니다.', '订单已取消。'],
    disputed:                 ['주문에 이의가 제기되었습니다.', '订单存在争议。'],
  };

  const msgs = STATUS_MESSAGES[parsed.data.status];
  if (msgs) {
    try {
      await supabase.from('seller_notifications').insert({
        seller_id: order.seller_id,
        type: 'order_update',
        title: msgs[0],
        title_zh: msgs[1],
        body: parsed.data.note ?? msgs[0],
        body_zh: parsed.data.note ?? msgs[1],
        link_url: `/seller/orders/${params.orderId}`,
        order_id: params.orderId,
        sent_by_name: 'KERYX',
      });
    } catch (_) {
      // 알림 실패해도 주문 상태 변경은 성공으로 처리
    }
  }

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
