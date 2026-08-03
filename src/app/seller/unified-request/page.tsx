'use client';

import { useEffect, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; labelZh: string; color: string }> = {
  submitted: { label: '접수됨', labelZh: '已提交', color: 'bg-blue-100 text-blue-700' },
  reviewing: { label: '검토 중', labelZh: '审核中', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: '진행 중', labelZh: '进行中', color: 'bg-green-100 text-green-700' },
  report_ready: { label: '보고서 완료', labelZh: '报告完成', color: 'bg-purple-100 text-purple-700' },
  completed: { label: '완료', labelZh: '已完成', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: '취소됨', labelZh: '已取消', color: 'bg-red-100 text-red-700' },
};

type Lang = 'ko' | 'zh';

export default function UnifiedRequestListPage() {
  const { lang, setLang } = useLangContext();
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/unified-request')
      .then(r => r.json())
      .then(d => setRequests(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  const T = {
    ko: { title: '공장 매칭 & 시장조사 의뢰 내역', new: '새 의뢰서 작성', empty: '아직 의뢰 내역이 없습니다.', emptyDesc: '새 의뢰서를 작성하면 전담 MD가 최적의 공장을 찾아드립니다.' },
    zh: { title: '工厂匹配 & 市场调研委托记录', new: '新建委托书', empty: '暂无委托记录。', emptyDesc: '提交新委托书后，专属MD将为您找到最优工厂。' },
    en: { title: 'Factory Matching & Research Requests', new: 'New Request', empty: 'No requests yet.', emptyDesc: 'Submit a new request and your dedicated MD will find the best factory.' },
  }[lang];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{T.title}</h1>
          <div className="flex gap-1 mt-1">
            {((['ko', 'zh'] as Lang[])).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded text-xs font-medium ${lang === l ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-700'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <Link href="/seller/unified-request/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" />
          {T.new}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">{T.empty}</p>
          <p className="text-sm text-gray-400 mt-1">{T.emptyDesc}</p>
          <Link href="/seller/unified-request/new"
            className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" />
            {T.new}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const status = STATUS_MAP[req.status as string] || STATUS_MAP.submitted;
            const items = (req.unified_request_items as Record<string, unknown>[]) || [];
            return (
              <Link key={req.id as string} href={`/seller/unified-request/${req.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-300 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {lang === 'zh' ? status.labelZh : status.label}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{req.request_no as string}</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{req.company_name as string}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {req.product_category as string} · {req.expected_order_qty as string}{req.expected_order_unit as string}
                    </p>
                    {items.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        파일럿 품목 {items.length}개: {items.slice(0, 2).map(i => i.product_name as string).join(', ')}
                        {items.length > 2 && ` 외 ${items.length - 2}개`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400">
                      {new Date(req.created_at as string).toLocaleDateString('ko-KR')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
