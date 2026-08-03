'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

type StatusFilter = 'all' | 'pending' | 'reviewing' | 'preparing' | 'shipped' | 'delivered';

const STATUS_TABS = [
  { id: 'all' as StatusFilter, ko: '전체', zh: '全部', color: '#6b7280' },
  { id: 'pending' as StatusFilter, ko: '대기', zh: '待处理', color: '#f59e0b' },
  { id: 'reviewing' as StatusFilter, ko: '검토중', zh: '审核中', color: '#4f46e5' },
  { id: 'preparing' as StatusFilter, ko: '준비중', zh: '准备中', color: '#06b6d4' },
  { id: 'shipped' as StatusFilter, ko: '발송됨', zh: '已发货', color: '#8b5cf6' },
  { id: 'delivered' as StatusFilter, ko: '수령됨', zh: '已签收', color: '#10b981' },
];

function statusLabel(s: string): [string, string] {
  const m: Record<string, [string, string]> = {
    pending: ['대기', '待处理'], reviewing: ['검토중', '审核中'],
    preparing: ['준비중', '准备中'], shipped: ['발송됨', '已发货'],
    delivered: ['수령됨', '已签收'], rejected: ['거절됨', '已拒绝'],
  };
  return m[s] ?? [s, s];
}

function statusColor(s: string): string {
  const m: Record<string, string> = {
    pending: '#f59e0b', reviewing: '#4f46e5', preparing: '#06b6d4',
    shipped: '#8b5cf6', delivered: '#10b981', rejected: '#ef4444',
  };
  return m[s] ?? '#9ca3af';
}

const brandColor = '#10b981';

