import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const DecisionSchema = z.object({
  decision: z.enum(['approve', 'revision_requested', 'reject']),
  buyerVisible: z.boolean().default(false),
});
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; shipmentId: string; documentId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId, shipmentId, documentId } = await params;
  if (![projectId, shipmentId, documentId].every(isUuid)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 또는 선적 서류 주소입니다.' }, { status: 400 });
  const parsed = DecisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '선적 서류 검토 결과를 확인해 주세요.' }, { status: 400 });

  const { data: document, error: lookupError } = await (context.admin as any)
    .from('manufacturing_shipment_documents')
    .select('id, status, shipment:manufacturing_shipments!inner(id, project_id)')
    .eq('id', documentId).eq('shipment_id', shipmentId).eq('shipment.project_id', projectId).maybeSingle();
  if (lookupError || !document) return NextResponse.json({ error: '해당 프로젝트의 선적 서류를 찾을 수 없습니다.' }, { status: 404 });
  if (document.status !== 'submitted') return NextResponse.json({ error: '제출 상태의 선적 서류만 검토할 수 있습니다.' }, { status: 409 });

  const approved = parsed.data.decision === 'approve';
  const { data, error } = await (context.admin as any)
    .from('manufacturing_shipment_documents')
    .update({
      status: parsed.data.decision === 'approve' ? 'approved' : parsed.data.decision === 'reject' ? 'rejected' : 'revision_requested',
      buyer_visible: approved && parsed.data.buyerVisible,
      reviewed_by_user_id: context.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', documentId).eq('status', 'submitted')
    .select('id, status, buyer_visible, reviewed_at').single();
  if (error || !data) return NextResponse.json({ error: '선적 서류 검토 결과를 저장하지 못했습니다.' }, { status: 500 });

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: projectId,
    event_type: 'shipment_document_reviewed',
    visibility: data.buyer_visible ? 'buyer' : 'internal',
    actor_user_id: context.user.id,
    detail: { shipment_id: shipmentId, document_id: documentId, decision: data.status, buyer_visible: data.buyer_visible },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_shipment_document_reviewed', 'manufacturing_shipment_documents', documentId, { project_id: projectId, shipment_id: shipmentId, decision: data.status, buyer_visible: data.buyer_visible });
  return NextResponse.json({ document: data });
}
