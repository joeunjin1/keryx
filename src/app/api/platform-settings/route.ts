export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: 플랫폼 설정 조회 (공개 - 할인율 등)
export async function GET(req: NextRequest) {
  try {
    const sb = getAdminSupabase();
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key) {
      const { data, error } = await sb
        .from('platform_settings')
        .select('key, value, description, updated_at')
        .eq('key', key)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    const { data, error } = await sb
      .from('platform_settings')
      .select('key, value, description, updated_at')
      .order('key');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH: 플랫폼 설정 수정 (관리자/MD만)
export async function PATCH(req: NextRequest) {
  try {
    const serverSb = createServerClient() as any;
    const { data: { user } } = await serverSb.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    // 권한 확인 (admin 또는 md만)
    const sb = getAdminSupabase();
    const { data: profile } = await sb
      .from('user_profiles')
      .select('kind, display_name')
      .eq('id', user.id)
      .single();
    
    const { data: internalUser } = await sb
      .from('internal_users')
      .select('role, name_ko')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.kind === 'admin' || internalUser?.role === 'admin';
    const isMd = internalUser?.role === 'md';

    if (!isAdmin && !isMd) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    }

    const body = await req.json();
    const { key, value } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key와 value는 필수입니다' }, { status: 400 });
    }

    const updatedBy = internalUser?.name_ko || profile?.display_name || user.email;

    const { data, error } = await sb
      .from('platform_settings')
      .upsert({
        key,
        value: String(value),
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
