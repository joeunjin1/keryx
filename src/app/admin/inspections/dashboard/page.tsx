'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLangContext } from '@/components/layout/LangContext';

interface InspectionStats {
  total: number
  pass: number
  conditional: number
  hold: number
  fail: number
  pending_publish: number
  avg_pass_rate: number
  total_defects: number
  critical_defects: number
  this_month: number
}

interface RecentInspection {
  id: string
  inspection_no: string
  product_name_ko: string
  final_verdict: string
  pass_rate: number
  inspection_date: string
  published_at: string | null
  status: string
  factories?: { company_name: string }
  sellers?: { business_name: string }
}

export default function InspectionDashboardPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '검수 대시보드 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const VERDICT_CONFIG = {
    pass: { label: t('합격', '合格'), color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
    conditional_pass: { label: t('조건부 합격', '条件合格'), color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
    hold: { label: t('출고 보류', '出货暂缓'), color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
    fail: { label: t('불합격', '不合格'), color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  };

  const router = useRouter()
  const supabase = createClient()
  const [stats, setStats] = useState<InspectionStats>({
    total: 0, pass: 0, conditional: 0, hold: 0, fail: 0,
    pending_publish: 0, avg_pass_rate: 0, total_defects: 0,
    critical_defects: 0, this_month: 0,
  })
  const [recentList, setRecentList] = useState<RecentInspection[]>([])
  const [pendingPublish, setPendingPublish] = useState<RecentInspection[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'publish' | 'list'>('overview')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/inspections')
      const json = await res.json()
      const allInspections = json.data ?? []

      if (allInspections.length >= 0) {
        const thisMonth = new Date()
        thisMonth.setDate(1)
        thisMonth.setHours(0, 0, 0, 0)

        const statsCalc: InspectionStats = {
          total: allInspections.length,
          pass: allInspections.filter((i: any) => i.final_verdict === 'pass').length,
          conditional: allInspections.filter((i: any) => i.final_verdict === 'conditional_pass').length,
          hold: allInspections.filter((i: any) => i.final_verdict === 'hold').length,
          fail: allInspections.filter((i: any) => i.final_verdict === 'fail').length,
          pending_publish: allInspections.filter((i: any) => !i.published_at && ['completed', 'pending_approval', 'review'].includes(i.status)).length,
          avg_pass_rate: allInspections.length > 0
            ? Math.round(allInspections.reduce((sum: number, i: any) => sum + (i.pass_rate || 0), 0) / allInspections.length)
            : 0,
          total_defects: 0,
          critical_defects: 0,
          this_month: allInspections.filter((i: any) => i.inspection_date && new Date(i.inspection_date) >= thisMonth).length,
        }

        setStats(statsCalc)
        setRecentList(allInspections.slice(0, 20) as unknown as RecentInspection[])
        setPendingPublish(allInspections.filter((i: any) => !i.published_at && ['completed', 'pending_approval', 'review'].includes(i.status)) as unknown as RecentInspection[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const publishReport = async (inspectionId: string) => {
    setPublishingId(inspectionId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: internalUser } = await supabase
        .from('internal_users')
        .select('id')
        .eq('user_id', user?.id)
        .single()
      const { error } = await supabase.rpc('admin_approve_inspection', {
        p_inspection_id: inspectionId,
        p_admin_internal_user_id: internalUser?.id,
        p_notes: null,
      })
      if (!error) {
        await loadDashboard()
        alert(t('✅ 검수 보고서가 승인되어 바이어와 공장에 발송되었습니다.', '✅ 验货报告已审批，已发送给买家和工厂。'))
      } else {
        await supabase
          .from('inspections')
          .update({ published_at: new Date().toISOString(), status: 'published' })
          .eq('id', inspectionId)
        await loadDashboard()
        alert(t('✅ 검수 보고서가 발송되었습니다.', '✅ 验货报告已发送。'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPublishingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('검수 대시보드 로딩 중...', '验货管理面板加载中...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 헤더 ── */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">🔍 {t('검수 관리 대시보드', '验货管理控制台')}</h1>
              <p className="text-purple-200 text-sm mt-1">{t('전체 검수 현황 · 리포트 발행 관리 · KPI 통계', '全部验货状况 · 报告发布管理 · KPI统计')}</p>
            </div>
            <button
              onClick={() => router.push('/admin/inspections/new')}
              className="bg-white text-purple-700 font-bold px-4 py-2 rounded-xl text-sm hover:bg-purple-50 transition-all"
            >
              + {t('검수 등록', '新建验货单')}
            </button>
          </div>

          {/* KPI 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {[
              { label: t('전체 검수', '全部验货'), value: stats.total, icon: '📋', color: 'bg-white/20' },
              { label: t('이번 달', '本月'), value: stats.this_month, icon: '📅', color: 'bg-white/20' },
              { label: t('평균 합격률', '平均合格率'), value: `${stats.avg_pass_rate}%`, icon: '📊', color: 'bg-white/20' },
              { label: t('발행 대기', '待发布'), value: stats.pending_publish, icon: '⏳', color: stats.pending_publish > 0 ? 'bg-yellow-500/30' : 'bg-white/20' },
              { label: t('치명 결함', '严重缺陷'), value: stats.critical_defects, icon: '🚨', color: stats.critical_defects > 0 ? 'bg-red-500/30' : 'bg-white/20' },
            ].map(kpi => (
              <div key={kpi.label} className={`${kpi.color} rounded-xl p-3 text-center`}>
                <p className="text-xl">{kpi.icon}</p>
                <p className="text-2xl font-black mt-1">{kpi.value}</p>
                <p className="text-xs text-white/80 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto">
          {[
            { id: 'overview', label: `📊 ${t('현황 개요', '状况概览')}` },
            { id: 'publish', label: `⏳ ${t('발행 대기', '待发布')} ${stats.pending_publish > 0 ? `(${stats.pending_publish})` : ''}` },
            { id: 'list', label: `📋 ${t('전체 목록', '全部列表')}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── 현황 개요 ── */}
        {activeTab === 'overview' && (
          <>
            {/* 판정 결과 분포 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-5">📊 {t('판정 결과 분포', '判定结果分布')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { key: 'PASS', label: t('합격', '合格'), count: stats.pass, color: 'bg-green-50 border-green-300 text-green-800', bar: 'bg-green-500' },
                  { key: 'CONDITIONAL', label: t('조건부 합격', '条件合格'), count: stats.conditional, color: 'bg-yellow-50 border-yellow-300 text-yellow-800', bar: 'bg-yellow-500' },
                  { key: 'HOLD', label: t('출고 보류', '出货暂缓'), count: stats.hold, color: 'bg-orange-50 border-orange-300 text-orange-800', bar: 'bg-orange-500' },
                  { key: 'FAIL', label: t('불합격', '不合格'), count: stats.fail, color: 'bg-red-50 border-red-300 text-red-800', bar: 'bg-red-500' },
                ].map(item => (
                  <div key={item.key} className={`rounded-xl border-2 p-4 text-center ${item.color}`}>
                    <p className="text-3xl font-black">{item.count}</p>
                    <p className="text-xs font-medium mt-1">{item.label}</p>
                    <div className="mt-3 bg-white/60 rounded-full h-2">
                      <div
                        className={`${item.bar} h-2 rounded-full`}
                        style={{ width: `${stats.total > 0 ? (item.count / stats.total * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-xs mt-1 opacity-70">
                      {stats.total > 0 ? Math.round(item.count / stats.total * 100) : 0}%
                    </p>
                  </div>
                ))}
              </div>

              {/* 전체 합격률 게이지 */}
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={stats.avg_pass_rate >= 95 ? '#22c55e' : stats.avg_pass_rate >= 80 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      strokeDasharray={`${stats.avg_pass_rate * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black text-gray-800">{stats.avg_pass_rate}%</span>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-800">{t('전체 평균 합격률', '全体平均合格率')}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.avg_pass_rate >= 95
                      ? t('✅ 우수한 품질 수준을 유지하고 있습니다', '✅ 质量水平优秀')
                      : stats.avg_pass_rate >= 80
                      ? t('⚠️ 품질 개선 여지가 있습니다', '⚠️ 质量有改善空间')
                      : t('❌ 품질 수준 향상이 필요합니다', '❌ 需要提升质量水平')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{t(`총 ${stats.total}건 기준`, `共 ${stats.total} 件基准`)}</p>
                </div>
              </div>
            </div>

            {/* 결함 통계 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                <p className="text-4xl font-black text-gray-800">{stats.total_defects}</p>
                <p className="text-sm text-gray-500 mt-1">{t('총 발견 결함', '总发现缺陷')}</p>
              </div>
              <div className="bg-red-50 rounded-xl border-2 border-red-200 p-5 text-center">
                <p className="text-4xl font-black text-red-700">{stats.critical_defects}</p>
                <p className="text-sm text-red-600 mt-1">{t('치명적 결함', '严重缺陷')}</p>
                {stats.critical_defects > 0 && (
                  <p className="text-xs text-red-500 mt-1">{t('즉시 조치 필요', '需立即处理')}</p>
                )}
              </div>
              <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-5 text-center">
                <p className="text-4xl font-black text-purple-700">{stats.pending_publish}</p>
                <p className="text-sm text-purple-600 mt-1">{t('발행 대기 리포트', '待发布报告')}</p>
                {stats.pending_publish > 0 && (
                  <button
                    onClick={() => setActiveTab('publish')}
                    className="mt-2 text-xs text-purple-700 underline"
                  >
                    {t('발행하기 →', '去发布 →')}
                  </button>
                )}
              </div>
            </div>

            {/* 최근 검수 목록 */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">🕐 {t('최근 검수 현황', '最近验货状况')}</h3>
              <div className="space-y-2">
                {recentList.slice(0, 8).map(item => {
                  const v = VERDICT_CONFIG[item.final_verdict as keyof typeof VERDICT_CONFIG]
                  return (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/admin/inspections/${item.id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 transition-all"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${v?.dot || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.product_name_ko}</p>
                        <p className="text-xs text-gray-400">{item.inspection_no} · {(item.factories as any)?.company_name || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {v && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.color}`}>
                            {v.label}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{item.pass_rate || 0}%</span>
                        {item.published_at ? (
                          <span className="text-xs text-green-600">{t('발행됨', '已发布')}</span>
                        ) : item.status === 'completed' ? (
                          <span className="text-xs text-orange-600 font-medium">{t('발행 대기', '待发布')}</span>
                        ) : (
                          <span className="text-xs text-gray-400">{item.status}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── 발행 대기 ── */}
        {activeTab === 'publish' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <div>
                  <p className="font-bold text-yellow-800">{t(`발행 대기 리포트 ${pendingPublish.length}건`, `待发布报告 ${pendingPublish.length} 件`)}</p>
                  <p className="text-sm text-yellow-700">{t('검수 완료 후 리포트를 발행하면 바이어와 공장에 즉시 공유됩니다.', '验货完成后发布报告，将立即共享给买家和工厂。')}</p>
                </div>
              </div>
            </div>

            {pendingPublish.length === 0 ? (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-bold text-green-800">{t('모든 리포트가 발행되었습니다!', '所有报告已发布！')}</p>
              </div>
            ) : (
              pendingPublish.map(item => {
                const v = VERDICT_CONFIG[item.final_verdict as keyof typeof VERDICT_CONFIG]
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-800">{item.product_name_ko}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.inspection_no} · {(item.factories as any)?.company_name || '—'} · {(item.sellers as any)?.business_name || '—'}</p>
                      </div>
                      {v && (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${v.color}`}>
                          {v.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 bg-gray-100 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${(item.pass_rate || 0) >= 95 ? 'bg-green-500' : (item.pass_rate || 0) >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${item.pass_rate || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{item.pass_rate || 0}% {t('합격', '合格')}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/inspections/${item.id}/workspace`)}
                        className="flex-1 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-all"
                      >
                        📝 {t('검수 내용 확인', '查看验货内容')}
                      </button>
                      <button
                        onClick={() => publishReport(item.id)}
                        disabled={publishingId === item.id}
                        className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {publishingId === item.id ? t('발행 중...', '发布中...') : `🚀 ${t('리포트 발행', '发布报告')}`}
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2 text-xs text-gray-500">
                      <span>{t('바이어', '买家')}: <a href={`/seller/inspections/${item.id}/report`} target="_blank" className="text-blue-600 underline">{t('리포트 미리보기', '报告预览')}</a></span>
                      <span>·</span>
                      <span>{t('공장', '工厂')}: <a href={`/factory/inspections/${item.id}/report`} target="_blank" className="text-orange-600 underline">{t('리포트 미리보기', '报告预览')}</a></span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── 전체 목록 ── */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{t(`전체 검수 목록 (${recentList.length}건)`, `全部验货列表（${recentList.length}件）`)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('검수번호', '验货编号')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('제품명', '产品名称')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('공장', '工厂')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('판정', '判定')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('합격률', '合格率')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('검수일', '验货日期')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('발행 상태', '发布状态')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('작업', '操作')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentList.map(item => {
                    const v = VERDICT_CONFIG[item.final_verdict as keyof typeof VERDICT_CONFIG]
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{item.inspection_no}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{item.product_name_ko}</td>
                        <td className="px-4 py-3 text-gray-600">{(item.factories as any)?.company_name || '—'}</td>
                        <td className="px-4 py-3">
                          {v ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.color}`}>{v.label}</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${(item.pass_rate || 0) >= 95 ? 'bg-green-500' : (item.pass_rate || 0) >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${item.pass_rate || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{item.pass_rate || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.inspection_date ? new Date(item.inspection_date).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {item.published_at ? (
                            <span className="text-xs text-green-600 font-medium">✅ {t('발행됨', '已发布')}</span>
                          ) : item.status === 'completed' ? (
                            <span className="text-xs text-orange-600 font-medium">⏳ {t('발행 대기', '待发布')}</span>
                          ) : (
                            <span className="text-xs text-gray-400">{item.status || t('진행 중', '进行中')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => router.push(`/admin/inspections/${item.id}/workspace`)}
                              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-all"
                            >
                              {t('편집', '编辑')}
                            </button>
                            {!item.published_at && item.status === 'completed' && (
                              <button
                                onClick={() => publishReport(item.id)}
                                disabled={publishingId === item.id}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-all disabled:opacity-50"
                              >
                                {publishingId === item.id ? '...' : t('발행', '发布')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
