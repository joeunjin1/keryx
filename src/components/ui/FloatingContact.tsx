'use client';

import { useState } from 'react';

interface FloatingContactProps {
  lang?: 'ko' | 'zh' | 'en';
}

const labels = {
  ko: {
    tooltip: '빠른 문의',
    kakao: '카카오톡 상담',
    email: '이메일 문의',
    quote: '견적 요청',
    phone: '전화 문의',
    kakaoUrl: 'https://pf.kakao.com/_keryx',
    emailUrl: 'mailto:support@keryx.kr',
    quoteUrl: '/quote',
    phoneUrl: 'tel:+82-10-0000-0000',
  },
  zh: {
    tooltip: '快速咨询',
    kakao: 'KakaoTalk咨询',
    email: '邮件咨询',
    quote: '询价',
    phone: '电话咨询',
    kakaoUrl: 'https://pf.kakao.com/_keryx',
    emailUrl: 'mailto:support@keryx.kr',
    quoteUrl: '/quote',
    phoneUrl: 'tel:+82-10-0000-0000',
  },
  en: {
    tooltip: 'Quick Contact',
    kakao: 'KakaoTalk Chat',
    email: 'Email Us',
    quote: 'Get Quote',
    phone: 'Call Us',
    kakaoUrl: 'https://pf.kakao.com/_keryx',
    emailUrl: 'mailto:support@keryx.kr',
    quoteUrl: '/quote',
    phoneUrl: 'tel:+82-10-0000-0000',
  },
};

export function FloatingContact({ lang = 'ko' }: FloatingContactProps) {
  const [open, setOpen] = useState(false);
  const t = labels[lang];

  const items = [
    {
      label: t.kakao,
      href: t.kakaoUrl,
      bg: '#FEE500',
      color: '#3C1E1E',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.485 1.39 4.69 3.5 6.09L4.5 21l4.5-2.5c.98.2 2 .3 3 .3 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
        </svg>
      ),
    },
    {
      label: t.email,
      href: t.emailUrl,
      bg: '#4f46e5',
      color: '#fff',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      label: t.quote,
      href: t.quoteUrl,
      bg: '#d4a843',
      color: '#0a0f1e',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3">
      {/* 확장 메뉴 */}
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-bold transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: item.bg, color: item.color, minWidth: 160 }}
              onClick={() => setOpen(false)}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* 메인 토글 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: open
            ? 'linear-gradient(135deg,#374151,#1f2937)'
            : 'linear-gradient(135deg,#d4a843,#f59e0b)',
          color: open ? '#fff' : '#0a0f1e',
        }}
        aria-label={t.tooltip}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default FloatingContact;
