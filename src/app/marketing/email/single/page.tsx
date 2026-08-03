'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Recipient {
  id: string;
  email: string;
  display_name: string;
  kind: string;
}

export default function SingleEmailPage() {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);
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

  const filtered = recipients.filter(r =>
    r.display_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    if (!selected) { alert('수신자를 선택해주세요.'); return; }
    if (!subject.trim() || !body.trim()) { alert('제목과 내용을 입력해주세요.'); return; }
    if (!confirm(`${selected.display_name}(${selected.email})에게 이메일을 발송하시겠습니까?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/marketing/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'single',
          recipient_ids: [selected.id],
          subject,
          body,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success > 0) {
        setSubject('');
        setBody('');
        setSelected(null);
      }
    } catch {
      setResult({ success: false, message: '발송 중 오류가 발생했습니다.' });
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
        <h1 className="text-xl font-bold text-gray-900">개별 이메일 발송</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 수신자 검색 및 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">수신자 선택</h2>

          {selected ? (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{selected.display_name}</div>
                <div className="text-sm text-gray-500">{selected.email}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="이름 또는 이메일로 검색..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              {loading ? (
                <div className="text-center py-8 text-gray-400">불러오는 중...</div>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {filtered.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {r.display_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{r.display_name}</div>
                        <div className="text-xs text-gray-500 truncate">{r.email}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.kind === 'seller' ? 'bg-blue-50 text-blue-600' :
                        r.kind === 'factory' ? 'bg-green-50 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {r.kind === 'seller' ? '바이어' : r.kind === 'factory' ? '공장' : r.kind}
                      </span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">검색 결과가 없습니다.</div>
                  )}
                </div>
              )}
            </>
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
                placeholder="이메일 내용을 입력하세요."
                rows={12}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
              />
            </div>

            {result && (
              <div className={`p-3 rounded-lg text-sm ${
                result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {result.message ?? (result.success ? '발송이 완료되었습니다.' : '발송에 실패했습니다.')}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !selected || !subject.trim() || !body.trim()}
              className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? '발송 중...' : selected ? `${selected.display_name}에게 발송` : '수신자를 선택하세요'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
