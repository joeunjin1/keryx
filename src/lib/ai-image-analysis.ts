import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-7';

// ============================================================================
// 공통: 이미지 URL → base64 (Claude Vision은 URL 또는 base64 받음)
// 운영에서는 URL로 직접 전달 (Supabase signed URL이 publicly fetchable)
// ============================================================================

async function buildImageContent(imageUrls: string[]): Promise<any[]> {
  // Claude Messages API는 URL 이미지 지원
  return imageUrls.slice(0, 6).map((url) => ({
    type: 'image',
    source: { type: 'url', url },
  }));
}

function calcCost(inputTokens: number, outputTokens: number): number {
  // Opus 4.7 Vision: input $15/M, output $75/M (이미지는 토큰으로 환산됨)
  const usd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;
  return Math.round(usd * 10000) / 10000;
}

function extractJson(text: string): any {
  let s = text.trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) s = m[1];
  return JSON.parse(s);
}

// ============================================================================
// 1. 검수 사진 분석 — 결함 자동 탐지
// ============================================================================

export interface InspectionAnalysisResult {
  defects: Array<{
    type: 'color_mismatch' | 'scratch' | 'misalignment' | 'print_error' | 'damage' | 'package_issue' | 'other';
    severity: 'minor' | 'moderate' | 'critical';
    description: string;
    image_index: number;     // 어떤 사진에서 발견
  }>;
  overall_score: number;     // 0~100
  pass_recommendation: boolean;
  reasoning: string;
  defect_count: number;
}

const INSPECTION_VISION_SYSTEM = `당신은 KERYX의 검수 AI 어시스턴트입니다. Yiwu 창고에 입고된 굿즈 시제품 사진을 보고 결함을 자동 탐지·분류해야 합니다.

평가 기준:
1. 색상 일치 (color_mismatch) — 의도된 색상 vs 실제
2. 표면 결함 (scratch, damage) — 흠집·균열·찍힘
3. 정렬·조립 (misalignment) — 부품 어긋남
4. 인쇄 결함 (print_error) — 인쇄 흐림·오타·번짐
5. 포장 (package_issue) — 포장 손상·라벨 오류

심각도 (severity):
- minor: 5% 미만 영향 (소량 허용)
- moderate: 5~30% 영향 (rework 필요)
- critical: 30%+ 영향 또는 안전 (return 필요)

전체 점수 (overall_score, 0~100):
- 95~100: 결함 없음 또는 minor 1~2개
- 80~94: minor 다수 또는 moderate 1~2개
- 50~79: moderate 다수
- 0~49: critical 1개 이상

출력 JSON (markdown 없이):
{
  "defects": [
    {"type": "color_mismatch", "severity": "minor", "description": "...", "image_index": 0}
  ],
  "overall_score": 85,
  "pass_recommendation": true,
  "reasoning": "1~2문장 종합 의견",
  "defect_count": 2
}

결함이 없으면 defects는 빈 배열, overall_score 95+로.`;

