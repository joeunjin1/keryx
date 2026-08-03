import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주문 관리',
  description: '담당 바이어의 주문 현황과 납기, 품질 이슈를 관리합니다.',
};

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

const brandColor = '#6366f1'; // MD 포털 색상

function statusLabel(s: string): string {
  return ({ draft: '초안', confirmed: '확정', in_production: '생산중', shipped: '출하', delivered: '납품', cancelled: '취소' } as Record<string, string>)[s] ?? s;
}
function statusColor(s: string): string {
  return ({ confirmed: '#4f46e5', in_production: '#f59e0b', shipped: '#0ea5e9', delivered: '#10b981', cancelled: '#ef4444', draft: '#9ca3af' } as Record<string, string>)[s] ?? '#9ca3af';
}

export default async function MdOrdersPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['md', 'admin'].includes(profile.kind)) redirect('/admin');

  const { data: me } = await supabase
    .from('internal_users').select('id, name_ko').eq('user_id', user.id).single() as { data: any; error: any };

  const { data: orders } = await supabase
    .from('orders')
    .select(`id, order_no, status, total_cny, created_at, expected_warehouse_arrival,
       seller:sellers(business_name, current_grade),
       seller:sellers(business_name)`)
    .eq('md_id', me?.id ?? '')
    .not('status', 'in', '("cancelled")')
    .order('created_at', { ascending: false })
    .limit(50) as { data: any[]; error: any };

  const displayName = me?.name_ko ?? profile.display_name ?? 'MD';
  const totalAmount = (orders ?? []).reduce((s: number, o: any) => s + (o.total_cny ?? 0), 0);

  return (
    <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            <LangText ko="발주 관리" zh="订单管理" />
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            <LangText ko={`총 ${orders?.length ?? 0}건`} zh={`共 ${orders?.length ?? 0} 件`} />
            {' · '}¥{totalAmount.toLocaleString()}
          </p>
        </div>
        <Link href="/md/orders/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 'var(--radius-lg)', background: brandColor, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          + <LangText ko="새 발주" zh="新订单" />
        </Link>
      </div>


      <Link href="/md/orders/margin-builder" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'linear-gradient(135deg, #1e293b, #334155)', borderRadius: 'var(--radius-lg)', textDecoration: 'none', marginBottom: 20 }}>
        <span className="text-2xl">💰</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}><LangText ko="마진 계산기" zh="利润计算器" /></div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}><LangText ko="원가 · 판매가 · 이윤 분석" zh="成本 · 售价 · 利润分析" /></div>
        </div>
        <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 16 }}>→</span>
      </Link>

      {(orders ?? []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            <LangText ko="진행 중인 발주가 없습니다" zh="没有进行中的订单" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(orders ?? []).map((o: any) => {
            const color = statusColor(o.status);
            return (
              <Link key={o.id} href={`/md/orders/${o.id}`} className="no-underline">
                <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '14px 16px', borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)' }}>{o.order_no}
              </span>
                    <span style={{ background: `${color}20`, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99 }}>
                      {statusLabel(o.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{o.seller?.business_name}
              </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {o.seller?.business_name}
                        {o.expected_warehouse_arrival && ` · ${o.expected_warehouse_arrival}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: brandColor }}>¥{(o.total_cny ?? 0).toLocaleString()}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
