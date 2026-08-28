'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';
import { useLangContext } from '@/components/layout/LangContext';
import { useRetailCart } from '@/components/retail/RetailCartProvider';
import { formatKrw } from '@/lib/retail/types';

const copy = {
  ko: {
    store: '스토어', cart: '장바구니', emptyTitle: '장바구니가 비어 있습니다.', emptyDescription: '마음에 드는 상품을 담아 주문서 작성 단계로 이동해 주세요.', browse: '상품 보러가기', summary: '주문 요약', productAmount: '상품 금액', shipping: '배송비', shippingNotice: '상품별 설정 확인', estimate: '예상 상품 금액', checkout: '주문서 작성', finalNotice: '최종 금액과 결제수단은 주문서에서 확인합니다.', remove: '삭제', decrease: '수량 줄이기', increase: '수량 늘리기', loading: '장바구니를 불러오는 중입니다.',
  },
  zh: {
    store: '商店', cart: '购物车', emptyTitle: '购物车为空。', emptyDescription: '将喜欢的商品加入购物车后，即可进入订单填写步骤。', browse: '浏览商品', summary: '订单摘要', productAmount: '商品金额', shipping: '运费', shippingNotice: '确认各商品的配送设置', estimate: '预计商品金额', checkout: '填写订单', finalNotice: '请在订单页面确认最终金额和支付方式。', remove: '删除', decrease: '减少数量', increase: '增加数量', loading: '正在加载购物车。',
  },
};

export function RetailCartPage() {
  const { lang } = useLangContext();
  const t = copy[lang];
  const { items, itemCount, subtotalKrw, hydrated, updateQuantity, removeItem } = useRetailCart();

  if (!hydrated) {
    return <div className="min-h-screen bg-stone-50 p-4 sm:p-8"><div className="mx-auto max-w-screen-lg animate-pulse space-y-4"><div className="h-10 w-40 rounded bg-stone-200" /><div className="h-48 rounded-3xl bg-stone-200" /></div></div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="store" cartCount={itemCount} cartReady={hydrated} />
      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-600 no-underline transition hover:text-stone-950 active:scale-95"><ArrowLeft className="h-4 w-4" />{t.store}</Link>
        <div className="mt-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-white"><ShoppingBag className="h-5 w-5" /></span><div><p className="text-xs font-black tracking-[0.16em] text-orange-700">KERYX STORE</p><h1 className="text-3xl font-black tracking-tight">{t.cart}{itemCount ? ` (${itemCount})` : ''}</h1></div></div>
        {items.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><ShoppingBag className="mx-auto h-11 w-11 text-stone-400" /><h2 className="mt-5 text-xl font-black">{t.emptyTitle}</h2><p className="mx-auto mt-3 max-w-lg text-base leading-7 text-stone-600">{t.emptyDescription}</p><Link href="/shop" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.browse}<ArrowRight className="h-4 w-4" /></Link></section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
            <section className="space-y-3">{items.map((item) => <article key={`${item.productId}:${item.variantLabel}`} className="flex gap-3 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"><div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100"><Image src={item.imageUrl} alt={item.name} fill sizes="96px" className="object-cover" /></div><div className="min-w-0 flex-1"><div className="flex gap-3"><div className="min-w-0 flex-1"><h2 className="truncate text-base font-bold">{item.name}</h2>{item.variantLabel && <p className="mt-1 text-sm text-stone-500">{item.variantLabel}</p>}<p className="mt-2 text-lg font-black">{formatKrw(item.unitPriceKrw)}</p></div><button type="button" onClick={() => removeItem(item.productId, item.variantLabel)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-rose-50 hover:text-rose-700 active:scale-95" aria-label={`${item.name} ${t.remove}`}><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 flex items-center justify-between"><div className="flex items-center overflow-hidden rounded-xl border border-stone-200"><button type="button" onClick={() => updateQuantity(item.productId, item.variantLabel, item.quantity - 1)} className="flex h-11 w-11 items-center justify-center transition hover:bg-stone-100 active:scale-95" aria-label={t.decrease}><Minus className="h-4 w-4" /></button><span className="flex h-11 min-w-11 items-center justify-center border-x border-stone-200 text-sm font-bold">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.productId, item.variantLabel, item.quantity + 1)} className="flex h-11 w-11 items-center justify-center transition hover:bg-stone-100 active:scale-95" aria-label={t.increase}><Plus className="h-4 w-4" /></button></div><p className="text-base font-black">{formatKrw(item.quantity * item.unitPriceKrw)}</p></div></div></article>)}</section>
            <aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-24"><h2 className="text-lg font-black">{t.summary}</h2><div className="mt-5 space-y-3 border-b border-stone-200 pb-5 text-sm"><div className="flex justify-between text-stone-600"><span>{t.productAmount}</span><span>{formatKrw(subtotalKrw)}</span></div><div className="flex justify-between gap-4 text-stone-600"><span>{t.shipping}</span><span className="text-right">{t.shippingNotice}</span></div></div><div className="mt-5 flex justify-between text-lg font-black"><span>{t.estimate}</span><span>{formatKrw(subtotalKrw)}</span></div><Link href="/shop/checkout" className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-base font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.checkout}<ArrowRight className="h-4 w-4" /></Link><p className="mt-3 text-center text-xs leading-5 text-stone-500">{t.finalNotice}</p></aside>
          </div>
        )}
      </main>
    </div>
  );
}
