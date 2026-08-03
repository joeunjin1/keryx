// [solution-architecture-foundation 스킬 준수]
// 조건부 클래스 처리 유틸리티
// 인라인 스타일 대신 cn()으로 조건부 Tailwind 클래스 처리

type ClassValue = string | undefined | null | false | Record<string, boolean>;

export function cn(...classes: ClassValue[]): string {
  return classes
    .flatMap((cls) => {
      if (!cls) return [];
      if (typeof cls === 'string') return [cls];
      return Object.entries(cls)
        .filter(([, value]) => value)
        .map(([key]) => key);
    })
    .join(' ');
}

export default cn;
