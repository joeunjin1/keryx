/**
 * 관리자 카테고리 개별 관리 API
 * PATCH  /api/admin/categories/[id] - 카테고리 수정
 * DELETE /api/admin/categories/[id] - 카테고리 비활성화 (soft delete)
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

// PATCH: 카테고리 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const body = await req.json();
  const { code, name_ko, name_zh, display_order, is_active, parent_id } = body;

  const supabase = getServiceClient();

  // 코드 중복 확인 (자기 자신 제외)
  if (code) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('code', code.toUpperCase().trim())
      .neq('id', params.id)
      .single();
    if (existing) {
      return NextResponse.json({ error: `코드 "${code}"가 이미 존재합니다` }, { status: 409 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (code !== undefined) updateData.code = code.toUpperCase().trim();
  if (name_ko !== undefined) updateData.name_ko = name_ko.trim();
  if (name_zh !== undefined) updateData.name_zh = name_zh?.trim() || null;
  if (display_order !== undefined) updateData.display_order = display_order;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (parent_id !== undefined) updateData.parent_id = parent_id || null;

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

// DELETE: 카테고리 비활성화 (soft delete - 연결된 상품 보호)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const supabase = getServiceClient();

  // 해당 카테고리에 연결된 상품 수 확인
  const { count } = await supabase
    .from('factory_products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', params.id);

  if (count && count > 0) {
    // 상품이 있으면 비활성화만 (soft delete)
    const { data, error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', params.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      category: data,
      message: `${count}개의 상품이 연결되어 있어 비활성화 처리되었습니다.`,
      soft_deleted: true,
    });
  }

  // 상품이 없으면 실제 삭제
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
