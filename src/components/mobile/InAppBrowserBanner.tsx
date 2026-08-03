'use client';

/**
 * [mobile-first-design 스킬] 인앱 브라우저 안내 배너
 * 카카오톡, 위챗(WeChat) 인앱 브라우저에서 접속 시 Chrome으로 열기 안내
 *
 * 사용법: layout.tsx 또는 최상위 컴포넌트에 추가
 * <InAppBrowserBanner />
 */

import { useEffect, useState } from 'react';

export function InAppBrowserBanner() {
  const [isInApp, setIsInApp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    // 카카오톡, 위챗(WeChat/MicroMessenger) 인앱 브라우저 감지
    const inApp = /KAKAOTALK|MicroMessenger|Line|FB_IAB|FBAN|Instagram/.test(ua);
    setIsInApp(inApp);
  }, []);

  if (!isInApp || dismissed) return null;

  // Android Chrome으로 열기 Intent URL
  const chromeIntentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;

  return (
    <div className="kx-inapp-banner">
      <span style={{ fontSize: 16 }}>⚠️</span>
      <div className="flex-1">
        <span>더 나은 경험을 위해 Chrome 브라우저에서 열어주세요.</span>
        <span style={{ marginLeft: 4, color: '#78350f' }}>
          / 请在Chrome浏览器中打开以获得更好体验。
        </span>
      </div>
      <a
        href={chromeIntentUrl}
        style={{
          background: '#f59e0b',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Chrome으로 열기
      </a>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          color: '#92400e',
          padding: '0 4px',
          flexShrink: 0,
        }}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
