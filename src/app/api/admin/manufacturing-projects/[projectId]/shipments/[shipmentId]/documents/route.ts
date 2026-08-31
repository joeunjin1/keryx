import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_TYPES = new Set(['bl', 'co', 'inland_freight_invoice', 'ocean_freight_invoice', 'commercial_invoice', 'packing_list', 'other']);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function safeFilename(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120) || 'shipment-document'; }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string; shipmentId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId, shipmentId } = await params;
  if (!isUuid(projectId) || !isUuid(shipmentId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 또는 선적 주소입니다.' }, { status: 400 });

  const { data: shipment, error: shipmentError } = await (context.admin as any).from('manufacturing_shipments').select('id').eq('id', shipmentId).eq('project_id', projectId).maybeSingle();
  if (shipmentError || !shipment) return NextResponse.json({ error: '해당 프로젝트의 선적 정보를 찾을 수 없습니다.' }, { status: 404 });
  const { data, error } = await (context.admin as any)
    .from('manufacturing_shipment_documents')
    .select('id, document_type, product_name_ko, product_name_en, product_name_en_source, status, buyer_visible, created_at, project_file:manufacturing_project_files(id, original_filename, mime_type, byte_size)')
    .eq('shipment_id', shipmentId).order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: '선적 서류를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; shipmentId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId, shipmentId } = await params;
  if (!isUuid(projectId) || !isUuid(shipmentId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 또는 선적 주소입니다.' }, { status: 400 });

  const { data: shipment, error: shipmentError } = await (context.admin as any)
    .from('manufacturing_shipments').select('id').eq('id', shipmentId).eq('project_id', projectId).maybeSingle();
  if (shipmentError || !shipment) return NextResponse.json({ error: '해당 프로젝트의 선적 정보를 찾을 수 없습니다.' }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const documentType = String(formData?.get('documentType') ?? 'other');
  const productNameKo = String(formData?.get('productNameKo') ?? '').trim().slice(0, 500);
  const productNameEn = String(formData?.get('productNameEn') ?? '').trim().slice(0, 500);
  if (!(file instanceof File)) return NextResponse.json({ error: '선적 서류 파일을 선택해 주세요.' }, { status: 400 });
  if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: 'PDF, JPEG, PNG 또는 WebP 파일만 올릴 수 있습니다.' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: '선적 서류 파일은 10MB 이하여야 합니다.' }, { status: 400 });
  if (!DOCUMENT_TYPES.has(documentType)) return NextResponse.json({ error: '선적 서류 유형을 확인해 주세요.' }, { status: 400 });
  if (!productNameKo || !productNameEn) return NextResponse.json({ error: '한국어와 영문 제품명을 모두 입력해 주세요.' }, { status: 400 });

  const storagePath = `projects/${projectId}/shipments/${shipmentId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await (context.admin as any).storage.from('manufacturing-project-private').upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: '선적 서류를 비공개 저장소에 올리지 못했습니다.' }, { status: 500 });

  const { data: projectFile, error: fileError } = await (context.admin as any).from('manufacturing_project_files').insert({
    project_id: projectId, file_kind: 'shipment_document', visibility: 'internal', storage_path: storagePath,
    original_filename: file.name.slice(0, 255), mime_type: file.type, byte_size: file.size, uploaded_by: context.user.id,
  }).select('id, original_filename, mime_type, byte_size, created_at').single();
  if (fileError || !projectFile) {
    await (context.admin as any).storage.from('manufacturing-project-private').remove([storagePath]);
    return NextResponse.json({ error: '선적 서류 정보를 저장하지 못해 업로드를 되돌렸습니다.' }, { status: 500 });
  }

  const { data: document, error } = await (context.admin as any).from('manufacturing_shipment_documents').insert({
    shipment_id: shipmentId, project_file_id: projectFile.id, document_type: documentType,
    product_name_ko: productNameKo, product_name_en: productNameEn, product_name_en_source: 'admin_confirmed',
    status: 'submitted', buyer_visible: false, submitted_by_user_id: context.user.id,
  }).select('id, document_type, status, buyer_visible, created_at').single();
  if (error || !document) {
    await (context.admin as any).from('manufacturing_project_files').delete().eq('id', projectFile.id);
    await (context.admin as any).storage.from('manufacturing-project-private').remove([storagePath]);
    return NextResponse.json({ error: '선적 서류 검토 요청을 만들지 못해 업로드를 되돌렸습니다.' }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({ project_id: projectId, event_type: 'shipment_document_submitted', visibility: 'internal', actor_user_id: context.user.id, detail: { shipment_id: shipmentId, document_id: document.id, document_type: documentType } });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_shipment_document_submitted', 'manufacturing_shipment_documents', document.id, { project_id: projectId, shipment_id: shipmentId, document_type: documentType });
  return NextResponse.json({ document, file: projectFile }, { status: 201 });
}
