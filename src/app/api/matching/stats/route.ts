export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
// GET: 매칭 KPI 통계 + 공장별/바이어별 매칭 통계
export async function GET(req: NextRequest) {
  const sb = getSupabase()
  const [
    { count: pending },
    { count: inProgress },
    { count: completed },
    { count: overdue },
    { data: allRequests },
    { data: allMatchingData },
  ] = await Promise.all([
    sb.from('factory_matching_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('factory_matching_requests').select('*', { count: 'exact', head: true }).in('status', ['reviewing', 'matching', 'sample']),
    sb.from('factory_matching_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    sb.from('factory_matching_requests').select('*', { count: 'exact', head: true }).eq('is_standby', true),
    sb.from('factory_matching_requests').select('created_at, status').eq('status', 'completed').limit(50),
    sb.from('factory_matching_requests').select('user_id, company_name, final_factory_id, final_factory_name, status').not('status', 'eq', 'cancelled').limit(500),
  ])

  // 평균 매칭 일수 계산 (완료된 건 기준)
  let avgDays = 0
  if (allRequests && allRequests.length > 0) {
    const totalDays = allRequests.reduce((sum: number, r: { created_at: string }) => {
      const days = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0)
    avgDays = Math.round((totalDays / allRequests.length) * 10) / 10
  }

  // 공장별 매칭 횟수 집계
  const factoryCountMap: Record<string, { id: string; name: string; count: number }> = {}
  // 바이어별 매칭 횟수 집계
  const buyerCountMap: Record<string, { id: string; name: string; count: number }> = {}

  if (allMatchingData) {
    for (const r of allMatchingData) {
      // 공장 집계
      if (r.final_factory_id && r.final_factory_name) {
        if (!factoryCountMap[r.final_factory_id]) {
          factoryCountMap[r.final_factory_id] = { id: r.final_factory_id, name: r.final_factory_name, count: 0 }
        }
        factoryCountMap[r.final_factory_id].count++
      }
      // 바이어 집계
      const buyerKey = r.user_id || r.company_name
      if (buyerKey) {
        if (!buyerCountMap[buyerKey]) {
          buyerCountMap[buyerKey] = { id: r.user_id || '', name: r.company_name || '미입력', count: 0 }
        }
        buyerCountMap[buyerKey].count++
      }
    }
  }

  // 상위 5개 공장 (매칭 많은 순)
  const topFactories = Object.values(factoryCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 상위 5개 바이어 (매칭 많은 순)
  const topBuyers = Object.values(buyerCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({
    pending: pending || 0,
    in_progress: inProgress || 0,
    completed_this_week: completed || 0,
    avg_match_days: avgDays,
    overdue: overdue || 0,
    top_factories: topFactories,
    top_buyers: topBuyers,
  })
}
