'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import LangText from '@/components/layout/LangText';

interface ServiceRequest {
  id: string;
  request_no: string;
  service_type: string;
  status: string;
  product_name: string;
  product_desc: string | null;
  contact_name: string;
  company_name: string | null;
  phone: string;
  email: string;
  priority: string | null;
  wants_sample: boolean;
  md_request_note: string | null;
  created_at: string;
  assigned_md_id: string | null;
}

interface Report {
  id: string;
  report_no: string;
  request_id: string;
  status: string;
  report_title: string;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { ko: string; zh: string; color: string; bg: string }> = {
  pending:     { ko: '대기중',  zh: '待处理', color: '#92400e', bg: '#fef3c7' },
  in_progress: { ko: '진행중',  zh: '进行中', color: '#1e40af', bg: '#dbeafe' },
  replied:     { ko: 'MD답변',  zh: 'MD回复', color: '#065f46', bg: '#d1fae5' },
  completed:   { ko: '완료',    zh: '已完成', color: '#374151', bg: '#f3f4f6' },
  cancelled:   { ko: '취소',    zh: '已取消', color: '#991b1b', bg: '#fee2e2' },
};

const REPORT_STATUS_META: Record<string, { ko: string; zh: string; color: string; bg: string }> = {
  draft:     { ko: '작성중', zh: '草稿',  color: '#92400e', bg: '#fef3c7' },
  published: { ko: '완성',   zh: '完成',  color: '#1e40af', bg: '#dbeafe' },
  sent:      { ko: '발송완료', zh: '已发送', color: '#065f46', bg: '#d1fae5' },
};

export default function MarketResearchManagePage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '시장조사 보고서 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const supabase = createClient();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: reqData } = await supabase
        .from('service_requests')
        .select('*')
        .eq('service_type', 'market-research')
        .order('created_at', { ascending: false }) as any;
      setRequests((reqData || []) as ServiceRequest[]);

      try {
        const { data: rptData } = await supabase
          .from('market_research_reports')
          .select('id, report_no, request_id, status, report_title, created_at, updated_at') as any;
        setReports((rptData || []) as Report[]);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingStatus(id);
    await supabase.from('service_requests').update({ status: newStatus }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setUpdatingStatus(null);
  }

  async function createReport(req: ServiceRequest) {
    const { data, error } = await supabase
      .from('market_research_reports')
      .insert({
        request_id: req.id,
        report_title: `${req.product_name} 시장조사 보고서`,
        buyer_name: req.contact_name,
        buyer_company: req.company_name || '',
        product_name: req.product_name,
        issued_at: new Date().toISOString().split('T')[0],
        status: 'draft',
      })
      .select('id')
      .single() as any;

    if (!error && data) {
      window.location.href = `/md/mvp/market-research/report/${data.id}`;
    }
  }

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch = !search ||
      r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.request_no?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  function getReportForRequest(requestId: string) {
    return reports.find(r => r.request_id === requestId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500"><LangText ko="시장조사 목록 로딩 중..." zh="市场调研列表加载中..." /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/md/mvp" className="text-gray-400 hover:text-gray-600 text-sm">← MVP</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium text-sm"><LangText ko="시장조사 관리" zh="市场调研管理" /></span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🔍 <LangText ko="시장조사 관리" zh="市场调研管理" />
            <span className="text-lg font-normal text-gray-400">({filtered.length}건)</span>
          </h1>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder={t('제품명, 바이어명, 신청번호 검색...', '搜索产品名、买家名、申请编号...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-indigo-400"
        />
        <div className="flex gap-1">
          {['all', 'pending', 'in_progress', 'replied', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '전체' : STATUS_META[s]?.ko}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400"><LangText ko="해당하는 시장조사 신청이 없습니다." zh="暂无相关市场调研申请。" /></p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const sts = STATUS_META[req.status] || STATUS_META['pending'];
            const report = getReportForRequest(req.id);
            const rptSts = report ? REPORT_STATUS_META[report.status] : null;
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  {/* 왼쪽: 신청 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{req.request_no}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color: sts.color, backgroundColor: sts.bg }}
                      >
                        {sts.ko}
                      </span>
                      {req.priority && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {req.priority === 'price' ? '💰 가격 우선' : req.priority === 'quality' ? '⭐ 품질 우선' : '⚡ 납기 우선'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-1">
                      {req.product_name || <span className="text-gray-400">{t('(제품명 없음)', '(无产品名)')}</span>}
                    </h3>
                    {req.product_desc && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{req.product_desc}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>👤 {req.contact_name}</span>
                      {req.company_name && <span>🏢 {req.company_name}</span>}
                      <span>📞 {req.phone}</span>
                      <span>📅 {new Date(req.created_at).toLocaleDateString('ko-KR')}</span>
                      {req.wants_sample && <span className="text-green-600 font-medium">{t('📦 샘플 희망', '📦 期望样品')}</span>}
                    </div>
                    {req.md_request_note && (
                      <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                        💬 {req.md_request_note}
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 액션 */}
                  <div className="shrink-0 flex flex-col gap-2 min-w-[160px]">
                    {/* 상태 변경 */}
                    <select
                      value={req.status}
                      onChange={e => updateStatus(req.id, e.target.value)}
                      disabled={updatingStatus === req.id}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                    >
                      <option value="pending">{t('대기중', '等待中')}</option>
                      <option value="in_progress">{t('진행중', '进行中')}</option>
                      <option value="replied">{t('MD답변', 'MD回复')}</option>
                      <option value="completed">{t('완료', '完成')}</option>
                      <option value="cancelled">{t('취소', '取消')}</option>
                    </select>

                    {/* 보고서 버튼 */}
                    {report ? (
                      <Link
                        href={`/md/mvp/market-research/report/${report.id}`}
                        className="flex items-center justify-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <span>📄</span>
                        <span>
                          {rptSts?.ko} 보고서 열기
                        </span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => createReport(req)}
                        className="flex items-center justify-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <span>✏️</span>
                        <span><LangText ko="보고서 작성 시작" zh="开始撰写报告" /></span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
