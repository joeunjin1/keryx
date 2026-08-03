import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MD 성과 현황',
  description: '나의 매칭 성공률, 주문 완료 건수, 바이어 만족도를 확인합니다.',
};

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

const brandColor = '#6366f1'; // MD 포털 색상

export default async function MdMyPerformancePage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['md', 'admin'].includes(profile.kind)) redirect('/admin');

  const { data: me } = await supabase
    .from('internal_users').select('id, name_ko, name_zh, staff_code').eq('user_id', user.id).single() as { data: any; error: any };

  const { data: perf } = await supabase
    .from('md_performance_snapshots')
    .select('*')
    .eq('md_id', me?.id ?? '')
    .order('snapshot_month', { ascending: false })
    .limit(12) as { data: any[]; error: any };

  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, business_name, current_grade, total_orders, total_balance_paid_cny')
    .eq('assigned_md_id', me?.id ?? '')
    .order('total_balance_paid_cny', { ascending: false }) as { data: any[]; error: any };

  const displayName = me?.name_ko ?? profile.display_name ?? 'MD';
  const totalRevenue = (sellers ?? []).reduce((s: number, x: any) => s + (x.total_balance_paid_cny ?? 0), 0);
  const totalOrders = (sellers ?? []).reduce((s: number, x: any) => s + (x.total_orders ?? 0), 0);
  const vipCount = (sellers ?? []).filter((s: any) => s.current_grade === 'vip').length;

  return (
    <div>
          <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
          <LangText ko="내 실적 현황" zh="我的业绩概况" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          {me?.staff_code} · <LangText ko={`담당 바이어 ${sellers?.length ?? 0}명`} zh={`负责买家 ${sellers?.length ?? 0} 名`} />
        </p>
      </div>


      <div className="grid gap-3 mb-6 grid-cols-2">
        {[
          { label: '누적 매출', labelZh: '累计销售额', value: `¥${(totalRevenue / 10000).toFixed(1)}만`, color: brandColor, icon: '💰' },
          { label: '총 주문', labelZh: '总订单', value: `${totalOrders}건`, color: '#10b981', icon: '📋' },
          { label: 'VIP 바이어', labelZh: 'VIP买家', value: `${vipCount}명`, color: '#f59e0b', icon: '👑' },
          { label: '담당 바이어', labelZh: '负责买家', value: `${sellers?.length ?? 0}명`, color: '#8b5cf6', icon: '👥' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[var(--bg-base)] p-4 text-center border border-[var(--border-light)] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]">
            <div className="text-2xl mb-1.5">{kpi.icon}</div>
            <div className="text-xl font-extrabold mb-1" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              <LangText ko={kpi.label} zh={kpi.labelZh} />
            </div>
          </div>
        ))}
      </div>


      {(perf ?? []).length > 0 && (
        <div className="mb-6">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-3">
            <LangText ko="월별 실적" zh="月度业绩" />
          </h2>
          <div className="flex flex-col gap-2">
            {(perf ?? []).slice(0, 6).map((p: any) => (
              <div key={p.id} className="bg-[var(--bg-base)] px-4 py-3 flex items-center justify-between border border-[var(--border-light)] rounded-[var(--radius-md)]">
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">{p.snapshot_month}
              </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: brandColor }}>¥{(p.total_balance_paid_cny ?? 0).toLocaleString()}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]"><LangText ko="매출" zh="销售额" />
              </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-500">{p.total_orders ?? 0}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]"><LangText ko="주문" zh="订单" />
              </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      <div>
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-3">
          <LangText ko="담당 바이어" zh="负责买家" />
        </h2>
        <div className="flex flex-col gap-2">
          {(sellers ?? []).map((s: any) => (
            <Link key={s.id} href={`/md/seller/${s.id}`} className="no-underline">
              <div className="bg-[var(--bg-base)] px-4 py-3 flex items-center justify-between border border-[var(--border-light)] rounded-[var(--radius-md)]">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {s.business_name}
                    {s.current_grade === 'vip' && <span className="text-[10px] font-bold bg-[#fef3c7] text-[#92400e] py-[1px] px-[6px]" style={{ marginLeft: 6, borderRadius: 99 }}>👑 VIP</span>}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                    <LangText ko={`주문 ${s.total_orders ?? 0}건`} zh={`订单 ${s.total_orders ?? 0} 件`} />
                  </div>
                </div>
                <div className="text-sm font-bold" style={{ color: brandColor }}>¥{(s.total_balance_paid_cny ?? 0).toLocaleString()}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
