"use client";
import { useLangContext } from '@/components/layout/LangContext';

interface Props {
  orders: any[];
  factory: any;
  isAdmin: boolean;
}

const STATUS_LABEL: Record<string, { ko: string; zh: string; color: string }> = {
  pending: { ko: '대기', zh: '待处理', color: '#f59e0b' },
  confirmed: { ko: '확정', zh: '已确认', color: '#0ea5e9' },
  in_production: { ko: '생산 중', zh: '生产中', color: '#8b5cf6' },
  qc_pending: { ko: '검수 대기', zh: '待检验', color: '#f97316' },
  shipped: { ko: '출하', zh: '已发货', color: '#10b981' },
  delivered: { ko: '완료', zh: '已完成', color: '#10b981' },
  cancelled: { ko: '취소', zh: '已取消', color: '#ef4444' },
};

export default function FactoryOrdersClient({ orders, factory, isAdmin }: Props) {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const totalAmount = orders.reduce((sum, o) => sum + (o.total_amount_cny ?? 0), 0);
  const activeOrders = orders.filter(o => ['confirmed', 'in_production', 'qc_pending'].includes(o.status));

  return (
    <div className="kx-animate-in">

      <div className="mb-6">
        <h1 className="text-2xl font-black text-[var(--text-primary)] mb-1">
          {t('주문 현황', '订单状态')}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t('진행 중인 주문과 거래 내역을 확인합니다.', '查看进行中的订单和交易记录。')}
        </p>
      </div>


      <div className="grid gap-4 mb-6 grid-cols-3">
        {[
          { label: t('전체 주문', '全部订单'), value: orders.length, icon: '📋', color: '#0ea5e9' },
          { label: t('진행 중', '进行中'), value: activeOrders.length, icon: '🚀', color: '#8b5cf6' },
          { label: t('총 거래액', '总交易额'), value: `¥${totalAmount.toLocaleString()}`, icon: '💰', color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-base)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border-[1.5px] border-[var(--border-light)]">
            <div className="text-[28px] mb-2">{stat.icon}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] mb-1">{stat.label}
              </div>
            <div className="font-black" style={{ fontSize: typeof stat.value === 'string' ? 20 : 32, color: stat.color }}>{stat.value}
              </div>
          </div>
        ))}
      </div>


      <div className="bg-[var(--bg-base)] rounded-2xl overflow-hidden shadow-[var(--shadow-sm)] border-[1.5px] border-[var(--border-light)]">
        <div className="px-5 py-4 border-b border-[var(--border-light)]">
          <span className="text-[15px] font-bold">{t('주문 내역', '订单记录')}</span>
        </div>
        {orders.length === 0 ? (
          <div className="text-center text-[var(--text-tertiary)] py-[60px] px-5">
            <div className="text-5xl mb-3">📋</div>
            <div className="text-[16px] font-semibold">{t('주문 내역이 없습니다', '暂无订单记录')}</div>
          </div>
        ) : (
          <div>
            {orders.map((order: any, i: number) => {
              const statusInfo = STATUS_LABEL[order.status] ?? { ko: order.status, zh: order.status, color: '#94a3b8' };
              return (
                <div key={order.id} className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold mb-1 text-[#0ea5e9]">
                      {order.order_no ?? order.id?.slice(0, 8) ?? '-'}
                    </div>
                    <div className="text-[13px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                      {lang === 'zh' && order.product?.name_zh ? order.product.name_zh : (order.product?.name_ko ?? '-')}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : '-'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[15px] font-extrabold text-[var(--text-primary)] mb-1">
                      ¥{(order.total_amount_cny ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mb-1.5">
                      {t(`${order.quantity ?? 0}개`, `${order.quantity ?? 0}件`)}
                    </div>
                    <div className="text-[11px] font-bold py-[3px] px-[10px]" style={{ borderRadius: 99, background: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}>
                      {lang === 'zh' ? statusInfo.zh : statusInfo.ko}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
