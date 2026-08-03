'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// ── [sidebar-design-system] 타입은 단일 소스 navigation.ts에서 import ──
import type { NavEntry, NavGroup, NavItem } from '@/config/navigation';
import { isNavGroup, injectBadges } from '@/config/navigation';
import { LangContext } from './LangContext';
import { createClient } from '@/lib/supabase/client';

// 하위 호환성을 위해 re-export
export type { NavEntry, NavGroup, NavItem };

interface AppShellProps {
  role: 'admin' | 'md' | 'seller' | 'factory' | 'designer';
  userName: string;
  navItems: NavEntry[];
  children: React.ReactNode;
}

const roleColors: Record<string, string> = {
  admin:    '#6366f1',
  md:       '#0ea5e9',
  seller:   '#10b981',
  factory:  '#f59e0b',
  designer: '#8b5cf6',
};

const roleLabels: Record<string, { ko: string; zh: string }> = {
  admin:    { ko: '관리자', zh: '管理员' },
  md:       { ko: 'MD', zh: 'MD' },
  seller:   { ko: '바이어(고객)', zh: '买家(客户)' },
  factory:  { ko: '공장', zh: '工厂' },
  designer: { ko: '디자이너', zh: '设计师' },
};

const logoutLabel = { ko: '로그아웃', zh: '退出登录' };

