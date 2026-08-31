import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ offeringId: z.string().uuid() });
const MEDIA_BUCKET = 'approved-buyer-discovery-media';
// Vercel Serverless 요청 크기 한계보다 낮게 고정해 업로드 중단을 방지한다.
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function extensionFor(file: File) {
  const byType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
  return byType[file.type] || 'file';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ offeringId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) return NextResponse.json({ error: '신상품 식별자가 올바르지 않습니다.' }, { status: 400 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'JPG, PNG, WEBP 또는 PDF 파일만 최대 4MB까지 등록할 수 있습니다.' }, { status: 400 });
  }

  const { data: offering, error: offeringError } = await (context.admin as any)
    .from('new_product_offerings')
    .select('id, status')
    .eq('id', parsedParams.data.offeringId)
    .maybeSingle();
  if (offeringError || !offering) return NextResponse.json({ error: '신상품 초안을 찾지 못했습니다.' }, { status: 404 });
  if (['published', 'expired', 'archived'].includes(offering.status)) {
    return NextResponse.json({ error: '게시 또는 종료된 항목에는 미디어를 변경할 수 없습니다. 새 초안을 등록해 주세요.' }, { status: 409 });
  }

  const objectPath = `${parsedParams.data.offeringId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error: uploadError } = await (context.admin as any).storage
    .from(MEDIA_BUCKET)
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error('[admin new product offering] asset upload failed', uploadError.message);
    return NextResponse.json({ error: '미디어 파일을 저장하지 못했습니다.' }, { status: 500 });
  }

  const sortOrder = Number(formData?.get('sortOrder') || 0);
  const { data: asset, error: assetError } = await (context.admin as any)
    .from('new_product_offering_assets')
    .insert({
      offering_id: offering.id,
      storage_path: `${MEDIA_BUCKET}/${objectPath}`,
      media_kind: file.type === 'application/pdf' ? 'document' : 'image',
      rendition: 'display',
      alt_ko: String(formData?.get('altKo') || '').trim() || null,
      alt_zh: String(formData?.get('altZh') || '').trim() || null,
      sort_order: Number.isFinite(sortOrder) && sortOrder >= 0 ? sortOrder : 0,
      buyer_visible: true,
      created_by: context.user.id,
    })
    .select('id, media_kind, sort_order')
    .single();

  if (assetError || !asset) {
    await (context.admin as any).storage.from(MEDIA_BUCKET).remove([objectPath]);
    console.error('[admin new product offering] asset record failed', assetError?.message);
    return NextResponse.json({ error: '미디어 정보를 저장하지 못했습니다. 업로드 파일은 정리되었습니다.' }, { status: 500 });
  }

  await writeOperatorLog(context.admin, context.user.id, 'new_product_offering_asset_uploaded', 'new_product_offering_assets', asset.id, {
    offering_id: offering.id,
    media_kind: asset.media_kind,
    sort_order: asset.sort_order,
  });

  return NextResponse.json({ id: asset.id, mediaKind: asset.media_kind, sortOrder: asset.sort_order }, { status: 201 });
}
