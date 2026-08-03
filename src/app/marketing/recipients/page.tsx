'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Recipient {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  kind: string;
  created_at: string;
}

export default function RecipientsPage() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketing/recipients')
      .then(r => r.json())
      .then(data => {
        setRecipients(data.recipients ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = recipients.filter(r => {
    const matchKind = filterKind === 'all' || r.kind === filterKind;
    const matchSearch = !search ||
      r.display_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.phone ?? '').includes(search);
    return matchKind && matchSearch;
  });

  const kindLabel = (kind: string) => {
    switch (kind) {
      case 'seller': return '바이어';
      case 'factory': return '공장';
      case 'md': return 'MD';
      case 'marketing': return '마케팅';
      case 'inspector': return '검수';
      default: return kind;
    }
  };

  const kindColor = (kind: string) => {
    switch (kind) {
      case 'seller': return 'bg-blue-50 text-blue-600';
      case 'factory': return 'bg-green-50 text-green-600';
      case 'md': return 'bg-purple-50 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">수신자 관리</h1>
        <span className="ml-auto text-sm text-gray-500">총 {filtered.length}명</span>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름, 이메일, 전화번호 검색..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <select
          value={filterKind}
          onChange={e => setFilterKind(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <option value="all">전체</option>
          <option value="seller">바이어</option>
          <option value="factory">공장</option>
          <option value="md">MD</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">불러오는 중...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이름</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이메일</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">전화번호</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">역할</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.display_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.phone ? (
                        <span className="text-green-600">{r.phone}</span>
                      ) : (
                        <span className="text-gray-300">미등록</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${kindColor(r.kind)}`}>
                        {kindLabel(r.kind)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
