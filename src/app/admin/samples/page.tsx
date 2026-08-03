'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

// 통합 샘플 신청 타입 (sample_requests + consultations 통합)
type SampleSource = 'sample_requests' | 'consultations';
type StatusFilter = 'all' | 'pending' | 'reviewing' | 'preparing' | 'shipped' | 'delivered' | 'rejected';

interface UnifiedSample {
  id: string;
  source: SampleSource;
  request_no: string | null;
  status: string;
  quantity: number | null;
  product_name: string;
  product_image: string | null;
  requester_name: string;
  requester_email: string;
  requester_company: string | null;
  requester_phone: string | null;
  requirements: string | null;
  admin_note: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  created_at: string;
  // sample_requests 전용
  shipping_address: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  memo: string | null;
  seller_name: string | null;
  assigned_md_name: string | null;
  // consultations 전용
  inquiry_type: string | null;
  preferred_contact: string | null;
  landing_slug: string | null;
}

const STATUS_TABS = [
  { id: 'all' as StatusFilter, ko: '전체', zh: '全部', color: '#6b7280' },
  { id: 'pending' as StatusFilter, ko: '대기', zh: '待处理', color: '#f59e0b' },
  { id: 'reviewing' as StatusFilter, ko: '검토중', zh: '审核中', color: '#4f46e5' },
  { id: 'preparing' as StatusFilter, ko: '준비중', zh: '准备中', color: '#06b6d4' },
  { id: 'shipped' as StatusFilter, ko: '발송됨', zh: '已发货', color: '#8b5cf6' },
  { id: 'delivered' as StatusFilter, ko: '수령됨', zh: '已签收', color: '#10b981' },
  { id: 'rejected' as StatusFilter, ko: '거절됨', zh: '已拒绝', color: '#ef4444' },
];

// consultations 상태를 sample_requests 상태로 매핑
function mapConsultationStatus(status: string): string {
  const map: Record<string, string> = {
    new: 'pending',
    reviewing: 'reviewing',
    replied: 'reviewing',
    completed: 'delivered',
    cancelled: 'rejected',
  };
  return map[status] ?? 'pending';
}

function statusLabel(s: string): [string, string] {
  const m: Record<string, [string, string]> = {
    pending: ['대기', '待处理'],
    reviewing: ['검토중', '审核中'],
    preparing: ['준비중', '准备中'],
    shipped: ['발송됨', '已发货'],
    delivered: ['수령됨', '已签收'],
    rejected: ['거절됨', '已拒绝'],
    cancelled: ['취소됨', '已取消'],
  };
  return m[s] ?? [s, s];
}

function statusColor(s: string): string {
  const m: Record<string, string> = {
    pending: '#f59e0b', reviewing: '#4f46e5', preparing: '#06b6d4',
    shipped: '#8b5cf6', delivered: '#10b981', rejected: '#ef4444', cancelled: '#9ca3af',
  };
  return m[s] ?? '#9ca3af';
}

