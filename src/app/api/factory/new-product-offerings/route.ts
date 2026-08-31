import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactory } from '@/lib/factory/requireFactory';

export const dynamic = 'force-dynamic';

const FactoryOfferingSchema = z.object({
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

export async function GET() {
  const context = await requireFactory();
  if ('error' in context) return context.error;

  const { data, error } = await (context.admin as any)
    .from('new_product_offerings')
    .select('id, title_ko, title_zh, category_slug, sample_available, status, created_at, published_at, expires_at')
    .eq('source_type', 'factory')
    .eq('source_factory_id', context.factory.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: '제출한 신상품 목록을 불러오지 못했습니다.' }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((item: Record<string, unknown>) => ({
      id: item.id, titleKo: item.title_ko, titleZh: item.title_zh, categorySlug: item.category_slug,
      sampleAvailable: item.sample_available, status: item.status, createdAt: item.created_at,
      publishedAt: item.published_at, expiresAt: item.expires_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const context = await requireFactory();
  if ('error' in context) return context.error;

  const parsed = FactoryOfferingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '신상품명, 상품군과 입력 내용을 확인해 주세요.' }, { status: 400 });
  const body = parsed.data;

  const { data: offering, error } = await (context.admin as any)
    .from('new_product_offerings')
    .insert({
      source_type: 'factory', source_factory_id: context.factory.id, title_ko: body.titleKo, title_zh: body.titleZh || null,
      summary_ko: body.summaryKo, summary_zh: body.summaryZh || null, category_slug: body.categorySlug, ip_slug: body.ipSlug || null,
      sample_available: body.sampleAvailable, customization_scope_ko: body.customizationScopeKo || null, customization_scope_zh: body.customizationScopeZh || null,
      visible_moq_note_ko: body.visibleMoqNoteKo || null, visible_moq_note_zh: body.visibleMoqNoteZh || null,
      visible_lead_time_note_ko: body.visibleLeadTimeNoteKo || null, visible_lead_time_note_zh: body.visibleLeadTimeNoteZh || null,
      status: 'submitted', created_by: context.user.id,
    })
    .select('id, status, created_at')
    .single();
  if (error || !offering) {
    console.error('[factory new product] submit failed', error?.message);
    return NextResponse.json({ error: '신상품 검토 요청을 저장하지 못했습니다.' }, { status: 500 });
  }

  await (context.admin as any).from('operator_activity_log').insert({
    actor_id: context.user.id,
    action: 'factory_new_product_submitted',
    target_table: 'new_product_offerings',
    target_id: offering.id,
    metadata: { factory_id: context.factory.id, source_type: 'factory' },
  });

  return NextResponse.json({ id: offering.id, status: offering.status, createdAt: offering.created_at }, { status: 201 });
}
