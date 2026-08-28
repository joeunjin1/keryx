'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Grid2X2, List, Pencil, Search, Store, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';
import { formatKrw } from '@/lib/retail/types';

type ViewMode = 'grid' | 'list';
type RetailStatus = 'draft' | 'active' | 'sold_out' | 'paused' | 'archived';

type AdminRetailProduct = {
  id: string;
  product_code: string | null;
  name_ko: string | null;
  name_zh: string | null;
  category: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  approval_status: string | null;
  is_active: boolean | null;
  retail_visible: boolean;
  retail_price_krw: number | null;
  retail_stock_qty: number;
  retail_reserved_qty: number;
  retail_shipping_policy: 'included' | 'fixed' | 'collect';
  retail_shipping_fee_krw: number | null;
  retail_sale_status: RetailStatus;
  retail_description_ko: string;
  retail_description_zh: string;
};

const initialProduct = (product: AdminRetailProduct): AdminRetailProduct => ({
  ...product,
  retail_price_krw: product.retail_price_krw ?? null,
  retail_stock_qty: product.retail_stock_qty ?? 0,
  retail_reserved_qty: product.retail_reserved_qty ?? 0,
  retail_shipping_policy: product.retail_shipping_policy || 'collect',
  retail_shipping_fee_krw: product.retail_shipping_fee_krw ?? null,
  retail_sale_status: product.retail_sale_status || 'draft',
  retail_description_ko: product.retail_description_ko || '',
  retail_description_zh: product.retail_description_zh || '',
});

