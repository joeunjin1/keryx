'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface Stats {
  market_research_total: number;
  market_research_pending: number;
  market_research_in_progress: number;
  sample_total: number;
  sample_pending: number;
  sample_in_progress: number;
  factory_total: number;
  factory_pending: number;
  factory_in_progress: number;
  reports_draft: number;
  reports_sent: number;
}

interface RecentRequest {
  id: string;
  request_no: string;
  service_type: string;
  status: string;
  product_name: string;
  contact_name: string;
  company_name: string | null;
  created_at: string;
}

const SERVICE_META: Record<string, { ko: string; zh: string; icon: string; color: string; href: string }> = {
  'market-research':   { ko: '시장조사',  zh: '市场调研', icon: '🔍', color: '#4f46e5', href: '/md/mvp/market-research' },
  'sample-development':{ ko: '샘플제작',  zh: '样品制作', icon: '📦', color: '#059669', href: '/md/mvp/sample' },
  'factory-matching':  { ko: '공장매칭',  zh: '工厂匹配', icon: '🏭', color: '#0891b2', href: '/md/mvp/factory-matching' },
};

const STATUS_META: Record<string, { ko: string; zh: string; color: string; bg: string }> = {
  pending:     { ko: '대기중',  zh: '待处理', color: '#92400e', bg: '#fef3c7' },
  in_progress: { ko: '진행중',  zh: '进行中', color: '#1e40af', bg: '#dbeafe' },
  replied:     { ko: 'MD답변',  zh: 'MD回复', color: '#065f46', bg: '#d1fae5' },
  completed:   { ko: '완료',    zh: '已完成', color: '#374151', bg: '#f3f4f6' },
  cancelled:   { ko: '취소',    zh: '已取消', color: '#991b1b', bg: '#fee2e2' },
};

