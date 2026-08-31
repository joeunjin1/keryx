import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireActiveBuyerDiscovery } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  ip: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

const DISCOVERY_MEDIA_BUCKET = 'approved-buyer-discovery-media';
const DISCOVERY_MEDIA_PREFIX = `${DISCOVERY_MEDIA_BUCKET}/`;

function toBucketPath(storagePath: string) {
  return storagePath.startsWith(DISCOVERY_MEDIA_PREFIX)
    ? storagePath.slice(DISCOVERY_MEDIA_PREFIX.length)
    : null;
}

export async function GET(request: NextRequest) {
  const context = await requireActiveBuyerDiscovery();
  if ('error' in context) return context.error;

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: '조회 조건이 올바르지 않습니다.' }, { status: 400 });
  }

  const { category, ip, limit } = parsed.data;
  let query = (context.admin as any)
    .from('v_approved_buyer_new_product_feed')
    .select('id, title_ko, title_zh, summary_ko, summary_zh, category_slug, ip_slug, sample_available, customization_scope_ko, customization_scope_zh, visible_moq_note_ko, visible_moq_note_zh, visible_lead_time_note_ko, visible_lead_time_note_zh, published_at, expires_at')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (category) query = query.eq('category_slug', category);
  if (ip) query = query.eq('ip_slug', ip);

  const { data: offerings, error: offeringsError } = await query;
  if (offeringsError) {
    console.error('[buyer discovery] feed lookup failed', offeringsError.message);
    return NextResponse.json({ error: '신상품·샘플 피드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const offeringIds = (offerings ?? []).map((offering: { id: string }) => offering.id);
  const assetsByOffering = new Map<string, Array<Record<string, unknown>>>();

  if (offeringIds.length > 0) {
    const { data: assets, error: assetsError } = await (context.admin as any)
      .from('new_product_offering_assets')
      .select('id, offering_id, storage_path, media_kind, rendition, alt_ko, alt_zh, sort_order')
      .in('offering_id', offeringIds)
      .eq('buyer_visible', true)
      .order('sort_order', { ascending: true });

    if (assetsError) {
      console.error('[buyer discovery] assets lookup failed', assetsError.message);
      return NextResponse.json({ error: '신상품 미디어를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }

    for (const asset of assets ?? []) {
      const relativePath = toBucketPath(asset.storage_path);
      if (!relativePath) continue;

      const { data: signed, error: signedError } = await (context.admin as any)
        .storage
        .from(DISCOVERY_MEDIA_BUCKET)
        .createSignedUrl(relativePath, 900);

      if (signedError || !signed?.signedUrl) {
        console.error('[buyer discovery] signed URL failed', signedError?.message ?? asset.id);
        continue;
      }

      const collection = assetsByOffering.get(asset.offering_id) ?? [];
      collection.push({
        id: asset.id,
        mediaKind: asset.media_kind,
        rendition: asset.rendition,
        altKo: asset.alt_ko,
        altZh: asset.alt_zh,
        url: signed.signedUrl,
      });
      assetsByOffering.set(asset.offering_id, collection);
    }
  }

  const result = (offerings ?? []).map((offering: Record<string, unknown>) => ({
    id: offering.id,
    titleKo: offering.title_ko,
    titleZh: offering.title_zh,
    summaryKo: offering.summary_ko,
    summaryZh: offering.summary_zh,
    categorySlug: offering.category_slug,
    ipSlug: offering.ip_slug,
    sampleAvailable: offering.sample_available,
    customizationScopeKo: offering.customization_scope_ko,
    customizationScopeZh: offering.customization_scope_zh,
    visibleMoqNoteKo: offering.visible_moq_note_ko,
    visibleMoqNoteZh: offering.visible_moq_note_zh,
    visibleLeadTimeNoteKo: offering.visible_lead_time_note_ko,
    visibleLeadTimeNoteZh: offering.visible_lead_time_note_zh,
    publishedAt: offering.published_at,
    expiresAt: offering.expires_at,
    assets: assetsByOffering.get(offering.id as string) ?? [],
  }));

  // 피드 접근 자체도 전환 분석용 이력으로 남기되, 실패해도 피드 응답은 막지 않는다.
  if (offeringIds.length > 0) {
    await (context.admin as any).from('buyer_discovery_events').insert(
      offeringIds.map((offeringId: string) => ({
        seller_id: context.seller.id,
        offering_id: offeringId,
        event_type: 'viewed',
      })),
    );
  }

  return NextResponse.json({
    items: result,
    visibility: {
      policy: 'approved_buyer_only',
      expiresInDays: 14,
      generatedAt: new Date().toISOString(),
    },
  });
}
