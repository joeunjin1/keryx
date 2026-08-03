"use client";
/**
 * LanguageSwitcher — 언어 전환 버튼 컴포넌트
 * keryx-platform-dev 스킬 §1.2 준수
 * - 한국어 ↔ 중국어 즉시 전환
 * - useLang 훅 export (MobileLayout 등에서 사용)
 */
import { useLangContext } from "./LangContext";
export type { Lang } from "./LangContext";

// MobileLayout에서 useLang으로 import하므로 alias export
export function useLang() {
  return useLangContext();
}

interface LanguageSwitcherProps {
  /** 버튼 크기 변형 */
  size?: "sm" | "md" | "lg";
  /** 추가 클래스 */
  className?: string;
}

export default function LanguageSwitcher({
  size = "md",
  className = "",
}: LanguageSwitcherProps) {
  const { lang, toggle } = useLangContext();

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <button
      onClick={toggle}
      className={[
        "inline-flex items-center gap-1.5 rounded-lg border border-white/20",
        "bg-white/10 font-semibold text-white/90 hover:bg-white/20",
        "transition-colors active:scale-95",
        sizeClasses[size],
        className,
      ].join(" ")}
      aria-label={lang === "ko" ? "중국어로 전환" : "한국어로 전환"}
      title={lang === "ko" ? "切换到中文" : "한국어로 전환"}
    >
      <span className="text-base leading-none">{lang === "ko" ? "🇨🇳" : "🇰🇷"}</span>
      <span>{lang === "ko" ? "中文" : "한국어"}</span>
    </button>
  );
}
