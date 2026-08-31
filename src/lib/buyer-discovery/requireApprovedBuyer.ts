import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export type SellerContext = {
  user: { id: string; email?: string | null };
  seller: {
    id: string;
    businessName: string | null;
    businessRegistrationNo: string | null;
    legalRepresentative: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  admin: ReturnType<typeof createAdminClient>;
};

export type ActiveBuyerDiscoveryContext = SellerContext & {
  access: {
    id: string;
    status: 'active';
    currentVerificationId: string;
  };
};

/**
 * 승인 바이어 전용 서비스의 단일 인증 관문입니다.
 * 실권한은 user_profiles.kind='seller'와 sellers.user_id의 일치로 확인하며,
 * service role은 인증 확인 이후에만 생성합니다.
 */
export async function requireSeller(): Promise<SellerContext | { error: NextResponse }> {
  const sessionClient = createClient();
  const { data: { user }, error: userError } = await sessionClient.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.kind !== 'seller') {
    return { error: NextResponse.json({ error: '바이어 계정으로 로그인해 주세요.' }, { status: 403 }) };
  }

  const { data: seller, error: sellerError } = await admin
    .from('sellers')
    .select('id, business_name, business_registration_no, legal_representative, contact_name, contact_email, contact_phone')
    .eq('user_id', user.id)
    .maybeSingle();

  if (sellerError || !seller) {
    return { error: NextResponse.json({ error: '바이어 회사 프로필을 확인하지 못했습니다. 운영자에게 문의해 주세요.' }, { status: 403 }) };
  }

  return {
    user: { id: user.id, email: user.email },
    seller: {
      id: seller.id,
      businessName: seller.business_name,
      businessRegistrationNo: seller.business_registration_no,
      legalRepresentative: seller.legal_representative,
      contactName: seller.contact_name,
      contactEmail: seller.contact_email,
      contactPhone: seller.contact_phone,
    },
    admin,
  };
}

/** 승인된 회사 검증과 활성 구독 접근이 모두 있어야 최근 14일 피드를 볼 수 있습니다. */
export async function requireActiveBuyerDiscovery(): Promise<ActiveBuyerDiscoveryContext | { error: NextResponse }> {
  const sellerContext = await requireSeller();
  if ('error' in sellerContext) return sellerContext;

  const { data: access, error: accessError } = await (sellerContext.admin as any)
    .from('buyer_discovery_access')
    .select('id, status, current_verification_id')
    .eq('seller_id', sellerContext.seller.id)
    .maybeSingle();

  if (accessError) {
    console.error('[buyer discovery] access lookup failed', accessError.message);
    return { error: NextResponse.json({ error: '구독 접근 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 }) };
  }

  if (access?.status !== 'active' || !access.current_verification_id) {
    return {
      error: NextResponse.json({
        error: '회사 인증 및 구독 승인이 완료된 바이어만 최근 신상품·샘플을 볼 수 있습니다.',
        code: 'DISCOVERY_ACCESS_REQUIRED',
      }, { status: 403 }),
    };
  }

  return {
    ...sellerContext,
    access: {
      id: access.id,
      status: 'active',
      currentVerificationId: access.current_verification_id,
    },
  };
}
