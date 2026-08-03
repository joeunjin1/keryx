'use client';
import { useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

export default function MdMarginPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [form, setForm] = useState({ factory_price: '', shipping: '', customs: '', inspection: '', keryx_fee: '0', sell_price: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const fp = parseFloat(form.factory_price) || 0;
  const sh = parseFloat(form.shipping) || 0;
  const cu = parseFloat(form.customs) || 0;
  const ins = parseFloat(form.inspection) || 0;
  const kf = parseFloat(form.keryx_fee) || 0;
  const sp = parseFloat(form.sell_price) || 0;
  const totalCost = fp + sh + cu + ins + kf;
  const margin = sp > 0 ? sp - totalCost : 0;
  const marginRate = sp > 0 ? ((margin / sp) * 100).toFixed(1) : '0';

  const InputRow = ({ label, k, unit = 'CNY' }: { label: string; k: string; unit?: string }) => (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100">
      <label className="w-36 text-sm text-gray-600 shrink-0">{label}</label>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="number"
          value={form[k as keyof typeof form]}
          onChange={e => set(k, e.target.value)}
          placeholder="0"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <span className="text-xs text-gray-400 shrink-0">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">마진 계산기</h1>
        <p className="text-sm text-gray-500 mt-1">공장 원가부터 판매가까지 마진을 빠르게 계산합니다.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-2">비용 입력</h2>
        <InputRow label="공장 원가" k="factory_price" />
        <InputRow label="물류비 (해운/항공)" k="shipping" />
        <InputRow label="관세 + 통관비" k="customs" />
        <InputRow label="검수비" k="inspection" />
        <InputRow label="KERYX 관리비" k="keryx_fee" />
        <div className="flex items-center gap-3 pt-3">
          <label className="w-36 text-sm font-bold text-gray-800 shrink-0">판매가</label>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              value={form.sell_price}
              onChange={e => set('sell_price', e.target.value)}
              placeholder="0"
              className="w-full border-2 border-indigo-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-gray-400 shrink-0">CNY</span>
          </div>
        </div>
      </div>

      {/* 결과 */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-5">
        <h2 className="text-sm font-bold text-indigo-700 mb-4">계산 결과</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border border-indigo-100">
            <div className="text-xs text-gray-500 mb-1">총 원가</div>
            <div className="text-xl font-black text-gray-900">¥{totalCost.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-indigo-100">
            <div className="text-xs text-gray-500 mb-1">마진 금액</div>
            <div className={`text-xl font-black ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>¥{margin.toFixed(2)}</div>
          </div>
          <div className="col-span-2 bg-white rounded-xl p-4 border border-indigo-100">
            <div className="text-xs text-gray-500 mb-1">마진율</div>
            <div className={`text-3xl font-black ${parseFloat(marginRate) >= 20 ? 'text-emerald-600' : parseFloat(marginRate) >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
              {marginRate}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {parseFloat(marginRate) >= 20 ? '✓ 양호한 마진율' : parseFloat(marginRate) >= 10 ? '△ 마진율 개선 필요' : '✗ 마진율 부족 — 원가 재검토 권장'}
            </div>
          </div>
        </div>
        {/* 비용 구조 바 */}
        {totalCost > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">비용 구조</div>
            <div className="flex rounded-full overflow-hidden h-4">
              {[
                { label: '원가', val: fp, color: '#4f46e5' },
                { label: '물류', val: sh, color: '#7c3aed' },
                { label: '관세', val: cu, color: '#a855f7' },
                { label: '검수', val: ins, color: '#c084fc' },
                { label: '관리비', val: kf, color: '#e9d5ff' },
              ].filter(i => i.val > 0).map(item => (
                <div key={item.label} style={{ width: `${(item.val / totalCost) * 100}%`, background: item.color }} title={`${item.label}: ¥${item.val}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: '원가', val: fp, color: '#4f46e5' },
                { label: '물류', val: sh, color: '#7c3aed' },
                { label: '관세', val: cu, color: '#a855f7' },
                { label: '검수', val: ins, color: '#c084fc' },
                { label: '관리비', val: kf, color: '#e9d5ff' },
              ].filter(i => i.val > 0).map(item => (
                <div key={item.label} className="flex items-center gap-1 text-xs text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  {item.label} {totalCost > 0 ? ((item.val / totalCost) * 100).toFixed(0) : 0}%
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
