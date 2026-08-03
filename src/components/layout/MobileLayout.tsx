"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LangProvider, useLangContext } from "./LangContext";
export { useLangContext as useLang } from "./LangContext";
export type { Lang } from "./LangContext";
export { useLangContext } from "./LangContext";

export interface NavItem {
  href: string;
  label: string;
  labelZh?: string;
  icon: string;
  tabIcon?: string;
  badge?: number;
}

export interface NavGroup {
  groupLabel: string;
  groupLabelZh?: string;
  groupIcon: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

interface MobileLayoutProps {
  title: string;
  titleZh?: string;
  subtitle?: string;
  navItems: NavEntry[];
  userName: string;
  userRole: string;
  userRoleZh?: string;
  accentColor?: string;
  portalType?: "seller" | "factory" | "admin" | "md" | "designer";
  children: React.ReactNode;
  onLogout?: () => void;
}

// 포털별 테마 설정
const PORTAL_THEMES = {
  seller: {
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    accent: "#667eea",
    sidebarBg: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    headerBg: "rgba(255,255,255,0.98)",
    logoColor: "#667eea",
    tagline: "중국 제품 공장 매칭 포털",
    taglineZh: "中国产品工厂匹配门户",
    logoImage: "/logos/logo-horizontal.png",
    logoImageAlt: "KERYX B2B",
  },
  factory: {
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    accent: "#e11d48",
    sidebarBg: "linear-gradient(180deg, #1a0a0a 0%, #2d1515 50%, #4a1a1a 100%)",
    headerBg: "rgba(255,255,255,0.98)",
    logoColor: "#e11d48",
    tagline: "마켓 입점 공급사 포털",
    taglineZh: "市场入驻供应商门户",
    logoImage: "/logos/logo-factory-transparent.png",
    logoImageAlt: "KERYX Factory",
  },
  admin: {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    accent: "#0ea5e9",
    sidebarBg: "linear-gradient(180deg, #0a0a1a 0%, #0f172a 50%, #1e293b 100%)",
    headerBg: "rgba(255,255,255,0.98)",
    logoColor: "#0ea5e9",
    tagline: "관리 대시보드",
    taglineZh: "管理控制台",
    logoImage: "/logos/logo-admin-rounded.png",
    logoImageAlt: "KERYX Admin",
  },
  md: {
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    accent: "#10b981",
    sidebarBg: "linear-gradient(180deg, #0a1a0a 0%, #0f2d1e 50%, #1a4a2e 100%)",
    headerBg: "rgba(255,255,255,0.98)",
    logoColor: "#10b981",
    tagline: "MD 업무 포털",
    taglineZh: "MD工作门户",
    logoImage: "/logos/logo-admin-rounded.png",
    logoImageAlt: "KERYX MD",
  },
  designer: {
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    accent: "#f59e0b",
    sidebarBg: "linear-gradient(180deg, #1a1500 0%, #2d2000 50%, #4a3500 100%)",
    headerBg: "rgba(255,255,255,0.98)",
    logoColor: "#f59e0b",
    tagline: "디자이너 포털",
    taglineZh: "设计师门户",
    logoImage: "/logos/logo-admin-rounded.png",
    logoImageAlt: "KERYX Designer",
  },
};

/* ── 그룹 네비게이션 컴포넌트 ── */
function NavGroupItem({
  group, color, pathname, lang, sidebarCollapsed, closeSidebar,
}: {
  group: NavGroup; color: string; pathname: string;
  lang: string; sidebarCollapsed: boolean; closeSidebar: () => void;
}) {
  const isAnyActive = group.items.some(
    item => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const [open, setOpen] = useState(group.defaultOpen ?? isAnyActive);

  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  const groupLabel = lang === "zh" && group.groupLabelZh ? group.groupLabelZh : group.groupLabel;

  if (sidebarCollapsed) return null;

  return (
    <div className="mb-0.5">
      {/* 그룹 헤더 버튼 */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border-none cursor-pointer text-[13px] font-bold tracking-widest uppercase transition-all"
        style={{
          background: isAnyActive ? `${color}18` : "transparent",
          color: isAnyActive ? color : "rgba(255,255,255,0.5)",
        }}
      >
        <span className="text-base">{group.groupIcon}</span>
        <span className="flex-1 text-left">{groupLabel}</span>
        <span
          className="text-[10px] opacity-50 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >▼</span>
      </button>
      {/* 그룹 아이템 */}
      {open && (
        <div
          className="pl-2 ml-3 mt-0.5 mb-1"
          style={{ borderLeft: `2px solid ${color}35` }}
        >
          {group.items.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = lang === "zh" && item.labelZh ? item.labelZh : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`kx-nav-item-dark${isActive ? " active" : ""}`}
                onClick={closeSidebar}
                style={isActive ? { background: `${color}25`, color: "#fff" } : {}}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="flex-1 text-[14px]">{label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className="text-white text-[11px] font-bold px-1.5 py-px rounded-full shrink-0"
                    style={{ background: color }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 실제 레이아웃 내부 컴포넌트 (LangProvider 안에서 실행) ── */
function MobileLayoutInner({
  title,
  titleZh,
  navItems,
  userName,
  userRole,
  userRoleZh,
  accentColor,
  portalType = "admin",
  children,
  onLogout,
}: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // ✅ LangProvider 안에서 호출되므로 정상 동작
  const { lang, setLang } = useLangContext();

  const theme = PORTAL_THEMES[portalType];
  const color = accentColor || theme.accent;

  // 모바일에서 사이드바 열릴 때 스크롤 방지
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const initial = userName ? userName[0] : "?";

  // 탭바용 flat 아이템 (그룹에서 추출)
  const flatNavItems: NavItem[] = navItems.flatMap(entry =>
    isNavGroup(entry) ? entry.items : [entry as NavItem]
  );
  const tabItems = flatNavItems.slice(0, 5);

  const displayTitle = lang === "zh" && titleZh ? titleZh : title;
  const displayTagline = lang === "zh" ? theme.taglineZh : theme.tagline;
  const displayRole = lang === "zh" && userRoleZh ? userRoleZh : userRole;

  const getNavLabel = (item: NavItem) =>
    lang === "zh" && item.labelZh ? item.labelZh : item.label;

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="kx-shell" style={{ "--portal-color": color, minHeight: '100dvh' } as React.CSSProperties}>
      {/* ── 모바일 오버레이 ── */}
      {sidebarOpen && (
        <div className="kx-overlay show" onClick={closeSidebar} />
      )}

      {/* ── 사이드바 ── */}
      <aside
        className={`kx-sidebar${sidebarOpen ? " open" : ""}${sidebarCollapsed ? " collapsed" : ""}`}
        style={{ background: theme.sidebarBg }}
      >
        {/* 사이드바 헤더 */}
        <div className="kx-sidebar-logo border-b border-white/[0.08] px-3.5 py-3 min-h-[56px] flex items-center">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Image
                src={theme.logoImage}
                alt={theme.logoImageAlt}
                width={portalType === "seller" ? 100 : 32}
                height={32}
                className="object-contain drop-shadow-md shrink-0"
                priority
              />
              {portalType !== "seller" && (
                <span className="text-[12px] text-white/45 font-normal tracking-wide truncate">
                  {displayTagline}
                </span>
              )}
            </div>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto">
              <Image
                src={theme.logoImage}
                alt={theme.logoImageAlt}
                width={28}
                height={28}
                className="object-contain rounded-md"
                priority
              />
            </div>
          )}
          {/* 데스크탑 접기/펼치기 버튼 */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="kx-sidebar-toggle-btn"
            aria-label={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            title={sidebarCollapsed ? "펼치기" : "접기"}
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={closeSidebar}
            className="kx-sidebar-close-btn"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 사용자 정보 */}
        {!sidebarCollapsed && (
          <div className="px-3.5 py-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[15px] font-bold text-white shrink-0"
                style={{ background: theme.gradient }}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white/90 truncate">
                  {userName}
                </div>
                <div className="text-[12px] text-white/45">{displayRole}</div>
              </div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="py-2.5 border-b border-white/[0.08] flex justify-center">
            <div
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[13px] font-bold text-white"
              style={{ background: theme.gradient }}
            >
              {initial}
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <nav className="kx-sidebar-nav" style={{ padding: sidebarCollapsed ? "10px 6px" : "10px 8px" }}>
          {navItems.map((entry, idx) => {
            if (isNavGroup(entry)) {
              return (
                <NavGroupItem
                  key={entry.groupLabel + idx}
                  group={entry}
                  color={color}
                  pathname={pathname}
                  lang={lang}
                  sidebarCollapsed={sidebarCollapsed}
                  closeSidebar={closeSidebar}
                />
              );
            }
            const item = entry as NavItem;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`kx-nav-item-dark${isActive ? " active" : ""}${sidebarCollapsed ? " collapsed" : ""}`}
                onClick={closeSidebar}
                style={isActive ? { background: `${color}25`, color: "#fff" } : {}}
                title={sidebarCollapsed ? getNavLabel(item) : undefined}
              >
                <span className="text-[17px] shrink-0">{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-[14px]">{getNavLabel(item)}</span>
                    {item.badge && item.badge > 0 ? (
                      <span
                        className="text-white text-[11px] font-bold px-1.5 py-px rounded-full shrink-0"
                        style={{ background: color }}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}
                {sidebarCollapsed && item.badge && item.badge > 0 ? (
                  <span
                    className="absolute top-0.5 right-0.5 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center"
                    style={{ background: color }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* 로그아웃 */}
        <div className="border-t border-white/[0.08]" style={{ padding: sidebarCollapsed ? "10px 6px" : "10px 8px" }}>
          {onLogout ? (
            <button
              className={`kx-nav-item-dark text-red-400${sidebarCollapsed ? " collapsed" : ""}`}
              onClick={onLogout}
              title={sidebarCollapsed ? "로그아웃" : undefined}
            >
              <span className="text-[17px]">🚪</span>
              {!sidebarCollapsed && <span className="text-[14px]">{lang === "zh" ? "退出登录" : "로그아웃"}</span>}
            </button>
          ) : (
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className={`kx-nav-item-dark text-red-400${sidebarCollapsed ? " collapsed" : ""}`}
                title={sidebarCollapsed ? "로그아웃" : undefined}
              >
                <span className="text-[17px]">🚪</span>
                {!sidebarCollapsed && <span className="text-[14px]">{lang === "zh" ? "退出登录" : "로그아웃"}</span>}
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className={`kx-main${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        {/* 상단 바 */}
        <header className="kx-topbar" style={{ borderBottom: `2px solid ${color}18` }}>
          {/* 모바일 햄버거 */}
          <button
            className="kx-topbar-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="메뉴 열기"
          >
            <span className="block w-5 h-0.5 bg-neutral-500 rounded-sm" />
            <span className="block w-5 h-0.5 bg-neutral-500 rounded-sm" />
            <span className="block w-5 h-0.5 bg-neutral-500 rounded-sm" />
          </button>

          {/* 로고 (모바일 & 데스크탑 topbar) */}
          <span className="kx-topbar-logo flex items-center gap-1.5">
            <Image
              src={theme.logoImage}
              alt={theme.logoImageAlt}
              width={portalType === "seller" ? 90 : 28}
              height={28}
              className="object-contain"
              priority
            />
          </span>

          {/* 우측 액션 */}
          <div className="flex items-center gap-2 ml-auto">
            {/* 언어 전환 버튼 (topbar 우측) */}
            <button
              onClick={() => setLang(lang === "ko" ? "zh" : "ko")}
              title={lang === "ko" ? "切换到中文" : "한국어로 전환"}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer"
              style={{
                border: `1px solid ${color}30`,
                background: `${color}12`,
                color: color,
              }}
            >
              <span className="text-base">{lang === "ko" ? "🇰🇷" : "🇨🇳"}</span>
              <span>{lang === "ko" ? "KO" : "ZH"}</span>
            </button>
            {/* 사용자 아바타 */}
            <div
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[13px] font-bold text-white"
              style={{ background: theme.gradient }}
            >
              {initial}
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <div className="kx-content">
          {children}
        </div>
      </main>

      {/* ── 모바일 하단 탭바 ── */}
      <nav className="kx-mobile-nav" style={{
        borderTop: `2px solid ${color}20`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div className="kx-mobile-nav-inner">
          {tabItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`kx-mobile-nav-item${isActive ? " active" : ""}`}
                style={isActive ? { color } : {}}
              >
                <span className="text-xl leading-none">{item.tabIcon || item.icon}</span>
                <span className={`text-[11px] ${isActive ? "font-semibold" : "font-normal"} max-w-[52px] truncate text-center leading-tight`}>
                  {lang === "zh" && item.labelZh ? item.labelZh : item.label}
                </span>
              </Link>
            );
          })}
          {flatNavItems.length > 5 && (
            <button
              className="kx-mobile-nav-item"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="text-xl leading-none">☰</span>
              <span className="text-[11px]">{lang === "zh" ? "更多" : "더보기"}</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

/* ── 외부 진입점: LangProvider로 감싸고 Inner 렌더링 ── */
// 포털별 기본 언어 설정: 공장 포털은 중국어(zh), 나머지는 한국어(ko)
export default function MobileLayout(props: MobileLayoutProps) {
  const defaultLang = (props.portalType === "factory" || props.portalType === "admin" || props.portalType === "md") ? "zh" : "ko";
  // 포털별 localStorage 키 분리 (공장/바이어/관리자 언어 설정 독립)
  const storageKey = `keryx_lang_${props.portalType ?? "default"}`;
  return (
    <LangProvider defaultLang={defaultLang} storageKey={storageKey}>
      <MobileLayoutInner {...props} />
    </LangProvider>
  );
}
