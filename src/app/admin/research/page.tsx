'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';


export default function AdminResearchQueuePage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '시장조사 관리 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const router = useRouter();
  const supabase = createClient() as any;
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [userName, setUserName] = useState('관리자');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('market_research_requests')
      .select(`id, request_no, product_count, is_urgent, completed_at, expected_deadline,
         seller:sellers(business_name, current_grade),
         md:internal_users(name_ko, staff_code),
         items:market_research_items(id, description),
         reports:market_research_reports(id, item_id, md_recommendation, candidate_factories)`)
      .eq('status', 'md_completed')
      .order('completed_at', { ascending: true }) as { data: any[]; error: any };
    setPending(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: me } = await supabase.from('internal_users').select('role, name_ko').eq('user_id', user.id).single() as { data: any; error: any };
      if (!me || me.role !== 'admin') { router.push('/admin'); return; }
      if (me.name_ko) setUserName(me.name_ko);
      load();
    })();
  }, []);

  const handleApprove = async (id: string) => {
    setApproving(id);
    await supabase.from('market_research_requests').update({ status: 'admin_completed', admin_completed_at: new Date().toISOString() }).eq('id', id);
    setPending(prev => prev.filter(r => r.id !== id));
    setApproving(null);
  };

  if (loading) return (
    <div className="px-6 py-20 text-center" style={{ /* dynamic value, kept inline */ textAlign: 'center', /* dynamic value, kept inline */ padding: '80px 24px', /* dynamic value, kept inline */ color: 'var(--text-tertiary)' }}>
        <div className="mb-3 text-3xl" style={{ /* dynamic value, kept inline */ fontSize: 32, /* dynamic value, kept inline */ marginBottom: 12 }}>⏳</div>
        <LangText ko="로딩 중..." zh="加载中..." />
      </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-bold text-xl" style={{ /* dynamic value, kept inline */ fontSize: 20, /* dynamic value, kept inline */ fontWeight: 700, /* dynamic value, kept inline */ color: 'var(--text-primary)', /* dynamic value, kept inline */ marginBottom: 2 }}>
          <LangText ko="시장조사 승인 대기" zh="市场调研待审批" />
        </h1>
        <p className="text-[13px]" style={{ /* dynamic value, kept inline */ fontSize: 13, /* dynamic value, kept inline */ color: 'var(--text-tertiary)' }}>
          <LangText ko={`${pending.length}건 승인 대기`} zh={`${pending.length} 件待审批`} />
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="border border-neutral-200 px-6 py-12 text-center" style={{ /* dynamic value, kept inline */ textAlign: 'center', /* dynamic value, kept inline */ padding: '48px 24px', /* dynamic value, kept inline */ background: 'var(--bg-base)', /* dynamic value, kept inline */ borderRadius: 'var(--radius-lg)', /* dynamic value, kept inline */ border: '1px solid var(--border-light)' }}>
          <div className="mb-3 text-4xl" style={{ /* dynamic value, kept inline */ fontSize: 40, /* dynamic value, kept inline */ marginBottom: 12 }}>✅</div>
          <div className="text-sm" style={{ /* dynamic value, kept inline */ fontSize: 14, /* dynamic value, kept inline */ color: 'var(--text-secondary)' }}>
            <LangText ko="승인 대기 중인 시장조사가 없습니다" zh="没有待审批的市场调研" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((r: any) => {
            const reportCount = r.reports?.length ?? 0;
            const itemCount = r.items?.length ?? 0;
            return (
              <div key={r.id} className="border border-neutral-200 p-4" style={{ /* dynamic value, kept inline */ background: 'var(--bg-base)', /* dynamic value, kept inline */ borderRadius: 'var(--radius-lg)', /* dynamic value, kept inline */ border: '1px solid var(--border-light)', /* dynamic value, kept inline */ padding: '16px', /* dynamic value, kept inline */ boxShadow: 'var(--shadow-xs)' }}>
                <div className="flex gap-2 items-start justify-between" style={{ /* dynamic value, kept inline */ display: 'flex', /* dynamic value, kept inline */ alignItems: 'flex-start', /* dynamic value, kept inline */ justifyContent: 'space-between', /* dynamic value, kept inline */ gap: 8, /* dynamic value, kept inline */ marginBottom: 10 }}>
                  <div className="flex-1">
                    <div className="flex gap-1.5 items-center" style={{ /* dynamic value, kept inline */ display: 'flex', /* dynamic value, kept inline */ alignItems: 'center', /* dynamic value, kept inline */ gap: 6, /* dynamic value, kept inline */ marginBottom: 4 }}>
                      <span className="font-bold text-xs" style={{ /* dynamic value, kept inline */ fontSize: 12, /* dynamic value, kept inline */ fontWeight: 700, /* dynamic value, kept inline */ color: 'var(--text-tertiary)' }}>{r.request_no}
              </span>
                      {r.is_urgent && <span className="bg-red-100 font-bold px-1.5 py-px rounded-full text-[10px] text-red-600" style={{ /* dynamic value, kept inline */ background: '#fee2e2', /* dynamic value, kept inline */ color: '#dc2626', /* dynamic value, kept inline */ fontSize: 10, /* dynamic value, kept inline */ fontWeight: 700, /* dynamic value, kept inline */ padding: '1px 6px', /* dynamic value, kept inline */ borderRadius: 99 }}>🚨 긴급</span>}
                    </div>
                    <div className="font-bold text-sm" style={{ /* dynamic value, kept inline */ fontSize: 14, /* dynamic value, kept inline */ fontWeight: 700, /* dynamic value, kept inline */ color: 'var(--text-primary)' }}>{r.seller?.business_name}
              </div>
                    <div className="mt-0.5 text-[11px]" style={{ /* dynamic value, kept inline */ fontSize: 11, /* dynamic value, kept inline */ color: 'var(--text-tertiary)', /* dynamic value, kept inline */ marginTop: 2 }}>
                      MD: {r.md?.name_ko} ({r.md?.staff_code})
                      {' · '}<LangText ko={`상품 ${r.product_count}건`} zh={`商品 ${r.product_count} 件`} />
                      {' · '}<LangText ko={`보고서 ${reportCount}/${itemCount}건`} zh={`报告 ${reportCount}/${itemCount} 件`} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={approving === r.id}
                    style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', background: '#10b981', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✓ <LangText ko="승인 완료" zh="审批通过" />
                  </button>
                  <Link href={`/admin/research/${r.id}`} className="border-none inline-flex items-center no-underline px-4 py-2.5 text-[13px]" style={{ /* dynamic value, kept inline */ padding: '10px 16px', /* dynamic value, kept inline */ borderRadius: 'var(--radius-md)', /* dynamic value, kept inline */ background: 'var(--bg-subtle)', /* dynamic value, kept inline */ color: 'var(--text-secondary)', /* dynamic value, kept inline */ border: 'none', /* dynamic value, kept inline */ fontSize: 13, /* dynamic value, kept inline */ textDecoration: 'none', /* dynamic value, kept inline */ display: 'inline-flex', /* dynamic value, kept inline */ alignItems: 'center' }}>
                    <LangText ko="상세" zh="详情" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
