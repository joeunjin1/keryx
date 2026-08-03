'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Report {
  id: string;
  subject: string;
  sent_at: string;
  total_recipients: number;
  success_count: number;
  fail_count: number;
}

export default function WeeklyReportPage() {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    // 발송 이력 조회
    supabase
      .from('b2b_weekly_reports')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setReports(data); });

    // 승인된 구독자 수 조회
    supabase
      .from('b2b_subscribers')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .is('deleted_at', null)
      .then(({ count }) => { setApprovedCount(count || 0); });
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }
    if (!confirm(`승인된 ${approvedCount}명의 구독자에게 발송하시겠습니까?`)) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          content_html: content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'success', ...data });
        setSubject('');
        setContent('');
        // 이력 새로고침
        const { data: newReports } = await supabase
          .from('b2b_weekly_reports')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(20);
        if (newReports) setReports(newReports);
      } else {
        setResult({ type: 'error', message: data.error });
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message });
    }
    setSending(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">B2B 주간 리포트 발송</h1>
        <p className="text-gray-500 mt-1">
          승인된 B2B 구독자에게 주간 정보를 일괄 발송합니다.
          현재 <span className="font-bold text-brand-600">{approvedCount}명</span> 발송 대상
        </p>
      </div>

      {/* 발송 폼 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">새 리포트 작성</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="[KERYX B2B] 이번 주 IP 굿즈 트렌드 리포트"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용 (HTML 지원)</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={12}
              placeholder="<h2>이번 주 트렌드</h2><p>...</p>"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none font-mono text-sm"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending || approvedCount === 0}
            className="px-6 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? '발송 중...' : `${approvedCount}명에게 발송`}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.type === 'success' ? (
              <p>발송 완료! 성공: {result.success_count}건, 실패: {result.fail_count}건</p>
            ) : (
              <p>오류: {result.message}</p>
            )}
          </div>
        )}
      </div>

      {/* 발송 이력 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">발송 이력</h2>
        {reports.length === 0 ? (
          <p className="text-gray-400 text-center py-8">아직 발송 이력이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">제목</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">발송일</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">대상</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">성공</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">실패</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.subject}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(r.sent_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.total_recipients}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{r.success_count}</td>
                    <td className="px-4 py-3 text-center text-red-600 font-medium">{r.fail_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
