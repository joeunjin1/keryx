'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLangContext } from '@/components/layout/LangContext';

interface PhotoGroup {
  title: string
  photos: { id: string; url: string; photo_title?: string }[]
}

interface SampleCompareGroup {
  itemName: string
  samplePhotos: { id: string; url: string }[]
  currentPhotos: { id: string; url: string }[]
}

interface InspectionItem {
  id: string
  label_ko: string
  label_zh: string
  is_na: boolean
  na_reason?: string
  qty_inspected: number
  qty_passed: number
  qty_failed: number
  pass_rate?: number
  defect_grade?: string
  defect_desc_ko?: string
  defect_desc_cn?: string
  action_ko?: string
  action_cn?: string
  display_order?: number
}

interface InspectionReport {
  id: string
  inspection_no: string
  status: string
  final_verdict: string
  product_name_ko: string
  product_name_cn: string
  sku: string
  po_number: string
  inspection_stage: string
  inspection_date: string
  qty_ordered: number
  qty_inspected: number
  qty_passed: number
  qty_failed: number
  pass_rate: number
  aql_major: number
  aql_minor: number
  unit_price_cny: number
  payment_amount_cny: number
  cbm_estimated: number
  box_qty_per_carton: number
  total_cartons: number
  gross_weight_kg: number
  port_of_loading: string
  port_of_discharge: string
  ship_date: string
  has_ip_license: boolean
  ip_verified: boolean
  ip_license_no: string
  inspector_comment: string
  summary_ko: string
  defect_action: string
  published_at: string
  // 승인 관련 필드
  buyer_approved_at: string | null
  buyer_approved_by: string | null
  buyer_approval_note: string | null
  factory_approved_at: string | null
  payment_released_at: string | null
  factories?: { company_name: string; company_name_ko: string; city: string }
  sellers?: { business_name: string }
}

interface Defect {
  id: string
  seq_no: number
  grade: 'critical' | 'major' | 'minor'
  title_ko: string
  description_ko: string
  affected_qty: number
  action_required: string
  status: string
}

const VERDICT_CONFIG = {
  pass: {
    label: '합격',
    sublabel: '안심하고 받으실 수 있습니다',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-800',
    icon: '✅',
    badge: 'bg-green-100 text-green-800',
  },
  conditional_pass: {
    label: '조건부 합격',
    sublabel: '일부 조치 후 출고 예정입니다',
    color: 'from-yellow-500 to-amber-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    icon: '⚠️',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  hold: {
    label: '출고 보류',
    sublabel: '추가 확인이 필요합니다',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-800',
    icon: '⏸️',
    badge: 'bg-orange-100 text-orange-800',
  },
  fail: {
    label: '불합격',
    sublabel: '재검수 또는 재생산이 필요합니다',
    color: 'from-red-500 to-rose-700',
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-800',
    icon: '❌',
    badge: 'bg-red-100 text-red-800',
  },
}

