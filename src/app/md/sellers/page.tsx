import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '담당 바이어 목록',
  description: '배정된 바이어 목록과 각 바이어의 요청 현황을 관리합니다.',
};

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

const brandColor = '#6366f1'; // MD 포털 색상

export default async function MdSellersPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['md', 'admin'].includes(profile.kind)) redirect('/admin');

  const { data: me } = await supabase
    .from('internal_users').select('id, name_ko').eq('user_id', user.id).single() as { data: any; error: any };

  const { data: sellers } = await supabase
    .from('sellers')
    .select(`id, business_name, current_grade, current_membership, country, contact_name, contact_phone,
       total_orders, total_balance_paid_cny, current_month_balance_paid_cny, approval_status, created_at`)
    .eq('assigned_md_id', me?.id ?? '')
    .order('total_balance_paid_cny', { ascending: false }) as { data: any[]; error: any };

  const displayName = me?.name_ko ?? profile.display_name ?? 'MD';
  const vipCount = (sellers ?? []).filter((s: any) => s.current_grade === 'vip').length;
  const totalRevenue = (sellers ?? []).reduce((s: number, x: any) => s + (x.total_balance_paid_cny ?? 0), 0);

  return (
    <div>
          <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
          <LangText ko="담당 바이어 목록" zh="负责买家列表" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          <LangText ko={`총 ${sellers?.length ?? 0}명`} zh={`共 ${sellers?.length ?? 0} 名`} />
          {' · '}VIP {vipCount}<LangText ko="명" zh="名" />
          {' · '}¥{(totalRevenue / 10000).toFixed(1)}<LangText ko="만" zh="万" />
        </p>
      </div>


      <div className="grid gap-2.5 mb-5 grid-cols-3">
        {[
          { label: '전체', labelZh: '全部', value: sellers?.length ?? 0, color: brandColor },
          { label: 'VIP', labelZh: 'VIP', value: vipCount, color: '#f59e0b' },
          { label: '이번달', labelZh: '本月', value: `¥${((sellers ?? []).reduce((s: number, x: any) => s + (x.current_month_balance_paid_cny ?? 0), 0) / 10000).toFixed(1)}만`, color: '#10b981' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--bg-base)] p-3 text-center border border-[var(--border-light)] rounded-[var(--radius-lg)]">
            <div className="text-lg font-extrabold" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
              <LangText ko={item.label} zh={item.labelZh} />
            </div>
          </div>
        ))}
      </div>

      {(sellers ?? []).length === 0 ? (
        <div className="text-center px-6 py-12 bg-[var(--bg-base)] border border-[var(--border-light)] rounded-[var(--radius-lg)]">
          <div className="text-[40px] mb-3">👥</div>
          <div className="text-sm text-[var(--text-secondary)]">
            <LangText ko="담당 바이어가 없습니다" zh="没有负责的买家(客户)" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(sellers ?? []).map((s: any) => (
            <Link key={s.id} href={`/md/seller/${s.id}`} className="no-underline">
              <div className="bg-[var(--bg-base)] border border-[var(--border-light)] py-[14px] px-4 shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: s.current_grade === 'vip' ? '#fef3c7' : `${brandColor}20` }}>
                      {s.current_grade === 'vip' ? '👑' : '🏪'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">{s.business_name}
              </div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {s.country} · {s.contact_name}
                        {s.current_membership && s.current_membership !== 'free' && (
                          <span className="ml-1 text-[10px] bg-[#ede9fe] text-[#7c3aed] py-[1px] px-[5px]" style={{ borderRadius: 99 }}>{s.current_membership}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: brandColor }}>¥{(s.total_balance_paid_cny ?? 0).toLocaleString()}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">
                      <LangText ko={`주문 ${s.total_orders ?? 0}건`} zh={`订单 ${s.total_orders ?? 0} 件`} />
                    </div>
                  </div>
                </div>
                {s.approval_status !== 'approved' && (
                  <div className="text-[11px] px-2 py-1 mt-1.5 bg-[#fef3c7] text-[#92400e] rounded-[var(--radius-sm)]">
                    ⚠️ <LangText ko="승인 대기 중" zh="待审批" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
