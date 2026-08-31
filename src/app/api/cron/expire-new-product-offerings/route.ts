import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 매일 실행되는 신상품 피드 만료 작업입니다.
 * 노출 기간을 넘긴 항목은 삭제하지 않고 expired 상태로 바꾸며, 공개 피드는
 * expires_at 조건으로도 한 번 더 차단합니다.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: expiredCount, error } = await (admin as any).rpc('expire_new_product_offerings');
  if (error) {
    console.error('[cron expire new product offerings] failed', error.message);
    return NextResponse.json({ error: 'expiration_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    expired_count: expiredCount ?? 0,
    timestamp: new Date().toISOString(),
  });
}
