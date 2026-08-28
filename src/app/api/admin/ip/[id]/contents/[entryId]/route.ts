import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const IdSchema = z.string().uuid();
const ContentSchema = z.object({
  contentType: z.enum(['storybook', 'webtoon', 'novel', 'shortform', 'news']), episodeNo: z.number().int().positive().nullable(),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleKo: z.string().trim().min(1).max(240), titleZh: z.string().trim().max(240).default(''),
  excerptKo: z.string().trim().max(1000).default(''), excerptZh: z.string().trim().max(1000).default(''),
  bodyKo: z.string().trim().max(50000).default(''), bodyZh: z.string().trim().max(50000).default(''),
  coverAssetId: z.string().uuid().nullable(), status: z.enum(['draft', 'published', 'archived']), sortOrder: z.number().int().min(0).max(100000).default(0),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string; entryId: string } }) {
  const ipId = IdSchema.safeParse(params.id); const entryId = IdSchema.safeParse(params.entryId);
  if (!ipId.success || !entryId.success) return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const parsed = ContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '콘텐츠 정보를 확인해 주세요.' }, { status: 400 });
  const item = parsed.data;
  const { data, error } = await auth.admin.from('ip_content_entries').update({
    content_type: item.contentType, episode_no: item.episodeNo, slug: item.slug, title_ko: item.titleKo, title_zh: item.titleZh,
    excerpt_ko: item.excerptKo, excerpt_zh: item.excerptZh, body_ko: item.bodyKo, body_zh: item.bodyZh,
    cover_asset_id: item.coverAssetId, publication_status: item.status,
    published_at: item.status === 'published' ? new Date().toISOString() : null, sort_order: item.sortOrder, updated_by: auth.user.id,
  }).eq('id', entryId.data).eq('ip_character_id', ipId.data).is('deleted_at', null).select('id,slug,publication_status').maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.code === '23505' ? '같은 콘텐츠 슬러그가 이미 있습니다.' : '콘텐츠를 저장하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'update_ip_content', 'ip_content_entries', entryId.data, { ipId: ipId.data, slug: data.slug, status: data.publication_status });
  return NextResponse.json({ item: data });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; entryId: string } }) {
  const ipId = IdSchema.safeParse(params.id); const entryId = IdSchema.safeParse(params.entryId);
  if (!ipId.success || !entryId.success) return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 });
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const { data, error } = await auth.admin.from('ip_content_entries').update({ deleted_at: new Date().toISOString(), publication_status: 'archived', updated_by: auth.user.id }).eq('id', entryId.data).eq('ip_character_id', ipId.data).is('deleted_at', null).select('id,slug').maybeSingle();
  if (error || !data) return NextResponse.json({ error: '콘텐츠를 삭제하지 못했습니다.' }, { status: 409 });
  await writeOperatorLog(auth.admin, auth.user.id, 'archive_ip_content', 'ip_content_entries', entryId.data, { ipId: ipId.data, slug: data.slug });
  return NextResponse.json({ archived: true });
}
