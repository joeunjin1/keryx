'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLangContext } from '@/components/layout/LangContext'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────
interface MatchingRequest {
  id: string
  company_name: string
  contact_name: string
  phone: string | null
  email: string | null
  product_desc: string
  product_category: string | null
  moq: number | null
  target_price: number | null
  business_type: string | null
  target_markets: string[]
  has_ip_license: boolean
  ip_license_name: string | null
  priority_price: number
  priority_quality: number
  priority_delivery: number
  priority_stability: number
  quality_grade: string | null
  required_certs: string[]
  need_ip_audit: boolean
  selected_tier: string | null
  status: string
  assigned_md_id: string | null
  is_urgent: boolean
  is_standby: boolean
  admin_note: string | null
  md_note: string | null
  matched_factories: unknown[]
  created_at: string
  updated_at: string
}

interface TopItem {
  id: string
  name: string
  count: number
}
interface Stats {
  pending: number
  in_progress: number
  completed_this_week: number
  avg_match_days: number
  overdue: number
  top_factories?: TopItem[]
  top_buyers?: TopItem[]
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'pending',   label: '대기중',    labelZh: '待处理',  color: 'bg-gray-100 border-gray-300',   badge: 'bg-gray-500' },
  { id: 'reviewing', label: '검토중',    labelZh: '审核中',  color: 'bg-blue-50 border-blue-300',    badge: 'bg-blue-500' },
  { id: 'matching',  label: '매칭진행',  labelZh: '匹配中',  color: 'bg-purple-50 border-purple-300', badge: 'bg-purple-500' },
  { id: 'sample',    label: '샘플단계',  labelZh: '样品阶段', color: 'bg-amber-50 border-amber-300',  badge: 'bg-amber-500' },
  { id: 'completed', label: '완료',      labelZh: '已完成',  color: 'bg-green-50 border-green-300',  badge: 'bg-green-500' },
  { id: 'cancelled', label: '취소',      labelZh: '已取消',  color: 'bg-red-50 border-red-300',      badge: 'bg-red-400' },
]

