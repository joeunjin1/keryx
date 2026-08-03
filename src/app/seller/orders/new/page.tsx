'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

interface Product {
  id: string;
  name_ko: string;
  name_zh: string;
  price_cny: number;
  sell_price_cny: number;
  moq: number;
  image_url: string | null;
  category: string | null;
  factory_id?: string;
  factory?: { id?: string; company_name: string; company_name_ko: string | null };
}

interface MatchedFactory {
  factory_id: string;
  factory_name: string;
  factory_name_zh: string | null;
}

const TIERED_STEPS = [
  { qty: 200,   label_ko: '200개~',    label_zh: '200件起' },
  { qty: 500,   label_ko: '500개~',    label_zh: '500件起' },
  { qty: 1000,  label_ko: '1,000개~', label_zh: '1,000件起' },
  { qty: 3000,  label_ko: '3,000개~', label_zh: '3,000件起' },
  { qty: 5000,  label_ko: '5,000개~', label_zh: '5,000件起' },
  { qty: 10000, label_ko: '10,000개+', label_zh: '10,000件+' },
];

function getUnitPrice(basePrice: number, qty: number): number {
  if (qty >= 10000) return basePrice * 0.82;
  if (qty >= 5000)  return basePrice * 0.85;
  if (qty >= 3000)  return basePrice * 0.88;
  if (qty >= 1000)  return basePrice * 0.92;
  if (qty >= 500)   return basePrice * 0.96;
  return basePrice;
}

