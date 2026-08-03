/**
 * 유틸리티 함수 모음
 * keryx-platform-dev 스킬 준수
 *
 * @/lib/utils 경로로 import하는 코드와의 호환성 유지
 */
export { cn } from './cn';
export { default } from './cn';

/**
 * 통화 포맷 유틸리티
 * @param amount 금액
 * @param currency 통화 코드 (기본: KRW)
 * @param lang 언어 (ko | zh)
 */
export function formatCurrency(
  amount: number,
  currency: 'KRW' | 'CNY' | 'USD' = 'KRW',
  lang: 'ko' | 'zh' = 'ko'
): string {
  const localeMap = { ko: 'ko-KR', zh: 'zh-CN' };
  const locale = localeMap[lang];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 날짜 포맷 유틸리티
 */
export function formatDate(
  dateStr: string | Date,
  lang: 'ko' | 'zh' = 'ko'
): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const localeMap = { ko: 'ko-KR', zh: 'zh-CN' };
  return date.toLocaleDateString(localeMap[lang], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 숫자 포맷 유틸리티 (천 단위 구분)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

/**
 * 퍼센트 포맷 유틸리티
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 마진율 계산
 */
export function calcMargin(cost: number, price: number): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}
