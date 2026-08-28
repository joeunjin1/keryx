'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Minus, PackageOpen, Plus, ShoppingBag, Truck } from 'lucide-react';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';
import { useLangContext } from '@/components/layout/LangContext';
import { useRetailCart } from '@/components/retail/RetailCartProvider';
import { formatKrw, productImage, type RetailProduct } from '@/lib/retail/types';

interface Props { productId: string; }

const copy = {
  ko: {
    store: '스토어', loadError: '상품을 불러오지 못했습니다.', unavailable: '상품을 확인할 수 없습니다.', unavailableDescription: '현재 판매 중이 아닌 상품이거나 상품 정보를 불러오지 못했습니다.', back: '스토어로 돌아가기', shippingIncluded: '배송비가 상품 금액에 포함됩니다.', shippingFixed: '상품별 고정 배송비가 주문 금액에 함께 반영됩니다.', shippingCollect: '배송 조건은 주문서에서 확인할 수 있습니다.', deliveryTitle: '배송 안내', deliveryDescription: '주문 내용이 확인되면 출고 준비 상태로 전환됩니다.', paymentTitle: '결제 준비', paymentDescription: '결제 기능이 준비되는 동안 주문 조건을 먼저 확인할 수 있습니다.', soldOut: '현재 판매 가능한 재고가 없습니다.', quantity: '수량', decrease: '수량 줄이기', increase: '수량 늘리기', add: '장바구니에 담기', added: '장바구니에 담았습니다.', addError: '장바구니에 담지 못했습니다.', image: '이미지',
  },
  zh: {
    store: '商店', loadError: '无法加载商品。', unavailable: '暂时无法查看商品。', unavailableDescription: '该商品当前未上架，或暂时无法加载商品信息。', back: '返回商店', shippingIncluded: '运费已包含在商品金额中。', shippingFixed: '商品的固定运费会一并计入订单金额。', shippingCollect: '请在订单页面确认配送条件。', deliveryTitle: '配送说明', deliveryDescription: '确认订单内容后，将进入发货准备状态。', paymentTitle: '支付准备', paymentDescription: '支付功能准备期间，您可以先确认订单条件。', soldOut: '目前没有可售库存。', quantity: '数量', decrease: '减少数量', increase: '增加数量', add: '加入购物车', added: '已加入购物车。', addError: '无法加入购物车。', image: '图片',
  },
};

