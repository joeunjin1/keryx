import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/admin/products/review
// body: { product_id, action: 'md_approve'|'md_reject'|'admin_approve'|'admin_reject', fields?: {...}, reason?: string }
export async function POST(req: NextRequest) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient();

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 권한 확인 (md 또는 admin)
  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin', 'super_admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { product_id, action, fields, reason } = body;

  if (!product_id || !action) {
    return NextResponse.json({ error: 'product_id and action required' }, { status: 400 });
  }

  // 수정 가능한 필드 (카테고리, 제품명, 가격, MOQ)
  const allowedFields = ['name_ko', 'name_zh', 'category', 'category_id', 'sell_price_cny', 'supply_price_cny', 'price_cny', 'moq'];
  const updateData: Record<string, any> = {};

  // 필드 수정값 적용 (null/undefined 제외)
  if (fields) {
    for (const key of allowedFields) {
      if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
        updateData[key] = fields[key];
        // sell_price_cny 변경 시 price_cny도 동기화
        if (key === 'sell_price_cny') updateData['price_cny'] = fields[key];
      }
    }
  }

  updateData['updated_at'] = new Date().toISOString();

  let approvalUpdate: Record<string, any> = {};

  switch (action) {
    case 'md_approve':
      approvalUpdate = {
        approval_status: 'md_approved',
        md_reviewed_by: user.id,
        md_reviewed_at: new Date().toISOString(),
        md_review_notes: reason ?? null,
      };
      break;

    case 'md_reject':
      approvalUpdate = {
        approval_status: 'rejected',
        md_reviewed_by: user.id,
        md_reviewed_at: new Date().toISOString(),
        rejected_reason: reason ?? '반려',
        rejected_at: new Date().toISOString(),
        is_active: false,
      };
      break;

    case 'admin_approve':
      approvalUpdate = {
        approval_status: 'approved',
        admin_approved_by: user.id,
        admin_approved_at: new Date().toISOString(),
        is_active: true,  // ✅ 승인 시 /shop 자동 노출
      };
      break;

    case 'admin_reject':
      approvalUpdate = {
        approval_status: 'rejected',
        admin_approved_by: user.id,
        admin_approved_at: new Date().toISOString(),
        rejected_reason: reason ?? '반려',
        rejected_at: new Date().toISOString(),
        is_active: false,
      };
      break;

    case 'update_only':
      // 수정만 (승인 상태 변경 없음)
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const finalUpdate = { ...updateData, ...approvalUpdate };

  const { error } = await adminSupabase
    .from('products')
    .update(finalUpdate)
    .eq('id', product_id);

  if (error) {
    console.error('[POST /api/admin/products/review]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action, product_id });
}

// PATCH /api/admin/products/review — 일괄 처리
export async function PATCH(req: NextRequest) {
  const supabase = createClient() as any;
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin', 'super_admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { product_ids, action } = body;

  if (!product_ids?.length || !action) {
    return NextResponse.json({ error: 'product_ids and action required' }, { status: 400 });
  }

  let bulkUpdate: Record<string, any> = { updated_at: new Date().toISOString() };

  if (action === 'admin_approve') {
    bulkUpdate = {
      ...bulkUpdate,
      approval_status: 'approved',
      admin_approved_by: user.id,
      admin_approved_at: new Date().toISOString(),
      is_active: true,
    };
  } else if (action === 'admin_reject' || action === 'md_reject') {
    bulkUpdate = {
      ...bulkUpdate,
      approval_status: 'rejected',
      is_active: false,
    };
  } else if (action === 'md_approve') {
    bulkUpdate = {
      ...bulkUpdate,
      approval_status: 'md_approved',
      md_reviewed_by: user.id,
      md_reviewed_at: new Date().toISOString(),
    };
  }

  const { error } = await adminSupabase
    .from('products')
    .update(bulkUpdate)
    .in('id', product_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: product_ids.length });
}
