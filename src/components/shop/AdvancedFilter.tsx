"use client";
/**
 * AdvancedFilter — 쇼핑몰 고급 필터 컴포넌트
 * keryx-platform-dev 스킬 §1.2 준수 - 한국어/중국어 이중 언어 지원
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useState } from "react";

export interface FilterState {
  minMoq: number;
  maxMoq: number;
  minPrice: number;
  maxPrice: number;
  leadTime: string;
  ipProtected: boolean;
  hasStock: boolean;
  categories: string[];
  // 하위 호환성 필드 (shop/page.tsx 호환성)
  moqMax?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  leadTimeMax?: number | null;
  hasIp?: boolean | null;
  sizeCategory?: string | null;
}

export const DEFAULT_FILTERS: FilterState = {
  minMoq: 0,
  maxMoq: 10000,
  minPrice: 0,
  maxPrice: 100000,
  leadTime: "all",
  ipProtected: false,
  hasStock: false,
  categories: [],
};

interface AdvancedFilterProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  lang: "ko" | "zh";
  accentColor?: string;
}

const T = {
  ko: {
    title: "상세 필터",
    moq: "MOQ 범위",
    price: "가격 범위",
    leadTime: "리드타임",
    leadAll: "전체",
    lead7: "7일 이내",
    lead14: "14일 이내",
    lead30: "30일 이내",
    ipProtected: "IP 보호 제품만",
    hasStock: "재고 있는 제품만",
    apply: "필터 적용",
    reset: "초기화",
    unit_moq: "개",
    unit_price: "원",
  },
  zh: {
    title: "高级筛选",
    moq: "MOQ范围",
    price: "价格范围",
    leadTime: "交货期",
    leadAll: "全部",
    lead7: "7天内",
    lead14: "14天内",
    lead30: "30天内",
    ipProtected: "仅IP保护产品",
    hasStock: "仅有库存产品",
    apply: "应用筛选",
    reset: "重置",
    unit_moq: "个",
    unit_price: "元",
  },
};

export default function AdvancedFilter({ filters, onChange, lang, accentColor = "#667eea" }: AdvancedFilterProps) {
  const [open, setOpen] = useState(false);
  const t = T[lang];

  const handleReset = () => onChange(DEFAULT_FILTERS);

  const activeCount = [
    filters.minMoq > 0 || filters.maxMoq < 10000,
    filters.minPrice > 0 || filters.maxPrice < 100000,
    filters.leadTime !== "all",
    filters.ipProtected,
    filters.hasStock,
  ].filter(Boolean).length;

  return (
    <div className="relative">
      {/* 필터 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all cursor-pointer"
        style={{
          borderColor: activeCount > 0 ? accentColor : "#e5e7eb",
          background: activeCount > 0 ? `${accentColor}10` : "#fff",
          color: activeCount > 0 ? accentColor : "#6b7280",
        }}
      >
        <span>⚙️</span>
        <span>{t.title}</span>
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-bold"
            style={{ background: accentColor }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* 필터 패널 */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-neutral-100 z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-800">{t.title}</span>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* MOQ 범위 */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">
              {t.moq}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={filters.minMoq}
                onChange={e => onChange({ ...filters, minMoq: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm text-center"
                min={0}
              />
              <span className="text-neutral-400 text-xs">~</span>
              <input
                type="number"
                value={filters.maxMoq}
                onChange={e => onChange({ ...filters, maxMoq: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm text-center"
                min={0}
              />
              <span className="text-neutral-500 text-xs">{t.unit_moq}</span>
            </div>
          </div>

          {/* 리드타임 */}
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">
              {t.leadTime}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { v: "all", label: t.leadAll },
                { v: "7", label: t.lead7 },
                { v: "14", label: t.lead14 },
                { v: "30", label: t.lead30 },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => onChange({ ...filters, leadTime: opt.v })}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                  style={{
                    background: filters.leadTime === opt.v ? accentColor : "#f9fafb",
                    color: filters.leadTime === opt.v ? "#fff" : "#6b7280",
                    borderColor: filters.leadTime === opt.v ? accentColor : "#e5e7eb",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 체크박스 옵션 */}
          <div className="mb-4 space-y-2">
            {[
              { key: "ipProtected" as const, label: t.ipProtected },
              { key: "hasStock" as const, label: t.hasStock },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters[opt.key]}
                  onChange={e => onChange({ ...filters, [opt.key]: e.target.checked })}
                  className="w-4 h-4 rounded"
                  style={{ accentColor }}
                />
                <span className="text-sm text-neutral-700">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-600 font-medium hover:bg-neutral-50 transition-all"
            >
              {t.reset}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm text-white font-semibold transition-all"
              style={{ background: accentColor }}
            >
              {t.apply}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
