'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import Image from 'next/image';
import { useLangContext } from '@/components/layout/LangContext';


/* ─── 타입 ─────────────────────────────────────────────────────────── */
interface ServiceRequest {
  id: string;
  request_no: string;
  service_type: 'market-research' | 'factory-matching' | 'sample-development';
  status: string;
  product_name: string;
  product_desc: string;
  product_images: string[] | null;
  contact_name: string;
  company_name: string | null;
  main_business: string | null;
  phone: string;
  wechat_id: string | null;
  email: string | null;
  // 시장조사
  md_request_note: string | null;
  wants_long_term: boolean;
  has_sales_exp: boolean;
  // 공장매칭
  priority: string | null;
  moq: string | null;
  target_price: string | null;
  product_purpose: string | null;
  factory_region: string | null;
  wants_package: boolean;
  wants_sample: boolean;
  // 샘플개발
  sample_qty: string | null;
  delivery_address: string | null;
  design_notes: string | null;
  // 공통
  assigned_md_id: string | null;
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
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

/* ─── 상수 ─────────────────────────────────────────────────────────── */
const SERVICE_LABELS: Record<string, { ko: string; zh: string; icon: string; color: string }> = {
  'market-research':    { ko: '시장조사',  zh: '市场调研', icon: '🔍', color: '#4f46e5' },
  'factory-matching':   { ko: '공장매칭',  zh: '工厂匹配', icon: '🏭', color: '#0891b2' },
  'sample-development': { ko: '샘플개발',  zh: '样品开发', icon: '📦', color: '#059669' },
};
const STATUS_LABELS: Record<string, { ko: string; zh: string; color: string }> = {
  pending:     { ko: '대기중',  zh: '待处理', color: '#f59e0b' },
  in_progress: { ko: '진행중',  zh: '进行中', color: '#4f46e5' },
  replied:     { ko: 'MD답변',  zh: 'MD回复', color: '#10b981' },
  completed:   { ko: '완료',    zh: '已完成', color: '#6b7280' },
  cancelled:   { ko: '취소',    zh: '已取消', color: '#ef4444' },
};
const STATUS_FLOW = ['pending', 'in_progress', 'replied', 'completed'];

const PRIORITY_LABELS: Record<string, { ko: string; zh: string }> = {
  price:    { ko: '가격 우선',   zh: '价格优先' },
  quality:  { ko: '품질 우선',   zh: '品质优先' },
  delivery: { ko: '납기 우선',   zh: '交期优先' },
  stable:   { ko: '안정성 우선', zh: '稳定性优先' },
};
const PURPOSE_LABELS: Record<string, { ko: string; zh: string }> = {
  sale:      { ko: '판매용',       zh: '销售用' },
  gift:      { ko: '판촉·증정용',  zh: '促销·赠品用' },
  personal:  { ko: '개인 사용',    zh: '个人使用' },
  wholesale: { ko: '도매·대리점',  zh: '批发·代理商' },
};

/* ─── 컴포넌트 ─────────────────────────────────────────────────────── */
export default function AdminServiceRequestsPage() {

  // 페이지 제목 설정
  useEffect(() => {
    document.title = '서비스 요청 관리 | KERYX';
  }, []);
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const supabase = createClient();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myName, setMyName] = useState('관리자');
  const [myRole, setMyRole] = useState('admin');
  const [page, setPage] = useState(1);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  /* ── 데이터 조회 (API 라우트 경유 - service_role_key로 RLS 우회) ── */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/admin/service-requests/list');
      const json = await res.json();
      if (res.ok) {
        setRequests(json.data ?? []);
      } else {
        const errMsg = json.error || `API 오류 (${res.status})`;
        console.error('[service-requests] API error:', res.status, errMsg);
        setApiError(errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[service-requests] fetch error:', msg);
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, kind')
          .eq('id', user.id)
          .single() as { data: any; error: any };
        if (profile) {
          setMyName(profile.display_name ?? '관리자');
          setMyRole(profile.kind ?? 'admin');
        }
      }
      await fetchRequests();
    })();
  }, [supabase, fetchRequests]);

  /* 상태 변경 */
  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    await supabase.from('service_requests').update({ status: newStatus }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
  }, [supabase, selected]);

  /* 답변 등록 */
  const handleReply = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    setSubmitting(true);
    try {
      // reply_type: isInternal이면 'system', myRole이 admin이면 'admin_reply', 그 외 'md_reply'
      const replyType = isInternal ? 'system' : (myRole === 'admin' ? 'admin_reply' : 'md_reply');
      // API 라우트를 통해 답변 등록 (service_role 사용으로 RLS 우회)
      const res = await fetch('/api/service-requests/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selected.id,
          content: replyText.trim(),
          reply_type: replyType,
          is_internal: isInternal,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('[handleReply] API error:', json);
        alert(`답변 등록 실패: ${json.error ?? res.statusText}`);
        return;
      }
      const data: Reply = json.reply;
      const updated = { ...selected, replies: [...(selected.replies ?? []), data], status: isInternal ? selected.status : 'replied' };
      setSelected(updated);
      setRequests(prev => prev.map(r => r.id === selected.id ? updated : r));
      setReplyText('');
    } finally {
      setSubmitting(false);
    }
  }, [selected, replyText, isInternal, myRole, supabase]);

  /* 필터링 */
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

  if (apiError) return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">⚠️</div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-red-800 mb-2">신청 데이터를 불러올 수 없습니다</h2>
            <p className="text-red-600 text-sm mb-4 font-mono bg-red-100 rounded px-3 py-2">{apiError}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-800 font-bold text-sm mb-2">🔑 해결 방법: Vercel 환경변수 설정 필요</p>
              <ol className="text-amber-700 text-xs space-y-1 list-decimal list-inside">
                <li>Vercel 대시보드 접속 → keryx 프로젝트 선택</li>
                <li>Settings → Environment Variables 클릭</li>
                <li><code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> 추가</li>
                <li>Supabase 대시보드 → Settings → API → service_role 키 복사</li>
                <li>Vercel에 붙여넣기 후 저장 → 재배포</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-blue-800 font-bold text-sm mb-2">🗃️ 해결 방법 2: Supabase SQL 실행</p>
              <p className="text-blue-700 text-xs mb-2">email NOT NULL 제약으로 인해 신청서 저장 실패 가능성:</p>
              <code className="block bg-blue-100 rounded px-3 py-2 text-xs font-mono text-blue-900">
                ALTER TABLE service_requests ALTER COLUMN email DROP NOT NULL;
              </code>
            </div>
            <button
              onClick={fetchRequests}
              className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-700 transition-all text-sm"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full gap-4">
      {/* 이미지 라이트박스 */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            <img src={lightboxImg} alt="첨부 이미지" className="w-full h-full object-contain rounded-xl" />
            <button
              className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full text-white font-bold text-lg flex items-center justify-center"
              onClick={() => setLightboxImg(null)}
            >✕</button>
          </div>
        </div>
      )}

      {/* 왼쪽: 목록 */}
      <div className="flex-1 min-w-0">
        {/* 헤더 */}
        <div className="mb-4">
          <h1 className="text-xl font-black text-gray-900">
            <LangText ko="서비스 신청 관리" zh="服务申请管理" />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <LangText ko={`전체 ${requests.length}건`} zh={`共 ${requests.length} 件`} />
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

        {/* 목록 */}
        <div className="space-y-2">
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-2">📭</div>
              <LangText ko="신청 내역이 없습니다" zh="暂无申请记录" />
            </div>
          ) : paginated.map(r => {
            const svc = SERVICE_LABELS[r.service_type];
            const st = STATUS_LABELS[r.status] ?? { ko: r.status, zh: r.status, color: '#9ca3af' };
            const replyCount = r.replies?.filter(rep => rep.reply_type !== 'system').length ?? 0;
            const hasImages = r.product_images && r.product_images.length > 0;
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
                      {replyCount > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">💬 {replyCount}</span>}
                      {hasImages && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">📸 {r.product_images!.length}</span>}
                    </div>
                    <p className="font-bold text-gray-900 text-sm truncate">{r.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.contact_name} {r.company_name ? `· ${r.company_name}` : ''} · {r.phone}</p>
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-xs text-gray-400">{r.request_no}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← <LangText ko="이전" zh="上一页" /></button>
            <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><LangText ko="다음" zh="下一页" /> →</button>
          </div>
        )}
      </div>

      {/* 오른쪽: 상세 + 답변 */}
      {selected ? (
        <div className="w-[420px] flex-none bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {/* 상세 헤더 */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500">{selected.request_no}</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <h3 className="font-black text-gray-900 text-base">{selected.product_name}</h3>
            <p className="text-xs text-gray-500 mt-1">{selected.contact_name} · {selected.company_name ?? '-'} · {selected.phone}</p>
            {selected.email && <p className="text-xs text-gray-400">{selected.email}</p>}
            {selected.wechat_id && <p className="text-xs text-gray-400">💬 WeChat: {selected.wechat_id}</p>}
          </div>

          {/* 상태 변경 */}
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2"><LangText ko="상태 변경" zh="状态变更" /></p>
            <div className="flex gap-1 flex-wrap">
              {STATUS_FLOW.map(s => {
                const st = STATUS_LABELS[s];
                return (
                  <button key={s} onClick={() => handleStatusChange(selected.id, s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${selected.status === s ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    style={selected.status === s ? { background: st.color } : {}}>
                    <LangText ko={st.ko} zh={st.zh} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 신청 내용 + 사진 */}
          <div className="p-4 border-b border-gray-100 overflow-y-auto" style={{ maxHeight: '320px' }}>
            <p className="text-xs font-semibold text-gray-500 mb-2"><LangText ko="신청 내용" zh="申请内容" /></p>
            <div className="space-y-2 text-sm">
              {/* 제품 설명 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1"><LangText ko="제품 설명" zh="产品说明" /></p>
                <p className="text-gray-700 whitespace-pre-wrap text-xs">{selected.product_desc}</p>
              </div>

              {/* 첨부 이미지 */}
              {selected.product_images && selected.product_images.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-500 mb-2">📸 <LangText ko={`첨부 이미지 ${selected.product_images.length}장`} zh={`附件图片 ${selected.product_images.length} 张`} /></p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.product_images.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-blue-200"
                        onClick={() => setLightboxImg(url)}
                      >
                        <img src={url} alt={`첨부 ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                          <span className="text-white text-xs font-bold">🔍</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 서비스별 상세 */}
              {selected.service_type === 'market-research' && (
                <div className="bg-indigo-50 rounded-lg p-3 space-y-1">
                  {selected.has_sales_exp !== null && (
                    <p className="text-xs text-indigo-700">
                      <LangText ko={`판매 경험: ${selected.has_sales_exp ? '있음' : '없음'}`} zh={`销售经验: ${selected.has_sales_exp ? '有' : '无'}`} />
                    </p>
                  )}
                  {selected.wants_long_term !== null && (
                    <p className="text-xs text-indigo-700">
                      <LangText ko={`장기거래 희망: ${selected.wants_long_term ? '예' : '아니오'}`} zh={`希望长期合作: ${selected.wants_long_term ? '是' : '否'}`} />
                    </p>
                  )}
                  {selected.md_request_note && (
                    <div className="mt-2 pt-2 border-t border-indigo-200">
                      <p className="text-xs text-indigo-500 mb-1"><LangText ko="MD 특이사항" zh="MD特别备注" /></p>
                      <p className="text-xs text-indigo-700 whitespace-pre-wrap">{selected.md_request_note}</p>
                    </div>
                  )}
                </div>
              )}

              {selected.service_type === 'factory-matching' && (
                <div className="bg-cyan-50 rounded-lg p-3 space-y-1">
                  {selected.priority && (
                    <p className="text-xs text-cyan-700">
                      <LangText
                        ko={`우선순위: ${PRIORITY_LABELS[selected.priority]?.ko ?? selected.priority}`}
                        zh={`优先级: ${PRIORITY_LABELS[selected.priority]?.zh ?? selected.priority}`}
                      />
                    </p>
                  )}
                  {selected.product_purpose && (
                    <p className="text-xs text-cyan-700">
                      <LangText
                        ko={`용도: ${PURPOSE_LABELS[selected.product_purpose]?.ko ?? selected.product_purpose}`}
                        zh={`用途: ${PURPOSE_LABELS[selected.product_purpose]?.zh ?? selected.product_purpose}`}
                      />
                    </p>
                  )}
                  {selected.moq && <p className="text-xs text-cyan-700"><LangText ko={`MOQ: ${selected.moq}`} zh={`MOQ: ${selected.moq}`} /></p>}
                  {selected.target_price && <p className="text-xs text-cyan-700"><LangText ko={`희망단가: ${selected.target_price}`} zh={`目标单价: ${selected.target_price}`} /></p>}
                  {selected.factory_region && <p className="text-xs text-cyan-700"><LangText ko={`희망지역: ${selected.factory_region}`} zh={`希望地区: ${selected.factory_region}`} /></p>}
                  <p className="text-xs text-cyan-700">
                    <LangText
                      ko={`패키지 필요: ${selected.wants_package ? '예' : '아니오'} / 샘플 필요: ${selected.wants_sample ? '예' : '아니오'}`}
                      zh={`需要包装: ${selected.wants_package ? '是' : '否'} / 需要样品: ${selected.wants_sample ? '是' : '否'}`}
                    />
                  </p>
                </div>
              )}

              {selected.service_type === 'sample-development' && (
                <div className="bg-green-50 rounded-lg p-3 space-y-1">
                  {selected.sample_qty && <p className="text-xs text-green-700"><LangText ko={`수량: ${selected.sample_qty}`} zh={`数量: ${selected.sample_qty}`} /></p>}
                  {selected.delivery_address && <p className="text-xs text-green-700"><LangText ko={`수령지: ${selected.delivery_address}`} zh={`收货地址: ${selected.delivery_address}`} /></p>}
                  {selected.design_notes && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs text-green-500 mb-1"><LangText ko="디자인 요청사항" zh="设计要求" /></p>
                      <p className="text-xs text-green-700 whitespace-pre-wrap">{selected.design_notes}</p>
                    </div>
                  )}
                </div>
              )}
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
            ) : (selected.replies ?? []).map(rep => (
              <div key={rep.id} className={`rounded-xl p-3 ${rep.reply_type === 'system' ? 'bg-yellow-50 border border-yellow-200' : 'bg-purple-50 border border-purple-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-700">{rep.author_name}</span>
                  <span className="text-xs text-gray-400">{rep.reply_type === 'admin_reply' ? '관리자' : rep.reply_type === 'md_reply' ? 'MD' : ''}</span>
                  {rep.reply_type === 'system' && <span className="text-xs bg-yellow-200 text-yellow-700 px-1.5 py-0.5 rounded font-bold"><LangText ko="내부" zh="内部" /></span>}
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
              placeholder={`답변 내용을 입력하세요...`}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm resize-none bg-white"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                <span className="text-xs text-gray-600"><LangText ko="내부 메모 (바이어 비공개)" zh="内部备注（不对买家显示）" /></span>
              </label>
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
            <p className="text-sm"><LangText ko="신청 건을 선택하면 상세 내용과 답변을 확인할 수 있습니다" zh="选择申请件可查看详情和回复" /></p>
          </div>
        </div>
      )}
    </div>
  );
}