export default function MvpDashboardPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = 'MVP 서비스 | KERYX';
  }, []);

  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 서비스 신청 통계
      const { data: requests } = await supabase
        .from('service_requests')
        .select('service_type, status')
        .in('service_type', ['market-research', 'sample-development', 'factory-matching']) as any;

      const r = (requests || []) as any[];
      const s: Stats = {
        market_research_total: r.filter((x: any) => x.service_type === 'market-research').length,
        market_research_pending: r.filter((x: any) => x.service_type === 'market-research' && x.status === 'pending').length,
        market_research_in_progress: r.filter((x: any) => x.service_type === 'market-research' && x.status === 'in_progress').length,
        sample_total: r.filter((x: any) => x.service_type === 'sample-development').length,
        sample_pending: r.filter((x: any) => x.service_type === 'sample-development' && x.status === 'pending').length,
        sample_in_progress: r.filter((x: any) => x.service_type === 'sample-development' && x.status === 'in_progress').length,
        factory_total: r.filter((x: any) => x.service_type === 'factory-matching').length,
        factory_pending: r.filter((x: any) => x.service_type === 'factory-matching' && x.status === 'pending').length,
        factory_in_progress: r.filter((x: any) => x.service_type === 'factory-matching' && x.status === 'in_progress').length,
        reports_draft: 0,
        reports_sent: 0,
      };

      // 보고서 통계 (테이블이 없을 수 있으므로 try-catch)
      try {
        const { data: reports } = await supabase
          .from('market_research_reports')
          .select('status') as any;
        const rpts = (reports || []) as any[];
        s.reports_draft = rpts.filter((x: any) => x.status === 'draft').length;
        s.reports_sent = rpts.filter((x: any) => x.status === 'sent').length;
      } catch {}

      setStats(s);

      // 최근 신청 10건
      const { data: recentData } = await supabase
        .from('service_requests')
        .select('id, request_no, service_type, status, product_name, contact_name, company_name, created_at')
        .in('service_type', ['market-research', 'sample-development', 'factory-matching'])
        .order('created_at', { ascending: false })
        .limit(10) as any;

      setRecent((recentData || []) as RecentRequest[]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-gray-500"><LangText ko="MVP 서비스 현황 로딩 중..." zh="MVP服务概况加载中..." /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🚀</span>
          <h1 className="text-2xl font-bold text-gray-900">
            <LangText ko="MVP 서비스 현황" zh="MVP服务概况" />
          </h1>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
            <LangText ko="2~3개월 집중 서비스" zh="2~3个月重点服务" />
          </span>
        </div>
        <p className="text-gray-500 text-sm">
          <LangText ko="시장조사 · 샘플제작 · 공장매칭 3가지 핵심 서비스를 집중 관리합니다." zh="集中管理市场调研·样品制作·工厂匹配三项核心服务。" />
        </p>
      </div>

      {/* 서비스 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* 시장조사 */}
        <Link href="/md/mvp/market-research" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <div>
                <div className="font-bold text-gray-900"><LangText ko="시장조사" zh="市场调研" /></div>
                <div className="text-xs text-gray-400">Market Research</div>
              </div>
            </div>
            <span className="text-2xl font-black text-indigo-600">{stats?.market_research_total ?? 0}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-amber-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-600">{stats?.market_research_pending ?? 0}</div>
              <div className="text-xs text-amber-500"><LangText ko="대기중" zh="待处理" /></div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{stats?.market_research_in_progress ?? 0}</div>
              <div className="text-xs text-blue-500"><LangText ko="진행중" zh="进行中" /></div>
            </div>
          </div>
          <div className="mt-3 text-xs text-indigo-600 font-medium flex items-center gap-1">
            <LangText ko="보고서 작성 포함" zh="含报告撰写" /> →
          </div>
        </Link>

        {/* 샘플제작 */}
        <Link href="/md/mvp/sample" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-green-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📦</span>
              <div>
                <div className="font-bold text-gray-900"><LangText ko="샘플제작" zh="样品制作" /></div>
                <div className="text-xs text-gray-400">Sample Development</div>
              </div>
            </div>
            <span className="text-2xl font-black text-green-600">{stats?.sample_total ?? 0}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-amber-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-600">{stats?.sample_pending ?? 0}</div>
              <div className="text-xs text-amber-500"><LangText ko="대기중" zh="待处理" /></div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{stats?.sample_in_progress ?? 0}</div>
              <div className="text-xs text-blue-500"><LangText ko="진행중" zh="进行中" /></div>
            </div>
          </div>
          <div className="mt-3 text-xs text-green-600 font-medium flex items-center gap-1">
            <LangText ko="샘플비 결제 관리 포함" zh="含样品费支付管理" /> →
          </div>
        </Link>

        {/* 공장매칭 */}
        <Link href="/md/mvp/factory-matching" className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-cyan-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏭</span>
              <div>
                <div className="font-bold text-gray-900"><LangText ko="공장매칭" zh="工厂匹配" /></div>
                <div className="text-xs text-gray-400">Factory Matching</div>
              </div>
            </div>
            <span className="text-2xl font-black text-cyan-600">{stats?.factory_total ?? 0}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-amber-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-600">{stats?.factory_pending ?? 0}</div>
              <div className="text-xs text-amber-500"><LangText ko="대기중" zh="待处理" /></div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{stats?.factory_in_progress ?? 0}</div>
              <div className="text-xs text-blue-500"><LangText ko="진행중" zh="进行中" /></div>
            </div>
          </div>
          <div className="mt-3 text-xs text-cyan-600 font-medium flex items-center gap-1">
            <LangText ko="공장 추천 및 견적 관리" zh="含工厂推荐及报价管理" /> →
          </div>
        </Link>
      </div>

      {/* 보고서 현황 */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📄</span>
          <h2 className="font-bold text-indigo-900"><LangText ko="시장조사 보고서 현황" zh="市场调研报告概况" /></h2>
        </div>
        <div className="flex gap-4">
          <div className="bg-white rounded-lg px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-black text-gray-400">{stats?.reports_draft ?? 0}</div>
            <div className="text-xs text-gray-400"><LangText ko="작성중 (초안)" zh="草稿" /></div>
          </div>
          <div className="bg-white rounded-lg px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-black text-green-600">{stats?.reports_sent ?? 0}</div>
            <div className="text-xs text-green-500"><LangText ko="발송 완료" zh="已发送" /></div>
          </div>
          <div className="flex-1 flex items-center justify-end">
            <Link
              href="/md/mvp/market-research"
              className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <LangText ko="+ 보고서 작성하기" zh="+ 撰写报告" />
            </Link>
          </div>
        </div>
      </div>

      {/* 최근 신청 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            <LangText ko="최근 서비스 신청" zh="最近服务申请" />
          </h2>
          <span className="text-xs text-gray-400"><LangText ko="최근 10건" zh="最近10条" /></span>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm"><LangText ko="아직 서비스 신청이 없습니다." zh="暂无服务申请。" /></p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map((req) => {
              const svc = SERVICE_META[req.service_type];
              const sts = STATUS_META[req.status] || STATUS_META['pending'];
              return (
                <Link
                  key={req.id}
                  href={`${svc?.href ?? '/md/mvp'}?highlight=${req.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl w-8 text-center">{svc?.icon ?? '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-gray-400">{req.request_no}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color: svc?.color, backgroundColor: svc?.color + '18' }}
                      >
                        {svc?.ko}
                      </span>
                    </div>
                    <div className="font-medium text-gray-800 text-sm truncate">
                      {req.product_name || <span className="text-gray-400"><LangText ko="(제품명 없음)" zh="(无产品名)" /></span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {req.company_name || req.contact_name}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ color: sts.color, backgroundColor: sts.bg }}
                    >
                      {sts.ko}
                    </span>
                    <div className="text-xs text-gray-300 mt-1">
                      {new Date(req.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