export default function NewOrderPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams?.get('product_id');

  const supabase = createClient() as any;
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [matchedFactoryIds, setMatchedFactoryIds] = useState<string[]>([]);
  const [factoryNameMap, setFactoryNameMap] = useState<Record<string, string>>({});
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState<'select' | 'form' | 'done'>('select');
  const [hasMatchedFactories, setHasMatchedFactories] = useState(false);

  // 주문 폼
  const [qty, setQty] = useState(500);
  const [note, setNote] = useState('');
  const [packaging, setPackaging] = useState('');
  const [delivery, setDelivery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }

      // 1. 매칭 완료된 공장 목록 로드
      try {
        const res = await fetch('/api/matching/requests?my=true&status=completed');
        const json = await res.json();
        const requests = json.data || [];

        const factoryIds: string[] = [];
        const nameMap: Record<string, string> = {};

        requests.forEach((req: any) => {
          if (req.final_factory_id) {
            if (!factoryIds.includes(req.final_factory_id)) {
              factoryIds.push(req.final_factory_id);
              nameMap[req.final_factory_id] = req.final_factory_name || t('매칭 공장', '匹配工厂');
            }
          }
          if (Array.isArray(req.matched_factories)) {
            req.matched_factories.forEach((mf: MatchedFactory) => {
              if (mf.factory_id && !factoryIds.includes(mf.factory_id)) {
                factoryIds.push(mf.factory_id);
                nameMap[mf.factory_id] = lang === 'ko'
                  ? (mf.factory_name || t('공장', '工厂'))
                  : (mf.factory_name_zh || mf.factory_name || '工厂');
              }
            });
          }
        });

        setMatchedFactoryIds(factoryIds);
        setFactoryNameMap(nameMap);
        setHasMatchedFactories(factoryIds.length > 0);

        // 2. 매칭된 공장의 상품만 로드
        if (factoryIds.length > 0) {
          const allProducts: Product[] = [];
          for (const factoryId of factoryIds) {
            const pRes = await fetch(`/api/public/products?factory_id=${factoryId}&limit=50`);
            const pJson = await pRes.json();
            const prods: Product[] = pJson.products || pJson.data || [];
            allProducts.push(...prods);
          }
          setProducts(allProducts);

          // 미리 선택된 상품이 있으면 자동 선택
          if (preselectedProductId) {
            const found = allProducts.find(p => p.id === preselectedProductId);
            if (found) {
              setSelectedProduct(found);
              setQty(found.moq || 500);
              setStep('form');
            }
          }
        }
      } catch (e) {
        console.error('매칭 공장 로드 오류:', e);
      }

      setLoading(false);
    })();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesFactory = selectedFactoryId === 'all' || p.factory_id === selectedFactoryId;
    if (!matchesFactory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.name_ko || '').toLowerCase().includes(q) || (p.name_zh || '').toLowerCase().includes(q);
  });

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setQty(p.moq || 500);
    setStep('form');
  };

  const handleSubmitOrder = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      const basePrice = selectedProduct.sell_price_cny || selectedProduct.price_cny || 5;
      const unitPrice = getUnitPrice(basePrice, qty);
      const res = await fetch('/api/buyer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          qty,
          unit_price_cny: unitPrice,
          buyer_order_note: note || undefined,
          packaging_request: packaging || undefined,
          desired_delivery_date: delivery || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || t('주문 생성에 실패했습니다', '订单创建失败'));
        return;
      }
      setOrderId(json.order_id);
      setStep('done');
    } catch (e) {
      alert(t('오류가 발생했습니다', '发生错误'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('로딩 중...', '加载中...')}</p>
        </div>
      </div>
    );
  }

  // ── 완료 화면 ──
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('주문이 접수되었습니다!', '订单已提交！')}</h2>
          <p className="text-gray-500 text-sm mb-2">
            {t('관리자 검토 후 승인됩니다. 결제 안내는 담당 MD가 별도로 연락드립니다.', '管理员审核后批准。付款说明将由负责MD单独联系。')}
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
            <div className="text-sm font-semibold text-orange-700 mb-1">
              {t('📋 주문 상태 안내', '📋 订单状态说明')}
            </div>
            <ul className="text-xs text-orange-600 space-y-1">
              <li>• {t('주문승인전 → 관리자 승인 대기', '待审核 → 等待管理员批准')}</li>
              <li>• {t('승인 후 → 결제 링크/계좌 안내', '批准后 → 付款链接/账户通知')}</li>
              <li>• {t('결제 완료 → 생산 시작', '付款完成 → 开始生产')}</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Link href="/seller/orders" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors text-center">
              {t('주문 현황 보기', '查看订单状态')}
            </Link>
            <button
              onClick={() => { setStep('select'); setSelectedProduct(null); setNote(''); setPackaging(''); setDelivery(''); }}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              {t('추가 주문', '继续下单')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 주문 폼 ──
  if (step === 'form' && selectedProduct) {
    const basePrice = selectedProduct.sell_price_cny || selectedProduct.price_cny || 5;
    const unitPrice = getUnitPrice(basePrice, qty);
    const totalCny = unitPrice * qty;
    const factoryName = lang === 'ko'
      ? (selectedProduct.factory?.company_name_ko || selectedProduct.factory?.company_name || '')
      : (selectedProduct.factory?.company_name || '');

    return (
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => setStep('select')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">{t('🛒 주문서 작성', '🛒 填写订单')}</h1>
              <p className="text-xs text-gray-400">{t('결제는 관리자 승인 후 별도 안내됩니다', '付款将在管理员批准后单独通知')}</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* 선택된 상품 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 items-start">
            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
              {selectedProduct.image_url ? (
                <Image src={selectedProduct.image_url} alt="" fill style={{ objectFit: 'cover' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-sm leading-tight mb-1">
                {lang === 'ko' ? selectedProduct.name_ko : selectedProduct.name_zh}
              </div>
              {factoryName && (
                <div className="text-xs text-gray-400 mb-1">🏭 {factoryName}</div>
              )}
              <div className="text-orange-600 font-bold">
                ¥{basePrice.toFixed(2)} {t('/ 개', '/ 件')}
              </div>
            </div>
            <button onClick={() => setStep('select')} className="text-xs text-blue-500 hover:underline flex-shrink-0">
              {t('변경', '更换')}
            </button>
          </div>

          {/* 수량 선택 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="font-bold text-gray-800 mb-3">{t('주문 수량', '订单数量')}</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {TIERED_STEPS.map(s => (
                <button
                  key={s.qty}
                  onClick={() => setQty(s.qty)}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all ${qty === s.qty ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}
                >
                  {lang === 'ko' ? s.label_ko : s.label_zh}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <label className="text-sm text-gray-500 flex-shrink-0">{t('직접 입력:', '直接输入:')}</label>
              <input
                type="number"
                min={selectedProduct.moq || 200}
                step={100}
                value={qty}
                onChange={e => setQty(Math.max(selectedProduct.moq || 200, parseInt(e.target.value) || 0))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <span className="text-sm text-gray-400">{t('개', '件')}</span>
            </div>
            <div className="mt-3 bg-orange-50 rounded-xl p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('단가', '单价')}</span>
                <span className="font-bold text-orange-600">¥{unitPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">{t('수량', '数量')}</span>
                <span className="font-semibold">{qty.toLocaleString()}{t('개', '件')}</span>
              </div>
              <div className="border-t border-orange-200 mt-2 pt-2 flex justify-between">
                <span className="font-bold text-gray-700">{t('예상 합계', '预计总计')}</span>
                <span className="font-bold text-orange-600 text-lg">¥{totalCny.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 요청사항 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="font-bold text-gray-800">{t('주문 요청사항', '订单要求')}</div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('주문 메모 (선택)', '订单备注（选填）')}</label>
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t('색상, 디자인, 특별 요청사항 등을 입력해 주세요', '请输入颜色、设计、特殊要求等')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('패키지 요청 (선택)', '包装要求（选填）')}</label>
              <input
                type="text"
                value={packaging}
                onChange={e => setPackaging(e.target.value)}
                placeholder={t('예: OPP 개별 포장, 박스 인쇄 등', '例：OPP单独包装、纸箱印刷等')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('희망 납기일 (선택)', '希望交货日期（选填）')}</label>
              <input
                type="date"
                value={delivery}
                onChange={e => setDelivery(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* 결제 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="font-bold text-blue-700 mb-2 text-sm">💡 {t('결제 안내', '付款说明')}</div>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• {t('주문 후 관리자가 내용을 검토하고 승인합니다', '下单后管理员将审核并批准')}</li>
              <li>• {t('승인 완료 후 결제 링크 또는 계좌번호를 별도로 안내드립니다', '批准后将单独提供付款链接或账户')}</li>
              <li>• {t('지금 결제하지 않아도 됩니다', '现在无需付款')}</li>
            </ul>
          </div>

          {/* 주문 버튼 */}
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-60 shadow-lg"
          >
            {submitting ? t('주문 접수 중...', '提交中...') : `🛒 ${t('주문 접수하기', '提交订单')}`}
          </button>
        </div>
      </div>
    );
  }

  // ── 상품 선택 화면 ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/seller" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{t('🛒 주문하기', '🛒 立即下单')}</h1>
            <p className="text-xs text-gray-400">
              {hasMatchedFactories
                ? t('매칭된 공장 상품을 선택하세요', '请选择匹配工厂的商品')
                : t('매칭된 공장이 없습니다', '暂无匹配工厂')}
            </p>
          </div>
          {/* Shop 링크 */}
          <Link
            href="/shop"
            className="flex-shrink-0 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-200 transition-colors"
          >
            🛍️ {t('더 많은 상품 보기', '查看更多商品')}
          </Link>
        </div>
      </div>

      {/* 매칭공장 없는 경우 안내 */}
      {!hasMatchedFactories ? (
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-6xl mb-4">🏭</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              {t('아직 매칭된 공장이 없습니다', '暂无匹配工厂')}
            </h2>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
              {t('공장 매칭 신청 후 매칭이 완료되면 해당 공장의 상품을 주문할 수 있습니다.', '申请工厂匹配并完成匹配后，即可订购该工厂的商品。')}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/seller/matching"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-md"
              >
                🔗 {t('공장 매칭 신청하기', '申请工厂匹配')}
              </Link>
              <Link
                href="/shop"
                className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-all shadow-md"
              >
                🛍️ {t('Shop에서 상품 둘러보기', '在Shop浏览商品')}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-4">
          {/* 공장 필터 탭 */}
          {matchedFactoryIds.length > 1 && (
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-500 mb-2">{t('공장별 필터', '按工厂筛选')}</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedFactoryId('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedFactoryId === 'all' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300 bg-white'}`}
                >
                  {t('전체', '全部')} ({products.length})
                </button>
                {matchedFactoryIds.map(fid => {
                  const name = factoryNameMap[fid] || fid;
                  const count = products.filter(p => p.factory_id === fid).length;
                  return (
                    <button
                      key={fid}
                      onClick={() => setSelectedFactoryId(fid)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedFactoryId === fid ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300 bg-white'}`}
                    >
                      🏭 {name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 검색 */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('상품 검색...', '搜索商品...')}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>

          {/* 더 많은 상품 보기 배너 */}
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-purple-700">{t('더 많은 상품이 필요하신가요?', '需要更多商品？')}</div>
              <div className="text-xs text-purple-500">{t('Shop에서 전체 상품을 둘러보세요', '在Shop中浏览全部商品')}</div>
            </div>
            <Link
              href="/shop"
              className="flex-shrink-0 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
            >
              🛍️ Shop {t('바로가기', '前往')}
            </Link>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📦</div>
              <p>{t('상품이 없습니다', '暂无商品')}</p>
              <p className="text-xs mt-1">{t('공장에 등록된 상품이 없거나 검색 결과가 없습니다', '工厂暂无注册商品或无搜索结果')}</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {t(`총 ${filteredProducts.length}개 상품`, `共 ${filteredProducts.length} 件商品`)}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map(p => {
                  const price = p.sell_price_cny || p.price_cny || 0;
                  const name = lang === 'ko' ? p.name_ko : p.name_zh;
                  const factoryName = factoryNameMap[p.factory_id || '']
                    || (lang === 'ko' ? p.factory?.company_name_ko : p.factory?.company_name)
                    || p.factory?.company_name
                    || '';
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden text-left hover:border-orange-300 hover:shadow-md transition-all active:scale-95"
                    >
                      <div className="relative w-full aspect-square bg-gray-100">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={name} fill style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">{name}</div>
                        {factoryName && (
                          <div className="text-xs text-purple-500 mb-1">🏭 {factoryName}</div>
                        )}
                        <div className="text-orange-600 font-bold text-sm">¥{price.toFixed(2)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">MOQ {p.moq || 200}{t('개', '件')}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
