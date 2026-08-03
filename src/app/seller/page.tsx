import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '바이어 홈',
  description: '나의 매칭 현황, 진행 중 주문, 최신 공장 제품을 한눈에 확인하세요.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import SellerHomeClient from './SellerHomeClient';

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function SellerPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=seller');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, display_name')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  const isAdmin = profile?.kind === 'admin' || profile?.kind === 'md';

  const { data: seller } = await supabase
    .from('sellers')
    .select(`*, assigned_md:internal_users(id, name_ko, name_zh)`)
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!seller && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]">
        <div className="rounded-3xl max-w-[440px] w-full text-center bg-[rgba(255,255,255,0.95)] backdrop-blur-[20px] py-[48px] px-8 shadow-[0_40px_80px_rgba(0,0,0,0.3)]">
          <div className="mb-5 text-[64px]">🛍️</div>
          <div className="text-[22px] font-black text-[#1a1a2e] mb-2">바이어 등록 필요</div>
          <div className="text-sm font-semibold mb-4 text-[#667eea]">需要注册买家账号</div>
          <p className="text-sm text-neutral-500 mb-6 leading-[1.8]">KERYX 바이어 포털에 오신 것을 환영합니다.<br />서비스 이용을 위해 바이어 등록을 완료해 주세요.</p>
          <a href="/register/seller" className="inline-flex items-center gap-2 text-white no-underline text-[15px] font-bold py-[14px] px-7 bg-[linear-gradient(135deg,#667eea,#764ba2)] shadow-[0_8px_24px_rgba(102,126,234,0.4)] rounded-[14px]">바이어 등록하기 →</a>
        </div>
      </div>
    );
  }

  if (seller?.approval_status && seller.approval_status !== 'approved' && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]">
        <div className="rounded-3xl max-w-[440px] w-full text-center bg-[rgba(255,255,255,0.95)] py-[48px] px-8 shadow-[0_40px_80px_rgba(0,0,0,0.3)]">
          <div className="mb-5 text-[64px]">⏳</div>
          <div className="text-[22px] font-black mb-2 text-[#78350f]">심사 진행 중</div>
          <div className="text-sm font-semibold mb-4 text-[#d97706]">审核进行中</div>
          <p className="text-sm text-neutral-500 leading-[1.8]">운영팀이 회원 정보를 검토 중입니다.<br />승인 후 모든 서비스를 이용하실 수 있습니다.</p>
        </div>
      </div>
    );
  }

  const sellerId: string | null = seller?.id ?? null;
  const adminSb = getAdminSupabase();

  // ✅ 플랫폼 설정 조회 (할인율)
  let discountRate = 5; // 기본 5%
  let discountEnabled = true;
  try {
    const { data: settings } = await adminSb
      .from('platform_settings')
      .select('key, value')
      .in('key', ['matched_factory_discount_rate', 'matched_factory_discount_enabled']);
    if (settings) {
      const rateRow = settings.find((s: any) => s.key === 'matched_factory_discount_rate');
      const enabledRow = settings.find((s: any) => s.key === 'matched_factory_discount_enabled');
      if (rateRow) discountRate = parseFloat(rateRow.value) || 5;
      if (enabledRow) discountEnabled = enabledRow.value !== 'false';
    }
  } catch { /* 설정 테이블 없으면 기본값 사용 */ }

  // ✅ 매칭공장 목록 조회 (승인된 매칭만)
  let matchedFactoryIds: string[] = [];
  let hasMatchedFactory = false;
  if (sellerId) {
    const { data: matchingRequests } = await adminSb
      .from('factory_matching_requests')
      .select('final_factory_id, matched_factories')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('final_factory_id', 'is', null) as { data: any[]; error: any };

    if (matchingRequests && matchingRequests.length > 0) {
      hasMatchedFactory = true;
      matchedFactoryIds = matchingRequests
        .map((r: any) => r.final_factory_id)
        .filter(Boolean);
    }
  }

  // ✅ 매칭공장 상품 조회 (매칭공장이 있으면 해당 공장 상품만, 없으면 빈 배열)
  let matchedProducts: any[] = [];
  if (hasMatchedFactory && matchedFactoryIds.length > 0) {
    const { data: factoryProducts } = await adminSb
      .from('products')
      .select('id, sku, name_ko, name_zh, moq, price_cny, sell_price_cny, image_url, image_urls, factory_id, approval_status, is_active')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .in('factory_id', matchedFactoryIds)
      .order('created_at', { ascending: false })
      .limit(20) as { data: any[]; error: any };

    // 5% 할인 적용
    matchedProducts = (factoryProducts ?? []).map((p: any) => {
      const basePrice = p.sell_price_cny || p.price_cny || 0;
      const discountedPrice = discountEnabled
        ? Math.round(basePrice * (1 - discountRate / 100) * 100) / 100
        : basePrice;
      return {
        ...p,
        original_price_cny: basePrice,
        discounted_price_cny: discountedPrice,
        discount_rate: discountEnabled ? discountRate : 0,
        is_matched_factory: true,
      };
    });
  }

  // ✅ 카테고리 목록
  const { data: categories } = await supabase
    .from('product_categories')
    .select('id, name_ko, name_zh, icon, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .limit(10) as { data: any[]; error: any };

  // ✅ 진행 중 주문 카운트 (DB enum 기준)
  let activeOrders = 0;
  let recentOrders: any[] = [];
  if (sellerId) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .in('status', ['pending_admin_approval', 'awaiting_deposit', 'in_production', 'inspecting', 'awaiting_balance', 'shipping_to_korea']) as unknown as { count: number };
    activeOrders = count ?? 0;

    const { data: recent } = await supabase
      .from('orders')
      .select('id, order_no, status, total_cny, created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(3) as { data: any[]; error: any };
    recentOrders = recent ?? [];
  }

  // ✅ 멤버십 정보
  let membership: any = null;
  if (sellerId) {
    const { data: mem } = await supabase
      .from('memberships')
      .select('plan, expires_at, status, trial_ends_at')
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: any; error: any };
    membership = mem;
  }

  // ✅ 서비스 요청 현황
  const { data: serviceRequests } = await supabase
    .from('service_requests')
    .select('id, status, service_type, product_name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5) as { data: any[]; error: any };

  // ✅ 읽지 않은 알림
  let notifications: any[] = [];
  if (sellerId) {
    const { data: notifs } = await supabase
      .from('seller_notifications')
      .select('id, title, message, is_read, created_at, related_request_id')
      .eq('seller_id', sellerId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10) as { data: any[]; error: any };
    notifications = notifs ?? [];
  }

  const displayName = seller?.business_name ?? profile?.display_name ?? '바이어';
  const isVip = seller?.current_grade === 'vip';
  const assignedMd = seller?.assigned_md?.name_ko ?? null;

  return (
    <SellerHomeClient
      displayName={displayName}
      isAdmin={isAdmin}
      isVip={isVip}
      assignedMd={assignedMd}
      products={matchedProducts}
      categories={categories ?? []}
      unreadCount={0}
      activeOrders={activeOrders}
      recentOrders={recentOrders}
      membershipPlan={membership?.plan ?? seller?.current_grade ?? 'free'}
      membershipExpires={membership?.expires_at ?? null}
      membershipStatus={membership?.status ?? 'free'}
      serviceRequests={serviceRequests ?? []}
      unreadNotifications={notifications}
      pendingReplies={0}
      hasMatchedFactory={hasMatchedFactory}
      discountRate={discountEnabled ? discountRate : 0}
    />
  );
}
