"use client";
/**
 * BottomSheet — 모바일 하단 시트 컴포넌트
 * [mobile-first-design 스킬] 준수
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 최대 높이 (기본: 90vh) */
  maxHeight?: string;
}

export function BottomSheet({ open, onClose, title, children, maxHeight = "90vh" }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // 배경 스크롤 방지
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC 키 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 시트 본체 */}
      <div
        ref={sheetRef}
        className="relative bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* 헤더 */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 flex-shrink-0">
            <h2 className="text-base font-bold text-neutral-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        )}

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;
