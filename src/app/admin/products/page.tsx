'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';


type ApprovalStatus = 'all' | 'pending_review' | 'md_approved' | 'approved' | 'rejected' | 'discontinued';

const STATUS_TABS = [
  { id: 'all' as ApprovalStatus, ko: '전체', zh: '全部', color: '#6b7280' },
  { id: 'pending_review' as ApprovalStatus, ko: '검토대기', zh: '待审核', color: '#f59e0b' },
  { id: 'md_approved' as ApprovalStatus, ko: 'MD승인(최종대기)', zh: 'MD通过(待最终)', color: '#8b5cf6' },
  { id: 'approved' as ApprovalStatus, ko: '최종승인', zh: '最终通过', color: '#10b981' },
  { id: 'rejected' as ApprovalStatus, ko: '반려', zh: '已拒绝', color: '#ef4444' },
  { id: 'discontinued' as ApprovalStatus, ko: '단종', zh: '已停产', color: '#9ca3af' },
];

const SUPPLIER_FILTERS = [
  { id: 'all', ko: '전체', zh: '全部' },
  { id: 'IP독점상품개발가능', ko: 'IP독점', zh: 'IP独家' },
  { id: 'IP일부독점개발가능', ko: 'IP일부독점', zh: 'IP部分' },
  { id: 'IP디자인요청가능', ko: 'IP디자인', zh: 'IP设计' },
  { id: 'IP단순구매만가능', ko: 'IP단순', zh: 'IP普通' },
  { id: 'PB봉제중대형', ko: 'PB대형', zh: 'PB大型' },
  { id: 'PB봉제중소형', ko: 'PB소형', zh: 'PB小型' },
  { id: 'PB기타', ko: 'PB기타', zh: 'PB其他' },
];

function statusColor(s: string) {
  const m: Record<string, string> = { approved: '#10b981', pending_review: '#f59e0b', rejected: '#ef4444', discontinued: '#9ca3af' };
  return m[s] ?? '#9ca3af';
}
function statusLabel(s: string): [string, string] {
  const m: Record<string, [string, string]> = {
    pending_review: ['검토 대기', '待审核'], approved: ['승인됨', '已通过'],
    rejected: ['반려됨', '已拒绝'], discontinued: ['단종', '已停产'],
  };
  return m[s] ?? [s, s];
}

const PAGE_SIZE = 20;

