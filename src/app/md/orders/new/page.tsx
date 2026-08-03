'use client';

import Image from 'next/image';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn, formatCurrency } from '@/lib/utils';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface Product {
  id: string;
  sku: string;
  name_ko: string | null;
  name_zh: string;
  moq: number;
  factory: { factory_code: string; company_name: string } | null;
  pricing: Array<{ min_qty: number; unit_price_cny: number }>;
  images: Array<{ url: string }>;
}

interface OrderLine {
  product_id: string;
  product: Product;
  qty: number;
  unit_price_cny: number;
  subtotal_cny: number;
}

function NewOrderPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sellerIdParam = params.get('sellerId');
  const supabase = createClient();

  const [seller, setSeller] = useState<any>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

  const [packagingType, setPackagingType] = useState<'factory_standard' | 'keryx_designer'>('factory_standard');
  const [paymentRoute, setPaymentRoute] = useState<'gaza_krw' | 'direct_usd' | 'direct_cny'>('gaza_krw');
  const [sellerInspectionNotes, setSellerInspectionNotes] = useState('');
  const [packagingNotes, setPackagingNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '신규 주문 등록 | KERYX';
  }, []);

    if (!sellerIdParam) {
      router.push('/md');
      return;
    }
    (async () => {
      // Load seller + recommendations
      const { data: s } = await supabase
        .from('sellers')
        .select('id, business_name, current_grade, total_balance_paid_cny, country, payment_route')
        .eq('id', sellerIdParam)
        .single();
      setSeller(s);

      const { data: recs } = await supabase
        .from('recommendations')
        .select(
          `id, product:products(
            id, sku, name_ko, name_zh, moq,
            factory:factories(factory_code, company_name),
            pricing:product_pricing_tiers(min_qty, unit_price_cny),
            images:product_images(url)
          )`
        )
        .eq('seller_id', sellerIdParam)
        .in('status', ['visible', 'clicked', 'in_cart'])
        .order('display_order');

      const products = (recs ?? [])
        .map((r: any) => r.product)
        .filter(Boolean) as Product[];
      setRecommendedProducts(products);
      setLoading(false);
    })();
  }, [sellerIdParam, router, supabase]);

  function addProduct(p: Product) {
    if (orderLines.some((l) => l.product_id === p.id)) return;
    const initialQty = p.moq;
    const unit = pickPriceForQty(p.pricing, initialQty);
    setOrderLines((cur) => [
      ...cur,
      {
        product_id: p.id,
        product: p,
        qty: initialQty,
        unit_price_cny: unit,
        subtotal_cny: initialQty * unit,
      },
    ]);
  }

  function removeLine(productId: string) {
    setOrderLines((cur) => cur.filter((l) => l.product_id !== productId));
  }

  function updateQty(productId: string, qty: number) {
    setOrderLines((cur) =>
      cur.map((l) => {
        if (l.product_id !== productId) return l;
        const unit = pickPriceForQty(l.product.pricing, qty);
        return { ...l, qty, unit_price_cny: unit, subtotal_cny: qty * unit };
      })
    );
  }

  // Calculations
  const subtotal = orderLines.reduce((s, l) => s + l.subtotal_cny, 0);
  const isVip = seller?.current_grade === 'vip';
  const vipDiscountPct = calcVipDiscountPct(seller);
  const vipDiscount = Math.round(subtotal * (vipDiscountPct / 100));
  const estInspectionMinutes = orderLines.reduce(
    (s, l) => s + Math.ceil((l.qty / 100) * 30), 0  // simplified ~30min/100
  );
  const inspectionFee = Math.round((estInspectionMinutes / 60) * 30);
  const total = subtotal + inspectionFee - vipDiscount;
  const deposit = Math.round(total * 0.3);
  const balance = total - deposit;

  async function handleSubmit() {
    if (orderLines.length === 0) {
      setError('제품을 1개 이상 추가해주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: sellerIdParam,
        items: orderLines.map((l) => ({
          product_id: l.product_id,
          factory_id: (l.product.factory as any)?.factory_code,  // resolved server-side
          qty: l.qty,
          unit_price_cny: l.unit_price_cny,
          subtotal_cny: l.subtotal_cny,
        })),
        packaging_type: packagingType,
        packaging_notes: packagingNotes || null,
        seller_inspection_notes: sellerInspectionNotes || null,
        payment_route: paymentRoute,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? '주문 생성 실패');
      return;
    }

    const { order } = await res.json();
    router.push(`/md/orders/${order.id}`);
  }

  if (loading) {
    return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  }

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-4">

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">제품 추가 — 추천 큐에서 선택</div>
              <span className="text-[11px] text-stone-500">{recommendedProducts.length}개 추천 제품</span>
            </div>

            {recommendedProducts.length === 0 ? (
              <div className="text-xs text-stone-400 text-center py-6">
                이 바이어에게 추천된 제품이 없습니다. MD 워크룸에서 먼저 추천을 등록하세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recommendedProducts.map((p) => {
                  const added = orderLines.some((l) => l.product_id === p.id);
                  const lowPrice = p.pricing?.[0]?.unit_price_cny;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      disabled={added}
                      className={cn(
                        'text-left p-2 rounded-md transition',
                        added
                          ? 'bg-brand-50 border border-brand-400 opacity-60 cursor-not-allowed'
                          : 'bg-stone-50 hover:bg-stone-100 border border-transparent'
                      )}
                    >
                      <div className="aspect-square bg-stone-200 rounded mb-1.5 overflow-hidden">
                        {p.images?.[0]?.url && (
                          <Image src={p.images[0].url} alt="" width={200} height={200} className="object-cover" />
                        )}
                      </div>
                      <div className="text-[11px] line-clamp-2">{p.name_ko ?? p.name_zh}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        {p.factory?.factory_code} · MOQ {p.moq}
                      </div>
                      {lowPrice && (
                        <div className="text-[10px] text-stone-700 font-medium">
                          ¥{lowPrice}부터
                        </div>
                      )}
                      {added && (
                        <Badge variant="brand" size="xs" className="mt-1">담김</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>


        {orderLines.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">제품 · 수량</div>
              <div className="space-y-2">
                {orderLines.map((line) => (
                  <OrderLineRow
                    key={line.product_id}
                    line={line}
                    onQtyChange={(q) => updateQty(line.product_id, q)}
                    onRemove={() => removeLine(line.product_id)}
                  />
                ))}
              </div>
            </CardBody>
          </Card>
        )}


        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">포장 디자인</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PackagingOption
                checked={packagingType === 'factory_standard'}
                onChange={() => setPackagingType('factory_standard')}
                title="공장 표준 포장"
                desc="OPP 봉투 + 헤더카드 (공장 기본)"
                note="단가에 포함 · 추가 비용 없음"
              />
              <PackagingOption
                checked={packagingType === 'keryx_designer'}
                onChange={() => setPackagingType('keryx_designer')}
                title="KERYX 디자이너 매칭"
                desc="한국 그래픽 디자이너에게 맞춤 의뢰"
                note="디자인비 + 포장 가산 · 별도 견적"
              />
            </div>
            {packagingType === 'keryx_designer' && (
              <textarea
                value={packagingNotes}
                onChange={(e) => setPackagingNotes(e.target.value)}
                placeholder="포장 컨셉·문구·로고 위치 등 — 디자이너에게 전달"
                rows={2}
                className="mt-3 w-full text-xs border border-stone-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 resize-none"
              />
            )}
          </CardBody>
        </Card>


        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-2">바이어 추가 검수 요청 (선택)</div>
            <textarea
              value={sellerInspectionNotes}
              onChange={(e) => setSellerInspectionNotes(e.target.value)}
              placeholder="예: 인쇄 색상 까다로움 — 색상 매칭 강화 요청 / 키링 고리 강도 추가 검사"
              rows={2}
              className="w-full text-xs border border-stone-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 resize-none"
            />
            <p className="mt-2 text-[10px] text-stone-500">
              사소한 요청은 단가 변경 없음 · 난이도 높은 요구는 공장 응답 후 가격 수정 가능
            </p>
          </CardBody>
        </Card>


        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">결제 요약</div>
            <div className="space-y-1.5 text-xs">
              <Row label="제품 소계" value={`¥${subtotal.toLocaleString()}`} />
              <Row label="포장" value={packagingType === 'factory_standard' ? '포함' : '별도'} muted />
              <Row
                label={`예상 검수비 (${Math.ceil(estInspectionMinutes / 60)}시간 × ¥30)`}
                value={`¥${inspectionFee.toLocaleString()}`}
                muted
              />
              {isVip && (
                <Row
                  label={`VIP 수수료 할인 (-${vipDiscountPct}%)`}
                  value={`-¥${vipDiscount.toLocaleString()}`}
                  positive
                />
              )}
              <div className="pt-2 border-t border-stone-200">
                <Row label="총액 (CNY)" value={`¥${total.toLocaleString()}`} bold />
              </div>
              <Row label="선금 30% (즉시)" value={`¥${deposit.toLocaleString()}`} muted />
              <Row label="잔금 70% (검수 후)" value={`¥${balance.toLocaleString()}`} muted />
            </div>
          </CardBody>
        </Card>


        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">결제·통관 옵션</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PackagingOption
                checked={paymentRoute === 'gaza_krw'}
                onChange={() => setPaymentRoute('gaza_krw')}
                title="가자트레이드 KRW 통관"
                desc="관부과세 포함 · 한국 도매 매입"
              />
              <PackagingOption
                checked={paymentRoute === 'direct_usd'}
                onChange={() => setPaymentRoute('direct_usd')}
                title="USD 직접 송금"
                desc="통관·운송 바이어(고객) 처리"
              />
            </div>
          </CardBody>
        </Card>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
        )}

        <div className="flex gap-2 sticky bottom-0 bg-stone-50 pt-3 pb-2">
          <Link
            href={`/md/seller/${sellerIdParam}`}
            className="px-4 py-2.5 text-xs bg-white border border-stone-200 rounded-md"
          >
            취소
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting || orderLines.length === 0}
            className="flex-1 px-4 py-2.5 text-xs bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-md font-medium transition"
          >
            {submitting ? '저장 중…' : '주문 확정 · 운영자 승인 요청'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function NewOrderPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <NewOrderPageInner />
    </Suspense>
  );
}

function OrderLineRow({
  line,
  onQtyChange,
  onRemove,
}: {
  line: OrderLine;
  onQtyChange: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-3 items-start bg-stone-50 rounded-md p-2.5">
      <div className="w-12 h-12 bg-stone-200 rounded shrink-0 overflow-hidden">
        {line.product.images?.[0]?.url && (
          <Image src={line.product.images[0].url} alt="" width={200} height={200} className="object-cover" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium">{line.product.name_ko ?? line.product.name_zh}</div>
        <div className="text-[10px] text-stone-500">
          {line.product.factory?.factory_code} · MOQ {line.product.moq.toLocaleString()}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
          <div>
            <label className="text-[10px] text-stone-500"><LangText ko="수량" zh="数量" /></label>
            <input
              type="number"
              value={line.qty}
              min={line.product.moq}
              step={100}
              onChange={(e) => onQtyChange(Math.max(line.product.moq, parseInt(e.target.value) || line.product.moq))}
              className="w-full h-7 px-2 text-xs border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-600/30"
            />
            <div className={cn(
              'text-[9px] mt-0.5',
              line.qty >= line.product.moq ? 'text-green-700' : 'text-red-600'
            )}>
              {line.qty >= line.product.moq ? 'MOQ 충족' : 'MOQ 부족'}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-stone-500">단가</label>
            <div className="h-7 flex items-center text-xs">¥{line.unit_price_cny}</div>
          </div>
          <div>
            <label className="text-[10px] text-stone-500">소계</label>
            <div className="h-7 flex items-center text-xs font-medium">¥{line.subtotal_cny.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-stone-400 hover:text-red-600 p-1"
        aria-label="제거"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function PackagingOption({
  checked,
  onChange,
  title,
  desc,
  note,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  desc: string;
  note?: string;
}) {
  return (
    <label
      onClick={onChange}
      className={cn(
        'block px-3 py-2.5 rounded-md cursor-pointer transition',
        checked
          ? 'border-2 border-brand-600 bg-brand-50'
          : 'border border-stone-200 hover:border-stone-300'
      )}
    >
      <div className="flex items-start gap-2">
        <input type="radio" checked={checked} onChange={() => {}} className="mt-0.5" />
        <div>
          <div className={cn('text-xs font-medium', checked ? 'text-brand-800' : '')}>{title}</div>
          <div className={cn('text-[11px] mt-0.5', checked ? 'text-brand-600' : 'text-stone-500')}>
            {desc}
          </div>
          {note && (
            <div className={cn('text-[10px] mt-0.5', checked ? 'text-brand-800' : 'text-stone-500')}>
              {note}
            </div>
          )}
        </div>
      </div>
    </label>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
  positive,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  positive?: boolean;
}) {
  return (
    <div className={cn('flex justify-between', bold && 'font-medium')}>
      <span className={muted ? 'text-stone-500' : ''}>{label}</span>
      <span className={positive ? 'text-green-700' : ''}>{value}</span>
    </div>
  );
}

function pickPriceForQty(tiers: Array<{ min_qty: number; unit_price_cny: number }>, qty: number): number {
  if (!tiers || tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);
  for (const t of sorted) if (qty >= t.min_qty) return t.unit_price_cny;
  return sorted[sorted.length - 1].unit_price_cny;
}

function calcVipDiscountPct(seller: any): number {
  if (!seller || seller.current_grade !== 'vip') return 0;
  const total = seller.total_balance_paid_cny ?? 0;
  if (total >= 2000000) return 10;
  if (total >= 1000000) return 8;
  if (total >= 500000) return 7;
  return 5;
}
