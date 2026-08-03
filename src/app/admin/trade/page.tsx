import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '무역 서비스 관리',
  description: '물류 대행, 통관, 배송 서비스 전체 현황을 관리합니다.',
};

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import LangText from '@/components/layout/LangText';

export default async function AdminTradePage() {
  const supabase = createClient() as any;

  // 주문 통계
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true }) as unknown as { count: number };

  const { count: pendingOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending') as unknown as { count: number };

  const { count: inProductionOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_production') as unknown as { count: number };

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_no, status, total_amount_cny, created_at, factory:factories(company_name), seller:sellers(company_name)')
    .order('created_at', { ascending: false })
    .limit(10) as { data: any[] };

  const statusLabel: Record<string, string> = {
    pending: '대기',
    confirmed: '확정',
    in_production: '생산 중',
    qc_pending: '검수 대기',
    shipped: '출하',
    delivered: '완료',
    cancelled: '취소',
  };
  const statusColor: Record<string, string> = {
    pending: '#f59e0b',
    confirmed: '#0ea5e9',
    in_production: '#8b5cf6',
    qc_pending: '#f97316',
    shipped: '#10b981',
    delivered: '#10b981',
    cancelled: '#ef4444',
  };

  return (
    <div className="kx-animate-in">

      <div className="mb-6">
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
          거래 센터
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          전체 주문·거래 현황을 모니터링합니다.
        </p>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: '전체 주문', value: totalOrders ?? 0, icon: '📋', color: '#0ea5e9' },
          { label: '대기 중', value: pendingOrders ?? 0, icon: '⏳', color: '#f59e0b' },
          { label: '생산 중', value: inProductionOrders ?? 0, icon: '🏭', color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-base)', borderRadius: 16, padding: '20px',
            border: '1.5px solid var(--border-light)', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{stat.label}
              </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>


      <div style={{ background: 'var(--bg-base)', borderRadius: 16, border: '1.5px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="text-[15px] font-bold">최근 주문 내역</span>
          <Link href="/admin/payments" style={{ fontSize: 12, color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 }}>
            결제 승인 관리 →
          </Link>
        </div>
        {!recentOrders || recentOrders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div className="text-[16px] font-semibold">주문 내역이 없습니다</div>
          </div>
        ) : (
          <div>
            <div style={{ padding: '10px 20px', background: 'var(--bg-muted)', display: 'grid', gridTemplateColumns: '120px 1fr 1fr 100px 100px', gap: 12, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              <span>주문번호</span>
              <span>공장</span>
              <span>바이어(고객)</span>
              <span>금액(CNY)</span>
              <span>상태</span>
            </div>
            {recentOrders.map((order: any, i: number) => (
              <div key={order.id} style={{
                padding: '14px 20px', display: 'grid', gridTemplateColumns: '120px 1fr 1fr 100px 100px', gap: 12, alignItems: 'center',
                borderBottom: i < recentOrders.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9' }}>
                  {order.order_no ?? order.id?.slice(0, 8) ?? '-'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.factory?.company_name ?? '-'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.seller?.company_name ?? '-'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  ¥{(order.total_amount_cny ?? 0).toLocaleString()}
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textAlign: 'center',
                  background: `${statusColor[order.status] ?? '#94a3b8'}15`,
                  color: statusColor[order.status] ?? '#94a3b8',
                }}>
                  {statusLabel[order.status] ?? order.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
