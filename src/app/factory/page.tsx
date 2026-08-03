import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공급사 홈',
  description: '등록 제품 현황, 미응답 Brief, 진행 중 주문을 한눈에 확인하세요.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FactoryHomeClient from './FactoryHomeClient';

const factoryNav = [
  { href: '/factory', label: '대시보드', labelZh: '控制台', icon: '🏠', tabIcon: '🏠' },
  {
    groupLabel: '제품 관리', groupLabelZh: '产品管理', groupIcon: '📦', defaultOpen: true,
    items: [
      { href: '/factory/products', label: '제품 목록', labelZh: '产品列表', icon: '📋', tabIcon: '📋' },
      { href: '/factory/products/new', label: '제품 등록', labelZh: '新增产品', icon: '➕' },
      { href: '/factory/profile', label: '공장 프로필', labelZh: '工厂资料', icon: '🏷️' },
    ],
  },
  {
    groupLabel: '주문·거래', groupLabelZh: '订单·交易', groupIcon: '💰', defaultOpen: false,
    items: [
      { href: '/factory/briefs', label: 'Brief 목록', labelZh: '需求单列表', icon: '📝', tabIcon: '📝' },
      { href: '/factory/orders', label: '주문 현황', labelZh: '订单状态', icon: '🛒' },
      { href: '/factory/ratings', label: '평가 현황', labelZh: '评价状况', icon: '⭐' },
    ],
  },
  {
    groupLabel: 'MD 소통', groupLabelZh: 'MD沟通', groupIcon: '🤝', defaultOpen: false,
    items: [
      { href: '/factory/messages', label: 'MD 메시지', labelZh: 'MD消息', icon: '💬', tabIcon: '💬' },
      { href: '/factory/samples', label: '샘플·사진 전달', labelZh: '样品·照片传递', icon: '📸' },
      { href: '/factory/inspections', label: '검수 보고서', labelZh: '检验报告', icon: '🔍' },
    ],
  },
];

export default async function FactoryPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=factory');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, display_name')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  const isAdmin = profile?.kind === 'admin' || profile?.kind === 'md';

  const { data: factory } = await supabase
    .from('factories')
    .select('id, factory_code, company_name, approval_status, total_orders, rating, avg_rating')
    .eq('shared_login_user_id', user.id)
    .single() as { data: any; error: any };

  if (!factory && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 100%)]">
        <div className="rounded-3xl max-w-[440px] w-full text-center bg-[rgba(255,255,255,0.97)] py-[48px] px-8 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
          <div className="mb-5 text-[64px]">🏭</div>
          <div className="text-[22px] font-black text-[#1a1a2e] mb-2">공장 등록 필요</div>
          <div className="text-sm font-semibold mb-4 text-[#e11d48]">需要注册工厂账号</div>
          <p className="text-sm text-neutral-500 mb-6 leading-[1.8]">KERYX 공장 포털에 오신 것을 환영합니다.<br />서비스 이용을 위해 공장 등록을 완료해 주세요.</p>
          <a href="/register/factory" className="inline-flex items-center gap-2 text-white no-underline text-[15px] font-bold py-[14px] px-7 bg-[linear-gradient(135deg, #e11d48, #be123c)] shadow-[0_8px_24px_rgba(225,29,72,0.4)] rounded-[14px]">공장 등록하기 →</a>
        </div>
      </div>
    );
  }

  if (factory && factory.approval_status !== 'approved' && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 100%)]">
        <div className="rounded-3xl max-w-[440px] w-full text-center bg-[rgba(255,255,255,0.97)] py-[48px] px-8 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
          <div className="mb-5 text-[64px]">⏳</div>
          <div className="text-[22px] font-black mb-2 text-[#78350f]">审核中 · 검토 중</div>
          <p className="text-sm text-neutral-500 leading-[1.8]">운영팀이 공장 정보를 검토 중입니다.<br />승인되면 F### 코드가 부여되고 Brief 응답이 가능해집니다.</p>
        </div>
      </div>
    );
  }

  // 데이터 조회
  // products 테이블: status 컬럼 없음 → is_active 컬럼 사용
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('factory_id', factory?.id ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true) as unknown as { count: number };

  const { data: briefRecipients } = await supabase
    .from('brief_recipients')
    .select(`id, sent_at, responded_at, status,
       brief:briefs(id, brief_no, title_ko, title_zh, target_unit_price_max_cny, delivery_target, is_vip_priority,
         category:categories(name_ko, name_zh))`)
    .eq('factory_id', factory?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('sent_at', { ascending: false })
    .limit(20) as { data: any[]; error: any };

  // conversations 기반 미읽은 메시지 카운트
  const { data: factoryConvo } = await supabase
    .from('conversations')
    .select('unread_count_md')
    .eq('factory_id', factory?.id ?? '00000000-0000-0000-0000-000000000000')
    .is('seller_id', null)
    .single() as { data: any; error: any };
  const unreadMessages = factoryConvo?.unread_count_md ?? 0;

  const { count: activeOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('factory_id', factory?.id ?? '00000000-0000-0000-0000-000000000000')
    .in('status', ['confirmed', 'in_production', 'qc_pending']) as unknown as { count: number };

  // unit_price_cny → sell_price_cny, status → approval_status
  const { data: recentProducts } = await supabase
    .from('products')
    .select('id, name_ko, name_zh, sell_price_cny, image_url, approval_status, is_active')
    .eq('factory_id', factory?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('created_at', { ascending: false })
    .limit(4) as { data: any[]; error: any };

  const openBriefs = (briefRecipients ?? []).filter((r: any) => !r.responded_at);
  const respondedBriefs = (briefRecipients ?? []).filter((r: any) => r.responded_at);

  // 그룹 구조에서 badge 업데이트
  const navWithBadge = factoryNav.map((entry: any) => {
    if ('items' in entry) {
      return {
        ...entry,
        items: entry.items.map((n: any) =>
          n.href === '/factory/messages' ? { ...n, badge: unreadMessages ?? 0 } :
          n.href === '/factory/briefs' ? { ...n, badge: openBriefs.length } : n
        ),
      };
    }
    return entry;
  });

  return (
    <FactoryHomeClient
      factory={factory}
      isAdmin={isAdmin}
      productCount={productCount ?? 0}
      openBriefs={openBriefs}
      respondedBriefs={respondedBriefs}
      unreadMessages={unreadMessages ?? 0}
      activeOrders={activeOrders ?? 0}
      recentProducts={recentProducts ?? []}
    />
  );
}
