/**
 * 견적 참고 이미지 업로드 API
 * - createAdminClient (service_role_key) 사용 → Storage RLS 우회
 * - service-request-images 버킷 자동 생성 (없을 경우)
 * - 5MB 이하 이미지만 허용
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'service-request-images';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '이미지 파일은 5MB 이하만 업로드 가능합니다.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 버킷 존재 여부 확인 후 없으면 자동 생성
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error: bucketErr } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
      if (bucketErr && !bucketErr.message.includes('already exists')) {
        console.error('[quote/upload-image] Bucket creation error:', bucketErr);
        return NextResponse.json({ error: '스토리지 초기화 오류' }, { status: 500 });
      }
    }

    // 파일 업로드
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: upErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upErr) {
      console.error('[quote/upload-image] Upload error:', upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: data.publicUrl });
  } catch (err) {
    console.error('[quote/upload-image] Unexpected error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
