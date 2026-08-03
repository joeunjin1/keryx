/**
 * KERYX API 클라이언트 - 401 자동 처리
 * ─────────────────────────────────────────────────────────
 * 모든 클라이언트 컴포넌트의 fetch 호출은 이 파일의 함수를 사용하세요.
 *
 * 흐름:
 *   API 호출 → 401 응답 → Supabase 토큰 refresh 시도
 *              → 성공: 원래 요청 재시도
 *              → 실패: /login으로 리다이렉트 (로그아웃)
 *
 * 사용법:
 *   import { apiFetch } from '@/lib/auth/api-client';
 *   const data = await apiFetch('/api/seller/orders');
 */

import { createClient } from '@/lib/supabase/client';

// 재시도 중 중복 refresh 방지 플래그
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * 토큰 refresh 시도 (중복 방지 포함)
 */
async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.refreshSession();
      return !error;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 로그아웃 처리 (서버에 signout 요청 후 로그인 페이지로 이동)
 */
async function handleSignOut() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // 무시
  }
  // 현재 URL에서 role 파라미터 추출하여 적절한 로그인 페이지로 이동
  const path = window.location.pathname;
  let loginUrl = '/login';
  if (path.startsWith('/admin') || path.startsWith('/md')) {
    loginUrl = '/login?role=internal';
  } else if (path.startsWith('/seller')) {
    loginUrl = '/login?role=seller';
  } else if (path.startsWith('/factory')) {
    loginUrl = '/login?role=factory';
  }
  window.location.href = loginUrl;
}

/**
 * 인증 인식 fetch 함수
 * 401 응답 시 토큰 refresh → 재시도 → 실패 시 로그아웃
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 첫 번째 요청
  const response = await fetch(url, options);

  // 401이 아니면 그대로 반환
  if (response.status !== 401) {
    return response;
  }

  // 401: 토큰 refresh 시도
  const refreshed = await tryRefreshToken();

  if (!refreshed) {
    // refresh 실패 → 로그아웃
    await handleSignOut();
    return response; // 호출자에게 원래 401 응답 반환 (이미 리다이렉트 중)
  }

  // refresh 성공 → 원래 요청 재시도
  const retryResponse = await fetch(url, options);

  if (retryResponse.status === 401) {
    // 재시도도 401 → 로그아웃
    await handleSignOut();
  }

  return retryResponse;
}

/**
 * JSON API 호출 편의 함수
 */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API 오류: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API 오류: ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API 오류: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const res = await apiFetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API 오류: ${res.status}`);
  }
  return res.json();
}
