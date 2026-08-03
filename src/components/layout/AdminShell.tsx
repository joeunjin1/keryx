'use client';
import { AppShell } from './AppShell';
// ── [sidebar-design-system] 단일 소스 navigation.ts에서 import ──────────
// [buyer-management-portal 스킬] MD와 admin 뷰 완전 분리, inspector 전용 메뉴 추가
import { adminNavItems, mdNavItems, inspectorNavItems } from '@/config/navigation';

interface AdminShellProps {
  userName: string;
  role: string;
  children: React.ReactNode;
}

export function AdminShell({ userName, role, children }: AdminShellProps) {
  // 역할별 네비게이션 완전 분리 (관리자 메뉴가 MD/검수원에게 노출되지 않도록 차단)
  const nav = role === 'md'
    ? mdNavItems
    : role === 'inspector'
      ? inspectorNavItems
      : adminNavItems;
  const shellRole = role === 'md' ? 'md' : 'admin';
  return (
    <AppShell role={shellRole} userName={userName} navItems={nav}>
      {children}
    </AppShell>
  );
}