const STATUS_NEXT: Record<string, string[]> = {
  pending:   ['reviewing', 'cancelled'],
  reviewing: ['matching', 'pending', 'cancelled'],
  matching:  ['sample', 'reviewing', 'cancelled'],
  sample:    ['completed', 'matching', 'cancelled'],
  completed: [],
  cancelled: ['pending'],
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ req, onClose, onStatusChange, onSave }: {
  req: MatchingRequest
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
  onSave: (id: string, patch: Partial<MatchingRequest>) => void
}) {
  const [adminNote, setAdminNote] = useState(req.admin_note || '')
  const [mdNote, setMdNote] = useState(req.md_note || '')
  const [isUrgent, setIsUrgent] = useState(req.is_urgent)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'info' | 'priority' | 'notes' | 'report'>('info')
  const [finalReport, setFinalReport] = useState<Record<string, unknown> | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => {
    if (activeTab === 'report') {
      setLoadingReport(true)
      supabase
        .from('factory_matching_final_reports')
        .select('*')
        .eq('request_id', req.id)
        .single()
        .then(({ data }) => { setFinalReport(data); setLoadingReport(false) })
    }
  }, [activeTab])

  async function approveAndSendReport() {
    if (!finalReport) return
    setSendingReport(true)
    await supabase
      .from('factory_matching_final_reports')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', (finalReport as Record<string,string>).id)
    await supabase
      .from('factory_matching_requests')
      .update({ status: 'completed', report_sent_at: new Date().toISOString() })
      .eq('id', req.id)
    setSendingReport(false)
    setReportSent(true)
    onStatusChange(req.id, 'completed')
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(req.id, { admin_note: adminNote, md_note: mdNote, is_urgent: isUrgent })
    setSaving(false)
  }

  const statusCol = COLUMNS.find(c => c.id === req.status)
  const nextStatuses = STATUS_NEXT[req.status] || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-5 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusCol?.badge} text-white`}>{statusCol?.label}</span>
              {req.is_urgent && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">🔥 긴급</span>}
              {req.is_standby && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">⏰ 대기초과</span>}
            </div>
            <h2 className="text-lg font-bold">{req.company_name}</h2>
            <p className="text-purple-200 text-sm">{req.contact_name} · {req.phone || req.email || '연락처 없음'}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[['info', '신청 내용'], ['priority', '우선순위'], ['notes', '메모/처리'], ['report', '보고서 승인']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id as 'info' | 'priority' | 'notes' | 'report')}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === id ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="text-xs font-bold text-purple-600 uppercase mb-2">제품 요청</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.product_desc}</p>
                {req.product_category && <span className="mt-2 inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">{req.product_category}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {req.moq && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">MOQ</p><p className="font-bold">{req.moq.toLocaleString()}개</p></div>}
                {req.target_price && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">희망 단가</p><p className="font-bold">¥{req.target_price}</p></div>}
                {req.business_type && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">사업 유형</p><p className="font-bold text-sm">{req.business_type}</p></div>}
                {req.quality_grade && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">품질 등급</p><p className="font-bold text-sm">{req.quality_grade}</p></div>}
              </div>
              {req.target_markets.length > 0 && (
                <div><p className="text-xs font-bold text-gray-500 mb-2">판매 대상 국가</p>
                  <div className="flex flex-wrap gap-1">{req.target_markets.map(m => <span key={m} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{m}</span>)}</div>
                </div>
              )}
              {req.required_certs.length > 0 && (
                <div><p className="text-xs font-bold text-gray-500 mb-2">필요 인증</p>
                  <div className="flex flex-wrap gap-1">{req.required_certs.map(c => <span key={c} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{c}</span>)}</div>
                </div>
              )}
              {req.has_ip_license && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-600">🎨 IP 라이선스 보유</p>
                  {req.ip_license_name && <p className="text-sm font-bold mt-1">{req.ip_license_name}</p>}
                  {req.need_ip_audit && <p className="text-xs text-amber-500 mt-1">IP 감사 필요</p>}
                </div>
              )}
              <p className="text-xs text-gray-400">신청일: {new Date(req.created_at).toLocaleString('ko-KR')}</p>
            </div>
          )}

          {activeTab === 'priority' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-700">공장 선정 우선순위</h4>
              {[
                { label: '가격 경쟁력', value: req.priority_price, color: 'bg-blue-500' },
                { label: '품질', value: req.priority_quality, color: 'bg-green-500' },
                { label: '납기 속도', value: req.priority_delivery, color: 'bg-amber-500' },
                { label: '공급 안정성', value: req.priority_stability, color: 'bg-purple-500' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold">{value}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                <button onClick={() => setIsUrgent(!isUrgent)}
                  className={`w-12 h-6 rounded-full transition-all ${isUrgent ? 'bg-red-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isUrgent ? 'translate-x-6' : ''}`} />
                </button>
                <span className="text-sm font-semibold text-red-700">🔥 긴급 처리 표시</span>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">관리자 메모</label>
                <textarea rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  placeholder="내부 처리 메모..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">MD 메모</label>
                <textarea rows={3} value={mdNote} onChange={e => setMdNote(e.target.value)}
                  placeholder="MD 처리 내용..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60">
                {saving ? '저장 중...' : '💾 메모 저장'}
              </button>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-4">
              {loadingReport ? (
                <div className="text-center py-8 text-gray-400">보고서 로딩 중...</div>
              ) : !finalReport ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-30">📄</div>
                  <p className="text-gray-500 text-sm">아직 MD가 보고서를 생성하지 않았습니다.</p>
                  <p className="text-gray-400 text-xs mt-1">MD 워크스페이스에서 공장 평가 후 보고서를 생성해 주세요.</p>
                </div>
              ) : (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-purple-800">보고서 정보</h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        (finalReport as Record<string,string>).status === 'sent' ? 'bg-green-100 text-green-700' :
                        (finalReport as Record<string,string>).status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {(finalReport as Record<string,string>).status === 'sent' ? '발송완료' :
                         (finalReport as Record<string,string>).status === 'draft' ? '검토대기' : (finalReport as Record<string,string>).status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">보고서 번호</span>
                        <span className="font-mono font-bold">{(finalReport as Record<string,string>).report_no}</span>
                      </div>
                      {((finalReport as Record<string,unknown>).section_final as Record<string,string>)?.factory && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">최종 추천 공장</span>
                          <span className="font-bold text-purple-700">{((finalReport as Record<string,unknown>).section_final as Record<string,string>).factory}</span>
                        </div>
                      )}
                      {(finalReport as Record<string,string>).sent_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">발송일시</span>
                          <span>{new Date((finalReport as Record<string,string>).sent_at).toLocaleString('ko-KR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {((finalReport as Record<string,unknown>).section_final as Record<string,string>)?.conclusion && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-gray-500 mb-2">최종 결론</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{((finalReport as Record<string,unknown>).section_final as Record<string,string>).conclusion}</p>
                    </div>
                  )}

                  {Array.isArray((finalReport as Record<string,unknown>).section_scores) && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 mb-2">종합 점수표</h4>
                      <div className="space-y-2">
                        {((finalReport as Record<string,unknown>).section_scores as Array<Record<string,unknown>>)
                          .sort((a, b) => ((b.total as number) ?? 0) - ((a.total as number) ?? 0))
                          .map((s, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                <span className="text-sm font-medium">{s.factory as string}</span>
                                {s.recommended === true && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">추천</span>}
                              </div>
                              <span className={`font-bold text-lg ${
                                (s.total as number) >= 80 ? 'text-green-600' :
                                (s.total as number) >= 60 ? 'text-amber-600' : 'text-red-600'
                              }`}>{s.total as number}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {(finalReport as Record<string,string>).status !== 'sent' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <h4 className="font-bold text-green-800 mb-2">보고서 승인 및 발송</h4>
                      <p className="text-xs text-green-600 mb-3">승인 시 바이어가 결과를 확인할 수 있으며, 상태가 완료로 변경됩니다.</p>
                      {reportSent ? (
                        <div className="text-center py-2 text-green-600 font-bold">✅ 발송 완료</div>
                      ) : (
                        <button
                          onClick={approveAndSendReport}
                          disabled={sendingReport}
                          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
                          {sendingReport ? '발송 중...' : '승인 및 바이어에게 발송 →'}
                        </button>
                      )}
                    </div>
                  )}

                  {(finalReport as Record<string,string>).status === 'sent' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-blue-700 font-bold">✅ 이미 발송된 보고서입니다</p>
                      <p className="text-xs text-blue-500 mt-1">바이어가 결과를 확인할 수 있습니다</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Status change buttons */}
        {nextStatuses.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <p className="text-xs text-gray-400 mb-2">상태 변경</p>
            <div className="flex gap-2 flex-wrap">
              {nextStatuses.map(s => {
                const col = COLUMNS.find(c => c.id === s)
                return (
                  <button key={s} onClick={() => { onStatusChange(req.id, s); onClose() }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all ${col?.badge} hover:opacity-90`}>
                    → {col?.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminMatchingPage() {

  // 페이지 제목 설정
  useEffect(() => {
    document.title = '매칭 관리 | KERYX';
  }, []);
  const { lang } = useLangContext()
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko
  const colLabel = (col: typeof COLUMNS[0]) => lang === 'zh' ? col.labelZh : col.label
  const [requests, setRequests] = useState<MatchingRequest[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReq, setSelectedReq] = useState<MatchingRequest | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, statsRes] = await Promise.all([
        fetch('/api/matching/requests?limit=200'),
        fetch('/api/matching/stats'),
      ])
      const reqJson = await reqRes.json()
      const statsJson = await statsRes.json()
      setRequests(reqJson.data || [])
      setStats(statsJson)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStatusChange = async (id: string, toStatus: string) => {
    await fetch(`/api/matching/requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_status: toStatus, actor_name: '관리자' }),
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: toStatus } : r))
  }

  const handleSave = async (id: string, patch: Partial<MatchingRequest>) => {
    await fetch(`/api/matching/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    if (selectedReq?.id === id) setSelectedReq(prev => prev ? { ...prev, ...patch } : null)
  }

  const filteredRequests = requests.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    const matchSearch = !searchQuery || 
      r.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product_desc.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  const getColumnRequests = (colId: string) => filteredRequests.filter(r => r.status === colId)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">{t('매칭 데이터 로딩 중...', '正在加载匹配数据...')}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔗 {t('공장 매칭 워크벤치', '工厂匹配工作台')}</h1>
            <p className="text-gray-500 text-sm">{t('매칭 신청 현황 및 처리 관리', '匹配申请状态及处理管理')}</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            🔄 {t('새로고침', '刷新')}
          </button>
        </div>

        {/* KPI Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { label: t('대기 중', '待处理'), value: stats.pending, color: 'text-gray-700', bg: 'bg-gray-100' },
              { label: t('진행 중', '进行中'), value: stats.in_progress, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: t('이번 주 완료', '本周完成'), value: stats.completed_this_week, color: 'text-green-700', bg: 'bg-green-50' },
              { label: t('평균 매칭 일수', '平均匹配天数'), value: lang === 'zh' ? `${stats.avg_match_days}天` : `${stats.avg_match_days}일`, color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: t('대기 초과', '超时待处理'), value: stats.overdue, color: 'text-red-700', bg: 'bg-red-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* TOP 매칭 통계 위젯 */}
        {stats && ((stats.top_factories && stats.top_factories.length > 0) || (stats.top_buyers && stats.top_buyers.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* 매칭 많은 공장 TOP 5 */}
            {stats.top_factories && stats.top_factories.length > 0 && (
              <div className="bg-white border border-purple-100 rounded-xl p-4">
                <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                  🏭 {t('매칭 많은 공장 TOP 5', '匹配最多工厂 TOP 5')}
                </h3>
                <div className="space-y-2">
                  {stats.top_factories.map((f, i) => (
                    <div key={f.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>{i + 1}</span>
                        <span className="text-sm text-gray-700 truncate max-w-[160px]">{f.name}</span>
                      </div>
                      <span className="text-sm font-bold text-purple-600">{f.count}{t('건', '件')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 매칭 많은 바이어 TOP 5 */}
            {stats.top_buyers && stats.top_buyers.length > 0 && (
              <div className="bg-white border border-blue-100 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                  🛒 {t('매칭 많은 바이어 TOP 5', '匹配最多买家 TOP 5')}
                </h3>
                <div className="space-y-2">
                  {stats.top_buyers.map((b, i) => (
                    <div key={b.id || b.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>{i + 1}</span>
                        <span className="text-sm text-gray-700 truncate max-w-[160px]">{b.name}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{b.count}{t('건', '件')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder={t('회사명, 담당자, 제품 검색...', '公司名、负责人、产品搜索...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <div className="flex gap-1">
            <button onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t('전체', '全部')} ({requests.length})
            </button>
            {COLUMNS.map(col => (
              <button key={col.id} onClick={() => setFilterStatus(col.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterStatus === col.id ? `${col.badge} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {colLabel(col)} ({requests.filter(r => r.status === col.id).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map(col => {
            const colRequests = getColumnRequests(col.id)
            return (
              <div key={col.id} className={`w-72 rounded-2xl border-2 ${col.color} flex flex-col`}>
                {/* Column Header */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.badge}`} />
                    <span className="font-bold text-sm text-gray-700">{colLabel(col)}</span>
                  </div>
                  <span className={`${col.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>{colRequests.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 min-h-32 max-h-[60vh] overflow-y-auto">
                  {colRequests.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">{t('신청 없음', '暂无申请')}</div>
                  ) : colRequests.map(req => (
                    <div key={req.id}
                      onClick={() => setSelectedReq(req)}
                      className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-purple-200">
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-800 truncate">{req.company_name}</p>
                          <p className="text-xs text-gray-500">{req.contact_name}</p>
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {req.is_urgent && <span className="text-xs">🔥</span>}
                          {req.is_standby && <span className="text-xs">⏰</span>}
                          {req.has_ip_license && <span className="text-xs">🎨</span>}
                        </div>
                      </div>
                      {/* Product desc */}
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{req.product_desc}</p>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {req.product_category && (
                          <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">{req.product_category}</span>
                        )}
                        {req.business_type && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{req.business_type}</span>
                        )}
                        {req.moq && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">MOQ {req.moq.toLocaleString()}</span>
                        )}
                      </div>
                      {/* Date */}
                      <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString('ko-KR')}</p>
                      {/* Quick actions */}
                      <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                        {(STATUS_NEXT[req.status] || []).slice(0, 2).map(s => {
                          const nextCol = COLUMNS.find(c => c.id === s)
                          return (
                            <button key={s}
                              onClick={e => { e.stopPropagation(); handleStatusChange(req.id, s) }}
                              className={`flex-1 py-1 rounded-lg text-xs font-semibold text-white transition-all ${nextCol?.badge} hover:opacity-90`}>
                              → {lang === 'zh' ? nextCol?.labelZh : nextCol?.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReq && (
        <DetailModal
          req={selectedReq}
          onClose={() => setSelectedReq(null)}
          onStatusChange={handleStatusChange}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
