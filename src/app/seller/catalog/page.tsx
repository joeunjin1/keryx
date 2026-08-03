'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';


const brandColor = '#f97316';

export default function SellerCatalogPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('셀러');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [interestIds, setInterestIds] = useState<Set<string>>(new Set());
  const [sellerId, setSellerId] = useState<string>('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'md_pick' | 'interested'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }
      const { data: profile } = await supabase.from('user_profiles').select('kind, display_name').eq('id', user.id).single();
      if (!profile || !['seller', 'admin'].includes(profile.kind)) { router.push('/login?role=seller'); return; }
      const { data: seller } = await supabase.from('sellers').select('id, business_name, current_grade').eq('user_id', user.id).single();
      const sid = seller?.id ?? '';
      setSellerId(sid);
      setDisplayName(seller?.business_name ?? profile.display_name ?? '셀러');
      const [recRes, intRes] = await Promise.all([
        supabase.from('brief_responses')
          .select(`id, price_cny, moq, notes_ko, notes_zh, selected_for_seller, created_at,
            product:factory_products(id, name_ko, name_zh, category, price_cny, moq, product_code, image_urls,
              factory:factories(company_name, company_name_ko)),
            brief:briefs(id, brief_no, title_ko, title_zh)`)
          .eq('seller_id', sid)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('seller_interests').select('product_id').eq('seller_id', sid),
      ]);
      setRecommendations(recRes.data ?? []);
      setInterestIds(new Set((intRes.data ?? []).map((i: any) => i.product_id)));
      setLoading(false);
    })();
  }, []);

  async function toggleInterest(productId: string) {
    if (!sellerId || togglingId) return;
    setTogglingId(productId);
    const isInterested = interestIds.has(productId);
    if (isInterested) {
      await supabase.from('seller_interests').delete().eq('seller_id', sellerId).eq('product_id', productId);
      setInterestIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
    } else {
      await supabase.from('seller_interests').upsert({ seller_id: sellerId, product_id: productId });
      setInterestIds(prev => new Set([...prev, productId]));
    }
    setTogglingId(null);
  }

  const filtered = useMemo(() => {
    let list = [...recommendations];
    if (filterTab === 'md_pick') list = list.filter(r => r.selected_for_seller);
    if (filterTab === 'interested') list = list.filter(r => interestIds.has(r.product?.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => {
        const p = r.product;
        return (p?.name_ko ?? '').toLowerCase().includes(q) ||
          (p?.name_zh ?? '').toLowerCase().includes(q) ||
          (p?.factory?.company_name_ko ?? '').toLowerCase().includes(q) ||
          (p?.factory?.company_name ?? '').toLowerCase().includes(q) ||
          (p?.category ?? '').toLowerCase().includes(q);
      });
    }
    if (sortBy === 'price_asc') list.sort((a, b) => (a.price_cny ?? a.product?.price_cny ?? 0) - (b.price_cny ?? b.product?.price_cny ?? 0));
    if (sortBy === 'price_desc') list.sort((a, b) => (b.price_cny ?? b.product?.price_cny ?? 0) - (a.price_cny ?? a.product?.price_cny ?? 0));
    return list;
  }, [recommendations, filterTab, searchQuery, sortBy, interestIds]);

  if (loading) return (
      <div className="text-center px-6 py-20 text-[var(--text-tertiary)]">
        <div className="text-[32px] mb-3">⏳</div>
        <LangText ko="로딩 중..." zh="加载中..." />
      </div>
  );

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            <LangText ko="제품 카탈로그" zh="推荐产品目录" />
          </h1>
          <div className="flex gap-1">
            <button onClick={() => setViewMode('card')} className="rounded-lg border-none text-[13px] cursor-pointer py-[6px] px-[10px]" style={{ background: viewMode === 'card' ? brandColor : 'var(--bg-subtle)', color: viewMode === 'card' ? '#fff' : 'var(--text-secondary)' }}>⊞
              </button>
            <button onClick={() => setViewMode('list')} className="rounded-lg border-none text-[13px] cursor-pointer py-[6px] px-[10px]" style={{ background: viewMode === 'list' ? brandColor : 'var(--bg-subtle)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)' }}>☰
              </button>
          </div>
        </div>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          <LangText ko={`총 ${recommendations.length}개 추천 제품`} zh={`共 ${recommendations.length} 件推荐产品`} />
        </p>
      </div>


      <div className="relative mb-3">
        <span className="absolute left-3 text-sm text-[var(--text-tertiary)] translate-y-[-50%]" style={{ top: '50%' }}>🔍
              </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="제품명, 공장명, 카테고리 검색..."
          className="w-full rounded-xl bg-[var(--bg-base)] text-sm text-[var(--text-primary)] outline-none border-[1.5px] border-[var(--border-default)]" style={{ padding: '10px 12px 10px 36px', boxSizing: 'border-box' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2.5 border-none text-base cursor-pointer text-[var(--text-tertiary)] translate-y-[-50%]" style={{ top: '50%', background: 'none' }}>✕
              </button>
        )}
      </div>


      <div className="flex gap-2 mb-3 overflow-x-auto items-center" style={{ paddingBottom: 2 }}>
        {[
          { id: 'all', label: '전체', labelZh: '全部', count: recommendations.length },
          { id: 'md_pick', label: 'MD 추천', labelZh: 'MD推荐', count: recommendations.filter(r => r.selected_for_seller).length },
          { id: 'interested', label: '관심상품', labelZh: '收藏', count: interestIds.size },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilterTab(tab.id as any)} className="flex items-center border-none text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap py-[7px] px-[14px]" style={{ gap: 5, borderRadius: 99, background: filterTab === tab.id ? brandColor : 'var(--bg-subtle)', color: filterTab === tab.id ? '#fff' : 'var(--text-secondary)' }}>
            <LangText ko={tab.label} zh={tab.labelZh} />
            <span className="text-[10px] font-bold py-[1px] px-[5px]" style={{ background: filterTab === tab.id ? 'rgba(255,255,255,0.3)' : 'var(--border-default)', color: filterTab === tab.id ? '#fff' : 'var(--text-tertiary)', borderRadius: 99 }}>{tab.count}
              </span>
          </button>
        ))}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="ml-auto bg-[var(--bg-base)] text-xs text-[var(--text-secondary)] cursor-pointer shrink-0 py-[7px] px-[10px] border border-[var(--border-default)]" style={{ borderRadius: 99 }}>
          <option value="newest">최신순</option>
          <option value="price_asc">가격 낮은순</option>
          <option value="price_desc">가격 높은순</option>
        </select>
      </div>


      <Link href="/seller/interests" className="flex items-center gap-3 px-4 py-3 no-underline mb-4 bg-[#fef2f2] border border-[#fecaca] rounded-[var(--radius-lg)]">
        <span className="text-xl">❤️</span>
        <div>
          <div className="text-[13px] font-bold text-[#dc2626]"><LangText ko="관심 상품 목록" zh="收藏商品列表" /></div>
          <div className="text-[11px] text-danger-500"><LangText ko={`${interestIds.size}개 저장됨`} zh={`已保存 ${interestIds.size} 件`} /></div>
        </div>
        <span className="ml-auto text-rose-500">→</span>
      </Link>


      {filtered.length === 0 ? (
        <div className="text-center px-6 py-12 bg-[var(--bg-base)] border border-[var(--border-light)] rounded-[var(--radius-lg)]">
          <div className="text-[40px] mb-3">{recommendations.length === 0 ? '📦' : '🔍'}</div>
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            <LangText ko={recommendations.length === 0 ? '아직 추천된 제품이 없습니다' : '검색 결과가 없습니다'} zh={recommendations.length === 0 ? '还没有推荐的产品' : '没有搜索结果'} />
          </div>
          {recommendations.length === 0 && (
            <Link href="/seller/research/new" className="inline-block mt-4 px-5 py-2.5 text-white no-underline text-[13px] font-semibold rounded-[var(--radius-lg)]" style={{ background: brandColor }}>
              + <LangText ko="시장조사 요청" zh="申请市场调研" />
            </Link>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((r: any) => {
            const product = r.product;
            const isInterested = interestIds.has(product?.id);
            const price = r.price_cny ?? product?.price_cny;
            const imgUrl = product?.image_urls?.[0];
            return (
              <div key={r.id} className="bg-[var(--bg-base)] overflow-hidden relative shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]" style={{ border: `1px solid ${r.selected_for_seller ? brandColor : 'var(--border-light)'}` }}>
                <div className="w-full bg-[var(--bg-subtle)] relative overflow-hidden" style={{ aspectRatio: '1' }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={product?.name_ko ?? ''} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[32px]">📦
              </div>
                  )}
                  {r.selected_for_seller && (
                    <div className="absolute top-1.5 left-1.5 text-white font-bold py-[2px] px-[7px] text-[9px]" style={{ background: brandColor, borderRadius: 99 }}>MD추천</div>
                  )}
                  <button onClick={() => toggleInterest(product?.id)} disabled={togglingId === product?.id} className="absolute top-1.5 right-1.5 border-none rounded-full w-7 h-7 flex items-center justify-center text-sm cursor-pointer bg-[rgba(255,255,255,0.9)] shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
                    {isInterested ? '❤️' : '🤍'}
                  </button>
                </div>
                <div className="pt-[10px] px-[10px] pb-3">
                  <div className="text-xs font-bold text-[var(--text-primary)] mb-0.5 leading-[1.3]">
                    {product?.name_ko ?? product?.name_zh ?? '-'}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] mb-1.5">
                    {product?.factory?.company_name_ko ?? product?.factory?.company_name}
                  </div>
                  <div className="text-[15px] font-extrabold" style={{ color: brandColor }}>¥{price}</div>
                  <div className="text-[var(--text-tertiary)] text-[9px]">MOQ {r.moq ?? product?.moq}</div>
                  {product?.id && (
                    <Link
                      href={`/seller/service-requests/new?type=order&product_id=${product.id}`}
                      className="mt-2 block w-full text-center text-[11px] font-bold text-white py-[7px] rounded-lg no-underline"
                      style={{ background: brandColor }}
                    >
                      {t('주문하기', '立即订购')}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r: any) => {
            const product = r.product;
            const isInterested = interestIds.has(product?.id);
            const price = r.price_cny ?? product?.price_cny;
            const imgUrl = product?.image_urls?.[0];
            return (
              <div key={r.id} className="bg-[var(--bg-base)] flex gap-3 items-start py-3 px-[14px] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]" style={{ border: `1px solid ${r.selected_for_seller ? brandColor : 'var(--border-light)'}` }}>
                <div className="w-16 h-16 rounded-[10px] bg-[var(--bg-subtle)] shrink-0 overflow-hidden flex items-center justify-center">
                  {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span className="text-2xl">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {r.selected_for_seller && <span className="text-[10px] font-bold mb-1 inline-block py-[2px] px-[7px]" style={{ background: `${brandColor}15`, color: brandColor, borderRadius: 99 }}>✓ MD추천</span>}
                      <div className="text-sm font-bold text-[var(--text-primary)] mb-0.5">{product?.name_ko ?? product?.name_zh ?? '-'}
              </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mb-1">
                        {product?.factory?.company_name_ko ?? product?.factory?.company_name}
                        {product?.category && ` · ${product.category}`}
                      </div>
                      {r.notes_ko && <div className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-subtle)] rounded-lg mb-1.5 py-[6px] px-2">💬 {r.notes_ko}</div>}
                      <div className="flex items-center gap-2">
                        <div className="text-[15px] font-extrabold" style={{ color: brandColor }}>¥{price}</div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">MOQ {r.moq ?? product?.moq}
              </div>
                      </div>
                    </div>
                    <button onClick={() => toggleInterest(product?.id)} disabled={togglingId === product?.id} className="border-none text-[22px] cursor-pointer p-1 shrink-0" style={{ background: 'none' }}>
                      {isInterested ? '❤️' : '🤍'}
                    </button>
                  </div>
                  {r.brief && <div className="mt-1.5 text-[10px] text-[var(--text-tertiary)] border-t border-[var(--border-light)]" style={{ paddingTop: 6 }}>📋 {r.brief.brief_no} · {r.brief.title_ko ?? r.brief.title_zh}</div>}
                  {product?.id && (
                    <Link
                      href={`/seller/service-requests/new?type=order&product_id=${product.id}`}
                      className="mt-2 block w-full text-center text-[11px] font-bold text-white py-[6px] rounded-lg no-underline"
                      style={{ background: brandColor }}
                    >
                      {t('주문하기', '立即订购')}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
