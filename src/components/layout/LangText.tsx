"use client";
/**
 * LangText — 다국어 텍스트 렌더링 컴포넌트
 * keryx-platform-dev 스킬 §1.2 준수
 * 사용법: <LangText ko="한국어" zh="中文" />
 */
import { useLangContext } from "./LangContext";

interface LangTextProps {
  ko: string;
  zh: string;
  /** 추가 클래스 (span에 적용) */
  className?: string;
  /** HTML 태그 변경 (기본: span) */
  as?: keyof JSX.IntrinsicElements;
}

export default function LangText({
  ko,
  zh,
  className,
  as: Tag = "span",
}: LangTextProps) {
  const { lang } = useLangContext();
  const text = lang === "zh" ? zh : ko;

  if (className) {
    return <Tag className={className}>{text}</Tag>;
  }
  return <>{text}</>;
}

/**
 * useLangText — 문자열로 다국어 텍스트 반환 훅
 * 사용법: const t = useLangText(); t({ ko: "한국어", zh: "中文" })
 */
export function useLangText() {
  const { lang } = useLangContext();
  return function t({ ko, zh }: { ko: string; zh: string }): string {
    return lang === "zh" ? zh : ko;
  };
}
