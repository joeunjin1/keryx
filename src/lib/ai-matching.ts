import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-7';

// ============================================================================
// 공통 유틸 — Claude 응답에서 JSON 추출
// ============================================================================

function extractJson(text: string): any {
  let s = text.trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) s = m[1];
  return JSON.parse(s);
}

function calcCost(inputTokens: number, outputTokens: number): number {
  // Opus 4.7: input $15/M, output $75/M
  const usd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;
  return Math.round(usd * 10000) / 10000;
}

// ============================================================================
// 1. AI Brief 자동 생성
// ============================================================================

export interface BriefDraftInput {
  seller_business_name: string;
  seller_grade: 'regular' | 'vip';
  seller_country: string;
  source_text: string;          // 의향 description (예: "여름용 핑크 톤 PVC 키링 5천개")
  budget_hint?: string;
  moq_hint?: string;
  available_categories: Array<{ id: string; code: string; name_ko: string; name_zh: string }>;
}

export interface BriefDraftOutput {
  title_ko: string;
  title_zh: string;
  concept: string;
  category_id: string;
  target_price_min_cny: number;
  target_price_max_cny: number;
  moq_min: number;
  moq_max: number;
  delivery_target_days: number;
  md_notes_to_factory: string;
}

const BRIEF_SYSTEM = `당신은 KERYX (한·중 굿즈 무역 플랫폼)의 AI MD 어시스턴트입니다. 한국 인형뽑기 오락실 프랜차이즈에 굿즈를 공급합니다.

셀러의 자유 텍스트 의향을 받아 공장에게 보낼 익명 Brief 초안을 작성합니다.

도메인 지식:
- 주력 굿즈: PVC 키링, 인형, 아크릴 굿즈, 뱃지, 봉제, 미니 피규어
- 한국 도매가 ¥3~8 / 바이어 적용가 ¥4~12
- 전형 MOQ: 1,000~10,000개
- 표준 납기: 25~40일 (PVC 25일 / 봉제 35일 / 복잡 굿즈 40일)
- VIP 셀러는 고품질 + 빠른 납기 우선

출력은 반드시 다음 JSON (markdown 코드 블록 없이):
{
  "title_ko": "한국어 제목 (15자 내외)",
  "title_zh": "中文标题",
  "concept": "공장에게 전달할 컨셉 설명 (3~5줄)",
  "category_id": "카테고리 UUID (제공된 목록에서 선택)",
  "target_price_min_cny": 3.5,
  "target_price_max_cny": 5.0,
  "moq_min": 3000,
  "moq_max": 10000,
  "delivery_target_days": 30,
  "md_notes_to_factory": "공장 메모 — 디테일·강조사항 (1~2줄)"
}`;

