export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireSeller } from '@/lib/auth/check-role';
import SellerShell from './SellerShell';
// ── [sidebar-design-system] 단일 소스 navigation.ts에서 import ──────────
import { sellerNavItems } from '@/config/navigation';

export const metadata: Metadata = {
  title: {
    default: '바이어 대시보드',
    template: '%s | KERYX 바이어',
  },
  description: 'KERYX 바이어 포털 — IP 굿즈 기획, 공장 매칭, 샘플 요청, 주문 관리를 한 곳에서.',
  robots: { index: false, follow: false },
};

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  // 중앙화된 권한 체크: seller 또는 admin만 접근 허용
  const auth = await requireSeller();
  if (!auth) return null; // requireSeller 내부에서 redirect 처리됨

  const supabase = createClient() as any;

  // 셀러 등급 정보 추가 조회 (isVip 배지용)
  const { data: seller } = await supabase
    .from('sellers')
    .select('current_grade, business_name')
    .eq('user_id', auth.user.id)
    .single();

  const isVip = seller?.current_grade === 'vip' || seller?.current_grade === 'premium';
  const displayName = auth.user.displayName || seller?.business_name || '셀러';

  return (
    <SellerShell
      navGroups={sellerNavItems as any}
      displayName={displayName}
      isVip={isVip}
    >
      {children}
    </SellerShell>
  );
}
