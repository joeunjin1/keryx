import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-7';

export interface CharacterBriefInput {
  ip_brand_name: string;            // 'KERYX' (대상 IP 브랜드)
  user_concept: string;             // 사용자 자유 컨셉 텍스트
  target_audience?: string;         // '20대 여성' 등
  desired_categories?: string[];    // ['키링', '인형']
  inspiration_keywords?: string[];  // ['hermes', 'caduceus', '여행']
  parent_character_summary?: string; // 변형 캐릭터 시 부모 정보
}

export interface CharacterOutput {
  code: string;                     // 'HRM-01' 자동 생성
  name_ko: string;
  name_zh: string;
  name_ja: string;
  name_en: string;
  one_liner: string;
  personality: string;
  backstory: string;
  age_range: string;
  gender: 'female' | 'male' | 'neutral';
  visual_style: string;
  color_palette: Array<{ name: string; hex: string }>;
  signature_features: string[];
  art_direction: string;
  target_audience: string;
  recommended_categories: string[];
}

const CHARACTER_SYSTEM = `당신은 KERYX의 IP 스튜디오 캐릭터 디렉터입니다. KERYX는 굿즈 무역 플랫폼이며, 자체 IP 캐릭터를 만들어 한국·일본·중국 시장에 굿즈로 출시하려 합니다.

당신의 역할:
1. 사용자가 입력한 컨셉을 기반으로 매력적인 캐릭터를 디자인
2. 한·중·일·영 4개 언어 이름 (각 시장의 발음·뉘앙스 고려)
3. 한 줄 소개·성격·세계관 스토리
4. 비주얼 가이드 (스타일·컬러팔레트·시그니처 디테일)
5. 디자이너에게 전달할 art direction
6. 적합한 굿즈 카테고리 추천

KERYX 브랜드 본질:
- "Hermes / 길의 신 / 호기심" 모티브 (KERYX는 헤르메스의 지팡이 caduceus 어원)
- 한국 인형뽑기 타겟 → kawaii·파스텔 톤·MZ 여성 우호적
- 산리오·핑구 같은 글로벌 IP 경쟁사

출력 JSON (markdown 없이, 모든 필드 필수):
{
  "code": "ABC-01 형식 (영문 대문자 3자리 + 시퀀스)",
  "name_ko": "한국어 이름",
  "name_zh": "中文名 (한자)",
  "name_ja": "カタカナ 이름",
  "name_en": "English Name",
  "one_liner": "한 줄 소개 (15~25자)",
  "personality": "성격 (3~4문장)",
  "backstory": "세계관 스토리 (5~7문장)",
  "age_range": "'아동' | '청소년' | '청년' | '성인'",
  "gender": "'female' | 'male' | 'neutral'",
  "visual_style": "예: 'kawaii pastel' / 'flat geometric' / 'vintage retro'",
  "color_palette": [{"name": "파스텔 핑크", "hex": "#FFB6C1"}, ...],   // 4~6개 색
  "signature_features": ["디테일1", "디테일2", "디테일3"],
  "art_direction": "디자이너에게 전달할 그림 가이드 (3~4문장)",
  "target_audience": "타겟 (예: 'MZ 여성, 20~30대, K-pop 팬덤')",
  "recommended_categories": ["키링", "인형", "뱃지"]
}`;

export async function generateIpCharacter(
  input: CharacterBriefInput
): Promise<{ result: CharacterOutput; raw: any; cost_usd: number }> {
  const userPrompt = `IP 브랜드: ${input.ip_brand_name}

사용자 컨셉:
"${input.user_concept}"

${input.target_audience ? `타겟 오디언스 힌트: ${input.target_audience}` : ''}
${input.desired_categories?.length ? `희망 굿즈 카테고리: ${input.desired_categories.join(', ')}` : ''}
${input.inspiration_keywords?.length ? `영감 키워드: ${input.inspiration_keywords.join(', ')}` : ''}
${input.parent_character_summary ? `\n부모 캐릭터 (변형 생성 시):\n${input.parent_character_summary}` : ''}

위 컨셉을 기반으로 매력적이고 굿즈화에 적합한 캐릭터를 JSON으로 디자인해주세요. 한·중·일 시장 모두 통할 이름과 비주얼이어야 합니다.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: CHARACTER_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  let jsonText = text.trim();
  const m = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) jsonText = m[1];

  const result = JSON.parse(jsonText) as CharacterOutput;

  // 필수 필드 검증
  if (!result.name_ko || !result.code || !result.color_palette) {
    throw new Error('필수 필드 누락');
  }

  // 비용 계산 (Opus 4.7: input $15/M, output $75/M)
  const cost_usd = (response.usage.input_tokens * 15 + response.usage.output_tokens * 75) / 1_000_000;

  return {
    result,
    raw: { usage: response.usage, content: text },
    cost_usd: Math.round(cost_usd * 10000) / 10000,
  };
}
