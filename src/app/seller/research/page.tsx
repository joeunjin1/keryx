'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';



const brandColor = '#f97316';
type StatusKey = 'all' | 'pending' | 'in_progress' | 'md_completed' | 'admin_completed';

const STATUS_TABS: { id: StatusKey; ko: string; zh: string; color: string }[] = [
  { id: 'all', ko: '전체', zh: '全部', color: '#6b7280' },
  { id: 'pending', ko: '대기', zh: '待处理', color: '#f59e0b' },
  { id: 'in_progress', ko: '진행중', zh: '进行中', color: '#4f46e5' },
  { id: 'md_completed', ko: 'MD완료', zh: 'MD完成', color: '#10b981' },
  { id: 'admin_completed', ko: '완료', zh: '已完成', color: '#6b7280' },
];

function statusColor(s: string) {
  const map: Record<string, string> = { pending: '#f59e0b', in_progress: '#4f46e5', md_completed: '#10b981', admin_completed: '#6b7280', cancelled: '#ef4444' };
  return map[s] ?? '#9ca3af';
}
function statusLabel(s: string): [string, string] {
  const map: Record<string, [string, string]> = { pending: ['대기 중', '待处理'], in_progress: ['진행 중', '进行中'], md_completed: ['MD 완료', 'MD完成'], admin_completed: ['완료', '已完成'], cancelled: ['취소', '已取消'] };
  return map[s] ?? [s, s];
}

const TIMELINE_STEPS = [
  { key: 'pending', ko: '접수', zh: '已接收' },
  { key: 'in_progress', ko: 'MD 조사', zh: 'MD调研' },
  { key: 'md_completed', ko: 'MD 완료', zh: 'MD完成' },
  { key: 'admin_completed', ko: '보고서 발송', zh: '报告发送' },
];

function getStepIndex(status: string) {
  return ['pending', 'in_progress', 'md_completed', 'admin_completed'].indexOf(status);
}

