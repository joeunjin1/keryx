/**
 * KERYX 다국어 번역 유틸리티
 * 
 * 사용법:
 * import { useT } from '@/lib/useTranslation';
 * 
 * function MyComponent() {
 *   const t = useT();
 *   return <div>{t('주문 목록', '订单列表')}</div>;
 * }
 * 
 * 또는 번역 사전을 활용한 자동 번역:
 * import { useAutoT } from '@/lib/useTranslation';
 * 
 * function MyComponent() {
 *   const t = useAutoT();
 *   return <div>{t('주문 목록')}</div>; // 사전에서 자동으로 중국어 조회
 * }
 */
"use client";
import { useLangContext } from "@/components/layout/LangContext";
import translations from "./translations.json";

type TranslationDict = Record<string, string>;
const dict: TranslationDict = translations as TranslationDict;

/**
 * 기본 번역 훅 - 명시적으로 한국어/중국어 쌍을 제공
 * const t = useT();
 * t('주문 목록', '订单列表')
 */
export function useT() {
  const { lang } = useLangContext();
  return (ko: string, zh: string): string => {
    return lang === "zh" ? zh : ko;
  };
}

/**
 * 자동 번역 훅 - 번역 사전에서 자동으로 중국어 조회
 * const t = useAutoT();
 * t('주문 목록') // 사전에서 '订单列表' 자동 조회
 * t('새 문자열') // 사전에 없으면 한국어 그대로 반환
 */
export function useAutoT() {
  const { lang } = useLangContext();
  return (ko: string, fallbackZh?: string): string => {
    if (lang !== "zh") return ko;
    // 사전에서 번역 조회
    if (dict[ko]) return dict[ko];
    // fallback 제공된 경우 사용
    if (fallbackZh) return fallbackZh;
    // 없으면 한국어 그대로
    return ko;
  };
}

/**
 * 서버 컴포넌트용 번역 함수 (lang 파라미터 직접 전달)
 */
export function createT(lang: string) {
  return (ko: string, zh: string): string => {
    return lang === "zh" ? zh : ko;
  };
}

/**
 * 번역 사전 조회 (클라이언트/서버 공통)
 */
export function getTranslation(ko: string, lang: string): string {
  if (lang !== "zh") return ko;
  return dict[ko] || ko;
}

/**
 * 번역 사전 전체 내보내기
 */
export { dict as translationDict };
