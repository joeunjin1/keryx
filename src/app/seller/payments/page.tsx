import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: '결제 현황',
  description: '주문별 선수금/잔금/검수비/샘플비 결제 현황을 확인합니다.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

const ORDER_STATUS_STAGE: Record<string, { stage: string; ko: string; zh: string }> = {
  draft:                    { stage: 'pre_order',       ko: '주문 준비',      zh: '准备中' },
  pending_admin_approval:   { stage: 'pre_order',       ko: '승인 대기',      zh: '待审批' },
  awaiting_deposit:         { stage: 'deposit_pending', ko: '선수금 대기',    zh: '等待预付款' },
  in_production:            { stage: 'deposit_paid',    ko: '제작 중',        zh: '生产中' },
  production_completed:     { stage: 'deposit_paid',    ko: '제작 완료',      zh: '生产完成' },
  arrived_warehouse:        { stage: 'deposit_paid',    ko: '창고 도착',      zh: '已到仓库' },
  inspecting:               { stage: 'inspection',      ko: '검수 중',        zh: '检验中' },
  inspection_admin_review:  { stage: 'inspection',      ko: '검수 검토',      zh: '审核检验' },
  inspection_seller_review: { stage: 'inspection',      ko: '검수 확인 요청', zh: '请确认检验' },
  awaiting_balance:         { stage: 'balance_pending', ko: '잔금 대기',      zh: '等待尾款' },
  shipping_to_korea:        { stage: 'balance_paid',    ko: '운송 중',        zh: '运输中' },
  arrived_korea:            { stage: 'balance_paid',    ko: '한국 도착',      zh: '已到韩国' },
  delivered:                { stage: 'complete',        ko: '납품 완료',      zh: '已交付' },
  cancelled:                { stage: 'cancelled',       ko: '취소',           zh: '已取消' },
  disputed:                 { stage: 'balance_pending', ko: '이의 제기',      zh: '有争议' },
};

const STAGE_COLOR: Record<string, string> = {
  pre_order:       '#94a3b8',
  deposit_pending: '#f59e0b',
  deposit_paid:    '#3b82f6',
  inspection:      '#e11d48',
  balance_pending: '#f97316',
  balance_paid:    '#06b6d4',
  complete:        '#22c55e',
  cancelled:       '#6b7280',
};

function getPayStatus(order: any, type: string): string {
  const payments: any[] = order.payments ?? [];
  const p = payments.find((x: any) => x.payment_type === type);
  if (p) return p.payment_status;
  const s = order.status;
  if (type === 'deposit') {
    if (['in_production','production_completed','arrived_warehouse','inspecting','inspection_admin_review','inspection_seller_review','awaiting_balance','shipping_to_korea','arrived_korea','delivered'].includes(s)) return 'paid';
    if (s === 'awaiting_deposit') return 'pending';
  }
  if (type === 'balance') {
    if (['shipping_to_korea','arrived_korea','delivered'].includes(s)) return 'paid';
    if (s === 'awaiting_balance') return 'pending';
  }
  return 'not_required';
}

function getPayAmount(order: any, type: string): number | null {
  const payments: any[] = order.payments ?? [];
  const p = payments.find((x: any) => x.payment_type === type);
  if (p?.amount_cny) return p.amount_cny;
  if (type === 'deposit') return Math.round((order.total_cny ?? 0) * 0.3);
  if (type === 'balance') return Math.round((order.total_cny ?? 0) * 0.7);
  return null;
}

function getPayDate(order: any, type: string): string | null {
  const payments: any[] = order.payments ?? [];
  const p = payments.find((x: any) => x.payment_type === type);
  return p?.paid_at ?? null;
}

