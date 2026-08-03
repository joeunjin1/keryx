import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const MODEL = 'claude-opus-4-7';
export type Lang = 'ko' | 'zh' | 'ja' | 'en';
const LANG_NAMES: Record<Lang, string> = {
  ko: '한국어',
  zh: '中文 (간체)',
  ja: '日本語',
  en: 'English',
};
/**
 * 굿즈/무역 도메인 특화 번역.
 */
export async function translateMessage(
  text: string,
  from: Lang,
  to: Lang,
  context?: { glossary?: Record<string, string> }
): Promise<{ translated: string; confidence: 'high' | 'medium' | 'low' }> {
  if (from === to || !text.trim()) {
    return { translated: text, confidence: 'high' };
  }
  const glossaryHint = context?.glossary
    ? `\n\n업계 용어 사전 (꼭 이대로 번역):\n${Object.entries(context.glossary)
        .map(([k, v]) => `  ${k} → ${v}`)
        .join('\n')}`
    : '';
  const system = `당신은 한국 셀러와 중국 공장의 굿즈/무역 거래를 돕는 KERYX의 전문 번역가입니다.
입력 텍스트를 ${LANG_NAMES[from]}에서 ${LANG_NAMES[to]}로 자연스럽게 번역하세요.
규칙:
- 굿즈 업계 용어(인형/키링/MOQ/아크릴/봉제/PVC 등)를 정확히 번역
- 가격·수량 같은 숫자는 절대 변형하지 말 것
- 비즈니스 친화적 톤 유지
- 번역만 반환. 설명·따옴표·해설 일절 금지
${glossaryHint}`;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: text }],
    });
    const translated = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    const confidence: 'high' | 'medium' | 'low' =
      translated.length > 0 && translated.length < text.length * 5 ? 'high' : 'medium';
    return { translated, confidence };
  } catch (err) {
    console.error('Translation failed', err);
    return { translated: text, confidence: 'low' };
  }
}
/**
 * 메시지 저장 시 백그라운드 번역.
 */
export async function translateBidirectional(
  text: string,
  source: Lang
): Promise<{ ko: string; zh: string }> {
  const targets: Lang[] = source === 'ko' ? ['zh'] : ['ko'];
  const results: Record<string, string> = { ko: '', zh: '' };
  results[source] = text;
  for (const t of targets) {
    const { translated } = await translateMessage(text, source, t);
    results[t] = translated;
  }
  return { ko: results['ko'] ?? '', zh: results['zh'] ?? '' };
}
