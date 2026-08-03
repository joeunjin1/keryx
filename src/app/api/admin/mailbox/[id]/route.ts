/**
 * 관리자 메일함 상세 API
 * GET /api/admin/mailbox/[id] - 이메일 상세 조회 + 읽음 처리
 * PATCH /api/admin/mailbox/[id] - 별표/아카이브 처리
 * DELETE /api/admin/mailbox/[id] - 이메일 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function checkAdminAuth() {
  const supabase = createSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single();

  if (!profile || profile.kind !== 'admin') return null;
  return user;
}

// GET: 이메일 상세 조회 + 읽음 처리
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await checkAdminAuth();
    if (!user) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
    }

    const serviceClient = getServiceClient();

    // 이메일 조회
    const { data: email, error } = await serviceClient
      .from('inbound_emails')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !email) {
      return NextResponse.json({ error: '이메일을 찾을 수 없습니다' }, { status: 404 });
    }

    // 읽음 처리
    if (!email.is_read) {
      await serviceClient
        .from('inbound_emails')
        .update({ is_read: true })
        .eq('id', params.id);
      email.is_read = true;
    }

    return NextResponse.json({ email });

  } catch (err) {
    console.error('[Mailbox Detail API] GET 오류:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

// PATCH: 별표/아카이브/읽음 상태 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await checkAdminAuth();
    if (!user) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, boolean | string[]> = {};

    if (typeof body.is_starred === 'boolean') updates.is_starred = body.is_starred;
    if (typeof body.is_archived === 'boolean') updates.is_archived = body.is_archived;
    if (typeof body.is_read === 'boolean') updates.is_read = body.is_read;
    if (Array.isArray(body.labels)) updates.labels = body.labels;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '변경할 필드가 없습니다' }, { status: 400 });
    }

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from('inbound_emails')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ email: data });

  } catch (err) {
    console.error('[Mailbox Detail API] PATCH 오류:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}

// DELETE: 이메일 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await checkAdminAuth();
    if (!user) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
    }

    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from('inbound_emails')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[Mailbox Detail API] DELETE 오류:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 }
    );
  }
}
