export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MD 홈',
  description: '담당 바이어 현황, 진행 중 매칭, 검수 일정을 한눈에 확인합니다.',
};

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';
// ── [sidebar-design-system] 단일 소스 navigation.ts에서 import ──
import { mdNavItems } from '@/config/navigation';

const brandColor = '#6366f1'; // MD 포털 색상

export default async function MdHomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, display_name')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin'].includes(profile.kind)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] p-6">
        <div className="bg-[var(--bg-base)] max-w-[360px] w-full text-center border border-[var(--border-light)] py-8 px-6 shadow-[var(--shadow-md)] rounded-[var(--radius-xl)]">
          <div className="text-[40px] mb-4">🔒</div>
          <div className="text-base font-bold mb-2">접근 권한 없음</div>
          <p className="text-[var(--text-secondary)] mb-5 text-[13px]">MD 또는 관리자만 접근 가능합니다.</p>
          <Link href="/" className="inline-block px-5 py-2.5 text-[var(--text-secondary)] no-underline text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)]">← 홈으로</Link>
        </div>
      </div>
    );
  }

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, staff_code, name_ko, name_zh')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, business_name, current_grade, current_month_balance_paid_cny, conversations:conversations(id, unread_count_md, last_message_at)')
    .eq('assigned_md_id', me?.id ?? '')
    .eq('approval_status', 'approved')
    .order('updated_at') as { data: any; error: any };

  const { count: openBriefs } = await supabase
    .from('briefs').select('*', { count: 'exact', head: true })
    .eq('md_id', me?.id ?? '').in('status', ['sent', 'partial_response']);
  const { count: openResearch } = await supabase
    .from('market_research_requests').select('*', { count: 'exact', head: true })
    .eq('assigned_md_id', me?.id ?? '').in('status', ['requested', 'in_progress']);
  const { count: openInspections } = await supabase
    .from('inspections').select('*', { count: 'exact', head: true })
    .is('inspection_completed_at', null);
  const { count: pendingProducts } = await supabase
    .from('products').select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending_review') as unknown as { count: any };

  // 진행 중 주문 (MD 담당 셀러의 주문)
  const sellerIds = (sellers ?? []).map((s: any) => s.id);
  const { data: activeOrders } = sellerIds.length > 0
    ? await supabase
        .from('orders')
        .select('id, order_no, status, total_cny, seller_id, created_at, seller:sellers(business_name)')
        .in('seller_id', sellerIds)
        .not('status', 'in', '(completed,cancelled)')
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] as any[] };

  const totalUnread = (sellers ?? []).reduce((sum: number, s: any) =>
    sum + ((s.conversations?.[0]?.unread_count_md as number) ?? 0), 0);

  const displayName = me?.name_ko ?? profile.display_name ?? 'MD';
    const navItems = mdNavItems;

  const stats = [
    { href: '/md/products', label: '공장 제품 검토', value: pendingProducts ?? 0, icon: '📦', color: '#10b981', unit: '건' },
    { href: '/md/briefs', label: '진행 Brief', value: openBriefs ?? 0, icon: '📋', color: '#4f46e5', unit: '건' },
    { href: '/md/research', label: '시장조사 요청', value: openResearch ?? 0, icon: '🔬', color: brandColor, unit: '건' },
    { href: '/admin/inspections', label: '진행 중 검수', value: openInspections ?? 0, icon: '🔍', color: '#f59e0b', unit: '건' },
    { href: '/md/chat', label: '미답변 메시지', value: totalUnread, icon: '💬', color: '#ef4444', unit: '건' },
    { href: '/md/sellers', label: '담당 바이어', value: sellers?.length ?? 0, icon: '👥', color: '#8b5cf6', unit: '명' },
  ];

  return (
    <div>
          {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="font-bold text-[var(--text-primary)] mb-1 tracking-tight text-[clamp(1.25rem, 5vw, 1.75rem)]">
          <LangText ko={`안녕하세요, ${displayName} MD님 👋`} zh={`你好，${displayName} MD 👋`} />
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          <LangText ko="담당 바이어" zh="负责买家" /> <strong style={{ color: brandColor }}>{sellers?.length ?? 0}명</strong>
          &nbsp;·&nbsp;<LangText ko="미답변 메시지" zh="未回复消息" /> <strong style={{ color: totalUnread > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{totalUnread}건</strong>
        </p>
      </div>

      {/* 빠른 액션 버튼 */}
      <div className="flex gap-2.5 mb-6 flex-wrap">
        {totalUnread > 0 && (
          <Link href="/md/chat" className="inline-flex items-center gap-1.5 bg-[var(--danger)] text-white no-underline text-sm font-semibold py-[11px] px-[18px] shadow-[0_4px_12px_rgba(239,68,68,0.3)] rounded-[var(--radius-lg)]">
            💬 {totalUnread}건 답변
          </Link>
        )}
        <Link href="/md/products" className="inline-flex items-center gap-1.5 text-white no-underline text-sm font-semibold py-[11px] px-5 rounded-[var(--radius-lg)]" style={{ background: brandColor, boxShadow: `0 4px 12px ${brandColor}40` }}>
          제품 검토 →
        </Link>
      </div>

      {/* KPI 그리드 - 모바일 2열 */}
      <div className="text-xs font-semibold text-[var(--text-tertiary)] mb-3 uppercase tracking-[0.06em]">
        <LangText ko="업무 현황" zh="工作状况" />
      </div>
      <div className="grid gap-2.5 mb-6 grid-cols-2">
        {stats.map((stat) => (
          <Link key={stat.href + stat.label} href={stat.href} className="block bg-[var(--bg-base)] no-underline p-[14px] border border-[var(--border-light)] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]" style={{ borderTop: `3px solid ${stat.value > 0 ? stat.color : 'var(--border-light)'}` }}>
            <div className="text-[22px] mb-2">{stat.icon}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] mb-1 font-medium">{stat.label}</div>
            <div className="font-bold leading-none mb-1 tracking-[-0.03em] text-[26px]" style={{ color: stat.value > 0 ? stat.color : 'var(--text-primary)' }}>
              {stat.value}
              <span className="text-[13px] font-normal text-[var(--text-tertiary)]" style={{ marginLeft: 2 }}>{stat.unit}</span>
            </div>
            <div className="text-[11px] font-medium" style={{ color: brandColor }}>열기 →</div>
          </Link>
        ))}
      </div>

      {/* 담당 바이어 목록 */}
      {(sellers?.length ?? 0) > 0 && (
        <div className="bg-[var(--bg-base)] p-4 mb-6 border border-[var(--border-light)] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]">
          <div className="text-[13px] font-semibold text-[var(--text-secondary)] mb-3"><LangText ko="담당 바이어" zh="负责买家" /></div>
          <div className="flex flex-col gap-2">
            {(sellers ?? []).slice(0, 5).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between bg-[var(--bg-subtle)] py-[10px] px-3 rounded-[var(--radius-md)]">
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">{s.business_name}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">등급: {s.current_grade ?? '-'}</div>
                </div>
                {(s.conversations?.[0]?.unread_count_md ?? 0) > 0 && (
                  <span className="bg-[var(--danger)] text-white text-[11px] font-bold px-2 py-0.5" style={{ borderRadius: 99 }}>
                    {s.conversations[0].unread_count_md}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 진행 중 주문 파이프라인 */}
      {(activeOrders ?? []).length > 0 && (
        <div className="bg-[var(--bg-base)] p-4 mb-6 border border-[var(--border-light)] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold text-[var(--text-secondary)]"><LangText ko="진행 중 주문" zh="진행 중 주문" /></div>
            <Link href="/md/orders" className="text-[11px] no-underline font-semibold" style={{ color: brandColor }}><LangText ko="전체 보기" zh="查看全部" /></Link>
          </div>
          <div className="flex flex-col gap-2">
            {(activeOrders ?? []).map((o: any) => {
              const STATUS_MAP: Record<string, [string, string]> = {
                draft: ['초안','#94a3b8'], submitted: ['접수','#667eea'], confirmed: ['확인','#667eea'],
                deposit_pending: ['계약금대기','#f59e0b'], deposit_paid: ['계약금납부','#10b981'],
                in_production: ['생산중','#f59e0b'], qc_pending: ['검수대기','#e11d48'],
                awaiting_balance: ['잔금대기','#f59e0b'], balance_paid: ['잔금납부','#10b981'],
                shipping_to_korea: ['운송중','#10b981'], arrived: ['도착','#22c55e'],
              };
              const PIPE_STEPS = ['접수','계약금','생산','검수','잔금','운송','완료'];
              const PIPE_STATUS_ORDER = ['submitted','confirmed','deposit_pending','deposit_paid','in_production','qc_pending','awaiting_balance','balance_paid','shipping_to_korea','arrived','completed'];
              const pipeIdx = PIPE_STATUS_ORDER.indexOf(o.status);
              const pipeStep = pipeIdx < 0 ? 0 : pipeIdx <= 1 ? 0 : pipeIdx <= 3 ? 1 : pipeIdx <= 4 ? 2 : pipeIdx <= 5 ? 3 : pipeIdx <= 7 ? 4 : pipeIdx <= 9 ? 5 : 6;
              const [statusLabel, statusColor] = STATUS_MAP[o.status] ?? ['처리중','#94a3b8'];
              return (
                <Link key={o.id} href={`/md/orders/${o.id}`} className="block no-underline bg-[var(--bg-subtle)] p-3 rounded-[var(--radius-md)] border border-[var(--border-light)]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[12px] font-bold text-[var(--text-primary)]">{o.order_no}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">{o.seller?.business_name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-[6px] py-[2px]" style={{ borderRadius: 99, background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>{statusLabel}</span>
                      <span className="text-[13px] font-bold" style={{ color: brandColor }}>¥{(o.total_cny ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {PIPE_STEPS.map((step, si) => (
                      <div key={si} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: 3, borderRadius: 99, background: si <= pipeStep ? brandColor : 'var(--border-default)', marginBottom: 2 }} />
                        <div style={{ fontSize: 7, color: si <= pipeStep ? brandColor : 'var(--text-tertiary)', fontWeight: si === pipeStep ? 700 : 400 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {/* 빠른 이동 */}
      <div className="bg-[var(--bg-base)] p-4 border border-[var(--border-light)] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]">
        <div className="text-[13px] font-semibold text-[var(--text-secondary)] mb-3"><LangText ko="빠른 이동" zh="快速导航" /></div>
        <div className="grid gap-2 grid-cols-2">
          {[
            { href: '/admin', label: '관리자 콘솔', icon: '⚙️' },
            { href: '/md/ai-brief', label: 'AI Brief 생성', icon: '🤖' },
            { href: '/md/ai-match', label: 'AI 공장 매칭', icon: '🔗' },
            { href: '/md/orders/margin-builder', label: '마진 계산기', icon: '💰' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-2 bg-[var(--bg-subtle)] no-underline text-[13px] font-medium text-[var(--text-secondary)] py-[10px] px-3 border border-[var(--border-light)] rounded-[var(--radius-md)]">
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="text-center text-[11px] text-[var(--text-tertiary)] mt-8">
        KERYX · <LangText ko="MD 포털" zh="MD 门户" />
      </div>
    </div>
  );
}
