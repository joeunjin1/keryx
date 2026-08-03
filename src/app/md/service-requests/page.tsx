'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface UnifiedRequest {
  id: string;
  request_no: string;
  status: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  product_category: string | null;
  current_challenges: string | null;
  assigned_md_id: string | null;
  admin_note: string | null;
  md_note: string | null;
  created_at: string;
}
interface ServiceRequest {
  id: string;
  request_no: string;
  service_type: 'market-research' | 'factory-matching' | 'sample-development';
  status: string;
  product_name: string;
  product_desc: string;
  contact_name: string;
  company_name: string | null;
  main_business: string | null;
  phone: string;
  wechat_id: string | null;
  kakao_id: string | null;
  email: string;
  md_request_note: string | null;
  wants_long_term: boolean;
  has_sales_exp: boolean;
  priority: string | null;
  moq: string | null;
  target_price: string | null;
  product_purpose: string | null;
  wants_package: boolean;
  wants_sample: boolean;
  sample_qty: string | null;
  delivery_address: string | null;
  design_notes: string | null;
  assigned_md_id: string | null;
  is_urgent: boolean;
  created_at: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  request_id: string;
  author_name: string;
  reply_type: string;  // 'md_reply' | 'admin_reply' | 'system'
  content: string;
  created_at: string;
}

const SERVICE_LABELS: Record<string, { ko: string; zh: string; icon: string; color: string }> = {
  'market-research':   { ko: '시장조사', zh: '市场调研', icon: '🔍', color: '#4f46e5' },
  'factory-matching':  { ko: '공장매칭', zh: '工厂匹配', icon: '🏭', color: '#0891b2' },
  'sample-development':{ ko: '샘플개발', zh: '样品开发', icon: '📦', color: '#059669' },
};
const STATUS_LABELS: Record<string, { ko: string; zh: string; color: string }> = {
  pending:      { ko: '대기중',   zh: '待处理',  color: '#f59e0b' },
  in_progress:  { ko: '진행중',   zh: '进行中',  color: '#4f46e5' },
  replied:      { ko: 'MD답변',   zh: 'MD回复',  color: '#10b981' },
  completed:    { ko: '완료',     zh: '已完成',  color: '#6b7280' },
};