function NavGroupItem({
  group, color, pathname, lang, collapsed,
}: {
  group: NavGroup;
  color: string;
  pathname: string;
  lang: 'ko' | 'zh';
  collapsed: boolean;
}) {
  const isAnyActive = group.items.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const [open, setOpen] = useState(group.defaultOpen ?? isAnyActive);

  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  const groupLabel = lang === 'zh' && group.groupLabelZh ? group.groupLabelZh : group.groupLabel;

  // collapsed 상태에서는 아이콘만 표시
  if (collapsed) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => setOpen(o => !o)}
          title={groupLabel}
          className="w-full flex items-center justify-center px-0 py-[9px] rounded-md border-none cursor-pointer transition-all duration-150"
          style={{
            background: isAnyActive ? color + '10' : 'transparent',
            color: isAnyActive ? color : 'rgba(255,255,255,0.5)',
          }}
          onMouseEnter={e => {
            if (!isAnyActive) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)';
            }
          }}
          onMouseLeave={e => {
            if (!isAnyActive) {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
            }
          }}
        >
          <span className="text-base">{group.groupIcon}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      {/* [허용 예외] isAnyActive 조건부 배경색 - 동적 포털 색상(color) 변수 사용 */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-[7px] rounded-md border-none cursor-pointer text-[11px] font-bold tracking-[0.06em] uppercase transition-all duration-150"
        style={{
          background: isAnyActive ? color + '10' : 'transparent',
          color: isAnyActive ? color : 'rgba(255,255,255,0.5)',
        }}
        onMouseEnter={e => {
          if (!isAnyActive) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)';
          }
        }}
        onMouseLeave={e => {
          if (!isAnyActive) {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
          }
        }}
      >
        <span className="text-sm">{group.groupIcon}</span>
        <span className="flex-1 text-left">{groupLabel}</span>
        <span
          className="text-[10px] opacity-60 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >▼</span>
      </button>
      {open && (
        /* [허용 예외] 동적 포털 색상(color) 변수로 borderLeft 색상 설정 */
        <div
          className="pl-2 ml-3 mt-0.5 mb-1"
          style={{ borderLeft: `2px solid ${color}30` }}
        >
          {group.items.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const itemLabel = lang === 'zh' && item.labelZh ? item.labelZh : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`kx-nav-item${isActive ? ' active' : ''}`}
                /* [허용 예외] CSS 변수 동적 주입 - active 상태의 포털 색상 */
                style={isActive ? { '--nav-color': color } as React.CSSProperties : undefined}
              >
                <span className="text-[15px] leading-none">{item.icon}</span>
                <span className={`flex-1 text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{itemLabel}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  /* [허용 예외] 동적 포털 색상(color) 변수로 배지 배경색 설정 */
                  <span
                    className="text-white text-[10px] font-bold px-[5px] py-px rounded-full min-w-[16px] text-center"
                    style={{ background: color }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppShell({ role, userName, navItems, children }: AppShellProps) {
  // 모바일: 사이드바 오버레이 열림/닫힘
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 채팅 알림 배지 - 읽지 않은 메시지 수
  const [unreadBadges, setUnreadBadges] = useState<Record<string, number>>({});
  // 데스크탑: 사이드바 접힘 상태 (기본값: true = 접힘 → 사용자 편의성 원칙)
  const collapsedStorageKey = `keryx_sidebar_collapsed_${role}`;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // 공장/관리자/MD 포털은 기본 중국어, 셀러/디자이너는 기본 한국어
  const defaultLang: 'ko' | 'zh' = (role === 'factory' || role === 'admin' || role === 'md') ? 'zh' : 'ko';
  // role별 전용 storageKey 사용: 공장/바이어/관리자 언어 설정 독립 관리
  const storageKey = `keryx_lang_${role}`;
  const [lang, setLang] = useState<'ko' | 'zh'>(defaultLang);
  const pathname = usePathname();
  /* [허용 예외] 동적 포털 색상 - 역할별로 다른 색상 JS 변수 */
  const color = roleColors[role];

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as 'ko' | 'zh' | null;
    if (saved) {
      setLang(saved);
    } else {
      setLang(defaultLang);
      localStorage.setItem(storageKey, defaultLang);
    }
    // 사이드바 접힘 상태 복원 (저장된 값 없으면 기본 true = 접힘)
    const savedCollapsed = localStorage.getItem(collapsedStorageKey);
    if (savedCollapsed !== null) {
      setSidebarCollapsed(savedCollapsed === 'true');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const toggleLang = () => {
    const next = lang === 'ko' ? 'zh' : 'ko';
    setLang(next);
    localStorage.setItem(storageKey, next);
  };

  const toggleCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem(collapsedStorageKey, String(next));
  };

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // 채팅 알림 배지: 역할별 읽지 않은 메시지 수 실시간 조회
  useEffect(() => {
    // 채팅 기능이 있는 역할만 조회
    if (!['md', 'seller', 'admin'].includes(role)) return;
    const supabase = createClient();
    let isMounted = true;

    const fetchUnread = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // conversations 테이블에서 현재 사용자의 대화 목록 조회
        const field = role === 'seller' ? 'seller_id' : 'md_id';
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .eq(field, user.id);

        if (!convs || convs.length === 0 || !isMounted) return;

        const convIds = convs.map(c => c.id);
        // 읽지 않은 메시지 수 조회 (read_at is null)
        const senderRole = role === 'seller' ? 'md' : 'seller';
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .eq('sender', senderRole)
          .is('read_at', null);

        if (!isMounted) return;
        const total = count ?? 0;
        // 채팅 링크를 배지 맵에 주입
        const chatHref = role === 'seller' ? '/seller/md-chat' : '/md/community';
        setUnreadBadges(total > 0 ? { [chatHref]: total } : {});
      } catch {
        // 실패 시 조용히 무시
      }
    };

    fetchUnread();
    // 30초마다 폴링
    const interval = setInterval(fetchUnread, 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // 배지를 navItems에 주입
  const navItemsWithBadges = Object.keys(unreadBadges).length > 0
    ? injectBadges(navItems, unreadBadges)
    : navItems;

  const closeSidebar = () => setSidebarOpen(false);
  const roleLabel = roleLabels[role]?.[lang] ?? role;

  return (
    <div className="kx-shell">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-[39] bg-black/35 backdrop-blur-sm"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`kx-sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* 로고 */}
        {/* [허용 예외] 동적 포털 색상(color) 변수로 borderBottom 색상 설정 */}
        <div className="kx-sidebar-logo" style={{ borderBottom: `2px solid ${color}22` }}>
          {!sidebarCollapsed && (
            <>
              <span
                className="text-[1.2rem] font-black tracking-[-0.05em]"
                style={{ color }}
              >
                KERYX
              </span>
              <span
                className="ml-2 text-[10px] font-semibold px-[7px] py-[2px] rounded-full tracking-[0.02em]"
                style={{ background: color + '18', color }}
              >
                {roleLabel}
              </span>
            </>
          )}
          {/* 데스크탑 접기/펼치기 버튼 */}
          <button
            onClick={toggleCollapsed}
            className="kx-sidebar-toggle-btn"
            title={sidebarCollapsed ? (lang === 'zh' ? '展开菜单' : '메뉴 펼치기') : (lang === 'zh' ? '收起菜单' : '메뉴 접기')}
            aria-label={sidebarCollapsed ? '메뉴 펼치기' : '메뉴 접기'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={closeSidebar}
            className="kx-sidebar-close-btn"
            aria-label="사이드바 닫기"
          >✕</button>
        </div>

        {/* 사용자 정보 (펼침 상태에서만 표시) */}
        {!sidebarCollapsed && (
          <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-white/[0.06]">
              {/* [허용 예외] 동적 포털 색상(color) 변수로 아바타 배경색 설정 */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{ background: color + '22', color }}
              >
                {userName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">{userName}</div>
                <div className="text-[11px] text-white/45">{roleLabel}</div>
              </div>
            </div>
          </div>
        )}

        {/* collapsed 상태에서 아바타만 표시 */}
        {sidebarCollapsed && (
          <div className="px-2 pt-2 pb-2 border-b border-white/[0.07] flex justify-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
              title={userName}
              style={{ background: color + '22', color }}
            >
              {userName.charAt(0)}
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto p-2">
          {navItemsWithBadges.map((entry, idx) => {
            if (isNavGroup(entry)) {
              return (
                <NavGroupItem
                  key={entry.groupLabel + idx}
                  group={entry}
                  color={color}
                  pathname={pathname}
                  lang={lang}
                  collapsed={sidebarCollapsed}
                />
              );
            }
            const item = entry as NavItem;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const itemLabel = lang === 'zh' && item.labelZh ? item.labelZh : item.label;
            if (sidebarCollapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={itemLabel}
                  className={`kx-nav-item${isActive ? ' active' : ''} justify-center px-0`}
                  style={isActive ? { '--nav-color': color } as React.CSSProperties : undefined}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`kx-nav-item${isActive ? ' active' : ''}`}
                /* [허용 예외] CSS 변수 동적 주입 - active 상태의 포털 색상 */
                style={isActive ? { '--nav-color': color } as React.CSSProperties : undefined}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className={`flex-1 text-[13.5px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{itemLabel}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  /* [허용 예외] 동적 포털 색상(color) 변수로 배지 배경색 설정 */
                  <span
                    className="text-white text-[10.5px] font-bold px-[6px] py-px rounded-full min-w-[18px] text-center"
                    style={{ background: color }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 하단 버튼 영역 */}
        <div className="px-2 pb-4 pt-2 border-t border-white/[0.07]">
          {!sidebarCollapsed && (
            <button
              onClick={toggleLang}
              className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md bg-transparent border-none cursor-pointer text-white/40 text-xs font-medium transition-all duration-150 mb-0.5 hover:bg-white/[0.07] hover:text-white/80"
            >
              {/* SVG: 지구본 아이콘 */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>{lang === 'ko' ? '中文으로 전환' : '한국어로 전환'}</span>
            </button>
          )}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              title={logoutLabel[lang]}
              className={`w-full flex items-center gap-2.5 px-3 py-[9px] rounded-md bg-transparent border-none cursor-pointer text-white/40 text-[13px] font-medium transition-all duration-150 hover:bg-white/[0.07] hover:text-white/80 ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              {/* SVG: 로그아웃 아이콘 */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {!sidebarCollapsed && <span>{logoutLabel[lang]}</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className={`kx-main${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <header className="kx-topbar">
          {/* 햄버거 버튼 (모바일) */}
          <button
            className="kx-topbar-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="메뉴"
          >
            {/* [허용 예외] sidebarOpen 조건부 transform - JS 조건부 값 */}
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--text-primary)', borderRadius: 2, transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none' }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--text-primary)', borderRadius: 2, transition: 'all 0.2s', opacity: sidebarOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 18, height: 2, background: 'var(--text-primary)', borderRadius: 2, transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none' }} />
          </button>

          {/* [허용 예외] 동적 포털 색상(color) 변수 */}
          <span className="kx-topbar-logo" style={{ color }}>KERYX</span>

          <div className="ml-auto flex items-center gap-2">
            {/* [허용 예외] 동적 포털 색상(color) 변수로 border/text 색상 설정 */}
            <button
              onClick={toggleLang}
              className="px-2.5 py-1 bg-transparent rounded-lg text-[11px] cursor-pointer font-semibold transition-colors"
              style={{ border: `1px solid ${color}40`, color }}
            >
              {lang === 'ko' ? '中文' : '한국어'}
            </button>
            {/* [허용 예외] 동적 포털 색상(color) 변수로 배지 배경/텍스트 색상 설정 */}
            <div
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: color + '15', color }}
            >
              {roleLabel}
            </div>
            {/* [허용 예외] 동적 포털 색상(color) 변수로 아바타 배경/텍스트 색상 설정 */}
            <div
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: color + '22', color }}
            >
              {userName.charAt(0)}
            </div>
          </div>
        </header>
        <main className="kx-content">
          {/* LangContext.Provider: 관리자/MD/공장/디자이너 포털 페이지에서 useLangContext() 사용 가능하도록 래핑 */}
          <LangContext.Provider value={{ lang, setLang: (l) => { setLang(l); localStorage.setItem(storageKey, l); }, toggle: toggleLang }}>
            {children}
          </LangContext.Provider>
        </main>
      </div>
    </div>
  );
}
