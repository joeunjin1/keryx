import type { Metadata } from 'next';
import { requireInternal } from '@/lib/auth/check-role';
import { AdminShell } from '@/components/layout/AdminShell';

export const metadata: Metadata = {
  title: {
    default: 'MD 대시보드',
    template: '%s | KERYX MD',
  },
  description: 'KERYX MD 포털 — 담당 바이어 관리, 공장 매칭, 시장조사, 검수, 주문 처리를 수행합니다.',
  robots: { index: false, follow: false },
};

export default async function MdLayout({ children }: { children: React.ReactNode }) {
  // 중앙화된 권한 체크: admin, md, inspector만 접근 허용
  const auth = await requireInternal();
  if (!auth) return null;

  const displayName = auth.user.displayName ?? 'MD';
  const role = auth.user.role as string;

  return (
    <AdminShell userName={displayName} role={role}>
      {children}
    </AdminShell>
  );
}
