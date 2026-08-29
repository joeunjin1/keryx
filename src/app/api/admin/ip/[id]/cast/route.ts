import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const IdSchema = z.string().uuid();
const CastSchema = z.object({
  nameKo: z.string().trim().min(1).max(100),
  nameZh: z.string().trim().max(100).default(''),
  nameEn: z.string().trim().max(100).default(''),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  roleKo: z.string().trim().max(180).default(''),
  roleZh: z.string().trim().max(180).default(''),
  profileKo: z.string().trim().max(3000).default(''),
  profileZh: z.string().trim().max(3000).default(''),
  profileImageUrl: z.string().trim().max(1000).default(''),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});

const columns = 'id,ip_character_id,name_ko,name_zh,name_en,slug,role_ko,role_zh,profile_ko,profile_zh,personality_tags,profile_image_url,sort_order,publication_status,created_at,updated_at';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const ipId = IdSchema.safeParse(params.id);
  if (!ipId.success) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { data, error } = await auth.admin.from('ip_cast_members').select(columns).eq('ip_character_id', ipId.data).is('deleted_at', null).order('sort_order');
  if (error) return NextResponse.json({ error: '캐릭터 목록을 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ipId = IdSchema.safeParse(params.id);
  if (!ipId.success) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const parsed = CastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '캐릭터 필수 항목과 슬러그 형식을 확인해 주세요.' }, { status: 400 });
  const item = parsed.data;

  const { data, error } = await auth.admin.from('ip_cast_members').insert({
    ip_character_id: ipId.data, name_ko: item.nameKo, name_zh: item.nameZh, name_en: item.nameEn, slug: item.slug,
    role_ko: item.roleKo, role_zh: item.roleZh, profile_ko: item.profileKo, profile_zh: item.profileZh,
    profile_image_url: item.profileImageUrl, publication_status: item.status, sort_order: item.sortOrder,
    created_by: auth.user.id, updated_by: auth.user.id,
  }).select(columns).single();

  if (error) return NextResponse.json({ error: error.code === '23505' ? '이 IP에 같은 캐릭터 슬러그가 이미 있습니다.' : '캐릭터를 등록하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'create_ip_cast_member', 'ip_cast_members', data.id, { ipId: ipId.data, slug: data.slug });
  return NextResponse.json({ item: data }, { status: 201 });
}