export async function analyzeInspectionPhotos(
  imageUrls: string[],
  productInfo: { name: string; expected_color?: string; brief_concept?: string }
): Promise<{ result: InspectionAnalysisResult; raw: any; cost_usd: number }> {
  const imageContent = await buildImageContent(imageUrls);

  const userPrompt = `검수 대상 제품: ${productInfo.name}
${productInfo.expected_color ? `기대 색상: ${productInfo.expected_color}` : ''}
${productInfo.brief_concept ? `Brief 컨셉: ${productInfo.brief_concept}` : ''}

위 ${imageUrls.length}장의 시제품 사진을 보고 결함을 자동 탐지·분류해주세요. JSON으로 답해주세요.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: INSPECTION_VISION_SYSTEM,
    messages: [{
      role: 'user',
      content: [...imageContent, { type: 'text', text: userPrompt }],
    }],
  });

  const text = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const result = extractJson(text) as InspectionAnalysisResult;

  if (typeof result.overall_score !== 'number') {
    throw new Error('overall_score 누락');
  }

  return {
    result,
    raw: { usage: response.usage, content: text },
    cost_usd: calcCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}

// ============================================================================
// 2. 제품 이미지 → 자동 태그 생성
// ============================================================================

export interface ProductTagResult {
  primary_color_name: string;
  primary_color_hex: string;
  secondary_colors: string[];
  style_tags: string[];           // ['kawaii', 'pastel', 'vintage']
  estimated_material: string;
  visual_features: string[];      // ['글리터', '캐릭터 face', '리본']
  estimated_target_audience: string;
  description_zh: string;
  description_ko: string;
}

const PRODUCT_TAG_SYSTEM = `당신은 KERYX의 카탈로그 자동 태깅 AI입니다. 공장이 등록한 제품 이미지를 보고 카테고리·색상·스타일·자재 등을 자동으로 분류해 바이어 검색·매칭에 활용할 메타데이터를 생성합니다.

출력 JSON (markdown 없이):
{
  "primary_color_name": "파스텔 핑크",
  "primary_color_hex": "#FFB6C1",
  "secondary_colors": ["#FFFFFF", "#FFD700"],
  "style_tags": ["kawaii", "pastel"],
  "estimated_material": "PVC",
  "visual_features": ["글리터 인서트", "리본"],
  "estimated_target_audience": "20대 여성 / K-pop 팬덤",
  "description_zh": "中文 제품 묘사 (1~2문장)",
  "description_ko": "한국어 제품 묘사 (1~2문장)"
}`;

export async function tagProductImages(
  imageUrls: string[],
  productHint: { name?: string; category?: string }
): Promise<{ result: ProductTagResult; raw: any; cost_usd: number }> {
  const imageContent = await buildImageContent(imageUrls);

  const userPrompt = `제품 이미지를 분석해 카탈로그 메타데이터를 자동 생성해주세요.
${productHint.name ? `제품명 힌트: ${productHint.name}` : ''}
${productHint.category ? `카테고리: ${productHint.category}` : ''}

JSON으로 답해주세요.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: PRODUCT_TAG_SYSTEM,
    messages: [{
      role: 'user',
      content: [...imageContent, { type: 'text', text: userPrompt }],
    }],
  });

  const text = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const result = extractJson(text) as ProductTagResult;

  return {
    result,
    raw: { usage: response.usage, content: text },
    cost_usd: calcCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}

// ============================================================================
// 3. 캐릭터 가이드 ↔ 제품 매칭도
// ============================================================================

export interface CharacterMatchResult {
  match_score: number;             // 0~100
  matches: Array<{ feature: string; score: number; comment: string }>;
  improvements: string[];
  pass_recommendation: boolean;
  reasoning: string;
}

const CHARACTER_MATCH_SYSTEM = `당신은 KERYX의 IP 일관성 가드입니다. 자체 IP 캐릭터를 굿즈로 만들 때, 공장이 보낸 시제품/디자인 시안이 캐릭터 가이드와 얼마나 일치하는지 평가해야 합니다.

평가 차원:
- 컬러 팔레트 매칭 (정확한 hex 값 사용 여부)
- 시그니처 디테일 보존 (signature_features)
- 비주얼 스타일 일관성 (visual_style)
- 비례·구도 (art_direction)

출력 JSON (markdown 없이):
{
  "match_score": 78,
  "matches": [
    {"feature": "컬러 팔레트", "score": 90, "comment": "..."},
    {"feature": "시그니처 디테일", "score": 60, "comment": "..."}
  ],
  "improvements": ["눈 비율 5% 키우기", "팔레트의 #FFD700 추가"],
  "pass_recommendation": true,
  "reasoning": "1~2문장 종합"
}`;

export async function matchProductToCharacter(
  imageUrls: string[],
  character: {
    name: string;
    visual_style: string;
    color_palette: Array<{ name: string; hex: string }>;
    signature_features: string[];
    art_direction: string;
  }
): Promise<{ result: CharacterMatchResult; raw: any; cost_usd: number }> {
  const imageContent = await buildImageContent(imageUrls);

  const userPrompt = `대상 캐릭터: ${character.name}
비주얼 스타일: ${character.visual_style}
컬러 팔레트: ${character.color_palette.map((c) => `${c.name}(${c.hex})`).join(', ')}
시그니처 디테일: ${character.signature_features.join(', ')}
Art Direction: ${character.art_direction}

위 캐릭터 가이드와 첨부 이미지의 매칭도를 평가해주세요. JSON으로 답해주세요.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: CHARACTER_MATCH_SYSTEM,
    messages: [{
      role: 'user',
      content: [...imageContent, { type: 'text', text: userPrompt }],
    }],
  });

  const text = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const result = extractJson(text) as CharacterMatchResult;

  return {
    result,
    raw: { usage: response.usage, content: text },
    cost_usd: calcCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}
