"use client";
/**
 * MobileDrawer — 모바일 사이드 드로어 컴포넌트
 * [mobile-first-design 스킬] 준수
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useEffect } from "react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export function MobileDrawer({
  open,
  onClose,
  side = "left",
  title,
  children,
  width = "280px",
}: MobileDrawerProps) {
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

  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* 배경 오버레이 */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 드로어 본체 */}
      <div
        className={`absolute top-0 bottom-0 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          side === "left" ? "left-0" : "right-0"
        } ${
          open
            ? "translate-x-0"
            : side === "left"
            ? "-translate-x-full"
            : "translate-x-full"
        }`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        {/* 헤더 */}
        {title && (
          <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default MobileDrawer;
