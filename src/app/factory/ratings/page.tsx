'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';


const brandColor = '#e11d48';

function StarDisplay({ score }: { score: number }) {
  return (
    <div className="flex gap-0">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className="text-base" style={{ color: s <= score ? '#f59e0b' : '#d1d5db' }}>★
              </span>
      ))}
    </div>
  );
}

export default function FactoryRatingsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '평가 및 리뷰 | KERYX';
  }, []);

  const router = useRouter();
  const supabase = createClient() as any;
  const [ratings, setRatings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('공장');

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
          .select('id, company_name_ko, company_name, quality_score, delivery_score, communication_score, overall_score')
          .eq('shared_login_user_id', user.id)
          .single();
        if (!factory) { router.push('/factory'); return; }
        factoryId = factory.id;
        setUserName(factory.company_name_ko ?? factory.company_name ?? '공장');
        setSummary(factory);
      } else {
        setUserName(profile?.display_name ?? '관리자');
        // 관리자는 첫 번째 공장 데이터 표시
        const { data: factory } = await supabase
          .from('factories')
          .select('id, company_name_ko, company_name, quality_score, delivery_score, communication_score, overall_score')
          .limit(1)
          .single();
        if (factory) {
          factoryId = factory.id;
          setSummary(factory);
        }
      }

      // 평가 내역 로드
      if (factoryId) {
        const { data: ratingData } = await supabase
          .from('factory_ratings')
          .select(`
            id, quality_score, delivery_score, communication_score, overall_score,
            comment, created_at,
            order:orders(order_no),
            rated_by:internal_users(name_ko, staff_code)
          `)
          .eq('factory_id', factoryId)
          .order('created_at', { ascending: false });
        setRatings(ratingData ?? []);
      }

      setLoading(false);
    })();
  }, []);

  const avg = (key: string) => {
    if (!ratings.length) return summary?.[key] ?? 0;
    return (ratings.reduce((sum, r) => sum + (r[key] ?? 0), 0) / ratings.length).toFixed(1);
  };

  return (
    <div className="kx-animate-in">

        <div className="mb-5">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
            <LangText ko="평가 현황" zh="评价状况" />
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)]">
            <LangText ko="MD가 평가한 공장 품질 점수를 확인합니다." zh="查看MD对工厂的质量评分。" />
          </p>
        </div>


        {summary && (
          <div className="rounded-[20px] p-6 mb-5 text-white bg-[linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 100%)]">
            <div className="text-[13px] mb-4 text-[rgba(255,255,255,0.6)]">
              <LangText ko="종합 평점" zh="综合评分" />
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="font-extrabold text-amber-500 text-[52px]">
                {summary.overall_score?.toFixed(1) ?? avg('overall_score')}
              </div>
              <div>
                <StarDisplay score={Math.round(summary.overall_score ?? parseFloat(avg('overall_score')))} />
                <div className="text-xs mt-1 text-[rgba(255,255,255,0.5)]">
                  {ratings.length > 0 ? `${ratings.length}건 평가` : '평가 없음'}
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'quality_score', label: '품질', labelZh: '品质', icon: '🏆' },
                { key: 'delivery_score', label: '납기', labelZh: '交期', icon: '🚚' },
                { key: 'communication_score', label: '소통', labelZh: '沟通', icon: '💬' },
              ].map((item) => (
                <div key={item.key} className="rounded-xl p-3 text-center bg-[rgba(255,255,255,0.08)]">
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-xl font-bold text-amber-500">
                    {summary[item.key]?.toFixed(1) ?? avg(item.key)}
                  </div>
                  <div className="text-[10px] mt-0.5 text-[rgba(255,255,255,0.5)]">
                    <LangText ko={item.label} zh={item.labelZh} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {loading && (
          <div className="text-center text-[var(--text-tertiary)] py-[60px] px-6">
            <div className="text-[32px] mb-3">⏳</div>
            <LangText ko="불러오는 중…" zh="加载中…" />
          </div>
        )}


        {!loading && ratings.length === 0 && (
          <div className="text-center bg-[var(--bg-base)] rounded-[20px] py-[60px] px-6 border border-[var(--border-light)]">
            <div className="text-5xl mb-4">⭐</div>
            <div className="text-base font-bold text-[var(--text-primary)] mb-2">
              <LangText ko="아직 평가가 없습니다" zh="暂无评价记录" />
            </div>
            <p className="text-[13px] text-[var(--text-tertiary)] leading-[1.6]">
              <LangText
                ko="주문 완료 후 MD가 품질, 납기, 소통 항목을 평가합니다."
                zh="订单完成后，MD将对品质、交期、沟通进行评分。"
              />
            </p>
          </div>
        )}


        {!loading && ratings.length > 0 && (
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] mb-3">
              <LangText ko="평가 내역" zh="评价记录" />
            </div>
            <div className="flex flex-col gap-3">
              {ratings.map((r) => (
                <div key={r.id} className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-light)] py-[18px] px-5 shadow-[var(--shadow-xs)]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {r.order?.order_no ?? '-'}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        {r.rated_by?.name_ko ?? 'MD'} · {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[18px] text-warning-500">★</span>
                      <span className="text-base font-bold text-[var(--text-primary)]">
                        {r.overall_score?.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 grid-cols-3" style={{ marginBottom: r.comment ? 10 : 0 }}>
                    {[
                      { key: 'quality_score', label: '품질', labelZh: '品质' },
                      { key: 'delivery_score', label: '납기', labelZh: '交期' },
                      { key: 'communication_score', label: '소통', labelZh: '沟通' },
                    ].map((item) => (
                      <div key={item.key} className="bg-[var(--bg-subtle)] rounded-lg p-2 text-center">
                        <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">
                          <LangText ko={item.label} zh={item.labelZh} />
                        </div>
                        <div className="text-sm font-bold text-amber-500">
                          {r[item.key]?.toFixed(1) ?? '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {r.comment && (
                    <div className="bg-[var(--bg-subtle)] rounded-[10px] text-xs text-[var(--text-secondary)] py-[10px] px-3 leading-normal">
                      "{r.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
