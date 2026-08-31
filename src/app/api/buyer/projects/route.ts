import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireActiveBuyerDiscovery, requireSeller } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

const ProjectSchema = z.object({
  projectName: z.string().trim().min(1).max(160),
  productCategory: z.string().trim().max(100).optional().default(''),
  productSummary: z.string().trim().max(2000).optional().default(''),
  preferredLanguage: z.enum(['ko', 'zh']).default('ko'),
  sourceServiceRequestId: z.string().uuid().optional().nullable(),
  sourceDiscoveryOfferingId: z.string().uuid().optional().nullable(),
  brief: z.object({
    productName: z.string().trim().min(1).max(160),
    productDescription: z.string().trim().max(5000).optional().default(''),
    targetCustomer: z.string().trim().max(300).optional().default(''),
    targetQuantity: z.number().int().positive().max(10_000_000).optional().nullable(),
    targetMarket: z.string().trim().max(200).optional().default(''),
    requiredByDate: z.string().date().optional().nullable(),
    materialPreferences: z.string().trim().max(1000).optional().default(''),
    dimensionsText: z.string().trim().max(500).optional().default(''),
    packagingRequirements: z.string().trim().max(1500).optional().default(''),
    complianceRequirements: z.string().trim().max(1500).optional().default(''),
    buyerNotes: z.string().trim().max(3000).optional().default(''),
  }),
});

function textOrNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function GET() {
  const context = await requireSeller();
  if ('error' in context) return context.error;

  const { data, error } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no, project_name, product_category, product_summary, preferred_language, current_status, created_at, updated_at, submitted_at, completed_at, source_service_request_id, source_discovery_offering_id')
    .eq('seller_id', context.seller.id)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[manufacturing projects] list failed', error.message);
    return NextResponse.json({ error: '제조 프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await requireActiveBuyerDiscovery();
  if ('error' in context) return context.error;

  const payload = await request.json().catch(() => null);
  const parsed = ProjectSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: '프로젝트명과 제품명 등 필수 정보를 확인해 주세요.' }, { status: 400 });
  }

  const body = parsed.data;
  const sourceServiceRequestId = body.sourceServiceRequestId ?? null;
  const sourceDiscoveryOfferingId = body.sourceDiscoveryOfferingId ?? null;

  if (sourceServiceRequestId) {
    const { data: sourceRequest, error: sourceError } = await (context.admin as any)
      .from('service_requests')
      .select('id')
      .eq('id', sourceServiceRequestId)
      .eq('seller_id', context.seller.id)
      .maybeSingle();
    if (sourceError || !sourceRequest) {
      return NextResponse.json({ error: '본인 회사의 기존 서비스 요청만 제조 프로젝트에 연결할 수 있습니다.' }, { status: 400 });
    }
  }

  if (sourceDiscoveryOfferingId) {
    const { data: offering, error: offeringError } = await (context.admin as any)
      .from('new_product_offerings')
      .select('id')
      .eq('id', sourceDiscoveryOfferingId)
      .eq('status', 'published')
      .gte('published_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();
    if (offeringError || !offering) {
      return NextResponse.json({ error: '현재 열람 가능한 최근 신상품·샘플만 제조 프로젝트에 연결할 수 있습니다.' }, { status: 400 });
    }
  }

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .insert({
      seller_id: context.seller.id,
      source_service_request_id: sourceServiceRequestId,
      source_discovery_offering_id: sourceDiscoveryOfferingId,
      project_name: body.projectName,
      product_category: textOrNull(body.productCategory),
      product_summary: textOrNull(body.productSummary),
      preferred_language: body.preferredLanguage,
      current_status: 'draft',
      created_by: context.user.id,
    })
    .select('id, project_no, project_name, current_status, created_at')
    .single();

  if (projectError || !project) {
    console.error('[manufacturing projects] create failed', projectError?.message);
    return NextResponse.json({ error: '제조 프로젝트 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const { error: briefError } = await (context.admin as any)
    .from('manufacturing_project_briefs')
    .insert({
      project_id: project.id,
      version_no: 1,
      status: 'draft',
      product_name: body.brief.productName,
      product_description: textOrNull(body.brief.productDescription),
      target_customer: textOrNull(body.brief.targetCustomer),
      target_quantity: body.brief.targetQuantity ?? null,
      target_market: textOrNull(body.brief.targetMarket),
      required_by_date: body.brief.requiredByDate ?? null,
      material_preferences: textOrNull(body.brief.materialPreferences),
      dimensions_text: textOrNull(body.brief.dimensionsText),
      packaging_requirements: textOrNull(body.brief.packagingRequirements),
      compliance_requirements: textOrNull(body.brief.complianceRequirements),
      buyer_notes: textOrNull(body.brief.buyerNotes),
      created_by: context.user.id,
    });

  if (briefError) {
    console.error('[manufacturing projects] brief create failed', briefError.message);
    await (context.admin as any).from('manufacturing_project_events').insert({
      project_id: project.id,
      event_type: 'brief_creation_failed',
      visibility: 'internal',
      actor_user_id: context.user.id,
      detail: { error: 'brief_insert_failed' },
    });
    return NextResponse.json({
      error: '프로젝트 초안은 생성됐지만 제품 기획 저장에 실패했습니다. 운영팀에 프로젝트 번호를 알려 주세요.',
      projectNo: project.project_no,
    }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: project.id,
    event_type: 'buyer_brief_created',
    visibility: 'buyer',
    actor_user_id: context.user.id,
    detail: { brief_version: 1 },
  });

  return NextResponse.json({ project }, { status: 201 });
}
