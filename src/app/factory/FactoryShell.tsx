"use client";
/**
 * FactoryShell — 공장 포털 레이아웃 쉘
 * keryx-platform-dev 스킬 §1.3 준수 - MobileLayout 기반
 * sidebar-design-system 스킬 준수 - 단일 소스 navigation.ts 사용
 */
import MobileLayout from "@/components/layout/MobileLayout";
import type { NavEntry } from "@/config/navigation";

interface FactoryShellProps {
  navItems: NavEntry[];
  userName: string;
  userRole?: string;
  userRoleZh?: string;
  children: React.ReactNode;
}

export default function FactoryShell({ navItems, userName, userRole = "공장", userRoleZh = "工厂", children }: FactoryShellProps) {
  return (
    <MobileLayout
      title="공장 포털"
      titleZh="工厂门户"
      subtitle={userRole}
      navItems={navItems}
      userName={userName}
      userRole={userRole}
      userRoleZh={userRoleZh}
      portalType="factory"
    >
      {children}
    </MobileLayout>
  );
}
