'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  md_assigned: 'bg-indigo-100 text-indigo-700',
  factory_contacted: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-green-100 text-green-700',
  report_ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_KO: Record<string, string> = {
  submitted: '접수됨',
  reviewing: '검토 중',
  md_assigned: 'MD 배정',
  factory_contacted: '공장 연락 중',
  in_progress: '진행 중',
  report_ready: '보고서 완료',
  completed: '완료',
  cancelled: '취소됨',
};

const STATUS_ZH: Record<string, string> = {
  submitted: '已接收',
  reviewing: '审核中',
  md_assigned: 'MD已分配',
  factory_contacted: '联系工厂中',
  in_progress: '进行中',
  report_ready: '报告完成',
  completed: '已完成',
  cancelled: '已取消',
};

const URGENCY_KO: Record<string, string> = { normal: '일반', urgent: '긴급', very_urgent: '매우 긴급' };
const URGENCY_COLOR: Record<string, string> = { normal: 'text-gray-500', urgent: 'text-orange-500', very_urgent: 'text-red-600' };

type Request = Record<string, any>;

export default function MdUnifiedRequestsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/unified-request')
      .then(r => r.json())
      .then(d => { setRequests(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch = !search ||
      (r.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.request_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.product_category || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    submitted: requests.filter(r => r.status === 'submitted').length,
    in_progress: requests.filter(r => ['reviewing', 'md_assigned', 'factory_contacted', 'in_progress'].includes(r.status)).length,
    report_ready: requests.filter(r => r.status === 'report_ready').length,
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-black text-gray-900">
          <LangText ko="통합 의뢰 처리" zh="综合委托处理" />
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          <LangText ko="바이어가 제출한 의뢰를 검토하고 공장과 협력하여 보고서를 작성합니다." zh="审核买家提交的委托，与工厂协作撰写报告。" />
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label_ko: '신규 접수', label_zh: '新接收', count: counts.submitted, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
          { label_ko: '처리 중', label_zh: '处理中', count: counts.in_progress, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
          { label_ko: '보고서 완료', label_zh: '报告完成', count: counts.report_ready, color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-700' },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl border p-3 text-center ${s.color}`}>
            <p className={`text-2xl font-black ${s.textColor}`}>{s.count}</p>
            <p className="text-xs text-gray-600 mt-0.5"><LangText ko={s.label_ko} zh={s.label_zh} /></p>
          </div>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="회사명, 의뢰번호, 카테고리 검색..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white">
          <option value="all">전체</option>
          {Object.entries(STATUS_KO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* 의뢰 목록 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm"><LangText ko="불러오는 중..." zh="加载中..." /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm"><LangText ko="해당하는 의뢰가 없습니다." zh="没有相关委托。" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <button key={req.id} onClick={() => router.push(`/md/unified-requests/${req.id}`)}
              className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-orange-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-black text-gray-900">{req.company_name || '(회사명 없음)'}</p>
                  <p className="text-xs text-gray-400 font-mono">{req.request_no}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_COLOR[req.status] || 'bg-gray-100 text-gray-600'}`}>
                    <LangText ko={STATUS_KO[req.status] || req.status} zh={STATUS_ZH[req.status] || req.status} />
                  </span>
                  {req.urgency && req.urgency !== 'normal' && (
                    <span className={`text-xs font-bold ${URGENCY_COLOR[req.urgency]}`}>
                      ⚡ <LangText ko={URGENCY_KO[req.urgency]} zh={req.urgency === 'urgent' ? '紧急' : '非常紧急'} />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                {req.product_category && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">{req.product_category}</span>
                )}
                {req.service_type && (
                  <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{req.service_type}</span>
                )}
                {req.target_quantity && (
                  <span className="text-gray-400">{Number(req.target_quantity).toLocaleString()}개</span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : ''}
                </p>
                {req.assigned_md_id && (
                  <span className="text-xs text-indigo-600 font-bold">✓ MD 배정됨</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
