/**
 * 관리자 카테고리 관리 API
 * GET  /api/admin/categories  - 전체 카테고리 목록 조회
 * POST /api/admin/categories  - 새 카테고리 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAdminUser(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'md'].includes(profile.kind)) return null;
  return user;
}

// GET: 전체 카테고리 목록 (관리자용 - 비활성 포함)
export async function GET(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, code, name_ko, name_zh, display_order, is_active, parent_id, created_at')
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data || [] });
}

// POST: 새 카테고리 생성
export async function POST(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const body = await req.json();
  const { code, name_ko, name_zh, display_order, is_active, parent_id } = body;

  if (!code || !name_ko) {
    return NextResponse.json({ error: '코드와 한국어 이름은 필수입니다' }, { status: 400 });
  }

  // 코드 중복 확인
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: `코드 "${code}"가 이미 존재합니다` }, { status: 409 });
  }

  // display_order 자동 계산 (미입력 시 마지막 순서)
  let order = display_order;
  if (order === undefined || order === null) {
    const { data: lastCat } = await supabase
      .from('categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    order = (lastCat?.display_order ?? 0) + 10;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      code: code.toUpperCase().trim(),
      name_ko: name_ko.trim(),
      name_zh: name_zh?.trim() || null,
      display_order: order,
      is_active: is_active !== false,
      parent_id: parent_id || null,
      level: parent_id ? 2 : 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data }, { status: 201 });
}
