import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '시장조사',
  description: '바이어 시장조사 요청을 처리하고 조사 보고서를 작성합니다.',
};

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

function statusLabel(s: string): string {
  return ({ requested: '신규 요청', in_progress: '조사 중', md_completed: '승인 대기' } as Record<string, string>)[s] ?? s;
}
function statusColor(s: string): string {
  return ({ md_completed: '#10b981', in_progress: '#f59e0b', requested: '#4f46e5' } as Record<string, string>)[s] ?? '#6b7280';
}

export default async function MdResearchListPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['md', 'admin'].includes(profile.kind)) redirect('/admin');

  const { data: me } = await supabase
    .from('internal_users').select('id, name_ko').eq('user_id', user.id).single() as { data: any; error: any };

  const { data: requests } = await supabase
    .from('market_research_requests')
    .select(`id, request_no, status, product_count, is_urgent, created_at, expected_deadline,
       seller:sellers(business_name, current_grade)`)
    .eq('assigned_md_id', me?.id ?? '')
    .in('status', ['requested', 'in_progress', 'md_completed'])
    .order('created_at', { ascending: true }) as { data: any[]; error: any };

  const displayName = me?.name_ko ?? profile.display_name ?? 'MD';
  return (
    <div>
      <div className="mb-5">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          <LangText ko="시장조사 요청" zh="市场调研请求" />
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          <LangText ko={`진행 중 ${requests?.length ?? 0}건`} zh={`进行中 ${requests?.length ?? 0} 件`} />
        </p>
      </div>

      {(requests ?? []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            <LangText ko="처리할 시장조사 요청이 없습니다" zh="没有需要处理的市场调研请求" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(requests ?? []).map((r: any) => {
            const color = statusColor(r.status);
            return (
              <Link key={r.id} href={`/md/research/${r.id}`} className="no-underline">
                <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '14px 16px', borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div className="flex-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)' }}>{r.request_no}
              </span>
                        {r.seller?.current_grade === 'vip' && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>👑 VIP</span>}
                        {r.is_urgent && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>🚨 긴급</span>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{r.seller?.business_name}
              </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        <LangText ko={`상품 ${r.product_count}건`} zh={`商品 ${r.product_count} 件`} />
                        {r.expected_deadline && ` · ${r.expected_deadline}`}
                      </div>
                    </div>
                    <span style={{ background: `${color}20`, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
