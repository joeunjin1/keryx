'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/ui/Logo';

type Lang = 'ko' | 'zh';

interface PublicHeaderProps {
  lang?: Lang;
  onLangChange?: (lang: Lang) => void;
  theme?: 'dark' | 'light';
}

const navLabels = {
  ko: {
    ipStory: 'IP 스토리',
    ipGoods: 'IP 굿즈',
    showroom: 'IP 쇼룸',
    catalog: '카탈로그',
    services: '서비스',
    about: '회사 소개',
    portfolio: '사례',
    pricing: '가격 안내',
    faq: 'FAQ',
    quote: '견적 의뢰',
    login: '로그인',
    dashboard: '대시보드',
    admin: '관리자',
  },
  zh: {
    ipStory: 'IP故事',
    ipGoods: 'IP周边',
    showroom: 'IP展厅',
    catalog: '商品目录',
    services: '服务',
    about: '公司介绍',
    portfolio: '案例',
    pricing: '价格',
    faq: '常见问题',
    quote: '询价',
    login: '登录',
    dashboard: '控制台',
    admin: '管理员',
  },
  en: {
    ipStory: 'IP Story',
    ipGoods: 'IP Goods',
    showroom: 'IP Showroom',
    catalog: 'Catalog',
    services: 'Services',
    about: 'About',
    portfolio: 'Cases',
    pricing: 'Pricing',
    faq: 'FAQ',
    quote: 'Get Quote',
    login: 'Login',
    dashboard: 'Dashboard',
    admin: 'Admin',
  },
};

export function PublicHeader({ lang = 'ko', onLangChange, theme = 'dark' }: PublicHeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = theme === 'dark';
  const t = navLabels[lang];

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsLoggedIn(true);
        supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setUserRole(profile.role);
          });
      }
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function getDashboardHref() {
    if (userRole === 'admin' || userRole === 'md') return '/admin';
    if (userRole === 'factory') return '/factory';
    return '/seller';
  }

  const bgStyle = isDark
    ? { background: scrolled ? 'rgba(10,15,30,0.97)' : 'rgba(10,15,30,0.94)', backdropFilter: 'blur(16px)' }
    : { background: scrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' };

  const borderClass = isDark ? 'border-b border-white/10' : 'border-b border-gray-200/80';
  const linkClass = isDark
    ? 'text-white/70 hover:text-white transition-colors text-sm font-medium'
    : 'text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium';

  const mainNavItems = [
    { href: "/ip-story", label: t.ipStory },
    { href: "/ip-goods", label: t.ipGoods },
    { href: "/showroom", label: t.showroom },
    { href: "/catalog", label: t.catalog },
    { href: "/services", label: t.services },
    { href: "/about", label: t.about },
    { href: "/pricing", label: t.pricing },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 ${borderClass} transition-all duration-300`}
        style={bgStyle}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* 로고 */}
          <Link href="/" className="flex items-center shrink-0">
            <Logo
              variant="horizontal"
              theme={isDark ? 'dark' : 'light'}
              size="md"
              priority
            />
          </Link>

          {/* 중앙 메인 네비게이션 (데스크톱) */}
          <div className="hidden lg:flex items-center gap-0.5">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg hover:bg-white/10 transition-all ${linkClass}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* 우측 영역 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 언어 전환 버튼 */}
            {onLangChange && (
              <div className={`hidden sm:flex items-center gap-0.5 p-1 rounded-full border ${isDark ? 'border-white/15 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                {((['ko', 'zh'] as Lang[])).map((l) => (
                  <button
                    key={l}
                    onClick={() => onLangChange(l)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                      lang === l
                        ? isDark ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
                        : isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* 견적 의뢰 버튼 (데스크톱) */}
            <Link
              href="/quote"
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg,#d4a843,#f59e0b)', color: '#0a0f1e' }}
            >
              {t.quote}
            </Link>

            {/* 로그인/대시보드 */}
            {isLoggedIn ? (
              <>
                {(userRole === 'admin' || userRole === 'md') && (
                  <Link href="/admin" className={`hidden sm:block text-sm px-3 py-2 ${linkClass}`}>
                    {t.admin}
                  </Link>
                )}
                <Link
                  href={getDashboardHref()}
                  className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#0ea5e9)' }}
                >
                  {t.dashboard}
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className={`hidden sm:inline-block px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  isDark
                    ? 'text-white/80 border-white/20 hover:bg-white/10 hover:border-white/40'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                }`}
              >
                {t.login}
              </Link>
            )}

            {/* 모바일 햄버거 */}
            <button
              className={`lg:hidden p-2 rounded-lg transition-colors ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="메뉴 열기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 드롭다운 메뉴 */}
        {mobileOpen && (
          <div
            className={`lg:hidden border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}
            style={bgStyle}
          >
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isDark ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-white/10 space-y-2">
                {onLangChange && (
                  <div className="flex gap-2 px-2">
                    {((['ko', 'zh'] as Lang[])).map((l) => (
                      <button
                        key={l}
                        onClick={() => { onLangChange(l); setMobileOpen(false); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          lang === l
                            ? isDark ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
                            : isDark ? 'text-white/60 border border-white/20' : 'text-gray-500 border border-gray-300'
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                <Link
                  href="/quote"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 text-sm font-bold rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#d4a843,#f59e0b)', color: '#0a0f1e' }}
                >
                  {t.quote}
                </Link>
                {!isLoggedIn && (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={`block w-full text-center px-4 py-3 text-sm font-semibold rounded-xl border ${
                      isDark ? 'text-white/80 border-white/20' : 'text-gray-700 border-gray-300'
                    }`}
                  >
                    {t.login}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default PublicHeader;
