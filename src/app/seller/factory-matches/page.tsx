'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLangContext } from '@/components/layout/LangContext';

interface ReportItem {
  id: string;
  factory_name_ko: string;
  factory_name_zh: string | null;
  is_recommended: boolean;
}

interface Report {
  id: string;
  title: string;
  buyer_name: string;
  buyer_email: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  inquiry_summary: string | null;
  factory_match_report_items: ReportItem[];
}

const STATUS_LABELS: Record<string, { label: string; labelZh: string; color: string; icon: string }> = {
  sent:     { label: '미확인',   labelZh: '未查看', color: 'bg-blue-100 text-blue-700',   icon: '🔵' },
  viewed:   { label: '확인 완료', labelZh: '已查看', color: 'bg-green-100 text-green-700', icon: '✅' },
  archived: { label: '보관',     labelZh: '已归档', color: 'bg-gray-100 text-gray-500',   icon: '📁' },
};

export default function SellerFactoryMatchesPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/seller/factory-matches');
        if (!res.ok) throw new Error('보고서를 불러오지 못했습니다.');
        const data = await res.json();
        setReports(data.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            🏭 {t('공장 매칭 보고서', '工厂匹配报告')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t(
              'MD가 발송한 공장 매칭 보고서를 확인하세요.',
              '查看MD发送的工厂匹配报告。'
            )}
          </p>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* 오류 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              {t('아직 받은 보고서가 없습니다', '暂无收到的报告')}
            </h2>
            <p className="text-sm text-gray-400">
              {t(
                'MD가 공장 매칭 보고서를 발송하면 이곳에서 확인할 수 있습니다.',
                'MD发送工厂匹配报告后，您可以在此查看。'
              )}
            </p>
          </div>
        )}

        {/* 보고서 목록 */}
        {!loading && !error && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => {
              const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS['viewed'];
              const recommendedItems = report.factory_match_report_items?.filter(i => i.is_recommended) || [];
              const allItems = report.factory_match_report_items || [];

              return (
                <div
                  key={report.id}
                  onClick={() => router.push(`/seller/factory-matches/${report.id}`)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 제목 + 상태 */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {report.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            🆕 {t('새 보고서', '新报告')}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.icon} {lang === 'zh' ? statusInfo.labelZh : statusInfo.label}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {report.title}
                      </h2>
                      {report.inquiry_summary && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {report.inquiry_summary}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                      <div>{t('발송일', '发送日')}</div>
                      <div className="font-medium text-gray-600">{formatDate(report.sent_at)}</div>
                    </div>
                  </div>

                  {/* 공장 목록 미리보기 */}
                  {allItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {t('추천 공장', '推荐工厂')} ({allItems.length}개):
                        </span>
                        {allItems.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              item.is_recommended
                                ? 'bg-indigo-50 text-indigo-700 font-medium'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {item.is_recommended ? '⭐ ' : ''}
                            {lang === 'zh' && item.factory_name_zh
                              ? item.factory_name_zh
                              : item.factory_name_ko}
                          </span>
                        ))}
                        {allItems.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{allItems.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 하단 화살표 */}
                  <div className="flex items-center justify-end mt-2">
                    <span className="text-xs text-indigo-500 font-medium">
                      {t('자세히 보기', '查看详情')} →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