export default function AdminRetailProductsPage() {
  const router = useRouter();
  const { lang } = useLangContext();
  const korean = lang !== 'zh';
  const t = (ko: string, zh: string) => korean ? ko : zh;
  const [products, setProducts] = useState<AdminRetailProduct[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'retail' | 'ready'>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminRetailProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient() as any;

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('products')
      .select('id, product_code, name_ko, name_zh, category, image_url, image_urls, approval_status, is_active, retail_visible, retail_price_krw, retail_stock_qty, retail_reserved_qty, retail_shipping_policy, retail_shipping_fee_krw, retail_sale_status, retail_description_ko, retail_description_zh')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (loadError) setError(t('상품 정보를 불러오지 못했습니다.', '无法加载商品信息。'));
    else setProducts((data || []).map(initialProduct));
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?next=/admin/retail-products'); return; }
      const { data: profile } = await supabase.from('user_profiles').select('kind').eq('id', user.id).maybeSingle();
      if (profile?.kind !== 'admin') { router.replace('/admin'); return; }
      load();
    })();
  }, []);

  const filtered = useMemo(() => products.filter((product) => {
    const text = `${product.name_ko || ''} ${product.name_zh || ''} ${product.product_code || ''}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (filter === 'retail') return product.retail_visible;
    if (filter === 'ready') return !product.retail_visible && product.approval_status === 'approved' && product.is_active;
    return true;
  }), [products, query, filter]);

  const save = async () => {
    if (!editing) return;
    const canPublish = editing.retail_price_krw !== null
      && editing.retail_price_krw >= 0
      && editing.retail_stock_qty >= 0
      && (editing.retail_shipping_policy === 'included' || (editing.retail_shipping_policy === 'fixed' && editing.retail_shipping_fee_krw !== null && editing.retail_shipping_fee_krw >= 0));
    if (editing.retail_visible && !canPublish) {
      setError(t('공개 판매에는 원화 가격, 소매 재고, 배송 조건을 모두 입력해야 합니다.', '公开销售前必须填写韩元价格、零售库存和配送条件。'));
      return;
    }
    if (editing.retail_visible && (!editing.is_active || editing.approval_status !== 'approved')) {
      setError(t('기존 B2B 상품이 최종 승인·활성 상태여야 소매 판매를 공개할 수 있습니다.', '现有 B2B 商品须为最终审核通过且启用状态，才能公开零售。'));
      return;
    }
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(t('로그인 세션을 확인하지 못했습니다. 다시 로그인해 주세요.', '无法确认登录会话，请重新登录。'));
      setSaving(false);
      return;
    }
    const { data, error: saveError } = await supabase.rpc('update_retail_product_settings', {
      p_actor_user_id: user.id,
      p_product_id: editing.id,
      p_retail_visible: editing.retail_visible,
      p_retail_price_krw: editing.retail_price_krw,
      p_retail_stock_qty: editing.retail_stock_qty,
      p_retail_shipping_policy: editing.retail_shipping_policy,
      p_retail_shipping_fee_krw: editing.retail_shipping_policy === 'fixed' ? editing.retail_shipping_fee_krw : null,
      p_retail_sale_status: editing.retail_sale_status,
      p_retail_description_ko: editing.retail_description_ko,
      p_retail_description_zh: editing.retail_description_zh,
    });
    if (saveError || !data) setError(t('저장하지 못했습니다. 관리자 권한과 공개 조건을 확인해 주세요.', '无法保存。请确认管理员权限及公开条件。'));
    else {
      setProducts((current) => current.map((product) => product.id === editing.id ? initialProduct(data) : product));
      setEditing(null);
      setNotice(t('소매 판매 설정을 저장했습니다.', '零售设置已保存。'));
      window.setTimeout(() => setNotice(''), 3000);
    }
    setSaving(false);
  };

  const renderProduct = (product: AdminRetailProduct) => {
    const image = product.image_urls?.[0] || product.image_url;
    const name = korean ? product.name_ko || product.name_zh || '-' : product.name_zh || product.name_ko || '-';
    const sellable = product.retail_visible && product.retail_sale_status === 'active';
    const available = Math.max(0, product.retail_stock_qty - product.retail_reserved_qty);
    return <article key={product.id} className={`rounded-3xl border bg-white shadow-sm ${view === 'list' ? 'flex gap-4 p-4' : 'overflow-hidden'}`}>
      <div className={view === 'list' ? 'relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-stone-100' : 'relative aspect-square bg-stone-100'}>{image ? <Image src={image} alt={name} fill sizes={view === 'list' ? '96px' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'} className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-bold text-stone-400">NO IMAGE</div>}</div>
      <div className={view === 'list' ? 'min-w-0 flex-1' : 'p-4'}><div className="flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${sellable ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{sellable ? t('판매 중', '销售中') : t('판매 준비', '销售准备')}</span>{product.category && <span className="text-[10px] font-bold text-stone-400">{product.category}</span>}</div><h2 className="mt-2 line-clamp-2 text-sm font-black leading-snug text-stone-950">{name}</h2><p className="mt-2 text-sm font-black text-stone-950">{product.retail_price_krw !== null ? formatKrw(product.retail_price_krw) : t('가격 미설정', '未设置价格')}</p><p className="mt-1 text-xs text-stone-500">{t('판매 가능', '可售库存')} {available}</p><button type="button" onClick={() => { setEditing(initialProduct(product)); setError(''); }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 transition hover:bg-stone-100 active:scale-95"><Pencil className="h-3.5 w-3.5" />{t('소매 설정', '零售设置')}</button></div>
    </article>;
  };

  return <div className="mx-auto max-w-screen-2xl p-4 sm:p-6"><div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black tracking-[0.16em] text-orange-700">RETAIL COMMERCE</p><h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950">{t('소매 상품 관리', '零售商品管理')}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{t('기존 B2B 상품을 보존하면서, 실제 판매할 상품만 원화 가격·재고·배송 조건을 입력해 스토어에 공개합니다.', '保留现有 B2B 商品，仅为实际销售的商品设置韩元价格、库存和配送条件后公开到商店。')}</p></div><Link href="/shop" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-bold text-white no-underline active:scale-95"><Store className="h-4 w-4" />{t('스토어 보기', '查看商店')}</Link></div>{notice && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p>}{error && !editing && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}<div className="mt-6 flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-stone-50 px-3"><Search className="h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('상품명 또는 상품 코드 검색', '搜索商品名称或代码')} className="min-h-11 w-full bg-transparent text-sm outline-none" /></div><div className="flex gap-2 overflow-x-auto"><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"><option value="all">{t('전체', '全部')}</option><option value="retail">{t('스토어 공개 상품', '商店公开商品')}</option><option value="ready">{t('공개 준비 가능', '可准备公开')}</option></select><div className="flex overflow-hidden rounded-xl border border-stone-200"><button type="button" onClick={() => setView('grid')} className={`flex h-11 w-11 items-center justify-center ${view === 'grid' ? 'bg-stone-950 text-white' : 'bg-white text-stone-500'}`} aria-label="카드 보기"><Grid2X2 className="h-4 w-4" /></button><button type="button" onClick={() => setView('list')} className={`flex h-11 w-11 items-center justify-center ${view === 'list' ? 'bg-stone-950 text-white' : 'bg-white text-stone-500'}`} aria-label="목록 보기"><List className="h-4 w-4" /></button></div></div></div>{loading ? <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-3xl bg-stone-200" />)}</div> : <div className={`mt-6 gap-4 ${view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid grid-cols-1'}`}>{filtered.map(renderProduct)}</div>}{!loading && filtered.length === 0 && <div className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-sm text-stone-500">{t('조건에 맞는 상품이 없습니다.', '没有符合条件的商品。')}</div>}{editing && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-950/50 p-0 sm:items-center sm:p-6"><section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4"><div><p className="text-xs font-bold text-orange-700">RETAIL SETTINGS</p><h2 className="mt-1 text-lg font-black">{korean ? editing.name_ko || editing.name_zh : editing.name_zh || editing.name_ko}</h2></div><button type="button" onClick={() => { setEditing(null); setError(''); }} className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100" aria-label="닫기"><X className="h-5 w-5" /></button></div><div className="space-y-6 p-5"><p className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-orange-950">{t('기존 B2B 원가·공장 정보는 수정하거나 공개하지 않습니다. 여기서 입력한 원화 가격·소매 재고·설명만 소비자 쇼핑몰에 사용됩니다.', '不会修改或公开现有 B2B 成本和工厂信息。消费者商店仅使用此处填写的韩元价格、零售库存和说明。')}</p><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">{t('원화 판매가', '韩元售价')}<input type="number" min="0" value={editing.retail_price_krw ?? ''} onChange={(event) => setEditing({ ...editing, retail_price_krw: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 px-3 outline-none focus:ring-2 focus:ring-stone-200" /></label><label className="text-sm font-bold">{t('소매 재고', '零售库存')}<input type="number" min="0" value={editing.retail_stock_qty} onChange={(event) => setEditing({ ...editing, retail_stock_qty: Math.max(editing.retail_reserved_qty, Number(event.target.value)) })} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 px-3 outline-none focus:ring-2 focus:ring-stone-200" /></label><label className="text-sm font-bold">{t('배송 정책', '配送政策')}<select value={editing.retail_shipping_policy} onChange={(event) => setEditing({ ...editing, retail_shipping_policy: event.target.value as AdminRetailProduct['retail_shipping_policy'] })} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 outline-none focus:ring-2 focus:ring-stone-200"><option value="included">{t('상품가에 배송비 포함', '商品价格含运费')}</option><option value="fixed">{t('고정 배송비', '固定运费')}</option><option value="collect">{t('배송비 추후 안내', '运费另行通知')}</option></select></label>{editing.retail_shipping_policy === 'fixed' && <label className="text-sm font-bold">{t('고정 배송비', '固定运费')}<input type="number" min="0" value={editing.retail_shipping_fee_krw ?? ''} onChange={(event) => setEditing({ ...editing, retail_shipping_fee_krw: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 px-3 outline-none focus:ring-2 focus:ring-stone-200" /></label>}<label className="text-sm font-bold">{t('판매 상태', '销售状态')}<select value={editing.retail_sale_status} onChange={(event) => setEditing({ ...editing, retail_sale_status: event.target.value as RetailStatus })} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3 outline-none focus:ring-2 focus:ring-stone-200"><option value="draft">{t('초안', '草稿')}</option><option value="active">{t('판매 중', '销售中')}</option><option value="sold_out">{t('품절', '售罄')}</option><option value="paused">{t('판매 중지', '暂停销售')}</option><option value="archived">{t('보관', '归档')}</option></select></label></div><label className="block text-sm font-bold">{t('상품 설명 (한국어)', '商品说明（韩文）')}<textarea value={editing.retail_description_ko} onChange={(event) => setEditing({ ...editing, retail_description_ko: event.target.value })} className="mt-1.5 min-h-28 w-full rounded-xl border border-stone-200 p-3 outline-none focus:ring-2 focus:ring-stone-200" maxLength={2000} /></label><label className="block text-sm font-bold">{t('상품 설명 (중국어)', '商品说明（中文）')}<textarea value={editing.retail_description_zh} onChange={(event) => setEditing({ ...editing, retail_description_zh: event.target.value })} className="mt-1.5 min-h-28 w-full rounded-xl border border-stone-200 p-3 outline-none focus:ring-2 focus:ring-stone-200" maxLength={2000} /></label><label className="flex min-h-12 items-center gap-3 rounded-2xl border border-stone-200 p-4 text-sm font-bold"><input type="checkbox" checked={editing.retail_visible} onChange={(event) => setEditing({ ...editing, retail_visible: event.target.checked })} className="h-5 w-5" />{t('KERYX 스토어에 공개', '公开到 KERYX 商店')}</label>{error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}</div><div className="sticky bottom-0 flex gap-3 border-t border-stone-200 bg-white p-5"><button type="button" onClick={() => { setEditing(null); setError(''); }} className="min-h-12 flex-1 rounded-xl bg-stone-100 text-sm font-bold text-stone-700">{t('취소', '取消')}</button><button type="button" onClick={save} disabled={saving} className="min-h-12 flex-1 rounded-xl bg-stone-950 text-sm font-bold text-white disabled:bg-stone-300">{saving ? t('저장 중...', '保存中...') : t('저장', '保存')}</button></div></section></div>}</div>;
}
