/**
 * /api/cron/expiry-alerts
 * 스킬 원칙: 만료 전 14/7/3/1일 알림 필수
 * GitHub Actions cron (매일 09:00 KST) 에서 호출
 * 현재: 관리자 알림 + 콘솔 로그 (카카오 알림톡 키 확보 후 연동 예정)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/* 스킬 원칙: 만료 알림 임계값 14/7/3/1일 */
const ALERT_DAYS = [14, 7, 3, 1];

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

  const now = new Date();
  const alerts: Array<{
    seller_id: string;
    plan_id: string;
    days_left: number;
    expiry_date: string;
    seller_email: string | null;
    company_name: string | null;
  }> = [];

  for (const days of ALERT_DAYS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23, 59, 59, 999);

    /* trial 만료 체크 */
    const { data: trialSubs } = await supabase
      .from('subscriptions')
      .select('seller_id, plan_id, trial_end_at, sellers(email:user_id(email), company_name:business_name)')
      .eq('status', 'trial')
      .gte('trial_end_at', targetStart.toISOString())
      .lte('trial_end_at', targetEnd.toISOString());

    if (trialSubs) {
      for (const sub of trialSubs) {
        alerts.push({
          seller_id: sub.seller_id,
          plan_id: sub.plan_id,
          days_left: days,
          expiry_date: sub.trial_end_at,
          seller_email: (sub.sellers as any)?.email ?? null,
          company_name: (sub.sellers as any)?.company_name ?? null,
        });
      }
    }

    /* active 구독 만료 체크 */
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('seller_id, plan_id, current_period_end, sellers(email:user_id(email), company_name:business_name)')
      .eq('status', 'active')
      .gte('current_period_end', targetStart.toISOString())
      .lte('current_period_end', targetEnd.toISOString());

    if (activeSubs) {
      for (const sub of activeSubs) {
        alerts.push({
          seller_id: sub.seller_id,
          plan_id: sub.plan_id,
          days_left: days,
          expiry_date: sub.current_period_end,
          seller_email: (sub.sellers as any)?.email ?? null,
          company_name: (sub.sellers as any)?.company_name ?? null,
        });
      }
    }
  }

  if (alerts.length === 0) {
    return NextResponse.json({ success: true, alert_count: 0, executed_at: now.toISOString() });
  }

  /* 관리자 알림 테이블에 기록 */
  const { error: insertError } = await supabase
    .from('admin_notifications')
    .insert(
      alerts.map(a => ({
        type: 'subscription_expiry',
        title: `구독 만료 ${a.days_left}일 전 — ${a.company_name ?? a.seller_id}`,
        body: `플랜: ${a.plan_id} | 만료일: ${new Date(a.expiry_date).toLocaleDateString('ko-KR')}`,
        metadata: a,
        is_read: false,
      }))
    );

  if (insertError) {
    console.error('[expiry-alerts] 알림 기록 오류:', insertError.message);
  }

  /* 콘솔 로그 (카카오 알림톡 연동 전 임시) */
  console.log(`[expiry-alerts] ${alerts.length}건 만료 알림 처리:`, alerts.map(a => `${a.company_name}(${a.days_left}일 전)`).join(', '));

  return NextResponse.json({
    success: true,
    alert_count: alerts.length,
    alerts: alerts.map(a => ({ seller_id: a.seller_id, days_left: a.days_left, plan_id: a.plan_id })),
    executed_at: now.toISOString(),
  });
}
