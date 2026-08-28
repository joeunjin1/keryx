'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ArrowRight, PackageOpen } from 'lucide-react';
import { useRetailCart } from '@/components/retail/RetailCartProvider';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';
import { useLangContext } from '@/components/layout/LangContext';
import { formatKrw, productImage, type RetailProduct } from '@/lib/retail/types';

type Lang = 'ko' | 'zh';

const storeVisuals = [
  { src: '/images/hero-characters/gilduck.webp', alt: '길덕이' },
  { src: '/images/hero-characters/inyeoseok.webp', alt: '이녀석' },
  { src: '/images/hero-characters/kkomul.webp', alt: '꼬물이들' },
  { src: '/images/hero-characters/heartbbung.webp', alt: '하트뿅 햄스터' },
  { src: '/images/hero-characters/piggly.webp', alt: '피글리' },
];

const copy = {
  ko: {
    eyebrow: 'KERYX STORE',
    title: '스토리가 있는 굿즈를 만나보세요',
    description: 'KERYX가 기획한 캐릭터와 상품의 정보, 옵션, 배송 조건을 한곳에서 확인할 수 있습니다.',
    search: '상품명으로 검색',
    all: '전체 상품',
    cart: '장바구니',
    view: '상품 보기',
    out: '품절',
    available: '구매 가능',
    emptyTitle: '현재 판매 중인 상품을 준비하고 있습니다.',
    emptyDescription: '신상품 알림을 신청하면 판매가 시작되는 상품 소식을 받아보실 수 있습니다.',
    subscribe: '신상품 소식 받기',
    loading: '상품을 불러오는 중입니다.',
    result: '판매 상품',
    reset: '필터 초기화',
    shippingIncluded: '배송비 포함',
    fixedShipping: '배송비 별도',
  },
  zh: {
    eyebrow: 'KERYX STORE',
    title: '探索有故事的创意周边',
    description: '在一个页面了解由 KERYX 策划的角色和商品信息、选项及配送条件。',
    search: '搜索商品名称',
    all: '全部商品',
    cart: '购物车',
    view: '查看商品',
    out: '售罄',
    available: '可购买',
    emptyTitle: '正在准备可销售的商品。',
    emptyDescription: '订阅新品消息后，可接收商品开始销售的通知。',
    subscribe: '订阅新品消息',
    loading: '正在加载商品。',
    result: '在售商品',
    reset: '重置筛选',
    shippingIncluded: '含运费',
    fixedShipping: '另收运费',
  },
};

