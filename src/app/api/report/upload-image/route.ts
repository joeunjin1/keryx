import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'reports';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 });
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. JPG/PNG/WebP/GIF only.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // report-images 버킷에 업로드 (없으면 자동 생성)
    let { data, error } = await supabaseAdmin.storage
      .from('report-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      // 버킷 없으면 생성
      if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
        await supabaseAdmin.storage.createBucket('report-images', { public: true });
        const result = await supabaseAdmin.storage
          .from('report-images')
          .upload(fileName, buffer, { contentType: file.type, upsert: false });
        if (result.error) {
          return NextResponse.json({ error: result.error.message }, { status: 500 });
        }
        data = result.data;
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('report-images')
      .getPublicUrl(data!.path);

    return NextResponse.json({ url: urlData.publicUrl, path: data!.path });
  } catch (err: any) {
    console.error('[report/upload-image] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
