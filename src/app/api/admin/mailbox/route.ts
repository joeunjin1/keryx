/**
 * 관리자 메일함 API
 * GET /api/admin/mailbox - 이메일 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function createSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();

    if (!profile || profile.kind !== 'admin') {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'inbox'; // inbox | starred | archived | all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // 서비스 롤 클라이언트로 RLS 우회하여 조회
    const { createClient } = await import('@supabase/supabase-js');
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = serviceClient
      .from('inbound_emails')
      .select('id, message_id, from_email, from_name, to_email, subject, text_body, is_read, is_starred, is_archived, labels, received_at', { count: 'exact' });

    // 필터 적용
    if (filter === 'inbox') {
      query = query.eq('is_archived', false);
    } else if (filter === 'starred') {
      query = query.eq('is_starred', true).eq('is_archived', false);
    } else if (filter === 'archived') {
      query = query.eq('is_archived', true);
    }
    // 'all'은 필터 없음

    // 검색 적용
    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,from_email.ilike.%${search}%,from_name.ilike.%${search}%,text_body.ilike.%${search}%`
      );
    }

    // 정렬 및 페이지네이션
    const { data: emails, count, error } = await query
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Mailbox API] 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 읽지 않은 이메일 수 조회
    const { count: unreadCount } = await serviceClient
      .from('inbound_emails')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_archived', false);

    return NextResponse.json({
      emails: emails || [],
      total: count || 0,
      page,
      limit,
      unread_count: unreadCount || 0,
    });

  } catch (err) {
    console.error('[Mailbox API] 오류:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}
