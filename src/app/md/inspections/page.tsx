'use client'

import { useState, useEffect } from 'react'
import { useLangContext } from '@/components/layout/LangContext';
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface InspectionItem {
  id: string
  inspection_no: string
  product_name_ko: string
  product_name_cn: string
  final_verdict: string
  pass_rate: number
  inspection_date: string
  published_at: string | null
  status: string
  inspector_comment: string
  defect_action: string
  factories?: { name_ko: string; name_cn: string; city: string }
  sellers?: { company_name: string }
}

const VERDICT_CONFIG = {
  PASS: { label: '합격', labelCn: '合格', color: 'bg-green-100 text-green-800 border-green-300', icon: '✅' },
  CONDITIONAL: { label: '조건부 합격', labelCn: '有条件合格', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⚠️' },
  HOLD: { label: '출고 보류', labelCn: '暂停出货', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '⏸️' },
  FAIL: { label: '불합격', labelCn: '不合格', color: 'bg-red-100 text-red-800 border-red-300', icon: '❌' },
}

export default function MdInspectionsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '검수 관리 | KERYX';
  }, []);

  const router = useRouter()
  const supabase = createClient()
  const [inspections, setInspections] = useState<InspectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'pending' | 'pass' | 'fail'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInspections()
  }, [])

  const loadInspections = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('inspections')
        .select('*, factories(name_ko, name_cn, city), sellers(company_name)')
        .order('created_at', { ascending: false })
      if (data) setInspections(data as InspectionItem[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = inspections.filter(item => {
    const matchSearch = !searchTerm ||
      item.product_name_ko?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.inspection_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.factories?.name_ko?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchFilter =
      filter === 'all' ? true :
      filter === 'published' ? !!item.published_at :
      filter === 'pending' ? (!item.published_at && item.status === 'completed') :
      filter === 'pass' ? item.final_verdict === 'PASS' :
      filter === 'fail' ? item.final_verdict === 'FAIL' : true

    return matchSearch && matchFilter
  })

  // 통계
  const stats = {
    total: inspections.length,
    pass: inspections.filter(i => i.final_verdict === 'PASS').length,
    fail: inspections.filter(i => ['FAIL', 'HOLD'].includes(i.final_verdict)).length,
    pending: inspections.filter(i => !i.published_at && i.status === 'completed').length,
    avgPassRate: inspections.length > 0
      ? Math.round(inspections.reduce((s, i) => s + (i.pass_rate || 0), 0) / inspections.length)
      : 0,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-black mb-1">🔍 검수 리포트 관리</h1>
          <p className="text-indigo-200 text-sm">MD 담당 검수 현황 및 리포트 보관</p>

          {/* MD 통계 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
            {[
              { label: '전체', value: stats.total, bg: 'bg-white/20' },
              { label: '합격', value: stats.pass, bg: 'bg-green-500/30' },
              { label: '불합격/보류', value: stats.fail, bg: 'bg-red-500/30' },
              { label: '발행 대기', value: stats.pending, bg: stats.pending > 0 ? 'bg-yellow-500/30' : 'bg-white/20' },
              { label: '평균 합격률', value: `${stats.avgPassRate}%`, bg: 'bg-white/20' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-xs text-white/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* 검색 + 필터 */}
        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
          <input
            type="text"
            placeholder="제품명, 검수번호, 공장명 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: `전체 (${stats.total})` },
              { id: 'published', label: '발행됨' },
              { id: 'pending', label: `대기 (${stats.pending})` },
              { id: 'pass', label: '합격' },
              { id: 'fail', label: '불합격' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === f.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 검수 목록 */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-gray-500">검수 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const v = VERDICT_CONFIG[item.final_verdict as keyof typeof VERDICT_CONFIG]
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border p-5">
                  {/* 상단 헤더 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">{item.inspection_no}</span>
                        {item.published_at ? (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">발행됨</span>
                        ) : item.status === 'pending_approval' ? (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">⏳ 관리자 승인 대기</span>
                        ) : item.status === 'review' ? (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">✏️ MD 작성 필요</span>
                        ) : item.status === 'completed' ? (
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">발행 대기</span>
                        ) : null}
                      </div>
                      <h3 className="font-bold text-gray-800 truncate">{item.product_name_ko}</h3>
                      {item.product_name_cn && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.product_name_cn}</p>
                      )}
                    </div>
                    {v && (
                      <span className={`flex-shrink-0 ml-2 text-xs px-2 py-1 rounded-full font-bold border ${v.color}`}>
                        {v.icon} {v.label}
                      </span>
                    )}
                  </div>

                  {/* 공장/바이어 정보 */}
                  <div className="flex gap-4 text-xs text-gray-500 mb-3">
                    <span>🏭 {item.factories?.name_ko || '—'}</span>
                    <span>👤 {item.sellers?.company_name || '—'}</span>
                    <span>📅 {item.inspection_date ? new Date(item.inspection_date).toLocaleDateString('ko-KR') : '—'}</span>
                  </div>

                  {/* 합격률 바 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          (item.pass_rate || 0) >= 95 ? 'bg-green-500' :
                          (item.pass_rate || 0) >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.pass_rate || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-12 text-right">{item.pass_rate || 0}%</span>
                  </div>

                  {/* 검수원 의견 미리보기 */}
                  {item.inspector_comment && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">검수원 의견</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{item.inspector_comment}</p>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/md/inspections/${item.id}/report`)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        ['review', 'pending_approval'].includes(item.status)
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {['review', 'pending_approval'].includes(item.status) ? '✏️ 보고서 작성' : '📝 검수 내용'}
                    </button>
                    <button
                      onClick={() => window.open(`/seller/inspections/${item.id}/report`, '_blank')}
                      className="flex-1 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-all"
                    >
                      🇰🇷 바이어 리포트
                    </button>
                    <button
                      onClick={() => window.open(`/factory/inspections/${item.id}/report`, '_blank')}
                      className="flex-1 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 transition-all"
                    >
                      🇨🇳 공장 리포트
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