function ProductCard({ product, lang }: { product: RetailProduct; lang: Lang }) {
  const t = copy[lang];
  const name = lang === 'zh' && product.name_zh ? product.name_zh : product.name_ko;
  const description = lang === 'zh' && product.retail_description_zh ? product.retail_description_zh : product.retail_description_ko;
  const image = productImage(product);
  const soldOut = product.available_stock_qty < 1;

  return (
    <article className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/shop/${product.id}`} className="block no-underline">
        <div className="relative aspect-square overflow-hidden bg-stone-100">
          <Image src={image} alt={name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3 flex gap-1.5">
            {product.is_new && <span className="rounded-full bg-stone-950 px-2.5 py-1 text-[10px] font-bold text-white">NEW</span>}
            {product.is_hot && <span className="rounded-full bg-orange-400 px-2.5 py-1 text-[10px] font-bold text-stone-950">HOT</span>}
          </div>
          {soldOut && <div className="absolute inset-0 flex items-center justify-center bg-stone-950/45 text-sm font-bold text-white">{t.out}</div>}
        </div>
        <div className="space-y-3 p-4">
          <div className="min-h-10">
            <p className="line-clamp-2 text-sm font-bold leading-snug text-stone-950">{name}</p>
            {description && <p className="mt-1 line-clamp-1 text-xs text-stone-500">{description}</p>}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-base font-black text-stone-950">{formatKrw(product.retail_price_krw)}</p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                {product.retail_shipping_policy === 'included' ? t.shippingIncluded : t.fixedShipping}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${soldOut ? 'bg-stone-100 text-stone-500' : 'bg-emerald-50 text-emerald-700'}`}>
              {soldOut ? t.out : t.available}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function RetailStorefront() {
  const { lang } = useLangContext();
  const { itemCount, hydrated } = useRetailCart();
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const t = copy[lang];

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '24' });
      if (category) params.set('category', category);
      if (search) params.set('q', search);
      const response = await fetch(`/api/retail/products?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '상품 조회 실패');
      const nextProducts = Array.isArray(payload.products) ? payload.products as RetailProduct[] : [];
      setProducts(nextProducts);
      setCategories((current) => {
        const fromProducts = nextProducts.map((product) => product.category).filter((value): value is string => Boolean(value));
        return Array.from(new Set([...current, ...fromProducts]));
      });
    } catch (loadError) {
      setProducts([]);
      setError(loadError instanceof Error ? loadError.message : '상품 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const heading = useMemo(() => search ? `“${search}” ${t.result}` : t.all, [search, t.result, t.all]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="store" cartCount={itemCount} cartReady={hydrated} />
      <main>
        <section className="border-b border-stone-200 bg-orange-50">
          <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:items-end lg:px-8 lg:py-16">
            <div>
              <p className="mb-4 text-xs font-black tracking-[0.18em] text-orange-700">{t.eyebrow}</p>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.13] tracking-tight text-stone-950 sm:text-5xl">{t.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">{t.description}</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="KERYX IP 캐릭터">
                {storeVisuals.map((visual) => <div key={visual.src} className="relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 768px) 25vw, 10rem" className="object-cover" /></div>)}
              </div>
              <div className="rounded-3xl border border-stone-200 bg-white p-3 shadow-sm">
                <form onSubmit={(event) => { event.preventDefault(); setSearch(input.trim()); }} className="flex gap-2">
                  <label className="sr-only" htmlFor="retail-search">{t.search}</label>
                  <input id="retail-search" value={input} onChange={(event) => setInput(event.target.value)} placeholder={t.search} className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200" />
                  <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-stone-950 px-4 text-white transition hover:bg-stone-800 active:scale-95" aria-label={t.search}>
                    <Search className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.15em] text-stone-500">{t.result}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">{heading}</h2>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
              <button type="button" onClick={() => setCategory('')} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-95 ${!category ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>{t.all}</button>
              {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-95 ${category === item ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>{item}</button>)}
              {(category || search) && <button type="button" onClick={() => { setCategory(''); setSearch(''); setInput(''); }} className="min-h-11 shrink-0 rounded-full px-3 text-xs font-bold text-orange-700 hover:bg-orange-50">{t.reset}</button>}
            </div>
          </div>

          {loading && <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="animate-pulse overflow-hidden rounded-3xl border border-stone-200 bg-white"><div className="aspect-square bg-stone-200" /><div className="space-y-3 p-4"><div className="h-4 w-4/5 rounded bg-stone-200" /><div className="h-4 w-2/5 rounded bg-stone-200" /></div></div>)}</div>}

          {!loading && error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center"><p className="font-bold text-rose-800">{error}</p><button type="button" onClick={loadProducts} className="mt-3 min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white active:scale-95">{lang === 'ko' ? '다시 시도' : '重试'}</button></div>}

          {!loading && !error && products.length === 0 && <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><PackageOpen className="mx-auto h-11 w-11 text-stone-400" aria-hidden="true" /><h3 className="mt-5 text-xl font-black">{t.emptyTitle}</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-stone-600">{t.emptyDescription}</p><Link href="/sample-subscription" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.subscribe}<ArrowRight className="h-4 w-4" /></Link></div>}

          {!loading && !error && products.length > 0 && <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} lang={lang} />)}</div>}
        </section>
      </main>
    </div>
  );
}
