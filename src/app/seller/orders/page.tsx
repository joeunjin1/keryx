'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

const PAGE_SIZE = 15;

function getMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    const labelZh = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    months.push({ val, label, labelZh });
  }
  return months;
}

const brandColor = '#f97316';

// ── 주문 상태 메타 (DB enum order_status 기준) ──
const ORDER_STATUS_META: Record<string, { label: string; labelZh: string; color: string }> = {
  draft:                    { label: '초안',         labelZh: '草稿',       color: '#94a3b8' },
  pending_admin_approval:   { label: '주문승인전',   labelZh: '待审批',     color: '#a855f7' },
  awaiting_deposit:         { label: '선수금대기',   labelZh: '等待预付款', color: '#f59e0b' },
  in_production:            { label: '제작중',       labelZh: '生产中',     color: '#3b82f6' },
  production_completed:     { label: '제작완료',     labelZh: '生产完成',   color: '#0ea5e9' },
  arrived_warehouse:        { label: '창고도착',     labelZh: '已到仓库',   color: '#8b5cf6' },
  inspecting:               { label: '검수중',       labelZh: '检验中',     color: '#e11d48' },
  inspection_admin_review:  { label: '검수검토중',   labelZh: '审核检验',   color: '#f97316' },
  inspection_seller_review: { label: '검수확인요청', labelZh: '请确认检验', color: '#eab308' },
  awaiting_balance:         { label: '잔금대기',     labelZh: '等待尾款',   color: '#f59e0b' },
  shipping_to_korea:        { label: '운송중',       labelZh: '运输中',     color: '#06b6d4' },
  arrived_korea:            { label: '한국도착',     labelZh: '已到韩国',   color: '#10b981' },
  delivered:                { label: '납품완료',     labelZh: '已交货',     color: '#22c55e' },
  disputed:                 { label: '이의제기',     labelZh: '有争议',     color: '#ef4444' },
  cancelled:                { label: '취소됨',       labelZh: '已取消',     color: '#6b7280' },
};

// ── 견적서 상태 메타 ──
const QUOTE_STATUS_META: Record<string, { ko: string; zh: string; color: string; bg: string }> = {
  draft:     { ko: '초안',    zh: '草稿',   color: '#6b7280', bg: '#f3f4f6' },
  sent:      { ko: '검토요청', zh: '待确认', color: '#2563eb', bg: '#eff6ff' },
  accepted:  { ko: '수락됨',  zh: '已接受', color: '#16a34a', bg: '#f0fdf4' },
  rejected:  { ko: '반려됨',  zh: '已拒绝', color: '#dc2626', bg: '#fef2f2' },
  expired:   { ko: '만료됨',  zh: '已过期', color: '#9ca3af', bg: '#f9fafb' },
  converted: { ko: '주문전환', zh: '已转订单', color: '#7c3aed', bg: '#f5f3ff' },
};

const ORDER_STEPS = ['pending_admin_approval', 'awaiting_deposit', 'in_production', 'inspecting', 'awaiting_balance', 'shipping_to_korea', 'delivered'];