export function RetailProductDetail({ productId }: Props) {
  const { lang } = useLangContext();
  const t = copy[lang];
  const { addItem, itemCount, hydrated } = useRetailCart();
  const [product, setProduct] = useState<RetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/retail/products/${productId}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || t.loadError);
        return payload.product as RetailProduct;
      })
      .then((value) => { if (alive) setProduct(value); })
      .catch((loadError) => { if (alive) setError(loadError instanceof Error ? loadError.message : t.loadError); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId, t.loadError]);

  const images = useMemo(() => {
    if (!product) return [];
    const values = [...(product.image_urls || []), product.image_url || ''].filter(Boolean);
    return Array.from(new Set(values.length ? values : [productImage(product)]));
  }, [product]);

  const addToCart = () => {
    if (!product) return;
    const name = lang === 'zh' && product.name_zh ? product.name_zh : product.name_ko;
    const result = addItem({ productId: product.id, quantity, variantLabel: '', name, imageUrl: productImage(product), unitPriceKrw: product.retail_price_krw, availableStockQty: product.available_stock_qty });
    setNotice(result.ok ? t.added : result.message || t.addError);
  };

  if (loading) return <div className="min-h-screen bg-stone-50 p-4 sm:p-8"><div className="mx-auto max-w-screen-xl animate-pulse space-y-5"><div className="h-11 w-32 rounded-xl bg-stone-200" /><div className="grid grid-cols-1 gap-8 lg:grid-cols-2"><div className="aspect-square rounded-3xl bg-stone-200" /><div className="space-y-5"><div className="h-10 w-4/5 rounded bg-stone-200" /><div className="h-6 w-1/3 rounded bg-stone-200" /><div className="h-36 rounded-3xl bg-stone-200" /></div></div></div></div>;

  if (error || !product) return <div className="min-h-screen bg-stone-50 text-stone-950"><RetailStoreHeader mode="store" showCart={false} /><main className="mx-auto flex min-h-[70dvh] max-w-screen-md items-center px-4 py-10"><section className="w-full rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm"><PackageOpen className="mx-auto h-12 w-12 text-rose-500" /><h1 className="mt-5 text-xl font-black">{t.unavailable}</h1><p className="mx-auto mt-3 max-w-md text-base leading-7 text-stone-600">{error || t.unavailableDescription}</p><Link href="/shop" className="mt-7 inline-flex min-h-12 items-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.back}</Link></section></main></div>;

  const name = lang === 'zh' && product.name_zh ? product.name_zh : product.name_ko;
  const description = lang === 'zh' && product.retail_description_zh ? product.retail_description_zh : product.retail_description_ko;
  const soldOut = product.available_stock_qty < 1;
  const currentImage = images[Math.min(activeImage, images.length - 1)] || productImage(product);
  const shippingCopy = product.retail_shipping_policy === 'included' ? t.shippingIncluded : product.retail_shipping_policy === 'fixed' ? t.shippingFixed : t.shippingCollect;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="store" cartCount={itemCount} cartReady={hydrated} />
      <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-600 no-underline transition hover:text-stone-950 active:scale-95"><ArrowLeft className="h-4 w-4" />{t.store}</Link>
        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <section><div className="relative aspect-square overflow-hidden rounded-3xl border border-stone-200 bg-white"><Image src={currentImage} alt={name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>{images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{images.map((image, index) => <button key={image} type="button" onClick={() => setActiveImage(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition active:scale-95 ${activeImage === index ? 'border-stone-950' : 'border-transparent'}`} aria-label={`${name} ${t.image} ${index + 1}`}><Image src={image} alt="" fill sizes="64px" className="object-cover" /></button>)}</div>}</section>
          <section className="flex flex-col"><div className="border-b border-stone-200 pb-6">{product.category && <p className="text-xs font-black tracking-[0.15em] text-orange-700">{product.category}</p>}<h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{name}</h1>{description && <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">{description}</p>}<p className="mt-6 text-3xl font-black">{formatKrw(product.retail_price_krw)}</p><p className="mt-2 text-sm leading-6 text-stone-500">{shippingCopy}</p></div>
            <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-stone-200 bg-white p-4"><Truck className="h-5 w-5 text-orange-700" /><p className="mt-3 text-sm font-bold">{t.deliveryTitle}</p><p className="mt-1 text-sm leading-6 text-stone-500">{t.deliveryDescription}</p></div><div className="rounded-2xl border border-stone-200 bg-white p-4"><CheckCircle2 className="h-5 w-5 text-orange-700" /><p className="mt-3 text-sm font-bold">{t.paymentTitle}</p><p className="mt-1 text-sm leading-6 text-stone-500">{t.paymentDescription}</p></div></div>
            <div className="mt-auto rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">{soldOut ? <div className="rounded-2xl bg-stone-100 px-4 py-4 text-center text-sm font-bold text-stone-600">{t.soldOut}</div> : <><div className="flex items-center justify-between"><p className="text-sm font-bold">{t.quantity}</p><div className="flex items-center overflow-hidden rounded-xl border border-stone-200"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-95" aria-label={t.decrease}><Minus className="h-4 w-4" /></button><span className="flex h-11 min-w-11 items-center justify-center border-x border-stone-200 text-sm font-bold">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(product.available_stock_qty, value + 1))} className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-95" aria-label={t.increase}><Plus className="h-4 w-4" /></button></div></div><button type="button" onClick={addToCart} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-base font-bold text-white transition hover:bg-stone-800 active:scale-95"><ShoppingBag className="h-5 w-5" />{t.add}</button></>}{notice && <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />{notice}</p>}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
