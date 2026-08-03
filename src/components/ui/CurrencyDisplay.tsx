'use client';

import { useState, useEffect } from 'react';

interface ExchangeRates {
  CNY_KRW: number;
  CNY_USD: number;
  USD_KRW: number;
  USD_CNY: number;
}

// 전역 환율 캐시 (모듈 레벨)
let globalRates: ExchangeRates | null = null;
let ratesFetchedAt: number | null = null;
const CACHE_TTL = 3600 * 1000; // 1시간

async function fetchRates(): Promise<ExchangeRates> {
  if (globalRates && ratesFetchedAt && Date.now() - ratesFetchedAt < CACHE_TTL) {
    return globalRates;
  }
  try {
    const res = await fetch('/api/exchange-rates');
    const data = await res.json();
    globalRates = data.rates;
    ratesFetchedAt = Date.now();
    return data.rates;
  } catch {
    return { CNY_KRW: 190, CNY_USD: 0.138, USD_KRW: 1380, USD_CNY: 7.25 };
  }
}

interface Props {
  amountCny: number;
  showKrw?: boolean;
  showUsd?: boolean;
  size?: 'sm' | 'md' | 'lg';
  primaryCurrency?: 'CNY' | 'KRW' | 'USD';
}

export default function CurrencyDisplay({
  amountCny,
  showKrw = true,
  showUsd = false,
  size = 'md',
  primaryCurrency = 'CNY',
}: Props) {
  const [rates, setRates] = useState<ExchangeRates>({ CNY_KRW: 190, CNY_USD: 0.138, USD_KRW: 1380, USD_CNY: 7.25 });

  useEffect(() => {
    fetchRates().then(setRates);
  }, []);

  const krwAmount = Math.round(amountCny * rates.CNY_KRW);
  const usdAmount = (amountCny * rates.CNY_USD).toFixed(2);

  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 15;
  const subFontSize = size === 'sm' ? 10 : size === 'lg' ? 13 : 11;

  const primaryDisplay = primaryCurrency === 'KRW'
    ? `₩${krwAmount.toLocaleString()}`
    : primaryCurrency === 'USD'
    ? `$${usdAmount}`
    : `¥${amountCny.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div style={{ fontSize, fontWeight: 700, color: '#111827' }}>
        {primaryDisplay}
      </div>
      <div style={{ fontSize: subFontSize, color: '#9ca3af', marginTop: 2 }}>
        {primaryCurrency !== 'CNY' && `¥${amountCny.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} · `}
        {showKrw && primaryCurrency !== 'KRW' && `₩${krwAmount.toLocaleString()}`}
        {showUsd && primaryCurrency !== 'USD' && ` · $${usdAmount}`}
      </div>
    </div>
  );
}

// 훅으로도 사용 가능
export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>({ CNY_KRW: 190, CNY_USD: 0.138, USD_KRW: 1380, USD_CNY: 7.25 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRates().then(r => {
      setRates(r);
      setLoading(false);
    });
  }, []);

  return { rates, loading };
}
