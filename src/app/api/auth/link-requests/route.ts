/**
 * 비로그인 신청 user_id 자동 연결 API
 * 로그인/회원가입 완료 후 호출하여 동일 이메일로 신청된 건에 user_id를 연결
 * 이 API는 로그인한 사용자 본인의 이메일과 일치하는 신청 건만 업데이트함
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    // 현재 로그인한 사용자 확인 (anon key로 세션 검증)
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userEmail = user.email;
    const userId = user.id;

    if (!userEmail) {
      return NextResponse.json({ error: '이메일 정보가 없습니다.' }, { status: 400 });
    }

    // service_role_key로 RLS 우회하여 업데이트 (본인 이메일 일치 건만)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 동일 이메일로 신청된 건 중 user_id가 NULL인 건 모두 연결
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('service_requests')
      .update({ user_id: userId })
      .eq('email', userEmail)
      .is('user_id', null)
      .select('id, request_no, service_type');

    if (updateError) {
      console.error('[link-requests] update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const linkedCount = updated?.length ?? 0;
    console.log(`[link-requests] ${userEmail} → ${linkedCount}건 연결 완료`);

    return NextResponse.json({
      success: true,
      linked_count: linkedCount,
      linked_requests: updated ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[link-requests] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
