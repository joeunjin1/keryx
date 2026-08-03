'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLangContext } from '@/components/layout/LangContext';
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 정의 ───────────────────────────────────────────────
interface Defect {
  id?: string
  seq_no: number
  grade: 'critical' | 'major' | 'minor'
  title_ko: string
  title_cn: string
  description_ko: string
  affected_qty: number
  photo_url: string
  action_required: string
  status: string
}

interface SafetyTest {
  id?: string
  test_name_ko: string
  test_name_cn: string
  standard: string
  measured_value: string
  result: 'pass' | 'fail' | 'na'
  notes: string
}

interface InspectionData {
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
  qty_produced: number
  qty_inspected: number
  qty_approved: number
  qty_received: number
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
  box_length_cm: number
  box_width_cm: number
  box_height_cm: number
  port_of_loading: string
  port_of_discharge: string
  ship_date: string
  has_ip_license: boolean
  ip_license_no: string
  ip_license_valid_until: string
  ip_verified: boolean
  ip_verification_notes: string
  inspector_comment: string
  summary_ko: string
  summary_cn: string
  defect_action: string
  defect_action_notes: string
  completion_pct: number
  factory_id: string
  seller_id: string
}

// ─── 상수 ────────────────────────────────────────────────────
const TABS = [
  { id: 1, label: '기본정보', icon: '📋', label_cn: '基本信息' },
  { id: 2, label: '수량확인', icon: '🔢', label_cn: '数量确认' },
  { id: 3, label: 'AQL기준', icon: '📐', label_cn: 'AQL标准' },
  { id: 4, label: '결함기록', icon: '⚠️', label_cn: '缺陷记录' },
  { id: 5, label: '안전시험', icon: '🔬', label_cn: '安全测试' },
  { id: 6, label: '포장검수', icon: '📦', label_cn: '包装检验' },
  { id: 7, label: 'IP확인', icon: '🏷️', label_cn: 'IP验证' },
  { id: 8, label: '종합판정', icon: '✅', label_cn: '综合判定' },
  { id: 9, label: '리포트발행', icon: '📤', label_cn: '报告发布' },
]

