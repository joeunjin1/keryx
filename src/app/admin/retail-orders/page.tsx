'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, PackageCheck, Search, Truck, CircleCheck, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';
import { formatKrw } from '@/lib/retail/types';

type RetailOrder = {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  customer_name: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_postcode: string;
  shipping_address1: string;
  shipping_address2: string;
  shipping_message: string;
  total_amount_krw: number;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  items: Array<{ product_name_ko_snapshot: string; product_image_url_snapshot: string; quantity: number; line_total_krw: number }>;
};

const nextAction: Record<string, { status: 'fulfillment_ready' | 'shipped' | 'delivered'; ko: string; zh: string; icon: typeof PackageCheck }> = {
  paid: { status: 'fulfillment_ready', ko: '상품 준비 시작', zh: '开始备货', icon: PackageCheck },
  fulfillment_ready: { status: 'shipped', ko: '배송 시작', zh: '开始配送', icon: Truck },
  shipped: { status: 'delivered', ko: '배송 완료', zh: '配送完成', icon: CircleCheck },
};

const statusText: Record<string, [string, string]> = {
  payment_pending: ['결제 대기', '等待支付'],
  paid: ['결제 완료', '支付完成'],
  fulfillment_ready: ['상품 준비', '商品准备中'],
  shipped: ['배송 중', '配送中'],
  delivered: ['배송 완료', '配送完成'],
  cancel_requested: ['취소 요청', '申请取消'],
  cancelled: ['주문 취소', '订单已取消'],
  payment_failed: ['결제 미완료', '支付未完成'],
  refunded: ['환불 완료', '退款完成'],
};

export default function AdminRetailOrdersPage() {
  const router = useRouter();
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const supabase = createClient() as any;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let request = supabase.from('retail_orders').select('id, order_no, status, payment_status, customer_name, recipient_name, recipient_phone, shipping_postcode, shipping_address1, shipping_address2, shipping_message, total_amount_krw, payment_method, created_at, paid_at, items:retail_order_items(product_name_ko_snapshot, product_image_url_snapshot, quantity, line_total_krw)').order('created_at', { ascending: false });
    if (status !== 'all') request = request.eq('status', status);
    if (query.trim()) request = request.or(`order_no.ilike.%${query.trim()}%,customer_name.ilike.%${query.trim()}%,recipient_name.ilike.%${query.trim()}%`);
    const { data, error: loadError } = await request;
    if (loadError) setError(t('소매 주문을 불러오지 못했습니다.', '无法加载零售订单。'));
    else setOrders((data || []) as RetailOrder[]);
    setLoading(false);
  }, [status, query]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?next=/admin/retail-orders'); return; }
      const { data: profile } = await supabase.from('user_profiles').select('kind').eq('id', user.id).maybeSingle();
      if (profile?.kind !== 'admin') { router.replace('/admin'); return; }
      load();
    })();
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = async (order: RetailOrder) => {
    const action = nextAction[order.status];
    if (!action) return;
    setUpdating(order.id);
    setError('');
    const response = await fetch(`/api/admin/retail/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextStatus: action.status }),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error || t('주문 상태를 변경하지 못했습니다.', '无法更新订单状态。'));
    else setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...payload.order } : item));
    setUpdating(null);
  };

  const statuses = useMemo(() => Array.from(new Set(['all', ...orders.map((order) => order.status)])), [orders]);

  return <div className="mx-auto max-w-screen-2xl p-4 sm:p-6"><div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black tracking-[0.16em] text-orange-700">RETAIL FULFILLMENT</p><h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950">{t('소매 주문 관리', '零售订单管理')}</h1><p className="mt-2 text-sm leading-6 text-stone-600">{t('결제 완료된 주문만 준비·배송·완료 순서로 처리합니다. 상태 변경은 주문 이력에 함께 기록됩니다.', '仅按备货、配送、完成的顺序处理已付款订单。每次状态变更都会保存在订单历史中。')}</p></div><button type="button" onClick={load} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 active:scale-95"><RefreshCw className="h-4 w-4" />{t('새로고침', '刷新')}</button></div>{error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}<div className="mt-6 flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:flex-row"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-stone-50 px-3"><Search className="h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('주문번호·주문자·수령인 검색', '搜索订单号、订购人或收件人')} className="min-h-11 w-full bg-transparent text-sm outline-none" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"><option value="all">{t('전체 상태', '全部状态')}</option>{statuses.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{statusText[value]?.[lang === 'zh' ? 1 : 0] || value}</option>)}</select></div>{loading ? <div className="mt-6 space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-3xl bg-stone-200" />)}</div> : <div className="mt-6 space-y-4">{orders.map((order) => { const action = nextAction[order.status]; const ActionIcon = action?.icon || ChevronRight; const statusLabel = statusText[order.status]?.[lang === 'zh' ? 1 : 0] || order.status; return <article key={order.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-stone-950 px-2.5 py-1 text-[10px] font-black text-white">{statusLabel}</span><span className="text-xs font-bold text-stone-400">{order.order_no}</span></div><h2 className="mt-3 text-lg font-black">{order.recipient_name} · {formatKrw(order.total_amount_krw)}</h2><p className="mt-1 text-xs text-stone-500">{new Date(order.created_at).toLocaleString('ko-KR')} · {order.payment_method || t('결제수단 확인 중', '正在确认支付方式')}</p></div>{action && <button type="button" disabled={updating === order.id} onClick={() => advance(order)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-bold text-white disabled:bg-stone-300 active:scale-95"><ActionIcon className="h-4 w-4" />{updating === order.id ? t('처리 중...', '处理中...') : t(action.ko, action.zh)}</button>}</div><div className="mt-5 grid gap-4 border-t border-stone-100 pt-5 lg:grid-cols-[1fr_1fr]"><div><p className="text-xs font-bold text-stone-500">{t('배송지', '配送地址')}</p><p className="mt-1 text-sm leading-6 text-stone-800">({order.shipping_postcode}) {order.shipping_address1} {order.shipping_address2}</p>{order.shipping_message && <p className="mt-2 text-xs text-stone-500">{t('요청사항', '配送备注')}: {order.shipping_message}</p>}</div><div><p className="text-xs font-bold text-stone-500">{t('주문 상품', '订购商品')}</p><div className="mt-2 space-y-2">{order.items.map((item, index) => <div key={`${item.product_name_ko_snapshot}:${index}`} className="flex items-center gap-2"><div className="relative h-9 w-9 overflow-hidden rounded-lg bg-stone-100">{item.product_image_url_snapshot && <Image src={item.product_image_url_snapshot} alt="" fill sizes="36px" className="object-cover" />}</div><p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.product_name_ko_snapshot} × {item.quantity}</p><p className="text-xs font-bold">{formatKrw(item.line_total_krw)}</p></div>)}</div></div></div></article>; })}</div>}{!loading && orders.length === 0 && <div className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-sm text-stone-500">{t('조건에 맞는 소매 주문이 없습니다.', '没有符合条件的零售订单。')}</div>}</div>;
}
