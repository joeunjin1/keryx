'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const STATUS_ZH: Record<string, string> = {
  factory_contacted: '待回复', in_progress: '进行中',
  report_ready: '报告完成', completed: '已完成',
};
const STATUS_COLOR: Record<string, string> = {
  factory_contacted: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-green-100 text-green-700',
  report_ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
};

type Request = Record<string, any>;

export default function FactoryUnifiedRequestsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 공장 포털에서는 factory_contacted 이상의 의뢰만 표시
    fetch('/api/unified-request')
      .then(r => r.json())
      .then(d => {
        const visible = (d.data || []).filter((r: Request) =>
          ['factory_contacted', 'in_progress', 'report_ready', 'completed'].includes(r.status)
        );
        setRequests(visible);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-black text-gray-900">
          <LangText ko="MD 의뢰 목록" zh="MD委托列表" />
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          <LangText ko="MD로부터 전달받은 의뢰를 확인하고 견적과 정보를 제공하세요." zh="确认从MD收到的委托，提供报价和信息。" />
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm"><LangText ko="불러오는 중..." zh="加载中..." /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <LangText ko="전달받은 의뢰가 없습니다." zh="没有收到委托。" />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <button key={req.id} onClick={() => router.push(`/factory/unified-requests/${req.id}`)}
              className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-orange-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-black text-gray-900">{req.product_category || '(카테고리 없음)'}</p>
                  <p className="text-xs text-gray-400 font-mono">{req.request_no}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${STATUS_COLOR[req.status] || 'bg-gray-100 text-gray-600'}`}>
                  <LangText ko={req.status} zh={STATUS_ZH[req.status] || req.status} />
                </span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                {req.target_quantity && <span>{Number(req.target_quantity).toLocaleString()}개</span>}
                {req.deadline_requirement && <span>납기: {req.deadline_requirement}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
