import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: ips, error: ipError } = await supabase
    .from('v_public_ip_hub')
    .select('id,name_ko,name_zh,name_en,slug,description_ko,description_zh,logo_url,banner_url,profile_image_url,world_name_ko,world_name_zh,world_summary_ko,world_summary_zh,color_primary,color_secondary,sort_order,published_at')
    .order('sort_order', { ascending: true });

  if (ipError) {
    console.error('[public ip] list', ipError.message);
    return NextResponse.json({ error: '공개 IP를 불러오지 못했습니다.' }, { status: 500 });
  }

  const ipIds = (ips ?? []).map((item) => item.id);
  if (ipIds.length === 0) return NextResponse.json({ ips: [], cast: [], content: [] }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } });

  const [{ data: cast, error: castError }, { data: content, error: contentError }] = await Promise.all([
    supabase.from('ip_cast_members').select('id,ip_character_id,name_ko,name_zh,role_ko,role_zh,profile_ko,profile_zh,profile_image_url,sort_order').in('ip_character_id', ipIds).eq('publication_status', 'published').is('deleted_at', null).order('sort_order'),
    supabase.from('ip_content_entries').select('id,ip_character_id,content_type,episode_no,slug,title_ko,title_zh,excerpt_ko,excerpt_zh,publication_status,published_at,sort_order').in('ip_character_id', ipIds).eq('publication_status', 'published').is('deleted_at', null).order('published_at', { ascending: false }),
  ]);

  if (castError || contentError) {
    console.error('[public ip] related data', castError?.message || contentError?.message);
    return NextResponse.json({ error: '공개 IP 콘텐츠를 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ips: ips ?? [], cast: cast ?? [], content: content ?? [] }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } });
}
