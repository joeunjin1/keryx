import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function releaseExpiredReservations(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient() as any;
  const { data, error } = await admin.rpc('release_expired_retail_reservations');
  if (error) {
    console.error('[retail reservation expiry] release failed', error.message);
    return NextResponse.json({ error: '예약 재고 정리에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, releasedOrders: Number(data || 0) });
}

export async function GET(request: NextRequest) {
  return releaseExpiredReservations(request);
}

export async function POST(request: NextRequest) {
  return releaseExpiredReservations(request);
}
