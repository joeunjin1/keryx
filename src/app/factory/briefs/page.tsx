import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brief 요청 목록',
  description: '바이어가 요청한 Brief 목록을 확인하고 견적을 제출합니다.',
};

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

function statusLabel(s: string): string {
  return ({ pending: '응답 대기', responded: '제안 완료', selected: '채택됨', not_selected: '미채택', expired: '만료' } as Record<string, string>)[s] ?? s;
}
function statusColor(s: string): string {
  return ({ selected: '#10b981', responded: '#4f46e5', pending: '#f59e0b', not_selected: '#9ca3af', expired: '#ef4444' } as Record<string, string>)[s] ?? '#9ca3af';
}

const brandColor = '#10b981';

export default async function FactoryBriefsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=factory');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['factory', 'admin'].includes(profile.kind)) redirect('/login?role=factory');

  const { data: factory } = await supabase
    .from('factories').select('id, company_name, company_name_ko').eq('shared_login_user_id', user.id).single() as { data: any; error: any };

  // 이 공장에게 발송된 Brief 수신 목록
  const { data: recipients } = await supabase
    .from('brief_recipients')
    .select(`id, responded_at, sent_at, created_at,
       brief:briefs(id, brief_no, title_ko, title_zh, status, sent_at, deadline, is_vip_priority,
         seller:sellers(business_name, current_grade))`)
    .eq('factory_id', factory?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(50) as { data: any[]; error: any };

  // responded_at 유무로 상태 판단 (brief_recipients에 status 컬럼 없음)
  const getStatus = (r: any) => r.responded_at ? 'responded' : 'pending';
  const pendingCount = (recipients ?? []).filter((r: any) => !r.responded_at).length;
  const respondedCount = (recipients ?? []).filter((r: any) => !!r.responded_at).length;

  return (
    <div>
      <div className="mb-5">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          <LangText ko="수신 Brief" zh="收到的 Brief" />
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {pendingCount > 0
            ? <span style={{ color: '#f59e0b', fontWeight: 600 }}><LangText ko={`응답 대기 ${pendingCount}건`} zh={`待响应 ${pendingCount} 件`} /></span>
            : <LangText ko="모든 Brief 응답 완료" zh="所有Brief已响应" />
          }
        </p>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: '전체', labelZh: '全部', value: recipients?.length ?? 0, color: brandColor },
          { label: '대기', labelZh: '待响应', value: pendingCount, color: '#f59e0b' },
          { label: '완료', labelZh: '已响应', value: respondedCount, color: '#10b981' },
        ].map((item) => (
          <div key={item.label} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
              <LangText ko={item.label} zh={item.labelZh} />
            </div>
          </div>
        ))}
      </div>

      {(recipients ?? []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            <LangText ko="수신된 Brief가 없습니다" zh="没有收到 Brief" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(recipients ?? []).map((r: any) => {
            const brief = r.brief;
            const status = getStatus(r);
            const color = statusColor(status);
            const isUrgent = status === 'pending' && brief?.deadline && new Date(brief.deadline) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
            return (
              <Link key={r.id} href={`/factory/briefs/${r.id}`} className="no-underline">
                <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '14px 16px', borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div className="flex-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)' }}>{brief?.brief_no}
              </span>
                        {brief?.is_vip_priority && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>👑 VIP</span>}
                        {isUrgent && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>🚨 마감임박</span>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {brief?.title_zh ?? brief?.title_ko ?? '-'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {brief?.seller?.business_name}
                        {brief?.deadline && ` · 마감 ${brief.deadline}`}
                      </div>
                    </div>
                    <span style={{ background: `${color}20`, color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}>
                      {statusLabel(status)}
                    </span>
                  </div>
                  {status === 'pending' && (
                    <div style={{ background: `${brandColor}10`, borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12, color: brandColor, fontWeight: 600 }}>
                      → <LangText ko="제안서 작성하기" zh="填写提案" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
