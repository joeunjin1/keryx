import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSeller } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

const CompanyVerificationSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  businessRegistrationNo: z.string().trim().min(1).max(80),
  legalRepresentative: z.string().trim().max(100).optional().default(''),
  contactName: z.string().trim().min(1).max(80),
  contactEmail: z.string().trim().email().max(200),
  contactPhone: z.string().trim().min(1).max(40),
  businessAddress: z.string().trim().min(1).max(300),
  businessType: z.string().trim().min(1).max(120),
  licenseStoragePath: z.string().trim().min(1).max(500),
  privacyConsent: z.literal(true),
  marketingConsent: z.boolean().default(false),
});

function isOwnLicensePath(storagePath: string, sellerId: string) {
  const prefix = `buyer-verification-documents/${sellerId}/`;
  return storagePath.startsWith(prefix) && !storagePath.includes('..');
}

export async function GET() {
  const context = await requireSeller();
  if ('error' in context) return context.error;

  const { data: verification, error: verificationError } = await (context.admin as any)
    .from('buyer_company_verifications')
    .select('id, status, company_name_snapshot, business_registration_no_snapshot, contact_name_snapshot, contact_email_snapshot, contact_phone_snapshot, business_address_snapshot, business_type_snapshot, submitted_at, reviewed_at, reviewer_note, decision_reason, is_current')
    .eq('seller_id', context.seller.id)
    .eq('is_current', true)
    .maybeSingle();

  if (verificationError) {
    console.error('[buyer verification] status lookup failed', verificationError.message);
    return NextResponse.json({ error: '회사 인증 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const { data: access, error: accessError } = await (context.admin as any)
    .from('buyer_discovery_access')
    .select('status, email_consent_at, email_unsubscribed_at, activated_at, status_reason, updated_at')
    .eq('seller_id', context.seller.id)
    .maybeSingle();

  if (accessError) {
    console.error('[buyer verification] access status lookup failed', accessError.message);
    return NextResponse.json({ error: '구독 접근 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  return NextResponse.json({
    seller: context.seller,
    verification: verification ?? null,
    access: access ?? { status: 'not_started' },
  });
}

export async function POST(request: NextRequest) {
  const context = await requireSeller();
  if ('error' in context) return context.error;

  const payload = await request.json().catch(() => null);
  const parsed = CompanyVerificationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: '회사 정보, 담당자 정보, 사업자등록증 및 개인정보 수집·이용 동의를 모두 확인해 주세요.' }, { status: 400 });
  }

  const body = parsed.data;
  if (!isOwnLicensePath(body.licenseStoragePath, context.seller.id)) {
    return NextResponse.json({ error: '본인 회사의 사업자등록증 파일만 제출할 수 있습니다.' }, { status: 400 });
  }

  const { data: currentAccess, error: accessLookupError } = await (context.admin as any)
    .from('buyer_discovery_access')
    .select('id, status')
    .eq('seller_id', context.seller.id)
    .maybeSingle();

  if (accessLookupError) {
    console.error('[buyer verification] access lookup failed', accessLookupError.message);
    return NextResponse.json({ error: '기존 구독 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  if (currentAccess?.status === 'active') {
    return NextResponse.json({ error: '현재 회사 인증과 구독이 활성화되어 있습니다. 재검증이 필요하면 운영자에게 문의해 주세요.' }, { status: 409 });
  }

  const { data: currentVerification, error: currentVerificationError } = await (context.admin as any)
    .from('buyer_company_verifications')
    .select('id')
    .eq('seller_id', context.seller.id)
    .eq('is_current', true)
    .maybeSingle();

  if (currentVerificationError) {
    console.error('[buyer verification] current verification lookup failed', currentVerificationError.message);
    return NextResponse.json({ error: '기존 회사 인증 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  // 기존 제출본은 삭제하지 않고 현재 상태만 해제해 심사 이력을 보존한다.
  if (currentVerification) {
    const { error: supersedeError } = await (context.admin as any)
      .from('buyer_company_verifications')
      .update({ is_current: false })
      .eq('id', currentVerification.id);
    if (supersedeError) {
      console.error('[buyer verification] supersede failed', supersedeError.message);
      return NextResponse.json({ error: '기존 제출 이력을 갱신하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }
  }

  const now = new Date().toISOString();
  const { data: legacySubscriber } = await (context.admin as any)
    .from('b2b_subscribers')
    .select('id')
    .eq('email', body.contactEmail.toLowerCase())
    .is('deleted_at', null)
    .maybeSingle();

  const { data: verification, error: insertError } = await (context.admin as any)
    .from('buyer_company_verifications')
    .insert({
      seller_id: context.seller.id,
      submitter_user_id: context.user.id,
      legacy_subscriber_id: legacySubscriber?.id ?? null,
      company_name_snapshot: body.companyName,
      business_registration_no_snapshot: body.businessRegistrationNo,
      legal_representative_snapshot: body.legalRepresentative || null,
      contact_name_snapshot: body.contactName,
      contact_email_snapshot: body.contactEmail.toLowerCase(),
      contact_phone_snapshot: body.contactPhone,
      business_address_snapshot: body.businessAddress,
      business_type_snapshot: body.businessType,
      license_storage_path: body.licenseStoragePath,
      privacy_consent_at: now,
      marketing_consent_at: body.marketingConsent ? now : null,
      status: 'submitted',
      is_current: true,
    })
    .select('id, status, submitted_at')
    .single();

  if (insertError || !verification) {
    console.error('[buyer verification] insert failed', insertError?.message);
    return NextResponse.json({ error: '회사 인증 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const accessPayload = {
    seller_id: context.seller.id,
    current_verification_id: verification.id,
    legacy_subscriber_id: legacySubscriber?.id ?? null,
    status: 'pending_verification',
    email_consent_at: body.marketingConsent ? now : null,
    email_unsubscribed_at: null,
    status_reason: null,
  };
  const { error: upsertAccessError } = await (context.admin as any)
    .from('buyer_discovery_access')
    .upsert(accessPayload, { onConflict: 'seller_id' });

  if (upsertAccessError) {
    console.error('[buyer verification] access upsert failed', upsertAccessError.message);
    return NextResponse.json({ error: '구독 대기 상태를 저장하지 못했습니다. 운영자에게 문의해 주세요.' }, { status: 500 });
  }

  await (context.admin as any).from('operator_activity_log').insert({
    actor_id: context.user.id,
    action: 'buyer_verification_submitted',
    target_table: 'buyer_company_verifications',
    target_id: verification.id,
    metadata: { seller_id: context.seller.id, source: 'buyer_portal' },
  });

  return NextResponse.json({
    success: true,
    verificationId: verification.id,
    status: verification.status,
    message: '회사 인증 신청이 접수되었습니다. 운영자 검토와 승인 후 최근 신상품·샘플 피드를 이용할 수 있습니다.',
  }, { status: 201 });
}
