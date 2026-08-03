import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/landing-settings
export async function GET(req: NextRequest) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await adminSupabase
    .from('landing_pages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pages: data });
}

// PATCH /api/admin/landing-settings
export async function PATCH(req: NextRequest) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const {
    id,
    is_active,
    banner_title_ko, banner_title_zh,
    banner_subtitle_ko, banner_subtitle_zh,
    factory_ids,
  } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  if (is_active !== undefined) updateData.is_active = is_active;
  if (banner_title_ko !== undefined) updateData.banner_title_ko = banner_title_ko;
  if (banner_title_zh !== undefined) updateData.banner_title_zh = banner_title_zh;
  if (banner_subtitle_ko !== undefined) updateData.banner_subtitle_ko = banner_subtitle_ko;
  if (banner_subtitle_zh !== undefined) updateData.banner_subtitle_zh = banner_subtitle_zh;
  if (factory_ids !== undefined) updateData.factory_ids = factory_ids;

  const { error } = await adminSupabase
    .from('landing_pages')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
