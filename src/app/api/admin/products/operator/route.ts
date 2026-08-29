import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

const ProductSchema = z.object({
  nameKo: z.string().trim().min(1).max(240), nameZh: z.string().trim().max(240).default(''), nameEn: z.string().trim().max(240).default(''),
  descriptionKo: z.string().trim().max(5000).default(''), descriptionZh: z.string().trim().max(5000).default(''),
  category: z.string().trim().max(120).default('기타'), ipCharacterId: z.string().uuid().nullable().default(null), productType: z.enum(['ip', 'pb', 'general']).default('ip'),
  sizeCm: z.string().trim().max(120).default(''), sizeCategory: z.string().trim().max(60).default(''), materialKo: z.string().trim().max(240).default(''), materialZh: z.string().trim().max(240).default(''),
  moq: z.number().int().nonnegative().default(0), stockQty: z.number().int().nonnegative().default(0), imageUrl: z.string().url().or(z.literal('')).default(''), imageUrls: z.array(z.string().url()).max(20).default([]), tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  boxLengthCm: z.number().nonnegative().default(0), boxWidthCm: z.number().nonnegative().default(0), boxHeightCm: z.number().nonnegative().default(0), pcsPerCarton: z.number().int().nonnegative().default(0), weightKg: z.number().nonnegative().default(0), leadTimeDays: z.number().int().nonnegative().default(0),
  catalogVisible: z.boolean().default(false), showroomVisible: z.boolean().default(false), initialRetailPriceKrw: z.number().int().positive().nullable().default(null), shippingFeeKrw: z.number().int().nonnegative().default(0), retailStockQty: z.number().int().nonnegative().default(0), retailVisible: z.boolean().default(false),
});

function code() { return `KX-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const parsed = ProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '상품 필수 정보와 숫자 입력을 확인해 주세요.' }, { status: 400 });
  const value = parsed.data;
  if (value.retailVisible && !value.initialRetailPriceKrw) return NextResponse.json({ error: '스토어 공개 상품에는 원화 판매가가 필요합니다.' }, { status: 400 });

  const { data: product, error } = await auth.admin.from('products').insert({
    product_code: code(), name_ko: value.nameKo, name_zh: value.nameZh || value.nameKo, name_en: value.nameEn, description_ko: value.descriptionKo, description_zh: value.descriptionZh,
    category: value.category, ip_character_id: value.ipCharacterId, product_type: value.productType, size_cm: value.sizeCm, size_category: value.sizeCategory, material_ko: value.materialKo, material_zh: value.materialZh,
    moq: value.moq, stock_qty: value.stockQty, image_url: value.imageUrl || null, image_urls: value.imageUrls, tags: value.tags, box_length_cm: value.boxLengthCm, box_width_cm: value.boxWidthCm, box_height_cm: value.boxHeightCm,
    pcs_per_carton: value.pcsPerCarton, weight_kg: value.weightKg, lead_time_days: value.leadTimeDays, catalog_visible: value.catalogVisible, showroom_visible: value.showroomVisible,
    approval_status: 'approved', is_active: true, source: 'operator_console', is_orderable: false,
  }).select('id,product_code,name_ko').single();
  if (error || !product) { console.error('[operator product create]', error?.message); return NextResponse.json({ error: '상품을 등록하지 못했습니다.' }, { status: 500 }); }

  if (value.initialRetailPriceKrw) {
    const { error: retailError } = await auth.admin.from('retail_product_settings').insert({ product_id: product.id, retail_price_krw: value.initialRetailPriceKrw, shipping_fee_krw: value.shippingFeeKrw, retail_stock_qty: value.retailStockQty, retail_visible: value.retailVisible, updated_by: auth.user.id });
    if (retailError) {
      await auth.admin.from('products').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', product.id);
      return NextResponse.json({ error: '스토어 판매 조건을 저장하지 못했습니다.' }, { status: 500 });
    }
  }
  await writeOperatorLog(auth.admin, auth.user.id, 'create_product', 'products', product.id, { productCode: product.product_code, retailVisible: value.retailVisible });
  return NextResponse.json({ item: product }, { status: 201 });
}
