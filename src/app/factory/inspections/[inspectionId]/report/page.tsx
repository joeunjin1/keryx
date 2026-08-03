'use client'

import { useState, useEffect } from 'react'
import { useLangContext } from '@/components/layout/LangContext';
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  net_weight_kg: number
  box_length_cm: number
  box_width_cm: number
  box_height_cm: number
  port_of_loading: string
  port_of_discharge: string
  ship_date: string
  inspector_comment: string
  summary_cn: string
  defect_action: string
  defect_action_notes: string
  published_at: string
  // 승인 관련 필드
  factory_approved_at: string | null
  factory_approved_by: string | null
  factory_approval_note: string | null
  buyer_approved_at: string | null
  payment_released_at: string | null
  factories?: { company_name: string; company_name_ko: string; city: string }
}

interface Defect {
  id: string
  seq_no: number
  grade: 'critical' | 'major' | 'minor'
  title_ko: string
  title_cn: string
  description_ko: string
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

const VERDICT_CN: Record<string, { label: string; color: string; bg: string; border: string; icon: string; action: string }> = {
  pass: { label: '合格', color: 'text-green-800', bg: 'bg-green-50', border: 'border-green-400', icon: '✅', action: '可以出货' },
  conditional_pass: { label: '有条件合格', color: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-400', icon: '⚠️', action: '整改后出货' },
  hold: { label: '暂停出货', color: 'text-orange-800', bg: 'bg-orange-50', border: 'border-orange-400', icon: '⏸️', action: '等待进一步指示' },
  fail: { label: '不合格', color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-400', icon: '❌', action: '禁止出货，需重新生产' },
}

const GRADE_CN: Record<string, { label: string; color: string }> = {
  critical: { label: '致命缺陷', color: 'bg-red-100 text-red-800 border-red-300' },
  major: { label: '主要缺陷', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  minor: { label: '轻微缺陷', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
}

const ACTION_CN: Record<string, string> = {
  rework: '返工后出货',
  sort: '分拣后出货',
  hold: '暂停出货',
  reject: '全部退货',
}

const STAGE_CN: Record<string, string> = {
  PSI: '装运前检验 (PSI)',
  DUPRO: '生产中检验 (DUPRO)',
  PPI: '生产前检验 (PPI)',
  CLC: '装柜监装 (CLC)',
}

export default function FactoryInspectionReportPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const params = useParams()
  const supabase = createClient()
  const inspectionId = params.inspectionId as string

  const [report, setReport] = useState<InspectionReport | null>(null)
  const [defects, setDefects] = useState<Defect[]>([])
  const [safetyTests, setSafetyTests] = useState<SafetyTest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('verdict')

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
      const { data } = await supabase
        .from('inspections')
        .select('*, factories(company_name, company_name_ko, city)')
        .eq('id', inspectionId)
        .single()
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

  const handleApprove = async () => {
    setApproving(true)
    setApproveError('')
    try {
      const res = await fetch(`/api/factory/inspections/${inspectionId}/approve`, {
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
        // 보고서 새로고침
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
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">检验报告加载中...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-600">未找到检验报告</p>
        </div>
      </div>
    )
  }

  const verdict = VERDICT_CN[report.final_verdict as keyof typeof VERDICT_CN] || VERDICT_CN.hold
  const defectStats = {
    critical: defects.filter(d => d.grade === 'critical').length,
    major: defects.filter(d => d.grade === 'major').length,
    minor: defects.filter(d => d.grade === 'minor').length,
  }

  const isApproved = !!report.factory_approved_at
  const bothApproved = !!report.factory_approved_at && !!report.buyer_approved_at
  const paymentReleased = !!report.payment_released_at

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 헤더 (중국어) ── */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-sm">K</div>
            <span className="font-bold text-lg">KERYX</span>
            <span className="text-white/60 text-sm">· 全数检验服务</span>
          </div>

          {/* 판정 결과 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="text-5xl">{verdict.icon}</div>
            <div>
              <p className="text-white/80 text-sm mb-1">最终检验判定</p>
              <h1 className="text-3xl font-black">{verdict.label}</h1>
              <p className="text-white/90 mt-1 font-medium">{verdict.action}</p>
            </div>
          </div>

          {/* 핵심 지표 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{report.pass_rate || 0}%</p>
              <p className="text-xs text-white/80">合格率</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{(report.qty_inspected || 0).toLocaleString()}</p>
              <p className="text-xs text-white/80">检验数量</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{defects.length}</p>
              <p className="text-xs text-white/80">缺陷数量</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{report.inspection_date ? new Date(report.inspection_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '—'}</p>
              <p className="text-xs text-white/80">检验日期</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm overflow-x-auto">
        <div className="max-w-4xl mx-auto px-4 flex">
          {[
            { id: 'verdict', label: '📋 判定结果' },
            { id: 'defects', label: '⚠️ 缺陷清单' },
            { id: 'action', label: '🔧 整改要求' },
            { id: 'safety', label: '🔬 安全测试' },
            { id: 'packing', label: '📦 包装规格' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── 판정 결과 ── */}
        {activeTab === 'verdict' && (
          <>
            {/* 판정 박스 */}
            <div className={`${verdict.bg} border-2 ${verdict.border} rounded-xl p-6`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{verdict.icon}</span>
                <h2 className={`text-xl font-black ${verdict.color}`}>{verdict.label}</h2>
              </div>
              <div className={`text-lg font-bold ${verdict.color} mb-2`}>
                指令：{verdict.action}
              </div>
              {report.summary_cn && (
                <p className="text-gray-700 mt-3 leading-relaxed">{report.summary_cn}</p>
              )}
            </div>

            {/* 제품 기본 정보 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">📦 产品基本信息</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: '产品名称', value: report.product_name_cn || report.product_name_ko },
                  { label: 'SKU / 货号', value: report.sku },
                  { label: 'PO号', value: report.po_number },
                  { label: '检验阶段', value: STAGE_CN[report.inspection_stage] || report.inspection_stage },
                  { label: '检验日期', value: report.inspection_date ? new Date(report.inspection_date).toLocaleDateString('zh-CN') : '—' },
                  { label: '工厂名称', value: (report.factories as any)?.company_name_ko || (report.factories as any)?.company_name || '—' },
                  { label: '工厂城市', value: report.factories?.city || '—' },
                  { label: '单价 (CNY)', value: report.unit_price_cny ? `¥${report.unit_price_cny}` : '—' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-gray-800">{item.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 수량 현황 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">📊 数量统计</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: '订单数量', value: report.qty_ordered, color: 'text-gray-800' },
                  { label: '检验数量', value: report.qty_inspected, color: 'text-blue-700' },
                  { label: '合格数量', value: report.qty_passed, color: 'text-green-700' },
                  { label: '不合格数量', value: report.qty_failed, color: 'text-red-700' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-4 text-center border">
                    <p className={`text-2xl font-black ${item.color}`}>{(item.value || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">合格率</span>
                  <span className="text-lg font-black text-green-700">{report.pass_rate || 0}%</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(report.pass_rate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 결제 금액 (있을 경우) */}
            {report.payment_amount_cny && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h3 className="font-bold text-blue-800 mb-3">💰 结算金额</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">本次检验结算金额</span>
                  <span className="text-2xl font-black text-blue-800">¥{report.payment_amount_cny.toLocaleString()}</span>
                </div>
                {paymentReleased && (
                  <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                    <span>✅</span>
                    <span className="text-sm font-medium">
                      款项已释放 · {report.payment_released_at ? new Date(report.payment_released_at).toLocaleDateString('zh-CN') : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── 결함 목록 ── */}
        {activeTab === 'defects' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 mb-4">⚠️ 缺陷清单</h3>

            {/* 결함 통계 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: '致命缺陷', count: defectStats.critical, color: 'bg-red-50 border-red-200 text-red-800' },
                { label: '主要缺陷', count: defectStats.major, color: 'bg-orange-50 border-orange-200 text-orange-800' },
                { label: '轻微缺陷', count: defectStats.minor, color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
              ].map(item => (
                <div key={item.label} className={`${item.color} border rounded-lg p-3 text-center`}>
                  <p className="text-2xl font-black">{item.count}</p>
                  <p className="text-xs mt-1">{item.label}</p>
                </div>
              ))}
            </div>

            {defects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无缺陷记录</p>
            ) : (
              <div className="space-y-3">
                {defects.map((defect, index) => {
                  const grade = GRADE_CN[defect.grade] || { label: defect.grade, color: 'bg-gray-100 text-gray-800 border-gray-300' }
                  return (
                    <div key={defect.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400">#{index + 1}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${grade.color}`}>{grade.label}</span>
                          </div>
                          <p className="font-medium text-gray-800">{defect.title_cn || defect.title_ko}</p>
                          {defect.description_ko && (
                            <p className="text-sm text-gray-500 mt-1">{defect.description_ko}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-red-700">{defect.affected_qty}</p>
                          <p className="text-xs text-gray-400">件</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 정개 요구 ── */}
        {activeTab === 'action' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 mb-4">🔧 整改要求</h3>
            {report.defect_action ? (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <p className="font-bold text-orange-800 text-lg">{ACTION_CN[report.defect_action] || report.defect_action}</p>
                </div>
                {report.defect_action_notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{report.defect_action_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">暂无整改要求</p>
            )}
            {report.inspector_comment && (
              <div className="mt-4">
                <h4 className="font-bold text-gray-700 mb-2">检验员备注</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{report.inspector_comment}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 안전 시험 ── */}
        {activeTab === 'safety' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 mb-4">🔬 安全测试结果</h3>
            {safetyTests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无安全测试数据</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 font-medium text-gray-700">测试项目</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">标准规格</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">测量值</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safetyTests.map((test, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="font-medium">{test.test_name_cn}</div>
                          <div className="text-xs text-gray-400">{test.test_name_ko}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">{test.standard}</td>
                        <td className="px-3 py-3 text-sm">{test.measured_value || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            test.result === 'pass' ? 'bg-green-100 text-green-800' :
                            test.result === 'fail' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {test.result === 'pass' ? '✅ 合格' : test.result === 'fail' ? '❌ 不合格' : '— N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 포장 규격 ── */}
        {activeTab === 'packing' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-800 mb-4">📦 包装规格要求</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '每箱数量', value: `${report.box_qty_per_carton || 0} 件/箱` },
                { label: '总箱数', value: `${report.total_cartons || 0} 箱` },
                { label: '毛重', value: `${report.gross_weight_kg || 0} kg` },
                { label: '净重', value: `${report.net_weight_kg || 0} kg` },
                { label: '箱子尺寸 (长)', value: `${report.box_length_cm || 0} cm` },
                { label: '箱子尺寸 (宽)', value: `${report.box_width_cm || 0} cm` },
                { label: '箱子尺寸 (高)', value: `${report.box_height_cm || 0} cm` },
                { label: '预计体积 (CBM)', value: `${report.cbm_estimated || 0} CBM` },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="font-bold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
            {/* 포장 체크리스트 */}
            <div className="mt-6">
              <h4 className="font-bold text-gray-700 mb-3">包装检验要求清单</h4>
              <div className="space-y-2">
                {[
                  '条形码/二维码准确无误',
                  '中文标签内容正确',
                  '包装箱完好无损',
                  '内部缓冲材料到位',
                  '产品固定牢固',
                  '数量与装箱单一致',
                  '外观清洁整齐',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                    <span className="w-5 h-5 rounded border-2 border-blue-400 flex items-center justify-center text-blue-600 text-xs flex-shrink-0">✓</span>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 승인 섹션 ── */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gray-800 text-white px-6 py-4">
            <h3 className="font-bold text-lg">✍️ 工厂验收确认</h3>
            <p className="text-gray-300 text-sm mt-1">请确认检验报告内容，并完成验收签署</p>
          </div>
          <div className="p-6">
            {/* 승인 상태 표시 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* 공장 승인 상태 */}
              <div className={`rounded-xl border-2 p-4 ${isApproved ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{isApproved ? '✅' : '⏳'}</span>
                  <span className="font-bold text-gray-800">工厂确认</span>
                </div>
                {isApproved ? (
                  <>
                    <p className="text-green-700 font-medium text-sm">已确认验收</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {report.factory_approved_by} · {new Date(report.factory_approved_at!).toLocaleDateString('zh-CN')}
                    </p>
                    {report.factory_approval_note && (
                      <p className="text-gray-600 text-xs mt-2 bg-white rounded p-2 border">{report.factory_approval_note}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">等待工厂确认</p>
                )}
              </div>

              {/* 바이어 승인 상태 */}
              <div className={`rounded-xl border-2 p-4 ${report.buyer_approved_at ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{report.buyer_approved_at ? '✅' : '⏳'}</span>
                  <span className="font-bold text-gray-800">买家确认</span>
                </div>
                {report.buyer_approved_at ? (
                  <>
                    <p className="text-blue-700 font-medium text-sm">已确认验收</p>
                    <p className="text-gray-500 text-xs mt-1">{new Date(report.buyer_approved_at).toLocaleDateString('zh-CN')}</p>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">等待买家确认</p>
                )}
              </div>
            </div>

            {/* 정산 상태 */}
            {bothApproved && (
              <div className={`rounded-xl p-4 mb-6 ${paymentReleased ? 'bg-green-100 border border-green-300' : 'bg-yellow-50 border border-yellow-300'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{paymentReleased ? '💰' : '🔄'}</span>
                  <div>
                    <p className={`font-bold ${paymentReleased ? 'text-green-800' : 'text-yellow-800'}`}>
                      {paymentReleased ? '款项已释放' : '双方已确认 · 款项处理中'}
                    </p>
                    {paymentReleased && report.payment_released_at && (
                      <p className="text-green-600 text-sm">{new Date(report.payment_released_at).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 승인 버튼 */}
            {!isApproved ? (
              <button
                onClick={() => setShowApprovalModal(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
              >
                确认验收 (검수 확인)
              </button>
            ) : (
              <div className="text-center py-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-green-700 font-bold">✅ 已完成验收确认</p>
                <p className="text-green-600 text-sm mt-1">
                  {report.factory_approved_at ? new Date(report.factory_approved_at).toLocaleString('zh-CN') : ''}
                </p>
              </div>
            )}

            {approveSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-medium">✅ 验收确认成功！</p>
              </div>
            )}
          </div>
        </div>

        {/* 발행 정보 */}
        <div className="text-center text-xs text-gray-400 py-4 border-t">
          <p>KERYX 全数检验服务 · 报告编号: {report.inspection_no}</p>
          <p className="mt-1">发布日期: {report.published_at ? new Date(report.published_at).toLocaleDateString('zh-CN') : '—'}</p>
        </div>
      </div>

      {/* ── 승인 모달 ── */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-orange-600 text-white px-6 py-4 rounded-t-2xl">
              <h3 className="font-bold text-lg">确认验收签署</h3>
              <p className="text-orange-100 text-sm mt-1">请确认您已阅读并同意检验报告内容</p>
            </div>
            <div className="p-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-800 font-medium">验收确认说明</p>
                <ul className="text-sm text-orange-700 mt-2 space-y-1">
                  <li>· 确认检验报告内容真实准确</li>
                  <li>· 同意按报告结果进行结算</li>
                  <li>· 买家确认后款项将自动释放</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注 (선택사항)
                </label>
                <textarea
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  placeholder="如有特殊说明，请在此填写..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                  取消
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {approving ? '처리 중...' : '✅ 确认验收'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
