'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, CheckCircle2, Truck, ShieldCheck } from 'lucide-react';
import { useRetailCart } from '@/components/retail/RetailCartProvider';
import { formatKrw, productImage, type RetailProduct } from '@/lib/retail/types';

interface Props {
  productId: string;
}

export function RetailProductDetail({ productId }: Props) {
  const { addItem, itemCount } = useRetailCart();
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
        if (!response.ok) throw new Error(payload.error || '상품을 불러오지 못했습니다.');
        return payload.product as RetailProduct;
      })
      .then((value) => { if (alive) setProduct(value); })
      .catch((loadError) => { if (alive) setError(loadError instanceof Error ? loadError.message : '상품을 불러오지 못했습니다.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId]);

  const images = useMemo(() => {
    if (!product) return [];
    const values = [...(product.image_urls || []), product.image_url || ''].filter(Boolean);
    return Array.from(new Set(values.length ? values : [productImage(product)]));
  }, [product]);

  const addToCart = () => {
    if (!product) return;
    const result = addItem({
      productId: product.id,
      quantity,
      variantLabel: '',
      name: product.name_ko,
      imageUrl: productImage(product),
      unitPriceKrw: product.retail_price_krw,
      availableStockQty: product.available_stock_qty,
    });
    setNotice(result.ok ? '장바구니에 담았습니다.' : result.message || '장바구니에 담지 못했습니다.');
  };

  if (loading) {
    return <div className="min-h-screen bg-stone-50 p-4 sm:p-8"><div className="mx-auto max-w-screen-xl animate-pulse space-y-5"><div className="h-11 w-32 rounded-xl bg-stone-200" /><div className="grid gap-8 lg:grid-cols-2"><div className="aspect-square rounded-3xl bg-stone-200" /><div className="space-y-5"><div className="h-10 w-4/5 rounded bg-stone-200" /><div className="h-6 w-1/3 rounded bg-stone-200" /><div className="h-36 rounded-3xl bg-stone-200" /></div></div></div></div>;
  }

  if (error || !product) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4"><div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black text-stone-950">상품을 확인할 수 없습니다.</h1><p className="mt-3 text-sm leading-6 text-stone-600">{error || '현재 판매 중이 아닌 상품입니다.'}</p><Link href="/shop" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline active:scale-95">스토어로 돌아가기</Link></div></div>;
  }

  const name = product.name_ko;
  const soldOut = product.available_stock_qty < 1;
  const currentImage = images[Math.min(activeImage, images.length - 1)] || productImage(product);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex min-h-16 max-w-screen-xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><Link href="/shop" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-700 no-underline transition hover:text-stone-950"><ArrowLeft className="h-4 w-4" />스토어</Link><Link href="/shop/cart" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-950 px-3 text-sm font-bold text-white no-underline active:scale-95"><ShoppingBag className="h-4 w-4" />장바구니{itemCount > 0 ? ` ${itemCount}` : ''}</Link></div></header>
      <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <section>
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-white"><Image src={currentImage} alt={name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>
            {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((image, index) => <button key={image} type="button" onClick={() => setActiveImage(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${activeImage === index ? 'border-stone-950' : 'border-transparent'}`}><Image src={image} alt={`${name} 이미지 ${index + 1}`} fill sizes="64px" className="object-cover" /></button>)}</div>}
          </section>
          <section className="flex flex-col">
            <div className="border-b border-stone-200 pb-6">
              {product.category && <p className="text-xs font-black tracking-[0.15em] text-orange-700">{product.category}</p>}
              <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{name}</h1>
              {product.retail_description_ko && <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">{product.retail_description_ko}</p>}
              <p className="mt-6 text-3xl font-black">{formatKrw(product.retail_price_krw)}</p>
              <p className="mt-2 text-sm text-stone-500">{product.retail_shipping_policy === 'included' ? '배송비가 상품 금액에 포함됩니다.' : '배송비는 주문 금액에 따라 함께 계산됩니다.'}</p>
            </div>

            <div className="my-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-stone-200 bg-white p-4"><Truck className="h-5 w-5 text-orange-700" /><p className="mt-3 text-sm font-bold">안전 배송</p><p className="mt-1 text-xs leading-5 text-stone-500">결제가 확인된 주문은 출고 준비 상태로 전환됩니다.</p></div><div className="rounded-2xl border border-stone-200 bg-white p-4"><ShieldCheck className="h-5 w-5 text-orange-700" /><p className="mt-3 text-sm font-bold">안전 결제</p><p className="mt-1 text-xs leading-5 text-stone-500">결제 정보는 토스페이먼츠에서 안전하게 처리됩니다.</p></div></div>

            <div className="mt-auto rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              {soldOut ? <div className="rounded-2xl bg-stone-100 px-4 py-4 text-center text-sm font-bold text-stone-600">현재 판매 가능한 재고가 없습니다.</div> : <><div className="flex items-center justify-between"><p className="text-sm font-bold">수량</p><div className="flex items-center overflow-hidden rounded-xl border border-stone-200"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-95" aria-label="수량 줄이기"><Minus className="h-4 w-4" /></button><span className="flex h-11 min-w-11 items-center justify-center border-x border-stone-200 text-sm font-bold">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(product.available_stock_qty, value + 1))} className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-95" aria-label="수량 늘리기"><Plus className="h-4 w-4" /></button></div></div><button type="button" onClick={addToCart} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-stone-800 active:scale-95"><ShoppingBag className="h-5 w-5" />장바구니에 담기</button></>}
              {notice && <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
