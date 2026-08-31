import { NextResponse } from 'next/server';

/**
 * 레거시 공개 구독 신청 엔드포인트입니다.
 * 기존 b2b_subscribers 데이터와 발송 이력은 보존하되, 신규 신청은
 * 로그인 바이어의 회사 인증·운영 승인 흐름으로만 받습니다.
 */
export async function POST() {
  return NextResponse.json({
    error: '신상품·샘플 구독은 바이어 로그인 후 회사 인증과 운영 승인이 필요합니다.',
    code: 'BUYER_VERIFICATION_REQUIRED',
    nextPath: '/sample-subscription/apply',
  }, { status: 410 });
}
