'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

// ─── 타입 정의 ───────────────────────────────────────────────
interface Product {
  id: string;
  product_code: string;
  name_ko: string;
  name_zh: string;
  name_en?: string;
  category: string;
  supplier_type: string;
  sell_price_cny: number;
  moq: number;
  lead_time_days: number;
  stock_qty: number;
  image_url: string;
  image_urls?: string[];
  is_featured: boolean;
  is_new: boolean;
  is_hot: boolean;
  cbm_per_box?: number;
  pcs_per_box?: number;
  pcs_per_carton?: number;
  weight_kg?: number;
  size_cm?: string;
  material_ko?: string;
  material_zh?: string;
  description_ko?: string;
  description_zh?: string;
  oem_available: boolean;
  odm_available: boolean;
  customizable: boolean;
  tags?: string[];
  ip_character_id?: string;
  ip_character_name_ko?: string;
  ip_character_name_zh?: string;
  ip_character_slug?: string;
  ip_color_primary?: string;
  category_name_ko?: string;
  category_name_zh?: string;
}

const CATEGORY_FILTERS = [
  { id: 'all', ko: '전체', zh: '全部' },
  { id: '인형/봉제', ko: '인형/봉제', zh: '毛绒玩具' },
  { id: '뽑기 굿즈', ko: '뽑기 굿즈', zh: '扭蛋商品' },
  { id: '가방고리/키링', ko: '가방고리/키링', zh: '包挂件/钥匙扣' },
  { id: '피규어', ko: '피규어', zh: '手办' },
  { id: '문구/팬시', ko: '문구/팬시', zh: '文具/精品' },
  { id: '보냉백/가방', ko: '보냉백/가방', zh: '保冷袋/包' },
];

const IP_FILTERS = [
  { id: 'all', ko: '전체 IP', zh: '全部IP' },
  { id: 'ppuchi-friends', ko: '뿌찌프랜즈', zh: '噗奇朋友', color: '#FF6B9D' },
  { id: 'duckle', ko: '덕클', zh: '鸭克', color: '#FFD93D' },
  { id: 'dinomon', ko: '디노몬', zh: '恐龙萌', color: '#6BCB77' },
];

const PAGE_SIZE = 24;

