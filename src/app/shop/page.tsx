"use client";
/**
 * /shop — KERYX B2B 쇼핑몰 페이지 (쿠팡 수준 대형 쇼핑몰 리디자인)
 * [solution-architecture-foundation 스킬] 준수
 * [mobile-first-design 스킬] 준수
 * 모든 데이터는 Supabase DB에서 실시간 조회
 */
import Image from 'next/image';
import { createPortal } from 'react-dom';
import FactoryMatchingModal from '@/components/matching/FactoryMatchingModal';
import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarginCalculator from '@/components/ui/MarginCalculator';
import dynamic from 'next/dynamic';
import type { FilterState } from '@/components/shop/AdvancedFilter';
import { DEFAULT_FILTERS } from '@/components/shop/AdvancedFilter';

const AdvancedFilter = dynamic(() => import('@/components/shop/AdvancedFilter'), {
  ssr: false,
  loading: () => <div className="h-10 bg-neutral-100 animate-pulse rounded-lg" />,
});

/* ── 다국어 ── */
const T = {
  ko: {
    brand: 'KERYX',
    tagline: '중국 공장 직접 매칭 B2B 플랫폼',
    search_placeholder: '제품명, 카테고리, 브랜드 검색...',
    search_btn: '검색',
    login: '로그인',
    signup: '회원가입',
    dashboard: '내 대시보드',
    all_cat: '전체',
    products_title: '공장 직공 제품',
    products_sub: '검증된 중국 공장의 최신 제품을 탐색하세요',
    moq: 'MOQ',
    lead: '리드타임',
    days: '일',
    inquiry: '문의하기',
    order: '주문하기',
    no_products: '등록된 제품이 없습니다',
    no_products_sub: '공장들이 제품을 등록하면 여기에 표시됩니다',
    loading: '제품을 불러오는 중...',
    hero_title: '중국 공장과 직접 거래하세요',
    hero_sub: '검증된 공장 · 실시간 재고 · 전담 MD · 품질 보장',
    hero_cta: '지금 시작하기',
    hero_cta2: '공장 매칭 신청',
    stats_factories: '등록 공장',
    stats_sellers: '활성 바이어',
    stats_products: '등록 제품',
    filter_all: '전체 제품',
    sort_new: '최신순',
    sort_moq: 'MOQ 낮은순',
    sort_price: '가격 낮은순',
    sort_featured: '추천순',
    login_required: '주문하려면 로그인이 필요합니다',
    login_to_order: '로그인 후 주문',
    banner_title: '공장 매칭 서비스',
    banner_sub: '원하는 제품을 알려주시면 최적의 중국 공장을 찾아드립니다',
    banner_cta: '무료 매칭 신청',
    membership_title: '정기 멤버십으로 더 많은 혜택을',
    membership_sub: '시장조사 · 공장 매칭 · 우선 처리',
    membership_cta: '멤버십 보기',
    footer_company: '중국 이우 센캉 일용품 유한공사 | 한국 통관·물류: 가자트레이드',
    lang: '中文',
    categories_title: '카테고리',
    guest_title: '처음 방문하셨나요? KERYX가 소싱을 도와드립니다!',
    guest_sub: '검증된 중국 공장과 직접 거래하세요. 지금 무료로 시작하세요.',
    guest_support: '고객센터',
    guest_signup: '무료 가입 →',
    help_q: '궁금하신 점이 있으신가요?',
    help_sub: '공장 매칭, 시장조사, 멤버십 등 친절하게 안내해 드립니다.',
    help_faq: 'FAQ',
    help_cs: '고객센터 →',
    tab_match: '공장 매칭',
    tab_membership: '멤버십',
    tab_research: '시장조사 의뢰',
    login_required_research: '시장조사 의뢰는 로그인 후 이용 가능합니다',
    login_required_match: '공장 매칭 신청은 로그인 후 이용 가능합니다',
    featured_section: '⭐ 추천 상품',
    new_section: '🆕 신상품',
    hot_section: '인기 상품',
    all_products: '전체 상품',
    cbm: 'CBM',
    pcs_per_box: '박스입수',
    stock: '재고',
    customizable: '커스텀 가능',
    oem: 'OEM',
    odm: 'ODM',
    sample: '샘플 가능',
    supplier_filter: '공급상 구분',
    price_range: '가격대',
    moq_filter: 'MOQ 필터',
    view_detail: '상세보기',
    prev: '이전',
    next: '다음',
    page: '페이지',
    total_products: '총',
    showing: '표시 중',
    items: '개',
    welcome_msg: '저희 솔루션의 방문을 진심으로 환영합니다. 이 서비스는 고객님이 필요로 하는 상품과 서비스에 맞는 공장들을 매칭해드리고 해당공장에서 직접 상품을 등록 보여주게 하는 서비스입니다. VIP 고객님께 제공해드리는 서비스이며 회원가입 후 시장조사 및 공장매칭 서비스를 제공해 드립니다.',
    welcome_close: '확인',
    services_link: '서비스 소개',
    internal: '내부 직원',
  },
  zh: {
    brand: 'KERYX',
    tagline: '中国工厂直接匹配B2B平台',
    search_placeholder: '搜索产品名称、类别、品牌...',
    search_btn: '搜索',
    login: '登录',
    signup: '注册',
    dashboard: '我的控制台',
    all_cat: '全部',
    products_title: '工厂直供产品',
    products_sub: '探索经过认证的中国工厂最新产品',
    moq: 'MOQ',
    lead: '交货期',
    days: '天',
    inquiry: '询价',
    order: '下单',
    no_products: '暂无产品',
    no_products_sub: '工厂注册产品后将显示在这里',
    loading: '正在加载产品...',
    hero_title: '与中国工厂直接交易',
    hero_sub: '认证工厂 · 实时库存 · 专属MD · 质量保障',
    hero_cta: '立即开始',
    hero_cta2: '申请工厂匹配',
    stats_factories: '注册工厂',
    stats_sellers: '活跃买家',
    stats_products: '注册产品',
    filter_all: '全部产品',
    sort_new: '最新',
    sort_moq: 'MOQ最低',
    sort_price: '价格最低',
    sort_featured: '推荐',
    login_required: '下单需要登录',
    login_to_order: '登录后下单',
    banner_title: '工厂匹配服务',
    banner_sub: '告诉我们您需要的产品，我们为您匹配最优质的中国工厂',
    banner_cta: '免费申请匹配',
    membership_title: '定期会员享更多优惠',
    membership_sub: '市场调研 · 工厂匹配 · 优先处理',
    membership_cta: '查看会员',
    footer_company: '中国义乌森康日用品有限公司 | 韩国清关物流：가자트레이드',
    lang: '한국어',
    categories_title: '分类',
    guest_title: '第一次来访？KERYX将帮助您采购！',
    guest_sub: '直接与认证中国工厂交易，立即免费开始。',
    guest_support: '客服中心',
    guest_signup: '免费注册 →',
    help_q: '有任何疑问吗？',
    help_sub: '工厂匹配、市场调研、会员等，我们将为您提供贴心解答。',
    help_faq: '常见问题',
    help_cs: '客服中心 →',
    tab_match: '工厂匹配',
    tab_membership: '会员',
    tab_research: '市场调研',
    login_required_research: '市场调研申请需要登录',
    login_required_match: '工厂匹配申请需要登录',
    featured_section: '⭐ 推荐商品',
    new_section: '🆕 新品',
    hot_section: '热销商品',
    all_products: '全部商品',
    cbm: 'CBM',
    pcs_per_box: '箱入数',
    stock: '库存',
    customizable: '可定制',
    oem: 'OEM',
    odm: 'ODM',
    sample: '可打样',
    supplier_filter: '供应商类型',
    price_range: '价格区间',
    moq_filter: 'MOQ筛选',
    view_detail: '查看详情',
    prev: '上一页',
    next: '下一页',
    page: '页',
    total_products: '共',
    showing: '显示',
    items: '件',
    welcome_msg: '欢迎来到KERYX！本服务为您匹配所需产品的中国工厂，并让工厂直接展示商品。这是为VIP客户提供的服务，注册后可享受一次免费市场调研及工厂匹配服务。',
    welcome_close: '确认',
    services_link: '服务介绍',
    internal: '内部员工',
  },
};

