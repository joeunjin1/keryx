'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export default function MarketReportViewer() {
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
        .from('market_research_reports').select('*').eq('id', reportId).single();
      setReport(data);
      setLoading(false);
    }
    fetchReport();
  }, [reportId]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4 animate-pulse">📊</div><p className="text-gray-400">{t('보고서 불러오는 중...', '报告加载中...')}</p></div>
    </div>
  );

  if (!report || report.status === 'draft') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4">🔒</div><p className="text-gray-600 font-bold text-lg">{t('아직 준비 중인 보고서입니다', '报告尚在准备中')}</p><p className="text-gray-400 text-sm mt-2">{t('담당 MD가 보고서를 완성하면 열람하실 수 있습니다.', '负责人完成报告后即可查看。')}</p></div>
    </div>
  );

  const factories = report.factories || [];
  const risks = report.risks || {};
  const recommendations = report.recommendations || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 인쇄 버튼 */}
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50">{t('🖨️ PDF 저장', '🖨️ 保存PDF')}</button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 표지 */}
        {report.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.cover_image} alt={t('커버', '封面')} className="w-full h-48 object-cover rounded-3xl mb-6 shadow-sm" />
        )}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 rounded-3xl p-8 text-white mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-slate-900 text-sm">K</div>
              <span className="text-sm font-bold text-amber-300">KERYX</span>
            </div>
            <span className="text-xs text-blue-300 bg-blue-900/50 px-2 py-1 rounded-full">CONFIDENTIAL</span>
          </div>
          <div className="text-xs text-blue-300 mb-2">{t('시장조사 보고서 · Market Research Report', '市场调研报告')}</div>
          <h1 className="text-2xl font-black mb-3 leading-tight">{report.report_title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-blue-200">
            {report.buyer_company && <span>🏢 {report.buyer_company}</span>}
            {report.buyer_name && <span>👤 {report.buyer_name} 귀중</span>}
          </div>
          <div className="mt-4 pt-4 border-t border-blue-800 flex justify-between text-xs text-blue-400">
            <span>📅 {report.issued_at}</span>
            <span className="font-mono">{report.report_no}</span>
          </div>
        </div>

        {/* 핵심 요약 */}
        {report.summary && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">{t('📌 핵심 요약', '📌 核心总结')}</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.summary}</p>
          </div>
        )}

        {/* 시장 현황 */}
        {(report.market_trend || report.import_trend || report.production_regions) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">{t('📊 시장 현황 분석', '📊 市场现状分析')}</h2>
            {report.market_trend && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2">{t('🌏 시장 동향', '🌏 市场趋势')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{report.market_trend}</p>
              </div>
            )}
            {report.import_trend && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2">{t('🚢 한국 수입 동향', '🚢 韩国进口趋势')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{report.import_trend}</p>
              </div>
            )}
            {report.production_regions && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">{t('🗺️ 중국 산지 분포', '🗺️ 中国产地分布')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{report.production_regions}</p>
              </div>
            )}
          </div>
        )}

        {/* 추천 공장 */}
        {factories.filter((f: any) => f.name).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">🏭 추천 공장 {factories.filter((f: any) => f.name).length}곳</h2>
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
                    {idx === 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{t('⭐ 추천', '⭐ 推荐')}</span>}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 공장별 견적 비교 */}
        {factories.filter((f: any) => f.name && f.moq).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">{t('💰 공장별 견적 비교', '💰 工厂报价对比')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    {['공장명', 'MOQ', '단가', '리드타임', '결제조건'].map(h => (
                      <th key={h} className="border border-blue-100 px-3 py-2 text-left text-blue-700 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factories.filter((f: any) => f.name).map((f: any, i: number) => (
                    <tr key={i} className={i === 0 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                      <td className="border border-gray-200 px-3 py-2 font-medium">{i === 0 ? '⭐ ' : ''}{f.name}</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">{f.moq}</td>
                      <td className="border border-gray-200 px-3 py-2 text-center font-bold text-green-700">{f.price_range}</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">{f.lead_time}</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">{f.payment_terms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 샘플 안내 */}
        {factories.filter((f: any) => f.sample_cost || f.total_cost).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">{t('📦 샘플 진행 안내', '📦 样品进度说明')}</h2>
            <div className="space-y-3">
              {factories.filter((f: any) => f.name && (f.sample_cost || f.total_cost)).map((f: any, i: number) => (
                <div key={i} className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="font-bold text-gray-900 mb-2">{f.name}</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-gray-500">{t('샘플 제작비:', '样品费用：')} </span><span className="font-bold">{f.sample_cost || '-'}</span></div>
                    <div><span className="text-gray-500">{t('배송비:', '运费：')} </span><span className="font-bold">{f.shipping_cost || '-'}</span></div>
                    <div><span className="text-gray-500">{t('총 청구:', '总计费用：')} </span><span className="font-black text-blue-700 text-sm">{f.total_cost || '-'}</span></div>
                  </div>
                  {f.bulk_deduction && <p className="text-xs text-green-700 mt-2">✅ {f.bulk_deduction}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 리스크 체크 */}
        {(risks.ip || risks.customs || risks.quality || risks.delivery || report.risk_notes) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">{t('⚠️ 리스크 체크', '⚠️ 风险检查')}</h2>
            {report.risk_notes ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.risk_notes}</p>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'ip', icon: '🔐', label: 'IP 이슈', color: 'red' },
                  { key: 'customs', icon: '🛃', label: '통관 이슈', color: 'orange' },
                  { key: 'quality', icon: '🔍', label: '품질 이슈', color: 'yellow' },
                  { key: 'delivery', icon: '🚚', label: '납기 이슈', color: 'blue' },
                ].filter(r => risks[r.key]).map(r => (
                  <div key={r.key} className={`rounded-xl p-4 border bg-${r.color}-50 border-${r.color}-200`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{r.icon}</span>
                      <span className={`text-sm font-bold text-${r.color}-800`}>{r.label}</span>
                      {risks[`${r.key}_level`] && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-auto ${risks[`${r.key}_level`] === '높음' ? 'bg-red-100 text-red-700' : risks[`${r.key}_level`] === '중간' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {risks[`${r.key}_level`]}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs text-${r.color}-700`}>{risks[r.key]}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 추천 상품 */}
        {recommendations.filter((r: any) => r.name).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">{t('🛍️ 추천 유사 상품', '🛍️ 推荐相似商品')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {recommendations.filter((r: any) => r.name).map((rec: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  {rec.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rec.image} alt={rec.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                  )}
                  <div className="font-bold text-gray-900 text-sm mb-1">{rec.name}</div>
                  {rec.price_range && <div className="text-xs text-green-700 font-medium mb-1">{rec.price_range}</div>}
                  {rec.description && <p className="text-xs text-gray-500">{rec.description}</p>}
                </div>
              ))}
            </div>
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
