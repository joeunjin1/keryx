'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export default function FactoryReportViewer() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const params = useParams();
  const supabase = createClient();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      const { data } = await supabase
        .from('factory_match_reports').select('*').eq('id', reportId).single();
      setReport(data);
      setLoading(false);
    }
    fetchReport();
  }, [reportId]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4 animate-pulse">🏭</div><p className="text-gray-400">{t('보고서 불러오는 중...', '报告加载中...')}</p></div>
    </div>
  );

  if (!report || report.status === 'draft') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4">🔒</div><p className="text-gray-600 font-bold text-lg">{t('아직 준비 중인 보고서입니다', '报告尚在准备中')}</p><p className="text-gray-400 text-sm mt-2">{t('담당 MD가 보고서를 완성하면 열람하실 수 있습니다.', '负责人完成报告后即可查看。')}</p></div>
    </div>
  );

  const factories = report.factories || [];
  const req = report.buyer_requirements || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50">{t('🖨️ PDF 저장', '🖨️ 保存PDF')}</button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 표지 */}
        {report.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.cover_image} alt={t('커버', '封面')} className="w-full h-48 object-cover rounded-3xl mb-6 shadow-sm" />
        )}
        <div className="bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 rounded-3xl p-8 text-white mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-slate-900 text-sm">K</div>
              <span className="text-sm font-bold text-amber-300">KERYX</span>
            </div>
            <span className="text-xs text-orange-300 bg-orange-900/50 px-2 py-1 rounded-full">CONFIDENTIAL</span>
          </div>
          <div className="text-xs text-orange-300 mb-2">{t('공장매칭 보고서 · Factory Matching Report', '工厂匹配报告')}</div>
          <h1 className="text-2xl font-black mb-3 leading-tight">{report.report_title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-orange-200">
            {report.buyer_company && <span>🏢 {report.buyer_company}</span>}
            {report.buyer_name && <span>👤 {report.buyer_name} 귀중</span>}
          </div>
          <div className="mt-4 pt-4 border-t border-orange-800 flex justify-between text-xs text-orange-400">
            <span>📅 {report.issued_at}</span>
            <span className="font-mono">{report.report_no}</span>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { n: factories.filter((f: any) => f.name).length, l: '매칭 공장', c: 'text-orange-600' },
            { n: factories.filter((f: any) => f.verified).length, l: '영업 확인', c: 'text-green-600' },
            { n: factories.filter((f: any) => f.kc_status === '보유').length, l: 'KC 인증', c: 'text-blue-600' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
              <div className={`text-3xl font-black ${item.c}`}>{item.n}</div>
              <div className="text-xs text-gray-400 mt-1">{item.l}</div>
            </div>
          ))}
        </div>

        {/* 바이어 요구사항 */}
        {req.product_desc && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4">{t('📝 요구사항 확인', '📝 需求确认')}</h2>
            <div className="space-y-2 text-sm">
              {[['제품 설명', req.product_desc], ['목표 단가', req.target_price], ['목표 MOQ', req.target_moq], ['필수 인증', req.required_certs], ['납품 지역', req.delivery_region]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="flex gap-2">
                  <span className="text-gray-400 flex-shrink-0 w-20">{k}:</span>
                  <span className="font-medium text-gray-900">{v}</span>
                </div>
              ))}
              {req.special_requirements && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 mt-2">
                  <div className="text-xs font-bold text-blue-700 mb-1">{t('📌 특별 요구사항', '📌 特殊要求')}</div>
                  <p className="text-xs text-blue-700">{req.special_requirements}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 매칭 공장 */}
        {factories.filter((f: any) => f.name).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4">🏭 매칭 공장 {factories.filter((f: any) => f.name).length}곳</h2>
            <div className="space-y-5">
              {factories.filter((f: any) => f.name).map((factory: any, idx: number) => (
                <div key={idx} className={`rounded-2xl border p-5 ${idx === 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{idx + 1}</span>
                    <div className="flex-1">
                      <div className="font-black text-gray-900">{factory.name}</div>
                      {factory.name_zh && <div className="text-xs text-gray-500">{factory.name_zh}</div>}
                      <div className="text-xs text-gray-500 mt-0.5">📍 {factory.location}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-black ${factory.match_score >= 85 ? 'text-green-600' : factory.match_score >= 70 ? 'text-amber-600' : 'text-red-500'}`}>{factory.match_score}점</div>
                      <div className="text-xs text-gray-400">{t('매칭 점수', '匹配分数')}</div>
                    </div>
                  </div>

                  {factory.cover_photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={factory.cover_photo} alt={factory.name} className="w-full h-36 object-cover rounded-xl mb-3" />
                  )}
                  {factory.photos?.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {factory.photos.map((p: string, i: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={p} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                      ))}
                    </div>
                  )}

                  {factory.match_reason && (
                    <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 mb-3">
                      <div className="text-xs font-bold text-indigo-700 mb-1">{t('🎯 매칭 이유', '🎯 匹配理由')}</div>
                      <p className="text-xs text-indigo-700">{factory.match_reason}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    {factory.employee_count && <div><span className="text-gray-400">{t('직원 수:', '员工数：')} </span><span className="font-medium">{factory.employee_count}</span></div>}
                    {factory.monthly_capacity && <div><span className="text-gray-400">{t('생산 캐파:', '生产产能：')} </span><span className="font-medium">{factory.monthly_capacity}</span></div>}
                    {factory.moq && <div><span className="text-gray-400">MOQ: </span><span className="font-medium text-blue-700">{factory.moq}</span></div>}
                    {factory.price_range && <div><span className="text-gray-400">{t('단가:', '单价：')} </span><span className="font-medium text-green-700">{factory.price_range}</span></div>}
                    {factory.lead_time && <div><span className="text-gray-400">{t('리드타임:', '交期：')} </span><span className="font-medium">{factory.lead_time}</span></div>}
                    {factory.payment_terms && <div><span className="text-gray-400">{t('결제조건:', '付款条件：')} </span><span className="font-medium">{factory.payment_terms}</span></div>}
                  </div>

                  {factory.certifications?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {factory.certifications.map((c: string) => (
                        <span key={c} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{c}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {factory.verified && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('✅ 영업 확인', '✅ 营业确认')}</span>}
                    {factory.contacted && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t('📞 연락 완료', '📞 联系完成')}</span>}
                    {factory.sample_available && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t('📦 샘플 가능', '📦 可提供样品')}</span>}
                    {factory.custom_ip && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">{t('🎨 IP 제작 가능', '🎨 可制作IP')}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${factory.kc_status === '보유' ? 'bg-green-100 text-green-700' : factory.kc_status === '신청중' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>KC {factory.kc_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 비교 분석 */}
        {report.comparison_notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-3">{t('📊 MD 비교 분석', '📊 MD对比分析')}</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{report.comparison_notes}</p>
          </div>
        )}

        {/* 다음 단계 */}
        {report.next_steps && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-3">{t('🚀 다음 단계', '🚀 下一步')}</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{report.next_steps}</p>
          </div>
        )}

        {/* 주의사항 */}
        {report.risk_notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-3">{t('⚠️ 주의사항', '⚠️ 注意事项')}</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{report.risk_notes}</p>
          </div>
        )}

        {/* 푸터 */}
        <div className="bg-slate-900 rounded-2xl p-6 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center font-black text-slate-900 text-xs">K</div>
            <span className="font-black text-amber-300">KERYX</span>
          </div>
          <p className="text-xs text-slate-400 mb-1">{t('본 보고서는 KERYX가 제공하는 기밀 자료입니다.', '本报告为KERYX提供的机密资料。')}</p>
          <p className="text-xs text-slate-500">{t('문의: 담당 MD에게 연락 주세요', '咨询：请联系负责人')}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
