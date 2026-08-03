import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공장 관리',
  description: '파트너 공장 목록, 생산 능력, 최근 주문 이력을 확인합니다.',
};

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import FactoryRegisterButton from './FactoryRegisterButton';

export default async function MdFactoryPage() {
  const supabase = createClient() as any;

  const { data: factories } = await supabase
    .from('factories')
    .select('id, factory_code, company_name, contact_name, email, approval_status, avg_rating, total_orders, created_at')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false }) as { data: any[] };

  return (
    <div className="kx-animate-in">

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] mb-1">
            공장 목록·상세
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            담당 공급사(공장) 목록을 확인하고 관리합니다.
          </p>
        </div>
        <FactoryRegisterButton />
      </div>


      <div className="grid gap-4 mb-6 grid-cols-3">
        {[
          { label: '활성 공장', value: factories?.length ?? 0, icon: '🏭', color: '#10b981' },
          { label: '평균 평점', value: factories && factories.length > 0 ? (factories.reduce((sum, f) => sum + (f.avg_rating ?? 0), 0) / factories.length).toFixed(1) : '-', icon: '⭐', color: '#f59e0b' },
          { label: '총 주문', value: factories?.reduce((sum, f) => sum + (f.total_orders ?? 0), 0) ?? 0, icon: '📦', color: '#0ea5e9' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-base)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border-[1.5px] border-[var(--border-light)]">
            <div className="text-[28px] mb-2">{stat.icon}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] mb-1">{stat.label}
              </div>
            <div className="text-[32px] font-black" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>


      {!factories || factories.length === 0 ? (
        <div className="text-center text-[var(--text-tertiary)] bg-[var(--bg-base)] rounded-2xl py-[80px] px-5 border-[1.5px] border-[var(--border-light)]">
          <div className="mb-4 text-[64px]">🏭</div>
          <div className="text-[18px] font-bold">승인된 공장이 없습니다</div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,_minmax(300px,_1fr))]">
          {factories.map((factory: any) => (
            <div key={factory.id} className="bg-[var(--bg-base)] rounded-2xl overflow-hidden shadow-[var(--shadow-sm)] border-[1.5px] border-[var(--border-light)]">
              <div className="p-5 text-white relative bg-[linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 100%)]">
                <div className="text-[11px] mb-1 opacity-60">{factory.factory_code ?? '-'}</div>
                <div className="text-lg font-extrabold mb-1">{factory.company_name ?? '-'}</div>
                <div className="text-xs opacity-70">{factory.contact_name ?? '-'}</div>
                {factory.avg_rating > 0 && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 text-xs font-bold bg-[rgba(245,158,11,0.2)] border border-[rgba(245,158,11,0.4)] text-[#fbbf24]" style={{ borderRadius: 99 }}>
                    ⭐ {factory.avg_rating.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="px-5 py-4">
                <div className="flex gap-4 mb-3">
                  <div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">총 주문
              </div>
                    <div className="text-lg font-extrabold text-[#e11d48]">{factory.total_orders ?? 0}건</div>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mb-3">{factory.email ?? '-'}
              </div>
                <div className="flex gap-2">
                  <Link href={`/md/chat`} className="flex-1 rounded-lg text-emerald-500 no-underline text-xs font-semibold text-center bg-[#f0fdf4] border border-[#bbf7d0] py-2 px-0">
                    채팅하기
                  </Link>
                  <Link href={`/md/briefs`} className="flex-1 rounded-lg no-underline text-xs font-semibold text-center bg-[#eff6ff] text-[#0ea5e9] border border-[#bfdbfe] py-2 px-0">
                    Brief 보내기
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
