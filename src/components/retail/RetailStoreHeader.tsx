'use client';

import Link from 'next/link';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

type HeaderMode = 'store' | 'ip' | 'sample';

type RetailStoreHeaderProps = {
  mode?: HeaderMode;
  showCart?: boolean;
  cartCount?: number;
  cartReady?: boolean;
};

const copy = {
  ko: {
    brand: 'KERYX',
    store: '스토어',
    ip: 'IP 소개',
    sample: '샘플 구독',
    company: '회사 소개',
    cart: '장바구니',
    menu: '메뉴 열기',
    close: '메뉴 닫기',
  },
  zh: {
    brand: 'KERYX',
    store: '商店',
    ip: 'IP介绍',
    sample: '样品订阅',
    company: '公司介绍',
    cart: '购物车',
    menu: '打开菜单',
    close: '关闭菜单',
  },
};

export function RetailStoreHeader({ mode = 'store', showCart = true, cartCount = 0, cartReady = false }: RetailStoreHeaderProps) {
  const { lang, toggle } = useLangContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = copy[lang];
  const brandLabel = mode === 'ip' ? 'IP' : mode === 'sample' ? 'SAMPLE' : 'STORE';
  const navItems = [
    { href: '/shop', label: t.store, active: mode === 'store' },
    { href: '/sample-subscription', label: t.sample, active: mode === 'sample' },
    { href: '/ip', label: t.ip, active: mode === 'ip' },
    { href: '/about', label: t.company, active: false },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-screen-xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 font-black tracking-tight text-stone-950 no-underline" aria-label="KERYX 홈">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-950 text-sm text-white">K</span>
          <span>{t.brand}</span>
          <span className="hidden rounded-full bg-orange-50 px-2 py-1 text-xs font-bold tracking-wide text-orange-700 sm:inline">{brandLabel}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="KERYX 공개 메뉴">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold no-underline transition hover:bg-stone-100 ${item.active ? 'bg-stone-950 text-white hover:bg-stone-800' : 'text-stone-600 hover:text-stone-950'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={toggle} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 active:scale-95" aria-label="언어 전환">
            {lang === 'ko' ? '中文' : '한국어'}
          </button>
          {showCart && (
            <Link href="/shop/cart" className="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-950 px-3 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.cart}</span>
              {cartReady && cartCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-400 px-1 text-xs font-black text-stone-950">{cartCount}</span>}
            </Link>
          )}
          <button type="button" onClick={() => setMobileOpen((value) => !value)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-700 transition hover:bg-stone-100 active:scale-95 md:hidden" aria-label={mobileOpen ? t.close : t.menu} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-stone-200 bg-white px-4 py-3 shadow-sm md:hidden" aria-label="KERYX 모바일 공개 메뉴">
          <div className="mx-auto grid max-w-screen-xl grid-cols-2 gap-2 sm:grid-cols-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-12 items-center justify-center rounded-xl px-3 text-sm font-bold no-underline transition active:scale-95 ${item.active ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
