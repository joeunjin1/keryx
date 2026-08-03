"use client";
/**
 * SellerShell — 바이어 포털 레이아웃 쉘
 * keryx-platform-dev 스킬 §1.3 준수 - MobileLayout 기반
 * sidebar-design-system 스킬 준수 - 단일 소스 navigation.ts 사용
 */
import MobileLayout from "@/components/layout/MobileLayout";
import type { NavEntry } from "@/config/navigation";
import { useLangContext } from '@/components/layout/LangContext';

interface SellerShellProps {
  navGroups: NavEntry[];
  displayName: string;
  isVip?: boolean;
  children: React.ReactNode;
}

export default function SellerShell({
  navGroups, displayName, isVip = false, children
}: SellerShellProps) {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  return (
    <MobileLayout
      title={t('바이어 포털', '买家门户')}
      titleZh="买家(客户)门户"
      subtitle={isVip ? t('VIP 바이어', 'VIP买家') : t('바이어(고객)', '买家(客户)')}
      navItems={navGroups}
      userName={displayName}
      userRole={isVip ? t('VIP 바이어', 'VIP买家') : t('바이어(고객)', '买家(客户)')}
      userRoleZh={isVip ? "VIP买家" : "买家(客户)"}
      portalType="seller"
    >
      {children}
    </MobileLayout>
  );
}
