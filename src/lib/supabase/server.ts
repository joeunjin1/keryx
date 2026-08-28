/**
 * Supabase 서버 사이드 클라이언트
 * keryx-platform-dev 스킬 §2 준수 - 데이터 관리 원칙
 * 
 * 사용처: Server Components, API Routes, Server Actions
 * 주의: 클라이언트 컴포넌트에서는 @/lib/supabase/client 사용
 */
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** 인증 체크용 - anon_key, RLS 정책 적용 */
export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return (cookieStore as any).getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              (cookieStore as any).set(name, value, options);
            });
          } catch {
            // Server Component에서 쿠키 설정 불가 - 미들웨어에서 처리
          }
        },
      },
    }
  );
}

/**
 * 관리자 클라이언트 - service_role_key 사용, RLS 완전 우회
 * API 라우트에서 DB INSERT/UPDATE/DELETE 작업 시 사용
 * 절대 클라이언트 컴포넌트에서 사용 금지
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 민감한 주문·결제·관리자 작업에서 anon key로 권한을 낮춰 대체하면
  // RLS 오류가 숨겨지거나 의도하지 않은 접근 경로가 생길 수 있다.
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side privileged operations.');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
