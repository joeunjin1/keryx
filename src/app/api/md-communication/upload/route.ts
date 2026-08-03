import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversation_id') as string | null;

    if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    if (!conversationId) return NextResponse.json({ error: 'conversation_id가 필요합니다.' }, { status: 400 });

    // 파일 타입 검사
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: '허용되지 않는 파일 형식입니다. 이미지(JPG/PNG/GIF/WebP), PDF, Excel, Word 파일만 업로드 가능합니다.'
      }, { status: 400 });
    }

    // 파일 크기 검사
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });
    }

    // 파일명 생성 (충돌 방지)
    const ext = file.name.split('.').pop() || 'bin';
    const safeFileName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `conversations/${conversationId}/${timestamp}_${safeFileName}`;

    // Supabase Storage 업로드
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('message-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload] storage error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 공개 URL 생성 (signed URL - 1시간 유효)
    const { data: signedData } = await adminClient.storage
      .from('message-attachments')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1년

    const isImage = file.type.startsWith('image/');

    return NextResponse.json({
      success: true,
      attachment: {
        url: signedData?.signedUrl || '',
        path: filePath,
        name: file.name,
        size: file.size,
        type: file.type,
        is_image: isImage,
      }
    });
  } catch (err: any) {
    console.error('[upload POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
