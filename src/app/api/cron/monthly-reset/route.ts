/**
 * /api/cron/monthly-reset
 * 스킬 원칙: 사용량 카운터는 매월 1일 자동 리셋
 * GitHub Actions cron (매월 1일 00:00 UTC+8) 에서 호출
 * CRON_SECRET 헤더로 인증
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  /* 보안: CRON_SECRET 검증 */
  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  );

  /* DB 함수 호출 (마이그레이션에서 정의된 reset_monthly_usage) */
  const { data, error } = await supabase.rpc('reset_monthly_usage');

  if (error) {
    console.error('[monthly-reset] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resetCount = data as number;
  console.log(`[monthly-reset] ${resetCount}개 셀러 사용량 리셋 완료`);

  return NextResponse.json({
    success: true,
    reset_count: resetCount,
    executed_at: new Date().toISOString(),
  });
}
