import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/seller'; // 로그인 후 셀러 대시보드로 이동
  const role = searchParams.get('role') ?? 'seller';

  if (!code) {
    // 에러 발생 시 로그인 페이지로 리다이렉트
    return NextResponse.redirect(`${origin}/login?error=oauth_error`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  ) as any;

  // 인증 코드를 세션으로 교환
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const user = data.user;

  // 소셜 로그인 사용자의 프로필 자동 생성 (user_profiles 테이블)
  // 이미 존재하면 업데이트하지 않음 (upsert with ignoreDuplicates)
  try {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.preferred_username ||
      user.email?.split('@')[0] ||
      '셀러';

    // user_profiles 테이블에 프로필 생성 (없을 경우에만)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          display_name: displayName,
          kind: role as 'seller' | 'factory' | 'md' | 'inspector' | 'admin' | 'designer',
          is_active: true,
        },
        {
          onConflict: 'id',
          ignoreDuplicates: true, // 이미 존재하면 무시
        }
      );

    if (profileError) {
      // 프로필 생성 실패해도 로그인은 계속 진행
      console.warn('Profile creation warning:', profileError.message);
    }
  } catch (profileErr) {
    console.warn('Profile creation error (non-fatal):', profileErr);
  }

  // 비로그인 신청 건 user_id 자동 연결 (이메일 일치 건)
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    if (user.email) {
      const { data: linked } = await supabaseAdmin
        .from('service_requests')
        .update({ user_id: user.id })
        .eq('email', user.email)
        .is('user_id', null)
        .select('id, request_no');
      if (linked && linked.length > 0) {
        console.log(`[auth/callback] ${user.email} → ${linked.length}건 신청 연결 완료`);
      }
    }
  } catch (linkErr) {
    console.warn('[auth/callback] link-requests non-fatal:', linkErr);
  }

  // 성공 시 대상 페이지로 리다이렉트
  const redirectUrl = next.startsWith('/') ? `${origin}${next}` : next;
  return NextResponse.redirect(redirectUrl);
}