export default function CatalogPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as any;

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [inquirySent, setInquirySent] = useState<Set<string>>(new Set());

  // 인증 확인 (퍼블릭 접근 허용 - 로그인 없이도 카탈로그 조회 가능)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('kind')
          .eq('id', user.id)
          .single();
        if (profile) setUserRole(profile.kind);
      }
    })();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;

    // v_catalog_products 뷰 사용 (없으면 products 테이블 직접 사용)
    let query = supabase
      .from('products')
      .select(
        `id, product_code, name_ko, name_zh, category, supplier_type,
         sell_price_cny, moq, lead_time_days, stock_qty,
         image_url, is_featured, is_new, is_hot,
         cbm_per_box, pcs_per_box, weight_kg,
         oem_available, odm_available, customizable,
         size_cm, material_ko, material_zh,
         description_ko, description_zh, tags`,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order(sortBy === 'price_asc' ? 'sell_price_cny' : sortBy === 'price_desc' ? 'sell_price_cny' : 'created_at', {
        ascending: sortBy === 'price_asc'
      })
      .range(offset, offset + PAGE_SIZE - 1);

    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
    if (ipFilter !== 'all') {
      const { data: ipData } = await supabase.from('ip_characters').select('id').eq('slug', ipFilter).single();
      if (ipData) query = query.eq('ip_character_id', ipData.id);
    }
    if (search.trim()) {
      query = query.or(`name_ko.ilike.%${search}%,name_zh.ilike.%${search}%,product_code.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (!error) { setProducts(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }, [page, categoryFilter, ipFilter, search, sortBy]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleInquiry = async (product: Product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    await supabase.from('product_inquiries').insert({
      product_id: product.id,
      buyer_user_id: user.id,
      inquiry_type: 'catalog_inquiry',
      message_ko: `카탈로그에서 문의드립니다. 상품코드: ${product.product_code}`,
      message_zh: `从目录咨询。商品编号：${product.product_code}`,
      status: 'pending',
    });
    setInquirySent(prev => new Set([...prev, product.id]));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← {t('홈', '首页')}</Link>
              <h1 className="text-xl font-bold text-gray-900">
                {t('IP 상품 카탈로그', 'IP商品目录')}
              </h1>
              <span className="text-sm text-gray-500">
                {t(`총 ${total}개 상품`, `共 ${total} 件商品`)}
              </span>
            </div>
            {/* 검색 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                placeholder={t('상품명, 코드 검색...', '搜索商品名称、编号...')}
                className="border rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={() => { setSearch(searchInput); setPage(1); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
              >
                {t('검색', '搜索')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 사이드 필터 */}
          <aside className="w-52 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24">
              {/* 카테고리 필터 */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3">{t('카테고리', '分类')}</h3>
                <div className="space-y-1">
                  {CATEGORY_FILTERS.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoryFilter(cat.id); setPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        categoryFilter === cat.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t(cat.ko, cat.zh)}
                    </button>
                  ))}
                </div>
              </div>

              {/* IP 필터 */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3">{t('IP 캐릭터', 'IP角色')}</h3>
                <div className="space-y-1">
                  {IP_FILTERS.map(ip => (
                    <button
                      key={ip.id}
                      onClick={() => { setIpFilter(ip.id); setPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        ipFilter === ip.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {ip.color && (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ip.color }} />
                      )}
                      {t(ip.ko, ip.zh)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 정렬 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">{t('정렬', '排序')}</h3>
                <div className="space-y-1">
                  {[
                    { id: 'created_at', ko: '최신순', zh: '最新' },
                    { id: 'price_asc', ko: '가격 낮은순', zh: '价格低→高' },
                    { id: 'price_desc', ko: '가격 높은순', zh: '价格高→低' },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSortBy(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sortBy === s.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t(s.ko, s.zh)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* 상품 그리드 */}
          <main className="flex-1 min-w-0">
            {/* 뷰 모드 토글 */}
            <div className="flex items-center justify-end gap-2 mb-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100'}`}
                title={t('카드 뷰', '卡片视图')}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100'}`}
                title={t('목록 뷰', '列表视图')}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
              </button>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-lg">{t('조건에 맞는 상품이 없습니다', '没有符合条件的商品')}</p>
              </div>
            ) : (
              <>
                {viewMode === 'list' ? (
                  /* 목록 뷰 */
                  <div className="space-y-3">
                    {products.map(product => (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4 p-4"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="w-20 h-20 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <Image src={product.image_url} alt={t(product.name_ko, product.name_zh)} fill className="object-cover" sizes="80px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs text-gray-400">{product.product_code}</p>
                            {product.is_new && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                            {product.oem_available && <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">OEM</span>}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-800 truncate">{t(product.name_ko, product.name_zh)}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-base font-bold text-indigo-700">&yen;{product.sell_price_cny?.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">MOQ {product.moq}{t('개', '件')}</span>
                            {product.cbm_per_box && <span className="text-xs text-gray-400">CBM: {product.cbm_per_box}m³</span>}
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleInquiry(product); }}
                          className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${
                            inquirySent.has(product.id) ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {inquirySent.has(product.id) ? t('의뢰완료', '已提交') : t('진행하기', '开始')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 카드 뷰 */
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {/* 이미지 */}
                      <div className="aspect-square relative bg-gray-100 overflow-hidden">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={t(product.name_ko, product.name_zh)}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
                        )}
                        {/* 배지 */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {product.is_new && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">NEW</span>
                          )}
                          {product.is_hot && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">HOT</span>
                          )}
                          {product.is_featured && (
                            <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">⭐</span>
                          )}
                        </div>
                        {/* OEM/ODM 배지 */}
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          {product.oem_available && (
                            <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">OEM</span>
                          )}
                          {product.odm_available && (
                            <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">ODM</span>
                          )}
                        </div>
                      </div>

                      {/* 정보 */}
                      <div className="p-3">
                        <p className="text-xs text-gray-400 mb-0.5">{product.product_code}</p>
                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">
                          {t(product.name_ko, product.name_zh)}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-bold text-indigo-700">
                              ¥{product.sell_price_cny?.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">MOQ {product.moq}{t('개', '件')}</p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); handleInquiry(product); }}
                            className={`text-xs px-2 py-1.5 rounded-lg font-medium transition-colors ${
                              inquirySent.has(product.id)
                                ? 'bg-green-100 text-green-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {inquirySent.has(product.id) ? t('의뢰완료', '已提交') : t('진행하기', '开始')}
                          </button>
                        </div>
                        {/* CBM 정보 */}
                        {product.cbm_per_box && (
                          <p className="text-xs text-gray-400 mt-1">
                            CBM: {product.cbm_per_box}m³ / {product.pcs_per_box}{t('개', '件')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                      {t('이전', '上一页')}
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, page - 2);
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium ${
                            p === page ? 'bg-indigo-600 text-white' : 'border hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                      {t('다음', '下一页')}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <p className="text-xs text-gray-400">{selectedProduct.product_code}</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                  {t(selectedProduct.name_ko, selectedProduct.name_zh)}
                </h2>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-5">
              <div className="flex gap-5 flex-col sm:flex-row">
                {/* 이미지 */}
                <div className="w-full sm:w-56 flex-shrink-0">
                  <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-100">
                    {selectedProduct.image_url ? (
                      <Image src={selectedProduct.image_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">📦</div>
                    )}
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">{t('판매가', '售价')}</p>
                      <p className="font-bold text-indigo-700 text-lg">¥{selectedProduct.sell_price_cny?.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">MOQ</p>
                      <p className="font-bold text-gray-800 text-lg">{selectedProduct.moq}{t('개', '件')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">{t('리드타임', '交期')}</p>
                      <p className="font-semibold text-gray-800">{selectedProduct.lead_time_days}{t('일', '天')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">{t('재고', '库存')}</p>
                      <p className="font-semibold text-gray-800">{selectedProduct.stock_qty ?? 0}{t('개', '件')}</p>
                    </div>
                  </div>

                  {/* CBM 정보 */}
                  {selectedProduct.cbm_per_box && (
                    <div className="bg-blue-50 rounded-lg p-3 text-sm">
                      <p className="text-blue-700 font-semibold mb-1">📦 {t('박스 정보', '箱规信息')}</p>
                      <div className="grid grid-cols-2 gap-1 text-blue-600">
                        <span>CBM: {selectedProduct.cbm_per_box}m³</span>
                        {selectedProduct.pcs_per_box && <span>{t('박스당', '每箱')}: {selectedProduct.pcs_per_box}{t('개', '件')}</span>}
                        {selectedProduct.weight_kg && <span>{t('중량', '重量')}: {selectedProduct.weight_kg}kg</span>}
                        {selectedProduct.size_cm && <span>{t('사이즈', '尺寸')}: {selectedProduct.size_cm}</span>}
                      </div>
                    </div>
                  )}

                  {/* 소재 */}
                  {(selectedProduct.material_ko || selectedProduct.material_zh) && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{t('소재', '材质')}: </span>
                      {t(selectedProduct.material_ko || '', selectedProduct.material_zh || '')}
                    </div>
                  )}

                  {/* OEM/ODM */}
                  <div className="flex gap-2 flex-wrap">
                    {selectedProduct.oem_available && (
                      <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">OEM {t('가능', '可定制')}</span>
                    )}
                    {selectedProduct.odm_available && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-medium">ODM {t('가능', '可定制')}</span>
                    )}
                    {selectedProduct.customizable && (
                      <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">{t('커스텀 가능', '可定制')}</span>
                    )}
                  </div>

                  {/* 설명 */}
                  {(selectedProduct.description_ko || selectedProduct.description_zh) && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t(selectedProduct.description_ko || '', selectedProduct.description_zh || '')}
                    </p>
                  )}
                </div>
              </div>

              {/* 문의 버튼 */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => handleInquiry(selectedProduct)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    inquirySent.has(selectedProduct.id)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {inquirySent.has(selectedProduct.id)
                    ? t('✓ 의뢰 완료', '✓ 已提交')
                    : t('이 상품으로 진행하기', '用这个商品开始合作')}
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-5 py-3 rounded-xl border text-sm text-gray-600 hover:bg-gray-50"
                >
                  {t('닫기', '关闭')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
