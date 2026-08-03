import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-7';

export interface BriefInput {
  brief_no: string;
  title: string;
  concept: string;
  category_name: string;
  target_min_cny: number;
  target_max_cny: number;
  moq_min: number;
  moq_max: number;
  delivery_target: string;
}

export interface ProposalInput {
  response_id: string;
  factory_code: string;
  factory_company_name: string;
  factory_rating: number | null;
  factory_total_orders: number | null;
  product_name: string;
  unit_price_cny: number;
  moq: number;
  lead_time_days: number;
  sample_cost_cny: number;
  size_mm: string | null;
  notes: string | null;
}

export interface AnalysisResult {
  market_estimate_cny: number;
  market_estimate_reasoning: string;
  best_proposal_id: string;
  best_proposal_reason: string;
  negotiation_points: Array<{
    response_id: string;
    points: string[];
  }>;
  recommended_margin_pct: number;
  recommended_seller_price_cny: number;
}

const SYSTEM_PROMPT = `당신은 KERYX 플랫폼의 AI 가격 분석 어시스턴트입니다. KERYX는 한국 인형뽑기 오락실 프랜차이즈에 굿즈를 공급하는 한·중 무역 플랫폼입니다.

당신의 역할은:
1. MD가 받은 공장 제안서들을 비교 분석
2. 중국 도매 시장가 추정 (PVC 키링·인형·아크릴·뱃지 등 굿즈 도매 기준)
3. 바이어 적용 단가 추천 + 권장 마진 % 산정
4. 각 공장과의 협상 포인트 제안

분석 시 고려사항:
- 한국 인형뽑기 시장 가격대: 도매 ¥3~8 / 바이어 적용단가 ¥4~12 (마진 20~50%)
- VIP 셀러는 5~10% 단가 우대 적용
- 납기가 짧을수록 + 평점이 높을수록 가산점
- 공장 평점 4.0 이상이면 신뢰 높음
- 단가만 낮은 공장은 검수 리스크 있을 수 있음 (rating + 납기로 균형 평가)

출력은 반드시 다음 JSON 형식 (markdown 코드 블록 없이):
{
  "market_estimate_cny": 4.00,
  "market_estimate_reasoning": "한 줄 설명",
  "best_proposal_id": "uuid",
  "best_proposal_reason": "이 제안이 최선인 이유",
  "negotiation_points": [
    {"response_id": "uuid", "points": ["협상 포인트1", "협상 포인트2"]}
  ],
  "recommended_margin_pct": 25.0,
  "recommended_seller_price_cny": 5.25
}`;

export async function analyzeBriefProposals(
  brief: BriefInput,
  proposals: ProposalInput[],
  sellerGrade: 'regular' | 'vip'
): Promise<{ result: AnalysisResult; raw: any; cost_usd: number }> {
  if (proposals.length === 0) {
    throw new Error('제안서가 없습니다');
  }

  const userPrompt = `Brief 정보:
- 번호: ${brief.brief_no}
- 제목: ${brief.title}
- 카테고리: ${brief.category_name}
- 컨셉: ${brief.concept}
- 목표 단가: ¥${brief.target_min_cny} ~ ¥${brief.target_max_cny}
- MOQ: ${brief.moq_min.toLocaleString()} ~ ${brief.moq_max.toLocaleString()}개
- 납기 목표: ${brief.delivery_target}
- 바이어 등급: ${sellerGrade === 'vip' ? 'VIP (5~10% 우대 권장)' : '일반'}

받은 공장 제안서 (${proposals.length}건):
${proposals.map((p, i) => `
[제안 ${i + 1}] response_id: ${p.response_id}
- 공장: ${p.factory_code} ${p.factory_company_name} (평점 ${p.factory_rating ?? '없음'} · 누적 주문 ${p.factory_total_orders ?? 0}건)
- 제품: ${p.product_name}
- 단가: ¥${p.unit_price_cny}
- MOQ: ${p.moq.toLocaleString()}
- 리드타임: ${p.lead_time_days}일
- 샘플비: ¥${p.sample_cost_cny}
- 사이즈: ${p.size_mm ?? '-'}
- 공장 메모: ${p.notes ?? '-'}`).join('')}

위 데이터를 종합 분석하여 JSON 형식으로 답해주세요.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  // JSON 추출 (markdown 블록이 있을 수도 있어서 방어적)
  let jsonText = text.trim();
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  }

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Claude 응답 JSON 파싱 실패: ${jsonText.slice(0, 200)}`);
  }

  // 필수 필드 검증
  if (!parsed.market_estimate_cny || !parsed.best_proposal_id || !parsed.recommended_seller_price_cny) {
    throw new Error('Claude 응답에 필수 필드 누락');
  }

  // 비용 계산 (Opus 4.7: input $15/M, output $75/M)
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cost_usd = (inputTokens * 15 + outputTokens * 75) / 1_000_000;

  return {
    result: parsed,
    raw: { usage: response.usage, content: text },
    cost_usd: Math.round(cost_usd * 10000) / 10000,
  };
}