export default function MdServiceRequestsPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '구 서비스 신청 내역 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const router = useRouter();
  const supabase = createClient();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myName, setMyName] = useState('MD');
  const [myId, setMyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [unifiedRequests, setUnifiedRequests] = useState<UnifiedRequest[]>([]);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [mainTab, setMainTab] = useState<'service' | 'unified'>('service');
  const PAGE_SIZE = 20;

  const fetchRequests = useCallback(async (mdId: string | null) => {
    setLoading(true);
    try {
      let query = supabase
        .from('service_requests')
        .select('*, replies:service_request_replies(*)')
        .order('created_at', { ascending: false })
        .limit(200);
      // MD는 미배정 + 자신에게 배정된 것 모두 볼 수 있음
      if (mdId) {
        // pending은 모두 보이고, 배정된 것도 보임
        query = query.or(`status.eq.pending,assigned_md_id.eq.${mdId}`);
      }
      const { data, error } = await query as { data: ServiceRequest[]; error: any };
      if (!error) setRequests(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase]);
  const fetchUnifiedRequests = async () => {
    setUnifiedLoading(true);
    try {
      const { data } = await supabase
        .from('unified_requests')
        .select('*, seller:sellers(business_name)')
        .order('created_at', { ascending: false })
        .limit(100) as { data: UnifiedRequest[]; error: any };
      setUnifiedRequests(data ?? []);
    } finally {
      setUnifiedLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('display_name, kind').eq('id', user.id).single() as { data: any; error: any };
      if (profile) setMyName(profile.display_name ?? 'MD');
      const { data: internalUser } = await supabase.from('internal_users').select('id').eq('user_id', user.id).single() as { data: any; error: any };
      const mdId = internalUser?.id ?? null;
      setMyId(mdId);
      await fetchRequests(mdId);
      await fetchUnifiedRequests();
    })();
  }, [supabase, fetchRequests]);

  /* 상태 변경 */
  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    await supabase.from('service_requests').update({ status: newStatus, assigned_md_id: myId }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, assigned_md_id: myId } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
  }, [supabase, selected, myId]);

  /* 답변 등록 */
  const handleReply = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    setSubmitting(true);
    try {
      // API 라우트를 통해 답변 등록 (service_role 사용으로 RLS 우회)
      const res = await fetch('/api/service-requests/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selected.id,
          content: replyText.trim(),
          reply_type: 'md_reply',
          is_internal: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('[handleReply] API error:', json);
        alert(`답변 등록 실패: ${json.error ?? res.statusText}`);
        return;
      }
      const data: Reply = json.reply;
      const updated = { ...selected, replies: [...(selected.replies ?? []), data], status: 'replied' };
      setSelected(updated);
      setRequests(prev => prev.map(r => r.id === selected.id ? updated : r));
      setReplyText('');
    } finally {
      setSubmitting(false);
    }
  }, [selected, replyText, supabase]);

  /* 접수 처리 (pending → in_progress + 자신에게 배정) */
  const handleAccept = useCallback(async (r: ServiceRequest) => {
    await supabase.from('service_requests').update({ status: 'in_progress', assigned_md_id: myId }).eq('id', r.id);
    const updated = { ...r, status: 'in_progress', assigned_md_id: myId };
    setRequests(prev => prev.map(req => req.id === r.id ? updated : req));
    setSelected(updated);
  }, [supabase, myId]);

  const filtered = requests.filter(r => {
    const statusOk = tab === 'all' || r.status === tab;
    const typeOk = typeFilter === 'all' || r.service_type === typeFilter;
    return statusOk && typeOk;
  });
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const counts: Record<string, number> = { all: requests.length };
  Object.keys(STATUS_LABELS).forEach(s => { counts[s] = requests.filter(r => r.status === s).length; });

  if (loading) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  return (
    <div className="flex h-full gap-4">
      {/* 왼쪽: 목록 */}
      <div className="flex-1 min-w-0">
        {/* 통합 안내 배너 */}
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm font-bold text-indigo-800">
                {lang === 'zh' ? '新的咨询请使用综合沟通管理' : '새 의뢰는 통합 소통 관리를 이용해 주세요'}
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                {lang === 'zh' ? '此页面显示旧版申请记录。新的咨询和委托请通过综合沟通管理进行。' : '이 페이지는 구 신청 내역을 보여줍니다. 새 의뢰와 소통은 통합 소통 관리에서 진행해 주세요.'}
              </p>
              <button
                onClick={() => router.push('/md/communications')}
                className="mt-2 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {lang === 'zh' ? '→ 前往综合沟通管理' : '→ 통합 소통 관리로 이동'}
              </button>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <h1 className="text-xl font-black text-gray-900">
            <LangText ko="구 서비스 신청 내역" zh="旧版服务申请记录" />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <LangText ko={`${myName} MD · 전체 ${requests.length}건`} zh={`${myName} MD · 共 ${requests.length} 件`} />
          </p>
        </div>

        {/* 서비스 유형 필터 */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { id: 'all', ko: '전체', zh: '全部' },
            { id: 'market-research', ko: '시장조사', zh: '市场调研' },
            { id: 'factory-matching', ko: '공장매칭', zh: '工厂匹配' },
            { id: 'sample-development', ko: '샘플개발', zh: '样品开发' },
          ].map(f => (
            <button key={f.id} onClick={() => { setTypeFilter(f.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${typeFilter === f.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              <LangText ko={f.ko} zh={f.zh} />
            </button>
          ))}
        </div>

        {/* 상태 탭 */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {[{ id: 'all', ko: '전체', zh: '全部' }, ...Object.entries(STATUS_LABELS).map(([id, v]) => ({ id, ko: v.ko, zh: v.zh }))].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
              className={`flex-none px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <LangText ko={t.ko} zh={t.zh} /> {counts[t.id] > 0 && <span className="ml-1 opacity-70">({counts[t.id]})</span>}
            </button>
          ))}
        </div>

        {/* 통합 의뢰 목록 */}
        {mainTab === 'unified' && (
          <div className="space-y-2">
            {unifiedLoading ? (
              <div className="text-center py-12 text-gray-400">
                <LangText ko="로딩 중..." zh="加载中..." />
              </div>
            ) : unifiedRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                <LangText ko="통합 의뢰 내역이 없습니다" zh="暂无综合委托记录" />
              </div>
            ) : unifiedRequests.map(r => (
              <div key={r.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{r.request_no}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: r.status === 'submitted' ? '#7c3aed' : r.status === 'in_progress' ? '#f59e0b' : r.status === 'completed' ? '#10b981' : '#6b7280' }}>
                        {r.status === 'submitted' ? '신규접수' : r.status === 'in_progress' ? '처리중' : r.status === 'completed' ? '완료' : r.status}
                      </span>
                      {!r.assigned_md_id && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">미배정</span>}
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">{r.company_name ?? '-'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.contact_name} · {r.contact_email}</div>
                    {r.product_category && <div className="text-xs text-gray-600 mt-1">제품: {r.product_category}</div>}
                    {r.current_challenges && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.current_challenges}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('ko-KR')}</div>
                    <a href={`/admin/unified-requests/${r.id}`} className="mt-1 inline-block text-xs text-purple-600 hover:underline">상세보기 →</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 서비스 요청 목록 */}
        {mainTab === 'service' && (
          <div>
            <div className="space-y-2">
              {paginated.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                  <div className="text-3xl mb-2">📭</div>
                  <LangText ko="신청 내역이 없습니다" zh="暂无申请记录" />
                </div>
              ) : paginated.map(r => {
                const svc = SERVICE_LABELS[r.service_type];
                const st = STATUS_LABELS[r.status] ?? { ko: r.status, zh: r.status, color: '#9ca3af' };
                const isMyRequest = r.assigned_md_id === myId;
                const replyCount = r.replies?.filter(rep => rep.reply_type !== 'system').length ?? 0;
                return (
                  <div key={r.id}
                    onClick={() => setSelected(r)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selected?.id === r.id ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: svc?.color ?? '#6b7280' }}>
                            {svc?.icon} <LangText ko={svc?.ko ?? ''} zh={svc?.zh ?? ''} />
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${st.color}20`, color: st.color }}>
                            <LangText ko={st.ko} zh={st.zh} />
                          </span>
                          {r.is_urgent && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">🚨 긴급</span>}
                          {isMyRequest && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">내 담당</span>}
                          {replyCount > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">💬 {replyCount}</span>}
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">{r.product_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.contact_name} {r.company_name ? `· ${r.company_name}` : ''}</p>
                      </div>
                      <div className="text-right flex-none">
                        <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('ko-KR')}</p>
                        {r.status === 'pending' && (
                          <button onClick={e => { e.stopPropagation(); handleAccept(r); }}
                            className="mt-1 px-2 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all">
                            접수
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← 이전</button>
                <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50">다음 →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽: 상세 + 답변 */}
      {selected ? (
        <div className="w-96 flex-none bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500">{selected.request_no}</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <h3 className="font-black text-gray-900 text-base">{selected.product_name}</h3>
            <p className="text-xs text-gray-500 mt-1">{selected.contact_name} · {selected.phone}</p>
            {selected.email && <p className="text-xs text-gray-400">{selected.email}</p>}
            {selected.wechat_id && <p className="text-xs text-gray-400">위챗: {selected.wechat_id}</p>}
            {selected.kakao_id && <p className="text-xs text-gray-400">카카오: {selected.kakao_id}</p>}
          </div>

          {/* 신청 내용 */}
          <div className="p-4 border-b border-gray-100 overflow-y-auto flex-none" style={{ maxHeight: '220px' }}>
            <p className="text-xs font-semibold text-gray-500 mb-2"><LangText ko="신청 내용" zh="申请内容" /></p>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1"><LangText ko="제품 설명" zh="产品说明" /></p>
                <p className="text-gray-700 whitespace-pre-wrap text-xs">{selected.product_desc}</p>
              </div>
              {selected.service_type === 'market-research' && (
                <div className="space-y-1">
                  {selected.md_request_note && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-500 mb-1">MD 특이사항</p>
                      <p className="text-blue-700 text-xs">{selected.md_request_note}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {selected.wants_long_term && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">장기거래 희망</span>}
                    {selected.has_sales_exp && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">판매 경험 있음</span>}
                  </div>
                </div>
              )}
              {selected.service_type === 'factory-matching' && (
                <div className="bg-cyan-50 rounded-lg p-3 space-y-1">
                  {selected.priority && <p className="text-xs text-cyan-700">우선순위: {selected.priority}</p>}
                  {selected.product_purpose && <p className="text-xs text-cyan-700">용도: {selected.product_purpose}</p>}
                  {selected.moq && <p className="text-xs text-cyan-700">MOQ: {selected.moq}</p>}
                  {selected.target_price && <p className="text-xs text-cyan-700">희망단가: {selected.target_price}</p>}
                  <div className="flex gap-2 flex-wrap mt-1">
                    {selected.wants_package && <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded">패키지 디자인 필요</span>}
                    {selected.wants_sample && <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded">샘플 요청</span>}
                  </div>
                </div>
              )}
              {selected.service_type === 'sample-development' && (
                <div className="bg-green-50 rounded-lg p-3 space-y-1">
                  {selected.sample_qty && <p className="text-xs text-green-700">수량: {selected.sample_qty}</p>}
                  {selected.delivery_address && <p className="text-xs text-green-700">수령지: {selected.delivery_address}</p>}
                  {selected.design_notes && <p className="text-xs text-green-700">디자인: {selected.design_notes}</p>}
                </div>
              )}
              {selected.main_business && <p className="text-xs text-gray-500">사업분야: {selected.main_business}</p>}
            </div>
          </div>

          {/* 답변 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500">
              <LangText ko={`답변 ${selected.replies?.length ?? 0}건`} zh={`回复 ${selected.replies?.length ?? 0} 件`} />
            </p>
            {(selected.replies ?? []).length === 0 ? (
              <div className="text-center py-6 text-gray-300 text-sm">
                <LangText ko="아직 답변이 없습니다" zh="暂无回复" />
              </div>
            ) : (selected.replies ?? []).filter(r => r.reply_type !== 'system').map(rep => (
              <div key={rep.id} className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-700">{rep.author_name}</span>
                  <span className="text-xs text-gray-400">{rep.reply_type === 'md_reply' ? 'MD' : rep.reply_type === 'admin_reply' ? '관리자' : ''}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(rep.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{rep.content}</p>
              </div>
            ))}
          </div>

          {/* 답변 입력 */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="바이어에게 전달할 답변을 입력하세요..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm resize-none bg-white"
            />
            <div className="flex justify-end mt-2">
              <button onClick={handleReply} disabled={submitting || !replyText.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                {submitting ? '...' : <LangText ko="답변 등록" zh="提交回复" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-96 flex-none bg-gray-50 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-3">👈</div>
            <p className="text-sm"><LangText ko="신청 건을 선택하세요" zh="请选择申请件" /></p>
          </div>
        </div>
      )}
    </div>
  );
}
