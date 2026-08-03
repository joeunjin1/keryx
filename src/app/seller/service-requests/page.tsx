'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface ServiceRequest {
  id: string;
  request_no: string;
  service_type: 'market-research' | 'factory-matching' | 'sample-development';
  status: string;
  product_name: string;
  product_name_zh?: string;
  product_desc: string;
  description_zh?: string;
  requirements_zh?: string;
  contact_name: string;
  company_name: string | null;
  phone: string;
  email: string;
  is_urgent: boolean;
  created_at: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  author_name: string;
  author_role: string;
  content: string;
  content_zh?: string;
  content_ko?: string;
  is_internal: boolean;
  created_at: string;
}

const SERVICE_LABELS: Record<string, { ko: string; zh: string; icon: string; color: string }> = {
  'market-research':   { ko: '시장조사', zh: '市场调研', icon: '🔍', color: '#4f46e5' },
  'factory-matching':  { ko: '공장매칭', zh: '工厂匹配', icon: '🏭', color: '#0891b2' },
  'sample-development':{ ko: '샘플개발', zh: '样品开发', icon: '📦', color: '#059669' },
};
const STATUS_LABELS: Record<string, { ko: string; zh: string; color: string; desc: string }> = {
  pending:      { ko: '접수 대기', zh: '待接收', color: '#f59e0b', desc: '신청이 접수되었습니다. 담당 MD가 곧 연락드립니다.' },
  in_progress:  { ko: '처리 중',   zh: '处理中', color: '#4f46e5', desc: '담당 MD가 처리 중입니다.' },
  replied:      { ko: 'MD 답변',   zh: 'MD回复', color: '#10b981', desc: 'MD가 답변을 남겼습니다. 확인해 주세요!' },
  completed:    { ko: '완료',      zh: '已完成', color: '#6b7280', desc: '서비스가 완료되었습니다.' },
  cancelled:    { ko: '취소',      zh: '已取消', color: '#ef4444', desc: '신청이 취소되었습니다.' },
};
const TIMELINE_STEPS = [
  { key: 'pending',     ko: '접수',     zh: '已接收' },
  { key: 'in_progress', ko: 'MD 처리',  zh: 'MD处理' },
  { key: 'replied',     ko: 'MD 답변',  zh: 'MD回复' },
  { key: 'completed',   ko: '완료',     zh: '已完成' },
];

