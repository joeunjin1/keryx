import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const IpPayloadSchema = z.object({
  nameKo: z.string().trim().min(1).max(100),
  nameZh: z.string().trim().max(100).default(''),
  nameEn: z.string().trim().max(100).default(''),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  descriptionKo: z.string().trim().max(3000).default(''),
  descriptionZh: z.string().trim().max(3000).default(''),
  descriptionEn: z.string().trim().max(3000).default(''),
  worldNameKo: z.string().trim().max(160).default(''),
  worldNameZh: z.string().trim().max(160).default(''),
  worldSummaryKo: z.string().trim().max(3000).default(''),
  worldSummaryZh: z.string().trim().max(3000).default(''),
  logoUrl: z.string().trim().max(1000).default(''),
  bannerUrl: z.string().trim().max(1000).default(''),
  profileImageUrl: z.string().trim().max(1000).default(''),
  colorPrimary: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#312E81'),
  colorSecondary: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#E0E7FF'),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

const safeColumns = 'id,name_ko,name_zh,name_en,slug,description_ko,description_zh,description_en,world_name_ko,world_name_zh,world_summary_ko,world_summary_zh,logo_url,banner_url,profile_image_url,color_primary,color_secondary,sort_order,is_active,development_status,published_at,created_at,updated_at';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data, error } = await auth.admin
    .from('ip_characters')
    .select(safeColumns)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin ip] list', error.message);
    return NextResponse.json({ error: 'IP 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const parsed = IpPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'IP 필수 항목과 슬러그 형식을 확인해 주세요.' }, { status: 400 });

  const item = parsed.data;
  const { data, error } = await auth.admin
    .from('ip_characters')
    .insert({
      name_ko: item.nameKo,
      name_zh: item.nameZh,
      name_en: item.nameEn,
      slug: item.slug,
      description_ko: item.descriptionKo,
      description_zh: item.descriptionZh,
      description_en: item.descriptionEn,
      world_name_ko: item.worldNameKo,
      world_name_zh: item.worldNameZh,
      world_summary_ko: item.worldSummaryKo,
      world_summary_zh: item.worldSummaryZh,
      logo_url: item.logoUrl,
      banner_url: item.bannerUrl,
      profile_image_url: item.profileImageUrl,
      color_primary: item.colorPrimary,
      color_secondary: item.colorSecondary,
      sort_order: item.sortOrder,
      is_active: item.status === 'published',
      development_status: item.status,
      published_at: item.status === 'published' ? new Date().toISOString() : null,
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select(safeColumns)
    .single();

  if (error) {
    const message = error.code === '23505' ? '이미 사용 중인 IP 슬러그입니다.' : 'IP를 등록하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  await writeOperatorLog(auth.admin, auth.user.id, 'create_ip', 'ip_characters', data.id, { slug: data.slug, status: data.development_status });
  return NextResponse.json({ item: data }, { status: 201 });
}
