'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const brandColor = '#e11d48';
type StatusFilter = 'all' | 'pending_review' | 'under_review' | 'approved' | 'rejected';
type ViewMode = 'list' | 'grid';

const STATUS_TABS = [
  { id: 'all' as StatusFilter, ko: '전체', zh: '全部', color: '#6b7280' },
  { id: 'pending_review' as StatusFilter, ko: '검토대기', zh: '待审核', color: '#f59e0b' },
  { id: 'under_review' as StatusFilter, ko: '검토중', zh: '审核中', color: '#4f46e5' },
  { id: 'approved' as StatusFilter, ko: '승인', zh: '已通过', color: '#10b981' },
  { id: 'rejected' as StatusFilter, ko: '반려됨', zh: '已拒绝', color: '#ef4444' },
];

function statusLabel(s: string): [string, string] {
  const m: Record<string, [string, string]> = {
    pending_review: ['검토 대기', '待审核'],
    under_review: ['검토 중', '审核中'],
    approved: ['승인됨', '已通过'],
    rejected: ['반려됨', '已拒绝'],
    discontinued: ['단종', '已停产'],
  };
  return m[s] ?? [s, s];
}
function statusColor(s: string): string {
  const m: Record<string, string> = {
    approved: '#10b981',
    pending_review: '#f59e0b',
    under_review: '#4f46e5',
    rejected: '#ef4444',
    discontinued: '#9ca3af',
  };
  return m[s] ?? '#9ca3af';
}