const GRADE_LABELS = {
  critical: { label: '치명적 결함', color: 'bg-red-100 text-red-800 border-red-300', desc: '즉시 조치 필요' },
  major: { label: '주요 결함', color: 'bg-orange-100 text-orange-800 border-orange-300', desc: '출고 전 조치 필요' },
  minor: { label: '경미한 결함', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', desc: '출고 후 개선 권장' },
}

const ACTION_LABELS: Record<string, string> = {
  rework: '재작업 후 출고',
  sort: '선별 후 출고',
  hold: '출고 보류',
  reject: '전량 반품',
}

export default function BuyerInspectionReportPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const params = useParams()
  const supabase = createClient()
  const inspectionId = params.inspectionId as string

  const [report, setReport] = useState<InspectionReport | null>(null)
  const [defects, setDefects] = useState<Defect[]>([])
  const [items, setItems] = useState<InspectionItem[]>([])
  const [inspectionPhotoGroups, setInspectionPhotoGroups] = useState<PhotoGroup[]>([])
  const [sampleCompareGroups, setSampleCompareGroups] = useState<SampleCompareGroup[]>([])
  const [inspectorSitePhotos, setInspectorSitePhotos] = useState<{ id: string; url: string; photo_title?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('summary')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // 승인 관련 상태
  const [approving, setApproving] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approveError, setApproveError] = useState('')
  const [approveSuccess, setApproveSuccess] = useState(false)

  useEffect(() => {
    loadReport()
  }, [inspectionId])

  const loadReport = async () => {
    setLoading(true)
    try {
      // API 라우트를 통해 서버 측 인증으로 조회
      const res = await fetch(`/api/seller/inspections/${inspectionId}`)
      const json = await res.json()
      if (json.data) setReport(json.data)
      if (json.defects) setDefects(json.defects)
      if (json.items) setItems(json.items)
      if (json.inspectionPhotoGroups) setInspectionPhotoGroups(json.inspectionPhotoGroups)
      if (json.sampleCompareGroups) setSampleCompareGroups(json.sampleCompareGroups)
      if (json.inspectorSitePhotos) setInspectorSitePhotos(json.inspectorSitePhotos)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    setApproveError('')
    try {
      const res = await fetch(`/api/seller/inspections/${inspectionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: approvalNote }),
      })
      const result = await res.json()
      if (!res.ok) {
        setApproveError(result.error || '승인 처리 중 오류가 발생했습니다.')
      } else {
        setApproveSuccess(true)
        setShowApprovalModal(false)
        await loadReport()
      }
    } catch {
      setApproveError('네트워크 오류가 발생했습니다.')
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">검수 리포트 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-600">검수 리포트를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const verdict = VERDICT_CONFIG[report.final_verdict as keyof typeof VERDICT_CONFIG] || VERDICT_CONFIG.hold
  const defectStats = {
    critical: defects.filter(d => d.grade === 'critical').length,
    major: defects.filter(d => d.grade === 'major').length,
    minor: defects.filter(d => d.grade === 'minor').length,
    total: defects.length,
  }

  const isBuyerApproved = !!report.buyer_approved_at
  const isFactoryApproved = !!report.factory_approved_at
  const bothApproved = isBuyerApproved && isFactoryApproved
  const paymentReleased = !!report.payment_released_at

  const stageLabels: Record<string, string> = {
    PSI: '선적 전 검수 (PSI)',
    DUPRO: '생산 중 검수 (DUPRO)',
    PPI: '생산 전 검수 (PPI)',
    CLC: '컨테이너 적재 확인 (CLC)',
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* ── 헤더 ── */}
      <div className={`bg-gradient-to-r ${verdict.color} text-white`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* KERYX 브랜드 */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-sm">K</div>
            <span className="font-bold text-lg">KERYX</span>
            <span className="text-white/60 text-sm">· 전수검수 서비스</span>
          </div>

          {/* 판정 결과 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">{verdict.icon}</div>
            <div>
              <p className="text-white/80 text-sm mb-1">최종 검수 판정</p>
              <h1 className="text-4xl font-black">{verdict.label}</h1>
              <p className="text-white/90 mt-1">{verdict.sublabel}</p>
            </div>
          </div>

          {/* 핵심 지표 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{report.pass_rate || 0}%</p>
              <p className="text-xs text-white/80">합격률</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{report.qty_inspected?.toLocaleString() || 0}</p>
              <p className="text-xs text-white/80">검수 수량</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{defectStats.total}</p>
              <p className="text-xs text-white/80">발견 결함</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{report.inspection_date ? new Date(report.inspection_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '—'}</p>
              <p className="text-xs text-white/80">검수일</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 섹션 탭 ── */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex overflow-x-auto">
          {[
            { id: 'summary', label: '📋 요약' },
            { id: 'quantity', label: '🔢 수량' },
            { id: 'defects', label: '⚠️ 결함' },
            { id: 'photos', label: '📷 사진' },
            { id: 'compare', label: '🔍 샘플비교' },
            { id: 'logistics', label: '📦 물류' },
            { id: 'action', label: '✅ 조치' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeSection === tab.id
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── 요약 섹션 ── */}
        {activeSection === 'summary' && (
          <>
            {/* 검수원 의견 */}
            {report.inspector_comment && (
              <div className={`${verdict.bg} border-2 ${verdict.border} rounded-xl p-6`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <h3 className={`font-bold ${verdict.text} mb-2`}>검수원 종합 의견</h3>
                    <p className="text-gray-700 leading-relaxed">{report.inspector_comment}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 쉬운 언어 요약 */}
            {report.summary_ko && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <h3 className="font-bold text-blue-800 mb-2">쉽게 이해하는 검수 결과</h3>
                    <p className="text-gray-700 leading-relaxed">{report.summary_ko}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 제품 정보 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">📦 제품 정보</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: '제품명', value: report.product_name_ko },
                  { label: 'SKU / 품번', value: report.sku },
                  { label: 'PO 번호', value: report.po_number },
                  { label: '검수 단계', value: stageLabels[report.inspection_stage] || report.inspection_stage },
                  { label: '검수일자', value: report.inspection_date ? new Date(report.inspection_date).toLocaleDateString('ko-KR') : '—' },
                  { label: '공장명', value: (report.factories as any)?.company_name || '—' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-gray-800">{item.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* IP 라이센스 */}
            {report.has_ip_license && (
              <div className={`rounded-xl border p-5 ${report.ip_verified ? 'bg-purple-50 border-purple-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏷️</span>
                  <div>
                    <h3 className={`font-bold ${report.ip_verified ? 'text-purple-800' : 'text-red-800'}`}>
                      IP 라이센스 {report.ip_verified ? '✅ 검증 완료' : '❌ 검증 실패'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      라이센스 번호: {report.ip_license_no || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 수량 섹션 ── */}
        {activeSection === 'quantity' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-6">🔢 수량 상세 내역</h3>

              {/* 합격률 게이지 */}
              <div className="text-center mb-8">
                <div className="relative w-40 h-40 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={report.pass_rate >= 95 ? '#22c55e' : report.pass_rate >= 80 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="10"
                      strokeDasharray={`${(report.pass_rate || 0) * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${report.pass_rate >= 95 ? 'text-green-600' : report.pass_rate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {report.pass_rate || 0}%
                    </span>
                    <span className="text-xs text-gray-500">합격률</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {report.pass_rate >= 95 ? '✅ 우수한 품질 수준입니다' :
                   report.pass_rate >= 80 ? '⚠️ 일부 개선이 필요합니다' :
                   '❌ 품질 개선이 시급합니다'}
                </p>
              </div>

              {/* 수량 바 차트 */}
              <div className="space-y-3">
                {[
                  { label: '주문 수량', value: report.qty_ordered, total: report.qty_ordered, color: 'bg-blue-400' },
                  { label: '검수 수량', value: report.qty_inspected, total: report.qty_ordered, color: 'bg-indigo-400' },
                  { label: '합격 수량', value: report.qty_passed, total: report.qty_ordered, color: 'bg-green-400' },
                  { label: '불합격 수량', value: report.qty_failed, total: report.qty_ordered, color: 'bg-red-400' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-bold text-gray-800">{(item.value || 0).toLocaleString()}개</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-4">
                      <div
                        className={`${item.color} h-4 rounded-full transition-all`}
                        style={{ width: `${item.total ? Math.min((item.value || 0) / item.total * 100, 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AQL 기준 결과 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">📐 AQL 품질 기준 충족 여부</h3>
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-xs text-blue-700">
                AQL(허용 품질 수준)은 국제 표준 품질 검사 기준입니다. 주요 결함 {report.aql_major || 2.5}%, 경미 결함 {report.aql_minor || 4.0}% 이하를 기준으로 합니다.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-xl p-4 text-center border-2 ${
                  defects.filter(d => d.grade === 'major').length / (report.qty_inspected || 1) * 100 <= (report.aql_major || 2.5)
                    ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                }`}>
                  <p className="text-xs text-gray-600 mb-1">주요 결함 기준</p>
                  <p className={`text-xl font-black ${
                    defects.filter(d => d.grade === 'major').length / (report.qty_inspected || 1) * 100 <= (report.aql_major || 2.5)
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {defects.filter(d => d.grade === 'major').length / (report.qty_inspected || 1) * 100 <= (report.aql_major || 2.5) ? '✅ 통과' : '❌ 초과'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">기준: {report.aql_major || 2.5}% 이하</p>
                </div>
                <div className={`rounded-xl p-4 text-center border-2 ${
                  defects.filter(d => d.grade === 'minor').length / (report.qty_inspected || 1) * 100 <= (report.aql_minor || 4.0)
                    ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                }`}>
                  <p className="text-xs text-gray-600 mb-1">경미 결함 기준</p>
                  <p className={`text-xl font-black ${
                    defects.filter(d => d.grade === 'minor').length / (report.qty_inspected || 1) * 100 <= (report.aql_minor || 4.0)
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {defects.filter(d => d.grade === 'minor').length / (report.qty_inspected || 1) * 100 <= (report.aql_minor || 4.0) ? '✅ 통과' : '❌ 초과'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">기준: {report.aql_minor || 4.0}% 이하</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 결함 섹션 ── */}
        {activeSection === 'defects' && (
          <div className="space-y-4">
            {/* 결함 통계 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { grade: 'critical', count: defectStats.critical, label: '치명적', color: 'bg-red-50 border-red-300 text-red-800' },
                { grade: 'major', count: defectStats.major, label: '주요', color: 'bg-orange-50 border-orange-300 text-orange-800' },
                { grade: 'minor', count: defectStats.minor, label: '경미', color: 'bg-yellow-50 border-yellow-300 text-yellow-800' },
              ].map(stat => (
                <div key={stat.grade} className={`rounded-xl border-2 p-4 text-center ${stat.color}`}>
                  <p className="text-3xl font-black">{stat.count}</p>
                  <p className="text-xs font-medium mt-1">{stat.label} 결함</p>
                </div>
              ))}
            </div>

            {defects.length === 0 ? (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-bold text-green-800">결함이 발견되지 않았습니다!</p>
                <p className="text-sm text-green-600 mt-1">모든 제품이 품질 기준을 충족합니다.</p>
              </div>
            ) : (
              defects.map((defect, index) => {
                const gradeInfo = GRADE_LABELS[defect.grade]
                return (
                  <div key={defect.id} className="bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">#{index + 1}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${gradeInfo.color}`}>
                          {gradeInfo.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{gradeInfo.desc}</span>
                    </div>
                    <h4 className="font-bold text-gray-800 mb-2">{defect.title_ko}</h4>
                    {defect.description_ko && (
                      <p className="text-sm text-gray-600 mb-3">{defect.description_ko}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">영향 수량: <strong className="text-gray-800">{defect.affected_qty}개</strong></span>
                      <span className="text-gray-500">조치: <strong className="text-purple-700">{ACTION_LABELS[defect.action_required] || defect.action_required}</strong></span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── 사진 섹션 ── */}
        {activeSection === 'photos' && (
          <div className="space-y-5">
            {/* 검수 사진 그룹 */}
            {inspectionPhotoGroups.length > 0 ? (
              inspectionPhotoGroups.map((group, gIdx) => (
                <div key={gIdx} className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">{gIdx + 1}</span>
                    {group.title}
                    <span className="text-xs text-gray-400 font-normal">{group.photos.length}{t('장', '张')}</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {group.photos.map((p, pIdx) => (
                      <button key={p.id} onClick={() => setLightboxUrl(p.url)}
                        className="aspect-square overflow-hidden rounded-lg border hover:opacity-90 transition-opacity">
                        <img src={p.url} alt={`${group.title} ${pIdx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 rounded-xl border p-8 text-center">
                <p className="text-4xl mb-3">📷</p>
                <p className="text-gray-500">{t('등록된 검수 사진이 없습니다.', '暂无检验照片。')}</p>
              </div>
            )}

            {/* 검수원 현장 사진 */}
            {inspectorSitePhotos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="font-bold text-gray-800 mb-3">👤 {t('검수원 현장 사진', '检验员现场照片')}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {inspectorSitePhotos.map((p, pIdx) => (
                    <div key={p.id} className="space-y-1">
                      <button onClick={() => setLightboxUrl(p.url)}
                        className="w-full aspect-square overflow-hidden rounded-lg border hover:opacity-90 transition-opacity">
                        <img src={p.url} alt={`현장 ${pIdx + 1}`} className="w-full h-full object-cover" />
                      </button>
                      {p.photo_title && (
                        <p className="text-xs text-gray-500 text-center truncate">{p.photo_title}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 샘플 비교 섹션 ── */}
        {activeSection === 'compare' && (
          <div className="space-y-5">
            {sampleCompareGroups.length > 0 ? (
              sampleCompareGroups.map((group, gIdx) => (
                <div key={gIdx} className="bg-white rounded-xl shadow-sm border p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">{gIdx + 1}</span>
                    {group.itemName || t('비교 항목', '对比项目')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 오더 확정 샘플 */}
                    <div>
                      <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg mb-2 text-center">
                        {t('오더 확정 샘플', '订单确认样品')}
                      </div>
                      {group.samplePhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          {group.samplePhotos.map((p, pIdx) => (
                            <button key={p.id} onClick={() => setLightboxUrl(p.url)}
                              className="aspect-square overflow-hidden rounded-lg border-2 border-amber-300 hover:opacity-90 transition-opacity">
                              <img src={p.url} alt={`샘플 ${pIdx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="aspect-square bg-amber-50 rounded-lg border-2 border-dashed border-amber-200 flex items-center justify-center">
                          <p className="text-xs text-amber-400">{t('사진 없음', '暂无照片')}</p>
                        </div>
                      )}
                    </div>
                    {/* 현재 검수 사진 */}
                    <div>
                      <div className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg mb-2 text-center">
                        {t('현재 검수 사진', '当前检验照片')}
                      </div>
                      {group.currentPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          {group.currentPhotos.map((p, pIdx) => (
                            <button key={p.id} onClick={() => setLightboxUrl(p.url)}
                              className="aspect-square overflow-hidden rounded-lg border-2 border-green-300 hover:opacity-90 transition-opacity">
                              <img src={p.url} alt={`현재 ${pIdx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="aspect-square bg-green-50 rounded-lg border-2 border-dashed border-green-200 flex items-center justify-center">
                          <p className="text-xs text-green-400">{t('사진 없음', '暂无照片')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 rounded-xl border p-8 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-500">{t('등록된 샘플 비교 사진이 없습니다.', '暂无样品对比照片。')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── 물류 섹션 ── */}
        {activeSection === 'logistics' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 mb-4">📦 물류 / 포장 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '박스당 입수', value: `${report.box_qty_per_carton || 0}개` },
                { label: '총 박스 수', value: `${report.total_cartons || 0}박스` },
                { label: '총 중량', value: `${report.gross_weight_kg || 0}kg` },
                { label: '예상 CBM', value: `${report.cbm_estimated || 0} CBM` },
                { label: '선적항', value: report.port_of_loading || '—' },
                { label: '도착항', value: report.port_of_discharge || '—' },
                { label: '예정 선적일', value: report.ship_date ? new Date(report.ship_date).toLocaleDateString('ko-KR') : '—' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="font-bold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 조치 섹션 ── */}
        {activeSection === 'action' && (
          <div className="space-y-4">
            <div className={`${verdict.bg} border-2 ${verdict.border} rounded-xl p-6`}>
              <h3 className={`font-bold ${verdict.text} text-lg mb-3`}>
                {verdict.icon} 최종 판정: {verdict.label}
              </h3>
              <p className="text-gray-700">{verdict.sublabel}</p>
            </div>

            {/* 불량 처리 방법 (새 템플릿: 추가제작 / 쇼티지) */}
            {(report as any).defect_action && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-gray-800 mb-4">🔧 {t('불량 처리 방법', '不良品处理方式')}</h3>
                {(report as any).defect_action === 'remanufacture' ? (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🏭</span>
                      <div>
                        <p className="font-bold text-blue-900 text-base">{t('공장 추가제작', '工厂补产')}</p>
                        {(report as any).defect_action_days && (
                          <p className="text-blue-700 text-sm mt-0.5">
                            {t(`불량 수량만큼 공장에서 추가 제작하여 ${(report as any).defect_action_days}일 이내 납품합니다.`,
                              `工厂将对不良品数量进行补产，${(report as any).defect_action_days}日内交货。`)}
                          </p>
                        )}
                      </div>
                    </div>
                    {(report as any).defect_action_notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-white rounded-lg p-3 border border-blue-200">
                        {(report as any).defect_action_notes}
                      </p>
                    )}
                  </div>
                ) : (report as any).defect_action === 'shortage' ? (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">💸</span>
                      <div>
                        <p className="font-bold text-red-900 text-base">{t('쇼티지 (반품 금액 차감)', '短缺（从货款中扣除）')}</p>
                        <p className="text-red-700 text-sm mt-0.5">
                          {t('불량 수량에 해당하는 금액을 반품 처리하여 대금에서 차감합니다.', '对不良品数量对应金额进行扣款处理。')}
                        </p>
                      </div>
                    </div>
                    {(report as any).defect_action_notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-white rounded-lg p-3 border border-red-200">
                        {(report as any).defect_action_notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="font-bold text-purple-800 text-lg">{ACTION_LABELS[(report as any).defect_action] || (report as any).defect_action}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {(report as any).defect_action === 'rework' && t('결함이 발견된 제품을 재작업한 후 재검수를 거쳐 출고합니다.', '对发现缺陷的产品返工后重新检验再出货。')}
                      {(report as any).defect_action === 'sort' && t('전체 제품을 선별하여 합격품만 출고하고 불합격품은 처리합니다.', '对全部产品进行筛选，合格品出货，不合格品处理。')}
                      {(report as any).defect_action === 'hold' && t('추가 확인이 완료될 때까지 출고를 보류합니다.', '待进一步确认完成前暂缓出货。')}
                      {(report as any).defect_action === 'reject' && t('품질 기준 미달로 전량 반품 처리됩니다.', '因不符合质量标准，全量退货处理。')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 다음 단계 안내 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">📅 다음 단계 안내</h3>
              <div className="space-y-3">
                {[
                  { step: '1', label: '검수 결과 확인', desc: '현재 단계 — 리포트 검토 완료', done: true },
                  { step: '2', label: '조치 사항 진행', desc: report.defect_action ? `${ACTION_LABELS[report.defect_action]} 진행 예정` : '해당 없음', done: false },
                  { step: '3', label: '출고 승인', desc: '조치 완료 후 최종 출고 승인', done: false },
                  { step: '4', label: '선적 및 배송', desc: `예정 선적일: ${report.ship_date ? new Date(report.ship_date).toLocaleDateString('ko-KR') : '미정'}`, done: false },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {item.done ? '✓' : item.step}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${item.done ? 'text-green-700' : 'text-gray-800'}`}>{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 바이어 승인 섹션 ── */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-purple-700 text-white px-6 py-4">
            <h3 className="font-bold text-lg">✍️ 검수 결과 승인</h3>
            <p className="text-purple-200 text-sm mt-1">검수 보고서를 확인하고 결과를 승인해 주세요</p>
          </div>
          <div className="p-6">
            {/* 승인 상태 표시 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* 바이어 승인 상태 */}
              <div className={`rounded-xl border-2 p-4 ${isBuyerApproved ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{isBuyerApproved ? '✅' : '⏳'}</span>
                  <span className="font-bold text-gray-800">바이어 승인</span>
                </div>
                {isBuyerApproved ? (
                  <>
                    <p className="text-purple-700 font-medium text-sm">승인 완료</p>
                    <p className="text-gray-500 text-xs mt-1">{new Date(report.buyer_approved_at!).toLocaleDateString('ko-KR')}</p>
                    {report.buyer_approval_note && (
                      <p className="text-gray-600 text-xs mt-2 bg-white rounded p-2 border">{report.buyer_approval_note}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">승인 대기 중</p>
                )}
              </div>

              {/* 공장 승인 상태 */}
              <div className={`rounded-xl border-2 p-4 ${isFactoryApproved ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{isFactoryApproved ? '✅' : '⏳'}</span>
                  <span className="font-bold text-gray-800">공장 확인</span>
                </div>
                {isFactoryApproved ? (
                  <>
                    <p className="text-orange-700 font-medium text-sm">공장 확인 완료</p>
                    <p className="text-gray-500 text-xs mt-1">{new Date(report.factory_approved_at!).toLocaleDateString('ko-KR')}</p>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">공장 확인 대기 중</p>
                )}
              </div>
            </div>

            {/* 정산 안내 */}
            <div className={`rounded-xl p-4 mb-6 ${bothApproved ? (paymentReleased ? 'bg-green-50 border border-green-300' : 'bg-blue-50 border border-blue-300') : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bothApproved ? (paymentReleased ? '💰' : '🔄') : '📋'}</span>
                <div>
                  <p className={`font-bold ${bothApproved ? (paymentReleased ? 'text-green-800' : 'text-blue-800') : 'text-gray-700'}`}>
                    {paymentReleased ? '정산 완료' : bothApproved ? '양측 승인 완료 · 정산 처리 중' : '바이어 + 공장 모두 승인 시 정산이 진행됩니다'}
                  </p>
                  {report.payment_amount_cny && (
                    <p className="text-sm text-gray-600 mt-1">정산 금액: ¥{report.payment_amount_cny.toLocaleString()} CNY</p>
                  )}
                  {paymentReleased && report.payment_released_at && (
                    <p className="text-green-600 text-sm">{new Date(report.payment_released_at).toLocaleDateString('ko-KR')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 승인 버튼 */}
            {!isBuyerApproved ? (
              <button
                onClick={() => setShowApprovalModal(true)}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
              >
                검수 결과 승인하기
              </button>
            ) : (
              <div className="text-center py-3 bg-purple-50 rounded-xl border border-purple-200">
                <p className="text-purple-700 font-bold">✅ 검수 결과 승인 완료</p>
                <p className="text-purple-600 text-sm mt-1">
                  {report.buyer_approved_at ? new Date(report.buyer_approved_at).toLocaleString('ko-KR') : ''}
                </p>
              </div>
            )}

            {approveSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-medium">✅ 승인이 완료되었습니다!</p>
              </div>
            )}
          </div>
        </div>

        {/* 발행 정보 */}
        <div className="text-center text-xs text-gray-400 py-4 border-t">
          <p>KERYX 전수검수 서비스 · 리포트 번호: {report.inspection_no}</p>
          <p className="mt-1">발행일: {report.published_at ? new Date(report.published_at).toLocaleDateString('ko-KR') : '—'}</p>
        </div>
      </div>

    </div>

      {/* ── 라이트박스 ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img src={lightboxUrl} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white text-gray-800 rounded-full flex items-center justify-center font-bold text-sm shadow-lg hover:bg-gray-100"
            >×</button>
          </div>
        </div>
      )}

      {/* ── 승인 모달 ── */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-purple-700 text-white px-6 py-4 rounded-t-2xl">
              <h3 className="font-bold text-lg">검수 결과 승인</h3>
              <p className="text-purple-200 text-sm mt-1">검수 보고서 내용을 확인하고 승인해 주세요</p>
            </div>
            <div className="p-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-purple-800 font-medium">승인 안내</p>
                <ul className="text-sm text-purple-700 mt-2 space-y-1">
                  <li>· 검수 보고서 내용에 동의합니다</li>
                  <li>· 공장 확인 완료 후 정산이 진행됩니다</li>
                  <li>· 승인 후에는 취소할 수 없습니다</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  승인 메모 (선택사항)
                </label>
                <textarea
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  placeholder="특이사항이 있으면 입력해 주세요..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                  rows={3}
                />
              </div>

              {approveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{approveError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowApprovalModal(false); setApproveError('') }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {approving ? '처리 중...' : '✅ 승인하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
