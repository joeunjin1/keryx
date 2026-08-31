import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const ShipmentSchema = z.object({
  status: z.enum(['preparing', 'documents_pending', 'documents_review', 'buyer_visible', 'shipped', 'delivered', 'closed']).default('preparing'),
  shippingMethod: z.enum(['parcel', 'air', 'sea_lcl', 'sea_fcl', 'rail', 'other']).nullable().optional(),
  shipmentReference: z.string().trim().max(300).optional().default(''),
  buyerVisible: z.boolean().default(false),
  summaryKo: z.string().trim().max(3000).optional().default(''),
  summaryZh: z.string().trim().max(3000).optional().default(''),
  shippedAt: z.string().datetime().nullable().optional(),
  deliveredAt: z.string().datetime().nullable().optional(),
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const { data, error } = await (context.admin as any)
    .from('manufacturing_shipments')
    .select('id, status, shipping_method, shipment_reference, buyer_visible_summary_ko, buyer_visible_summary_zh, buyer_visible, shipped_at, delivered_at, created_at, updated_at')
    .eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: '선적 정보를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ shipments: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const parsed = ShipmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '선적 상태와 운송 정보를 확인해 주세요.' }, { status: 400 });
  const body = parsed.data;

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects').select('id, project_no').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const { data: shipment, error } = await (context.admin as any)
    .from('manufacturing_shipments')
    .insert({
      project_id: projectId,
      status: body.status,
      shipping_method: body.shippingMethod ?? null,
      shipment_reference: body.shipmentReference || null,
      buyer_visible: body.buyerVisible,
      buyer_visible_summary_ko: body.buyerVisible ? body.summaryKo || null : null,
      buyer_visible_summary_zh: body.buyerVisible ? body.summaryZh || null : null,
      shipped_at: body.shippedAt ?? null,
      delivered_at: body.deliveredAt ?? null,
      created_by_user_id: context.user.id,
      updated_by_user_id: context.user.id,
    })
    .select('id, status, shipping_method, shipment_reference, buyer_visible, created_at')
    .single();
  if (error || !shipment) return NextResponse.json({ error: '선적 정보를 저장하지 못했습니다.' }, { status: 500 });

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: projectId,
    event_type: 'shipment_created',
    visibility: body.buyerVisible ? 'buyer' : 'internal',
    actor_user_id: context.user.id,
    detail: { shipment_id: shipment.id, status: shipment.status, shipping_method: shipment.shipping_method },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_shipment_created', 'manufacturing_shipments', shipment.id, {
    project_id: projectId,
    project_no: project.project_no,
    status: shipment.status,
    buyer_visible: shipment.buyer_visible,
  });
  return NextResponse.json({ shipment }, { status: 201 });
}
