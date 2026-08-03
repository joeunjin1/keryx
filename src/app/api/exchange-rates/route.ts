import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 환율 조회 API (공개)
// DB에 캐시된 환율 반환, 없으면 실시간 API 호출
export async function GET() {
  const supabase = createClient() as any;

  // DB에서 최신 환율 조회 (1시간 이내)
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const { data: cachedRates } = await supabase
    .from('exchange_rates')
    .select('base_currency, target_currency, rate, updated_at')
    .gte('updated_at', oneHourAgo)
    .in('base_currency', ['CNY', 'USD'])
    .order('updated_at', { ascending: false });

  if (cachedRates && cachedRates.length >= 3) {
    // DB 캐시 사용
    const rateMap: Record<string, number> = {};
    for (const r of cachedRates) {
      rateMap[`${r.base_currency}_${r.target_currency}`] = r.rate;
    }
    return NextResponse.json({
      source: 'cache',
      updated_at: cachedRates[0]?.updated_at,
      rates: {
        CNY_KRW: rateMap['CNY_KRW'] || 190,
        CNY_USD: rateMap['CNY_USD'] || 0.138,
        USD_KRW: rateMap['USD_KRW'] || 1380,
        USD_CNY: rateMap['USD_CNY'] || 7.25,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  }

  // 실시간 API 호출 (open.er-api.com - 무료, 회원가입 불필요)
  try {
    const [cnyRes, usdRes] = await Promise.all([
      fetch('https://open.er-api.com/v6/latest/CNY', { next: { revalidate: 3600 } }),
      fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } }),
    ]);

    const cnyData = cnyRes.ok ? await cnyRes.json() : null;
    const usdData = usdRes.ok ? await usdRes.json() : null;

    const cnyRates = cnyData?.rates || {};
    const usdRates = usdData?.rates || {};

    const rates = {
      CNY_KRW: cnyRates.KRW || 190,
      CNY_USD: cnyRates.USD || 0.138,
      USD_KRW: usdRates.KRW || 1380,
      USD_CNY: usdRates.CNY || 7.25,
    };

    // DB에 캐시 저장 (비동기, 실패해도 응답에 영향 없음)
    const now = new Date().toISOString();
    const upserts = [
      { base_currency: 'CNY', target_currency: 'KRW', rate: rates.CNY_KRW, updated_at: now },
      { base_currency: 'CNY', target_currency: 'USD', rate: rates.CNY_USD, updated_at: now },
      { base_currency: 'USD', target_currency: 'KRW', rate: rates.USD_KRW, updated_at: now },
      { base_currency: 'USD', target_currency: 'CNY', rate: rates.USD_CNY, updated_at: now },
    ];
    supabase.from('exchange_rates').upsert(upserts, {
      onConflict: 'base_currency,target_currency',
    }).then(() => {}).catch(() => {});

    return NextResponse.json({
      source: 'live',
      updated_at: now,
      rates,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch {
    // 최후 fallback: 고정 환율
    return NextResponse.json({
      source: 'fallback',
      updated_at: new Date().toISOString(),
      rates: {
        CNY_KRW: 190,
        CNY_USD: 0.138,
        USD_KRW: 1380,
        USD_CNY: 7.25,
      },
    });
  }
}
