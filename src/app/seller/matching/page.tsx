'use client'

import { useState, useEffect } from 'react'
import { useLangContext } from '@/components/layout/LangContext';
import { createClient } from '@/lib/supabase/client'
import FactoryMatchingModal from '@/components/matching/FactoryMatchingModal'

interface MatchingRequest {
  id: string
  company_name: string
  product_desc: string
  product_name?: string
  product_category: string | null
  business_type: string | null
  status: string
  is_urgent: boolean
  admin_note: string | null
  md_note: string | null
  matched_factories: MatchedFactory[]
  created_at: string
  updated_at: string
  final_factory_name?: string
  final_conclusion?: string
  report_sent_at?: string
}

interface MatchedFactory {
  factory_id: string
  factory_name: string
  factory_name_zh: string | null
  status: string
  match_score: number | null
  note: string | null
  recommended_at: string | null
}

interface FinalReport {
  id: string
  report_no: string
  status: string
  sent_at?: string
  section_summary?: Record<string, unknown>
  section_weights?: Array<{ key: string; score: number; pct: number }>
  section_basics?: Array<Record<string, unknown>>
  section_quotes?: Array<Record<string, unknown>>
  section_quality?: Array<Record<string, unknown>>
  section_certs?: Array<Record<string, unknown>>
  section_comm?: Array<Record<string, unknown>>
  section_risk?: Array<Record<string, unknown>>
  section_scores?: Array<{ factory: string; total: number; recommended?: boolean; rank?: number }>
  section_final?: { factory: string; conclusion: string; conditions: string; process: string }
  section_action?: Array<{ step: number; task: string; owner: string; duration: string; output: string }>
}

const STATUS_INFO: Record<string, { label: string; labelZh: string; color: string; icon: string; desc: string }> = {
  pending:   { label: '접수 대기', labelZh: '等待受理', color: 'bg-gray-100 text-gray-600', icon: '⏳', desc: '신청이 접수되었습니다. 담당 MD가 검토 예정입니다.' },
  reviewing: { label: '검토 중',   labelZh: '审核中',   color: 'bg-blue-100 text-blue-700',  icon: '🔍', desc: 'MD가 요청 내용을 검토하고 있습니다.' },
  matching:  { label: '매칭 진행', labelZh: '匹配进行中', color: 'bg-purple-100 text-purple-700', icon: '🔗', desc: '최적 공장을 탐색 중입니다.' },
  in_progress:{ label: '진행중',   labelZh: '进行中',   color: 'bg-indigo-100 text-indigo-700', icon: '⚙️', desc: 'MD가 공장을 평가하고 있습니다.' },
  replied:   { label: '결과 도착', labelZh: '结果已到', color: 'bg-amber-100 text-amber-700',  icon: '📋', desc: '매칭 결과 보고서가 도착했습니다!' },
  sample:    { label: '샘플 단계', labelZh: '样品阶段', color: 'bg-amber-100 text-amber-700',  icon: '📦', desc: '공장이 매칭되어 샘플 진행 중입니다.' },
  completed: { label: '완료',      labelZh: '已完成',   color: 'bg-green-100 text-green-700',  icon: '✅', desc: '매칭이 완료되었습니다.' },
  cancelled: { label: '취소',      labelZh: '已取消',   color: 'bg-red-100 text-red-600',      icon: '❌', desc: '매칭이 취소되었습니다.' },
}

const STEPS = ['pending', 'reviewing', 'matching', 'replied', 'completed']

const WEIGHT_LABELS: Record<string, string> = {
  price: '가격', quality: '품질', delivery: '납기', stability: '안정성', communication: '소통', certification: '인증'
}