export default function MdSamplesPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '샘플 관리 | KERYX';
  }, []);

  const router = useRouter();
  const supabase = createClient() as any;
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, { carrier: string; number: string }>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: profile } = await supabase
        .from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };
      if (!profile || !['md', 'admin'].includes(profile.kind)) { router.push('/admin'); return; }
      const { data: me } = await supabase
        .from('internal_users').select('id').eq('user_id', user.id).single() as { data: any; error: any };
      setMyId(me?.id ?? null);

      const { data } = await supabase
        .from('sample_requests')
        .select(`id, request_no, status, quantity, shipping_address, shipping_name, shipping_phone,
           memo, admin_note, tracking_number, shipping_carrier, shipped_at, created_at,
           product_name_snapshot, product_image_snapshot,
           seller:sellers(company_name, company_name_ko),
           product:products(id, product_code, name_ko, name_zh)`)
        .order('created_at', { ascending: false })
        .limit(200) as { data: any[]; error: any };
      setSamples(data ?? []);
      setLoading(false);
    })();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setActionLoading(id);
    const updates: any = { status: newStatus };
    if (newStatus === 'reviewing' && myId) {
      updates.assigned_md_id = myId;
    }
    if (newStatus === 'shipped') {
      const td = trackingData[id];
      if (td?.number) {
        updates.tracking_number = td.number;
        updates.shipping_carrier = td.carrier || null;
        updates.shipped_at = new Date().toISOString();
      }
    }
    await supabase.from('sample_requests').update(updates).eq('id', id);
    setSamples(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setActionLoading(null);
    setExpandedId(null);
  };

  const counts: Record<string, number> = { all: samples.length };
  STATUS_TABS.slice(1).forEach(t => { counts[t.id] = samples.filter(s => s.status === t.id).length; });

  const filtered = samples
    .filter(s => tab === 'all' || s.status === tab)
    .filter(s => !search ||
      (s.request_no ?? '').includes(search) ||
      (s.product_name_snapshot ?? '').includes(search) ||
      (s.product?.name_ko ?? '').includes(search) ||
      (s.seller?.company_name_ko ?? '').includes(search)
    );

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-tertiary)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  return (
    <div>

      <div className="mb-5">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          <LangText ko="샘플 요청 처리" zh="样品申请处理" />
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          <LangText ko={`총 ${samples.length}건`} zh={`共 ${samples.length} 件`} />
          {counts['pending'] > 0 && (
            <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 8 }}>
              · <LangText ko={`대기 ${counts['pending']}건`} zh={`待处理 ${counts['pending']} 件`} />
            </span>
          )}
        </p>
      </div>


      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="요청번호, 상품명, 바이어명으로 검색..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)', background: 'var(--bg-base)',
            fontSize: 14, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>


      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', flexShrink: 0,
              background: tab === t.id ? t.color : 'var(--bg-subtle)',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600,
            }}
          >
            <LangText ko={t.ko} zh={t.zh} />
            <span style={{
              background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-base)',
              color: tab === t.id ? '#fff' : 'var(--text-tertiary)',
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
            }}>
              {counts[t.id] ?? 0}
            </span>
          </button>
        ))}
      </div>


      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            <LangText ko="샘플 요청이 없습니다" zh="没有样品申请" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s: any) => {
            const [koLabel, zhLabel] = statusLabel(s.status);
            const color = statusColor(s.status);
            const isExpanded = expandedId === s.id;
            const productName = s.product_name_snapshot ?? s.product?.name_ko ?? s.product?.name_zh ?? '-';
            return (
              <div key={s.id} style={{
                background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)', padding: '14px 16px',
                borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {s.product_image_snapshot && (
                    <Image src={s.product_image_snapshot} alt="" width={44} height={44} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{s.request_no ?? s.id.slice(0, 8)}
              </span>
                      <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>
                        <LangText ko={koLabel} zh={zhLabel} />
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{productName}
              </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {s.seller?.company_name_ko ?? s.seller?.company_name ?? '-'}
                      {s.quantity && ` · ${s.quantity}개`}
                    </div>
                    {s.created_at && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {new Date(s.created_at).toLocaleDateString('ko')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-light)',
                      background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 12, paddingTop: 12 }}>
                    {s.shipping_name && (
                      <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                          <LangText ko="배송 정보" zh="配送信息" />
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.shipping_name} · {s.shipping_phone}
              </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{s.shipping_address}
              </div>
                      </div>
                    )}
                    {s.memo && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: '#fef3c7', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
                        💬 {s.memo}
                      </div>
                    )}
                    {s.status === 'preparing' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <input
                          type="text"
                          value={trackingData[s.id]?.carrier ?? ''}
                          onChange={e => setTrackingData(prev => ({ ...prev, [s.id]: { ...prev[s.id], carrier: e.target.value } }))}
                          placeholder="택배사"
                          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', fontSize: 12, boxSizing: 'border-box' }}
                        />
                        <input
                          type="text"
                          value={trackingData[s.id]?.number ?? ''}
                          onChange={e => setTrackingData(prev => ({ ...prev, [s.id]: { ...prev[s.id], number: e.target.value } }))}
                          placeholder="운송장 번호"
                          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', fontSize: 12, boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                    {s.tracking_number && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                        🚚 {s.shipping_carrier ?? ''} {s.tracking_number}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {s.status === 'pending' && (
                        <button onClick={() => handleStatusUpdate(s.id, 'reviewing')} disabled={actionLoading === s.id}
                          style={{ flex: 1, minWidth: 80, padding: '8px', borderRadius: 8, border: 'none', background: '#ede9fe', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          🔍 <LangText ko="검토 시작" zh="开始审核" />
                        </button>
                      )}
                      {s.status === 'reviewing' && (
                        <button onClick={() => handleStatusUpdate(s.id, 'preparing')} disabled={actionLoading === s.id}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#cffafe', color: '#0e7490', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          📦 <LangText ko="준비중" zh="准备中" />
                        </button>
                      )}
                      {s.status === 'preparing' && (
                        <button onClick={() => handleStatusUpdate(s.id, 'shipped')} disabled={actionLoading === s.id}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#ede9fe', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          🚚 <LangText ko="발송 완료" zh="已发货" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