export default function AdminSamplesPage() {
  useEffect(() => { document.title = '샘플 관리 | KERYX'; }, []);
  const { lang } = useLangContext();
  const router = useRouter();
  const supabase = createClient() as any;

  const [samples, setSamples] = useState<UnifiedSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, { carrier: string; number: string }>>({});
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: profile } = await supabase
        .from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };
      if (!profile || !['admin', 'super_admin'].includes(profile.kind)) { router.push('/admin'); return; }

      // 1. sample_requests 테이블 조회
      const { data: sampleData } = await supabase
        .from('sample_requests')
        .select(`id, request_no, status, quantity, shipping_address, shipping_name, shipping_phone,
           memo, admin_note, tracking_number, shipping_carrier, shipped_at, created_at,
           product_name_snapshot, product_image_snapshot,
           seller:sellers(company_name, company_name_ko),
           product:products(id, product_code, name_ko, name_zh),
           assigned_md:internal_users!assigned_md_id(name_ko)`)
        .order('created_at', { ascending: false })
        .limit(200) as { data: any[]; error: any };

      // 2. consultations 테이블에서 sample_request 타입 조회
      const { data: consultData } = await supabase
        .from('consultations')
        .select(`id, inquiry_type, status, quantity, requirements, admin_note,
           product_name_snapshot, product_image_snapshot,
           requester_name, requester_email, requester_company, requester_phone,
           preferred_contact, landing_slug, created_at`)
        .eq('inquiry_type', 'sample_request')
        .order('created_at', { ascending: false })
        .limit(200) as { data: any[]; error: any };

      // 3. 통합 데이터 변환
      const fromSampleRequests: UnifiedSample[] = (sampleData ?? []).map((s: any) => ({
        id: s.id,
        source: 'sample_requests' as SampleSource,
        request_no: s.request_no,
        status: s.status,
        quantity: s.quantity,
        product_name: s.product_name_snapshot ?? s.product?.name_ko ?? s.product?.name_zh ?? '-',
        product_image: s.product_image_snapshot ?? null,
        requester_name: s.seller?.company_name_ko ?? s.seller?.company_name ?? '-',
        requester_email: '',
        requester_company: s.seller?.company_name ?? null,
        requester_phone: s.shipping_phone ?? null,
        requirements: s.memo ?? null,
        admin_note: s.admin_note,
        tracking_number: s.tracking_number,
        shipping_carrier: s.shipping_carrier,
        shipped_at: s.shipped_at,
        created_at: s.created_at,
        shipping_address: s.shipping_address,
        shipping_name: s.shipping_name,
        shipping_phone: s.shipping_phone,
        memo: s.memo,
        seller_name: s.seller?.company_name_ko ?? s.seller?.company_name ?? null,
        assigned_md_name: s.assigned_md?.name_ko ?? null,
        inquiry_type: 'sample_request',
        preferred_contact: null,
        landing_slug: null,
      }));

      const fromConsultations: UnifiedSample[] = (consultData ?? []).map((c: any) => ({
        id: c.id,
        source: 'consultations' as SampleSource,
        request_no: null,
        status: mapConsultationStatus(c.status),
        quantity: c.quantity,
        product_name: c.product_name_snapshot ?? '-',
        product_image: c.product_image_snapshot ?? null,
        requester_name: c.requester_name ?? '-',
        requester_email: c.requester_email ?? '',
        requester_company: c.requester_company ?? null,
        requester_phone: c.requester_phone ?? null,
        requirements: c.requirements ?? null,
        admin_note: c.admin_note ?? null,
        tracking_number: null,
        shipping_carrier: null,
        shipped_at: null,
        created_at: c.created_at,
        shipping_address: null,
        shipping_name: null,
        shipping_phone: null,
        memo: c.requirements ?? null,
        seller_name: null,
        assigned_md_name: null,
        inquiry_type: c.inquiry_type,
        preferred_contact: c.preferred_contact ?? null,
        landing_slug: c.landing_slug ?? null,
      }));

      // 4. 합치고 날짜순 정렬
      const merged = [...fromSampleRequests, ...fromConsultations]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSamples(merged);
      setLoading(false);
    })();
  }, []);

  const handleStatusUpdate = async (item: UnifiedSample, newStatus: string) => {
    setActionLoading(item.id);
    if (item.source === 'sample_requests') {
      const updates: any = { status: newStatus };
      if (newStatus === 'shipped') {
        const td = trackingData[item.id];
        if (td?.number) {
          updates.tracking_number = td.number;
          updates.shipping_carrier = td.carrier || null;
          updates.shipped_at = new Date().toISOString();
        }
      }
      if (adminNote[item.id]) updates.admin_note = adminNote[item.id];
      await supabase.from('sample_requests').update(updates).eq('id', item.id);
      setSamples(prev => prev.map(s => s.id === item.id ? { ...s, ...updates } : s));
    } else {
      // consultations 상태 역매핑
      const consultStatusMap: Record<string, string> = {
        pending: 'new',
        reviewing: 'reviewing',
        preparing: 'reviewing',
        shipped: 'replied',
        delivered: 'completed',
        rejected: 'cancelled',
      };
      const consultStatus = consultStatusMap[newStatus] ?? 'new';
      const updates: any = { status: consultStatus };
      if (adminNote[item.id]) updates.admin_note = adminNote[item.id];
      await supabase.from('consultations').update(updates).eq('id', item.id);
      setSamples(prev => prev.map(s => s.id === item.id ? { ...s, status: newStatus, admin_note: updates.admin_note ?? s.admin_note } : s));
    }
    setActionLoading(null);
    setExpandedId(null);
  };

  const handleDelete = async (item: UnifiedSample) => {
    setActionLoading(item.id);
    if (item.source === 'sample_requests') {
      await supabase.from('sample_requests').delete().eq('id', item.id);
    } else {
      await supabase.from('consultations').delete().eq('id', item.id);
    }
    setSamples(prev => prev.filter(s => s.id !== item.id));
    setDeleteConfirmId(null);
    setActionLoading(null);
    setExpandedId(null);
  };

  const counts: Record<string, number> = { all: samples.length };
  STATUS_TABS.slice(1).forEach(t => { counts[t.id] = samples.filter(s => s.status === t.id).length; });

  const filtered = samples
    .filter(s => tab === 'all' || s.status === tab)
    .filter(s => !search ||
      (s.request_no ?? '').includes(search) ||
      (s.product_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.requester_name ?? '').includes(search) ||
      (s.requester_company ?? '').includes(search) ||
      (s.requester_email ?? '').includes(search)
    );

  if (loading) return (
    <div className="text-center py-20 px-6 text-[var(--text-tertiary)]">
      <div className="text-[32px] mb-3">⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[20px] font-bold mb-0.5 text-[var(--text-primary)]">
          <LangText ko="샘플 신청 관리" zh="样品申请管理" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          <LangText ko={`총 ${samples.length}건`} zh={`共 ${samples.length} 件`} />
          {counts['pending'] > 0 && (
            <span className="text-amber-500 font-semibold ml-2">
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
          placeholder={lang === 'zh' ? '搜索请求编号、商品名、买家名...' : '요청번호, 상품명, 바이어(고객)명으로 검색...'}
          className="w-full text-sm outline-none box-border py-2.5 px-3.5 text-[var(--text-primary)] border border-solid border-[var(--border-light)] rounded-[var(--radius-lg)] bg-[var(--bg-base)]"
        />
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.25 py-1.75 px-3 border-none cursor-pointer shrink-0 text-xs font-semibold rounded-[var(--radius-lg)]"
            style={{
              background: tab === t.id ? t.color : 'var(--bg-subtle)',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
            }} /* dynamic styles */
          >
            <LangText ko={t.ko} zh={t.zh} />
            <span
              className="text-[10px] font-bold py-0.25 px-1.5 rounded-full"
              style={{
                background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-base)',
                color: tab === t.id ? '#fff' : 'var(--text-tertiary)',
              }} /* dynamic styles */
            >
              {counts[t.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 px-6 border border-solid border-[var(--border-light)] rounded-[var(--radius-lg)] bg-[var(--bg-base)]">
          <div className="text-[40px] mb-3">📬</div>
          <div className="text-sm text-[var(--text-secondary)]">
            <LangText ko="샘플 요청이 없습니다" zh="没有样品申请" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s: UnifiedSample) => {
            const [koLabel, zhLabel] = statusLabel(s.status);
            const color = statusColor(s.status);
            const isExpanded = expandedId === s.id;
            return (
              <div
                key={s.id}
                className="py-3.5 px-4 border border-solid border-[var(--border-light)] shadow-xs rounded-[var(--radius-lg)] bg-[var(--bg-base)]"
                style={{ borderLeft: `4px solid ${color}` }} /* dynamic styles */
              >
                <div className="flex items-start gap-2.5">
                  {s.product_image && (
                    <Image src={s.product_image} alt="" width={44} height={44} className="rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-bold text-[var(--text-tertiary)]">
                        {s.request_no ?? s.id.slice(0, 8)}
                      </span>
                      <span
                        className="text-[10px] font-bold py-0.25 px-1.5 rounded-full"
                        style={{ background: `${color}20`, color }} /* dynamic styles */
                      >
                        <LangText ko={koLabel} zh={zhLabel} />
                      </span>
                      {/* 출처 뱃지 */}
                      {s.source === 'consultations' && (
                        <span className="text-[10px] font-bold py-0.25 px-1.5 rounded-full bg-orange-100 text-orange-600">
                          <LangText ko="랜딩" zh="落地页" />
                        </span>
                      )}
                      {s.landing_slug && (
                        <span className="text-[10px] py-0.25 px-1.5 rounded-full bg-blue-50 text-blue-500">
                          {s.landing_slug}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold mb-0.5 text-[var(--text-primary)]">{s.product_name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {s.requester_name}
                      {s.requester_company && ` · ${s.requester_company}`}
                      {s.quantity && ` · ${s.quantity}개`}
                      {s.assigned_md_name && ` · MD: ${s.assigned_md_name}`}
                    </div>
                    {s.requester_email && (
                      <div className="text-[11px] text-[var(--text-tertiary)]">{s.requester_email}</div>
                    )}
                    {s.created_at && (
                      <div className="text-[11px] mt-0.5 text-[var(--text-tertiary)]">
                        {new Date(s.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="py-1.5 px-2.5 text-xs cursor-pointer border border-solid border-[var(--border-light)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-solid border-[var(--border-light)] mt-3 pt-3">
                    {/* 연락처 정보 */}
                    <div className="py-2.5 px-3 mb-3 rounded-lg bg-[var(--bg-subtle)]">
                      <div className="text-[11px] font-semibold mb-1.5 text-[var(--text-tertiary)]">
                        <LangText ko="신청자 정보" zh="申请人信息" />
                      </div>
                      <div className="text-[13px] text-[var(--text-primary)]">
                        {s.requester_name}
                        {s.requester_company && ` · ${s.requester_company}`}
                      </div>
                      {s.requester_email && (
                        <div className="text-xs mt-0.5 text-[var(--text-secondary)]">
                          ✉ {s.requester_email}
                        </div>
                      )}
                      {s.requester_phone && (
                        <div className="text-xs mt-0.5 text-[var(--text-secondary)]">
                          📞 {s.requester_phone}
                        </div>
                      )}
                      {s.preferred_contact && (
                        <div className="text-xs mt-0.5 text-[var(--text-secondary)]">
                          <LangText ko="선호 연락 방식" zh="首选联系方式" />: {s.preferred_contact}
                        </div>
                      )}
                    </div>

                    {/* 배송 정보 (sample_requests 전용) */}
                    {s.shipping_name && (
                      <div className="py-2.5 px-3 mb-3 rounded-lg bg-[var(--bg-subtle)]">
                        <div className="text-[11px] font-semibold mb-1.5 text-[var(--text-tertiary)]">
                          <LangText ko="배송 정보" zh="配送信息" />
                        </div>
                        <div className="text-[13px] text-[var(--text-primary)]">
                          {s.shipping_name} · {s.shipping_phone}
                        </div>
                        <div className="text-xs mt-0.5 text-[var(--text-secondary)]">{s.shipping_address}</div>
                      </div>
                    )}

                    {/* 요구사항 */}
                    {(s.requirements || s.memo) && (
                      <div className="text-xs py-2 px-3 mb-3 rounded-lg bg-amber-50 text-[var(--text-secondary)]">
                        💬 {s.requirements ?? s.memo}
                      </div>
                    )}

                    {/* 운송장 입력 (preparing 상태일 때) */}
                    {s.status === 'preparing' && s.source === 'sample_requests' && (
                      <div className="mb-3">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            type="text"
                            value={trackingData[s.id]?.carrier ?? ''}
                            onChange={e => setTrackingData(p => ({ ...p, [s.id]: { ...p[s.id], carrier: e.target.value } }))}
                            placeholder={lang === 'zh' ? '快递公司（可选）' : '택배사 (선택)'}
                            className="w-full text-xs outline-none box-border py-1.5 px-2.5 text-[var(--text-primary)] border border-solid border-[var(--border-light)] rounded-md bg-[var(--bg-base)]"
                          />
                          <input
                            type="text"
                            value={trackingData[s.id]?.number ?? ''}
                            onChange={e => setTrackingData(p => ({ ...p, [s.id]: { ...p[s.id], number: e.target.value } }))}
                            placeholder={lang === 'zh' ? '运单号' : '운송장 번호'}
                            className="w-full text-xs outline-none box-border py-1.5 px-2.5 text-[var(--text-primary)] border border-solid border-[var(--border-light)] rounded-md bg-[var(--bg-base)]"
                          />
                        </div>
                        <button
                          onClick={() => handleStatusUpdate(s, 'shipped')}
                          disabled={actionLoading === s.id || !trackingData[s.id]?.number}
                          className="w-full text-xs font-bold cursor-pointer border-none py-2 px-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-violet-500 text-white"
                        >
                          {actionLoading === s.id ? '...' : <LangText ko="발송 완료로 변경" zh="标记为已发货" />}
                        </button>
                      </div>
                    )}

                    {/* 관리자 메모 */}
                    <textarea
                      defaultValue={s.admin_note ?? ''}
                      onBlur={e => setAdminNote(p => ({ ...p, [s.id]: e.target.value }))}
                      placeholder={lang === 'zh' ? '管理员备注（内部）' : '관리자 메모 (내부용)'}
                      rows={2}
                      className="w-full text-xs resize-none outline-none box-border py-1.5 px-2.5 text-[var(--text-primary)] border border-solid border-[var(--border-light)] rounded-md bg-[var(--bg-base)]"
                    />

                    {/* 상태 변경 버튼 */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {s.status !== 'pending' && <button onClick={() => handleStatusUpdate(s, 'pending')} disabled={actionLoading === s.id} className="text-[10px] font-bold cursor-pointer border-none py-1 px-2 rounded-md disabled:opacity-50 bg-amber-100 text-amber-500"><LangText ko="대기" zh="待处理" /></button>}
                      {s.status !== 'reviewing' && <button onClick={() => handleStatusUpdate(s, 'reviewing')} disabled={actionLoading === s.id} className="text-[10px] font-bold cursor-pointer border-none py-1 px-2 rounded-md disabled:opacity-50 bg-indigo-100 text-indigo-600"><LangText ko="검토중" zh="审核中" /></button>}
                      {s.status !== 'preparing' && <button onClick={() => handleStatusUpdate(s, 'preparing')} disabled={actionLoading === s.id} className="text-[10px] font-bold cursor-pointer border-none py-1 px-2 rounded-md disabled:opacity-50 bg-cyan-100 text-cyan-500"><LangText ko="준비중" zh="准备中" /></button>}
                      {s.status !== 'delivered' && <button onClick={() => handleStatusUpdate(s, 'delivered')} disabled={actionLoading === s.id} className="text-[10px] font-bold cursor-pointer border-none py-1 px-2 rounded-md disabled:opacity-50 bg-emerald-100 text-emerald-500"><LangText ko="수령됨" zh="已签收" /></button>}
                      {s.status !== 'rejected' && <button onClick={() => handleStatusUpdate(s, 'rejected')} disabled={actionLoading === s.id} className="text-[10px] font-bold cursor-pointer border-none py-1 px-2 rounded-md disabled:opacity-50 bg-red-100 text-red-500"><LangText ko="거절됨" zh="已拒绝" /></button>}
                    </div>

                    {/* 삭제 버튼 */}
                    <div className="mt-3 pt-3 border-t border-solid border-[var(--border-light)]">
                      {deleteConfirmId === s.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-500 flex-1">
                            <LangText ko="정말 삭제하시겠습니까?" zh="确定要删除吗？" />
                          </span>
                          <button
                            onClick={() => handleDelete(s)}
                            disabled={actionLoading === s.id}
                            className="text-[10px] font-bold cursor-pointer border-none py-1 px-2.5 rounded-md disabled:opacity-50 bg-red-500 text-white"
                          >
                            {actionLoading === s.id ? '...' : <LangText ko="삭제" zh="删除" />}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] font-bold cursor-pointer border-none py-1 px-2.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                          >
                            <LangText ko="취소" zh="取消" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(s.id)}
                          className="text-[10px] font-bold cursor-pointer border border-solid border-red-200 py-1 px-2.5 rounded-md bg-transparent text-red-400 hover:bg-red-50"
                        >
                          <LangText ko="삭제" zh="删除" />
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
