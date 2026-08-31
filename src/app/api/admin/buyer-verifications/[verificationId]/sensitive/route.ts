import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({ verificationId: z.string().uuid() });
const BodySchema = z.object({ reason: z.string().trim().min(10).max(500) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ verificationId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const parsedParams = ParamsSchema.safeParse(await params);
  const parsedBody = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: '원문 열람 사유를 10자 이상 입력해 주세요.' }, { status: 400 });
  }

  const { data: verification, error } = await (context.admin as any)
    .from('buyer_company_verifications')
    .select('id, seller_id, business_registration_no_snapshot, legal_representative_snapshot, contact_name_snapshot, contact_email_snapshot, contact_phone_snapshot, business_address_snapshot, license_storage_path')
    .eq('id', parsedParams.data.verificationId)
    .maybeSingle();

  if (error || !verification) {
    return NextResponse.json({ error: '회사 인증 정보를 찾지 못했습니다.' }, { status: 404 });
  }

  const prefix = 'buyer-verification-documents/';
  const relativePath = verification.license_storage_path?.startsWith(prefix)
    ? verification.license_storage_path.slice(prefix.length)
    : null;
  let documentUrl: string | null = null;
  if (relativePath) {
    const { data: signed, error: signedError } = await (context.admin as any).storage
      .from('buyer-verification-documents')
      .createSignedUrl(relativePath, 300);
    if (signedError) {
      console.error('[admin buyer verification] signed document failed', signedError.message);
      return NextResponse.json({ error: '인증 문서의 안전한 열람 주소를 만들지 못했습니다.' }, { status: 500 });
    }
    documentUrl = signed?.signedUrl ?? null;
  }

  await writeOperatorLog(
    context.admin,
    context.user.id,
    'buyer_verification_sensitive_unmasked',
    'buyer_company_verifications',
    verification.id,
    { seller_id: verification.seller_id, reason: parsedBody.data.reason, signed_url_ttl_seconds: 300 },
  );

  return NextResponse.json({
    businessRegistrationNo: verification.business_registration_no_snapshot,
    legalRepresentative: verification.legal_representative_snapshot,
    contactName: verification.contact_name_snapshot,
    contactEmail: verification.contact_email_snapshot,
    contactPhone: verification.contact_phone_snapshot,
    businessAddress: verification.business_address_snapshot,
    documentUrl,
  });
}
