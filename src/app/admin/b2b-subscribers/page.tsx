'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Subscriber {
  id: string;
  email: string;
  company_name: string;
  phone: string | null;
  business_number: string | null;
  business_license_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'unsubscribed';
  rejection_reason: string | null;
  notes: string | null;
  subscribed_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', color: 'bg-green-100 text-green-800' },
  rejected: { label: '거절', color: 'bg-red-100 text-red-800' },
  unsubscribed: { label: '구독해지', color: 'bg-gray-100 text-gray-600' },
};

export default function B2BSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  const fetchSubscribers = async () => {
    setLoading(true);
    let query = supabase
      .from('b2b_subscribers')
      .select('*')
      .is('deleted_at', null)
      .order('subscribed_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching subscribers:', error);
    } else {
      setSubscribers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscribers();
  }, [filter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from('b2b_subscribers')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetchSubscribers();
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거절 사유를 입력하세요:');
    if (reason === null) return;
    setActionLoading(id);
    const { error } = await supabase
      .from('b2b_subscribers')
      .update({ status: 'rejected', rejection_reason: reason, rejected_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetchSubscribers();
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setActionLoading(id);
    const { error } = await supabase
      .from('b2b_subscribers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetchSubscribers();
    setActionLoading(null);
  };

  const counts = {
    all: subscribers.length,
    pending: subscribers.filter(s => s.status === 'pending').length,
    approved: subscribers.filter(s => s.status === 'approved').length,
    rejected: subscribers.filter(s => s.status === 'rejected').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">B2B 구독자 관리</h1>
        <p className="text-gray-500 mt-1">무료 B2B 주간 정보 구독 신청자를 관리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white border border-gray-200">
          <p className="text-sm text-gray-500">전체</p>
          <p className="text-2xl font-bold text-gray-900">{counts.all}</p>
        </div>
        <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
          <p className="text-sm text-yellow-700">승인 대기</p>
          <p className="text-2xl font-bold text-yellow-800">{counts.pending}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">승인됨</p>
          <p className="text-2xl font-bold text-green-800">{counts.approved}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">거절됨</p>
          <p className="text-2xl font-bold text-red-800">{counts.rejected}</p>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected', 'unsubscribed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_LABELS[s]?.label || s}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">구독 신청자가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">회사명</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">연락처</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">신청일</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.company_name}</td>
                  <td className="px-4 py-3 text-gray-600">{sub.email}</td>
                  <td className="px-4 py-3 text-gray-600">{sub.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[sub.status]?.color || ''}`}>
                      {STATUS_LABELS[sub.status]?.label || sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(sub.subscribed_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {sub.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            거절
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(sub.id)}
                        disabled={actionLoading === sub.id}
                        className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-300 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
