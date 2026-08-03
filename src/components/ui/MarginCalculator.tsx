"use client";
/**
 * MarginCalculator — 마진 계산기 컴포넌트
 * keryx-platform-dev 스킬 §1.2 준수 - 한국어/중국어 이중 언어 지원
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useState } from "react";

interface MarginCalculatorProps {
  lang?: "ko" | "zh";
}

const T = {
  ko: {
    title: "💰 마진 계산기",
    costPrice: "원가 (위안)",
    exchangeRate: "환율 (₩/¥)",
    sellPrice: "판매가 (원)",
    shippingCost: "배송비 (원)",
    calculate: "계산하기",
    result_cost: "원가 (원화)",
    result_margin: "마진",
    result_margin_rate: "마진율",
    result_profit: "순이익",
    placeholder_cost: "예: 15",
    placeholder_rate: "예: 190",
    placeholder_sell: "예: 5900",
    placeholder_ship: "예: 800",
  },
  zh: {
    title: "💰 利润计算器",
    costPrice: "成本价（元）",
    exchangeRate: "汇率（₩/¥）",
    sellPrice: "售价（韩元）",
    shippingCost: "运费（韩元）",
    calculate: "计算",
    result_cost: "成本（韩元）",
    result_margin: "利润",
    result_margin_rate: "利润率",
    result_profit: "净利润",
    placeholder_cost: "例: 15",
    placeholder_rate: "例: 190",
    placeholder_sell: "例: 5900",
    placeholder_ship: "例: 800",
  },
};

export default function MarginCalculator({ lang = "ko" }: MarginCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [costYuan, setCostYuan] = useState("");
  const [rate, setRate] = useState("190");
  const [sellPrice, setSellPrice] = useState("");
  const [shipping, setShipping] = useState("800");
  const [result, setResult] = useState<{
    costKrw: number;
    margin: number;
    marginRate: number;
    profit: number;
  } | null>(null);

  const t = T[lang];

  const calculate = () => {
    const cost = parseFloat(costYuan) * parseFloat(rate);
    const sell = parseFloat(sellPrice);
    const ship = parseFloat(shipping) || 0;
    if (isNaN(cost) || isNaN(sell)) return;
    const profit = sell - cost - ship;
    const marginRate = (profit / sell) * 100;
    setResult({ costKrw: cost, margin: profit, marginRate, profit });
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6">
      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center text-lg hover:bg-indigo-700 transition-all active:scale-95"
        title={t.title}
      >
        💰
      </button>

      {/* 계산기 패널 */}
      {open && (
        <div className="absolute bottom-14 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-neutral-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-neutral-800">{t.title}</span>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { label: t.costPrice, value: costYuan, set: setCostYuan, placeholder: t.placeholder_cost },
              { label: t.exchangeRate, value: rate, set: setRate, placeholder: t.placeholder_rate },
              { label: t.sellPrice, value: sellPrice, set: setSellPrice, placeholder: t.placeholder_sell },
              { label: t.shippingCost, value: shipping, set: setShipping, placeholder: t.placeholder_ship },
            ].map(field => (
              <div key={field.label}>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  {field.label}
                </label>
                <input
                  type="number"
                  value={field.value}
                  onChange={e => field.set(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            ))}
          </div>

          <button
            onClick={calculate}
            className="w-full mt-3 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95"
          >
            {t.calculate}
          </button>

          {result && (
            <div className="mt-3 p-3 bg-neutral-50 rounded-xl space-y-1.5">
              {[
                { label: t.result_cost, value: `₩${result.costKrw.toLocaleString()}` },
                { label: t.result_profit, value: `₩${result.profit.toLocaleString()}`, highlight: result.profit > 0 },
                { label: t.result_margin_rate, value: `${result.marginRate.toFixed(1)}%`, highlight: result.marginRate > 30 },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500">{row.label}</span>
                  <span className={`text-sm font-bold ${row.highlight ? "text-green-600" : "text-neutral-800"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