export default function FactoryProductsPage() {
  const router = useRouter();
  const supabase = createClient() as any;
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusFilter>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [factoryName, setFactoryName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?role=factory'); return; }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('kind, display_name')
          .eq('id', user.id)
          .single() as { data: any; error: any };

        if (!profile || !['factory', 'admin', 'md'].includes(profile.kind)) {
          router.push('/login?role=factory');
          return;
        }

        // admin/md는 모든 상품 조회, factory는 자신의 상품만
        let query = supabase
          .from('products')
          .select('id, product_code, sku, name_ko, name_zh, category, supply_price_cny, price_cny, moq, approval_status, created_at, image_url, factory_id, is_active, stock_qty, pricing_tiers')
          .order('created_at', { ascending: false })
          .limit(200);

        if (profile.kind === 'factory') {
          const { data: factory, error: factoryErr } = await supabase
            .from('factories')
            .select('id, company_name, company_name_ko')
            .eq('shared_login_user_id', user.id)
            .single() as { data: any; error: any };

          if (factoryErr || !factory) {
            setError('공장 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
            setLoading(false);
            return;
          }
          setFactoryName(factory.company_name_ko || factory.company_name || '');
          query = query.eq('factory_id', factory.id);
        }

        const { data: prods, error: prodsErr } = await query as { data: any[]; error: any };

        if (prodsErr) {
          setError(`상품 조회 오류: ${prodsErr.message}`);
          setLoading(false);
          return;
        }

        setProducts(prods ?? []);
      } catch (e: any) {
        setError(e.message ?? '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts: Record<string, number> = { all: products.length };
  STATUS_TABS.slice(1).forEach(t => {
    counts[t.id] = products.filter(p => (p.approval_status ?? 'pending_review') === t.id).length;
  });

  const filtered = products
    .filter(p => tab === 'all' || (p.approval_status ?? 'pending_review') === tab)
    .filter(p =>
      !search ||
      (p.name_ko ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.name_zh ?? '').includes(search) ||
      (p.product_code ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
    );

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-tertiary)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 15, color: '#ef4444', marginBottom: 8 }}>{error}</div>
      <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: 8, background: brandColor, color: '#fff', border: 'none', cursor: 'pointer' }}>
        <LangText ko="다시 시도" zh="重试" />
      </button>
    </div>
  );

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            <LangText ko="제품 관리" zh="产品管理" />
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {factoryName && <span style={{ marginRight: 6, color: brandColor, fontWeight: 600 }}>{factoryName}</span>}
            <LangText ko={`총 ${products.length}개`} zh={`共 ${products.length} 件`} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
            {(['list', 'grid'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '6px 10px', background: view === v ? brandColor : 'var(--bg-base)', color: view === v ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                {v === 'list' ? '☰' : '⊞'}
              </button>
            ))}
          </div>
          <Link href="/factory/products/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 'var(--radius-lg)', background: brandColor, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            + <LangText ko="등록" zh="登记" />
          </Link>
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="제품명, 코드, SKU 검색... / 搜索产品名、编号..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-light)', background: 'var(--bg-base)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* 상태 탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {STATUS_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 99, border: `1.5px solid ${tab === t.id ? t.color : 'var(--border-light)'}`, background: tab === t.id ? `${t.color}15` : 'var(--bg-base)', color: tab === t.id ? t.color : 'var(--text-secondary)', fontSize: 12, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LangText ko={t.ko} zh={t.zh} />
            <span style={{ background: tab === t.id ? t.color : 'var(--border-light)', color: tab === t.id ? '#fff' : 'var(--text-tertiary)', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* 상품 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: 'var(--bg-base)', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border-default)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
            <LangText
              ko={tab === 'all' ? '등록된 제품이 없습니다' : '해당 상태의 제품이 없습니다'}
              zh={tab === 'all' ? '暂无登记产品' : '没有该状态的产品'}
            />
          </div>
          {tab === 'all' && (
            <Link href="/factory/products/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: '14px', background: `linear-gradient(135deg, ${brandColor}, #be123c)`, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700 }}>
              ➕ <LangText ko="첫 제품 등록하기" zh="登记第一件产品" />
            </Link>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((p: any) => {
            const [koLabel, zhLabel] = statusLabel(p.approval_status ?? 'pending_review');
            const color = statusColor(p.approval_status ?? 'pending_review');
            const price = p.supply_price_cny ?? p.price_cny ?? 0;
            return (
              <div key={p.id} onClick={() => router.push(`/factory/products/${p.id}`)} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                <div style={{ width: '100%', paddingTop: '75%', position: 'relative', background: 'var(--bg-muted)' }}>
                  {p.image_url
                    ? <Image src={p.image_url} alt="" fill style={{ objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 32 }}>📦</div>
                  }
                  <span style={{ position: 'absolute', top: 6, right: 6, background: `${color}ee`, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99 }}>
                    <LangText ko={koLabel} zh={zhLabel} />
                  </span>
                </div>
                <div style={{ padding: '10px 10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <LangText ko={p.name_ko ?? p.name_zh ?? '-'} zh={p.name_zh ?? p.name_ko ?? '-'} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>{p.product_code ?? p.sku ?? '-'}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: brandColor }}>¥{Number(price).toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p: any) => {
            const [koLabel, zhLabel] = statusLabel(p.approval_status ?? 'pending_review');
            const color = statusColor(p.approval_status ?? 'pending_review');
            const price = p.supply_price_cny ?? p.price_cny ?? 0;
            return (
              <div key={p.id} onClick={() => router.push(`/factory/products/${p.id}`)} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-xs)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)'; }}>
                <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '10px', background: 'var(--bg-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden', position: 'relative' }}>
                    {p.image_url ? <Image src={p.image_url} alt="" fill style={{ objectFit: 'cover' }} /> : '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>{p.product_code ?? p.sku ?? '-'}</span>
                      <span style={{ background: `${color}18`, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: `1px solid ${color}30` }}>
                        <LangText ko={koLabel} zh={zhLabel} />
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <LangText ko={p.name_ko ?? p.name_zh ?? '-'} zh={p.name_zh ?? p.name_ko ?? '-'} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {p.category && <span>{p.category}</span>}
                        {p.moq && <span> · MOQ {p.moq}</span>}
                        {p.stock_qty != null && <span> · {t('재고', '库存')} {p.stock_qty}</span>}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: brandColor }}>¥{Number(price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB 버튼 */}
      <Link href="/factory/products/new" style={{ position: 'fixed', bottom: 80, right: 20, width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${brandColor}, #be123c)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, textDecoration: 'none', boxShadow: '0 4px 16px rgba(225,29,72,0.4)', zIndex: 50 }}>
        ➕
      </Link>
    </div>
  );
}
