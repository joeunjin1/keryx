'use client';

import Link from 'next/link';
import { useLangContext } from '@/components/layout/LangContext';
import { BRAND } from '@/lib/brand';

type Lang = 'ko' | 'zh' | 'en';

interface PublicFooterProps { lang?: Lang; theme?: 'dark' | 'light'; }

const footerContent = {
  ko: {
    slogan: '스토리가 있는 제품을 기획하여 공급합니다.',
    links: [{ href: '/shop', label: '상품 스토어' }, { href: '/sample-subscription', label: '샘플 구독' }, { href: '/ip', label: '자체 디자인 IP' }, { href: '/about', label: '회사 소개' }, { href: '/privacy', label: '개인정보처리방침' }, { href: '/terms', label: '이용약관' }],
    biz: '사업자등록번호: 609-81-63010 | 대표: 조은진 | 이메일: support@keryx.kr | 상호: (주) 가자트레이드',
    desc: '자체 디자인 IP · 콘텐츠 · 상품 기획 · 샘플 구독',
  },
  zh: {
    slogan: '策划并供应有故事的产品。',
    links: [{ href: '/shop', label: '商品商店' }, { href: '/sample-subscription', label: '样品订阅' }, { href: '/ip', label: '原创设计IP' }, { href: '/about', label: '公司介绍' }, { href: '/privacy', label: '隐私政策' }, { href: '/terms', label: '使用条款' }],
    biz: '运营主体: (주) 가자트레이드 | 代表: 조은진 | 邮箱: support@keryx.kr',
    desc: '原创设计IP · 内容 · 商品策划 · 样品订阅',
  },
  en: {
    slogan: 'We plan and supply products with stories.',
    links: [{ href: '/shop', label: 'Store' }, { href: '/sample-subscription', label: 'Sample subscription' }, { href: '/ip', label: 'Original IP' }, { href: '/about', label: 'About' }, { href: '/privacy', label: 'Privacy' }, { href: '/terms', label: 'Terms' }],
    biz: 'Operating entity: (주) 가자트레이드 | CEO: 조은진 | Email: support@keryx.kr',
    desc: 'Original IP · Content · Product planning · Sample subscription',
  },
};

export function PublicFooter({ lang, theme = 'dark' }: PublicFooterProps) {
  const { lang: contextLang } = useLangContext();
  const activeLang = lang || contextLang;
  const t = footerContent[activeLang];
  const isDark = theme === 'dark';
  return <footer className={isDark ? 'border-t border-white/10 bg-stone-950 py-12 sm:py-16' : 'border-t border-stone-200 bg-stone-50 py-12 sm:py-16'}><div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8"><div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center"><Link href="/" className="no-underline"><div className={isDark ? 'text-xl font-black tracking-tight text-white' : 'text-xl font-black tracking-tight text-stone-950'}>{BRAND.en} <span className="text-orange-400">{BRAND.zh}</span></div><p className={isDark ? 'mt-2 text-sm text-stone-400' : 'mt-2 text-sm text-stone-600'}>{t.slogan}</p></Link><nav className="flex flex-wrap gap-x-5 gap-y-3" aria-label="공개 푸터 메뉴">{t.links.map((link) => <Link key={link.href} href={link.href} className={isDark ? 'text-sm font-bold text-stone-400 no-underline transition hover:text-white' : 'text-sm font-bold text-stone-600 no-underline transition hover:text-stone-950'}>{link.label}</Link>)}</nav></div><div className={isDark ? 'mt-8 border-t border-white/10 pt-6' : 'mt-8 border-t border-stone-200 pt-6'}><p className={isDark ? 'text-xs leading-6 text-stone-500' : 'text-xs leading-6 text-stone-500'}>{t.biz}</p><p className={isDark ? 'mt-1 text-xs leading-6 text-stone-500' : 'mt-1 text-xs leading-6 text-stone-500'}>{t.desc}</p><p className={isDark ? 'mt-4 text-xs text-stone-600' : 'mt-4 text-xs text-stone-500'}>© 2026 {BRAND.en}. All rights reserved.</p></div></div></footer>;
}

export default PublicFooter;
