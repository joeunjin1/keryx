export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MD 성과 관리',
  description: '전체 MD의 매칭 성공률, 주문 완료 건수, KPI를 관리합니다.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

export default async function AdminMdPerformancePage() {
  const brandColor = '#e11d48';
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: me } = await supabase
    .from('internal_users').select('role, name_ko').eq('user_id', user.id).single() as { data: any; error: any };
  if (!me || me.role !== 'admin') redirect('/admin');

  const { data: mds } = await supabase.rpc('get_md_performance' as any, {} as any) as { data: any; error: any };
  const mdList = (mds ?? []) as any[];

  const totalRevenue = mdList.reduce((s: number, m: any) => s + Number(m.month_revenue_cny ?? 0), 0);
  const totalSellers = mdList.reduce((s: number, m: any) => s + (m.total_sellers ?? 0), 0);
  const totalVip = mdList.reduce((s: number, m: any) => s + (m.vip_sellers ?? 0), 0);
  const totalBriefs = mdList.reduce((s: number, m: any) => s + (m.total_briefs ?? 0), 0);
  const avgResp = mdList.length > 0 ? mdList.reduce((s: number, m: any) => s + Number(m.avg_response_hours ?? 0), 0) / mdList.length : 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          <LangText ko="MD 실적 대시보드" zh="MD业绩仪表盘" />
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          <LangText ko={`MD ${mdList.length}명`} zh={`MD ${mdList.length} 名`} />
        </p>
      </div>

      {/* 전체 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: '이번달 매출', labelZh: '本月销售额', value: `¥${(totalRevenue / 10000).toFixed(1)}만`, color: brandColor },
          { label: '총 바이어', labelZh: '总买家', value: `${totalSellers}명`, color: '#10b981' },
          { label: 'VIP 바이어', labelZh: 'VIP买家', value: `${totalVip}명`, color: '#f59e0b' },
          { label: '평균 응답', labelZh: '平均响应', value: `${avgResp.toFixed(1)}h`, color: '#8b5cf6' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              <LangText ko={kpi.label} zh={kpi.labelZh} />
            </div>
          </div>
        ))}
      </div>

      {/* MD 목록 */}
      {mdList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            <LangText ko="MD 실적 데이터가 없습니다" zh="没有MD业绩数据" />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mdList.map((m: any) => {
            const monthRevenue = Number(m.month_revenue_cny ?? 0);
            const vipRate = m.total_sellers > 0 ? (m.vip_sellers / m.total_sellers * 100) : 0;
            return (
              <div key={m.md_id} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '14px 16px', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{m.name_ko}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.staff_code}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: brandColor }}>¥{(monthRevenue / 10000).toFixed(1)}<LangText ko="만" zh="万" /></div>
                </div>
                {totalRevenue > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                      <LangText ko="매출 비중" zh="销售占比" />
                      <span>{(monthRevenue / totalRevenue * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--border-light)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(monthRevenue / totalRevenue * 100)}%`, background: `linear-gradient(90deg, ${brandColor}, #8b5cf6)`, borderRadius: 99 }} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { label: '바이어(고객)', labelZh: '买家(客户)', value: m.total_sellers ?? 0 },
                    { label: 'VIP', labelZh: 'VIP', value: m.vip_sellers ?? 0 },
                    { label: 'Brief', labelZh: 'Brief', value: m.total_briefs ?? 0 },
                    { label: '응답', labelZh: '响应', value: `${Number(m.avg_response_hours ?? 0).toFixed(1)}h` },
                  ].map((stat) => (
                    <div key={stat.label} style={{ textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 4px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}><LangText ko={stat.label} zh={stat.labelZh} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
