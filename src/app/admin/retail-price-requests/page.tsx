'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, CircleAlert, Clock3, RefreshCw, X } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';
import { formatKrw } from '@/lib/retail/types';

type Decision = 'approved' | 'rejected';
type Status = 'pending' | Decision | 'cancelled';

type PriceRequest = {
  id: string;
  product_id: string;
  requester_user_id: string;
  reviewer_user_id: string | null;
  current_price_krw: number | null;
  requested_price_krw: number;
  reason: string;
  status: Status;
  reviewer_note: string;
  requested_at: string;
  reviewed_at: string | null;
  product: { id: string; product_code: string | null; name_ko: string | null; name_zh: string | null } | null;
};

const copy = {
  ko: {
    eyebrow: 'PRICE APPROVAL', title: '스토어 판매가 변경 승인', description: '최초 판매가는 상품 공개 설정에서 등록하고, 이미 등록된 판매가를 바꿀 때는 다른 관리자의 승인 후에만 반영됩니다.', pending: '검토 대기', history: '처리 이력', all: '전체', reload: '새로고침', loading: '가격 변경 요청을 불러오는 중입니다.', empty: '표시할 가격 변경 요청이 없습니다.', current: '현재 판매가', requested: '요청 판매가', reason: '변경 사유', requestedAt: '요청 시각', pendingBadge: '검토 대기', approvedBadge: '승인 완료', rejectedBadge: '반려', cancelledBadge: '취소', self: '요청자는 직접 승인하거나 반려할 수 없습니다.', approve: '승인', reject: '반려', reviewTitle: '가격 변경 검토', reviewNote: '검토 메모', notePlaceholder: '승인 또는 반려 사유를 남길 수 있습니다. (선택)', close: '닫기', process: '처리하기', processing: '처리 중...', approvedNotice: '가격 변경을 승인했습니다. 스토어 판매가에 반영됩니다.', rejectedNotice: '가격 변경 요청을 반려했습니다.', error: '가격 변경 요청을 처리하지 못했습니다.', unknownProduct: '상품 정보 없음',
  },
  zh: {
    eyebrow: 'PRICE APPROVAL', title: '商店售价变更审批', description: '首次售价可在商品公开设置中登记。已登记售价变更时，须由另一名管理员审批后才能生效。', pending: '待审核', history: '处理记录', all: '全部', reload: '刷新', loading: '正在加载售价变更申请。', empty: '没有可显示的售价变更申请。', current: '当前售价', requested: '申请售价', reason: '变更原因', requestedAt: '申请时间', pendingBadge: '待审核', approvedBadge: '已批准', rejectedBadge: '已驳回', cancelledBadge: '已取消', self: '申请人不能自行批准或驳回。', approve: '批准', reject: '驳回', reviewTitle: '审核售价变更', reviewNote: '审核备注', notePlaceholder: '可填写批准或驳回的理由。（选填）', close: '关闭', process: '处理', processing: '处理中...', approvedNotice: '已批准售价变更，将反映到商店售价。', rejectedNotice: '已驳回售价变更申请。', error: '无法处理售价变更申请。', unknownProduct: '无商品信息',
  },
};

function badge(status: Status, labels: typeof copy.ko) {
  if (status === 'approved') return { label: labels.approvedBadge, className: 'bg-emerald-50 text-emerald-700' };
  if (status === 'rejected') return { label: labels.rejectedBadge, className: 'bg-rose-50 text-rose-700' };
  if (status === 'cancelled') return { label: labels.cancelledBadge, className: 'bg-stone-100 text-stone-500' };
  return { label: labels.pendingBadge, className: 'bg-orange-50 text-orange-700' };
}

