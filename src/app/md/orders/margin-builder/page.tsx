'use client';
import Image from 'next/image';
import { Suspense } from 'react';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, TrendingUp } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface OrderLine {
  product_id: string;
  factory_id: string;
  product_name: string;
  factory_label: string;
  qty: number;
  factory_cost_cny: number;       // 공장 cost (입력값)
}

function MarginBuilderPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const briefId = params.get('briefId');
  const analysisId = params.get('analysisId');

  const [me, setMe] = useState<any>(null);
  const [brief, setBrief] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);

  const [marginPct, setMarginPct] = useState<number>(25);
  const [paymentRoute, setPaymentRoute] = useState<'gaza_krw' | 'direct_usd' | 'direct_cny'>('gaza_krw');
  const [packagingType, setPackagingType] = useState<'factory_standard' | 'keryx_designer'>('factory_standard');
  const [packagingNotes, setPackagingNotes] = useState('');
  const [warehouseArrival, setWarehouseArrival] = useState(
    new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10)
  );

  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 환율 (KRW 미리보기)
  const [krwRate, setKrwRate] = useState<number>(195.5);

  useEffect(() => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '마진 계산기 | KERYX';
  }, []);

    if (!briefId) {
      router.push('/md');
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?role=internal');
        return;
      }
      const { data: m } = await supabase
        .from('internal_users')
        .select('id, role, name_ko')
        .eq('user_id', user.id)
        .single() as { data: any, error: any };
      if (!m || !['md', 'admin'].includes(m.role)) {
        router.push('/admin');
        return;
      }
      setMe(m);

      // Brief + 바이어(고객)
      const { data: b } = await supabase
        .from('briefs')
        .select('*, seller:sellers(*), category:categories(name_ko)')
        .eq('id', briefId)
        .single() as { data: any, error: any };
      setBrief(b);
      setSeller((b as any)?.seller);

      // AI 분석 (있으면)
      if (analysisId) {
        const { data: a } = await supabase
          .from('ai_price_analyses')
          .select('*')
          .eq('id', analysisId)
          .single() as { data: any, error: any };
        setAnalysis(a);
        if (a?.recommended_margin_pct) setMarginPct(Number(a.recommended_margin_pct));
      }

      // 응답들
      const { data: r } = await supabase
        .from('brief_responses')
        .select(
          `id, factory_id,
           factory:factories(factory_code, company_name, rating),
           product:products(id, name_ko, name_zh, moq, lead_time_days,
             pricing:product_pricing_tiers(min_qty, unit_price_cny),
             images:product_images(url, is_primary))`
        )
        .eq('brief_id', briefId)
        .order('created_at') as { data: any, error: any };
      setResponses(r ?? []);

      // 환율
      const { data: er } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', 'CNY')
        .eq('to_currency', 'KRW')
        .order('rate_date')
        .limit(1)
        .maybeSingle() as { data: any, error: any };
      if (er?.rate) setKrwRate(Number(er.rate));

      setLoading(false);
    })();
  }, [briefId, analysisId, router, supabase]);

  function addLine(response: any) {
    if (!response.product?.id || !response.factory_id) return;
    if (orderLines.some((l) => l.product_id === response.product.id)) return;

    const tier = response.product?.pricing?.[0];
    const cost = Number(tier?.unit_price_cny ?? 0);
    const moq = response.product?.moq ?? 1000;

    setOrderLines((cur) => [
      ...cur,
      {
        product_id: response.product.id,
        factory_id: response.factory_id,
        product_name: response.product.name_ko ?? response.product.name_zh,
        factory_label: `${response.factory?.factory_code} ${response.factory?.company_name}`,
        qty: moq,
        factory_cost_cny: cost,
      },
    ]);
  }

  function removeLine(productId: string) {
    setOrderLines((cur) => cur.filter((l) => l.product_id !== productId));
  }

  function updateLine(productId: string, field: 'qty' | 'factory_cost_cny', value: number) {
    setOrderLines((cur) => cur.map((l) =>
      l.product_id === productId ? { ...l, [field]: value } : l
    ));
  }

  // 계산
  const margin = marginPct / 100;
  const totalLines = orderLines.map((l) => {
    const sellerPrice = Math.round(l.factory_cost_cny * (1 + margin) * 100) / 100;
    const factorySubtotal = l.factory_cost_cny * l.qty;
    const sellerSubtotal = sellerPrice * l.qty;
    const lineProfit = sellerSubtotal - factorySubtotal;
    return { ...l, sellerPrice, factorySubtotal, sellerSubtotal, lineProfit };
  });

  const totalCost = totalLines.reduce((s, l) => s + l.factorySubtotal, 0);
  const totalSale = totalLines.reduce((s, l) => s + l.sellerSubtotal, 0);
  const totalProfit = totalSale - totalCost;
  const deposit = Math.round(totalSale * 0.3);
  const balance = totalSale - deposit;

  const totalSaleKrw = Math.round(totalSale * krwRate);
  const profitKrw = Math.round(totalProfit * krwRate);

  async function submit() {
    setError(null);
    if (orderLines.length === 0) {
      setError('최소 1개 라인을 추가해주세요.');
      return;
    }
    if (marginPct < 0 || marginPct > 100) {
      setError('마진은 0~100% 사이여야 합니다.');
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/orders/margin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: seller?.id,
        margin_pct: marginPct,
        payment_route: paymentRoute,
        packaging_type: packagingType,
        packaging_notes: packagingNotes.trim() || null,
        expected_warehouse_arrival: warehouseArrival,
        ai_analysis_id: analysisId,
        lines: orderLines.map((l) => ({
          product_id: l.product_id,
          factory_id: l.factory_id,
          qty: l.qty,
          factory_cost_cny: l.factory_cost_cny,
        })),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? '주문서 생성 실패');
      return;
    }
    const { order_id } = await res.json();
    router.push(`/md/orders/${order_id}`);
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-5xl mx-auto px-5 py-6 grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">

          {analysis && (
            <Card className="bg-gradient-to-br from-brand-50 to-vip-50 border-brand-200">
              <CardBody>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-brand-700" />
                  <div className="text-sm font-medium text-brand-900">AI 추천 적용</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-stone-500">시장가</div>
                    <div className="font-medium">¥{Number(analysis.market_estimate_cny).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500">권장 마진</div>
                    <div className="font-medium text-vip-700">{Number(analysis.recommended_margin_pct).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500">권장 바이어(고객)가</div>
                    <div className="font-medium text-green-700">¥{Number(analysis.recommended_seller_price_cny).toFixed(2)}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}


          <Card>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">마진 % *</label>
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)}
                    step="0.1"
                    className="w-full h-9 px-2 text-sm font-medium border border-stone-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">결제 경로</label>
                  <select
                    value={paymentRoute}
                    onChange={(e) => setPaymentRoute(e.target.value as any)}
                    className="w-full h-9 px-2 text-xs border border-stone-200 rounded"
                  >
                    <option value="gaza_krw">가자트레이드 KRW</option>
                    <option value="direct_usd">직접 USD</option>
                    <option value="direct_cny">직접 CNY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">예상 창고 도착</label>
                  <input
                    type="date"
                    value={warehouseArrival}
                    onChange={(e) => setWarehouseArrival(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-stone-200 rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 mt-3">
                <label className="block text-[11px] text-stone-600 mb-1">포장</label>
                <div className="flex gap-2 text-xs">
                  <label className={`flex items-center gap-1.5 px-3 py-2 rounded cursor-pointer border ${
                    packagingType === 'factory_standard' ? 'bg-brand-50 border-brand-200' : 'bg-stone-50 border-stone-200'
                  }`}>
                    <input
                      type="radio"
                      checked={packagingType === 'factory_standard'}
                      onChange={() => setPackagingType('factory_standard')}
                    />
                    공장 기본 포장
                  </label>
                  <label className={`flex items-center gap-1.5 px-3 py-2 rounded cursor-pointer border ${
                    packagingType === 'keryx_designer' ? 'bg-vip-50 border-vip-200' : 'bg-stone-50 border-stone-200'
                  }`}>
                    <input
                      type="radio"
                      checked={packagingType === 'keryx_designer'}
                      onChange={() => setPackagingType('keryx_designer')}
                    />
                    KERYX 디자이너
                  </label>
                </div>
                {packagingType === 'keryx_designer' && (
                  <input
                    value={packagingNotes}
                    onChange={(e) => setPackagingNotes(e.target.value)}
                    placeholder="포장 디자인 컨셉 (디자이너에게 전달)"
                    className="w-full h-8 px-2 text-xs border border-stone-200 rounded mt-2"
                  />
                )}
              </div>
            </CardBody>
          </Card>


          <div>
            <div className="text-sm font-medium mb-2">제안서에서 라인 추가</div>
            <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-2">
              {responses.map((r) => {
                const tier = r.product?.pricing?.[0];
                const isAdded = orderLines.some((l) => l.product_id === r.product?.id);
                const isAiBest = analysis?.best_proposal_id === r.id;
                const img = r.product?.images?.find((i: any) => i.is_primary) ?? r.product?.images?.[0];
                return (
                  <button
                    key={r.id}
                    onClick={() => addLine(r)}
                    disabled={isAdded}
                    className={`text-left p-2 rounded border transition ${
                      isAdded ? 'bg-stone-100 border-stone-200 opacity-50' :
                      isAiBest ? 'bg-brand-50 border-brand-200 hover:bg-brand-100' :
                      'bg-white border-stone-200 hover:border-brand-300'
                    }`}
                  >
                    <div className="flex gap-2">
                      {img && <Image src={img.url} alt="" width={200} height={200} className="object-cover" />}
                      <div className="flex-1">
                        <div className="text-xs font-medium flex items-center gap-1">
                          {r.product?.name_ko ?? r.product?.name_zh}
                          {isAiBest && <Sparkles className="w-3 h-3 text-brand-600" />}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {r.factory?.factory_code} · ¥{tier?.unit_price_cny} · MOQ {r.product?.moq}
                        </div>
                        <div className="text-[10px] text-brand-700 mt-0.5">{isAdded ? '추가됨' : '+ 클릭'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>


          {orderLines.length > 0 && (
            <Card>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200">
                      <tr className="text-stone-500">
                        <th className="text-left p-2 font-medium">제품</th>
                        <th className="text-right p-2 font-medium">수량</th>
                        <th className="text-right p-2 font-medium">공장 cost ¥</th>
                        <th className="text-right p-2 font-medium">바이어가 ¥</th>
                        <th className="text-right p-2 font-medium">소계 ¥</th>
                        <th className="text-right p-2 font-medium">이익 ¥</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {totalLines.map((l) => (
                        <tr key={l.product_id} className="border-b border-stone-100">
                          <td className="p-2">
                            <div className="font-medium">{l.product_name}</div>
                            <div className="text-[10px] text-stone-500">{l.factory_label}</div>
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={l.qty}
                              onChange={(e) => updateLine(l.product_id, 'qty', parseInt(e.target.value) || 0)}
                              className="w-20 h-7 px-1 text-right text-xs border border-stone-200 rounded"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={l.factory_cost_cny}
                              onChange={(e) => updateLine(l.product_id, 'factory_cost_cny', parseFloat(e.target.value) || 0)}
                              className="w-20 h-7 px-1 text-right text-xs border border-stone-200 rounded"
                            />
                          </td>
                          <td className="p-2 text-right font-medium text-brand-700">
                            ¥{l.sellerPrice.toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            ¥{Math.round(l.sellerSubtotal).toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-green-700">
                            ¥{Math.round(l.lineProfit).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => removeLine(l.product_id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </div>


        <div className="space-y-3">
          <Card className="bg-stone-100 border-0 sticky top-4">
            <CardBody>
              <div className="text-sm font-medium mb-3">주문 합계</div>
              <Row label="원가 (cost)" value={`¥${Math.round(totalCost).toLocaleString()}`} />
              <Row label={`바이어 적용가 (${marginPct}% 마진)`} value={`¥${Math.round(totalSale).toLocaleString()}`} highlight />
              <Row
                label="이익"
                value={`¥${Math.round(totalProfit).toLocaleString()}`}
                color="green"
              />

              <div className="border-t border-stone-300 my-3" />

              <Row label="선금 30%" value={`¥${deposit.toLocaleString()}`} />
              <Row label="잔금 70%" value={`¥${balance.toLocaleString()}`} />

              <div className="border-t border-stone-300 my-3" />

              <Row
                label={`KRW 환산 (¥1=${krwRate})`}
                value={`₩${totalSaleKrw.toLocaleString()}`}
                highlight
              />
              <Row label="이익 KRW" value={`₩${profitKrw.toLocaleString()}`} color="green" />

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-3">{error}</div>
              )}

              <button
                onClick={submit}
                disabled={submitting || orderLines.length === 0}
                className="w-full py-3 mt-4 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium rounded-md flex items-center justify-center gap-1"
              >
                <TrendingUp className="w-4 h-4" />
                {submitting ? '생성 중…' : '주문서 생성 → 운영자 승인 요청'}
              </button>

              <p className="text-[10px] text-stone-500 mt-3">
                생성 시 status='draft'. 운영자 결제 승인 후 바이어에게 노출됩니다.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, highlight, color }: any) {
  const colorClass =
    color === 'green' ? 'text-green-700' :
    highlight ? 'text-brand-700 font-medium' :
    'text-stone-800';
  return (
    <div className="flex justify-between text-xs py-1">
      <span className="text-stone-600">{label}</span>
      <span className={colorClass}>{value}</span>
    </div>
  );
}

export default function MarginBuilderPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <MarginBuilderPageInner />
    </Suspense>
  );
}
