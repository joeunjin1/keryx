import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 현재 로그인 셀러의 구독 목록
export async function GET() {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data });
}

// POST: 구독 신청
export async function POST(req: NextRequest) {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { plan_id, billing_cycle, payment_method, payment_ref, payment_note } = body;

  if (!plan_id || !billing_cycle) {
    return NextResponse.json({ error: 'plan_id and billing_cycle are required' }, { status: 400 });
  }

  const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
    basic: { monthly: 300, yearly: 2520 },
    premium: { monthly: 500, yearly: 4200 },
    vip_pro: { monthly: 800, yearly: 6720 },
  };

  const prices = PLAN_PRICES[plan_id];
  if (!prices) return NextResponse.json({ error: 'Invalid plan_id' }, { status: 400 });

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);

  // 기존 활성 구독 확인
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('seller_id', user.id)
    .in('status', ['active', 'trial'])
    .single();

  if (existing) {
    return NextResponse.json({ error: '이미 활성 구독이 있습니다.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      seller_id: user.id,
      plan_id,
      billing_cycle,
      status: 'trial',
      trial_start_at: now.toISOString(),
      trial_end_at: trialEnd.toISOString(),
      amount_cny: billing_cycle === 'monthly' ? prices.monthly : prices.yearly,
      payment_method: payment_method || 'wechat',
      payment_ref: payment_ref || null,
      payment_note: payment_note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data }, { status: 201 });
}
