'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * [web-performance-resilience 스킬 준수]
 * 전역 에러 페이지 - 서버/클라이언트 런타임 오류 처리
 * 기술적 오류 메시지를 절대 노출하지 않음
 */
export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 자동 에러 보고 (silent)
    fetch('/api/admin/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'server_error',
        message: error.message,
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white px-5">
      <div className="text-center max-w-lg w-full animate-fade-in">
        <div className="text-7xl mb-4">😵</div>
        <span className="inline-block px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold mb-4">
          500 서버 오류
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          서비스에 문제가 발생했습니다
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          일시적인 오류입니다. 잠시 후 다시 시도해 주세요.<br />
          문제가 지속되면 고객센터로 문의해 주세요.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity min-h-[44px]"
          >
            다시 시도
          </button>
          <Link
            href="/shop"
            className="px-6 py-3 bg-white text-gray-700 no-underline rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors min-h-[44px] flex items-center"
          >
            쇼핑몰로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
