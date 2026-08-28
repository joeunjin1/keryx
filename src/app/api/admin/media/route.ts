import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf']);
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_PURPOSES = new Set(['ip_cover', 'character_profile', 'story_cover', 'story_page', 'product_image', 'gallery', 'document']);

function safeFileName(name: string) {
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  return `${randomUUID()}${extension}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const purposeValue = String(formData?.get('purpose') || 'gallery');
  const altKo = String(formData?.get('altKo') || '').trim().slice(0, 240);
  const altZh = String(formData?.get('altZh') || '').trim().slice(0, 240);
  const publicationStatus = String(formData?.get('status') || 'draft') === 'published' ? 'published' : 'draft';

  if (!(file instanceof File)) return NextResponse.json({ error: '첨부할 파일을 선택해 주세요.' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: '파일 크기는 허용 범위를 벗어났습니다.' }, { status: 400 });
  if (!ALLOWED_PURPOSES.has(purposeValue)) return NextResponse.json({ error: '파일 용도를 확인해 주세요.' }, { status: 400 });

  const objectPath = `operator/${new Date().toISOString().slice(0, 10)}/${safeFileName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await auth.admin.storage
    .from('keryx-public-media')
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('[operator media] storage upload', uploadError.message);
    return NextResponse.json({ error: '파일을 업로드하지 못했습니다.' }, { status: 500 });
  }

  const { data: urlData } = auth.admin.storage.from('keryx-public-media').getPublicUrl(objectPath);
  const { data, error: insertError } = await auth.admin
    .from('content_media_assets')
    .insert({
      object_path: objectPath,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      byte_size: file.size,
      public_url: urlData.publicUrl,
      alt_text_ko: altKo,
      alt_text_zh: altZh,
      purpose: purposeValue,
      publication_status: publicationStatus,
      created_by: auth.user.id,
    })
    .select('id,public_url,file_name,purpose,publication_status')
    .single();

  if (insertError) {
    await auth.admin.storage.from('keryx-public-media').remove([objectPath]);
    console.error('[operator media] metadata insert', insertError.message);
    return NextResponse.json({ error: '파일 정보를 저장하지 못했습니다.' }, { status: 500 });
  }

  await writeOperatorLog(auth.admin, auth.user.id, 'upload_media', 'content_media_assets', data.id, { purpose: data.purpose, fileName: data.file_name });
  return NextResponse.json({ asset: data }, { status: 201 });
}
