import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']);
const EVIDENCE_TYPES = new Set(['photo', 'video', 'document', 'measurement']);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120) || 'qc-evidence';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string; qcReportId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId, qcReportId } = await params;
  if (!isUuid(projectId) || !isUuid(qcReportId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 또는 QC 보고서 주소입니다.' }, { status: 400 });

  const { data: report, error: reportError } = await (context.admin as any)
    .from('manufacturing_qc_reports').select('id').eq('id', qcReportId).eq('project_id', projectId).maybeSingle();
  if (reportError || !report) return NextResponse.json({ error: '해당 제조 프로젝트의 QC 보고서를 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await (context.admin as any)
    .from('manufacturing_qc_evidence')
    .select('id, evidence_type, caption, created_at, project_file:manufacturing_project_files(id, original_filename, mime_type, byte_size)')
    .eq('qc_report_id', qcReportId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'QC 증빙 목록을 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ evidence: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; qcReportId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId, qcReportId } = await params;
  if (!isUuid(projectId) || !isUuid(qcReportId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 또는 QC 보고서 주소입니다.' }, { status: 400 });

  const { data: report, error: reportError } = await (context.admin as any)
    .from('manufacturing_qc_reports')
    .select('id, project_id, status')
    .eq('id', qcReportId).eq('project_id', projectId).maybeSingle();
  if (reportError || !report) return NextResponse.json({ error: '해당 제조 프로젝트의 QC 보고서를 찾을 수 없습니다.' }, { status: 404 });
  if (!['draft', 'revision_requested'].includes(report.status)) {
    return NextResponse.json({ error: '초안 또는 보완 요청 상태의 QC 보고서에만 증빙을 추가할 수 있습니다.' }, { status: 409 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const evidenceType = String(formData?.get('evidenceType') ?? 'photo');
  const caption = String(formData?.get('caption') ?? '').trim().slice(0, 1000);
  if (!(file instanceof File)) return NextResponse.json({ error: '증빙 파일을 선택해 주세요.' }, { status: 400 });
  if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: 'JPEG, PNG, WebP, MP4 또는 PDF 파일만 올릴 수 있습니다.' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: '증빙 파일은 10MB 이하여야 합니다.' }, { status: 400 });
  if (!EVIDENCE_TYPES.has(evidenceType)) return NextResponse.json({ error: '증빙 유형을 확인해 주세요.' }, { status: 400 });

  const storagePath = `projects/${projectId}/qc/${qcReportId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await (context.admin as any).storage
    .from('manufacturing-project-private').upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error('[manufacturing QC evidence] upload failed', uploadError.message);
    return NextResponse.json({ error: 'QC 증빙 파일을 비공개 저장소에 올리지 못했습니다.' }, { status: 500 });
  }

  const { data: projectFile, error: projectFileError } = await (context.admin as any)
    .from('manufacturing_project_files')
    .insert({
      project_id: projectId,
      file_kind: 'qc_evidence',
      visibility: 'internal',
      storage_path: storagePath,
      original_filename: file.name.slice(0, 255),
      mime_type: file.type,
      byte_size: file.size,
      uploaded_by: context.user.id,
    })
    .select('id, original_filename, mime_type, byte_size, created_at')
    .single();
  if (projectFileError || !projectFile) {
    await (context.admin as any).storage.from('manufacturing-project-private').remove([storagePath]);
    return NextResponse.json({ error: '파일 정보를 저장하지 못해 업로드를 되돌렸습니다.' }, { status: 500 });
  }

  const { data: evidence, error: evidenceError } = await (context.admin as any)
    .from('manufacturing_qc_evidence')
    .insert({ qc_report_id: qcReportId, project_file_id: projectFile.id, evidence_type: evidenceType, caption: caption || null, created_by_user_id: context.user.id })
    .select('id, evidence_type, caption, created_at')
    .single();
  if (evidenceError || !evidence) {
    await (context.admin as any).from('manufacturing_project_files').delete().eq('id', projectFile.id);
    await (context.admin as any).storage.from('manufacturing-project-private').remove([storagePath]);
    return NextResponse.json({ error: 'QC 증빙 연결에 실패해 업로드를 되돌렸습니다.' }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: projectId,
    event_type: 'qc_evidence_uploaded',
    visibility: 'internal',
    actor_user_id: context.user.id,
    detail: { qc_report_id: qcReportId, qc_evidence_id: evidence.id, project_file_id: projectFile.id, evidence_type: evidenceType },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_qc_evidence_uploaded', 'manufacturing_qc_evidence', evidence.id, { project_id: projectId, qc_report_id: qcReportId, evidence_type: evidenceType });

  return NextResponse.json({ evidence, file: projectFile }, { status: 201 });
}
