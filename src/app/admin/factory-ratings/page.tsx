import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공장 평가 관리',
  description: '바이어가 제출한 공장 평가를 검토하고 관리합니다.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

function ratingColor(r: number): string {
  if (r >= 4.5) return '#10b981';
  if (r >= 3.5) return '#4f46e5';
  if (r >= 2.5) return '#f59e0b';
  return '#ef4444';
}

export default async function AdminFactoryRatingsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: me } = await supabase
    .from('internal_users').select('role, name_ko').eq('user_id', user.id).single() as { data: any; error: any };
  if (!me || me.role !== 'admin') redirect('/admin');

  const { data: rows } = await supabase
    .from('factory_rating_breakdown').select('*').order('rating') as { data: any; error: any };
  const list = (rows ?? []) as any[];

  const avgRating = list.length > 0 ? list.reduce((s: number, f: any) => s + Number(f.rating ?? 0), 0) / list.length : 0;
  const excellentCount = list.filter((f: any) => Number(f.rating ?? 0) >= 4.5).length;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[var(--text-primary)] mb-[2px]">
          <LangText ko="공장 평점 현황" zh="工厂评分概况" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          <LangText ko={`총 ${list.length}개 공장`} zh={`共 ${list.length} 家工厂`} />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-[20px]">
        <div className="bg-[var(--bg-base)] rounded-[var(--radius-lg)] border border-[var(--border-light)] p-4 text-center">
          <div className="text-[28px] font-extrabold" style={{ color: ratingColor(avgRating) }}>⭐ {avgRating.toFixed(2)}</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1"><LangText ko="평균 평점" zh="平均评分" />
              </div>
        </div>
        <div className="bg-[var(--bg-base)] rounded-[var(--radius-lg)] border border-[var(--border-light)] p-4 text-center">
          <div className="text-[28px] font-extrabold text-[#10b981]">{excellentCount}</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1"><LangText ko="우수 공장 (4.5+)" zh="优秀工厂 (4.5+)" />
              </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 px-6 bg-[var(--bg-base)] rounded-[var(--radius-lg)] border border-[var(--border-light)]">
          <div className="text-[40px] mb-3">⭐</div>
          <div className="text-sm text-[var(--text-secondary)]">
            <LangText ko="평점 데이터가 없습니다" zh="没有评分数据" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((f: any) => {
            const rating = Number(f.rating ?? 0);
            const color = ratingColor(rating);
            const onTimeRate = f.completed_orders > 0 ? (f.on_time_orders / f.completed_orders * 100) : 0;
            const passRate = f.total_inspections > 0 ? (f.passed_inspections / f.total_inspections * 100) : 0;
            return (
              <div key={f.factory_id} className="bg-[var(--bg-base)] rounded-[var(--radius-lg)] border border-[var(--border-light)] py-[14px] px-4 shadow-[var(--shadow-xs)]" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="flex items-center justify-between mb-[10px]">
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{f.company_name}
              </div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">{f.factory_code}
              </div>
                  </div>
                  <div className="text-[16px] font-extrabold py-1 px-3 rounded-full" style={{ background: `${color}20`, color }}>
                    ⭐ {f.rating != null ? Number(f.rating).toFixed(2) : '-'}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div className="text-center bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-2">
                    <div className="text-sm font-bold text-[var(--text-primary)]">{f.completed_orders ?? 0}
              </div>
                    <div className="text-[10px] text-[var(--text-tertiary)]"><LangText ko="완료" zh="完成" />
              </div>
                  </div>
                  <div className="text-center bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-2">
                    <div className="text-sm font-bold" style={{ color: onTimeRate >= 90 ? '#10b981' : onTimeRate >= 70 ? '#f59e0b' : '#ef4444' }}>
                      {f.completed_orders > 0 ? `${onTimeRate.toFixed(0)}%` : '-'}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)]"><LangText ko="납기율" zh="准时率" />
              </div>
                  </div>
                  <div className="text-center bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-2">
                    <div className="text-sm font-bold" style={{ color: passRate >= 95 ? '#10b981' : passRate >= 80 ? '#f59e0b' : '#ef4444' }}>
                      {f.total_inspections > 0 ? `${passRate.toFixed(0)}%` : '-'}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)]"><LangText ko="합격률" zh="合格率" />
              </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-[20px] flex flex-col gap-[6px]">
        {[
          { label: '납기율 기준', labelZh: '准时率标准', desc: '≥90% 우수 · 70~90% 보통 · <70% 개선 필요', descZh: '≥90% 优秀 · 70~90% 一般 · <70% 需改善' },
          { label: '검수 합격률 기준', labelZh: '合格率标准', desc: '≥95% 우수 · 80~95% 보통 · <80% 개선 필요', descZh: '≥95% 优秀 · 80~95% 一般 · <80% 需改善' },
          { label: '평점 기준', labelZh: '评分标准', desc: '≥4.5 우수 · 3.5~4.5 신뢰 · 2.5~3.5 주의 · <2.5 위험', descZh: '≥4.5 优秀 · 3.5~4.5 可信 · 2.5~3.5 注意 · <2.5 危险' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] py-[10px] px-3">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-[2px]">
              <LangText ko={item.label} zh={item.labelZh} />
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              <LangText ko={item.desc} zh={item.descZh} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
