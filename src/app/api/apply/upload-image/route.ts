import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // 허용 파일 타입
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 고유 파일명 생성
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `apply/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from('service-request-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[API] image upload error:', error);
      // 버킷이 없으면 생성 시도
      if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
        await supabaseAdmin.storage.createBucket('service-request-images', { public: true });
        const { data: data2, error: error2 } = await supabaseAdmin.storage
          .from('service-request-images')
          .upload(fileName, buffer, { contentType: file.type, upsert: false });
        if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
        const { data: urlData } = supabaseAdmin.storage
          .from('service-request-images')
          .getPublicUrl(data2!.path);
        return NextResponse.json({ url: urlData.publicUrl });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('service-request-images')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error('[API] image upload exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
