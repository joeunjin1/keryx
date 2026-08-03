'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLangContext } from '@/components/layout/LangContext';

interface Report {
  id: string;
  title: string;
  buyer_name: string;
  buyer_email: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  email_sent: boolean;
  sms_sent: boolean;
  created_by_name: string;
  factory_match_report_items: { id: string; factory_name_ko: string; is_recommended: boolean }[];
}

const STATUS_LABELS: Record<string, { label: string; labelZh: string; color: string }> = {
  draft:    { label: '작성 중',   labelZh: '草稿',   color: 'bg-gray-100 text-gray-600' },
  sent:     { label: '발송 완료', labelZh: '已发送', color: 'bg-green-100 text-green-700' },
  viewed:   { label: '조회됨',   labelZh: '已查看', color: 'bg-blue-100 text-blue-700' },
  archived: { label: '보관',     labelZh: '已归档', color: 'bg-yellow-100 text-yellow-700' },
};

export default function FactoryMatchReportsPage() {
  const router = useRouter();
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = filter !== 'all' ? `?status=${filter}` : '';
        const res = await fetch(`/api/admin/factory-match-reports${params}`);
        const data = await res.json();
        setReports(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🏭 {t('공장 매칭 보고서', '工厂匹配报告')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('바이어에게 발송한 공장 매칭 보고서를 관리합니다.', '管理发送给买家的工厂匹配报告。')}
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/factory-match-reports/new')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-sm"
          >
            + {t('새 보고서 작성', '新建报告')}
          </button>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all', label: t('전체', '全部'), labelZh: '全部' },
            { value: 'draft', label: t('작성 중', '草稿'), labelZh: '草稿' },
            { value: 'sent', label: t('발송 완료', '已发送'), labelZh: '已发送' },
            { value: 'viewed', label: t('조회됨', '已查看'), labelZh: '已查看' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>{t('불러오는 중...', '加载中...')}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">🏭</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {t('보고서가 없습니다', '暂无报告')}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {t('새 공장 매칭 보고서를 작성해보세요.', '请新建工厂匹配报告。')}
            </p>
            <button
              onClick={() => router.push('/admin/factory-match-reports/new')}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              + {t('새 보고서 작성', '新建报告')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.draft;
              const factoryCount = report.factory_match_report_items?.length || 0;
              const recommended = report.factory_match_report_items?.filter(f => f.is_recommended).length || 0;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/admin/factory-match-reports/${report.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {lang === 'zh' ? statusInfo.labelZh : statusInfo.label}
                        </span>
                        {report.email_sent && <span className="text-xs text-blue-500">📧</span>}
                        {report.sms_sent && <span className="text-xs text-green-500">📱</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {t('바이어', '买家')}: <span className="font-medium text-gray-700">{report.buyer_name}</span>
                        {report.buyer_email && <span className="text-gray-400 ml-2">({report.buyer_email})</span>}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>🏭 {factoryCount}{t('개 공장', '家工厂')}</span>
                        {recommended > 0 && <span className="text-yellow-500">⭐ {recommended}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {report.sent_at
                          ? t(`발송: ${new Date(report.sent_at).toLocaleDateString('ko-KR')}`, `发送: ${new Date(report.sent_at).toLocaleDateString('zh-CN')}`)
                          : t(`작성: ${new Date(report.created_at).toLocaleDateString('ko-KR')}`, `创建: ${new Date(report.created_at).toLocaleDateString('zh-CN')}`)}
                      </p>
                      <p className="text-xs text-gray-400">{report.created_by_name}</p>
                    </div>
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
