"use client";
/**
 * ResponsiveModal — 반응형 모달 컴포넌트
 * [mobile-first-design 스킬] 준수 - 모바일: 하단 시트, 데스크탑: 센터 모달
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useEffect } from "react";

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 데스크탑 최대 너비 (기본: 480px) */
  maxWidth?: string;
}

export function ResponsiveModal({
  open,
  onClose,
  title,
  children,
  maxWidth = "480px",
}: ResponsiveModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 모달 본체 */}
      <div
        className="relative bg-white w-full sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[85vh] max-h-[90vh]"
        style={{ maxWidth: `min(${maxWidth}, 100%)` }}
        role="dialog"
        aria-modal="true"
      >
        {/* 모바일 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
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

interface ModalButtonProps {
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ModalButton({
  onClick,
  variant = "primary",
  disabled = false,
  children,
  className = "",
}: ModalButtonProps) {
  const variantClasses = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
    secondary: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default ResponsiveModal;
