export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MobileLayout from '@/components/layout/MobileLayout';
import LangText from '@/components/layout/LangText';
// ── [sidebar-design-system] 단일 소스 navigation.ts에서 import ──
import { designerNavItems as designerNav } from '@/config/navigation';

function getStatusLabel(status: string): string {
  const m: any = {
    pending_assignment: '미배정', assigned: '배정됨', in_progress: '작업 중',
    mockup_ready: '목업 완료', revision_requested: '수정 요청', approved: '승인 완료',
  };
  return m[status] ?? status;
}

function getStatusStyle(status: string) {
  const m: any = {
    pending_assignment: { bg: '#fef3c7', color: '#d97706' },
    assigned: { bg: '#e0e7ff', color: '#4338ca' },
    in_progress: { bg: '#dbeafe', color: '#1d4ed8' },
    mockup_ready: { bg: '#d1fae5', color: '#065f46' },
    revision_requested: { bg: '#fee2e2', color: '#991b1b' },
    approved: { bg: '#f0fdf4', color: '#15803d' },
  };
  const s = m[status] ?? { bg: '#f3f4f6', color: '#6b7280' };
  return { background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0 };
}

export default async function DesignerTasksPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=designer');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, display_name')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['designer', 'admin', 'md'].includes(profile.kind)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-subtle)', padding: '24px' }}>
        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-xl)', padding: '40px 24px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎨</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>디자이너 권한 없음</div>
          <Link href="/" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 14 }}>← 홈으로</Link>
        </div>
      </div>
    );
  }

  const { data: tasks } = await supabase
    .from('design_tasks')
    .select('id, status, brief_notes, design_fee_cny, mockup_urls, revision_count, assigned_at, mockup_submitted_at, approved_at, designer:user_profiles!design_tasks_designer_id_fkey(display_name), order:orders(order_no, total_cny, packaging_notes, seller:sellers(business_name, current_grade))')
    .or(`designer_id.eq.${user.id},designer_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(50) as { data: any[]; error: any };

  const myTasks = (tasks ?? []).filter((t: any) => t.designer?.display_name === profile.display_name);
  const unassigned = (tasks ?? []).filter((t: any) => t.status === 'pending_assignment');
  const inProgress = myTasks.filter((t: any) => ['assigned', 'in_progress', 'mockup_ready', 'revision_requested'].includes(t.status));
  const completed = myTasks.filter((t: any) => t.status === 'approved');

  const displayName = profile.display_name ?? '디자이너';
  const brandColor = '#8b5cf6';

  return (
    <MobileLayout
      title="KERYX 디자이너"
      subtitle="디자이너 워크룸"
      navItems={designerNav}
      userName={displayName}
      userRole="디자이너"
      accentColor={brandColor}
    >
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 4 }}>
          {displayName}님의 워크룸 🎨
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          진행 중 <strong style={{ color: '#4f46e5' }}>{inProgress.length}건</strong>
          &nbsp;·&nbsp;배정 대기 <strong style={{ color: brandColor }}>{unassigned.length}건</strong>
          &nbsp;·&nbsp;완료 <strong style={{ color: '#10b981' }}>{completed.length}건</strong>
        </p>
      </div>

      {/* KPI 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: '배정 대기', value: unassigned.length, icon: '⏳', color: brandColor },
          { label: '진행 중', value: inProgress.length, icon: '🖌️', color: '#4f46e5' },
          { label: '완료', value: completed.length, icon: '✅', color: '#10b981' },
          { label: '전체 작업', value: myTasks.length, icon: '📋', color: '#0ea5e9' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--bg-base)', border: '1px solid var(--border-light)',
            borderTop: `3px solid ${stat.color}`, borderRadius: 'var(--radius-lg)',
            padding: '14px', boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{stat.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* 배정 대기 작업 */}
      {unassigned.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>⏳ 배정 대기 작업</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unassigned.map((t: any) => (
              <Link key={t.id} href={`/designer/tasks/${t.id}`} style={{
                textDecoration: 'none', background: '#fffbeb',
                border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b',
                borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {t.order?.order_no} · {t.order?.seller?.business_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.brief_notes ?? '브리프 없음'}
                  </div>
                  {t.design_fee_cny && (
                    <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600, marginTop: 4 }}>
                      💰 작업비 ¥{t.design_fee_cny}
                    </div>
                  )}
                </div>
                <span style={getStatusStyle(t.status)}>{getStatusLabel(t.status)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 내 작업 목록 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>🖌️ 내 작업 목록</div>
        {myTasks.length === 0 ? (
          <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '40px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎨</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>아직 배정된 작업이 없습니다</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8 }}>위의 배정 대기 작업에서 선택하여 시작하세요.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myTasks.map((t: any) => (
              <Link key={t.id} href={`/designer/tasks/${t.id}`} style={{
                textDecoration: 'none', background: 'var(--bg-base)',
                border: '1px solid var(--border-light)',
                borderLeft: `4px solid ${t.status === 'approved' ? '#10b981' : t.status === 'revision_requested' ? '#ef4444' : '#4f46e5'}`,
                borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {t.order?.order_no} · {t.order?.seller?.business_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.brief_notes}
                  </div>
                  {t.revision_count > 0 && (
                    <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>
                      수정 {t.revision_count}회
                    </div>
                  )}
                </div>
                <span style={getStatusStyle(t.status)}>{getStatusLabel(t.status)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 빠른 이동 */}
      <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '16px', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>빠른 이동</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { href: '/admin/ip-studio', label: 'IP Studio', icon: '🌟' },
            { href: '/admin', label: '관리자 콘솔', icon: '⚙️' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)', textDecoration: 'none',
              fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
              border: '1px solid var(--border-light)',
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 32 }}>
        KERYX 디자이너 포털
      </div>
    </MobileLayout>
  );
}