export default function AdminRetailPriceRequestsPage() {
  const { lang } = useLangContext();
  const t = copy[lang];
  const [requests, setRequests] = useState<PriceRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [filter, setFilter] = useState<'pending' | 'history' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<PriceRequest | null>(null);
  const [decision, setDecision] = useState<Decision>('approved');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/retail/price-requests', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.error);
      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
      setCurrentUserId(payload.currentUserId || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => requests.filter((request) => filter === 'pending' ? request.status === 'pending' : filter === 'history' ? request.status !== 'pending' : true), [filter, requests]);
  const productName = (request: PriceRequest) => lang === 'zh' ? request.product?.name_zh || request.product?.name_ko || t.unknownProduct : request.product?.name_ko || request.product?.name_zh || t.unknownProduct;

  const openReview = (request: PriceRequest, nextDecision: Decision) => {
    setSelected(request);
    setDecision(nextDecision);
    setNote('');
    setError('');
  };

  const review = async () => {
    if (!selected) return;
    setProcessing(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/retail/price-requests/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, note }) });
      const payload = await response.json();
      if (!response.ok || !payload.request) throw new Error(payload.error || t.error);
      setRequests((current) => current.map((request) => request.id === selected.id ? { ...request, ...payload.request } : request));
      setSelected(null);
      setNotice(decision === 'approved' ? t.approvedNotice : t.rejectedNotice);
      window.setTimeout(() => setNotice(''), 4000);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : t.error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black tracking-[0.16em] text-orange-700">{t.eyebrow}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950">{t.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{t.description}</p></div><button type="button" onClick={load} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-100 active:scale-95"><RefreshCw className="h-4 w-4" />{t.reload}</button></div>
      {notice && <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p>}
      {error && !selected && <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setFilter('pending')} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${filter === 'pending' ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}>{t.pending}</button><button type="button" onClick={() => setFilter('history')} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${filter === 'history' ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}>{t.history}</button><button type="button" onClick={() => setFilter('all')} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${filter === 'all' ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}>{t.all}</button></div>
      {loading ? <div className="mt-6 space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-3xl bg-stone-200" />)}</div> : filtered.length === 0 ? <section className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-sm text-stone-500">{t.empty}</section> : <div className="mt-6 grid gap-4">{filtered.map((request) => { const status = badge(request.status, t); const selfRequest = request.requester_user_id === currentUserId; return <article key={request.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${status.className}`}>{status.label}</span>{request.product?.product_code && <span className="text-xs font-bold text-stone-400">{request.product.product_code}</span>}</div><h2 className="mt-3 text-lg font-black text-stone-950">{productName(request)}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t.reason}: {request.reason || '-'}</p><p className="mt-1 text-xs text-stone-400">{t.requestedAt}: {new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.requested_at))}</p></div><div className="grid shrink-0 grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-3 text-right"><div><p className="text-xs font-bold text-stone-500">{t.current}</p><p className="mt-1 text-sm font-black">{request.current_price_krw === null ? '-' : formatKrw(request.current_price_krw)}</p></div><div><p className="text-xs font-bold text-orange-700">{t.requested}</p><p className="mt-1 text-sm font-black text-orange-700">{formatKrw(request.requested_price_krw)}</p></div></div>{request.status === 'pending' && <div className="flex shrink-0 gap-2">{selfRequest ? <p className="max-w-48 rounded-xl bg-stone-100 px-3 py-2 text-xs leading-5 text-stone-600">{t.self}</p> : <><button type="button" onClick={() => openReview(request, 'approved')} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-95"><Check className="h-4 w-4" />{t.approve}</button><button type="button" onClick={() => openReview(request, 'rejected')} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95"><X className="h-4 w-4" />{t.reject}</button></>}</div>}</div></article>; })}</div>}
      {selected && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-950/50 sm:items-center sm:p-6"><section className="w-full max-w-xl rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"><div className="flex items-center justify-between border-b border-stone-200 px-5 py-4"><div><p className="text-xs font-black tracking-[0.16em] text-orange-700">PRICE REVIEW</p><h2 className="mt-1 text-lg font-black">{t.reviewTitle}</h2></div><button type="button" onClick={() => setSelected(null)} className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100" aria-label={t.close}><X className="h-5 w-5" /></button></div><div className="space-y-5 p-5"><div className="rounded-2xl bg-stone-50 p-4"><p className="text-sm font-black">{productName(selected)}</p><p className="mt-2 text-sm text-stone-600">{t.current}: {selected.current_price_krw === null ? '-' : formatKrw(selected.current_price_krw)} → <strong className="text-orange-700">{formatKrw(selected.requested_price_krw)}</strong></p><p className="mt-2 text-sm leading-6 text-stone-600">{t.reason}: {selected.reason || '-'}</p></div><label className="block text-sm font-bold">{t.reviewNote}<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="mt-2 min-h-28 w-full rounded-xl border border-stone-200 p-3 text-base outline-none focus:ring-2 focus:ring-stone-200" placeholder={t.notePlaceholder} /></label>{error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}</div><div className="flex gap-3 border-t border-stone-200 p-5"><button type="button" onClick={() => setSelected(null)} className="min-h-12 flex-1 rounded-xl bg-stone-100 text-sm font-bold text-stone-700">{t.close}</button><button type="button" onClick={review} disabled={processing} className={`min-h-12 flex-1 rounded-xl text-sm font-bold text-white disabled:bg-stone-300 ${decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>{processing ? t.processing : `${decision === 'approved' ? t.approve : t.reject} ${t.process}`}</button></div></section></div>}
    </div>
  );
}