const FALLBACK_CATEGORIES = [
  { id: 'toys', name_ko: '완구·굿즈', name_zh: '玩具·周边', icon: '🎮' },
  { id: 'plush', name_ko: '인형·봉제', name_zh: '玩偶·毛绒', icon: '🧸' },
  { id: 'keychains', name_ko: '키링·액세서리', name_zh: '钥匙扣·配件', icon: '🔑' },
  { id: 'bags', name_ko: '가방·파우치', name_zh: '包袋·手包', icon: '👜' },
  { id: 'stationery', name_ko: '문구·팬시', name_zh: '文具·精品', icon: '📓' },
  { id: 'homeware', name_ko: '생활용품', name_zh: '生活用品', icon: '🏠' },
  { id: 'beauty', name_ko: '뷰티·잡화', name_zh: '美妆·杂货', icon: '💄' },
  { id: 'seasonal', name_ko: '시즌·이벤트', name_zh: '季节·活动', icon: '🎉' },
];

const SUPPLIER_TYPES = [
  { id: 'all', ko: '전체', zh: '全部' },
  { id: 'IP독점상품개발가능', ko: 'IP독점', zh: 'IP独家' },
  { id: 'IP일부독점개발가능', ko: 'IP일부', zh: 'IP部分' },
  { id: 'IP디자인요청가능', ko: 'IP디자인', zh: 'IP设计' },
  { id: 'IP단순구매만가능', ko: 'IP구매', zh: 'IP普通' },
  { id: 'PB봉제중대형', ko: 'PB대형', zh: 'PB大型' },
  { id: 'PB봉제중소형', ko: 'PB소형', zh: 'PB小型' },
  { id: 'PB기타', ko: 'PB기타', zh: 'PB其他' },
];

