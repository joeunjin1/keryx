import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const IdSchema = z.string().uuid();
const UpdateSchema = z.object({
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
  status: z.enum(['draft', 'published', 'archived']),
});

const columns = 'id,name_ko,name_zh,name_en,slug,description_ko,description_zh,description_en,world_name_ko,world_name_zh,world_summary_ko,world_summary_zh,logo_url,banner_url,profile_image_url,color_primary,color_secondary,sort_order,is_active,development_status,published_at,created_at,updated_at';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = IdSchema.safeParse(params.id);
  if (!id.success) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const [{ data: item, error }, { count: castCount }, { count: contentCount }] = await Promise.all([
    auth.admin.from('ip_characters').select(columns).eq('id', id.data).is('deleted_at', null).maybeSingle(),
    auth.admin.from('ip_cast_members').select('*', { count: 'exact', head: true }).eq('ip_character_id', id.data).is('deleted_at', null),
    auth.admin.from('ip_content_entries').select('*', { count: 'exact', head: true }).eq('ip_character_id', id.data).is('deleted_at', null),
  ]);

  if (error || !item) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ item, counts: { cast: castCount ?? 0, content: contentCount ?? 0 } });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = IdSchema.safeParse(params.id);
  if (!id.success) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'IP 필수 항목과 슬러그 형식을 확인해 주세요.' }, { status: 400 });

  const item = parsed.data;
  const { data, error } = await auth.admin
    .from('ip_characters')
    .update({
      name_ko: item.nameKo, name_zh: item.nameZh, name_en: item.nameEn, slug: item.slug,
      description_ko: item.descriptionKo, description_zh: item.descriptionZh, description_en: item.descriptionEn,
      world_name_ko: item.worldNameKo, world_name_zh: item.worldNameZh,
      world_summary_ko: item.worldSummaryKo, world_summary_zh: item.worldSummaryZh,
      logo_url: item.logoUrl, banner_url: item.bannerUrl, profile_image_url: item.profileImageUrl,
      color_primary: item.colorPrimary, color_secondary: item.colorSecondary, sort_order: item.sortOrder,
      is_active: item.status === 'published', development_status: item.status,
      published_at: item.status === 'published' ? new Date().toISOString() : null,
      updated_by: auth.user.id,
    })
    .eq('id', id.data)
    .is('deleted_at', null)
    .select(columns)
    .maybeSingle();

  if (error || !data) {
    const message = error?.code === '23505' ? '이미 사용 중인 IP 슬러그입니다.' : 'IP를 저장하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  await writeOperatorLog(auth.admin, auth.user.id, 'update_ip', 'ip_characters', id.data, { slug: data.slug, status: data.development_status });
  return NextResponse.json({ item: data });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = IdSchema.safeParse(params.id);
  if (!id.success) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data, error } = await auth.admin
    .from('ip_characters')
    .update({ deleted_at: new Date().toISOString(), is_active: false, development_status: 'archived', updated_by: auth.user.id })
    .eq('id', id.data)
    .is('deleted_at', null)
    .select('id,slug')
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'IP를 삭제하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'archive_ip', 'ip_characters', id.data, { slug: data.slug });
  return NextResponse.json({ archived: true });
}