export default function SellerOrdersPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as any;

  // ── 공통 상태 ──
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'orders' | 'quotations'>('orders');
  const [sellerId, setSellerId] = useState<string>('');

  // ── 주문 상태 ──
  const [orders, setOrders] = useState<any[]>([]);
  const [orderTab, setOrderTab] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // ── 견적서 상태 ──
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quoteTab, setQuoteTab] = useState<'all' | 'sent' | 'accepted' | 'rejected'>('all');
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('kind')
        .eq('id', user.id)
        .single();
      if (!profile || !['seller', 'admin'].includes(profile.kind)) {
        router.push('/login?role=seller'); return;
      }

      const { data: seller } = await supabase
        .from('sellers')
        .select('id, business_name')
        .eq('user_id', user.id)
        .single();

      const sid = seller?.id ?? '';
      setSellerId(sid);

      // 주문 목록 로드 - 상품 이미지/이름/수량/납기 포함
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`id, order_no, status, total_cny, created_at, expected_warehouse_arrival, notes, packaging_notes,
           items:order_items(
             id, qty, unit_price_cny, subtotal_cny, lead_time_days,
             product:products(id, name_ko, name_zh, sku, images:product_images(url, is_primary))
           )`)
        .eq('seller_id', sid)
        .order('created_at', { ascending: false })
        .limit(200);
      setOrders(ordersData ?? []);

      // 견적서 목록 로드
      try {
        const res = await fetch('/api/trade/quotations?limit=50');
        const data = await res.json();
        setQuotations(data.quotations || []);
      } catch {
        setQuotations([]);
      }

      setLoading(false);
    })();
  }, []);

  // ── 주문 탭 계산 ──
  const orderTabs = useMemo(() => [
    { id: 'all',          label: '전체',    labelZh: '全部',   count: orders.length },
    { id: 'pending_admin_approval', label: '승인대기', labelZh: '待审批', count: orders.filter(o => ['draft', 'pending_admin_approval'].includes(o.status)).length },
    { id: 'active',       label: '진행중',   labelZh: '进行中', count: orders.filter(o => !['cancelled', 'delivered', 'draft', 'pending_admin_approval'].includes(o.status)).length },
    { id: 'delivered',    label: '납품완료', labelZh: '已交货', count: orders.filter(o => o.status === 'delivered').length },
    { id: 'cancelled',    label: '취소',    labelZh: '已取消', count: orders.filter(o => o.status === 'cancelled').length },
  ], [orders]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (orderTab === 'active') list = list.filter(o => !['cancelled', 'delivered', 'draft', 'pending_admin_approval'].includes(o.status));
    else if (orderTab === 'pending_admin_approval') list = list.filter(o => ['draft', 'pending_admin_approval'].includes(o.status));
    else if (orderTab === 'delivered') list = list.filter(o => o.status === 'delivered');
    else if (orderTab === 'cancelled') list = list.filter(o => o.status === 'cancelled');
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o => (o.order_no || '').toLowerCase().includes(q));
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(o =>
        (o.items || []).some((item: any) =>
          (item.product?.name_ko || '').toLowerCase().includes(q) ||
          (item.product?.name_zh || '').toLowerCase().includes(q) ||
          (item.product?.sku || '').toLowerCase().includes(q)
        )
      );
    }
    if (monthFilter) {
      list = list.filter(o => o.expected_warehouse_arrival?.startsWith(monthFilter));
    }
    return list;
  }, [orders, orderTab, orderSearch, productSearch, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice((orderPage - 1) * PAGE_SIZE, orderPage * PAGE_SIZE);
  useEffect(() => { setOrderPage(1); }, [orderTab, orderSearch, productSearch, monthFilter]);

  const activeOrderCount = orders.filter(o => !['cancelled', 'delivered', 'draft', 'pending_admin_approval'].includes(o.status)).length;

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  // ── 견적서 필터 ──
  const filteredQuotations = quoteTab === 'all'
    ? quotations
    : quotations.filter(q => q.status === quoteTab);

  const pendingQuoteCount = quotations.filter(q => q.status === 'sent').length;
  const pendingOrderCount = orders.filter(o => ['draft', 'pending_admin_approval'].includes(o.status)).length;

  // ── 견적서 수락/반려 ──
  const handleAccept = async (quotationId: string) => {
    if (!confirm(t('이 견적서를 수락하고 주문으로 전환하시겠습니까?', '确认接受此报价并转换为订单？'))) return;
    setAccepting(quotationId);
    try {
      const res = await fetch(`/api/trade/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      if (res.ok) {
        const resData = await fetch('/api/trade/quotations?limit=50');
        const data = await resData.json();
        setQuotations(data.quotations || []);
        alert(t('견적서가 수락되었습니다. 주문이 자동 생성되었습니다.', '报价已接受，订单已自动创建。'));
      }
    } catch {}
    setAccepting(null);
  };

  const handleReject = async (quotationId: string) => {
    if (!confirm(t('이 견적서를 반려하시겠습니까?', '确认拒绝此报价？'))) return;
    try {
      const res = await fetch(`/api/trade/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      if (res.ok) {
        const resData = await fetch('/api/trade/quotations?limit=50');
        const data = await resData.json();
        setQuotations(data.quotations || []);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('로딩 중...', '加载中...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-gray-900 mb-1">
          {t('📋 거래 관리', '📋 交易管理')}
        </h1>
        <p className="text-xs text-gray-500">
          {t('견적서 확인 및 주문 현황을 한 곳에서 관리하세요', '在一处管理报价确认和订单状态')}
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
          <div className="text-2xl font-extrabold text-purple-600">{pendingQuoteCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">{t('검토 요청 견적', '待确认报价')}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
          <div className="text-2xl font-extrabold text-orange-500">{pendingOrderCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">{t('승인 대기 주문', '待审核订单')}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
          <div className="text-2xl font-extrabold text-blue-600">
            {orders.filter(o => !['cancelled', 'delivered', 'draft', 'pending_admin_approval'].includes(o.status)).length}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{t('진행중 주문', '进行中订单')}</div>
        </div>
      </div>

      {/* 메인 탭 */}
      <div className="flex gap-2 mb-4 border-b border-gray-100 pb-0">
        <button
          onClick={() => setMainTab('orders')}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all ${mainTab === 'orders' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          {t('주문 관리', '订单管理')}
          {pendingOrderCount > 0 && (
            <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingOrderCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab('quotations')}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all ${mainTab === 'quotations' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          {t('견적서', '报价单')}
          {pendingQuoteCount > 0 && (
            <span className="ml-1.5 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingQuoteCount}
            </span>
          )}
        </button>
        <div className="flex-1" />
        <Link
          href="/seller/orders/new"
          className="pb-3 text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
        >
          + {t('주문하기', '下单')}
        </Link>
      </div>

      {/* ─── 주문 관리 탭 ─── */}
      {mainTab === 'orders' && (
        <div>
          {/* 서브 탭 */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {orderTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setOrderTab(tab.id)}
                className="flex items-center gap-1 shrink-0 text-xs font-semibold py-1.5 px-3 rounded-full transition-all"
                style={{
                  background: orderTab === tab.id ? brandColor : '#f3f4f6',
                  color: orderTab === tab.id ? '#fff' : '#6b7280',
                }}
              >
                {lang === 'zh' ? tab.labelZh : tab.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: orderTab === tab.id ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                    color: orderTab === tab.id ? '#fff' : '#9ca3af',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* 검색 영역 - 3열 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input type="text" value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                placeholder={t('주문번호 검색...', '搜索订单号...')}
                className="w-full rounded-xl bg-white text-sm text-gray-700 outline-none border border-gray-200 pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-orange-300" />
              {orderSearch && <button onClick={() => setOrderSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📦</span>
              <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder={t('상품명/SKU 검색...', '搜索商品名/SKU...')}
                className="w-full rounded-xl bg-white text-sm text-gray-700 outline-none border border-gray-200 pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-orange-300" />
              {productSearch && <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📅</span>
              <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
                className="w-full rounded-xl bg-white text-sm text-gray-700 outline-none border border-gray-200 pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-orange-300 appearance-none">
                <option value="">{t('전체 납기월', '全部交货月份')}</option>
                {monthOptions.map(m => (
                  <option key={m.val} value={m.val}>{lang === 'zh' ? m.labelZh : m.label}</option>
                ))}
              </select>
            </div>
          </div>
          {(orderSearch || productSearch || monthFilter) && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs text-gray-500">{t(`검색 결과: ${filteredOrders.length}건`, `搜索结果: ${filteredOrders.length}件`)}</span>
              <button onClick={() => { setOrderSearch(''); setProductSearch(''); setMonthFilter(''); }} className="text-xs text-orange-500 hover:underline">
                {t('필터 초기화', '重置筛选')}
              </button>
            </div>
          )}

          {/* 주문 목록 - 엑셀 리스트 형식 */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm text-gray-400">{t('주문 내역이 없습니다', '没有订单记录')}</div>
              <Link href="/seller/orders/new" className="mt-3 inline-block text-xs text-orange-500 hover:underline">
                {t('지금 주문하기 →', '立即下单 →')}
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* 테이블 헤더 (데스크탑) */}
              <div className="hidden md:grid gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500"
                style={{ gridTemplateColumns: '48px 1fr 80px 100px 110px 100px 32px' }}>
                <div>{t('사진', '图片')}</div>
                <div>{t('주문번호 / 상품명', '订单号 / 商品名')}</div>
                <div className="text-right">{t('수량', '数量')}</div>
                <div className="text-right">{t('전체금액', '总金额')}</div>
                <div className="text-center">{t('납기월', '交货月份')}</div>
                <div className="text-center">{t('상태', '状态')}</div>
                <div></div>
              </div>
              {pagedOrders.map((o, idx) => {
                const meta = ORDER_STATUS_META[o.status] || { label: o.status, labelZh: o.status, color: '#94a3b8' };
                const isExpanded = expandedOrderId === o.id;
                const firstItem = o.items?.[0];
                const firstImage = firstItem?.product?.images?.find((img: any) => img.is_primary)?.url || firstItem?.product?.images?.[0]?.url;
                const totalQty = (o.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
                const isLast = idx === pagedOrders.length - 1;
                return (
                  <div key={o.id} style={{ borderBottom: isLast && !isExpanded ? 'none' : '1px solid #f3f4f6' }}>
                    {/* 주문 행 - 클릭 시 상세 펼치기 */}
                    <div onClick={() => toggleExpand(o.id)}
                      className="grid gap-2 px-4 py-3 cursor-pointer hover:bg-orange-50 transition-colors items-center"
                      style={{ gridTemplateColumns: '48px 1fr auto', borderLeft: `3px solid ${meta.color}` }}>
                      {/* 상품 사진 */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                        {firstImage ? <img src={firstImage} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">📦</span>}
                      </div>
                      {/* 주문번호 + 상품명 */}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-400 mb-0.5">{o.order_no}</div>
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {firstItem?.product
                            ? (lang === 'zh' ? firstItem.product.name_zh : (firstItem.product.name_ko || firstItem.product.name_zh))
                            : t(`상품 ${o.items?.length ?? 0}종`, `商品 ${o.items?.length ?? 0} 种`)}
                        </div>
                        {(o.items?.length || 0) > 1 && (
                          <div className="text-xs text-gray-400">+{o.items.length - 1}{t('개 상품', '件商品')}</div>
                        )}
                        {/* 모바일 추가 정보 */}
                        <div className="md:hidden flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-bold text-orange-500">¥{(o.total_cny ?? 0).toLocaleString()}</span>
                          <span className="text-xs text-gray-400">{totalQty.toLocaleString()}{t('개', '个')}</span>
                          {o.expected_warehouse_arrival && <span className="text-xs text-gray-400">{o.expected_warehouse_arrival.slice(0, 7)}</span>}
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${meta.color}20`, color: meta.color }}>
                            {lang === 'zh' ? meta.labelZh : meta.label}
                          </span>
                        </div>
                      </div>
                      {/* 데스크탑 전용 컬럼들 */}
                      <div className="hidden md:contents">
                        <div className="text-right text-sm font-semibold text-gray-700">{totalQty.toLocaleString()}{t('개', '个')}</div>
                        <div className="text-right text-sm font-extrabold text-orange-500">¥{(o.total_cny ?? 0).toLocaleString()}</div>
                        <div className="text-center text-xs text-gray-500">
                          {o.expected_warehouse_arrival ? o.expected_warehouse_arrival.slice(0, 7) : <span className="text-gray-300">-</span>}
                        </div>
                        <div className="flex justify-center">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: `${meta.color}18`, color: meta.color }}>
                            {lang === 'zh' ? meta.labelZh : meta.label}
                          </span>
                        </div>
                        <div className="flex justify-center text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</div>
                      </div>
                    </div>
                    {/* 상세 내역 아코디언 */}
                    {isExpanded && (
                      <div className="bg-gray-50 border-t border-gray-100 px-4 py-4">
                        {/* 주문 기본 정보 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {[
                            { label: t('주문일', '下单日期'), value: o.created_at?.slice(0, 10) },
                            { label: t('납기 예정', '预计交货'), value: o.expected_warehouse_arrival || '-' },
                            { label: t('총 수량', '总数量'), value: `${totalQty.toLocaleString()}${t('개', '个')}` },
                            { label: t('총 금액', '总金额'), value: `¥${(o.total_cny ?? 0).toLocaleString()}`, highlight: true },
                          ].map((info, i) => (
                            <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                              <div className="text-[10px] text-gray-400 mb-0.5">{info.label}</div>
                              <div className={`text-sm font-bold ${info.highlight ? 'text-orange-500' : 'text-gray-700'}`}>{info.value}</div>
                            </div>
                          ))}
                        </div>
                        {/* 상품 상세 목록 */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
                          <div className="grid gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500"
                            style={{ gridTemplateColumns: '40px 1fr 60px 80px 80px' }}>
                            <div>{t('사진', '图片')}</div>
                            <div>{t('상품명', '商品名')}</div>
                            <div className="text-right">{t('수량', '数量')}</div>
                            <div className="text-right">{t('단가', '单价')}</div>
                            <div className="text-right">{t('소계', '小计')}</div>
                          </div>
                          {(o.items || []).map((item: any, i: number) => {
                            const img = item.product?.images?.find((img: any) => img.is_primary)?.url || item.product?.images?.[0]?.url;
                            return (
                              <div key={item.id || i} className="grid gap-2 px-3 py-2.5 items-center"
                                style={{ gridTemplateColumns: '40px 1fr 60px 80px 80px', borderBottom: i < (o.items.length - 1) ? '1px solid #f3f4f6' : 'none' }}>
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                                  {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span className="text-base">📦</span>}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-800 truncate">
                                    {lang === 'zh' ? item.product?.name_zh : (item.product?.name_ko || item.product?.name_zh || '-')}
                                  </div>
                                  {item.product?.sku && <div className="text-[10px] text-gray-400">{item.product.sku}</div>}
                                  {item.lead_time_days && (
                                    <div className="text-[10px] text-blue-500">{t(`납기 ${item.lead_time_days}일`, `交货期 ${item.lead_time_days}天`)}</div>
                                  )}
                                </div>
                                <div className="text-right text-sm text-gray-700 font-semibold">{(item.qty || 0).toLocaleString()}</div>
                                <div className="text-right text-sm text-gray-600">¥{(item.unit_price_cny || 0).toFixed(2)}</div>
                                <div className="text-right text-sm font-bold text-gray-800">¥{(item.subtotal_cny || 0).toLocaleString()}</div>
                              </div>
                            );
                          })}
                        </div>
                        {o.notes && (
                          <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 mb-3">
                            <div className="text-[11px] font-bold text-yellow-700 mb-1">📝 {t('주문 메모', '订单备注')}</div>
                            <div className="text-sm text-gray-700">{o.notes}</div>
                          </div>
                        )}
                        {!['cancelled', 'delivered'].includes(o.status) && (
                          <div className="mb-3">
                            <div className="text-[11px] font-bold text-gray-500 mb-2">{t('진행 상태', '进度状态')}</div>
                            <div className="flex gap-1">
                              {ORDER_STEPS.map((step, i) => (
                                <div key={step} className="flex-1 h-2 rounded-full transition-all"
                                  style={{ background: i <= ORDER_STEPS.indexOf(o.status) ? meta.color : '#e5e7eb' }} />
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end">
                          <Link href={`/seller/orders/${o.id}`} className="no-underline px-4 py-2 rounded-xl text-white text-xs font-bold"
                            style={{ background: brandColor }} onClick={e => e.stopPropagation()}>
                            {t('전체 주문 상세 보기 →', '查看完整订单详情 →')}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setOrderPage(p)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors"
                  style={{ background: orderPage === p ? brandColor : '#fff', color: orderPage === p ? '#fff' : '#6b7280', borderColor: orderPage === p ? brandColor : '#e5e7eb' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setOrderPage(p => Math.min(totalPages, p + 1))} disabled={orderPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 disabled:opacity-40 hover:bg-gray-50">›</button>
            </div>
          )}
        </div>
      )}

      {/* ─── 견적서 탭 ─── */}
      {mainTab === 'quotations' && (
        <div>
          {/* 서브 탭 */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {([
              { id: 'all',      label: '전체',    labelZh: '全部',   count: quotations.length },
              { id: 'sent',     label: '검토요청', labelZh: '待确认', count: quotations.filter(q => q.status === 'sent').length },
              { id: 'accepted', label: '수락됨',  labelZh: '已接受', count: quotations.filter(q => q.status === 'accepted').length },
              { id: 'rejected', label: '반려됨',  labelZh: '已拒绝', count: quotations.filter(q => q.status === 'rejected').length },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setQuoteTab(tab.id)}
                className="flex items-center gap-1 shrink-0 text-xs font-semibold py-1.5 px-3 rounded-full transition-all"
                style={{
                  background: quoteTab === tab.id ? '#7c3aed' : '#f3f4f6',
                  color: quoteTab === tab.id ? '#fff' : '#6b7280',
                }}
              >
                {lang === 'zh' ? tab.labelZh : tab.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: quoteTab === tab.id ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                    color: quoteTab === tab.id ? '#fff' : '#9ca3af',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* 견적서 목록 */}
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
              <div className="text-4xl mb-3">📄</div>
              <div className="text-sm text-gray-400">{t('견적서가 없습니다', '暂无报价单')}</div>
              <p className="text-xs text-gray-300 mt-1">{t('MD가 견적서를 발송하면 여기에 표시됩니다', 'MD发送报价后将显示在此处')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredQuotations.map(q => {
                const statusInfo = QUOTE_STATUS_META[q.status] || { ko: q.status, zh: q.status, color: '#6b7280', bg: '#f3f4f6' };
                const totalKrw = q.total_cny ? Math.round(q.total_cny * 190) : null;
                return (
                  <div key={q.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    {/* 견적서 헤더 */}
                    <div className="flex justify-between items-center py-3.5 px-4 border-b border-gray-50">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {q.quotation_no || t('견적서', '报价单')}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {q.md?.name_ko || 'MD'} · {new Date(q.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                      >
                        {lang === 'zh' ? statusInfo.zh : statusInfo.ko}
                      </span>
                    </div>

                    {/* 상품 목록 */}
                    <div className="py-3 px-4">
                      {(q.items || []).slice(0, 3).map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between items-center py-1.5"
                          style={{ borderBottom: i < Math.min((q.items || []).length, 3) - 1 ? '1px solid #f3f4f6' : 'none' }}
                        >
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold text-gray-700">
                              {lang === 'zh' ? item.product_name_zh : (item.product_name_ko || item.product_name_zh)}
                            </div>
                            {item.variant_desc && (
                              <div className="text-[11px] text-gray-400">{item.variant_desc}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-[13px] font-bold text-gray-900">
                              ¥{item.unit_price_cny?.toFixed(2)} × {item.quantity?.toLocaleString()}
                            </div>
                            {item.lead_time_days && (
                              <div className="text-[11px] text-gray-400">
                                {t(`리드타임 ${item.lead_time_days}일`, `交货期 ${item.lead_time_days}天`)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(q.items?.length || 0) > 3 && (
                        <div className="text-xs text-gray-400 text-center mt-1.5">
                          +{q.items.length - 3}{t('개 더보기', '件更多')}
                        </div>
                      )}
                    </div>

                    {/* 견적서 푸터 */}
                    <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                      <div>
                        <div className="text-[11px] text-gray-400">{t('총 금액', '总金额')}</div>
                        <div className="text-lg font-extrabold text-gray-900">
                          ¥{q.total_cny?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </div>
                        {totalKrw && (
                          <div className="text-[11px] text-gray-500">≈ ₩{totalKrw.toLocaleString()}</div>
                        )}
                        {q.valid_until && (
                          <div className="text-[11px] text-rose-500 mt-0.5">
                            {t(`유효기간: ${q.valid_until}까지`, `有效期至: ${q.valid_until}`)}
                          </div>
                        )}
                      </div>
                      {q.status === 'sent' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(q.id)}
                            className="rounded-xl bg-white text-gray-500 text-[13px] font-semibold cursor-pointer py-2 px-3.5 border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            {t('반려', '拒绝')}
                          </button>
                          <button
                            onClick={() => handleAccept(q.id)}
                            disabled={accepting === q.id}
                            className="px-4 py-2 rounded-xl text-white text-[13px] font-bold cursor-pointer bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-60"
                          >
                            {accepting === q.id ? t('처리 중...', '处理中...') : t('✓ 수락 · 주문 전환', '✓ 接受 · 转订单')}
                          </button>
                        </div>
                      )}
                      {q.status === 'accepted' && q.converted_order_id && (
                        <Link
                          href={`/seller/orders/${q.converted_order_id}`}
                          className="px-4 py-2 rounded-xl text-white no-underline text-[13px] font-bold bg-purple-600 hover:bg-purple-700 transition-colors"
                        >
                          {t('주문 보기', '查看订单')}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
