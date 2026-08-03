"use client";
/**
 * BottomTabBar — 모바일 하단 탭바 컴포넌트
 * [mobile-first-design 스킬] 준수 - 44px 최소 터치 타겟
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabItem {
  href: string;
  label: string;
  labelZh?: string;
  icon: string;
  badge?: number;
}

interface BottomTabBarProps {
  items: TabItem[];
  lang?: "ko" | "zh";
  accentColor?: string;
}

export function BottomTabBar({ items, lang = "ko", accentColor = "#667eea" }: BottomTabBarProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 safe-area-inset-bottom">
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const label = lang === "zh" && item.labelZh ? item.labelZh : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[56px] py-1.5 gap-0.5 transition-colors relative ${
                isActive ? "text-indigo-600" : "text-neutral-500 hover:text-neutral-700"
              }`}
              style={isActive ? { color: accentColor } : undefined}
            >
              {/* 배지 */}
              {(item.badge ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1/4 inline-flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {(item.badge ?? 0) > 99 ? "99+" : item.badge}
                </span>
              )}
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabBar;
