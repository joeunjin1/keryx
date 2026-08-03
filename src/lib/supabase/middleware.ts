import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // IMPORTANT: refresh session — required for auth to work in server components
  const { data: { user } } = await supabase.auth.getUser();

  // Route protection — redirect non-authed users to /login (except public paths)
  const path = request.nextUrl.pathname;
  const isPublic =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth/callback') ||
    path.startsWith('/api/public') ||
    path.startsWith('/api/apply') ||
    path.startsWith('/api/auth/link-requests') ||
    path.startsWith('/shop') ||
    path.startsWith('/membership') ||
    path.startsWith('/support') ||
    path.startsWith('/apply') ||
    path.startsWith('/portfolio') ||
    path.startsWith('/pricing') ||
    path.startsWith('/terms') ||
    path.startsWith('/services') ||
    path.startsWith('/faq') ||
    path.startsWith('/quote') ||
    path.startsWith('/privacy') ||
    path.startsWith('/about') ||
    path.startsWith('/contact') ||
    path.startsWith('/lp') ||
    path.startsWith('/landing') ||
    path.startsWith('/api/admin/init-db') ||
    path.startsWith('/api/admin/migrate') ||
    path.startsWith('/api/admin/migrate-staff-emails') ||
    path.startsWith('/api/admin/apply-rls') ||
    path.startsWith('/api/admin/fix-quote-requests') ||
    path.startsWith('/api/admin/fix-factories') ||
    path.startsWith('/api/quote/submit') ||
    path.startsWith('/api/quote/upload-image') ||
    path.startsWith('/ip-story') ||
    path.startsWith('/ip-serial') ||
    path.startsWith('/ip-goods') ||
    path.startsWith('/showroom') ||
    path.startsWith('/catalog') ||
    path.startsWith('/api/subscribe') ||
    path.startsWith('/ip-license');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // ── 역할 기반 영역 침범 방지 ────────────────────────────
  if (user) {
    const isPortalPath =
      path.startsWith('/seller') ||
      path.startsWith('/factory') ||
      path.startsWith('/md') ||
      path.startsWith('/admin') ||
      path.startsWith('/inspector') ||
      path.startsWith('/marketing') ||
      path.startsWith('/my');

    if (isPortalPath) {
      // user_profiles에서 역할 조회 (단일 소스)
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('kind')
        .eq('id', user.id)
        .single() as { data: { kind: string } | null };

      const role = profile?.kind ?? '';

      // admin은 모든 포털 접근 허용 (bypass)
      if (role === 'admin') {
        return supabaseResponse;
      }

      // 역할별 허용 경로
      const roleAllowedPaths: Record<string, string[]> = {
        seller:    ['/seller', '/my'],
        factory:   ['/factory', '/my'],
        md:        ['/md', '/admin', '/my'],
        inspector: ['/md/inspections', '/inspector', '/my'],
        designer:  ['/designer', '/my'],
        marketing: ['/marketing', '/my'],
      };

      // 역할별 홈 경로 (침범 시 리다이렉트 목적지)
      const roleHomePath: Record<string, string> = {
        seller:    '/seller',
        factory:   '/factory',
        md:        '/md',
        inspector: '/md/inspections',
        designer:  '/designer/tasks',
        marketing: '/marketing',
      };

      const allowedPaths = roleAllowedPaths[role] ?? [];
      const isAllowed = allowedPaths.some(allowed => path.startsWith(allowed));

      if (!isAllowed && role) {
        // 역할에 맞는 홈으로 리다이렉트 (영역 침범 차단)
        const redirectTo = roleHomePath[role] ?? '/login';
        const url = request.nextUrl.clone();
        url.pathname = redirectTo;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
