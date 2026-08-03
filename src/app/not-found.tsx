'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Lang } from '@/components/layout/LangContext';

const T = {
  ko: {
    code: '404',
    title: '페이지를 찾을 수 없습니다',
    sub: '요청하신 페이지가 존재하지 않거나 이동되었습니다.',
    home: '홈으로 돌아가기',
    shop: '쇼핑몰 보기',
    back: '이전 페이지',
    langToggle: '中文',
  },
  zh: {
    code: '404',
    title: '页面不存在',
    sub: '您请求的页面不存在或已被移动。',
    home: '返回首页',
    shop: '浏览商城',
    back: '返回上一页',
    langToggle: '한국어',
  },
};

export default function NotFound() {
  const [lang, setLang] = useState<Lang>('ko');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('keryx_lang') as Lang | null;
      if (saved === 'ko' || saved === 'zh') setLang(saved);
    } catch {
      // SSR 환경 무시
    }
  }, []);

  const t = T[lang];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 px-5">
      <div className="text-center max-w-lg w-full animate-fade-in">
        {/* 404 아이콘 */}
        <div className="text-7xl mb-4">🔍</div>

        {/* 에러 코드 - 그라디언트 텍스트는 CSS 변수 활용 */}
        <div className="text-8xl font-black leading-none mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          {t.code}
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {t.title}
        </h1>

        {/* 설명 */}
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          {t.sub}
        </p>

        {/* 버튼들 */}
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/shop"
            className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white no-underline rounded-xl text-sm font-bold transition-opacity hover:opacity-90 min-h-[44px] flex items-center"
          >
            {t.shop}
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-white text-gray-700 no-underline rounded-xl text-sm font-semibold border border-gray-200 transition-colors hover:bg-gray-50 min-h-[44px] flex items-center"
          >
            {t.home}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold cursor-pointer transition-colors hover:bg-gray-50 min-h-[44px]"
          >
            {t.back}
          </button>
        </div>

        {/* 언어 전환 */}
        <button
          onClick={() => {
            const next: Lang = lang === 'ko' ? 'zh' : 'ko';
            setLang(next);
            try { localStorage.setItem('keryx_lang', next); } catch { /* 무시 */ }
          }}
          className="mt-8 px-3 py-1.5 bg-transparent border border-gray-300 rounded-lg text-xs text-gray-400 cursor-pointer hover:border-gray-400 transition-colors"
        >
          {t.langToggle}
        </button>
      </div>
    </div>
  );
}
