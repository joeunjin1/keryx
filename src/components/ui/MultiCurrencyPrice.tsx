'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Currency = 'CNY' | 'KRW' | 'USD' | 'JPY' | 'EUR';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CNY: '¥',
  KRW: '₩',
  USD: '$',
  JPY: '¥',
  EUR: '€',
};

interface MultiCurrencyPriceProps {
  /** 기준 금액 (CNY) */
  amountCny: number;
  /** 동시에 보여줄 통화 (default: KRW + USD + JPY) */
  showCurrencies?: Currency[];
  /** 강조할 통화 (셀러 기본 통화) */
  primaryCurrency?: Currency;
  /** 폰트 크기 (sm/md/lg) */
  size?: 'sm' | 'md' | 'lg';
}

export function MultiCurrencyPrice({
  amountCny,
  showCurrencies = ['KRW', 'USD', 'JPY'],
  primaryCurrency,
  size = 'md',
}: MultiCurrencyPriceProps) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient() as any;
      const { data } = await supabase
        .from('exchange_rates')
        .select('to_currency, rate, rate_date')
        .eq('from_currency', 'CNY')
        .in('to_currency', showCurrencies)
        .order('rate_date', { ascending: false });

      const map: Record<string, number> = {};
      for (const r of data ?? []) {
        if (!map[r.to_currency]) map[r.to_currency] = Number(r.rate);
      }
      setRates(map);
      setLoaded(true);
    })();
  }, [JSON.stringify(showCurrencies)]);

  const fontClass =
    size === 'sm' ? 'text-[10px]' :
    size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className={`flex flex-wrap gap-x-2 gap-y-0.5 ${fontClass}`}>
      <span className={primaryCurrency === 'CNY' ? 'font-medium text-brand-700' : 'text-stone-700'}>
        ¥{amountCny.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      {loaded && showCurrencies.map((cur) => {
        if (!rates[cur]) return null;
        const converted = amountCny * rates[cur];
        const isPrimary = primaryCurrency === cur;
        return (
          <span
            key={cur}
            className={isPrimary ? 'font-medium text-brand-700' : 'text-stone-500'}
          >
            ≈ {CURRENCY_SYMBOLS[cur]}{Math.round(converted).toLocaleString()}
          </span>
        );
      })}
    </div>
  );
}
