import type { Metadata } from 'next';
import { requireInternal } from '@/lib/auth/check-role';
import { AdminShell } from '@/components/layout/AdminShell';

export const metadata: Metadata = {
  title: {
    default: '관리자 대시보드',
    template: '%s | KERYX 관리자',
  },
  description: 'KERYX B2B 플랫폼 관리자 포털 — 회원, 공장, 상품, 주문, 검수, 구독을 통합 관리합니다.',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 중앙화된 권한 체크: admin, md, inspector만 접근 허용
  const auth = await requireInternal();
  if (!auth) return null;

  const displayName = auth.user.displayName ?? '관리자';
  const role = auth.user.role as string;

  return (
    <AdminShell userName={displayName} role={role}>
      {children}
    </AdminShell>
  );
}
