import type { Metadata } from 'next';
import { requireMarketing } from '@/lib/auth/check-role';
import { AdminShell } from '@/components/layout/AdminShell';

export const metadata: Metadata = {
  title: {
    default: '마케팅 대시보드',
    template: '%s | KERYX 마케팅',
  },
  description: 'KERYX 마케팅 포털 — 단체/개별 이메일 발송, 문자 발송 관리',
  robots: { index: false, follow: false },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireMarketing();
  if (!auth) return null;
  const displayName = auth.user.displayName ?? '마케팅';
  const role = auth.user.role as string;
  return (
    <AdminShell userName={displayName} role={role}>
      {children}
    </AdminShell>
  );
}
