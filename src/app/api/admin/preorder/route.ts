import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const ItemSchema = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string().trim().min(1).max(240),
  ipCharacterId: z.string().uuid().nullable(),
  sizeCategory: z.enum(['small', 'medium', 'large', 'xlarge', 'xxlarge', '']).default(''),
  requestedQuantity: z.number().int().positive(),
  targetUnitPriceCny: z.number().nonnegative().nullable(),
  cartonCbm: z.number().nonnegative().nullable(),
  note: z.string().trim().max(1000).default(''),
});

const QueueSchema = z.object({
  supplierName: z.string().trim().max(240).default(''),
  requestedDeliveryDate: z.string().date().nullable(),
  memo: z.string().trim().max(2000).default(''),
  items: z.array(ItemSchema).min(1).max(100),
});

function referenceNo() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `PRE-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { data, error } = await auth.admin
    .from('preorder_purchase_queue')
    .select('id,reference_no,status,supplier_name_snapshot,requested_delivery_date,memo,created_at,updated_at,preorder_purchase_queue_items(id,product_name_snapshot,requested_quantity,size_category,target_unit_price_cny,carton_cbm)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: '주문 전 발주 목록을 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const parsed = QueueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '발주대기 품목과 수량을 확인해 주세요.' }, { status: 400 });
  const input = parsed.data;
  const { data: queue, error: queueError } = await auth.admin
    .from('preorder_purchase_queue')
    .insert({ reference_no: referenceNo(), supplier_name_snapshot: input.supplierName, requested_delivery_date: input.requestedDeliveryDate, memo: input.memo, created_by: auth.user.id, updated_by: auth.user.id })
    .select('id,reference_no,status')
    .single();
  if (queueError || !queue) return NextResponse.json({ error: '주문 전 발주 목록을 만들지 못했습니다.' }, { status: 500 });

  const rows = input.items.map((item) => ({
    queue_id: queue.id, product_id: item.productId, product_name_snapshot: item.productName, ip_character_id: item.ipCharacterId,
    size_category: item.sizeCategory, requested_quantity: item.requestedQuantity, target_unit_price_cny: item.targetUnitPriceCny,
    carton_cbm: item.cartonCbm, note: item.note,
  }));
  const { error: itemError } = await auth.admin.from('preorder_purchase_queue_items').insert(rows);
  if (itemError) {
    await auth.admin.from('preorder_purchase_queue').update({ deleted_at: new Date().toISOString() }).eq('id', queue.id);
    return NextResponse.json({ error: '발주대기 품목을 저장하지 못했습니다.' }, { status: 500 });
  }
  await writeOperatorLog(auth.admin, auth.user.id, 'create_preorder_queue', 'preorder_purchase_queue', queue.id, { referenceNo: queue.reference_no, itemCount: rows.length });
  return NextResponse.json({ item: queue }, { status: 201 });
}
