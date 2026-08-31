import { NextRequest, NextResponse } from 'next/server';
import { requireActiveBuyerDiscovery } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeFilename(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120);
  return base || 'attachment';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireActiveBuyerDiscovery();
  if ('error' in context) return context.error;

  const { projectId } = await params;
  if (!looksLikeUuid(projectId)) {
    return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, current_status')
    .eq('id', projectId)
    .eq('seller_id', context.seller.id)
    .maybeSingle();

  if (projectError || !project) {
    return NextResponse.json({ error: '본인 회사의 제조 프로젝트에만 파일을 추가할 수 있습니다.' }, { status: 404 });
  }
  if (!['draft', 'intake_submitted'].includes(project.current_status)) {
    return NextResponse.json({ error: '기획 접수 단계 이후에는 담당 운영자를 통해 파일을 추가해 주세요.' }, { status: 409 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '업로드할 파일을 선택해 주세요.' }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'JPEG, PNG, WebP 이미지 또는 PDF 파일만 올릴 수 있습니다.' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 });
  }

  const storagePath = `projects/${project.id}/buyer-brief/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await (context.admin as any)
    .storage
    .from('manufacturing-project-private')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('[manufacturing project files] upload failed', uploadError.message);
    return NextResponse.json({ error: '파일을 비공개 저장소에 올리지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const { data: asset, error: assetError } = await (context.admin as any)
    .from('manufacturing_project_files')
    .insert({
      project_id: project.id,
      file_kind: 'brief_reference',
      visibility: 'buyer',
      storage_path: storagePath,
      original_filename: file.name.slice(0, 255),
      mime_type: file.type,
      byte_size: file.size,
      uploaded_by: context.user.id,
    })
    .select('id, original_filename, mime_type, byte_size, created_at')
    .single();

  if (assetError || !asset) {
    console.error('[manufacturing project files] metadata insert failed', assetError?.message);
    await (context.admin as any).storage.from('manufacturing-project-private').remove([storagePath]);
    return NextResponse.json({ error: '파일 정보를 저장하지 못해 업로드를 되돌렸습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: project.id,
    event_type: 'buyer_brief_file_uploaded',
    visibility: 'buyer',
    actor_user_id: context.user.id,
    detail: { file_id: asset.id, file_kind: 'brief_reference' },
  });

  return NextResponse.json({ asset }, { status: 201 });
}
