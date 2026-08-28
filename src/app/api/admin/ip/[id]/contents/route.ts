import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const IdSchema = z.string().uuid();
const ContentSchema = z.object({
  contentType: z.enum(['storybook', 'webtoon', 'novel', 'shortform', 'news']),
  episodeNo: z.number().int().positive().nullable(),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleKo: z.string().trim().min(1).max(240), titleZh: z.string().trim().max(240).default(''),
  excerptKo: z.string().trim().max(1000).default(''), excerptZh: z.string().trim().max(1000).default(''),
  bodyKo: z.string().trim().max(50000).default(''), bodyZh: z.string().trim().max(50000).default(''),
  coverAssetId: z.string().uuid().nullable(), status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});

const columns = 'id,ip_character_id,content_type,episode_no,slug,title_ko,title_zh,excerpt_ko,excerpt_zh,body_ko,body_zh,cover_asset_id,publication_status,published_at,sort_order,created_at,updated_at';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const ipId = IdSchema.safeParse(params.id);
  if (!ipId.success) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const { data, error } = await auth.admin.from('ip_content_entries').select(columns).eq('ip_character_id', ipId.data).is('deleted_at', null).order('content_type').order('episode_no').order('sort_order');
  if (error) return NextResponse.json({ error: '콘텐츠 목록을 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ipId = IdSchema.safeParse(params.id);
  if (!ipId.success) return NextResponse.json({ error: 'IP를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const parsed = ContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '콘텐츠 필수 항목과 슬러그 형식을 확인해 주세요.' }, { status: 400 });
  const item = parsed.data;
  const { data, error } = await auth.admin.from('ip_content_entries').insert({
    ip_character_id: ipId.data, content_type: item.contentType, episode_no: item.episodeNo, slug: item.slug,
    title_ko: item.titleKo, title_zh: item.titleZh, excerpt_ko: item.excerptKo, excerpt_zh: item.excerptZh,
    body_ko: item.bodyKo, body_zh: item.bodyZh, cover_asset_id: item.coverAssetId,
    publication_status: item.status, published_at: item.status === 'published' ? new Date().toISOString() : null,
    sort_order: item.sortOrder, created_by: auth.user.id, updated_by: auth.user.id,
  }).select(columns).single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? '이 IP·콘텐츠 유형에 같은 슬러그가 이미 있습니다.' : '콘텐츠를 등록하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'create_ip_content', 'ip_content_entries', data.id, { ipId: ipId.data, type: data.content_type, slug: data.slug, status: data.publication_status });
  return NextResponse.json({ item: data }, { status: 201 });
}
