'use client';

/**
 * [mobile-first-design 스킬] Android 백버튼으로 모달 닫기 훅
 *
 * Android 시스템 백버튼이 모달을 닫는 게 아니라 페이지 자체를 뒤로 보내는 문제 해결
 *
 * 사용법:
 * const [modalOpen, setModalOpen] = useState(false);
 * useAndroidBackButton(modalOpen, () => setModalOpen(false));
 */

import { useEffect } from 'react';

export function useAndroidBackButton(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    // 모달이 열릴 때 history에 더미 상태 추가
    window.history.pushState({ modal: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      // 백버튼 누르면 모달 닫기 (페이지 이동 방지)
      if (e.state?.modal) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
}
