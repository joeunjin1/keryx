import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  status: z.enum(['submitted', 'under_review', 'revision_requested', 'approved', 'rejected', 'reverification_required', 'revoked']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

function maskValue(value: string | null, visiblePrefix = 1) {
  if (!value) return null;
  if (value.length <= visiblePrefix) return '•'.repeat(value.length);
  return `${value.slice(0, visiblePrefix)}${'•'.repeat(Math.min(8, value.length - visiblePrefix))}`;
}

export async function GET(request: NextRequest) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: '조회 조건이 올바르지 않습니다.' }, { status: 400 });

  let query = (context.admin as any)
    .from('buyer_company_verifications')
    .select('id, seller_id, company_name_snapshot, business_registration_no_snapshot, legal_representative_snapshot, contact_name_snapshot, contact_email_snapshot, contact_phone_snapshot, business_address_snapshot, business_type_snapshot, status, submitted_at, reviewed_at, reviewer_note, decision_reason, license_storage_path, buyer_discovery_access(status, email_consent_at, activated_at, status_reason)')
    .eq('is_current', true)
    .order('submitted_at', { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.status) query = query.eq('status', parsed.data.status);

  const { data, error } = await query;
  if (error) {
    console.error('[admin buyer verification] list failed', error.message);
    return NextResponse.json({ error: '바이어 회사 인증 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  const rows = (data ?? []).map((item: Record<string, any>) => {
    const access = Array.isArray(item.buyer_discovery_access) ? item.buyer_discovery_access[0] : item.buyer_discovery_access;
    return {
      id: item.id,
      sellerId: item.seller_id,
      companyName: item.company_name_snapshot,
      businessRegistrationNoMasked: maskValue(item.business_registration_no_snapshot, 3),
      legalRepresentativeMasked: maskValue(item.legal_representative_snapshot, 1),
      contactNameMasked: maskValue(item.contact_name_snapshot, 1),
      contactEmailMasked: maskValue(item.contact_email_snapshot, 2),
      contactPhoneMasked: maskValue(item.contact_phone_snapshot, 3),
      businessAddressMasked: maskValue(item.business_address_snapshot, 8),
      businessType: item.business_type_snapshot,
      status: item.status,
      submittedAt: item.submitted_at,
      reviewedAt: item.reviewed_at,
      reviewerNote: item.reviewer_note,
      decisionReason: item.decision_reason,
      hasBusinessLicense: Boolean(item.license_storage_path),
      discoveryAccess: access ? {
        status: access.status,
        emailConsentAt: access.email_consent_at,
        activatedAt: access.activated_at,
        statusReason: access.status_reason,
      } : null,
    };
  });

  return NextResponse.json({ items: rows });
}
