import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  status: z.enum(['draft', 'submitted', 'revision_requested', 'approved', 'published', 'expired', 'archived', 'rejected']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const CreateSchema = z.object({
  titleKo: z.string().trim().min(1).max(160),
  titleZh: z.string().trim().max(160).optional().default(''),
  summaryKo: z.string().trim().max(3000).optional().default(''),
  summaryZh: z.string().trim().max(3000).optional().default(''),
  categorySlug: z.string().trim().min(1).max(80),
  ipSlug: z.string().trim().max(80).optional().default(''),
  sampleAvailable: z.boolean().default(false),
  customizationScopeKo: z.string().trim().max(800).optional().default(''),
  customizationScopeZh: z.string().trim().max(800).optional().default(''),
  visibleMoqNoteKo: z.string().trim().max(300).optional().default(''),
  visibleMoqNoteZh: z.string().trim().max(300).optional().default(''),
  visibleLeadTimeNoteKo: z.string().trim().max(300).optional().default(''),
  visibleLeadTimeNoteZh: z.string().trim().max(300).optional().default(''),
});

export async function GET(request: NextRequest) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: '조회 조건이 올바르지 않습니다.' }, { status: 400 });

  let query = (context.admin as any)
    .from('new_product_offerings')
    .select('id, source_type, title_ko, title_zh, summary_ko, summary_zh, category_slug, ip_slug, sample_available, status, approved_at, published_at, expires_at, created_at, new_product_offering_assets(id, media_kind, buyer_visible, sort_order)')
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit);
  if (parsed.data.status) query = query.eq('status', parsed.data.status);

  const { data, error } = await query;
  if (error) {
    console.error('[admin new product offering] list failed', error.message);
    return NextResponse.json({ error: '신상품·샘플 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((item: Record<string, any>) => ({
      id: item.id,
      sourceType: item.source_type,
      titleKo: item.title_ko,
      titleZh: item.title_zh,
      summaryKo: item.summary_ko,
      summaryZh: item.summary_zh,
      categorySlug: item.category_slug,
      ipSlug: item.ip_slug,
      sampleAvailable: item.sample_available,
      status: item.status,
      approvedAt: item.approved_at,
      publishedAt: item.published_at,
      expiresAt: item.expires_at,
      createdAt: item.created_at,
      assetCount: Array.isArray(item.new_product_offering_assets) ? item.new_product_offering_assets.length : 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '신상품명, 상품군과 입력 내용을 확인해 주세요.' }, { status: 400 });
  }

  const body = parsed.data;
  const { data: offering, error } = await (context.admin as any)
    .from('new_product_offerings')
    .insert({
      source_type: 'operator',
      title_ko: body.titleKo,
      title_zh: body.titleZh || null,
      summary_ko: body.summaryKo,
      summary_zh: body.summaryZh || null,
      category_slug: body.categorySlug,
      ip_slug: body.ipSlug || null,
      sample_available: body.sampleAvailable,
      customization_scope_ko: body.customizationScopeKo || null,
      customization_scope_zh: body.customizationScopeZh || null,
      visible_moq_note_ko: body.visibleMoqNoteKo || null,
      visible_moq_note_zh: body.visibleMoqNoteZh || null,
      visible_lead_time_note_ko: body.visibleLeadTimeNoteKo || null,
      visible_lead_time_note_zh: body.visibleLeadTimeNoteZh || null,
      status: 'draft',
      created_by: context.user.id,
    })
    .select('id, status, created_at')
    .single();

  if (error || !offering) {
    console.error('[admin new product offering] create failed', error?.message);
    return NextResponse.json({ error: '신상품·샘플 초안을 저장하지 못했습니다.' }, { status: 500 });
  }

  await writeOperatorLog(context.admin, context.user.id, 'new_product_offering_created', 'new_product_offerings', offering.id, {
    category_slug: body.categorySlug,
    has_sample: body.sampleAvailable,
    source_type: 'operator',
  });

  return NextResponse.json({ id: offering.id, status: offering.status, createdAt: offering.created_at }, { status: 201 });
}