export async function generateBriefDraft(input: BriefDraftInput): Promise<{ result: BriefDraftOutput; raw: any; cost_usd: number }> {
  const categoryList = input.available_categories
    .map((c) => `- ${c.id} : ${c.code} · ${c.name_ko} (${c.name_zh})`)
    .join('\n');

  const userPrompt = `바이어 정보:
- 이름: ${input.seller_business_name}
- 등급: ${input.seller_grade}
- 국가: ${input.seller_country}

바이어 의향 원문:
"${input.source_text}"
${input.budget_hint ? `\n예산 힌트: ${input.budget_hint}` : ''}
${input.moq_hint ? `\nMOQ 힌트: ${input.moq_hint}` : ''}

선택 가능한 카테고리:
${categoryList}

위 바이어 의향을 분석해서 공장에게 발송할 익명 Brief 초안을 JSON으로 작성해주세요.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: BRIEF_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const result = extractJson(text) as BriefDraftOutput;

  if (!result.title_zh || !result.concept || !result.category_id) {
    throw new Error('필수 필드 누락');
  }

  return {
    result,
    raw: { usage: response.usage, content: text },
    cost_usd: calcCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}

// ============================================================================
// 2. AI 공장 매칭
// ============================================================================

export interface FactoryStat {
  factory_id: string;
  factory_code: string;
  company_name: string;
  rating: number | null;
  total_orders: number;
  category_response_count: number;
  category_approved_products: number;
  avg_unit_price_cny: number;
  avg_lead_time_days: number;
}

export interface FactoryMatch {
  factory_id: string;
  rank: number;
  score: number;          // 0~100
  reason: string;
}

const FACTORY_SYSTEM = `당신은 KERYX의 공장 매칭 어시스턴트입니다. Brief가 작성되면 카탈로그에 등록된 공장 풀에서 가장 적합한 5곳을 골라야 합니다.

평가 기준:
1. 카테고리 전문성 (해당 카테고리 응답·승인 제품 많은 공장)
2. 평점 (rating ≥ 4.0 우대)
3. 평균 단가가 Brief 목표 단가 범위에 가까운지
4. 평균 리드타임이 Brief 납기에 맞는지
5. 누적 주문이 많은 공장 (실적 안정성)

새 공장 (rating null, 주문 0건)은 다양성을 위해 1~2곳 포함 가능하지만 상위 1~2위는 절대 아님.

출력은 반드시 다음 JSON (markdown 없이):
{
  "matches": [
    {"factory_id": "uuid", "rank": 1, "score": 92, "reason": "이유 (1~2줄)"},
    {"factory_id": "uuid", "rank": 2, "score": 85, "reason": "..."},
    ...
  ]
}

최대 5곳까지 반환. 적합한 공장이 5곳 미만이면 더 적게 반환해도 됩니다.`;

export async function matchFactoriesForBrief(
  briefSummary: {
    title: string;
    concept: string;
    category_name: string;
    target_price_min: number;
    target_price_max: number;
    moq_min: number;
    moq_max: number;
    delivery_days: number;
  },
  factories: FactoryStat[]
): Promise<{ matches: FactoryMatch[]; raw: any; cost_usd: number }> {
  if (factories.length === 0) {
    return { matches: [], raw: null, cost_usd: 0 };
  }

  const factoryList = factories
    .slice(0, 30)  // 30곳까지만 평가 (token 절약)
    .map(
      (f) => `- ${f.factory_id} | ${f.factory_code} ${f.company_name} | 평점 ${f.rating ?? 'null'} · 누적주문 ${f.total_orders} · 카테고리 응답 ${f.category_response_count}건 · 승인제품 ${f.category_approved_products}개 · 평균 단가 ¥${f.avg_unit_price_cny?.toFixed(2) ?? '-'} · 평균 리드타임 ${f.avg_lead_time_days?.toFixed(0) ?? '-'}일`
    )
    .join('\n');

  const userPrompt = `Brief 요약:
- 제목: ${briefSummary.title}
- 컨셉: ${briefSummary.concept}
- 카테고리: ${briefSummary.category_name}
- 목표 단가: ¥${briefSummary.target_price_min} ~ ¥${briefSummary.target_price_max}
- MOQ: ${briefSummary.moq_min.toLocaleString()} ~ ${briefSummary.moq_max.toLocaleString()}개
- 납기 (일): ${briefSummary.delivery_days}

평가 대상 공장 (${factories.length}곳):
${factoryList}

위 공장들 중 이 Brief에 가장 적합한 5곳을 JSON으로 추천해주세요.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: FACTORY_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const parsed = extractJson(text) as { matches: FactoryMatch[] };

  if (!Array.isArray(parsed.matches)) {
    throw new Error('matches 배열 누락');
  }

  return {
    matches: parsed.matches,
    raw: { usage: response.usage, content: text },
    cost_usd: calcCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}

// ============================================================================
// 3. 셀러 의향 → 카탈로그 제품 매칭
// ============================================================================

export interface CatalogProduct {
  product_id: string;
  sku: string | null;
  name_ko: string | null;
  name_zh: string;
  category_name: string;
  factory_code: string;
  factory_rating: number | null;
  unit_price_cny: number;
  moq: number;
  lead_time_days: number;
  has_ip: boolean;
  ip_name: string | null;
}

export interface ProductMatch {
  product_id: string;
  rank: number;
  score: number;     // 0~100
  reason: string;
}

const PRODUCT_MATCH_SYSTEM = `당신은 KERYX의 카탈로그 매칭 어시스턴트입니다. 셀러가 의향을 등록하면 기존 승인된 카탈로그에서 가장 적합한 제품 5개를 즉시 추천합니다.

평가 기준:
1. 의향 텍스트와 제품명·카테고리 의미적 매칭 (한국어/중국어 모두 고려)
2. 바이어 예산이 제품 단가 범위에 맞는지
3. 바이어 MOQ 힌트가 제품 MOQ에 맞는지
4. 공장 평점 (rating ≥ 4.0 우대)
5. IP 매칭 (바이어가 특정 IP를 원하면 그것 우선)

출력 JSON (markdown 없이):
{
  "matches": [
    {"product_id": "uuid", "rank": 1, "score": 95, "reason": "추천 이유 (1줄)"}
  ]
}

적합 제품이 0개일 수 있음 (그 경우 빈 배열). 최대 5개.`;

export async function matchProductsForSellerIntent(
  intent: {
    seller_grade: 'regular' | 'vip';
    description: string;
    budget_hint?: string;
    moq_hint?: string;
  },
  products: CatalogProduct[]
): Promise<{ matches: ProductMatch[]; raw: any; cost_usd: number }> {
  if (products.length === 0) {
    return { matches: [], raw: null, cost_usd: 0 };
  }

  const productList = products
    .slice(0, 50)  // 50개까지만
    .map(
      (p) => `- ${p.product_id} | ${p.sku ?? '-'} | ${p.name_ko ?? p.name_zh} | ${p.category_name} | ${p.factory_code} (★${p.factory_rating ?? '-'}) | ¥${p.unit_price_cny} · MOQ ${p.moq.toLocaleString()} · ${p.lead_time_days}일${p.has_ip ? ' | IP: ' + p.ip_name : ''}`
    )
    .join('\n');

  const userPrompt = `바이어 의향:
- 등급: ${intent.seller_grade}
- 원문: "${intent.description}"
${intent.budget_hint ? `- 예산: ${intent.budget_hint}` : ''}
${intent.moq_hint ? `- MOQ: ${intent.moq_hint}` : ''}

카탈로그 (${products.length}개):
${productList}

위 의향에 가장 적합한 제품 5개를 JSON으로 추천해주세요.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: PRODUCT_MATCH_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const parsed = extractJson(text) as { matches: ProductMatch[] };

  if (!Array.isArray(parsed.matches)) {
    throw new Error('matches 배열 누락');
  }

  return {
    matches: parsed.matches,
    raw: { usage: response.usage, content: text },
    cost_usd: calcCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}
