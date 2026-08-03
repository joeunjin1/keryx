'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export default function SampleReportViewer() {
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
        .from('sample_reports').select('*').eq('id', reportId).single();
      setReport(data);
      setLoading(false);
    }
    fetchReport();
  }, [reportId]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4 animate-pulse">📦</div><p className="text-gray-400">{t('보고서 불러오는 중...', '报告加载中...')}</p></div>
    </div>
  );

  if (!report || report.status === 'draft') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4">🔒</div><p className="text-gray-600 font-bold text-lg">{t('아직 준비 중인 보고서입니다', '报告尚在准备中')}</p><p className="text-gray-400 text-sm mt-2">{t('담당 MD가 보고서를 완성하면 열람하실 수 있습니다.', '负责人完成报告后即可查看。')}</p></div>
    </div>
  );

  const quotes = report.quotes || [];
  const spec = report.spec || {};
  const qc = report.quality_check || {};

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
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 rounded-3xl p-8 text-white mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center font-black text-slate-900 text-sm">K</div>
              <span className="text-sm font-bold text-amber-300">KERYX</span>
            </div>
            <span className="text-xs text-teal-300 bg-teal-900/50 px-2 py-1 rounded-full">CONFIDENTIAL</span>
          </div>
          <div className="text-xs text-teal-300 mb-2">{t('샘플제작 보고서 · Sample Production Report', '样品制作报告')}</div>
          <h1 className="text-2xl font-black mb-3 leading-tight">{report.report_title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-teal-200">
            {report.buyer_company && <span>🏢 {report.buyer_company}</span>}
            {report.buyer_name && <span>👤 {report.buyer_name} 귀중</span>}
          </div>
          <div className="mt-4 pt-4 border-t border-teal-800 flex justify-between text-xs text-teal-400">
            <span>📅 {report.issued_at}</span>
            <span className="font-mono">{report.report_no}</span>
          </div>
        </div>

        {/* 참고 이미지 */}
        {report.reference_photos?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-3">{t('🖼️ 참고 이미지', '🖼️ 参考图片')}</h2>
            <div className="flex gap-2 overflow-x-auto">
              {report.reference_photos.map((p: string, i: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="w-28 h-28 object-cover rounded-xl flex-shrink-0" />
              ))}
            </div>
          </div>
        )}

        {/* 샘플 사양 */}
        {spec.item_name && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4">{t('🎨 샘플 사양', '🎨 样品规格')}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['품목명', spec.item_name], ['소재', spec.material], ['사이즈', spec.size], ['색상', spec.color], ['인쇄/자수', spec.printing_method], ['포장', spec.packaging]].map(([k, v]) => v ? (
                <div key={k} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-0.5">{k}</div>
                  <div className="font-medium text-gray-900">{v}</div>
                </div>
              ) : null)}
            </div>
            {spec.special_notes && (
              <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="text-xs font-bold text-blue-700 mb-1">{t('📌 특이사항', '📌 注意事项')}</div>
                <p className="text-xs text-blue-700 whitespace-pre-line">{spec.special_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* 공장 견적 */}
        {quotes.filter((q: any) => q.factory_name).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4">{t('🏭 공장별 샘플 견적', '🏭 工厂样品报价')}</h2>
            <div className="space-y-5">
              {quotes.filter((q: any) => q.factory_name).map((q: any, idx: number) => (
                <div key={idx} className={`rounded-2xl border p-5 ${idx === report.recommended_quote_idx ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{idx + 1}</span>
                    <div>
                      <div className="font-black text-gray-900">{q.factory_name}</div>
                      {q.factory_name_zh && <div className="text-xs text-gray-500">{q.factory_name_zh}</div>}
                    </div>
                    {idx === report.recommended_quote_idx && <span className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{t('⭐ 추천', '⭐ 推荐')}</span>}
                  </div>

                  {q.factory_cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={q.factory_cover} alt={q.factory_name} className="w-full h-32 object-cover rounded-xl mb-3" />
                  )}
                  {q.sample_photos?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-bold text-gray-600 mb-2">{t('📸 샘플 사진', '📸 样品照片')}</div>
                      <div className="flex gap-2 overflow-x-auto">
                        {q.sample_photos.map((p: string, i: number) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={p} alt="" className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-3">
                    <div className="text-xs font-bold text-amber-800 mb-2">{t('💰 샘플 비용', '💰 样品费用')}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">{t('제작비:', '制作费用：')} </span><span className="font-bold">{q.sample_cost || '-'}</span></div>
                      <div><span className="text-gray-500">{t('배송비:', '运费：')} </span><span className="font-bold">{q.shipping_cost || '-'}</span></div>
                      <div><span className="text-gray-500">{t('총 청구:', '总计费用：')} </span><span className="font-black text-blue-700">{q.total_cost || '-'}</span></div>
                    </div>
                    {q.bulk_deduction && <p className="text-xs text-green-700 mt-2">✅ {q.bulk_deduction}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    {q.production_days && <div><span className="text-gray-400">{t('제작기간:', '制作周期：')} </span><span className="font-medium">{q.production_days}</span></div>}
                    {q.bulk_moq && <div><span className="text-gray-400">{t('본발주 MOQ:', '本订单最小订量：')} </span><span className="font-medium">{q.bulk_moq}</span></div>}
                    {q.bulk_price && <div><span className="text-gray-400">{t('본발주 단가:', '本订单单价：')} </span><span className="font-medium text-green-700">{q.bulk_price}</span></div>}
                    {q.bulk_lead_time && <div><span className="text-gray-400">{t('리드타임:', '交期：')} </span><span className="font-medium">{q.bulk_lead_time}</span></div>}
                  </div>

                  {q.strengths && <p className="text-xs text-green-700 mb-1">✅ {q.strengths}</p>}
                  {q.weaknesses && <p className="text-xs text-red-600">⚠️ {q.weaknesses}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 품질 검수 */}
        {(qc.appearance || qc.overall) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-4">{t('🔍 품질 검수 결과', '🔍 质量检验结果')}</h2>
            <div className="space-y-3">
              {[['외관/마감', qc.appearance], ['소재/촉감', qc.material_feel], ['인쇄/자수', qc.printing], ['내구성', qc.durability], ['종합 평가', qc.overall]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs font-bold text-gray-600 mb-1">🔎 {k}</div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 납기 일정 */}
        {report.delivery_timeline && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
            <h2 className="text-base font-black text-gray-900 mb-3">{t('📅 납기 일정', '📅 交期计划')}</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{report.delivery_timeline}</p>
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
