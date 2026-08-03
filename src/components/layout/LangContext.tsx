"use client";
/**
 * LangContext — KERYX 전역 언어 상태 관리
 * keryx-platform-dev 스킬 §1.2 준수
 * - localStorage('keryx_lang')에 언어 설정 저장
 * - React Context로 전역 공유
 * - 새로고침 없이 즉시 전환
 * - defaultLang prop으로 포털별 기본 언어 설정 가능 (공장 포털: zh)
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "ko" | "zh";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

export const LangContext = createContext<LangContextValue>({
  lang: "ko",
  setLang: () => {},
  toggle: () => {},
});

export function LangProvider({
  children,
  defaultLang = "ko",
  storageKey = "keryx_lang",
}: {
  children: ReactNode;
  defaultLang?: Lang;
  storageKey?: string;
}) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  // 마운트 시 localStorage에서 언어 설정 복원
  // 저장된 값이 있으면 우선 적용, 없으면 defaultLang 사용 후 저장
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as Lang | null;
      if (saved === "ko" || saved === "zh") {
        setLangState(saved);
      } else {
        // 저장된 값이 없으면 defaultLang 적용 및 저장
        setLangState(defaultLang);
        localStorage.setItem(storageKey, defaultLang);
      }
    } catch {
      // localStorage 접근 불가 환경 (SSR 등) 무시
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(storageKey, newLang);
    } catch {
      // 무시
    }
  };

  const toggle = () => setLang(lang === "ko" ? "zh" : "ko");

  return (
    <LangContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LangContext.Provider>
  );
}

/** 언어 컨텍스트 훅 */
export function useLangContext() {
  return useContext(LangContext);
}