export default function AdminProductsPage() {

  // 페이지 제목 설정
  useEffect(() => {
    document.title = '상품 데이터 관리 | KERYX';
  }, []);
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const router = useRouter();
  const supabase = createClient() as any;

  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    let query = supabase
      .from('products')
      .select(
        'id, product_code, sku, name_ko, name_zh, category, supplier_type, supply_price_cny, sell_price_cny, price_cny, moq, approval_status, is_active, is_featured, is_new, is_hot, stock_qty, created_at, image_url, brand_name, origin_country, cbm_per_box, pcs_per_box, lead_time_days, customizable, oem_available, odm_available, factory:factories(id, company_name, company_name_ko, factory_code)',
        { count: 'exact' }
      )
      .order(sortBy, { ascending: sortAsc })
      .range(offset, offset + PAGE_SIZE - 1);

    if (statusFilter !== 'all') query = query.eq('approval_status', statusFilter);
    if (supplierFilter !== 'all') query = query.eq('supplier_type', supplierFilter);
    if (search.trim()) {
      query = query.or(
        `name_ko.ilike.%${search}%,name_zh.ilike.%${search}%,product_code.ilike.%${search}%,sku.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (!error) { setProducts(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: profile } = await supabase.from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };
      if (!profile || (profile.kind !== 'admin' && profile.kind !== 'md')) { router.push('/admin'); return; }
    })();
  }, []);

  useEffect(() => { loadProducts(); }, [page, statusFilter, supplierFilter, search, sortBy, sortAsc]);

  const handleAction = async (productId: string, action: string) => {
    setActionLoading(productId);
    const updates: Record<string, any> = {
      approve: { approval_status: 'approved', is_active: true },
      reject: { approval_status: 'rejected', is_active: false },
      discontinue: { approval_status: 'discontinued', is_active: false },
      feature: { is_featured: true },
      unfeature: { is_featured: false },
      md_approve: { approval_status: 'md_approved' },
    };
    await supabase.from('products').update(updates[action]).eq('id', productId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates[action] } : p));
    setActionLoading(null);
  };

  const handleBulkApprove = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    await supabase.from('products').update({ approval_status: 'approved', is_active: true }).in('id', Array.from(selectedIds));
    setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, approval_status: 'approved', is_active: true } : p));
    setSelectedIds(new Set()); setBulkLoading(false);
  };

  const handleBulkReject = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    await supabase.from('products').update({ approval_status: 'rejected', is_active: false }).in('id', Array.from(selectedIds));
    setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, approval_status: 'rejected', is_active: false } : p));
    setSelectedIds(new Set()); setBulkLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const saveEdit = async () => {
    if (!editProduct) return;
    setEditLoading(true);
    const { error } = await supabase.from('products').update({
      name_ko: editProduct.name_ko, name_zh: editProduct.name_zh,
      category: editProduct.category, supplier_type: editProduct.supplier_type,
      sell_price_cny: editProduct.sell_price_cny, supply_price_cny: editProduct.supply_price_cny,
      moq: editProduct.moq, lead_time_days: editProduct.lead_time_days,
      stock_qty: editProduct.stock_qty, is_featured: editProduct.is_featured,
      is_new: editProduct.is_new, is_hot: editProduct.is_hot, is_active: editProduct.is_active,
      cbm_per_box: editProduct.cbm_per_box, pcs_per_box: editProduct.pcs_per_box,
    }).eq('id', editProduct.id);
    if (!error) { setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...editProduct } : p)); setShowEdit(false); }
    setEditLoading(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const allSelected = products.length > 0 && products.every(p => selectedIds.has(p.id));
  const inp = 'w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

  return (
    <div className="kx-animate-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight"><LangText ko="상품 관리" zh="商品管理" /></h1>
          <p className="text-xs text-stone-400 mt-0.5"><LangText ko={`총 ${total}개 상품`} zh={`共 ${total} 件商品`} /></p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products/price-approvals" className="px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold no-underline">
            <LangText ko="💰 가격승인" zh="💰 价格审批" />
          </Link>
          <Link href="/factory/products/new" className="px-3 py-2 rounded-xl text-white text-xs font-bold no-underline" style={{ background: '#4f46e5' }}>
            <LangText ko="+ 등록" zh="+ 注册" />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <input className={inp} value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            placeholder={t('제품명, SKU, 브랜드 검색…', '搜索产品名、SKU、品牌…')} />
          <button onClick={() => { setSearch(searchInput); setPage(1); }} className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ background: '#4f46e5' }}>🔍</button>
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="px-3 py-2 rounded-lg bg-stone-100 text-stone-600 text-sm">✕</button>}
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}>
            <option value="created_at">{t('등록일순', '按注册日期')}</option>
            <option value="sell_price_cny">{t('가격순', '按价格')}</option>
            <option value="moq">{t('MOQ순', '按MOQ')}</option>
            <option value="stock_qty">{t('재고순', '按库存')}</option>
          </select>
          <button onClick={() => setSortAsc(v => !v)} className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs bg-white hover:bg-stone-50 transition">
            {sortAsc ? t('↑ 오름차순', '↑ 升序') : t('↓ 내림차순', '↓ 降序')}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button key={tab.id} onClick={() => { setStatusFilter(tab.id); setPage(1); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${statusFilter === tab.id ? 'text-white border-transparent' : 'bg-white border-stone-200 text-stone-600'}`}
            style={statusFilter === tab.id ? { background: tab.color, borderColor: tab.color } : {}}>
            <LangText ko={tab.ko} zh={tab.zh} />
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {SUPPLIER_FILTERS.map(f => (
          <button key={f.id} onClick={() => { setSupplierFilter(f.id); setPage(1); }}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition ${supplierFilter === f.id ? 'text-white border-transparent bg-indigo-600' : 'bg-white border-stone-200 text-stone-500'}`}>
            <LangText ko={f.ko} zh={f.zh} />
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-700">
            <LangText ko={`${selectedIds.size}개 선택됨`} zh={`已选择 ${selectedIds.size} 件`} />
          </span>
          <button onClick={handleBulkApprove} disabled={bulkLoading} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold">
            <LangText ko="✓ 일괄 승인" zh="✓ 批量通过" />
          </button>
          <button onClick={handleBulkReject} disabled={bulkLoading} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold">
            <LangText ko="✕ 일괄 반려" zh="✕ 批量拒绝" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse">
              <div className="flex gap-3"><div className="w-16 h-16 rounded-xl bg-stone-200" /><div className="flex-1 space-y-2"><div className="h-4 bg-stone-200 rounded w-3/4" /><div className="h-3 bg-stone-100 rounded w-1/2" /></div></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-stone-400"><div className="text-4xl mb-3">📦</div><div className="text-sm"><LangText ko="상품이 없습니다" zh="暂无商品" /></div></div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2 px-1">
            <input type="checkbox" checked={allSelected} onChange={() => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(products.map(p => p.id)))} className="w-4 h-4 accent-indigo-600" />
            <span className="text-xs text-stone-500"><LangText ko="전체 선택" zh="全选" /></span>
          </div>
          <div className="space-y-3">
            {products.map(p => {
              const isSelected = selectedIds.has(p.id);
              const [koLabel, zhLabel] = statusLabel(p.approval_status ?? 'pending_review');
              const color = statusColor(p.approval_status ?? 'pending_review');
              const cbm = p.cbm_per_box ? parseFloat(p.cbm_per_box).toFixed(5) : null;
              return (
                <div key={p.id} className={`bg-white rounded-2xl shadow-sm transition ${isSelected ? 'border-2 border-indigo-400' : 'border border-stone-100'}`} style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} className="mt-1 w-4 h-4 accent-indigo-600 flex-shrink-0" />
                      {p.image_url ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-stone-100 cursor-zoom-in hover:opacity-80 transition" onClick={() => setLightboxUrl(p.image_url)}>
                          <Image src={p.image_url} alt={p.name_ko ?? ''} fill style={{ objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 text-2xl">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-stone-400">{p.product_code ?? p.sku}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}><LangText ko={koLabel} zh={zhLabel} /></span>
                          {p.is_featured && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⭐ <LangText ko="추천" zh="推荐" /></span>}
                          {p.is_new && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">NEW</span>}
                          {p.is_hot && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">🔥 HOT</span>}
                        </div>
                        <div className="text-sm font-bold text-stone-900 mb-1 truncate">
                          {lang === 'zh' ? (p.name_zh ?? p.name_ko) : (p.name_ko ?? p.name_zh)}
                        </div>
                        <div className="text-xs text-stone-500 mb-1">{p.factory?.company_name_ko ?? p.factory?.company_name ?? '-'}{p.category && ` · ${p.category}`}{p.supplier_type && ` · ${p.supplier_type}`}</div>
                        {(cbm || p.pcs_per_box) && (
                          <div className="flex gap-3 text-xs text-stone-400">
                            {cbm && <span>📦 CBM: {cbm}m³</span>}
                            {p.pcs_per_box && <span>📊 {p.pcs_per_box}pcs/<LangText ko="박스" zh="箱" /></span>}
                            {p.lead_time_days && <span>🚚 {p.lead_time_days}<LangText ko="일" zh="天" /></span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-black text-indigo-600">¥{p.sell_price_cny ?? p.price_cny ?? 0}</div>
                        <div className="text-xs text-stone-400"><LangText ko="공급 " zh="供货 " />¥{p.supply_price_cny ?? '-'}</div>
                        <div className="text-xs text-stone-400">MOQ {p.moq ?? '-'}</div>
                        <div className="text-xs text-stone-400"><LangText ko="재고 " zh="库存 " />{p.stock_qty ?? 0}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(p.approval_status === 'pending_review' || p.approval_status === 'md_approved') && (
                        <>
                          <button onClick={() => handleAction(p.id, 'approve')} disabled={actionLoading === p.id}
                            className={`flex-1 min-w-[70px] py-2 rounded-xl text-white text-xs font-bold transition
                              ${p.approval_status === 'md_approved' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                            {p.approval_status === 'md_approved'
                              ? <LangText ko="최종승인" zh="最终通过" />
                              : <LangText ko="승인" zh="通过" />}
                          </button>
                          <button onClick={() => handleAction(p.id, 'reject')} disabled={actionLoading === p.id} className="flex-1 min-w-[70px] py-2 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition"><LangText ko="반려" zh="拒绝" /></button>
                        </>
                      )}
                      {p.approval_status === 'approved' && (
                        <>
                          <button onClick={() => handleAction(p.id, p.is_featured ? 'unfeature' : 'feature')} disabled={actionLoading === p.id} className="flex-1 min-w-[70px] py-2 rounded-xl bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition">
                            {p.is_featured
                              ? <LangText ko="⭐ 추천해제" zh="⭐ 取消推荐" />
                              : <LangText ko="⭐ 추천설정" zh="⭐ 设为推荐" />
                            }
                          </button>
                          <button onClick={() => handleAction(p.id, 'discontinue')} disabled={actionLoading === p.id} className="flex-1 min-w-[70px] py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition">🚫 <LangText ko="단종" zh="停产" /></button>
                        </>
                      )}
                      <button onClick={() => { setEditProduct({ ...p }); setShowEdit(true); }} className="py-2 px-3 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition">✏️ <LangText ko="편집" zh="编辑" /></button>
                      <Link href={`/products/${p.id}`} className="py-2 px-3 rounded-xl bg-stone-50 text-stone-600 text-xs font-bold no-underline hover:bg-stone-100 transition">👁️</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pb-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition">←</button>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                const pg = page <= 4 ? i + 1 : page - 3 + i;
                if (pg < 1 || pg > totalPages) return null;
                return <button key={pg} onClick={() => setPage(pg)} className={`w-9 h-9 rounded-xl text-sm font-bold transition ${pg === page ? 'text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`} style={pg === page ? { background: '#4f46e5' } : {}}>{pg}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition">→</button>
            </div>
          )}
        </>
      )}

      {/* 이미지 라이트박스 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white text-3xl font-bold hover:opacity-70 transition z-10"
            >✕</button>
            <img
              src={lightboxUrl}
              alt="상품 이미지"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* 상품 편집 모달 */}
      {showEdit && editProduct && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-base font-black text-stone-900"><LangText ko="상품 편집" zh="编辑商品" /></h2>
              <button onClick={() => setShowEdit(false)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  <LangText ko="제품명 (한국어)" zh="产品名称 (韩文)" />
                </label>
                <input className={inp} value={editProduct.name_ko ?? ''} onChange={e => setEditProduct((p: any) => ({ ...p, name_ko: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  <LangText ko="제품명 (中文)" zh="产品名称 (中文)" />
                </label>
                <input className={inp} value={editProduct.name_zh ?? ''} onChange={e => setEditProduct((p: any) => ({ ...p, name_zh: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    <LangText ko="판매가 (¥)" zh="销售价 (¥)" />
                  </label>
                  <input className={inp} type="number" value={editProduct.sell_price_cny ?? ''} onChange={e => setEditProduct((p: any) => ({ ...p, sell_price_cny: parseFloat(e.target.value) }))} step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    <LangText ko="공급가 (¥)" zh="供货价 (¥)" />
                  </label>
                  <input className={inp} type="number" value={editProduct.supply_price_cny ?? ''} onChange={e => setEditProduct((p: any) => ({ ...p, supply_price_cny: parseFloat(e.target.value) }))} step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">MOQ</label>
                  <input className={inp} type="number" value={editProduct.moq ?? ''} onChange={e => setEditProduct((p: any) => ({ ...p, moq: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    <LangText ko="리드타임 (일)" zh="交货期 (天)" />
                  </label>
                  <input className={inp} type="number" value={editProduct.lead_time_days ?? ''} onChange={e => setEditProduct((p: any) => ({ ...p, lead_time_days: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    <LangText ko="재고 수량" zh="库存数量" />
                  </label>
                  <input className={inp} type="number" value={editProduct.stock_qty ?? 0} onChange={e => setEditProduct((p: any) => ({ ...p, stock_qty: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    <LangText ko="CBM/박스" zh="CBM/箱" />
                  </label>
                  <input className={inp} type="number" value={editProduct.cbm_per_box ?? ''} onChange={e => setEditProduct((p: any) => ({ ...p, cbm_per_box: parseFloat(e.target.value) }))} step="0.00001" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  { key: 'is_featured', ko: '⭐ 추천', zh: '⭐ 推荐' },
                  { key: 'is_new', ko: '🆕 NEW', zh: '🆕 NEW' },
                  { key: 'is_hot', ko: '🔥 HOT', zh: '🔥 HOT' },
                  { key: 'is_active', ko: '✅ 활성', zh: '✅ 激活' },
                ].map(({ key, ko, zh }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editProduct[key] ?? false} onChange={e => setEditProduct((p: any) => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                    <span className="text-sm text-stone-700"><LangText ko={ko} zh={zh} /></span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-stone-100 px-5 py-4 flex gap-3 rounded-b-3xl">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-700 font-bold text-sm hover:bg-stone-200 transition">
                <LangText ko="취소" zh="取消" />
              </button>
              <button onClick={saveEdit} disabled={editLoading} className="flex-1 py-3 rounded-2xl text-white font-bold text-sm transition" style={{ background: editLoading ? '#9ca3af' : '#4f46e5' }}>
                {editLoading ? <LangText ko="저장 중…" zh="保存中…" /> : <LangText ko="저장" zh="保存" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
