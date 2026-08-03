/**
 * /api/admin/plans
 * 관리자 전용: subscription_plans 테이블 조회 및 수정
 * - GET: 전체 플랜 목록 (비활성 포함)
 * - PATCH: 특정 플랜 수정 (가격, 혜택, 이름, 태그라인)
 * 스킬 원칙: 관리자만 접근 가능, DB 단일 소스
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 관리자 권한 확인 헬퍼
async function checkAdminAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // user_profiles 테이블에서 kind 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.kind)) {
    return null;
  }
  return user;
}

// GET: 전체 플랜 목록 (관리자 — 비활성 포함)
export async function GET() {
  const supabase = await createClient() as any;
  const user = await checkAdminAuth(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // service_role 키로 조회 (RLS 우회)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  );

  const { data: plans, error } = await serviceClient
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: plans ?? [] });
}

// PATCH: 플랜 수정
export async function PATCH(req: NextRequest) {
  const supabase = await createClient() as any;
  const user = await checkAdminAuth(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    id,
    name_ko,
    name_zh,
    tagline_ko,
    tagline_zh,
    price_monthly,
    price_yearly,
    features_ko,
    features_zh,
    is_active,
    recommended,
    badge_ko,
    badge_zh,
    color_class,
    trial_days,
    quota_factory_match,
    quota_market_research,
    quota_catalog_view,
    quota_unlimited,
  } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // service_role 키로 업데이트 (RLS 우회)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  );

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // 제공된 필드만 업데이트
  if (name_ko !== undefined) updateData.name_ko = name_ko;
  if (name_zh !== undefined) updateData.name_zh = name_zh;
  if (tagline_ko !== undefined) updateData.tagline_ko = tagline_ko;
  if (tagline_zh !== undefined) updateData.tagline_zh = tagline_zh;
  if (price_monthly !== undefined) updateData.price_monthly = price_monthly;
  if (price_yearly !== undefined) updateData.price_yearly = price_yearly;
  if (features_ko !== undefined) updateData.features_ko = features_ko;
  if (features_zh !== undefined) updateData.features_zh = features_zh;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (recommended !== undefined) updateData.recommended = recommended;
  if (badge_ko !== undefined) updateData.badge_ko = badge_ko;
  if (badge_zh !== undefined) updateData.badge_zh = badge_zh;
  if (color_class !== undefined) updateData.color_class = color_class;
  if (trial_days !== undefined) updateData.trial_days = trial_days;
  if (quota_factory_match !== undefined) updateData.quota_factory_match = quota_factory_match;
  if (quota_market_research !== undefined) updateData.quota_market_research = quota_market_research;
  if (quota_catalog_view !== undefined) updateData.quota_catalog_view = quota_catalog_view;
  if (quota_unlimited !== undefined) updateData.quota_unlimited = quota_unlimited;

  const { data, error } = await serviceClient
    .from('subscription_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data, message: '저장되었습니다.' });
}
