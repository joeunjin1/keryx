'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

interface MatchedFactory {
  factory_id: string;
  factory_name: string;
  factory_name_zh: string | null;
  status: string;
  match_score: number | null;
  note: string | null;
  recommended_at: string | null;
}

interface MatchingRequest {
  id: string;
  company_name: string;
  product_desc: string;
  status: string;
  matched_factories: MatchedFactory[];
  final_factory_id: string | null;
  final_factory_name: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name_ko: string;
  name_zh: string;
  price_cny: number;
  sell_price_cny: number;
  moq: number;
  image_url: string | null;
  category: string | null;
  factory_id: string;
  factory?: {
    id: string;
    company_name: string;
    company_name_ko: string | null;
  };
}

export default function MatchedFactoriesPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [matchedRequests, setMatchedRequests] = useState<MatchingRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 매칭된 공장 ID 목록
  const matchedFactoryIds: string[] = [];
  const factoryNameMap: Record<string, string> = {};

  matchedRequests.forEach(req => {
    // final_factory_id가 있으면 추가
    if (req.final_factory_id) {
      if (!matchedFactoryIds.includes(req.final_factory_id)) {
        matchedFactoryIds.push(req.final_factory_id);
        factoryNameMap[req.final_factory_id] = req.final_factory_name || '매칭 공장';
      }
    }
    // matched_factories 배열에서도 추가
    if (Array.isArray(req.matched_factories)) {
      req.matched_factories.forEach(mf => {
        if (mf.factory_id && !matchedFactoryIds.includes(mf.factory_id)) {
          matchedFactoryIds.push(mf.factory_id);
          factoryNameMap[mf.factory_id] = lang === 'ko'
            ? (mf.factory_name || '공장')
            : (mf.factory_name_zh || mf.factory_name || '工厂');
        }
      });
    }
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }

      // 매칭 완료된 요청 로드
      try {
        const res = await fetch('/api/matching/requests?my=true&status=completed');
        const json = await res.json();
        setMatchedRequests(json.data || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  // 매칭된 공장 ID가 변경되면 상품 로드
  useEffect(() => {
    if (matchedFactoryIds.length === 0) return;
    loadProducts();
  }, [matchedRequests]);

  const loadProducts = async () => {
    if (matchedFactoryIds.length === 0) {
      setProducts([]);
      return;
    }
    try {
      // 각 공장의 상품 로드
      const allProducts: Product[] = [];
      for (const factoryId of matchedFactoryIds) {
        const res = await fetch(`/api/public/products?factory_id=${factoryId}&limit=50`);
        const json = await res.json();
        const prods: Product[] = json.products || json.data || [];
        allProducts.push(...prods);
      }
      setProducts(allProducts);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesFactory = selectedFactoryId === 'all' || p.factory_id === selectedFactoryId;
    if (!matchesFactory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.name_ko || '').toLowerCase().includes(q) || (p.name_zh || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('로딩 중...', '加载中...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/seller" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">{t('🏭 나의 매칭 공장', '🏭 我的匹配工厂')}</h1>
            <p className="text-xs text-gray-400">
              {matchedFactoryIds.length > 0
                ? t(`${matchedFactoryIds.length}개 공장 매칭됨`, `已匹配 ${matchedFactoryIds.length} 个工厂`)
                : t('아직 매칭된 공장이 없습니다', '暂无匹配工厂')}
            </p>
          </div>
          <Link
            href="/seller/matching"
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            {t('매칭 신청', '申请匹配')}
          </Link>
        </div>
      </div>

      {matchedFactoryIds.length === 0 ? (
        /* 매칭된 공장 없음 */
        <div className="max-w-5xl mx-auto p-6">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏭</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              {t('아직 매칭된 공장이 없습니다', '暂无匹配工厂')}
            </h2>
            <p className="text-gray-500 mb-6 text-sm">
              {t('공장 매칭을 신청하면 최적의 공장을 찾아드립니다', '申请工厂匹配，我们将为您找到最佳工厂')}
            </p>
            <Link
              href="/seller/matching"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-base hover:opacity-90 transition-all shadow-lg"
            >
              🔗 {t('공장 매칭 신청하기', '申请工厂匹配')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto p-4">
          {/* 매칭된 공장 목록 */}
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-600 mb-2">{t('매칭된 공장', '匹配工厂')}</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedFactoryId('all')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedFactoryId === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300 bg-white'}`}
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
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedFactoryId === fid ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300 bg-white'}`}
                  >
                    🏭 {name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 검색 */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('상품 검색...', '搜索商品...')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            />
          </div>

          {/* 상품 목록 */}
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
                  const factoryName = factoryNameMap[p.factory_id]
                    || (lang === 'ko' ? p.factory?.company_name_ko : p.factory?.company_name)
                    || p.factory?.company_name
                    || '';
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-purple-300 hover:shadow-md transition-all"
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
                        <Link
                          href={`/seller/orders/new?product_id=${p.id}`}
                          className="mt-2 block w-full py-2 bg-orange-500 text-white rounded-xl text-xs font-bold text-center hover:bg-orange-600 transition-colors"
                        >
                          🛒 {t('주문하기', '下单')}
                        </Link>
                      </div>
                    </div>
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
