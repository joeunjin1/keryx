'use client';
import { useEffect, useState } from 'react';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface SendLog {
  id: string;
  report_type: string;
  report_title: string;
  sent_by_name: string;
  sent_to_email: string;
  sent_to_name: string;
  report_url: string;
  status: 'sent' | 'opened' | 'failed';
  opened_at: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { ko: string; zh: string; color: string }> = {
  sent:   { ko: '발송완료', zh: '已发送', color: 'bg-blue-100 text-blue-700' },
  opened: { ko: '열람완료', zh: '已查看', color: 'bg-green-100 text-green-700' },
  failed: { ko: '발송실패', zh: '发送失败', color: 'bg-red-100 text-red-700' },
};

const TYPE_MAP: Record<string, { ko: string; zh: string }> = {
  market_research: { ko: '시장조사', zh: '市场调研' },
  sample:          { ko: '샘플개발', zh: '样品开发' },
  factory_match:   { ko: '공장매칭', zh: '工厂匹配' },
  inspection:      { ko: '검수보고', zh: '检验报告' },
};

export default function SendLogsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '발송 로그 | KERYX';
  }, []);

  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 20;

  async function load(p: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/service-requests/send-logs?page=${p}&limit=${LIMIT}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '조회 실패');
        return;
      }
      setLogs(json.logs ?? []);
      setTotal(json.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          <LangText ko="📤 발송 관리" zh="📤 发送管理" />
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          <LangText ko="MD 회신 및 보고서 발송 내역을 관리합니다" zh="管理MD回复及报告发送记录" />
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500 mt-1">
            <LangText ko="전체 발송" zh="全部发送" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {logs.filter(l => l.status === 'sent').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            <LangText ko="발송완료" zh="已发送" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.status === 'opened').length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            <LangText ko="열람완료" zh="已查看" />
          </div>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
          {error === 'relation "report_send_logs" does not exist'
            ? <LangText ko="발송 내역 테이블이 아직 생성되지 않았습니다. Supabase에 마이그레이션을 적용해 주세요." zh="发送记录表尚未创建，请先应用Supabase迁移。" />
            : error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <LangText ko="발송일시" zh="发送时间" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <LangText ko="유형" zh="类型" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <LangText ko="제목" zh="标题" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <LangText ko="수신자" zh="收件人" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <LangText ko="발신자" zh="发件人" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <LangText ko="상태" zh="状态" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  <LangText ko="링크" zh="链接" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="animate-spin text-2xl mb-2">⏳</div>
                    <LangText ko="불러오는 중..." zh="加载中..." />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="text-3xl mb-2">📭</div>
                    <LangText ko="발송 내역이 없습니다" zh="暂无发送记录" />
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const statusInfo = STATUS_MAP[log.status] ?? STATUS_MAP.sent;
                  const typeInfo = TYPE_MAP[log.report_type] ?? { ko: log.report_type, zh: log.report_type };
                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ko-KR', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                          <LangText ko={typeInfo.ko} zh={typeInfo.zh} />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 max-w-xs truncate">
                        {log.report_title}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium">{log.sent_to_name}</div>
                        <div className="text-gray-400 text-xs">{log.sent_to_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.sent_by_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                          <LangText ko={statusInfo.ko} zh={statusInfo.zh} />
                        </span>
                        {log.opened_at && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(log.opened_at).toLocaleString('ko-KR', {
                              month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.report_url && (
                          <a
                            href={log.report_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 text-xs underline"
                          >
                            <LangText ko="열람 링크" zh="查看链接" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <LangText ko={`전체 ${total}건`} zh={`共 ${total} 条`} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ←
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
