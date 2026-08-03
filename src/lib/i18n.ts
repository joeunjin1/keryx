import { getRequestConfig } from 'next-intl/server';

/**
 * next-intl 서버 설정
 * keryx-platform-dev 스킬: 한국어(ko) / 중국어(zh) 이중 언어 지원
 */
export default getRequestConfig(async () => {
  // 기본 로케일: 한국어
  const locale = 'ko';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
