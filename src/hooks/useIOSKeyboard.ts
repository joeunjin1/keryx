'use client';

/**
 * [mobile-first-design 스킬] iOS Safari 키보드 등장 감지 훅
 *
 * iOS Safari에서 position:fixed 요소가 키보드 등장 시 이상하게 움직이는 문제 해결
 * 키보드 등장 감지 후 fixed → absolute 전환에 활용
 *
 * 사용법:
 * const keyboardOpen = useIOSKeyboard();
 * <div style={{ position: keyboardOpen ? 'absolute' : 'fixed' }}>...</div>
 */

import { useState, useEffect } from 'react';

export function useIOSKeyboard(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    // iOS Safari에서만 동작 (visualViewport API 활용)
    if (typeof window === 'undefined') return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;

    const handleResize = () => {
      // 키보드가 올라오면 화면 높이가 줄어듦 (70% 이하)
      const keyboardVisible = window.innerHeight < window.outerHeight * 0.7;
      setKeyboardOpen(keyboardVisible);
    };

    // visualViewport API 사용 (더 정확)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return keyboardOpen;
}
