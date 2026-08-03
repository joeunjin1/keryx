import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '관리자 대시보드',
  description: '전체 회원, 주문, 매출, 공장 현황을 한눈에 파악합니다.',
};

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminHomeClient from './AdminHomeClient';

export default async function AdminHome() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, display_name')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['admin', 'md', 'inspector'].includes(profile.kind)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-900 p-6">
        <div className="bg-[rgba(255,255,255,0.97)] rounded-3xl p-12 px-8 max-w-[440px] w-full text-center shadow-2xl">
          <div className="text-[64px] mb-5">🔒</div>
          <div className="text-[22px] font-black text-[#1a1a2e] mb-2">접근 권한 없음</div>
          <p className="text-sm text-neutral-500 leading-[1.8] mb-6">내부 사용자만 접근 가능합니다.</p>
          <Link href="/" className="inline-flex items-center gap-2 py-[14px] px-7 rounded-[14px] bg-gradient-to-br from-indigo-600 to-purple-600 text-white no-underline text-[15px] font-bold">← 홈으로</Link>
        </div>
      </div>
    );
  }

  // 통계 데이터 조회
  const [
    { count: pendingPayments },
    { count: pendingOrders },
    { count: pendingInspections },
    { count: pendingResearch },
    { count: pendingIp },
    { count: pendingDesign },
    { count: activeSellers },
    { count: activeFactories },
    { count: totalOrders },
  ] = await Promise.all([
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending_admin_approval') as unknown as { count: number },
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_admin_approval') as unknown as { count: number },
    supabase.from('inspections').select('*', { count: 'exact', head: true }).is('admin_approved_at', null).not('inspection_completed_at', 'is', null) as unknown as { count: number },
    supabase.from('market_research_requests').select('*', { count: 'exact', head: true }).eq('status', 'md_completed') as unknown as { count: number },
    supabase.from('ip_license_approvals').select('*', { count: 'exact', head: true }).in('status', ['pending', 'submitted_to_licensor']) as unknown as { count: number },
    supabase.from('design_tasks').select('*', { count: 'exact', head: true }).in('status', ['pending_assignment', 'mockup_ready']) as unknown as { count: number },
    supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved') as unknown as { count: number },
    supabase.from('factories').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved') as unknown as { count: number },
    supabase.from('orders').select('*', { count: 'exact', head: true }) as unknown as { count: number },
  ]);

  // 최근 활동 데이터
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_no, status, total_cny, created_at, seller:sellers(business_name)')
    .order('created_at', { ascending: false })
    .limit(5) as { data: any[]; error: any };

  // 월별 주문 통계 (최근 6개월)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const { data: monthlyOrders } = await supabase
    .from('orders')
    .select('created_at, total_amount_cny, status')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true }) as { data: any[]; error: any };

  // 월별 집계
  const monthlyStats: Record<string, { orders: number; revenue: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyStats[key] = { orders: 0, revenue: 0 };
  }
  (monthlyOrders ?? []).forEach((o: any) => {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyStats[key]) {
      monthlyStats[key].orders += 1;
      monthlyStats[key].revenue += Number(o.total_amount_cny ?? 0);
    }
  });
  const chartData = Object.entries(monthlyStats).map(([month, stats]) => ({
    month: month.slice(5) + '월',
    orders: stats.orders,
    revenue: Math.round(stats.revenue / 10000 * 10) / 10,
  }));

  const displayName = profile.display_name ?? '관리자';
  const role = profile.kind;
  const roleLabel = role === 'admin' ? '최고 관리자' : role === 'md' ? 'MD' : '검수원';
  const totalPending = (pendingOrders ?? 0) + (pendingPayments ?? 0) + (pendingInspections ?? 0) + (pendingResearch ?? 0);

  return (
    <AdminHomeClient
      displayName={displayName}
      role={role}
      roleLabel={roleLabel}
      totalPending={totalPending}
      pendingOrders={pendingOrders ?? 0}
      pendingPayments={pendingPayments ?? 0}
      pendingInspections={pendingInspections ?? 0}
      pendingResearch={pendingResearch ?? 0}
      pendingIp={pendingIp ?? 0}
      pendingDesign={pendingDesign ?? 0}
      activeSellers={activeSellers ?? 0}
      activeFactories={activeFactories ?? 0}
      totalOrders={totalOrders ?? 0}
      recentOrders={recentOrders ?? []}
      chartData={chartData}
    />
  );
}
