import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireActiveBuyerDiscovery } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ offeringId: z.string().uuid() });
const DISCOVERY_MEDIA_BUCKET = 'approved-buyer-discovery-media';
const DISCOVERY_MEDIA_PREFIX = `${DISCOVERY_MEDIA_BUCKET}/`;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ offeringId: string }> }) {
  const context = await requireActiveBuyerDiscovery();
  if ('error' in context) return context.error;

  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({ error: '신상품 식별자가 올바르지 않습니다.' }, { status: 400 });

  const { data: offering, error: offeringError } = await (context.admin as any)
    .from('v_approved_buyer_new_product_feed')
    .select('id, title_ko, title_zh, summary_ko, summary_zh, category_slug, ip_slug, sample_available, customization_scope_ko, customization_scope_zh, visible_moq_note_ko, visible_moq_note_zh, visible_lead_time_note_ko, visible_lead_time_note_zh, published_at, expires_at')
    .eq('id', parsed.data.offeringId)
    .maybeSingle();

  if (offeringError) {
    console.error('[buyer discovery] detail lookup failed', offeringError.message);
    return NextResponse.json({ error: '신상품·샘플 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
  if (!offering) {
    return NextResponse.json({ error: '이 항목은 열람 기간이 지났거나 접근 권한이 없습니다.' }, { status: 404 });
  }

  const { data: assets, error: assetsError } = await (context.admin as any)
    .from('new_product_offering_assets')
    .select('id, storage_path, media_kind, rendition, alt_ko, alt_zh, sort_order')
    .eq('offering_id', offering.id)
    .eq('buyer_visible', true)
    .order('sort_order', { ascending: true });

  if (assetsError) {
    console.error('[buyer discovery] detail assets lookup failed', assetsError.message);
    return NextResponse.json({ error: '신상품 미디어를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const signedAssets = await Promise.all((assets ?? []).map(async (asset: Record<string, string>) => {
    const relativePath = asset.storage_path?.startsWith(DISCOVERY_MEDIA_PREFIX)
      ? asset.storage_path.slice(DISCOVERY_MEDIA_PREFIX.length)
      : null;
    if (!relativePath) return null;
    const { data: signed, error: signedError } = await (context.admin as any).storage
      .from(DISCOVERY_MEDIA_BUCKET)
      .createSignedUrl(relativePath, 900);
    if (signedError || !signed?.signedUrl) {
      console.error('[buyer discovery] detail signed URL failed', signedError?.message ?? asset.id);
      return null;
    }
    return {
      id: asset.id,
      mediaKind: asset.media_kind,
      rendition: asset.rendition,
      altKo: asset.alt_ko,
      altZh: asset.alt_zh,
      url: signed.signedUrl,
    };
  }));

  await (context.admin as any).from('buyer_discovery_events').insert({
    seller_id: context.seller.id,
    offering_id: offering.id,
    event_type: 'viewed',
  });

  return NextResponse.json({
    item: {
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
      assets: signedAssets.filter(Boolean),
    },
  });
}
