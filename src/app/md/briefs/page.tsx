import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brief 관리',
  description: '바이어가 제출한 Brief를 검토하고 적합한 공장에 배포합니다.',
};

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

function statusLabel(s: string): string {
  return ({ draft: '초안', sent: '발송됨', partial_response: '일부 응답', all_responded: '전체 응답', closed: '종료', cancelled: '취소' } as Record<string, string>)[s] ?? s;
}
function statusColor(s: string): string {
  return ({ all_responded: '#10b981', partial_response: '#f59e0b', sent: '#4f46e5', closed: '#9ca3af', cancelled: '#ef4444', draft: '#6b7280' } as Record<string, string>)[s] ?? '#6b7280';
}

export default async function MdBriefsListPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['md', 'admin'].includes(profile.kind)) redirect('/admin');

  const { data: me } = await supabase
    .from('internal_users').select('id, name_ko').eq('user_id', user.id).single() as { data: any; error: any };

  const { data: briefs } = await supabase
    .from('briefs')
    .select(`id, brief_no, title_ko, title_zh, status, sent_at, deadline, is_vip_priority,
       seller:sellers(business_name, current_grade),
       recipients:brief_recipients(id, responded_at),
       responses:brief_responses(id, selected_for_seller)`)
    .eq('md_id', me?.id ?? '')
    .order('sent_at', { ascending: false, nullsFirst: false })
    .limit(50) as { data: any[]; error: any };

  const displayName = me?.name_ko ?? profile.display_name ?? 'MD';
  const brandColor = '#4f46e5';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            <LangText ko="내 Brief 목록" zh="我的 Brief 列表" />
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            <LangText ko={`총 ${briefs?.length ?? 0}건`} zh={`共 ${briefs?.length ?? 0} 件`} />
          </p>
        </div>
        <Link href="/md/briefs/new" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          borderRadius: 'var(--radius-lg)', background: brandColor, color: '#fff',
          textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>
          + <LangText ko="새 Brief" zh="新 Brief" />
        </Link>
      </div>

      {(briefs ?? []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            <LangText ko="아직 작성한 Brief가 없습니다" zh="还没有创建 Brief" />
          </div>
          <Link href="/md/briefs/new" style={{ color: brandColor, fontSize: 13, fontWeight: 600 }}>
            + <LangText ko="첫 Brief 만들기" zh="创建第一个 Brief" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(briefs ?? []).map((b: any) => {
            const totalRecipients = b.recipients?.length ?? 0;
            const responded = (b.recipients ?? []).filter((r: any) => r.responded_at).length;
            const selected = (b.responses ?? []).filter((r: any) => r.selected_for_seller).length;
            const responseCount = b.responses?.length ?? 0;
            const color = statusColor(b.status);
            return (
              <Link key={b.id} href={`/md/briefs/${b.id}`} className="no-underline">
                <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '14px 16px', borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div className="flex-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)' }}>{b.brief_no}
              </span>
                        {b.is_vip_priority && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>👑 VIP</span>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{b.title_ko ?? b.title_zh ?? '-'}
              </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {b.seller?.business_name}{b.seller?.current_grade === 'vip' && ' 👑'}
                        {' · '}{responded}/{totalRecipients} <LangText ko="응답" zh="响应" />
                        {' · '}{responseCount} <LangText ko="제안" zh="提案" />
                        {selected > 0 && <> · {selected} <LangText ko="채택" zh="采用" /></>}
                        {b.deadline && ` · ${new Date(b.deadline).toLocaleDateString('ko')}`}
                      </div>
                    </div>
                    <span style={{ background: `${color}20`, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}>
                      {statusLabel(b.status)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 32 }}>
        KERYX · <LangText ko="MD Brief 관리" zh="MD Brief 管理" />
      </div>
    </div>
  );
}
