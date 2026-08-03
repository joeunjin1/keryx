'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';


const brandColor = '#e11d48';

const STATUS_MAP: Record<string, { label: string; labelZh: string; color: string }> = {
  draft: { label: '검수 등록', labelZh: '待分配', color: '#94a3b8' },
  scheduled: { label: '검수 예정', labelZh: '待检验', color: '#f59e0b' },
  in_progress: { label: '검수 중', labelZh: '检验中', color: '#3b82f6' },
  review: { label: 'MD 정리 중', labelZh: 'MD整理中', color: '#8b5cf6' },
  pending_approval: { label: '승인 대기', labelZh: '待审批', color: '#f97316' },
  published: { label: '발송 완료', labelZh: '已发소', color: '#10b981' },
  completed: { label: '완료', labelZh: '已完成', color: '#10b981' },
  cancelled: { label: '취소', labelZh: '已取消', color: '#6b7280' },
};

export default function FactoryInspectionsPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '검수 일정 | KERYX';
  }, []);

  const router = useRouter();
  const supabase = createClient() as any;
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('공장');
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=factory'); return; }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('kind, display_name')
        .eq('id', user.id)
        .single();

      let factoryId: string | null = null;
      if (profile?.kind !== 'admin' && profile?.kind !== 'md') {
        const { data: factory } = await supabase
          .from('factories')
          .select('id, company_name_ko, company_name')
          .eq('shared_login_user_id', user.id)
          .single();
        if (!factory) { router.push('/factory'); return; }
        factoryId = factory.id;
        setUserName(factory.company_name_ko ?? factory.company_name ?? '공장');
      } else {
        setUserName(profile?.display_name ?? '관리자');
      }

      // 검수 데이터 로드
      let query = supabase
        .from('inspections')
        .select(`
          id, inspection_no, status, outcome, started_at, completed_at,
          qty_received, qty_passed, inspection_fee_cny,
          order:orders(order_no, total_cny, seller:sellers(business_name))
        `)
        .order('created_at', { ascending: false });

      if (factoryId) {
        // 공장 계정에게는 published 이상 상태만 노출
        query = query
          .eq('factory_id', factoryId)
          .in('status', ['published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved']);
      }

      const { data } = await query;
      setInspections(data ?? []);
      setLoading(false);
    })();
  }, []);

  // 공장에게는 published 이상만 오므로 전체를 '완료' 탭에 표시
  const activeList = inspections.filter(i => ['published', 'approved', 'buyer_approved', 'factory_approved'].includes(i.status));
  const completedList = inspections.filter(i => ['both_approved'].includes(i.status));
  const currentList = tab === 'active' ? activeList : completedList;

  const passRate = (insp: any) => {
    if (!insp.qty_received || insp.qty_received === 0) return null;
    return Math.round((insp.qty_passed / insp.qty_received) * 100);
  };

  return (
    <div className="kx-animate-in">

        <div className="mb-5">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
            <LangText ko="검수 관리" zh="检验管理" />
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)]">
            <LangText ko="제품 검수 현황 및 결과를 확인합니다." zh="查看产品检验状态和结果。" />
          </p>
        </div>


        <div className="flex gap-2 mb-5">
          {[
            { id: 'active', label: '확인 필요', labelZh: '待确认', count: activeList.length },
            { id: 'completed', label: '승인 완료', labelZh: '已完成', count: completedList.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className="flex items-center gap-1.5 px-4 py-2 border-none cursor-pointer text-[13px] font-semibold rounded-[var(--radius-lg)]" style={{ background: tab === t.id ? brandColor : 'var(--bg-subtle)', color: tab === t.id ? '#fff' : 'var(--text-secondary)' }}
            >
              <LangText ko={t.label} zh={t.labelZh} />
              <span className="text-[11px] py-[1px] px-[7px] rounded-full" style={{ background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-muted)', color: tab === t.id ? '#fff' : 'var(--text-tertiary)' }}>{t.count}</span>
            </button>
          ))}
        </div>


        {loading && (
          <div className="text-center text-[var(--text-tertiary)] py-[60px] px-6">
            <div className="text-[32px] mb-3">⏳</div>
            <LangText ko="불러오는 중…" zh="加载中…" />
          </div>
        )}


        {!loading && currentList.length === 0 && (
          <div className="text-center bg-[var(--bg-base)] rounded-[20px] py-[60px] px-6 border border-[var(--border-light)]">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-base font-bold text-[var(--text-primary)] mb-2">
              <LangText ko="검수 내역이 없습니다" zh="暂无检验记录" />
            </div>
            <p className="text-[13px] text-[var(--text-tertiary)] leading-[1.6]">
              <LangText
                ko="주문이 창고에 도착하면 MD가 검수를 진행합니다."
                zh="订单到达仓库后，MD将进行检验。"
              />
            </p>
          </div>
        )}


        {!loading && currentList.length > 0 && (
          <div className="flex flex-col gap-3">
            {currentList.map((insp) => {
              const st = STATUS_MAP[insp.status] ?? { label: insp.status, labelZh: insp.status, color: '#6b7280' };
              const rate = passRate(insp);
              return (
                <div
                  key={insp.id}
                  className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-light)] py-[18px] px-5 shadow-[var(--shadow-xs)]"
                >

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        {insp.inspection_no}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {insp.order?.order_no} · {insp.order?.seller?.business_name ?? '-'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full" style={{ background: st.color + '20', color: st.color }}>
                      <LangText ko={st.label} zh={st.labelZh} />
                    </span>
                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {insp.qty_received != null && (
                      <div className="bg-[var(--bg-subtle)] rounded-[10px] py-[10px] px-3">
                        <div className="text-[10px] text-[var(--text-tertiary)]" style={{ marginBottom: 3 }}>
                          <LangText ko="수령 수량" zh="收货数量" />
                        </div>
                        <div className="text-base font-bold text-[var(--text-primary)]">
                          {insp.qty_received?.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {insp.qty_passed != null && (
                      <div className="rounded-[10px] py-[10px] px-3" style={{ background: rate && rate >= 95 ? '#f0fdf4' : rate && rate >= 80 ? '#fffbeb' : '#fef2f2' }}>
                        <div className="text-[10px] text-[var(--text-tertiary)]" style={{ marginBottom: 3 }}>
                          <LangText ko="합격 수량" zh="合格数量" />
                        </div>
                        <div className="text-base font-bold" style={{ color: rate && rate >= 95 ? '#16a34a' : rate && rate >= 80 ? '#d97706' : '#dc2626' }}>
                          {insp.qty_passed?.toLocaleString()}
                          {rate != null && <span className="text-xs ml-1">({rate}%)</span>}
                        </div>
                      </div>
                    )}
                  </div>


                  {insp.outcome && (
                    <div className="px-3 py-2 bg-[var(--bg-subtle)] rounded-[10px]" style={{ marginTop: 10 }}>
                      <span className="text-xs text-[var(--text-secondary)]">
                        <LangText ko="검수 결과: " zh="检验结果: " />
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {insp.outcome === 'pass' ? '✅ 합격' : insp.outcome === 'partial_pass' ? '⚠️ 조건부 합격' : '❌ 불합격'}
                      </span>
                    </div>
                  )}


                  <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      {insp.started_at && (
                        <span><LangText ko="시작: " zh="开始: " />{new Date(insp.started_at).toLocaleDateString('ko-KR')}</span>
                      )}
                      {insp.completed_at && (
                        <span className="ml-3"><LangText ko="완료: " zh="完成: " />{new Date(insp.completed_at).toLocaleDateString('ko-KR')}</span>
                      )}
                    </div>
                    <Link
                        href={`/factory/inspections/${insp.id}/report`}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: '#e11d4815', color: '#e11d48', textDecoration: 'none' }}
                      >
                        <LangText ko="보고서 보기 →" zh="查看报告 →" />
                      </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
