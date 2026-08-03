import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/landing-inquiries?status=pending&slug=storage&page=1&limit=20
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

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  const slug = url.searchParams.get('slug') || '';
  const type = url.searchParams.get('type') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = adminSupabase
    .from('landing_page_inquiries')
    .select('*, landing_page:landing_pages(slug, title_ko)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (slug) query = query.eq('landing_slug', slug);
  if (type) query = query.eq('inquiry_type', type);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inquiries: data, total: count, page, limit });
}

// PATCH /api/admin/landing-inquiries
// body: { id, status, reply_message, assigned_md_id }
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
  const { id, status, reply_message, assigned_md_id } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (status) updateData.status = status;
  if (reply_message !== undefined) {
    updateData.reply_message = reply_message;
    updateData.replied_at = new Date().toISOString();
    updateData.replied_by = user.id;
    if (!status) updateData.status = 'replied';
  }
  if (assigned_md_id !== undefined) updateData.assigned_md_id = assigned_md_id;

  const { error } = await adminSupabase
    .from('landing_page_inquiries')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