export default async function SellerPaymentsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=seller');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single();
  if (!profile || !['seller', 'admin'].includes(profile.kind)) redirect('/login?role=seller');

  const { data: seller } = await supabase
    .from('sellers').select('id, business_name').eq('user_id', user.id).single();

  const { data: orders } = await supabase
    .from('orders')
    .select(`id, order_no, status, total_cny, created_at, payment_info,
      items:order_items(id, qty, unit_price_cny, product:products(name_ko, name_zh, sku)),
      payments:order_payments(id, payment_no, payment_type, payment_status, amount_cny, paid_at, due_date, note)`)
    .eq('seller_id', seller?.id ?? '')
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(100);

  const orderList: any[] = orders ?? [];
  const pendingDepositCount = orderList.filter((o: any) => o.status === 'awaiting_deposit').length;
  const pendingBalanceCount = orderList.filter((o: any) => o.status === 'awaiting_balance').length;
  const completedCount = orderList.filter((o: any) => o.status === 'delivered').length;
  const totalPendingCny = orderList.reduce((sum: number, o: any) => {
    const stage = ORDER_STATUS_STAGE[o.status]?.stage;
    if (stage === 'deposit_pending') return sum + Math.round((o.total_cny ?? 0) * 0.3);
    if (stage === 'balance_pending') return sum + Math.round((o.total_cny ?? 0) * 0.7);
    return sum;
  }, 0);

  const STATUS_CFG: Record<string, { ko: string; zh: string; color: string; bg: string; icon: string }> = {
    paid:         { ko: '입금완료', zh: '已付款', color: '#10b981', bg: '#d1fae5', icon: '✅' },
    pending:      { ko: '입금대기', zh: '待付款', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
    overdue:      { ko: '연체',    zh: '逾期',   color: '#ef4444', bg: '#fee2e2', icon: '⚠️' },
    not_required: { ko: '해당없음', zh: '不适用', color: '#9ca3af', bg: '#f3f4f6', icon: '—' },
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
          <LangText ko="결제 현황" zh="付款状态" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          <LangText ko={`총 ${orderList.length}건의 주문`} zh={`共 ${orderList.length} 笔订单`} />
        </p>
      </div>

      <div className="grid gap-3 mb-5 grid-cols-2 sm:grid-cols-4">
        {[
          { ko: '선수금 대기', zh: '等待预付款', val: pendingDepositCount, unit: true, grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
          { ko: '잔금 대기',   zh: '等待尾款',   val: pendingBalanceCount, unit: true, grad: 'linear-gradient(135deg,#e11d48,#be123c)' },
          { ko: '납품 완료',   zh: '已交付',     val: completedCount,      unit: true, grad: 'linear-gradient(135deg,#10b981,#059669)' },
          { ko: '미납 예상',   zh: '预计未付',   val: `¥${Math.round(totalPendingCny).toLocaleString()}`, unit: false, grad: 'linear-gradient(135deg,#667eea,#764ba2)' },
        ].map((c, i) => (
          <div key={i} className="p-4 rounded-2xl text-white" style={{ background: c.grad }}>
            <div className="text-[11px] mb-1 opacity-80"><LangText ko={c.ko} zh={c.zh} /></div>
            <div className="text-[20px] font-extrabold">{c.val}</div>
            {c.unit && <div className="text-[10px] opacity-70"><LangText ko="건" zh="笔" /></div>}
          </div>
        ))}
      </div>

      {orderList.length === 0 ? (
        <div className="text-center px-6 py-12 bg-[var(--bg-base)] border border-[var(--border-light)] rounded-2xl">
          <div className="text-[40px] mb-3">💳</div>
          <div className="text-sm text-[var(--text-secondary)]">
            <LangText ko="결제 내역이 없습니다" zh="没有付款记录" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orderList.map((order: any) => {
            const si = ORDER_STATUS_STAGE[order.status] ?? { stage: 'pre_order', ko: order.status, zh: order.status };
            const sc = STAGE_COLOR[si.stage] ?? '#94a3b8';
            const items: any[] = order.items ?? [];

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ borderLeft: `4px solid ${sc}` }}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-900">{order.order_no ?? order.id.slice(0,8)}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${sc}20`, color: sc }}>
                        <LangText ko={si.ko} zh={si.zh} />
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('ko-KR')} · <LangText ko="총액" zh="总额" /> ¥{(order.total_cny ?? 0).toLocaleString()}
                    </div>
                    {items.length > 0 && (
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {items[0].product?.name_ko ?? items[0].product?.name_zh ?? '상품'} {items.length > 1 ? `외 ${items.length - 1}건` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['deposit','inspection_fee','sample_fee','balance'] as const).map((type) => {
                    const labelMap: Record<string, { ko: string; zh: string }> = {
                      deposit:        { ko: '선수금 (30%)', zh: '预付款 (30%)' },
                      inspection_fee: { ko: '검수비',       zh: '检验费' },
                      sample_fee:     { ko: '샘플비',       zh: '样品费' },
                      balance:        { ko: '잔금 (70%)',   zh: '尾款 (70%)' },
                    };
                    const st = getPayStatus(order, type);
                    const amt = getPayAmount(order, type);
                    const dt = getPayDate(order, type);
                    const cfg = STATUS_CFG[st] ?? STATUS_CFG['not_required'];
                    return (
                      <div key={type} className="rounded-xl p-3" style={{ background: cfg.bg }}>
                        <div className="text-[10px] font-semibold mb-1" style={{ color: cfg.color }}>
                          <LangText ko={labelMap[type].ko} zh={labelMap[type].zh} />
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {amt != null ? `¥${amt.toLocaleString()}` : '-'}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px]">{cfg.icon}</span>
                          <span className="text-[10px]" style={{ color: cfg.color }}>
                            <LangText ko={cfg.ko} zh={cfg.zh} />
                          </span>
                        </div>
                        {dt && <div className="text-[9px] text-gray-400 mt-0.5">{new Date(dt).toLocaleDateString('ko-KR')}</div>}
                      </div>
                    );
                  })}
                </div>

                {order.payment_info && (
                  <div className="px-4 pb-3">
                    <div className="text-[11px] text-gray-400 mb-1"><LangText ko="💳 결제 정보" zh="💳 付款信息" /></div>
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">{order.payment_info}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