const HERO_BANNERS = [
  {
    id: 1,
    bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
    titleKo: '중국 공장과 직접 거래하세요',
    titleZh: '与中国工厂直接交易',
    subKo: '검증된 공장 · 실시간 재고 · 전담 MD · 품질 보장',
    subZh: '认证工厂 · 实时库存 · 专属MD · 质量保障',
    ctaKo: '공장 매칭 신청',
    ctaZh: '申请工厂匹配',
    ctaAction: 'match',
    emoji: '🏭',
  },
  {
    id: 2,
    bg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
    titleKo: '이번 주 HOT 상품',
    titleZh: '本周热销商品',
    subKo: '지금 가장 많이 찾는 인기 제품을 확인하세요',
    subZh: '查看现在最受欢迎的热销产品',
    ctaKo: '인기 상품 보기',
    ctaZh: '查看热销商品',
    ctaAction: 'hot',
    emoji: '🔥',
  },
];

const CARD_COLORS = ['#667eea', '#f59e0b', '#10b981', '#e11d48', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6'];
const CARD_EMOJIS = ['📦', '🎁', '🧸', '🔑', '👜', '🎮', '💄', '🏠'];
const PAGE_SIZE = 24;

/* ── 스켈레톤 카드 ── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
      <div className="w-full aspect-[4/3] bg-neutral-100 animate-pulse" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3 w-2/5 bg-neutral-100 animate-pulse rounded-full" />
        <div className="h-4 w-4/5 bg-neutral-100 animate-pulse rounded-full" />
        <div className="h-3 w-3/5 bg-neutral-100 animate-pulse rounded-full" />
        <div className="h-5 w-2/5 bg-neutral-100 animate-pulse rounded-full" />
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-neutral-100 animate-pulse rounded-xl" />
          <div className="flex-1 h-8 bg-neutral-100 animate-pulse rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ── 상품 카드 ── */
function ProductCard({
  product, index, lang, isLoggedIn, onInquiry,
}: {
  product: any; index: number; lang: 'ko' | 'zh'; isLoggedIn: boolean; onInquiry: (p: any) => void;
}) {
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const emoji = CARD_EMOJIS[index % CARD_EMOJIS.length];
  const name = lang === 'zh' && product.name_zh ? product.name_zh : product.name_ko || '제품명 없음';
  const price = product.sell_price_cny || product.price_cny;
  const cbm = product.cbm_per_box ? parseFloat(product.cbm_per_box).toFixed(4) : null;
  const factoryName = lang === 'zh'
    ? (product.factory?.company_name || product.factory?.company_name_ko || '')
    : (product.factory?.company_name_ko || product.factory?.company_name || '');
  const shortDesc = lang === 'zh' ? product.short_desc_zh : product.short_desc_ko;

  return (
    <Link href={`/products/${product.id}`} className="no-underline group">
      <div className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col h-full">
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-50">
          {product.image_url || product.image_urls?.[0] ? (
            <Image
              src={product.image_url || product.image_urls[0]}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: `${color}18` }}>
              {emoji}
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.is_featured && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">⭐ 추천</span>
            )}
            {product.is_new && (
              <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">NEW</span>
            )}
            {product.is_hot && (
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">HOT</span>
            )}
          </div>
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            {product.customizable && (
              <span className="bg-purple-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">커스텀</span>
            )}
            {product.oem_available && (
              <span className="bg-indigo-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">OEM</span>
            )}
            {product.sample_available && (
              <span className="bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">샘플</span>
            )}
          </div>
          {product.stock_qty === 0 && product.stock_qty !== null && (
            <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-3">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 text-center shadow-lg">
                <div className="text-[10px] font-black text-indigo-700">
                  {lang === 'zh' ? '🏭 可定制生产' : '🏭 주문제작 가능'}
                </div>
                {product.lead_time_days && (
                  <div className="text-[9px] text-neutral-500 mt-0.5">
                    {lang === 'zh' ? `交货期 ${product.lead_time_days}天` : `제작기간 ${product.lead_time_days}일`}
                    {product.moq && (lang === 'zh' ? ` · MOQ ${product.moq}件` : ` · MOQ ${product.moq}개`)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1 p-3 gap-1.5">
          {factoryName && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-neutral-400 font-medium truncate">{factoryName}</span>
              {product.factory?.verified && <span className="text-[9px] text-emerald-600 font-bold">✓</span>}
            </div>
          )}
          <h3 className="text-sm font-bold text-neutral-900 line-clamp-2 leading-snug">{name}</h3>
          {shortDesc && (
            <p className="text-[11px] text-neutral-500 line-clamp-1">{shortDesc}</p>
          )}
          {(product.material_ko || product.colors_available) && (
            <div className="flex gap-2 text-[10px] text-neutral-400">
              {product.material_ko && <span>소재: {product.material_ko}</span>}
              {product.colors_available && <span>색상: {product.colors_available}종</span>}
            </div>
          )}
          {price && (
            <div className="text-base font-black text-indigo-600">¥{price}</div>
          )}
          <div className="flex items-center gap-3 text-[11px] text-neutral-500">
            {product.moq && <span>MOQ {product.moq.toLocaleString()}{lang === 'zh' ? '件' : '개'}</span>}
            {product.lead_time_days && <span>🚚 {product.lead_time_days}{lang === 'zh' ? '天' : '일'}</span>}
            {product.stock_qty != null && product.stock_qty > 0 ? (
              <span className="text-emerald-600">{lang === 'zh' ? '库存' : '재고'} {product.stock_qty.toLocaleString()}</span>
            ) : product.stock_qty === 0 ? (
              <span className="text-indigo-600 font-semibold">{lang === 'zh' ? '可定制' : '주문제작'}</span>
            ) : null}
          </div>
          {(cbm || product.pcs_per_box) && (
            <div className="flex gap-2 text-[10px] text-neutral-400 bg-neutral-50 rounded-lg px-2 py-1">
              {cbm && <span>📦 CBM {cbm}m³</span>}
              {product.pcs_per_box && <span>📊 {product.pcs_per_box}pcs/박스</span>}
            </div>
          )}
          <div className="flex gap-1.5 mt-auto pt-1">
            <button
              onClick={e => { e.preventDefault(); onInquiry(product); }}
              className="flex-1 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 transition-colors"
            >
              {lang === 'zh' ? '询价' : '문의하기'}
            </button>
            <span className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold text-center hover:bg-indigo-700 transition-colors cursor-pointer">
              {lang === 'zh' ? '查看详情' : '상세보기'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── 히어로 배너 슬라이더 ── */
function HeroBannerSlider({
  lang, onMatchClick, onHotClick, onMembershipClick,
}: {
  lang: 'ko' | 'zh'; onMatchClick: () => void; onHotClick: () => void; onMembershipClick: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % HERO_BANNERS.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const banner = HERO_BANNERS[current];
  const title = lang === 'zh' ? banner.titleZh : banner.titleKo;
  const sub = lang === 'zh' ? banner.subZh : banner.subKo;
  const cta = lang === 'zh' ? banner.ctaZh : banner.ctaKo;

  const handleCta = () => {
    if (banner.ctaAction === 'match') onMatchClick();
    else if (banner.ctaAction === 'hot') onHotClick();
    else if (banner.ctaAction === 'membership') onMembershipClick();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: banner.bg, minHeight: 180 }}>
      <div className="max-w-screen-xl mx-auto px-6 py-8 sm:py-12 flex items-center justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight mb-2">{title}</h2>
          <p className="text-sm text-white/80 mb-4 max-w-md">{sub}</p>
          <button
            onClick={handleCta}
            className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl text-white text-sm font-bold transition-all active:scale-95"
          >
            {cta} →
          </button>
        </div>
        <div className="hidden sm:block text-7xl opacity-30 select-none">{banner.emoji}</div>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {HERO_BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/50 w-2'}`}
          />
        ))}
      </div>
      <button
        onClick={() => setCurrent(c => (c - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors text-lg"
      >‹</button>
      <button
        onClick={() => setCurrent(c => (c + 1) % HERO_BANNERS.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors text-lg"
      >›</button>
    </div>
  );
}

/* ── 카테고리 그리드 ── */
function CategoryGrid({
  categories, selectedCat, onSelect, lang,
}: {
  categories: any[]; selectedCat: string; onSelect: (id: string) => void; lang: 'ko' | 'zh';
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
      <h3 className="text-sm font-black text-neutral-800 mb-3">
        {lang === 'zh' ? '분류' : '카테고리'}
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        <button
          onClick={() => onSelect('all')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            selectedCat === 'all' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50 text-neutral-700'
          }`}
        >
          <span className="text-xl">🏪</span>
          <span className="text-[10px] font-semibold">{lang === 'zh' ? '全部' : '전체'}</span>
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              selectedCat === cat.id ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50 text-neutral-700'
            }`}
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="text-[10px] font-semibold text-center leading-tight">
              {lang === 'zh' ? cat.name_zh : cat.name_ko}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 상품 섹션 (추천/신상/인기) ── */
function ProductSection({
  title, products, lang, isLoggedIn, onInquiry, loading,
}: {
  title: string; products: any[]; lang: 'ko' | 'zh'; isLoggedIn: boolean; onInquiry: (p: any) => void; loading: boolean;
}) {
  if (!loading && products.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-neutral-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : products.slice(0, 5).map((p: any, i: number) => (
              <ProductCard key={p.id || i} product={p} index={i} lang={lang} isLoggedIn={isLoggedIn} onInquiry={onInquiry} />
            ))}
      </div>
    </div>
  );
}

/* ── 비로그인 환영 팝업 ── */
function WelcomePopup({ lang, onClose }: { lang: 'ko' | 'zh'; onClose: () => void }) {
  const t = T[lang];
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5 text-white text-center">
          <div className="text-4xl mb-2">👋</div>
          <h2 className="text-lg font-black">{lang === 'zh' ? '欢迎来到KERYX！' : 'KERYX에 오신 것을 환영합니다!'}</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-neutral-700 leading-relaxed mb-5">{t.welcome_msg}</p>
          <div className="flex gap-3">
            <Link
              href="/signup?role=seller"
              className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold text-center no-underline hover:bg-indigo-700 transition-colors"
              onClick={onClose}
            >
              {lang === 'zh' ? '免费注册' : '무료 가입'}
            </Link>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-neutral-100 text-neutral-700 text-sm font-bold hover:bg-neutral-200 transition-colors"
            >
              {t.welcome_close}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── 메인 페이지 ── */
function ShopPageInner() {
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const [products, setProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [hotProducts, setHotProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(FALLBACK_CATEGORIES);
  const searchParams = useSearchParams();
  const [selectedCat, setSelectedCat] = useState(() => searchParams.get('category') || 'all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sortBy, setSortBy] = useState('new');
  const [supplierType, setSupplierType] = useState('all');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [liveStats, setLiveStats] = useState<{ factories: number; sellers: number; products: number } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [moqMax, setMoqMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const t = T[lang];

  useEffect(() => {
    const saved = localStorage.getItem('keryx_lang') as 'ko' | 'zh' | null;
    if (saved) setLang(saved);
    fetch('/api/auth/me').then(r => {
      if (r.ok) {
        setIsLoggedIn(true);
      } else {
        const shown = sessionStorage.getItem('keryx_welcome_shown');
        if (!shown) {
          setTimeout(() => setShowWelcome(true), 1500);
          sessionStorage.setItem('keryx_welcome_shown', '1');
        }
      }
    }).catch(() => {});
    fetch('/api/public/stats').then(r => r.json()).then(d => setLiveStats(d)).catch(() => {});
    const cat = searchParams.get('category');
    if (cat) setSelectedCat(cat);
  }, [searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        sort: sortBy,
      });
      if (selectedCat !== 'all') params.set('category', selectedCat);
      if (search) params.set('search', search);
      if (supplierType !== 'all') params.set('supplier_type', supplierType);
      if (priceMin) params.set('price_min', priceMin);
      if (priceMax) params.set('price_max', priceMax);
      if (moqMax) params.set('moq_max', moqMax);
      const res = await fetch(`/api/public/products?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  }, [selectedCat, search, sortBy, supplierType, page, priceMin, priceMax, moqMax]);

  const fetchSections = useCallback(async () => {
    setSectionLoading(true);
    try {
      const [featRes, newRes, hotRes] = await Promise.all([
        fetch('/api/public/products?featured=true&limit=5'),
        fetch('/api/public/products?is_new=true&limit=5'),
        fetch('/api/public/products?is_hot=true&limit=5'),
      ]);
      const [featData, newData, hotData] = await Promise.all([featRes.json(), newRes.json(), hotRes.json()]);
      setFeaturedProducts(featData.products || []);
      setNewProducts(newData.products || []);
      setHotProducts(hotData.products || []);
    } catch {}
    setSectionLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/public/categories');
      const data = await res.json();
      if (data.categories?.length > 0) setCategories(data.categories);
      else setCategories(FALLBACK_CATEGORIES);
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    }
  }, []);

  useEffect(() => { fetchCategories(); fetchSections(); }, [fetchCategories, fetchSections]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filteredProducts = products.filter((p: any) => {
    if (advFilters.moqMax != null && (p.moq || 0) > (advFilters.moqMax as number)) return false;
    if (advFilters.priceMin != null && (p.price_cny || 0) < (advFilters.priceMin as number)) return false;
    if (advFilters.priceMax != null && (p.price_cny || 0) > (advFilters.priceMax as number)) return false;
    if (advFilters.leadTimeMax != null && (p.lead_time_days || 999) > (advFilters.leadTimeMax as number)) return false;
    if (advFilters.hasIp === true && !p.ip_id) return false;
    if (advFilters.hasIp === false && p.ip_id) return false;
    return true;
  });

  const toggleLang = () => {
    const next = lang === 'ko' ? 'zh' : 'ko';
    setLang(next);
    localStorage.setItem('keryx_lang', next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCatSelect = (id: string) => {
    setSelectedCat(id);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[100] bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-5">
          <div className="flex items-center gap-3 h-16">
            <Link href="/shop" className="flex items-center gap-2 flex-shrink-0">
              <Image src="/logos/logo-horizontal.png" alt="KERYX B2B" width={140} height={36} className="object-contain" priority />
            </Link>
            <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-2xl">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t.search_placeholder}
                className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-l-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
              />
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-r-xl hover:bg-indigo-700 transition-colors">
                {t.search_btn}
              </button>
            </form>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={toggleLang} className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
                {t.lang}
              </button>
              <Link href="/services" className="hidden sm:block px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors no-underline">
                {t.services_link}
              </Link>
              {isLoggedIn ? (
                <Link href="/seller" className="hidden sm:block px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors no-underline">
                  {t.dashboard}
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors no-underline">
                    {t.login}
                  </Link>
                  <Link href="/signup?role=seller" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors no-underline">
                    {t.signup}
                  </Link>
                </>
              )}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-600">
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
          {/* 모바일 검색 */}
          <div className="sm:hidden pb-3">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t.search_placeholder}
                className="flex-1 px-3 py-2 border border-neutral-200 rounded-l-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-r-xl">검색</button>
            </form>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-neutral-100 bg-white px-4 py-3 flex flex-col gap-2">
            <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-600">{t.lang}</button>
            <Link href="/services" className="px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-600 no-underline" onClick={() => setMobileMenuOpen(false)}>{t.services_link}</Link>
            {isLoggedIn ? (
              <Link href="/seller" className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>{t.dashboard}</Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-600 no-underline" onClick={() => setMobileMenuOpen(false)}>{t.login}</Link>
                <Link href="/signup?role=seller" className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>{t.signup}</Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── 카테고리 탭바 (sticky) ── */}
      <div className="bg-white border-b border-neutral-200 sticky top-16 z-[90]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-5">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            <button
              onClick={() => handleCatSelect('all')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedCat === 'all' ? 'bg-indigo-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              🏪 {t.all_cat}
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => handleCatSelect(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedCat === cat.id ? 'bg-indigo-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                {cat.icon} {lang === 'zh' ? cat.name_zh : cat.name_ko}
              </button>
            ))}
            <div className="flex-shrink-0 w-px bg-neutral-200 mx-1 self-stretch" />
            <button
              onClick={() => {
                if (isLoggedIn) setShowMatchModal(true);
                else if (confirm(t.login_required_match + '\n\n로그인 페이지로 이동하시겠습니까?')) window.location.href = '/login?redirect=/shop';
              }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            >
              {t.tab_match}
            </button>

            <button
              onClick={() => {
                if (isLoggedIn) window.location.href = '/seller/research/new';
                else if (confirm(t.login_required_research + '\n\n로그인 페이지로 이동하시겠습니까?')) window.location.href = '/login?redirect=/seller/research/new';
              }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            >
              {t.tab_research}
            </button>
          </div>
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-5 py-5 pb-28">

        {/* 히어로 배너 슬라이더 */}
        <div className="mb-6">
          <HeroBannerSlider
            lang={lang}
            onMatchClick={() => {
              if (isLoggedIn) setShowMatchModal(true);
              else window.location.href = '/login?redirect=/shop';
            }}
            onHotClick={() => {
              document.getElementById('hot-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onMembershipClick={() => {}}
          />
        </div>

        {/* 카테고리 그리드 */}
        <div className="mb-6">
          <CategoryGrid categories={categories} selectedCat={selectedCat} onSelect={handleCatSelect} lang={lang} />
        </div>

        {/* 통계 */}
        {liveStats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { num: `${liveStats.factories.toLocaleString()}+`, label: t.stats_factories, icon: '🏭', color: '#4f46e5' },
              { num: `${liveStats.sellers.toLocaleString()}+`, label: t.stats_sellers, icon: '🛍️', color: '#10b981' },
              { num: `${liveStats.products.toLocaleString()}+`, label: t.stats_products, icon: '📦', color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-3 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-lg font-black" style={{ color: s.color }}>{s.num}</div>
                <div className="text-[10px] text-neutral-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 추천/인기/신상품 섹션 */}
        {selectedCat === 'all' && !search && (
          <>
            <ProductSection
              title={t.featured_section}
              products={featuredProducts}
              lang={lang}
              isLoggedIn={isLoggedIn}
              onInquiry={() => setShowMatchModal(true)}
              loading={sectionLoading}
            />
            <div id="hot-section">
              <ProductSection
                title={t.hot_section}
                products={hotProducts}
                lang={lang}
                isLoggedIn={isLoggedIn}
                onInquiry={() => setShowMatchModal(true)}
                loading={sectionLoading}
              />
            </div>
            <ProductSection
              title={t.new_section}
              products={newProducts}
              lang={lang}
              isLoggedIn={isLoggedIn}
              onInquiry={() => setShowMatchModal(true)}
              loading={sectionLoading}
            />
          </>
        )}

        {/* 공급상 구분 필터 */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {SUPPLIER_TYPES.map(s => (
            <button
              key={s.id}
              onClick={() => { setSupplierType(s.id); setPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                supplierType === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-neutral-200 text-neutral-600 hover:border-indigo-300'
              }`}
            >
              {lang === 'zh' ? s.zh : s.ko}
            </button>
          ))}
        </div>

        {/* 필터 & 정렬 바 */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {selectedCat === 'all'
                  ? t.all_products
                  : (categories.find((c: any) => c.id === selectedCat)?.[lang === 'zh' ? 'name_zh' : 'name_ko'] || t.all_products)}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t.total_products} {total.toLocaleString()}{t.items}
                {search && ` · "${search}"`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-400 font-medium">{lang === 'zh' ? '排序:' : '정렬:'}</span>
              {[
                { v: 'new', label: t.sort_new },
                { v: 'featured', label: t.sort_featured },
                { v: 'moq', label: t.sort_moq },
                { v: 'price', label: t.sort_price },
              ].map(s => (
                <button
                  key={s.v}
                  onClick={() => { setSortBy(s.v); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    sortBy === s.v ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${showFilters ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'}`}
              >
                🔧 {lang === 'zh' ? '高级筛选' : '상세 필터'}
              </button>
              <AdvancedFilter filters={advFilters} onChange={setAdvFilters} lang={lang} accentColor="#667eea" />
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{lang === 'zh' ? '最低价格 (¥)' : '최저 가격 (¥)'}</label>
                <input
                  type="number"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{lang === 'zh' ? '最高价格 (¥)' : '최고 가격 (¥)'}</label>
                <input
                  type="number"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  placeholder="999"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{lang === 'zh' ? 'MOQ上限' : 'MOQ 최대'}</label>
                <input
                  type="number"
                  value={moqMax}
                  onChange={e => setMoqMax(e.target.value)}
                  placeholder="9999"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="col-span-2 sm:col-span-3 flex gap-2">
                <button
                  onClick={() => { setPriceMin(''); setPriceMax(''); setMoqMax(''); setPage(1); }}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-semibold hover:bg-neutral-200 transition-colors"
                >
                  {lang === 'zh' ? '重置' : '초기화'}
                </button>
                <button
                  onClick={() => { setPage(1); setShowFilters(false); }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  {lang === 'zh' ? '应用' : '적용'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 전체 상품 그리드 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-base font-bold text-neutral-700 mb-2">{t.no_products}</h3>
            <p className="text-sm text-neutral-400">{t.no_products_sub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {filteredProducts.map((product: any, i: number) => (
              <ProductCard
                key={product.id || i}
                product={product}
                index={i}
                lang={lang}
                isLoggedIn={isLoggedIn}
                onInquiry={() => setShowMatchModal(true)}
              />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-600 disabled:opacity-40 hover:bg-neutral-50 transition-colors"
            >
              ← {t.prev}
            </button>
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              const pg = page <= 4 ? i + 1 : page - 3 + i;
              if (pg < 1 || pg > totalPages) return null;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                    pg === page ? 'bg-indigo-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-600 disabled:opacity-40 hover:bg-neutral-50 transition-colors"
            >
              {t.next} →
            </button>
          </div>
        )}

        {/* 마진 계산기 */}
        <MarginCalculator lang={lang} />

        {/* 서비스 소개 배너 */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-black mb-1">
                {lang === 'zh' ? 'KERYX 全套服务' : 'KERYX 종합 서비스'}
              </h3>
              <p className="text-sm text-white/80">
                {lang === 'zh'
                  ? '市场调研 · 工厂匹配 · 样品开发 · 物流代理 · 品质检验'
                  : '시장조사 · 공장매칭 · 샘플개발 · 물류대행 · 품질검수'}
              </p>
            </div>
            <Link
              href="/services"
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl text-white text-sm font-bold transition-all no-underline active:scale-95"
            >
              {lang === 'zh' ? '了解更多 →' : '서비스 자세히 보기 →'}
            </Link>
          </div>
        </div>
      </main>

      {/* ── 비로그인 배너 ── */}
      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-t border-violet-200 px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <p className="text-sm font-bold text-violet-800">{t.guest_title}</p>
              <p className="text-xs text-violet-600 mt-0.5">{t.guest_sub}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/support" className="px-4 py-2 bg-white/70 border border-violet-200 rounded-lg text-violet-700 text-xs font-semibold hover:bg-white transition-colors">{t.guest_support}</a>
            <a href="/signup?role=seller" className="px-4 py-2 bg-indigo-600 rounded-lg text-white text-xs font-bold hover:bg-indigo-700 transition-colors">{t.guest_signup}</a>
          </div>
        </div>
      )}

      {/* ── 하단 고정 도움말 바 ── */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <div>
            <p className="text-xs font-bold">{t.help_q}</p>
            <p className="text-[10px] text-white/75">{t.help_sub}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a href="/support" className="px-3 py-1.5 bg-white/15 rounded-lg text-white text-xs font-semibold hover:bg-white/25 transition-colors">{t.help_faq}</a>
          <a href="/support" className="px-3 py-1.5 bg-white rounded-lg text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-colors">{t.help_cs}</a>
        </div>
      </div>

      {/* ── 공장 매칭 모달 ── */}
      <FactoryMatchingModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        onSuccess={() => setShowMatchModal(false)}
        lang={lang}
      />

      {/* ── 비로그인 환영 팝업 ── */}
      {showWelcome && !isLoggedIn && (
        <WelcomePopup lang={lang} onClose={() => setShowWelcome(false)} />
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    }>
      <ShopPageInner />
    </Suspense>
  );
}
