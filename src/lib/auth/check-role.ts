/**
 * KERYX 권한 체크 중앙화 모듈
 * ─────────────────────────────────────────────────────────
 * 모든 페이지/API 라우트는 이 파일의 함수만 사용해야 합니다.
 * 직접 supabase.auth.getUser() + profile 조회를 반복하지 마세요.
 *
 * 역할(kind) 정의:
 *   admin     - 최고 관리자 (모든 기능)
 *   md        - MD 직원 (서비스 요청 처리, 공장 매칭)
 *   inspector - 검수 직원 (검수 업무만)
 *   marketing - 마케팅 직원 (단체/개별 메일·문자 발송)
 *   seller    - 바이어/셀러 (구매자 포털)
 *   factory   - 공장 파트너 (공장 포털)
 *   designer  - 디자이너 (디자인 작업)
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ── 타입 정의 ──────────────────────────────────────────────
export type UserRole = 'admin' | 'md' | 'inspector' | 'marketing' | 'seller' | 'factory' | 'designer';

export interface AuthUser {
  id: string;
  email: string | undefined;
  role: UserRole;
  displayName: string;
}

export interface AuthResult {
  user: AuthUser;
  supabase: ReturnType<typeof createClient>;
}

// ── 역할 그룹 상수 ─────────────────────────────────────────
export const INTERNAL_ROLES: UserRole[] = ['admin', 'md', 'inspector', 'marketing'];
export const ADMIN_ONLY: UserRole[] = ['admin'];
export const ALL_ROLES: UserRole[] = ['admin', 'md', 'inspector', 'marketing', 'seller', 'factory', 'designer'];

// ── 핵심 함수: 인증 + 역할 검증 ───────────────────────────
/**
 * 서버 컴포넌트 / API 라우트에서 호출.
 * 인증 실패 또는 권한 없으면 redirect 또는 null 반환.
 *
 * @param allowedRoles  허용할 역할 목록
 * @param redirectTo    인증 실패 시 이동할 경로 (기본: /login)
 * @param returnNull    redirect 대신 null 반환 여부 (API 라우트용)
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo = '/login',
  returnNull = false
): Promise<AuthResult | null> {
  const supabase = createClient() as any;

  // 1. 세션 사용자 확인 (getUser = 서버에서 JWT 검증, 신뢰할 수 있음)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (returnNull) return null;
    redirect(redirectTo);
  }

  // 2. 프로필에서 역할 조회
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('kind, display_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    if (returnNull) return null;
    redirect(redirectTo);
  }

  const role = profile.kind as UserRole;

  // 3. 역할 권한 검증
  if (!allowedRoles.includes(role)) {
    // 역할에 맞는 포털로 리다이렉트
    if (returnNull) return null;
    const roleRedirectMap: Record<UserRole, string> = {
      admin: '/admin',
      md: '/md',
      inspector: '/md/inspections',
      seller: '/seller',
      factory: '/factory',
      designer: '/designer/tasks',
      marketing: '/marketing',
    };
    redirect(roleRedirectMap[role] ?? redirectTo);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role,
      displayName: profile.display_name ?? role,
    },
    supabase,
  };
}

// ── 편의 함수들 ────────────────────────────────────────────

/** 관리자 전용 페이지 (admin만) */
export async function requireAdmin(returnNull = false) {
  return requireRole(ADMIN_ONLY, '/login?role=internal', returnNull);
}

/** 내부 직원 페이지 (admin + md + inspector) */
export async function requireInternal(returnNull = false) {
  return requireRole(INTERNAL_ROLES, '/login?role=internal', returnNull);
}

/** 셀러/바이어 페이지 */
export async function requireSeller(returnNull = false) {
  return requireRole(['seller', 'admin'], '/login?role=seller', returnNull);
}

/** 공장 포털 페이지 */
export async function requireFactory(returnNull = false) {
  return requireRole(['factory', 'admin'], '/login?role=factory', returnNull);
}

/** 디자이너 포털 페이지 */
export async function requireDesigner(returnNull = false) {
  return requireRole(['designer', 'admin'], '/login?role=internal', returnNull);
}

/** 마케팅 포털 페이지 */
export async function requireMarketing(returnNull = false) {
  return requireRole(['marketing', 'admin'], '/login?role=internal', returnNull);
}

// ── API 라우트용 헬퍼 ──────────────────────────────────────
/**
 * API 라우트에서 사용. 인증 실패 시 null 반환 (redirect 없음).
 * 호출자가 직접 NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 처리.
 */
export async function getAuthUser(allowedRoles: UserRole[] = ALL_ROLES): Promise<AuthUser | null> {
  const result = await requireRole(allowedRoles, '/login', true);
  return result?.user ?? null;
}
