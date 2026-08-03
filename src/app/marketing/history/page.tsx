'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Campaign {
  id: string;
  type: 'email' | 'sms';
  subject?: string;
  message_preview: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  sender_name: string;
}

export default function MarketingHistoryPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'email' | 'sms'>('all');

  useEffect(() => {
    fetch('/api/marketing/history')
      .then(r => r.json())
      .then(data => {
        setCampaigns(data.campaigns ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.type === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">발송 이력</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'email', 'sms'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-rose-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? '전체' : f === 'email' ? '이메일' : '문자'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">발송 이력이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.type === 'email'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {c.type === 'email' ? '이메일' : '문자'}
                  </span>
                  <span className="font-medium text-gray-900">
                    {c.subject ?? c.message_preview}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleString('ko-KR')}
                </span>
              </div>

              {c.subject && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{c.message_preview}</p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">발송자: <span className="text-gray-700">{c.sender_name}</span></span>
                <span className="text-gray-500">총 <span className="font-medium text-gray-700">{c.total_count}</span>명</span>
                <span className="text-green-600">성공 {c.success_count}</span>
                {c.failed_count > 0 && (
                  <span className="text-red-500">실패 {c.failed_count}</span>
                )}
                <div className="ml-auto w-24 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${c.total_count > 0 ? (c.success_count / c.total_count) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
