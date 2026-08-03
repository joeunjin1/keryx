import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// Vercel Cron이 매일 호출
// Authorization 헤더로 보호
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // exchangerate-api.com 무료 endpoint (회원가입 불필요, 일 1500 req)
  // CNY 기준 환율 가져오기
  let cnyRates: any;
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/CNY', {
      next: { revalidate: 0 },
    });
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    cnyRates = await r.json();
  } catch (err) {
    return NextResponse.json({ error: `API fetch failed: ${err}` }, { status: 502 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const rates = cnyRates.rates ?? {};

  const upserts = [
    { from: 'CNY', to: 'KRW', rate: rates.KRW },
    { from: 'CNY', to: 'USD', rate: rates.USD },
    { from: 'CNY', to: 'JPY', rate: rates.JPY },
    { from: 'CNY', to: 'EUR', rate: rates.EUR },
  ].filter((r) => typeof r.rate === 'number' && r.rate > 0);

  // USD -> KRW, USD -> CNY 추가 (USD 기준 1번 더 호출)
  let usdRates: any = {};
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (r.ok) {
      const data = await r.json();
      usdRates = data.rates ?? {};
    }
  } catch {}

  if (usdRates.KRW) upserts.push({ from: 'USD', to: 'KRW', rate: usdRates.KRW });
  if (usdRates.CNY) upserts.push({ from: 'USD', to: 'CNY', rate: usdRates.CNY });

  // KRW -> CNY 역수
  if (rates.KRW) {
    upserts.push({ from: 'KRW', to: 'CNY', rate: 1 / rates.KRW });
  }

  const supabase = createClient() as any;
  const rows = upserts.map((u) => ({
    rate_date: today,
    from_currency: u.from as any,
    to_currency: u.to as any,
    rate: Math.round(u.rate * 100000) / 100000,
    source: 'er-api',
  }));

  const { error } = await supabase
    .from('exchange_rates')
    .upsert(rows, { onConflict: 'rate_date,from_currency,to_currency' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    date: today,
    updated: rows.length,
    rates: rows.map((r) => `${r.from_currency}→${r.to_currency}: ${r.rate}`),
  });
}