export default function SellerMatchingPage() {
  const { lang, setLang } = useLangContext();
  const supabase = createClient()
  const [requests, setRequests] = useState<MatchingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedReq, setSelectedReq] = useState<MatchingRequest | null>(null)
  const [viewReport, setViewReport] = useState<FinalReport | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportTab, setReportTab] = useState<'summary' | 'scores' | 'action'>('summary')
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)

  const t = (ko: string, zh: string) => lang === 'ko' ? ko : zh

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/matching/requests?my=true')
      const json = await res.json()
      setRequests(json.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setCurrentUserId(data.user.id)
    })
  }, [])

  const getStepIndex = (status: string) => STEPS.indexOf(status)

  async function openReport(req: MatchingRequest) {
    setLoadingReport(true)
    setViewReport(null)
    const { data } = await supabase
      .from('factory_matching_final_reports')
      .select('*')
      .eq('request_id', req.id)
      .single()
    setViewReport(data)
    setLoadingReport(false)
    setReportTab('summary')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {t('🔗 공장 매칭 현황', '🔗 工厂匹配状态')}
            </h1>
            <p className="text-gray-500 text-sm">
              {t('신청한 공장 매칭 요청의 진행 상황을 확인하세요', '查看您申请的工厂匹配进度')}
            </p>
          </div>
          <div className="flex gap-2">
                        <button onClick={() => setShowModal(true)}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md">
              {t('+ 새 매칭 신청', '+ 新建匹配申请')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{t('로딩 중...', '加载中...')}</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔗</span>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {t('아직 매칭 신청이 없습니다', '暂无匹配申请')}
            </h3>
            <p className="text-gray-500 mb-6">
              {t('원하시는 제품의 중국 공장을 찾아드립니다', '我们为您寻找中国工厂')}
            </p>
            <button onClick={() => setShowModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg">
              {t('🔗 공장 매칭 신청하기', '🔗 申请工厂匹配')}
            </button>
            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                { icon: '🏭', title: t('5,200+ 검증 공장', '5,200+认证工厂'), desc: t('직접 검증된 중국 공장 네트워크', '直接验证的中国工厂网络') },
                { icon: '👨‍💼', title: t('전담 MD 배정', '专属MD分配'), desc: t('경험 많은 전문가가 직접 매칭', '经验丰富的专家直接匹配') },
                { icon: '⚡', title: t('평균 3일 매칭', '平均3天匹配'), desc: t('빠르고 정확한 공장 추천', '快速精准的工厂推荐') },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="text-3xl mb-2">{icon}</div>
                  <p className="font-bold text-gray-800 text-sm">{title}</p>
                  <p className="text-gray-500 text-xs mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const statusInfo = STATUS_INFO[req.status] || STATUS_INFO.pending
              const stepIdx = getStepIndex(req.status)
              const isActive = req.status !== 'cancelled' && req.status !== 'completed'
              const hasReport = req.status === 'replied' || req.status === 'completed' || !!req.report_sent_at

              return (
                <div key={req.id}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${hasReport ? 'border-amber-200' : 'border-gray-100'}`}>
                  {/* 결과 도착 배너 */}
                  {hasReport && (
                    <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2 flex items-center justify-between">
                      <span className="text-white font-bold text-sm">📋 {t('매칭 결과 보고서가 도착했습니다!', '匹配结果报告已到达！')}</span>
                      <button
                        onClick={() => openReport(req)}
                        className="bg-white text-amber-700 text-xs font-bold px-3 py-1 rounded-full hover:bg-amber-50">
                        {t('결과 보기', '查看结果')}
                      </button>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                            {statusInfo.icon} {lang === 'ko' ? statusInfo.label : statusInfo.labelZh}
                          </span>
                          {req.is_urgent && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 animate-pulse">
                              🔥 {t('긴급', '紧急')}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-800">{req.product_name || req.product_desc?.slice(0, 40)}</p>
                        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{req.product_desc}</p>
                        <div className="flex gap-2 mt-2">
                          {req.product_category && (
                            <span className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full">{req.product_category}</span>
                          )}
                          {req.business_type && (
                            <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">{req.business_type}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setSelectedReq(req)}
                        className="ml-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors flex-shrink-0">
                        {t('상세 보기', '查看详情')}
                      </button>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  {req.status !== 'cancelled' && (
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        {STEPS.map((step, idx) => {
                          const info = STATUS_INFO[step]
                          const isDone = idx < stepIdx
                          const isCurrent = idx === stepIdx
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                                  ${isDone ? 'bg-purple-600 text-white' : isCurrent ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-400' : 'bg-gray-100 text-gray-400'}`}>
                                  {isDone ? '✓' : info.icon}
                                </div>
                                <p className={`text-xs mt-1 text-center w-14 ${isCurrent ? 'text-purple-700 font-bold' : isDone ? 'text-purple-500' : 'text-gray-400'}`}>
                                  {lang === 'ko' ? info.label : info.labelZh}
                                </p>
                              </div>
                              {idx < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 mb-4 ${idx < stepIdx ? 'bg-purple-400' : 'bg-gray-200'}`} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">{statusInfo.desc}</p>
                    </div>
                  )}

                  {/* 최종 추천 공장 표시 */}
                  {req.final_factory_name && (
                    <div className="px-5 pb-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-green-600">✅ {t('최종 추천 공장', '最终推荐工厂')}</p>
                          <p className="font-bold text-green-800 mt-0.5">{req.final_factory_name}</p>
                        </div>
                        {hasReport && (
                          <button onClick={() => openReport(req)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                            {t('보고서 보기', '查看报告')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MD Note */}
                  {req.md_note && (
                    <div className="px-5 pb-4">
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <p className="text-xs font-bold text-blue-600 mb-1">👨‍💼 {t('MD 메시지', 'MD消息')}</p>
                        <p className="text-sm text-blue-800">{req.md_note}</p>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-5 pb-4 flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                      {t('신청일', '申请日')}: {new Date(req.created_at).toLocaleDateString('ko-KR')}
                    </p>
                    {isActive && (
                      <p className="text-xs text-gray-400">
                        {t('최근 업데이트', '最近更新')}: {new Date(req.updated_at).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white text-center">
              <p className="font-bold text-lg mb-1">{t('새 제품 공장을 찾고 계신가요?', '正在寻找新产品工厂？')}</p>
              <p className="text-purple-200 text-sm mb-4">{t('추가 매칭 신청을 하실 수 있습니다', '您可以提交额外的匹配申请')}</p>
              <button onClick={() => setShowModal(true)}
                className="px-6 py-2 bg-white text-purple-700 rounded-xl font-bold hover:bg-purple-50 transition-colors">
                {t('+ 추가 신청하기', '+ 追加申请')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-5 text-white flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-lg">{t('매칭 신청 상세', '匹配申请详情')}</h3>
              <button onClick={() => setSelectedReq(null)} className="text-white/70 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-600 mb-2">{t('요청 제품', '请求产品')}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReq.product_desc}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{t('상태', '状态')}</p>
                  <p className="font-bold text-sm">{STATUS_INFO[selectedReq.status]?.label}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{t('신청일', '申请日')}</p>
                  <p className="font-bold text-sm">{new Date(selectedReq.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
              {selectedReq.admin_note && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-bold text-amber-600 mb-1">{t('관리자 안내', '管理员提示')}</p>
                  <p className="text-sm">{selectedReq.admin_note}</p>
                </div>
              )}
              {selectedReq.md_note && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 mb-1">{t('MD 메시지', 'MD消息')}</p>
                  <p className="text-sm">{selectedReq.md_note}</p>
                </div>
              )}
              {(selectedReq.status === 'replied' || selectedReq.status === 'completed') && (
                <button
                  onClick={() => { setSelectedReq(null); openReport(selectedReq) }}
                  className="w-full py-3 bg-amber-400 text-gray-900 rounded-xl font-bold hover:bg-amber-300">
                  📋 {t('매칭 결과 보고서 보기', '查看匹配结果报告')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 보고서 전체 보기 모달 */}
      {(viewReport || loadingReport) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">📋 {t('공장 매칭 결과 보고서', '工厂匹配结果报告')}</h3>
                {viewReport && <p className="text-amber-100 text-xs mt-0.5">{viewReport.report_no}</p>}
              </div>
              <button onClick={() => setViewReport(null)} className="text-white/70 hover:text-white text-2xl">×</button>
            </div>

            {loadingReport ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">보고서 로딩 중...</p>
                </div>
              </div>
            ) : !viewReport ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <p>보고서를 찾을 수 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 탭 */}
                <div className="flex border-b bg-gray-50">
                  {([
                    ['summary', t('요약 & 추천', '摘要&推荐')],
                    ['scores', t('공장 점수', '工厂评分')],
                    ['action', t('다음 단계', '下一步')],
                  ] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setReportTab(key)}
                      className={`flex-1 py-3 text-sm font-semibold transition-colors ${reportTab === key ? 'border-b-2 border-amber-500 text-amber-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* 요약 탭 */}
                  {reportTab === 'summary' && (
                    <>
                      {viewReport.section_final && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <h4 className="font-bold text-green-800 mb-3">✅ {t('최종 추천 공장', '最终推荐工厂')}</h4>
                          <div className="text-2xl font-bold text-green-700 mb-2">{viewReport.section_final.factory}</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{viewReport.section_final.conclusion}</div>
                        </div>
                      )}

                      {viewReport.section_weights && viewReport.section_weights.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-600 mb-2">{t('고객 우선순위 반영', '客户优先级')}</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {viewReport.section_weights.map(w => (
                              <div key={w.key} className="bg-gray-50 rounded-lg p-2 text-center">
                                <div className="text-xs text-gray-400">{WEIGHT_LABELS[w.key] || w.key}</div>
                                <div className="font-bold text-amber-600">{w.pct}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {viewReport.section_quotes && viewReport.section_quotes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-600 mb-2">{t('견적 비교', '报价比较')}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  {[t('공장명','工厂'), t('1000개','1000个'), t('MOQ','MOQ'), t('납기','交期')].map(h => (
                                    <th key={h} className="text-left py-2 pr-3 text-gray-400 font-medium">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {viewReport.section_quotes.map((q, i) => (
                                  <tr key={i} className="border-b border-gray-100">
                                    <td className="py-2 pr-3 font-medium">{q.name as string}</td>
                                    <td className="py-2 pr-3 text-amber-600 font-bold">{q.quote_1000 as string || '-'}</td>
                                    <td className="py-2 pr-3 text-gray-500">{q.moq as string || '-'}</td>
                                    <td className="py-2 text-gray-500">{q.lead_time ? `${q.lead_time}일` : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {viewReport.section_certs && viewReport.section_certs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-600 mb-2">{t('인증 현황', '认证情况')}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  {[t('공장명','工厂'), 'KC', 'CE', 'FDA', 'EN71', 'IP'].map(h => (
                                    <th key={h} className="text-left py-2 pr-3 text-gray-400 font-medium">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {viewReport.section_certs.map((c, i) => (
                                  <tr key={i} className="border-b border-gray-100">
                                    <td className="py-2 pr-3 font-medium">{c.name as string}</td>
                                    {(['kc','ce','fda','en71','ip'] as const).map(cert => (
                                      <td key={cert} className="py-2 pr-3">
                                        {(c as Record<string,boolean>)[cert] ? <span className="text-green-500">✓</span> : <span className="text-gray-300">-</span>}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {viewReport.section_final?.conditions && (
                        <div className="bg-blue-50 rounded-xl p-4">
                          <h4 className="text-xs font-bold text-blue-600 mb-2">{t('계약 조건', '合同条件')}</h4>
                          <p className="text-sm text-blue-800">{viewReport.section_final.conditions}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* 점수 탭 */}
                  {reportTab === 'scores' && (
                    <>
                      {viewReport.section_scores && viewReport.section_scores.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-gray-600">{t('공장별 종합 점수', '工厂综合评分')}</h4>
                          {[...viewReport.section_scores]
                            .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
                            .map((s, i) => (
                              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                    <span className="font-bold">{s.factory}</span>
                                    {s.recommended && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('추천','推荐')}</span>}
                                  </div>
                                  <span className={`text-3xl font-bold ${(s.total ?? 0) >= 80 ? 'text-green-600' : (s.total ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {s.total}
                                  </span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${(s.total ?? 0) >= 80 ? 'bg-green-500' : (s.total ?? 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${s.total}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                  <span>0</span>
                                  <span className={`font-medium ${(s.total ?? 0) >= 80 ? 'text-green-600' : (s.total ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {(s.total ?? 0) >= 90 ? t('즉시 추천','立即推荐') :
                                     (s.total ?? 0) >= 80 ? t('추천 가능','可推荐') :
                                     (s.total ?? 0) >= 70 ? t('조건부 추천','有条件推荐') :
                                     (s.total ?? 0) >= 60 ? t('리스크 있음','有风险') : t('보류','暂缓')}
                                  </span>
                                  <span>100</span>
                                </div>
                              </div>
                            ))}
                          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 flex flex-wrap gap-3">
                            <span>90~100: {t('즉시 추천','立即推荐')}</span>
                            <span>80~89: {t('추천 가능','可推荐')}</span>
                            <span>70~79: {t('조건부','有条件')}</span>
                            <span>60~69: {t('리스크','有风险')}</span>
                            <span>{'<60'}: {t('보류','暂缓')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <p>{t('점수 데이터가 없습니다','暂无评分数据')}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* 다음 단계 탭 */}
                  {reportTab === 'action' && (
                    <>
                      {viewReport.section_final?.process && (
                        <div className="bg-purple-50 rounded-xl p-4 mb-4">
                          <h4 className="text-xs font-bold text-purple-600 mb-2">{t('진행 프로세스','进行流程')}</h4>
                          <p className="text-sm text-purple-800">{viewReport.section_final.process}</p>
                        </div>
                      )}
                      {viewReport.section_action && viewReport.section_action.length > 0 && (
                        <div className="space-y-2">
                          {viewReport.section_action.map(step => (
                            <div key={step.step} className="flex gap-3 bg-white border border-gray-200 rounded-xl p-3">
                              <div className="w-7 h-7 bg-amber-400 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {step.step}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{step.task}</span>
                                  <span className="text-xs text-gray-400">{step.duration}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">{step.owner}</span>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-xs text-amber-600">{step.output}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                        <h4 className="font-bold text-amber-800 mb-2">{t('다음 단계 문의','下一步咨询')}</h4>
                        <p className="text-sm text-amber-700">{t('샘플 진행을 원하시면 담당 MD에게 연락해 주세요.','如需进行样品，请联系您的MD。')}</p>
                        <a href="mailto:md@keryx.co.kr" className="mt-2 inline-block text-xs bg-amber-400 text-gray-900 font-bold px-4 py-2 rounded-lg hover:bg-amber-300">
                          {t('MD에게 연락하기','联系MD')} →
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Matching Modal */}
      <FactoryMatchingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); fetchRequests() }}
        lang={lang}
        userId={currentUserId}
      />
    </div>
  )
}