export default function SellerResearchPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const router = useRouter();
  const supabase = createClient() as any;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusKey>('all');
  const [displayName, setDisplayName] = useState('셀러');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }
      const { data: profile } = await supabase.from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
      if (!profile || !['seller', 'admin'].includes(profile.kind)) { router.push('/login?role=seller'); return; }
      const { data: seller } = await supabase.from('sellers').select('id, business_name').eq('user_id', user.id).single() as { data: any; error: any };
      setDisplayName(seller?.business_name ?? profile.display_name ?? '셀러');
      // admin 계정은 sellers 테이블에 레코드가 없으므로 seller_id 필터 없이 전체 조회
      const isAdmin = profile.kind === 'admin';
      let reqQuery = supabase
        .from('market_research_requests')
        .select('id, request_no, status, product_count, is_urgent, created_at, expected_deadline, notes')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!isAdmin && seller?.id) {
        reqQuery = reqQuery.eq('seller_id', seller.id);
      }
      const { data: reqs } = await reqQuery as { data: any[]; error: any };
      setRequests(reqs ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab);
  const counts: Record<string, number> = { all: requests.length };
  STATUS_TABS.slice(1).forEach(t => { counts[t.id] = requests.filter(r => r.status === t.id).length; });

  if (loading) return (
      <div className="text-center px-6 py-20 text-[var(--text-tertiary)]">
        <div className="text-[32px] mb-3">⏳</div>
        <LangText ko="로딩 중..." zh="加载中..." />
      </div>
  );

  return (
    <>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
            <LangText ko="시장조사 요청" zh="市场调研请求" />
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)]">
            <LangText ko={`총 ${requests.length}건`} zh={`共 ${requests.length} 件`} />
          </p>
        </div>
        <Link href="/seller/research/new" className="inline-flex items-center gap-1.5 px-4 py-2.5 text-white no-underline text-[13px] font-semibold rounded-[var(--radius-lg)]" style={{ background: brandColor }}>
          + <LangText ko="새 요청" zh="新请求" />
        </Link>
      </div>


      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="shrink-0 px-3 py-1.5 text-xs cursor-pointer flex items-center gap-1" style={{ borderRadius: 99, border: `1.5px solid ${tab === t.id ? t.color : 'var(--border-light)'}`, background: tab === t.id ? `${t.color}15` : 'var(--bg-base)', color: tab === t.id ? t.color : 'var(--text-secondary)', fontWeight: tab === t.id ? 700 : 500 }}>
            <LangText ko={t.ko} zh={t.zh} />
            {counts[t.id] > 0 && (
              <span className="text-[10px] font-bold min-w-4 text-center py-[1px] px-[5px]" style={{ background: tab === t.id ? t.color : 'var(--border-light)', color: tab === t.id ? '#fff' : 'var(--text-tertiary)', borderRadius: 99 }}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>


      {filtered.length === 0 ? (
        <div className="text-center px-6 py-12 bg-[var(--bg-base)] border border-[var(--border-light)] rounded-[var(--radius-lg)]">
          <div className="text-[40px] mb-3">🔬</div>
          <div className="text-sm text-[var(--text-secondary)] mb-4">
            <LangText ko={tab === 'all' ? '시장조사 요청 내역이 없습니다' : '해당 상태의 요청이 없습니다'} zh={tab === 'all' ? '没有市场调研请求记录' : '没有该状态的请求'} />
          </div>
          {tab === 'all' && (
            <Link href="/seller/research/new" className="inline-block px-5 py-2.5 text-white no-underline text-[13px] font-semibold rounded-[var(--radius-lg)]" style={{ background: brandColor }}>
              + <LangText ko="첫 시장조사 요청하기" zh="发起第一次市场调研" />
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r: any) => {
            const [koLabel, zhLabel] = statusLabel(r.status);
            const color = statusColor(r.status);
            const stepIdx = getStepIndex(r.status);
            return (
              <Link key={r.id} href={`/seller/research/${r.id}`} className="no-underline">
                <div className="bg-[var(--bg-base)] overflow-hidden border border-[var(--border-light)] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="pt-3.5 px-4 pb-[10px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[var(--text-tertiary)]">{r.request_no}
              </span>
                        {r.is_urgent && <span className="text-[10px] font-bold bg-[#fee2e2] text-[#dc2626] py-[1px] px-[6px]" style={{ borderRadius: 99 }}>🚨 긴급</span>}
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-[3px]" style={{ background: `${color}20`, color: color, borderRadius: 99 }}>
                        <LangText ko={koLabel} zh={zhLabel} />
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                      <LangText ko={`상품 ${r.product_count}건 조사 요청`} zh={`申请调研 ${r.product_count} 件商品`} />
                    </div>
                    {r.notes && <div className="text-xs text-[var(--text-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">{r.notes}</div>}
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
                      {new Date(r.created_at).toLocaleDateString('ko')}
                      {r.expected_deadline && ` · 마감 ${r.expected_deadline}`}
                    </div>
                  </div>

                  {r.status !== 'cancelled' && (
                    <div className="bg-[var(--bg-subtle)] border-t border-[var(--border-light)] pt-2 px-4 pb-3">
                      <div className="flex items-center">
                        {TIMELINE_STEPS.map((step, i) => {
                          const done = i <= stepIdx;
                          const active = i === stepIdx;
                          return (
                            <div key={step.key} className="flex items-center" style={{ flex: i < TIMELINE_STEPS.length - 1 ? 1 : 'none' }}>
                              <div className="flex flex-col items-center" style={{ gap: 3 }}>
                                <div className="rounded-full flex items-center justify-center font-bold text-[9px]" style={{ width: active ? 22 : 16, height: active ? 22 : 16, background: done ? (active ? color : `${color}70`) : 'var(--border-light)', border: active ? `2px solid ${color}` : 'none', color: done ? '#fff' : 'var(--text-tertiary)' }}>
                                  {done ? '✓' : i + 1}
                                </div>
                                <span className="whitespace-nowrap text-[9px]" style={{ color: done ? color : 'var(--text-tertiary)', fontWeight: active ? 700 : 400 }}>
                                  <LangText ko={step.ko} zh={step.zh} />
                                </span>
                              </div>
                              {i < TIMELINE_STEPS.length - 1 && (
                                <div className="flex-1 h-[2px] mb-3.5 my-0 mx-1" style={{ background: i < stepIdx ? `${color}60` : 'var(--border-light)' }}
              />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