export default function SellerServiceRequestsPage() {
  const { lang } = useLangContext();
  const router = useRouter();
  const supabase = createClient();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, replies:service_request_replies(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) as { data: ServiceRequest[]; error: any };
      if (!error) setRequests(data ?? []);
      setLoading(false);
    })();
  }, [supabase, router]);

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab);
  const counts: Record<string, number> = { all: requests.length };
  Object.keys(STATUS_LABELS).forEach(s => { counts[s] = requests.filter(r => r.status === s).length; });

  const getStepIndex = (status: string) => TIMELINE_STEPS.findIndex(s => s.key === status);

  if (loading) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  return (
    <div>
      {/* 통합 안내 배너 */}
      {showBanner && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm font-bold text-indigo-800">
                {lang === 'zh' ? '新的咨询请使用MD沟通中心' : '새 의뢰는 MD 소통 센터를 이용해 주세요'}
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                {lang === 'zh' ? '此页面显示旧版申请记录。新的咨询和委托请通过MD沟通中心进行。' : '이 페이지는 구 신청 내역을 보여줍니다. 새 의뢰와 소통은 MD 소통 센터에서 진행해 주세요.'}
              </p>
              <button
                onClick={() => router.push('/seller/md-chat')}
                className="mt-2 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {lang === 'zh' ? '→ 前往MD沟通中心' : '→ MD 소통 센터로 이동'}
              </button>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-indigo-400 hover:text-indigo-600 text-lg flex-shrink-0">✕</button>
        </div>
      )}
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">
            <LangText ko="서비스 신청 내역" zh="服务申请记录" />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <LangText ko={`전체 ${requests.length}건`} zh={`共 ${requests.length} 件`} />
          </p>
        </div>
        <div className="flex items-center gap-3">
                    {/* 새 신청 버튼들 */}
          <div className="flex gap-2">
            <Link href="/quote"
              className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md"
              style={{ background: '#4f46e5' }}>
              🔍 {lang === 'ko' ? '시장조사' : '市场调研'}
            </Link>
            <Link href="/quote"
              className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md"
              style={{ background: '#0891b2' }}>
              🏭 {lang === 'ko' ? '공장매칭' : '工厂匹配'}
            </Link>
            <Link href="/quote"
              className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md"
              style={{ background: '#059669' }}>
              📦 {lang === 'ko' ? '샘플개발' : '样品开发'}
            </Link>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        /* 신청 없을 때 안내 */
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">
            <LangText ko="아직 신청 내역이 없습니다" zh="暂无申请记录" />
          </h3>
          <p className="text-sm text-gray-400 mb-8">
            <LangText ko="원하시는 서비스를 신청해 보세요" zh="请申请您所需的服务" />
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {(['market-research', 'factory-matching', 'sample-development'] as const).map(type => {
              const svc = SERVICE_LABELS[type];
              return (
                <Link key={type} href="/quote"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg"
                  style={{ background: svc.color }}>
                  <span>{svc.icon}</span>
                  <span>{lang === 'ko' ? svc.ko : svc.zh}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* 왼쪽: 목록 */}
          <div className="flex-1 min-w-0">
            {/* 상태 탭 */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {[{ id: 'all', ko: '전체', zh: '全部' }, ...Object.entries(STATUS_LABELS).map(([id, v]) => ({ id, ko: v.ko, zh: v.zh }))].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-none px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {lang === 'ko' ? t.ko : t.zh} {counts[t.id] > 0 && <span className="ml-1 opacity-70">({counts[t.id]})</span>}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.map(r => {
                const svc = SERVICE_LABELS[r.service_type];
                const st = STATUS_LABELS[r.status] ?? { ko: r.status, zh: r.status, color: '#9ca3af', desc: '' };
                const publicReplies = r.replies?.filter(rep => !rep.is_internal) ?? [];
                const hasNewReply = r.status === 'replied' && publicReplies.length > 0;
                return (
                  <div key={r.id}
                    onClick={() => setSelected(r)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${selected?.id === r.id ? 'border-purple-400 bg-purple-50' : hasNewReply ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: svc?.color ?? '#6b7280' }}>
                            {svc?.icon} {lang === 'ko' ? svc?.ko : svc?.zh}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${st.color}20`, color: st.color }}>
                            {lang === 'ko' ? st.ko : st.zh}
                          </span>
                          {hasNewReply && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500 text-white animate-pulse">💬 새 답변</span>}
                        </div>
                        <p className="font-bold text-gray-900 truncate">{lang === 'zh' && r.product_name_zh ? r.product_name_zh : r.product_name}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('ko-KR')} · {r.request_no}</p>
                      </div>
                      <div className="text-right flex-none">
                        {publicReplies.length > 0 && (
                          <span className="text-xs font-bold text-green-600">💬 {publicReplies.length}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 오른쪽: 상세 */}
          {selected && (
            <div className="w-96 flex-none bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              {/* 헤더 */}
              <div className="p-4 border-b border-gray-100" style={{ background: `${(SERVICE_LABELS[selected.service_type]?.color ?? '#6b7280')}10` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{SERVICE_LABELS[selected.service_type]?.icon}</span>
                    <div>
                      <span className="font-bold text-gray-900 text-sm">
                        {lang === 'ko' ? SERVICE_LABELS[selected.service_type]?.ko : SERVICE_LABELS[selected.service_type]?.zh}
                      </span>
                      <p className="text-xs text-gray-400">{selected.request_no}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>
                <h3 className="font-black text-gray-900">{lang === 'zh' && selected.product_name_zh ? selected.product_name_zh : selected.product_name}</h3>
              </div>

              {/* 진행 타임라인 */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  {TIMELINE_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(selected.status);
                    const isDone = i <= currentIdx;
                    const isActive = i === currentIdx;
                    return (
                      <div key={step.key} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-none">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {isDone && !isActive ? '✓' : i + 1}
                          </div>
                          <span className={`text-xs mt-1 font-medium text-center leading-tight ${isActive ? 'text-purple-600' : isDone ? 'text-gray-600' : 'text-gray-300'}`} style={{ fontSize: 10 }}>
                            {lang === 'ko' ? step.ko : step.zh}
                          </span>
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 mb-3 ${i < currentIdx ? 'bg-purple-400' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* 상태 설명 */}
                {STATUS_LABELS[selected.status] && (
                  <p className="text-xs text-center mt-2 font-medium" style={{ color: STATUS_LABELS[selected.status].color }}>
                    {STATUS_LABELS[selected.status].desc}
                  </p>
                )}
              </div>

              {/* 신청 내용 요약 */}
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2"><LangText ko="신청 내용" zh="申请内容" /></p>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-4">
                    {lang === 'zh' && selected.description_zh ? selected.description_zh : selected.product_desc}
                  </p>
                </div>
              </div>

              {/* MD 답변 목록 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500">
                  <LangText ko="MD 답변" zh="MD回复" />
                  {(selected.replies?.filter(r => !r.is_internal).length ?? 0) > 0 && (
                    <span className="ml-2 text-green-600">({selected.replies?.filter(r => !r.is_internal).length})</span>
                  )}
                </p>
                {(selected.replies?.filter(r => !r.is_internal) ?? []).length === 0 ? (
                  <div className="text-center py-8 text-gray-300">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-sm"><LangText ko="아직 MD 답변이 없습니다" zh="MD尚未回复" /></p>
                    <p className="text-xs mt-1"><LangText ko="24시간 내에 연락드립니다" zh="将在24小时内联系您" /></p>
                  </div>
                ) : (selected.replies?.filter(r => !r.is_internal) ?? []).map(rep => (
                  <div key={rep.id} className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {rep.author_name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900">{rep.author_name} MD</span>
                        <p className="text-xs text-gray-400">{new Date(rep.created_at).toLocaleDateString('ko-KR')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {lang === 'zh' && rep.content_zh ? rep.content_zh : rep.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* 추가 신청 안내 */}
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 text-center mb-2">
                  <LangText ko="추가 문의가 있으시면 새 서비스를 신청해 주세요" zh="如有其他问题，请重新申请服务" />
                </p>
                <Link href={`/apply/${selected.service_type}`}
                  className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                  <LangText ko="동일 서비스 재신청" zh="重新申请相同服务" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
