'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

type Lang = 'ko' | 'zh' | 'en';

interface PublicFooterProps {
  lang?: Lang;
  theme?: 'dark' | 'light';
}

const footerContent = {
  ko: {
    slogan: 'IP를 개발하고, 스토리를 만들고, 상품을 생산합니다',
    links: [
      { href: '/services', label: '서비스' },
      { href: '/portfolio', label: '사례' },
      { href: '/pricing', label: '가격 안내' },
      { href: '/faq', label: 'FAQ' },
      { href: '/quote', label: '견적 의뢰' },
      { href: '/privacy', label: '개인정보처리방침' },
      { href: '/terms', label: '이용약관' },
    ],
    biz: '사업자등록번호: 609-81-63010 | 대표: 조은진 | 이메일: support@keryx.kr | 상호: (주)가자트레이드',
    addr: 'IP 개발 · 스토리 연재 · 상품 기획 · 생산 | 중국 이우 현지 운영 | 한국 통관·물류: (주)가자트레이드',
    copy: '© 2026 KERYX. All rights reserved.',
  },
  zh: {
    slogan: '开发IP，创造故事，生产商品',
    links: [
      { href: '/services', label: '服务' },
      { href: '/portfolio', label: '案例' },
      { href: '/pricing', label: '价格' },
      { href: '/faq', label: 'FAQ' },
      { href: '/quote', label: '询价' },
      { href: '/privacy', label: '隐私政策' },
      { href: '/terms', label: '使用条款' },
    ],    biz: '营业执照: 609-81-63010 | 代表: 赵恩进 | 邮筱: support@keryx.kr | 公司名: 加兹贸易有限公司',
    addr: 'IP开发 · 故事连载 · 商品策划 · 生产 | 中国义乌现地运营 | 韩国清关·物流: 加兹贸易有限公司',
    copy: '© 2026 KERYX. All rights reserved.',
  },
  en: {
    slogan: 'We develop IP, create stories, and produce goods.',
    links: [
      { href: '/services', label: 'Services' },
      { href: '/portfolio', label: 'Cases' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/faq', label: 'FAQ' },
      { href: '/quote', label: 'Get a Quote' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
    biz: 'Business Reg: 609-81-63010 | CEO: Eunjin Jo | Email: support@keryx.kr | Company: Gaza Trade Co., Ltd.',
    addr: 'Yiwu, China — Local Operations Team (Direct) | Korea Customs & Logistics: Gaza Trade Co., Ltd. | Customer data protected under Privacy Policy',
    copy: '© 2026 KERYX. All rights reserved.',
  },
};

export function PublicFooter({ lang = 'ko', theme = 'dark' }: PublicFooterProps) {
  const t = footerContent[lang];
  const isDark = theme === 'dark';

  return (
    <footer
      className="py-12 sm:py-16"
      style={isDark
        ? { background: 'linear-gradient(180deg, #060b14 0%, #030508 100%)' }
        : { background: '#f8f9fa', borderTop: '1px solid #e5e7eb' }
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* 상단: 로고 + 링크 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          {/* 로고 + 슬로건 */}
          <div className="flex items-center gap-4">
            {/* 심볼 아이콘만 - 작고 심플하게 */}
            <Logo
              variant="symbol"
              size="sm"
              theme={isDark ? 'dark' : 'light'}
            />
            <div>
              <div
                className="font-black text-xl tracking-tight"
                style={{ color: isDark ? 'white' : '#0d1b3e' }}
              >
                KERYX
              </div>
              <div
                className="text-sm mt-0.5"
                style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#6b7280' }}
              >
                {t.slogan}
              </div>
            </div>
          </div>

          {/* 링크 목록 */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {t.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors"
                style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#6b7280' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div
          className="border-t mb-6"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}
        />

        {/* 하단: 사업자 정보 */}
        <div className="space-y-1.5">
          <p
            className="text-xs"
            style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af' }}
          >
            {t.biz}
          </p>
          <p
            className="text-xs"
            style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af' }}
          >
            {t.addr}
          </p>
          <p
            className="text-xs mt-3"
            style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#d1d5db' }}
          >
            {t.copy}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
