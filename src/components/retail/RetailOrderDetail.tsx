'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, PackageCheck, Truck, CircleCheck, Clock3 } from 'lucide-react';
import { formatKrw, type RetailOrderSummary } from '@/lib/retail/types';

const statusLabel: Record<string, string> = {
  payment_pending: '결제 확인 중',
  paid: '결제 완료',
  fulfillment_ready: '상품 준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancel_requested: '취소 요청',
  cancelled: '주문 취소',
  payment_failed: '결제 미완료',
  refunded: '환불 완료',
  partially_refunded: '부분 환불',
};

const statusIcon: Record<string, React.ReactNode> = {
  payment_pending: <Clock3 className="h-5 w-5" />,
  paid: <CircleCheck className="h-5 w-5" />,
  fulfillment_ready: <PackageCheck className="h-5 w-5" />,
  shipped: <Truck className="h-5 w-5" />,
  delivered: <CircleCheck className="h-5 w-5" />,
};

export function RetailOrderDetail({ orderNo, token }: { orderNo: string; token?: string }) {
  const [order, setOrder] = useState<RetailOrderSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = token ? `?token=${encodeURIComponent(token)}` : '';
    fetch(`/api/retail/orders/${orderNo}${params}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || '주문을 불러오지 못했습니다.');
        return payload.order as RetailOrderSummary;
      })
      .then(setOrder)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : '주문을 불러오지 못했습니다.'));
  }, [orderNo, token]);

  if (!order && !error) return <div className="flex min-h-screen items-center justify-center bg-stone-50"><div className="text-center"><Clock3 className="mx-auto h-10 w-10 animate-pulse text-stone-500" /><p className="mt-4 text-sm font-bold">주문 내역을 불러오는 중입니다.</p></div></div>;
  if (error || !order) return <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4"><div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black">주문 내역을 확인할 수 없습니다.</h1><p className="mt-3 text-sm leading-6 text-stone-600">{error || '주문 확인 링크를 다시 확인해 주세요.'}</p><Link href="/shop" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline active:scale-95">스토어로 가기</Link></div></div>;

  const label = statusLabel[order.status] || '주문 처리 중';
  const icon = statusIcon[order.status] || <Clock3 className="h-5 w-5" />;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950"><header className="border-b border-stone-200 bg-white"><div className="mx-auto flex min-h-16 max-w-screen-md items-center px-4 sm:px-6"><Link href="/shop" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-700 no-underline hover:text-stone-950"><ArrowLeft className="h-4 w-4" />스토어</Link></div></header><main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 lg:py-12"><p className="text-xs font-black tracking-[0.16em] text-orange-700">ORDER DETAILS</p><h1 className="mt-2 text-3xl font-black tracking-tight">주문 내역</h1><section className="mt-7 rounded-3xl bg-stone-950 p-5 text-white sm:p-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">{icon}</div><div><p className="text-sm text-white/60">현재 주문 상태</p><p className="mt-0.5 text-xl font-black">{label}</p></div></div><div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-sm"><div><p className="text-white/50">주문번호</p><p className="mt-1 font-bold">{order.order_no}</p></div><div><p className="text-white/50">주문일</p><p className="mt-1 font-bold">{new Date(order.created_at).toLocaleDateString('ko-KR')}</p></div></div></section><section className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-black">상품 정보</h2><div className="mt-5 space-y-4">{order.items.map((item, index) => <article key={`${item.product_name_ko_snapshot}:${index}`} className="flex gap-3 border-b border-stone-100 pb-4 last:border-0 last:pb-0"><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">{item.product_image_url_snapshot && <Image src={item.product_image_url_snapshot} alt={item.product_name_ko_snapshot} fill sizes="64px" className="object-cover" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.product_name_ko_snapshot}</p>{item.variant_label_snapshot && <p className="mt-1 text-xs text-stone-500">{item.variant_label_snapshot}</p>}<p className="mt-2 text-xs text-stone-500">수량 {item.quantity}</p></div><p className="shrink-0 text-sm font-black">{formatKrw(item.line_total_krw)}</p></article>)}</div></section><section className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-black">결제 정보</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-stone-600"><span>상품 금액</span><span>{formatKrw(order.subtotal_krw)}</span></div><div className="flex justify-between text-stone-600"><span>배송비</span><span>{formatKrw(order.shipping_fee_krw)}</span></div>{order.discount_krw > 0 && <div className="flex justify-between text-stone-600"><span>할인</span><span>-{formatKrw(order.discount_krw)}</span></div>}<div className="flex justify-between border-t border-stone-200 pt-4 text-lg font-black"><span>최종 결제 금액</span><span>{formatKrw(order.total_amount_krw)}</span></div></div></section></main></div>
  );
}
