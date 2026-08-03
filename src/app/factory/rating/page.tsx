import type { Metadata } from 'next';
export const metadata: Metadata = { title: '评价现况 | 工厂门户', description: '查看买家和MD对您工厂的评价。' };

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

export default async function FactoryRatingPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=factory');

  const { data: factory } = await supabase
    .from('factories')
    .select('id, name_ko, name_zh, rating_avg, rating_count')
    .eq('shared_login_user_id', user.id)
    .single() as { data: any; error: any };

  if (!factory) {
    return (
      <div className="p-6 text-center py-16">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-500 text-sm"><LangText ko="공장 정보를 불러올 수 없습니다." zh="无法加载工厂信息。" /></p>
      </div>
    );
  }

  // MD 평가 목록 조회
  const { data: evals } = await supabase
    .from('factory_matching_md_evaluations')
    .select('id, quality_score, comm_score, risk_score, total_score, md_comment, created_at')
    .eq('factory_id', factory.id)
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[]; error: any };

  const avgScore = evals && evals.length > 0
    ? (evals.reduce((sum: number, e: any) => sum + (e.total_score ?? 0), 0) / evals.length).toFixed(1)
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">
          <LangText ko="평가 현황" zh="评价现况" />
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          <LangText ko="MD와 바이어로부터 받은 평가를 확인하세요." zh="查看来自MD和买家的评价。" />
        </p>
      </div>

      {/* 종합 점수 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <div className="text-4xl font-black text-indigo-600 mb-1">{avgScore ?? '-'}</div>
          <div className="text-xs text-gray-500"><LangText ko="종합 평균 점수" zh="综合平均分" /></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <div className="text-4xl font-black text-emerald-600 mb-1">{evals?.length ?? 0}</div>
          <div className="text-xs text-gray-500"><LangText ko="총 평가 건수" zh="总评价次数" /></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <div className="text-4xl font-black text-amber-500 mb-1">{factory.rating_avg?.toFixed(1) ?? '-'}</div>
          <div className="text-xs text-gray-500"><LangText ko="공식 평점" zh="官方评分" /></div>
        </div>
      </div>

      {/* 평가 목록 */}
      {(!evals || evals.length === 0) ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500 text-sm"><LangText ko="아직 평가 내역이 없습니다." zh="暂无评价记录。" /></p>
        </div>
      ) : (
        <div className="space-y-3">
          {evals.map((e: any) => {
            const score = e.total_score ?? 0;
            const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
            return (
              <div key={e.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-black" style={{ color: scoreColor }}>{score}점</div>
                  <div className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: '품질', labelZh: '品质', val: e.quality_score },
                    { label: '소통', labelZh: '沟通', val: e.comm_score },
                    { label: '리스크', labelZh: '风险', val: e.risk_score },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500 mb-1"><LangText ko={item.label} zh={item.labelZh} /></div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${item.val ?? 0}%`, background: scoreColor }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700">{item.val ?? '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {e.md_comment && (
                  <blockquote className="text-sm text-gray-600 border-l-4 border-indigo-200 pl-3 italic">
                    {e.md_comment}
                  </blockquote>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
