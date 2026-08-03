'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Recipient {
  id: string;
  email: string;
  display_name: string;
  kind: string;
}

export default function BulkEmailPage() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterKind, setFilterKind] = useState<string>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: number; failed?: number; message?: string } | null>(null);
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

  const filtered = filterKind === 'all' ? recipients : recipients.filter(r => r.kind === filterKind);

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    if (selectedIds.size === 0) {
      alert('수신자를 선택해주세요.');
      return;
    }
    if (!confirm(`${selectedIds.size}명에게 이메일을 발송하시겠습니까?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/marketing/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk',
          recipient_ids: Array.from(selectedIds),
          subject,
          body,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success > 0) {
        setSubject('');
        setBody('');
        setSelectedIds(new Set());
      }
    } catch {
      setResult({ message: '발송 중 오류가 발생했습니다.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">단체 이메일 발송</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 수신자 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">수신자 선택</h2>
            <select
              value={filterKind}
              onChange={e => { setFilterKind(e.target.value); setSelectedIds(new Set()); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="all">전체</option>
              <option value="seller">바이어(셀러)</option>
              <option value="factory">공장</option>
              <option value="md">MD</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleAll}
              className="w-4 h-4 accent-rose-500"
            />
            <span className="text-sm text-gray-600">
              전체 선택 ({selectedIds.size}/{filtered.length}명 선택됨)
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">수신자가 없습니다.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.map(r => (
                <label key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="w-4 h-4 accent-rose-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.display_name}</div>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    r.kind === 'seller' ? 'bg-blue-50 text-blue-600' :
                    r.kind === 'factory' ? 'bg-green-50 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.kind === 'seller' ? '바이어' : r.kind === 'factory' ? '공장' : r.kind}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 이메일 작성 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">이메일 작성</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="이메일 제목을 입력하세요"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">내용 *</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="이메일 내용을 입력하세요. HTML 태그를 사용할 수 있습니다."
                rows={12}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
              />
            </div>

            {result && (
              <div className={`p-3 rounded-lg text-sm ${
                result.success && result.success > 0
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {result.message ?? `발송 완료: ${result.success}건 성공, ${result.failed ?? 0}건 실패`}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0 || !subject.trim() || !body.trim()}
              className="w-full bg-rose-500 text-white py-2.5 rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? '발송 중...' : `${selectedIds.size}명에게 발송`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
