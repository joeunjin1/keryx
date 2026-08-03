/**
 * [chat-app-builder 스킬 준수]
 * 3-Tier 콘텐츠 필터링 시스템
 *
 * Tier 1: 욕설 차단 (즉시 거부)
 * Tier 2: 금지어 차단 (즉시 거부)
 * Tier 3: 민감 정보 감지 (silent flagging → 관리자 알림)
 */

// ── Tier 1: 욕설 목록 ──────────────────────────────────────────────────────
const PROFANITY_LIST = [
  '씨발', '개새끼', '병신', '지랄', '미친놈', '꺼져', '죽어',
  '바보', '멍청이', '쓰레기', '개년', '년놈', '새끼',
  // 중국어 욕설
  '操你', '妈的', '他妈', '草泥马', '傻逼', '滚开',
];

// ── Tier 2: 금지어 목록 (경쟁사 유도, 외부 거래 유도 등) ──────────────────
const BANNED_WORDS = [
  '알리바바 직거래', '위챗으로 연락', '카카오로 연락', '개인 계좌',
  '시스템 외 거래', '직접 거래', '수수료 없이',
  // 중국어
  '私下交易', '微信联系', '绕过平台', '私人账户',
];

// ── Tier 3: 민감 정보 패턴 (silent flagging) ─────────────────────────────
const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{4}-\d{4}\b/,          // 한국 전화번호
  /\b1[3-9]\d{9}\b/,                  // 중국 전화번호
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,  // 이메일
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,      // 카드번호
  /계좌번호|account\s*number|账号/i,
];

export type FilterResult =
  | { ok: true; flagged: false }
  | { ok: false; reason: 'profanity' | 'banned'; message: string }
  | { ok: true; flagged: true; reason: 'sensitive'; patterns: string[] };

/**
 * 메시지 필터링
 * @returns FilterResult
 */
export function filterMessage(text: string): FilterResult {
  const lower = text.toLowerCase();

  // Tier 1: 욕설 차단
  for (const word of PROFANITY_LIST) {
    if (text.includes(word)) {
      return {
        ok: false,
        reason: 'profanity',
        message: '부적절한 표현이 포함되어 있습니다. 수정 후 다시 보내주세요.',
      };
    }
  }

  // Tier 2: 금지어 차단
  for (const word of BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return {
        ok: false,
        reason: 'banned',
        message: '플랫폼 외부 거래 유도 표현은 사용할 수 없습니다.',
      };
    }
  }

  // Tier 3: 민감 정보 감지 (silent flagging)
  const detectedPatterns: string[] = [];
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(pattern.source);
    }
  }

  if (detectedPatterns.length > 0) {
    return {
      ok: true,
      flagged: true,
      reason: 'sensitive',
      patterns: detectedPatterns,
    };
  }

  return { ok: true, flagged: false };
}

/**
 * 민감 정보 감지 시 관리자 알림 API 호출
 */
export async function reportSensitiveMessage(params: {
  conversationId: string;
  messageText: string;
  senderId: string;
  patterns: string[];
}) {
  try {
    await fetch('/api/admin/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'sensitive_chat_message',
        message: `민감 정보 감지: ${params.patterns.join(', ')}`,
        digest: params.conversationId,
        url: `/chat/${params.conversationId}`,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // silent - 실패해도 메시지 전송에 영향 없음
  }
}
