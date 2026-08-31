import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ offeringId: z.string().uuid() });
const MEDIA_BUCKET = 'approved-buyer-discovery-media';
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function extensionFor(file: File) {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' } as Record<string, string>)[file.type] || 'file';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ offeringId: string }> }) {
  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) return NextResponse.json({ error: '신상품 식별자가 올바르지 않습니다.' }, { status: 400 });

  const sessionClient = createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('user_profiles').select('kind').eq('id', user.id).maybeSingle();
  if (profile?.kind !== 'factory') return NextResponse.json({ error: '공장 계정으로 로그인해 주세요.' }, { status: 403 });
  const { data: factory } = await admin.from('factories').select('id').eq('shared_login_user_id', user.id).maybeSingle();
  if (!factory) return NextResponse.json({ error: '연결된 공장 프로필을 찾지 못했습니다.' }, { status: 403 });

  const { data: offering, error: offeringError } = await (admin as any)
    .from('new_product_offerings')
    .select('id, status')
    .eq('id', parsedParams.data.offeringId)
    .eq('source_type', 'factory')
    .eq('source_factory_id', factory.id)
    .maybeSingle();
  if (offeringError || !offering) return NextResponse.json({ error: '본인 공장이 제출한 신상품 초안을 찾지 못했습니다.' }, { status: 404 });
  if (!['submitted', 'revision_requested'].includes(offering.status)) return NextResponse.json({ error: '검토 중 또는 보완 요청 상태의 항목에만 자료를 추가할 수 있습니다.' }, { status: 409 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'JPG, PNG, WEBP 또는 PDF 파일만 최대 4MB까지 등록할 수 있습니다.' }, { status: 400 });
  }

  const objectPath = `${offering.id}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error: uploadError } = await (admin as any).storage.from(MEDIA_BUCKET).upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: '자료 파일을 저장하지 못했습니다.' }, { status: 500 });

  const { data: asset, error: assetError } = await (admin as any)
    .from('new_product_offering_assets')
    .insert({ offering_id: offering.id, storage_path: `${MEDIA_BUCKET}/${objectPath}`, media_kind: file.type === 'application/pdf' ? 'document' : 'image', rendition: 'display', alt_ko: String(formData?.get('altKo') || '').trim() || null, alt_zh: String(formData?.get('altZh') || '').trim() || null, sort_order: 0, buyer_visible: true, created_by: user.id })
    .select('id')
    .single();
  if (assetError || !asset) {
    await (admin as any).storage.from(MEDIA_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: '자료 파일 정보를 저장하지 못했습니다. 업로드 파일은 정리되었습니다.' }, { status: 500 });
  }

  await (admin as any).from('operator_activity_log').insert({ actor_id: user.id, action: 'factory_new_product_asset_uploaded', target_table: 'new_product_offering_assets', target_id: asset.id, metadata: { factory_id: factory.id, offering_id: offering.id } });
  return NextResponse.json({ id: asset.id }, { status: 201 });
}
