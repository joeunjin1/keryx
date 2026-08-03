import type { Metadata } from 'next';
export const metadata: Metadata = { title: '통합 의뢰 관리 | KERYX Admin', description: '모든 서비스 의뢰를 한눈에 관리합니다.' };

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminRequestsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || profile.kind !== 'admin') redirect('/admin');

  // 공장 매칭 의뢰
  const { data: matchingReqs } = await supabase
    .from('factory_matching_requests')
    .select('id, company_name, contact_name, status, created_at, is_urgent')
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[]; error: any };

  // 시장조사 의뢰
  const { data: researchReqs } = await supabase
    .from('market_research_requests')
    .select('id, request_no, status, is_urgent, created_at, sellers(business_name)')
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[]; error: any };

  // 서비스 의뢰
  const { data: serviceReqs } = await supabase
    .from('service_requests')
    .select('id, service_type, status, created_at, sellers(business_name)')
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[]; error: any };

  // 통합 의뢰 (unified_requests)
  const { data: unifiedReqs } = await supabase
    .from('unified_requests')
    .select('id, request_no, status, company_name, contact_name, created_at, assigned_md_id')
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[]; error: any };
  const statusColor: Record<string, string> = {
    pending: '#6b7280', reviewing: '#4f46e5', matching: '#8b5cf6',
    in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444',
    requested: '#4f46e5', md_completed: '#10b981',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">통합 의뢰 관리</h1>
        <p className="text-sm text-gray-500 mt-1">공장 매칭 · 시장조사 · 서비스 의뢰를 한눈에 확인합니다.</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '통합 의뢰', count: unifiedReqs?.length ?? 0, href: '/admin/unified-requests', color: '#7c3aed' },
          { label: '공장 매칭', count: matchingReqs?.length ?? 0, href: '/admin/matching', color: '#4f46e5' },
          { label: '시장조사', count: researchReqs?.length ?? 0, href: '/admin/research', color: '#f59e0b' },
          { label: '서비스 의뢰', count: serviceReqs?.length ?? 0, href: '/admin/services', color: '#10b981' },
        ].map(c => (
          <Link key={c.label} href={c.href} className="block rounded-2xl p-5 border border-gray-200 hover:shadow-md transition-all bg-white">
            <div className="text-3xl font-black mb-1" style={{ color: c.color }}>{c.count}</div>
            <div className="text-sm text-gray-600 font-medium">{c.label}</div>
            <div className="text-xs text-gray-400 mt-1">최근 20건 →</div>
          </Link>
        ))}
      </div>

      {/* 통합 의뢰 (unified_requests) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">통합 의뢰 <span className="text-xs text-purple-600 font-normal ml-1">바이어가 직접 제출한 의뢰서</span></h2>
          <Link href="/admin/unified-requests" className="text-xs text-purple-600 hover:underline">전체 보기 →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-purple-50 border-b border-gray-200">
              <tr>
                {['의뢰번호', '상호명', '담당자', '상태', 'MD 배정', '신청일'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(unifiedReqs ?? []).map((r: any) => (
                <tr key={r.id} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-purple-700">
                    <Link href={`/admin/unified-requests/${r.id}`} className="hover:underline">{r.request_no ?? r.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{r.company_name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.contact_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: r.status === 'submitted' ? '#7c3aed' : r.status === 'in_progress' ? '#f59e0b' : r.status === 'completed' ? '#10b981' : '#6b7280' }}>
                      {r.status === 'submitted' ? '신규접수' : r.status === 'in_progress' ? '처리중' : r.status === 'completed' ? '완료' : r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.assigned_md_id ? '배정됨' : <span className="text-red-400">미배정</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
              {(!unifiedReqs || unifiedReqs.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">통합 의뢰 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {/* 공장 매칭 최근 의뢰 */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">공장 매칭 의뢰</h2>
          <Link href="/admin/matching" className="text-xs text-indigo-600 hover:underline">전체 보기 →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['상호명', '담당자', '상태', '긴급', '신청일'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(matchingReqs ?? []).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.company_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.contact_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: statusColor[r.status] ?? '#6b7280' }}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">{r.is_urgent ? <span className="text-red-500 font-bold text-xs">긴급</span> : <span className="text-gray-300 text-xs">-</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
              {(!matchingReqs || matchingReqs.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">의뢰 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 시장조사 최근 의뢰 */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">시장조사 의뢰</h2>
          <Link href="/admin/research" className="text-xs text-amber-600 hover:underline">전체 보기 →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['의뢰번호', '바이어', '상태', '긴급', '신청일'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(researchReqs ?? []).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.request_no ?? r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.sellers?.business_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: statusColor[r.status] ?? '#6b7280' }}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">{r.is_urgent ? <span className="text-red-500 font-bold text-xs">긴급</span> : <span className="text-gray-300 text-xs">-</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
              {(!researchReqs || researchReqs.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">의뢰 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 서비스 의뢰 최근 목록 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">서비스 의뢰</h2>
          <Link href="/admin/services" className="text-xs text-emerald-600 hover:underline">전체 보기 →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['서비스 유형', '바이어', '상태', '신청일'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(serviceReqs ?? []).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.service_type}</td>
                  <td className="px-4 py-3 text-gray-600">{r.sellers?.business_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: statusColor[r.status] ?? '#6b7280' }}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
              {(!serviceReqs || serviceReqs.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">의뢰 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
