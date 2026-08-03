export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireFactory } from '@/lib/auth/check-role';
import FactoryShell from './FactoryShell';
// ── [sidebar-design-system] 단일 소스 navigation.ts에서 import ──────────
import { factoryNavItems, injectBadges } from '@/config/navigation';

export const metadata: Metadata = {
  title: {
    default: '공급사 포털',
    template: '%s | KERYX 공급사',
  },
  description: 'KERYX 마켓 입점 공급사 포털 — 제품 등록, 주문 처리, Brief 응답, 검수 관리를 수행합니다.',
  robots: { index: false, follow: false },
};

export default async function FactoryLayout({ children }: { children: React.ReactNode }) {
  // 중앙화된 권한 체크: factory 또는 admin만 접근 허용
  const auth = await requireFactory();
  if (!auth) return null;

  const supabase = createClient() as any;
  const isAdmin = auth.user.role === 'admin' || auth.user.role === 'md';

  const { data: factory } = await supabase
    .from('factories')
    .select('id, factory_code, company_name, approval_status')
    .eq('shared_login_user_id', auth.user.id)
    .single() as { data: any; error: any };

  // 미읽은 메시지 배지
  let unreadMessages = 0;
  if (factory?.id) {
    const { data: factoryConvo } = await supabase
      .from('conversations')
      .select('unread_count_md')
      .eq('factory_id', factory.id)
      .is('seller_id', null)
      .single() as { data: any; error: any };
    unreadMessages = factoryConvo?.unread_count_md ?? 0;
  }

  // Brief 배지
  let openBriefCount = 0;
  if (factory?.id) {
    const { data: briefRecipients } = await supabase
      .from('brief_recipients')
      .select('id, responded_at')
      .eq('factory_id', factory.id) as { data: any[]; error: any };
    openBriefCount = (briefRecipients ?? []).filter((r: any) => !r.responded_at).length;
  }

  // 배지 주입 (단일 소스 유틸리티 사용)
  const navWithBadge = injectBadges(factoryNavItems, {
    '/factory/messages': unreadMessages,
    '/factory/briefs': openBriefCount,
  });

  const companyName = factory?.company_name ?? (isAdmin ? 'SENKANG ADMIN' : '공장');
  const factoryCode = factory?.factory_code ?? '';

  return (
    <FactoryShell
      navItems={navWithBadge}
      userName={companyName}
      userRole={isAdmin ? '관리자(공장 뷰)' : `공장 ${factoryCode}`}
      userRoleZh={isAdmin ? '管理员(工厂视图)' : `工厂 ${factoryCode}`}
    >
      {children}
    </FactoryShell>
  );
}