const GRADE_CONFIG = {
  critical: { label: '치명적', label_cn: '致命缺陷', color: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
  major: { label: '주요', label_cn: '主要缺陷', color: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' },
  minor: { label: '경미', label_cn: '轻微缺陷', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
}

const VERDICT_CONFIG = {
  PASS: { label: '합격', label_cn: '合格', color: 'bg-green-100 text-green-800 border-green-400', icon: '✅' },
  CONDITIONAL: { label: '조건부합격', label_cn: '有条件合格', color: 'bg-yellow-100 text-yellow-800 border-yellow-400', icon: '⚠️' },
  HOLD: { label: '보류', label_cn: '暂停', color: 'bg-orange-100 text-orange-800 border-orange-400', icon: '⏸️' },
  FAIL: { label: '불합격', label_cn: '不合格', color: 'bg-red-100 text-red-800 border-red-400', icon: '❌' },
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export default function InspectionWorkspacePage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const inspectionId = params.inspectionId as string

  const [activeTab, setActiveTab] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Partial<InspectionData>>({})
  const [defects, setDefects] = useState<Defect[]>([])
  const [safetyTests, setSafetyTests] = useState<SafetyTest[]>([
    { test_name_ko: '소형 부품 테스트', test_name_cn: '小零件测试', standard: 'EN71-1', measured_value: '', result: 'na', notes: '' },
    { test_name_ko: '납 함량 검사', test_name_cn: '铅含量检测', standard: 'ASTM F963', measured_value: '', result: 'na', notes: '' },
    { test_name_ko: '프탈레이트 검사', test_name_cn: '邻苯二甲酸酯检测', standard: 'EN71-9', measured_value: '', result: 'na', notes: '' },
    { test_name_ko: '인화성 테스트', test_name_cn: '可燃性测试', standard: 'EN71-2', measured_value: '', result: 'na', notes: '' },
    { test_name_ko: '날카로운 모서리 검사', test_name_cn: '锋利边角检测', standard: 'EN71-1', measured_value: '', result: 'na', notes: '' },
  ])
  const [publishTargets, setPublishTargets] = useState({
    buyer: true,
    factory: true,
    md: true,
    admin: true,
  })

  // ─── 데이터 로드 ──────────────────────────────────────────
  useEffect(() => {
    loadInspection()
  }, [inspectionId])

  const loadInspection = async () => {
    setLoading(true)
    try {
      const { data: insp, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspectionId)
        .single()

      if (error) throw error
      setData(insp || {})

      // 결함 로드
      const { data: defectData } = await supabase
        .from('inspection_defects')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('seq_no')
      if (defectData) setDefects(defectData)

      // 안전시험 로드
      const { data: safetyData } = await supabase
        .from('inspection_safety_tests')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('display_order')
      if (safetyData && safetyData.length > 0) setSafetyTests(safetyData)
    } catch (err) {
      console.error('검수 데이터 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── 자동 저장 ────────────────────────────────────────────
  const saveData = useCallback(async (updates: Partial<InspectionData>) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('inspections')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', inspectionId)
      if (error) throw error
      setData(prev => ({ ...prev, ...updates }))
    } catch (err) {
      console.error('저장 실패:', err)
    } finally {
      setSaving(false)
    }
  }, [inspectionId, supabase])

  // ─── 결함 추가 ────────────────────────────────────────────
  const addDefect = () => {
    const newDefect: Defect = {
      seq_no: defects.length + 1,
      grade: 'major',
      title_ko: '',
      title_cn: '',
      description_ko: '',
      affected_qty: 0,
      photo_url: '',
      action_required: 'rework',
      status: 'open',
    }
    setDefects(prev => [...prev, newDefect])
  }

  const saveDefect = async (defect: Defect, index: number) => {
    try {
      if (defect.id) {
        await supabase.from('inspection_defects').update(defect).eq('id', defect.id)
      } else {
        const { data: saved } = await supabase
          .from('inspection_defects')
          .insert({ ...defect, inspection_id: inspectionId })
          .select()
          .single()
        if (saved) {
          const updated = [...defects]
          updated[index] = saved
          setDefects(updated)
        }
      }
    } catch (err) {
      console.error('결함 저장 실패:', err)
    }
  }

  const removeDefect = async (index: number) => {
    const defect = defects[index]
    if (defect.id) {
      await supabase.from('inspection_defects').delete().eq('id', defect.id)
    }
    setDefects(prev => prev.filter((_, i) => i !== index))
  }

  // ─── 리포트 발행 ──────────────────────────────────────────
  const publishReport = async () => {
    setSaving(true)
    try {
      // 1. 검수 상태를 published로 변경
      await supabase.from('inspections').update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', inspectionId)

      // 2. 발행 이력 생성 (각 대상별)
      const targets = Object.entries(publishTargets)
        .filter(([, v]) => v)
        .map(([k]) => ({
          inspection_id: inspectionId,
          version_type: k === 'buyer' ? 'buyer' : k === 'factory' ? 'factory' : 'inspector',
          recipient_type: k,
          share_token: Math.random().toString(36).substring(2, 15),
          status: 'active',
        }))

      if (targets.length > 0) {
        await supabase.from('inspection_publish_history').insert(targets)
      }

      // 3. 활동 로그
      await supabase.from('inspection_activity_log').insert({
        inspection_id: inspectionId,
        user_type: 'admin',
        action: 'published',
        description_ko: `검수 리포트 발행 완료 (${targets.map(t => t.recipient_type).join(', ')})`,
        description_cn: `检验报告发布完成`,
      })

      alert('리포트가 발행되었습니다!')
      router.push(`/admin/inspections/${inspectionId}`)
    } catch (err) {
      console.error('발행 실패:', err)
      alert('발행 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ─── 완료율 계산 ──────────────────────────────────────────
  const calcCompletion = () => {
    let score = 0
    if (data.product_name_ko) score += 10
    if (data.inspection_date) score += 10
    if (data.qty_inspected) score += 15
    if (data.pass_rate !== undefined) score += 15
    if (defects.length > 0) score += 15
    if (safetyTests.some(t => t.result !== 'na')) score += 10
    if (data.inspector_comment) score += 10
    if (data.final_verdict) score += 15
    return Math.min(score, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">검수 데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  const completion = calcCompletion()
  const defectStats = {
    critical: defects.filter(d => d.grade === 'critical').length,
    major: defects.filter(d => d.grade === 'major').length,
    minor: defects.filter(d => d.grade === 'minor').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 상단 헤더 ── */}
      <div className="bg-gradient-to-r from-purple-700 to-blue-600 text-white px-4 py-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/80 hover:text-white text-sm">← 뒤로</button>
            <div>
              <h1 className="text-lg font-bold">🔍 검수 작업화면</h1>
              <p className="text-xs text-white/70">{data.inspection_no} · {data.product_name_ko}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 언어 전환 */}
            <div className="flex bg-white/20 rounded-lg overflow-hidden text-sm">
              <button  className={`px-3 py-1 ${lang === 'ko' ? 'bg-white text-purple-700 font-bold' : 'text-white'}`}>한국어</button>
              <button  className={`px-3 py-1 ${lang === 'zh' ? 'bg-white text-purple-700 font-bold' : 'text-white'}`}>中文</button>
            </div>
            {/* 완료율 */}
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
              <div className="w-20 bg-white/30 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${completion}%` }} />
              </div>
              <span className="text-sm font-bold">{completion}%</span>
            </div>
            {/* 저장 상태 */}
            {saving && <span className="text-xs text-white/70 animate-pulse">저장 중...</span>}
            {/* 상태 뱃지 */}
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              data.status === 'published' ? 'bg-green-400 text-green-900' :
              data.status === 'in_progress' ? 'bg-yellow-400 text-yellow-900' :
              'bg-gray-400 text-gray-900'
            }`}>
              {data.status === 'published' ? '발행완료' : data.status === 'in_progress' ? '작업중' : '초안'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 탭 네비게이션 ── */}
      <div className="bg-white border-b shadow-sm sticky top-[72px] z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-3 text-xs font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-700 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base mb-0.5">{tab.icon}</span>
              <span>{lang === 'ko' ? tab.label : tab.label_cn}</span>
              <span className="text-[10px] text-gray-400">{tab.id}/9</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 결함 요약 배너 ── */}
      {(defectStats.critical > 0 || defectStats.major > 0 || defectStats.minor > 0) && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-4 text-sm">
            <span className="font-medium text-orange-800">⚠️ 결함 현황:</span>
            {defectStats.critical > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">치명 {defectStats.critical}건</span>}
            {defectStats.major > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">주요 {defectStats.major}건</span>}
            {defectStats.minor > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">경미 {defectStats.minor}건</span>}
          </div>
        </div>
      )}

      {/* ── 탭 콘텐츠 ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ─── TAB 1: 기본정보 ─── */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                📋 {lang === 'ko' ? '검수 기본 정보' : '检验基本信息'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">검수번호</label>
                  <input value={data.inspection_no || ''} readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">검수 단계</label>
                  <select
                    value={data.inspection_stage || 'PSI'}
                    onChange={e => saveData({ inspection_stage: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="PSI">PSI - 선적전 검수</option>
                    <option value="DUPRO">DUPRO - 생산중 검수</option>
                    <option value="PPI">PPI - 생산전 검수</option>
                    <option value="CLC">CLC - 컨테이너 적재 확인</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">검수일자</label>
                  <input
                    type="date"
                    value={data.inspection_date || ''}
                    onChange={e => saveData({ inspection_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제품명 (한국어)</label>
                  <input
                    value={data.product_name_ko || ''}
                    onChange={e => saveData({ product_name_ko: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="한국어 제품명"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제품명 (중국어)</label>
                  <input
                    value={data.product_name_cn || ''}
                    onChange={e => saveData({ product_name_cn: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="中文产品名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU / 품번</label>
                  <input
                    value={data.sku || ''}
                    onChange={e => saveData({ sku: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO 번호</label>
                  <input
                    value={data.po_number || ''}
                    onChange={e => saveData({ po_number: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="PO-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">단가 (CNY)</label>
                  <input
                    type="number"
                    value={data.unit_price_cny || ''}
                    onChange={e => saveData({ unit_price_cny: parseFloat(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">선적일자</label>
                  <input
                    type="date"
                    value={data.ship_date || ''}
                    onChange={e => saveData({ ship_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* 물류 정보 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">📦 {lang === 'ko' ? '물류 / 포장 정보' : '物流/包装信息'}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { key: 'box_qty_per_carton', label: '박스당 입수', type: 'number' },
                  { key: 'total_cartons', label: '총 박스 수', type: 'number' },
                  { key: 'gross_weight_kg', label: '총중량(kg)', type: 'number' },
                  { key: 'net_weight_kg', label: '순중량(kg)', type: 'number' },
                  { key: 'box_length_cm', label: '박스 길이(cm)', type: 'number' },
                  { key: 'box_width_cm', label: '박스 너비(cm)', type: 'number' },
                  { key: 'box_height_cm', label: '박스 높이(cm)', type: 'number' },
                  { key: 'cbm_estimated', label: '예상 CBM', type: 'number' },
                  { key: 'port_of_loading', label: '선적항', type: 'text' },
                  { key: 'port_of_discharge', label: '도착항', type: 'text' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                    <input
                      type={field.type}
                      value={(data as Record<string, unknown>)[field.key] as string || ''}
                      onChange={e => saveData({ [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value } as Partial<InspectionData>)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: 수량 확인 ─── */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-6">🔢 {lang === 'ko' ? '수량 확인' : '数量确认'}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[
                  { key: 'qty_ordered', label: '주문 수량', label_cn: '订单数量', color: 'blue' },
                  { key: 'qty_produced', label: '생산 수량', label_cn: '生产数量', color: 'indigo' },
                  { key: 'qty_received', label: '입고 수량', label_cn: '入库数量', color: 'purple' },
                  { key: 'qty_inspected', label: '검수 수량', label_cn: '检验数量', color: 'violet' },
                  { key: 'qty_passed', label: '합격 수량', label_cn: '合格数量', color: 'green' },
                  { key: 'qty_failed', label: '불합격 수량', label_cn: '不合格数量', color: 'red' },
                ].map(field => (
                  <div key={field.key} className={`bg-${field.color}-50 border border-${field.color}-200 rounded-xl p-4`}>
                    <label className={`block text-sm font-medium text-${field.color}-700 mb-2`}>
                      {lang === 'ko' ? field.label : field.label_cn}
                    </label>
                    <input
                      type="number"
                      value={(data as Record<string, unknown>)[field.key] as number || ''}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0
                        const updates: Partial<InspectionData> = { [field.key]: val } as Partial<InspectionData>
                        // 합격률 자동 계산
                        if (field.key === 'qty_passed' || field.key === 'qty_inspected') {
                          const inspected = field.key === 'qty_inspected' ? val : (data.qty_inspected || 0)
                          const passed = field.key === 'qty_passed' ? val : (data.qty_passed || 0)
                          if (inspected > 0) {
                            updates.pass_rate = Math.round((passed / inspected) * 100 * 10) / 10
                          }
                        }
                        saveData(updates)
                      }}
                      className={`w-full text-2xl font-bold text-${field.color}-800 bg-transparent border-b-2 border-${field.color}-300 focus:border-${field.color}-600 outline-none py-1`}
                    />
                    <span className={`text-xs text-${field.color}-500`}>개 (EA)</span>
                  </div>
                ))}
              </div>

              {/* 합격률 표시 */}
              <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">{lang === 'ko' ? '전체 합격률' : '整体合格率'}</p>
                <p className={`text-5xl font-black ${
                  (data.pass_rate || 0) >= 95 ? 'text-green-600' :
                  (data.pass_rate || 0) >= 80 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {data.pass_rate || 0}%
                </p>
                <div className="mt-3 bg-gray-200 rounded-full h-3 max-w-xs mx-auto">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      (data.pass_rate || 0) >= 95 ? 'bg-green-500' :
                      (data.pass_rate || 0) >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${data.pass_rate || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {(data.pass_rate || 0) >= 95 ? '✅ 우수 - 합격 기준 충족' :
                   (data.pass_rate || 0) >= 80 ? '⚠️ 주의 - 조건부 합격 검토 필요' :
                   '❌ 불량 - 재검수 또는 불합격 처리 필요'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: AQL 기준 ─── */}
        {activeTab === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📐 {lang === 'ko' ? 'AQL 검수 기준' : 'AQL检验标准'}</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
                <strong>AQL (Acceptable Quality Level)</strong>이란 허용 가능한 최대 불량률 기준입니다.
                일반적으로 주요 결함 2.5%, 경미 결함 4.0%를 적용합니다.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                  <label className="block text-sm font-bold text-orange-800 mb-3">
                    주요 결함 AQL (Major Defects)
                  </label>
                  <select
                    value={data.aql_major || 2.5}
                    onChange={e => saveData({ aql_major: parseFloat(e.target.value) })}
                    className="w-full border border-orange-300 rounded-lg px-3 py-2 text-lg font-bold text-orange-800 bg-white"
                  >
                    <option value={1.0}>1.0% (엄격)</option>
                    <option value={1.5}>1.5%</option>
                    <option value={2.5}>2.5% (표준)</option>
                    <option value={4.0}>4.0%</option>
                    <option value={6.5}>6.5% (완화)</option>
                  </select>
                  <p className="text-xs text-orange-600 mt-2">현재 불량률: {defectStats.major}건 / {data.qty_inspected || 0}개</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                  <label className="block text-sm font-bold text-yellow-800 mb-3">
                    경미 결함 AQL (Minor Defects)
                  </label>
                  <select
                    value={data.aql_minor || 4.0}
                    onChange={e => saveData({ aql_minor: parseFloat(e.target.value) })}
                    className="w-full border border-yellow-300 rounded-lg px-3 py-2 text-lg font-bold text-yellow-800 bg-white"
                  >
                    <option value={2.5}>2.5%</option>
                    <option value={4.0}>4.0% (표준)</option>
                    <option value={6.5}>6.5%</option>
                    <option value={10.0}>10.0% (완화)</option>
                  </select>
                  <p className="text-xs text-yellow-600 mt-2">현재 불량률: {defectStats.minor}건 / {data.qty_inspected || 0}개</p>
                </div>
              </div>

              {/* AQL 판정 결과 */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className={`rounded-xl p-4 text-center border-2 ${
                  data.qty_inspected && defectStats.major / data.qty_inspected * 100 <= (data.aql_major || 2.5)
                    ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                }`}>
                  <p className="text-sm font-medium text-gray-700 mb-1">주요 결함 AQL 판정</p>
                  <p className={`text-2xl font-black ${
                    data.qty_inspected && defectStats.major / data.qty_inspected * 100 <= (data.aql_major || 2.5)
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.qty_inspected && defectStats.major / data.qty_inspected * 100 <= (data.aql_major || 2.5) ? 'PASS' : 'FAIL'}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center border-2 ${
                  data.qty_inspected && defectStats.minor / data.qty_inspected * 100 <= (data.aql_minor || 4.0)
                    ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                }`}>
                  <p className="text-sm font-medium text-gray-700 mb-1">경미 결함 AQL 판정</p>
                  <p className={`text-2xl font-black ${
                    data.qty_inspected && defectStats.minor / data.qty_inspected * 100 <= (data.aql_minor || 4.0)
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.qty_inspected && defectStats.minor / data.qty_inspected * 100 <= (data.aql_minor || 4.0) ? 'PASS' : 'FAIL'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: 결함 기록 ─── */}
        {activeTab === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">⚠️ {lang === 'ko' ? '결함 기록' : '缺陷记录'}</h2>
              <button
                onClick={addDefect}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
              >
                + {lang === 'ko' ? '결함 추가' : '添加缺陷'}
              </button>
            </div>

            {defects.length === 0 && (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-medium">{lang === 'ko' ? '등록된 결함이 없습니다' : '暂无缺陷记录'}</p>
                <p className="text-sm mt-1">{lang === 'ko' ? '결함 발견 시 위 버튼으로 추가하세요' : '发现缺陷时请点击上方按钮添加'}</p>
              </div>
            )}

            {defects.map((defect, index) => (
              <div key={index} className={`bg-white rounded-xl border-2 p-5 ${
                defect.grade === 'critical' ? 'border-red-300' :
                defect.grade === 'major' ? 'border-orange-300' : 'border-yellow-300'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-bold">#{index + 1}</span>
                    <select
                      value={defect.grade}
                      onChange={e => {
                        const updated = [...defects]
                        updated[index] = { ...defect, grade: e.target.value as 'critical' | 'major' | 'minor' }
                        setDefects(updated)
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-bold border ${GRADE_CONFIG[defect.grade].color}`}
                    >
                      <option value="critical">🔴 치명적 (Critical)</option>
                      <option value="major">🟠 주요 (Major)</option>
                      <option value="minor">🟡 경미 (Minor)</option>
                    </select>
                  </div>
                  <button onClick={() => removeDefect(index)} className="text-gray-400 hover:text-red-500 text-sm">삭제</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">결함명 (한국어)</label>
                    <input
                      value={defect.title_ko}
                      onChange={e => {
                        const updated = [...defects]
                        updated[index] = { ...defect, title_ko: e.target.value }
                        setDefects(updated)
                      }}
                      onBlur={() => saveDefect(defects[index], index)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      placeholder="예: 인쇄 번짐"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">缺陷名称 (中文)</label>
                    <input
                      value={defect.title_cn}
                      onChange={e => {
                        const updated = [...defects]
                        updated[index] = { ...defect, title_cn: e.target.value }
                        setDefects(updated)
                      }}
                      onBlur={() => saveDefect(defects[index], index)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      placeholder="例：印刷模糊"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">상세 설명</label>
                    <textarea
                      value={defect.description_ko}
                      onChange={e => {
                        const updated = [...defects]
                        updated[index] = { ...defect, description_ko: e.target.value }
                        setDefects(updated)
                      }}
                      onBlur={() => saveDefect(defects[index], index)}
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      placeholder="결함 상세 내용"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">영향 수량</label>
                      <input
                        type="number"
                        value={defect.affected_qty}
                        onChange={e => {
                          const updated = [...defects]
                          updated[index] = { ...defect, affected_qty: parseInt(e.target.value) || 0 }
                          setDefects(updated)
                        }}
                        onBlur={() => saveDefect(defects[index], index)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">조치 방법</label>
                      <select
                        value={defect.action_required}
                        onChange={e => {
                          const updated = [...defects]
                          updated[index] = { ...defect, action_required: e.target.value }
                          setDefects(updated)
                          saveDefect(updated[index], index)
                        }}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="rework">재작업</option>
                        <option value="clean">세척/청소</option>
                        <option value="replace">교체</option>
                        <option value="discard">폐기</option>
                        <option value="accept">수용</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB 5: 안전 시험 ─── */}
        {activeTab === 5 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔬 {lang === 'ko' ? '안전 시험 결과' : '安全测试结果'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-700">시험 항목</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">기준 규격</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">측정값</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">결과</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {safetyTests.map((test, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{lang === 'ko' ? test.test_name_ko : test.test_name_cn}</div>
                        <div className="text-xs text-gray-400">{lang === 'ko' ? test.test_name_cn : test.test_name_ko}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={test.standard}
                          onChange={e => {
                            const updated = [...safetyTests]
                            updated[index] = { ...test, standard: e.target.value }
                            setSafetyTests(updated)
                          }}
                          className="border rounded px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={test.measured_value}
                          onChange={e => {
                            const updated = [...safetyTests]
                            updated[index] = { ...test, measured_value: e.target.value }
                            setSafetyTests(updated)
                          }}
                          className="border rounded px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-purple-500"
                          placeholder="측정값"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={test.result}
                          onChange={e => {
                            const updated = [...safetyTests]
                            updated[index] = { ...test, result: e.target.value as 'pass' | 'fail' | 'na' }
                            setSafetyTests(updated)
                          }}
                          className={`px-2 py-1 rounded text-xs font-bold border ${
                            test.result === 'pass' ? 'bg-green-100 text-green-800 border-green-300' :
                            test.result === 'fail' ? 'bg-red-100 text-red-800 border-red-300' :
                            'bg-gray-100 text-gray-600 border-gray-300'
                          }`}
                        >
                          <option value="pass">✅ 합격</option>
                          <option value="fail">❌ 불합격</option>
                          <option value="na">— 해당없음</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={test.notes}
                          onChange={e => {
                            const updated = [...safetyTests]
                            updated[index] = { ...test, notes: e.target.value }
                            setSafetyTests(updated)
                          }}
                          className="border rounded px-2 py-1 text-xs w-32 focus:ring-1 focus:ring-purple-500"
                          placeholder="비고"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={async () => {
                for (const test of safetyTests) {
                  if (test.id) {
                    await supabase.from('inspection_safety_tests').update(test).eq('id', test.id)
                  } else {
                    await supabase.from('inspection_safety_tests').insert({ ...test, inspection_id: inspectionId })
                  }
                }
                alert('안전시험 결과가 저장되었습니다.')
              }}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              💾 안전시험 결과 저장
            </button>
          </div>
        )}

        {/* ─── TAB 6: 포장 검수 ─── */}
        {activeTab === 6 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">📦 {lang === 'ko' ? '포장 검수' : '包装检验'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: '바코드 / QR코드 정확성', key: 'pkg_barcode' },
                { label: '라벨 내용 정확성 (한국어)', key: 'pkg_label_ko' },
                { label: '라벨 내용 정확성 (중국어)', key: 'pkg_label_cn' },
                { label: '포장 박스 상태', key: 'pkg_box_condition' },
                { label: '내부 완충재 상태', key: 'pkg_cushion' },
                { label: '제품 고정 상태', key: 'pkg_fixing' },
                { label: '수량 일치 여부', key: 'pkg_qty_match' },
                { label: '외관 청결 상태', key: 'pkg_cleanliness' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <div className="flex gap-2">
                    {['pass', 'fail', 'na'].map(val => (
                      <button
                        key={val}
                        className={`px-3 py-1 rounded text-xs font-bold border transition-all ${
                          val === 'pass' ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' :
                          val === 'fail' ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' :
                          'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {val === 'pass' ? '✅ 합격' : val === 'fail' ? '❌ 불합격' : '— N/A'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 7: IP 확인 ─── */}
        {activeTab === 7 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">🏷️ {lang === 'ko' ? 'IP 라이센스 확인' : 'IP授权验证'}</h2>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-sm text-purple-800">
              IP 상품의 경우 라이센서의 정품 인증 여부를 반드시 확인해야 합니다.
              라이센스 번호, 유효기간, 사용 영역을 검토하세요.
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-700 w-40">IP 상품 여부</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => saveData({ has_ip_license: true })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${data.has_ip_license ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    ✅ IP 상품
                  </button>
                  <button
                    onClick={() => saveData({ has_ip_license: false })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${!data.has_ip_license ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-600 border-gray-300'}`}
                  >
                    일반 상품
                  </button>
                </div>
              </div>
              {data.has_ip_license && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">라이센스 번호</label>
                      <input
                        value={data.ip_license_no || ''}
                        onChange={e => saveData({ ip_license_no: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="LIC-2026-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">라이센스 유효기간</label>
                      <input
                        type="date"
                        value={data.ip_license_valid_until || ''}
                        onChange={e => saveData({ ip_license_valid_until: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <label className="text-sm font-medium text-gray-700 w-40">IP 검증 결과</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => saveData({ ip_verified: true })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border ${data.ip_verified ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300'}`}
                      >
                        ✅ 검증 완료
                      </button>
                      <button
                        onClick={() => saveData({ ip_verified: false })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border ${data.ip_verified === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300'}`}
                      >
                        ❌ 검증 실패
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP 검증 비고</label>
                    <textarea
                      value={data.ip_verification_notes || ''}
                      onChange={e => saveData({ ip_verification_notes: e.target.value })}
                      rows={3}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      placeholder="IP 검증 관련 특이사항을 입력하세요"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 8: 종합 판정 ─── */}
        {activeTab === 8 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-6">✅ {lang === 'ko' ? '종합 판정' : '综合判定'}</h2>

              {/* 판정 선택 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {Object.entries(VERDICT_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => saveData({ final_verdict: key })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      data.final_verdict === key
                        ? `${config.color} border-current scale-105 shadow-md`
                        : 'bg-gray-50 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-3xl mb-2">{config.icon}</div>
                    <div className="font-bold text-sm">{lang === 'ko' ? config.label : config.label_cn}</div>
                  </button>
                ))}
              </div>

              {/* 검수원 코멘트 */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  검수원 종합 의견 (한국어)
                </label>
                <textarea
                  value={data.inspector_comment || ''}
                  onChange={e => saveData({ inspector_comment: e.target.value })}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="검수 결과에 대한 종합 의견을 입력하세요. 바이어에게 전달됩니다."
                />
              </div>

              {/* 요약 (한국어) */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  바이어용 요약 (한국어) — 쉬운 언어로 작성
                </label>
                <textarea
                  value={data.summary_ko || ''}
                  onChange={e => saveData({ summary_ko: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 전체 500개 중 485개가 합격 기준을 통과했습니다. 주요 결함은 인쇄 번짐 2건으로 재작업 후 출고 예정입니다."
                />
              </div>

              {/* 요약 (중국어) */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  공장용 요약 (中文) — 실무 지시 사항
                </label>
                <textarea
                  value={data.summary_cn || ''}
                  onChange={e => saveData({ summary_cn: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="例：共检验500件，485件合格。发现2件印刷模糊缺陷，需返工后方可出货。"
                />
              </div>

              {/* 조치 사항 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">결함 조치 방법</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'rework', label: '재작업 후 출고', icon: '🔧' },
                    { value: 'sort', label: '선별 후 출고', icon: '🔍' },
                    { value: 'hold', label: '출고 보류', icon: '⏸️' },
                    { value: 'reject', label: '전량 반품', icon: '↩️' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => saveData({ defect_action: opt.value })}
                      className={`p-3 rounded-lg border-2 text-center text-sm transition-all ${
                        data.defect_action === opt.value
                          ? 'bg-purple-100 border-purple-500 text-purple-800 font-bold'
                          : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.icon}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 검수 요약 카드 */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="font-bold mb-4 text-lg">📊 검수 결과 요약</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black">{data.qty_inspected || 0}</p>
                  <p className="text-xs text-white/80">검수 수량</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black">{data.pass_rate || 0}%</p>
                  <p className="text-xs text-white/80">합격률</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black">{defects.length}</p>
                  <p className="text-xs text-white/80">총 결함 수</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-black">{data.final_verdict ? VERDICT_CONFIG[data.final_verdict as keyof typeof VERDICT_CONFIG]?.icon : '—'}</p>
                  <p className="text-xs text-white/80">최종 판정</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 9: 리포트 발행 ─── */}
        {activeTab === 9 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-6">📤 {lang === 'ko' ? '리포트 발행' : '报告发布'}</h2>

              {/* 완료율 체크 */}
              <div className={`rounded-xl p-4 mb-6 border-2 ${completion >= 80 ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{completion >= 80 ? '✅' : '⚠️'}</span>
                  <div>
                    <p className={`font-bold ${completion >= 80 ? 'text-green-800' : 'text-yellow-800'}`}>
                      작업 완료율: {completion}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {completion >= 80 ? '발행 준비가 완료되었습니다.' : '발행 전 최소 80% 이상 완성을 권장합니다.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 발행 대상 선택 */}
              <h3 className="font-bold text-gray-700 mb-3">발행 대상 선택</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { key: 'buyer', label: '바이어 리포트', icon: '🛒', desc: '한국어 마케팅 톤, 합격 여부 중심', color: 'blue' },
                  { key: 'factory', label: '공장 리포트', icon: '🏭', desc: '중국어 실무 지시, 조치 사항 중심', color: 'orange' },
                  { key: 'md', label: 'MD 리포트', icon: '👤', desc: '전체 데이터, 통계 포함', color: 'purple' },
                  { key: 'admin', label: '관리자 리포트', icon: '⚙️', desc: '내부 전체 데이터', color: 'gray' },
                ].map(target => (
                  <div
                    key={target.key}
                    onClick={() => setPublishTargets(prev => ({ ...prev, [target.key]: !prev[target.key as keyof typeof prev] }))}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                      publishTargets[target.key as keyof typeof publishTargets]
                        ? `bg-${target.color}-50 border-${target.color}-400`
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-2">{target.icon}</div>
                    <div className="font-bold text-sm text-gray-800">{target.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{target.desc}</div>
                    <div className={`mt-2 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      publishTargets[target.key as keyof typeof publishTargets]
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-gray-300'
                    }`}>
                      {publishTargets[target.key as keyof typeof publishTargets] && '✓'}
                    </div>
                  </div>
                ))}
              </div>

              {/* 발행 버튼 */}
              <button
                onClick={publishReport}
                disabled={saving || !data.final_verdict}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {saving ? '발행 중...' : `📤 리포트 발행 (${Object.values(publishTargets).filter(Boolean).length}개 대상)`}
              </button>
              {!data.final_verdict && (
                <p className="text-center text-sm text-red-500 mt-2">⚠️ 종합 판정(8단계)을 먼저 완료해주세요.</p>
              )}
            </div>

            {/* 발행 후 링크 미리보기 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-700 mb-4">🔗 발행 후 접근 경로</h3>
              <div className="space-y-3">
                {[
                  { label: '바이어 리포트', url: `/seller/inspections/${inspectionId}/report`, icon: '🛒' },
                  { label: '공장 리포트', url: `/factory/inspections/${inspectionId}/report`, icon: '🏭' },
                  { label: '관리자 상세', url: `/admin/inspections/${inspectionId}`, icon: '⚙️' },
                ].map(link => (
                  <div key={link.url} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span>{link.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{link.label}</span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      미리보기 →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 하단 네비게이션 버튼 */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <button
            onClick={() => setActiveTab(prev => Math.max(1, prev - 1))}
            disabled={activeTab === 1}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            ← 이전 단계
          </button>
          <span className="text-sm text-gray-500 self-center">{activeTab} / 9</span>
          <button
            onClick={() => setActiveTab(prev => Math.min(9, prev + 1))}
            disabled={activeTab === 9}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40"
          >
            다음 단계 →
          </button>
        </div>
      </div>
    </div>
  )
}
