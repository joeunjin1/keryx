"use client";
/**
 * PricingTiersEditor — 가격 구간 편집기
 * keryx-platform-dev 스킬 §1.2 준수 - 한국어/중국어 이중 언어 지원
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useState } from "react";

export interface PricingTier {
  moq?: number;
  price?: number;
  currency?: "CNY" | "KRW" | "USD";
  // 하위 호환성 필드
  min_qty?: number;
  unit_price_cny?: number;
}

interface PricingTiersEditorProps {
  tiers: PricingTier[];
  onChange: (tiers: PricingTier[]) => void;
  lang?: "ko" | "zh";
  accentColor?: string;
}

const T = {
  ko: {
    title: "가격 구간",
    moq: "MOQ",
    price: "단가",
    currency: "통화",
    addTier: "+ 구간 추가",
    remove: "삭제",
    placeholder_moq: "예: 100",
    placeholder_price: "예: 15.5",
  },
  zh: {
    title: "价格阶梯",
    moq: "最小起订量",
    price: "单价",
    currency: "货币",
    addTier: "+ 添加阶梯",
    remove: "删除",
    placeholder_moq: "例: 100",
    placeholder_price: "例: 15.5",
  },
};

export default function PricingTiersEditor({ tiers, onChange, lang = "ko", accentColor }: PricingTiersEditorProps) {
  const t = T[lang];

  const addTier = () => {
    onChange([...tiers, { moq: 0, price: 0, currency: "CNY" }]);
  };

  const updateTier = (index: number, field: keyof PricingTier, value: string | number) => {
    const updated = tiers.map((tier, i) =>
      i === index ? { ...tier, [field]: value } : tier
    );
    onChange(updated);
  };

  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-700">{t.title}</span>
        <button
          type="button"
          onClick={addTier}
          className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
        >
          {t.addTier}
        </button>
      </div>

      {tiers.length === 0 && (
        <div className="text-center py-4 text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
          {lang === "ko" ? "가격 구간을 추가하세요" : "请添加价格阶梯"}
        </div>
      )}

      {tiers.map((tier, index) => (
        <div key={index} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-neutral-500 mb-1">{t.moq}</label>
            <input
              type="number"
              value={tier.moq || ""}
              onChange={e => updateTier(index, "moq", Number(e.target.value))}
              placeholder={t.placeholder_moq}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-neutral-500 mb-1">{t.price}</label>
            <input
              type="number"
              step="0.01"
              value={tier.price || ""}
              onChange={e => updateTier(index, "price", Number(e.target.value))}
              placeholder={t.placeholder_price}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="w-20">
            <label className="block text-[10px] font-semibold text-neutral-500 mb-1">{t.currency}</label>
            <select
              value={tier.currency}
              onChange={e => updateTier(index, "currency", e.target.value as "CNY" | "KRW" | "USD")}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white"
            >
              <option value="CNY">CNY</option>
              <option value="KRW">KRW</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => removeTier(index)}
            className="mt-4 text-red-400 hover:text-red-600 text-sm font-medium transition-colors"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
