'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLangContext } from '@/components/layout/LangContext';

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
  cbm_estimated: number
  box_qty_per_carton: number
  total_cartons: number
  gross_weight_kg: number
  net_weight_kg: number
  port_of_loading: string
  port_of_discharge: string
  ship_date: string
  has_ip_license: boolean
  ip_verified: boolean
  ip_license_no: string
  inspector_comment: string
  summary_ko: string
  summary_cn: string
  defect_action: string
  defect_action_notes: string
  published_at: string
  admin_approved_at: string
  factories?: { company_name: string; name_cn: string; city: string }
  sellers?: { business_name: string }
}

interface Defect {
  id: string
  seq_no: number
  grade: 'critical' | 'major' | 'minor'
  title_ko: string
  title_cn: string
  description_ko: string
  description_cn: string
  affected_qty: number
  action_required: string
  status: string
}

interface SafetyTest {
  test_name_ko: string
  test_name_cn: string
  standard: string
  measured_value: string
  result: 'pass' | 'fail' | 'na'
  notes: string
}

const VERDICT_CONFIG = {
  pass: { label: '합격', labelCn: '合格', color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800', icon: '✅', badge: 'bg-green-100 text-green-800' },
  conditional_pass: { label: '조건부 합격', labelCn: '有条件合格', color: 'from-yellow-500 to-amber-600', bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800', icon: '⚠️', badge: 'bg-yellow-100 text-yellow-800' },
  hold: { label: '출고 보류', labelCn: '暂停出货', color: 'from-orange-500 to-red-500', bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800', icon: '⏸️', badge: 'bg-orange-100 text-orange-800' },
  fail: { label: '불합격', labelCn: '不合格', color: 'from-red-600 to-red-800', bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800', icon: '❌', badge: 'bg-red-100 text-red-800' },
}

const GRADE_CONFIG = {
  critical: { label: '치명', labelCn: '致命', color: 'bg-red-100 text-red-800 border-red-300' },
  major: { label: '주요', labelCn: '主要', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  minor: { label: '경미', labelCn: '轻微', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: '조치 필요', color: 'bg-red-100 text-red-700' },
  reworked: { label: '재작업 완료', color: 'bg-blue-100 text-blue-700' },
  discarded: { label: '폐기 처리', color: 'bg-gray-100 text-gray-700' },
  accepted: { label: '허용', color: 'bg-green-100 text-green-700' },
}

export default function AdminInspectionReportPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const inspectionId = params.inspectionId as string

  const [report, setReport] = useState<InspectionReport | null>(null)
  const [defects, setDefects] = useState<Defect[]>([])
  const [safetyTests, setSafetyTests] = useState<SafetyTest[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'admin' | 'buyer' | 'factory'>('admin')
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState('')

  useEffect(() => {
    loadReport()
  }, [inspectionId])

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('*, factories(company_name, name_cn, city), sellers(business_name)')
        .eq('id', inspectionId)
        .single()
      if (error) console.error('inspections 조회 오류:', error)
      if (data) setReport(data)

      const { data: defectData } = await supabase
        .from('inspection_defects')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('seq_no')
      if (defectData) setDefects(defectData)

      const { data: safetyData } = await supabase
        .from('inspection_safety_tests')
        .select('*')
        .eq('inspection_id', inspectionId)
      if (safetyData) setSafetyTests(safetyData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!report) return
    setPublishing(true)
    try {
      const now = new Date().toISOString()
      // 검수 상태를 published로 업데이트
      await supabase.from('inspections').update({
        status: 'published',
        published_at: now,
        admin_approved_at: now,
      }).eq('id', inspectionId)

      // 발행 이력 upsert (바이어)
      await supabase.from('inspection_publish_history').upsert([
        {
          inspection_id: inspectionId,
          recipient_type: 'seller',
          version_type: 'buyer',
          published_at: now,
          share_url: `https://www.keryx.kr/seller/inspections/${inspectionId}/report`,
          status: 'active',
        },
        {
          inspection_id: inspectionId,
          recipient_type: 'factory',
          version_type: 'factory',
          published_at: now,
          share_url: `https://www.keryx.kr/factory/inspections/${inspectionId}/report`,
          status: 'active',
        },
      ], { onConflict: 'inspection_id,recipient_type' })

      setPublishMsg('✅ 리포트가 바이어와 공장에 발행되었습니다!')
      await loadReport()
    } catch (err) {
      setPublishMsg('❌ 발행 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setPublishing(false)
      setTimeout(() => setPublishMsg(''), 4000)
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
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-xl font-bold text-gray-700 mb-2">검수 리포트를 찾을 수 없습니다</p>
          <p className="text-gray-500 mb-6">검수 ID: {inspectionId}</p>
          <button onClick={() => router.push('/admin/inspections/dashboard')}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
            대시보드로 돌아가기
          </button>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 관리자 전용 상단 컨트롤 바 */}
      <div className="bg-gray-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/inspections/dashboard')}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            ← 대시보드
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-sm font-mono text-purple-300">{report.inspection_no}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            report.status === 'published' ? 'bg-green-600' :
            report.status === 'draft' ? 'bg-gray-600' : 'bg-yellow-600'
          }`}>
            {report.status === 'published' ? '발행됨' : report.status === 'draft' ? '초안' : '검토중'}
          </span>
        </div>

        {/* 뷰 모드 전환 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">미리보기:</span>
          {(['admin', 'buyer', 'factory'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === mode ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
              {mode === 'admin' ? '⚙️ 관리자' : mode === 'buyer' ? '🛍️ 바이어' : '🏭 공장'}
            </button>
          ))}
        </div>

        {/* 발행 버튼 */}
        <div className="flex items-center gap-2">
          {publishMsg && <span className="text-sm text-green-300">{publishMsg}</span>}
          {report.status !== 'published' && (
            <button onClick={handlePublish} disabled={publishing}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium disabled:opacity-50">
              {publishing ? '발행 중...' : '📤 바이어·공장에 발행'}
            </button>
          )}
          <a href={`/seller/inspections/${inspectionId}/report`} target="_blank"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs">
            바이어 리포트 →
          </a>
          <a href={`/factory/inspections/${inspectionId}/report`} target="_blank"
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs">
            공장 리포트 →
          </a>
          <button onClick={() => window.print()}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">
            🖨️ 인쇄
          </button>
        </div>
      </div>

      {/* 메인 리포트 컨텐츠 */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* 헤더 */}
        <div className={`bg-gradient-to-r ${verdict.color} rounded-2xl p-6 text-white mb-6 shadow-lg`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono">{report.inspection_no}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{report.inspection_stage?.toUpperCase()}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{report.product_name_ko}</h1>
              <p className="text-white/80 text-sm">{report.product_name_cn}</p>
              <p className="text-white/70 text-xs mt-1">PO: {report.po_number} · SKU: {report.sku}</p>
            </div>
            <div className="text-center bg-white/20 rounded-xl p-4 min-w-[120px]">
              <div className="text-4xl mb-1">{verdict.icon}</div>
              <div className="text-xl font-bold">{verdict.label}</div>
              <div className="text-white/80 text-xs">{verdict.labelCn}</div>
            </div>
          </div>
        </div>

        {/* 핵심 KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: '합격률', value: `${report.pass_rate?.toFixed(2) ?? '-'}%`, icon: '📊', color: 'text-green-600' },
            { label: '검수 수량', value: `${report.qty_inspected?.toLocaleString() ?? '-'}개`, icon: '🔍', color: 'text-blue-600' },
            { label: '결함 건수', value: `${defectStats.total}건`, icon: '⚠️', color: defectStats.critical > 0 ? 'text-red-600' : 'text-yellow-600' },
            { label: '안전시험', value: `${safetyTests.filter(t => t.result === 'pass').length}/${safetyTests.length} 합격`, icon: '🛡️', color: 'text-purple-600' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-2xl mb-1">{kpi.icon}</div>
              <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-gray-500 text-xs">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-sm">📋</span>
            기본 정보
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: '검수일', value: report.inspection_date },
              { label: '검수 단계', value: report.inspection_stage?.toUpperCase() },
              { label: '공장', value: report.factories?.company_name || '-' },
              { label: '바이어', value: report.sellers?.business_name || '-' },
              { label: '주문 수량', value: `${report.qty_ordered?.toLocaleString()}개` },
              { label: '검수 수량', value: `${report.qty_inspected?.toLocaleString()}개` },
              { label: '합격 수량', value: `${report.qty_passed?.toLocaleString()}개` },
              { label: '불합격 수량', value: `${report.qty_failed?.toLocaleString()}개` },
              { label: 'AQL Major', value: report.aql_major },
              { label: 'AQL Minor', value: report.aql_minor },
              { label: '단가 (CNY)', value: report.unit_price_cny ? `¥${report.unit_price_cny}` : '-' },
              { label: '출하 예정일', value: report.ship_date || '-' },
              { label: '선적항', value: report.port_of_loading || '-' },
              { label: '도착항', value: report.port_of_discharge || '-' },
              { label: 'IP 라이센스', value: report.has_ip_license ? (report.ip_verified ? `✅ 인증됨 (${report.ip_license_no})` : '⚠️ 미인증') : '해당없음' },
              { label: '발행일시', value: report.published_at ? new Date(report.published_at).toLocaleString('ko-KR') : '미발행' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 text-sm">{item.label}</span>
                <span className="text-gray-800 text-sm font-medium text-right">{item.value ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 물류/패킹 정보 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm">📦</span>
            물류 · 패킹 정보
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '박스 입수', value: `${report.box_qty_per_carton ?? '-'}개/박스` },
              { label: '총 박스 수', value: `${report.total_cartons ?? '-'}박스` },
              { label: '총 중량 (G.W.)', value: report.gross_weight_kg ? `${report.gross_weight_kg}kg` : '-' },
              { label: '순 중량 (N.W.)', value: report.net_weight_kg ? `${report.net_weight_kg}kg` : '-' },
              { label: '예상 CBM', value: report.cbm_estimated ? `${report.cbm_estimated}㎥` : '-' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-gray-800">{item.value}</div>
                <div className="text-gray-500 text-xs mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 결함 목록 */}
        {defects.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center text-sm">⚠️</span>
              결함 내역 ({defects.length}건)
              <div className="flex gap-2 ml-auto">
                {defectStats.critical > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">치명 {defectStats.critical}</span>}
                {defectStats.major > 0 && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">주요 {defectStats.major}</span>}
                {defectStats.minor > 0 && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">경미 {defectStats.minor}</span>}
              </div>
            </h2>
            <div className="space-y-4">
              {defects.map((defect) => {
                const gradeConf = GRADE_CONFIG[defect.grade] || GRADE_CONFIG.minor
                const statusConf = STATUS_CONFIG[defect.status] || { label: defect.status, color: 'bg-gray-100 text-gray-700' }
                return (
                  <div key={defect.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm font-mono">#{defect.seq_no}</span>
                        <span className={`px-2 py-0.5 rounded border text-xs font-bold ${gradeConf.color}`}>
                          {gradeConf.label}
                        </span>
                        <span className="font-semibold text-gray-800">{defect.title_ko}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">{defect.affected_qty}개</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusConf.color}`}>{statusConf.label}</span>
                      </div>
                    </div>
                    {defect.title_cn && <p className="text-gray-500 text-sm mb-2">{defect.title_cn}</p>}
                    {defect.description_ko && <p className="text-gray-600 text-sm mb-2">{defect.description_ko}</p>}
                    {defect.action_required && (
                      <div className="bg-blue-50 rounded-lg p-3 mt-2">
                        <p className="text-blue-800 text-sm"><strong>조치 지시:</strong> {defect.action_required}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 안전시험 결과 */}
        {safetyTests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm">🛡️</span>
              안전시험 결과
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 text-gray-600 font-medium">시험 항목</th>
                    <th className="text-left p-3 text-gray-600 font-medium">기준</th>
                    <th className="text-left p-3 text-gray-600 font-medium">측정값</th>
                    <th className="text-center p-3 text-gray-600 font-medium">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {safetyTests.map((test, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{test.test_name_ko}</div>
                        {test.test_name_cn && <div className="text-gray-400 text-xs">{test.test_name_cn}</div>}
                      </td>
                      <td className="p-3 text-gray-600 text-xs">{test.standard}</td>
                      <td className="p-3 text-gray-700">{test.measured_value}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          test.result === 'pass' ? 'bg-green-100 text-green-700' :
                          test.result === 'fail' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {test.result === 'pass' ? '✅ 합격' : test.result === 'fail' ? '❌ 불합격' : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 검수원 총평 */}
        {(report.inspector_comment || report.summary_ko) && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📝</span>
              검수원 총평
            </h2>
            {report.summary_ko && (
              <div className="bg-purple-50 rounded-xl p-4 mb-3">
                <p className="text-sm font-semibold text-purple-700 mb-1">바이어용 요약 (한국어)</p>
                <p className="text-gray-700">{report.summary_ko}</p>
              </div>
            )}
            {report.summary_cn && (
              <div className="bg-orange-50 rounded-xl p-4 mb-3">
                <p className="text-sm font-semibold text-orange-700 mb-1">공장용 요약 (중국어)</p>
                <p className="text-gray-700">{report.summary_cn}</p>
              </div>
            )}
            {report.inspector_comment && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-600 mb-1">내부 메모</p>
                <p className="text-gray-700">{report.inspector_comment}</p>
              </div>
            )}
          </div>
        )}

        {/* 발행 링크 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center text-sm">🔗</span>
            역할별 리포트 링크
          </h2>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-blue-50 rounded-xl">
              <div>
                <p className="font-semibold text-blue-800">🛍️ 바이어 리포트 (한국어)</p>
                <p className="text-blue-600 text-xs mt-0.5">{report.sellers?.business_name || '바이어'} 열람용</p>
              </div>
              <a href={`/seller/inspections/${inspectionId}/report`} target="_blank"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 text-center">
                리포트 열기 →
              </a>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-orange-50 rounded-xl">
              <div>
                <p className="font-semibold text-orange-800">🏭 공장 리포트 (중국어)</p>
                <p className="text-orange-600 text-xs mt-0.5">{report.factories?.company_name || '공장'} 열람용</p>
              </div>
              <a href={`/factory/inspections/${inspectionId}/report`} target="_blank"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 text-center">
                리포트 열기 →
              </a>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-semibold text-gray-800">⚙️ 검수 작업화면</p>
                <p className="text-gray-500 text-xs mt-0.5">데이터 수정 및 9단계 입력</p>
              </div>
              <a href={`/admin/inspections/${inspectionId}/workspace`} target="_blank"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 text-center">
                작업화면 열기 →
              </a>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
