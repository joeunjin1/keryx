import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const IdSchema = z.string().uuid();
const CastSchema = z.object({
  nameKo: z.string().trim().min(1).max(100), nameZh: z.string().trim().max(100).default(''), nameEn: z.string().trim().max(100).default(''),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  roleKo: z.string().trim().max(180).default(''), roleZh: z.string().trim().max(180).default(''),
  profileKo: z.string().trim().max(3000).default(''), profileZh: z.string().trim().max(3000).default(''),
  profileImageUrl: z.string().trim().max(1000).default(''), status: z.enum(['draft', 'published', 'archived']),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const ipId = IdSchema.safeParse(params.id); const memberId = IdSchema.safeParse(params.memberId);
  if (!ipId.success || !memberId.success) return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const parsed = CastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '캐릭터 정보를 확인해 주세요.' }, { status: 400 });
  const item = parsed.data;
  const { data, error } = await auth.admin.from('ip_cast_members').update({
    name_ko: item.nameKo, name_zh: item.nameZh, name_en: item.nameEn, slug: item.slug,
    role_ko: item.roleKo, role_zh: item.roleZh, profile_ko: item.profileKo, profile_zh: item.profileZh,
    profile_image_url: item.profileImageUrl, publication_status: item.status, sort_order: item.sortOrder, updated_by: auth.user.id,
  }).eq('id', memberId.data).eq('ip_character_id', ipId.data).is('deleted_at', null).select('id,name_ko,slug,publication_status').maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.code === '23505' ? '이 IP에 같은 캐릭터 슬러그가 이미 있습니다.' : '캐릭터를 저장하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'update_ip_cast_member', 'ip_cast_members', memberId.data, { ipId: ipId.data, slug: data.slug, status: data.publication_status });
  return NextResponse.json({ item: data });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const ipId = IdSchema.safeParse(params.id); const memberId = IdSchema.safeParse(params.memberId);
  if (!ipId.success || !memberId.success) return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const { data, error } = await auth.admin.from('ip_cast_members').update({ deleted_at: new Date().toISOString(), publication_status: 'archived', updated_by: auth.user.id }).eq('id', memberId.data).eq('ip_character_id', ipId.data).is('deleted_at', null).select('id,slug').maybeSingle();
  if (error || !data) return NextResponse.json({ error: '캐릭터를 삭제하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'archive_ip_cast_member', 'ip_cast_members', memberId.data, { ipId: ipId.data, slug: data.slug });
  return NextResponse.json({ archived: true });
}
