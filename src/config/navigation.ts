/**
 * KERYX 네비게이션 단일 소스 파일
 * sidebar-design-system 스킬 원칙 2: "메뉴 항목은 단일 소스에서 파생되어야 한다"
 *
 * 모든 역할(admin, md, seller, factory, designer)의 메뉴 정의가 이 파일에만 존재합니다.
 * Shell 컴포넌트, 레이아웃, 페이지는 이 파일에서 import하여 사용합니다.
 */

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  labelZh?: string;
  icon: string;
  tabIcon?: string;
  badge?: number;
}

export interface NavGroup {
  groupLabel: string;
  groupLabelZh?: string;
  groupIcon: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'groupLabel' in entry;
}

// ─────────────────────────────────────────────
// Admin 네비게이션
// ─────────────────────────────────────────────

export const adminNavItems: NavEntry[] = [
  { href: '/admin', label: '대시보드', labelZh: '管理控制台', icon: '🏠' },
  {
    groupLabel: '파트너 관리',
    groupLabelZh: '合作伙伴管理',
    groupIcon: '🤝',
    defaultOpen: true,
    items: [
      { href: '/admin/partner-pipeline', label: '파트너 파이프라인', labelZh: '合作伙伴管道', icon: '📊' },
      { href: '/admin/members/sellers', label: '파트너 목록·관리', labelZh: '合作伙伴列表·管理', icon: '👥' },
      { href: '/admin/landing', label: '신규 문의 관리', labelZh: '新咨询管理', icon: '📩' },
      { href: '/admin/factories/approvals', label: '공장 입점 승인', labelZh: '工厂入驻审批', icon: '✅' },
    ],
  },
  {
    groupLabel: 'IP 제안·사업플랜',
    groupLabelZh: 'IP提案·事业规划',
    groupIcon: '🎨',
    defaultOpen: true,
    items: [
      { href: '/admin/ip-proposals', label: 'IP 제안 보드', labelZh: 'IP提案看板', icon: '📌' },
      { href: '/admin/ip-studio', label: 'IP Studio', labelZh: 'IP工作室', icon: '🌟' },
      { href: '/admin/ip-approvals', label: 'IP 승인 대기', labelZh: 'IP审批待处理', icon: '✅' },
    ],
  },
  {
    groupLabel: '공장 매칭·생산',
    groupLabelZh: '工厂匹配·生产',
    groupIcon: '🏭',
    defaultOpen: false,
    items: [
      { href: '/admin/factories', label: '공장 목록·상세', labelZh: '工厂列表·详情', icon: '📋' },
      { href: '/admin/factory-ratings', label: '공장 평가·점수', labelZh: '工厂评分', icon: '⭐' },
      { href: '/admin/factory-match-reports', label: '매칭 보고서', labelZh: '匹配报告', icon: '📋' },
      { href: '/admin/factory-match-reports/new', label: '매칭 보고서 작성', labelZh: '新建匹配报告', icon: '✍️' },
      { href: '/admin/inspections/dashboard', label: '검수 관리', labelZh: '验货管理', icon: '🔍' },
      { href: '/admin/inspections/new', label: '검수서 작성', labelZh: '新建验货单', icon: '📝' },
    ],
  },
  {
    groupLabel: '상품 관리',
    groupLabelZh: '商品管理',
    groupIcon: '📦',
    defaultOpen: false,
    items: [
      { href: '/admin/categories', label: '카테고리 관리', labelZh: '类别管理', icon: '🏷️' },
      { href: '/admin/products', label: '전체 상품 데이터', labelZh: '全部商品数据', icon: '🗂️' },
      { href: '/admin/products/price-approvals', label: '가격 수정 승인', labelZh: '价格修改审批', icon: '💰' },
    ],
  },
  {
    groupLabel: '주문·거래 관리',
    groupLabelZh: '订单·交易管理',
    groupIcon: '💳',
    defaultOpen: false,
    items: [
      { href: '/admin/orders', label: '파트너 주문 관리', labelZh: '合作伙伴订单管理', icon: '📋' },
      { href: '/admin/payments', label: '주문·결제 승인', labelZh: '订单·付款审批', icon: '💳' },
      { href: '/admin/trade', label: '거래 센터', labelZh: '交易中心', icon: '🤝' },
      { href: '/admin/samples', label: '샘플 요청 관리', labelZh: '样品申请管理', icon: '📬' },
      { href: '/admin/quotes', label: '견적 요청 관리', labelZh: '报价申请管理', icon: '💰' },
    ],
  },
  {
    groupLabel: 'MD 운영',
    groupLabelZh: 'MD运营',
    groupIcon: '💬',
    defaultOpen: false,
    items: [
      { href: '/admin/mailbox', label: '메일함', labelZh: '邮件箱', icon: '📧' },
      { href: '/admin/staff-emails', label: '직원 메일 주소 관리', labelZh: '员工邮箱地址管理', icon: '📮' },
      { href: '/admin/communications', label: '통합 소통 관리', labelZh: '综合沟通管理', icon: '💬' },
      { href: '/admin/md-performance', label: 'MD 실적', labelZh: 'MD业绩', icon: '📈' },
    ],
  },
  {
    groupLabel: 'B2B 구독·마케팅',
    groupLabelZh: 'B2B订阅·营销',
    groupIcon: '📬',
    defaultOpen: false,
    items: [
      { href: '/admin/b2b-subscribers', label: 'B2B 구독자 관리', labelZh: 'B2B订阅者管理', icon: '👥' },
      { href: '/admin/weekly-report', label: '주간 리포트 발송', labelZh: '周报发送', icon: '📨' },
    ],
  },
  {
    groupLabel: '성과·분석',
    groupLabelZh: '绩效·分析',
    groupIcon: '📈',
    defaultOpen: false,
    items: [
      { href: '/admin/landing/settings', label: '랜딩 페이지 설정', labelZh: '落地页设置', icon: '⚙️' },
      { href: '/admin/health', label: '시스템 상태', labelZh: '系统状态', icon: '🏥' },
    ],
  },
  {
    groupLabel: '플랫폼 설정',
    groupLabelZh: '平台设置',
    groupIcon: '⚙️',
    defaultOpen: false,
    items: [
      { href: '/admin/platform-settings', label: '매칭 할인율 설정', labelZh: '匹配折扣率设置', icon: '💹' },
      { href: '/admin/members/staff', label: '직원 관리', labelZh: '员工管理', icon: '👤' },
    ],
  },
];

// ─────────────────────────────────────────────
// MD 네비게이션
// ─────────────────────────────────────────────

export const mdNavItems: NavEntry[] = [
  { href: '/md', label: '대시보드', labelZh: '仪表板', icon: '🏠' },
  {
    groupLabel: '🚀 MVP 서비스 관리',
    groupLabelZh: '🚀 MVP服务管理',
    groupIcon: '🚀',
    defaultOpen: true,
    items: [
      { href: '/md/mvp', label: 'MVP 서비스 현황', labelZh: 'MVP服务概况', icon: '📊' },
      { href: '/md/mvp/market-research', label: '시장조사 관리', labelZh: '市场调研管理', icon: '🔍' },
      { href: '/md/mvp/sample', label: '샘플제작 관리', labelZh: '样品制作管理', icon: '📦' },
      { href: '/md/mvp/factory-matching', label: '공장매칭 관리', labelZh: '工厂匹配管理', icon: '🏭' },
    ],
  },
  {
    groupLabel: '공장 관리',
    groupLabelZh: '工厂管理',
    groupIcon: '🏭',
    defaultOpen: false,
    items: [
      { href: '/md/factory', label: '공장 목록·상세', labelZh: '工厂列表·详情', icon: '🏭' },
      { href: '/md/briefs', label: '소싱 브리프', labelZh: '采购简报', icon: '📝' },
      { href: '/md/ai-brief', label: 'AI 브리프 생성', labelZh: 'AI简报生成', icon: '🤖' },
      { href: '/md/ai-match', label: 'AI 공장 매칭', labelZh: 'AI工厂匹配', icon: '🔗' },
      { href: '/md/factory-match-reports', label: '공장 매칭 보고서', labelZh: '工厂匹配报告', icon: '📋' },
      { href: '/md/factory-match-reports/new', label: '매칭 보고서 작성', labelZh: '新建匹配报告', icon: '✍️' },
    ],
  },
  {
    groupLabel: '상품 관리',
    groupLabelZh: '商品管理',
    groupIcon: '📦',
    defaultOpen: false,
    items: [
      { href: '/md/products', label: '전체 상품 데이터', labelZh: '全部商品数据', icon: '🗂️' },
      { href: '/md/products/price-requests', label: '가격 수정 요청', labelZh: '价格修改申请', icon: '💰' },
    ],
  },
  {
    groupLabel: '주문·거래 관리',
    groupLabelZh: '订单·交易管理',
    groupIcon: '📊',
    defaultOpen: false,
    items: [
      { href: '/md/orders', label: '발주 관리', labelZh: '订单管理', icon: '📋' },
      { href: '/md/orders/margin-builder', label: '마진 계산기', labelZh: '利润计算器', icon: '💹' },
      { href: '/md/trade', label: '거래 센터', labelZh: '交易中心', icon: '🤝' },
      { href: '/md/samples', label: '샘플 요청 처리', labelZh: '样品申请处理', icon: '📬' },
      { href: '/md/samples/dispatch', label: '샘플 발송 내역서 작성', labelZh: '样品发送明细书制作', icon: '📤' },
    ],
  },
  {
    groupLabel: '바이어 관리',
    groupLabelZh: '买家管理',
    groupIcon: '🛒',
    defaultOpen: false,
    items: [
      { href: '/md/sellers', label: '바이어(담당 고객) 목록', labelZh: '买家(负责客户)列表', icon: '🛒' },
    ],
  },
  {
    groupLabel: 'MD 소통 센터',
    groupLabelZh: 'MD沟通中心',
    groupIcon: '💬',
    defaultOpen: true,
    items: [
      { href: '/md/mailbox', label: '메일함', labelZh: '邮件箱', icon: '📧' },
      { href: '/md/communications', label: '통합 소통 관리', labelZh: '综合沟通管理', icon: '💬' },
      { href: '/md/service-requests', label: '구 신청 내역 (읽기전용)', labelZh: '旧版申请记录(仅读)', icon: '📋' },
    ],
  },
  {
    groupLabel: '랜딩 페이지',
    groupLabelZh: '广告落地页',
    groupIcon: '📣',
    defaultOpen: false,
    items: [
      { href: '/admin/landing', label: '문의 관리', labelZh: '和询管理', icon: '📩' },
    ],
  },
  {
    groupLabel: '성과·분석',
    groupLabelZh: '绩效·分析',
    groupIcon: '📈',
    defaultOpen: false,
    items: [
      { href: '/md/performance', label: '내 실적', labelZh: '我的业绩', icon: '📈' },
    ],
  },
];

// ─────────────────────────────────────────────
// Seller 네비게이션
// ─────────────────────────────────────────────

export const sellerNavItems: NavEntry[] = [
  { href: '/seller', label: '홈', labelZh: '首页', icon: '🏠', tabIcon: '🏠' },
  {
    groupLabel: '상품 카탈로그',
    groupLabelZh: '商品目录',
    groupIcon: '🛍️',
    defaultOpen: true,
    items: [
      { href: '/catalog', label: 'B2B 상품 카탈로그', labelZh: 'B2B商品目录', icon: '📦' },
      { href: '/showroom', label: 'IP 쇼룸', labelZh: 'IP展厅', icon: '✨' },
    ],
  },
  {
    groupLabel: '상품·거래',
    groupLabelZh: '商品·交易',
    groupIcon: '📦',
    defaultOpen: true,
    items: [
      { href: '/seller/orders/new', label: '내 공장에서 주문하기', labelZh: '向我的工厂下单', icon: '🛒' },
      { href: '/seller/matched-factories', label: '나의 매칭 공장들', labelZh: '我的匹配工厂们', icon: '🏭' },
      { href: '/seller/factory-matches', label: '공장 매칭 보고서', labelZh: '工厂匹配报告', icon: '📋' },
      { href: '/seller/orders', label: '거래 관리 (견적·주문)', labelZh: '交易管理(报价·订单)', icon: '📋' },
      { href: '/seller/payments', label: '결제 내역', labelZh: '付款记录', icon: '💳' },
    ],
  },
  {
    groupLabel: 'MD 소통 센터',
    groupLabelZh: 'MD沟通中心',
    groupIcon: '💬',
    defaultOpen: false,
    items: [
      { href: '/seller/md-chat', label: 'MD 소통·의뢰', labelZh: 'MD沟通·委托', icon: '💬' },
      { href: '/seller/inspections', label: '검수 보고서', labelZh: '检验报告', icon: '🔍' },
    ],
  },
  {
    groupLabel: '통관·운송',
    groupLabelZh: '通关·运输',
    groupIcon: '🚢',
    defaultOpen: false,
    items: [
      { href: '/seller/logistics', label: '통관·운송 현황', labelZh: '通关·运输状态', icon: '🚢' },
    ],
  },
  {
    groupLabel: '계정',
    groupLabelZh: '账户',
    groupIcon: '👤',
    defaultOpen: false,
    items: [
      { href: '/seller/account', label: '계정 관리', labelZh: '账户管理', icon: '⚙️' },
    ],
  },
];

// ─────────────────────────────────────────────
// Factory 네비게이션
// ─────────────────────────────────────────────

export const factoryNavItems: NavEntry[] = [
  { href: '/factory', label: '대시보드', labelZh: '控制台', icon: '🏠', tabIcon: '🏠' },
  {
    groupLabel: '제품 관리',
    groupLabelZh: '产品管理',
    groupIcon: '📦',
    defaultOpen: true,
    items: [
      { href: '/factory/products', label: '제품 목록', labelZh: '产品列表', icon: '📋', tabIcon: '📋' },
      { href: '/factory/products/new', label: '제품 등록', labelZh: '新增产品', icon: '➕' },
      { href: '/factory/profile', label: '공장 프로필', labelZh: '工厂资料', icon: '🏷️' },
    ],
  },
  {
    groupLabel: '주문·거래',
    groupLabelZh: '订单·交易',
    groupIcon: '💰',
    defaultOpen: false,
    items: [
      { href: '/factory/briefs', label: 'Brief 목록', labelZh: '需求单列表', icon: '📝', tabIcon: '📝' },
      { href: '/factory/orders', label: '주문 현황', labelZh: '订单状态', icon: '🛒' },
      { href: '/factory/ratings', label: '평가 현황', labelZh: '评价状况', icon: '⭐' },
    ],
  },
  {
    groupLabel: 'MD 소통 센터',
    groupLabelZh: 'MD沟通中心',
    groupIcon: '💬',
    defaultOpen: false,
    items: [
      { href: '/factory/mailbox', label: '메일함', labelZh: '邮件箱', icon: '📧' },
      { href: '/factory/unified-requests', label: 'MD 의뢰 목록', labelZh: 'MD委托列表', icon: '📋', tabIcon: '📋' },
      { href: '/factory/samples', label: '샘플·사진 전달', labelZh: '样品·照片传递', icon: '📸' },
      { href: '/factory/inspections', label: '검수 보고서', labelZh: '检验报告', icon: '🔍' },
    ],
  },
];

// ─────────────────────────────────────────────
// Marketing 네비게이션
// ─────────────────────────────────────────────

export const marketingNavItems: NavEntry[] = [
  { href: '/marketing', label: '대시보드', labelZh: '营销控制台', icon: '🏠' },
  {
    groupLabel: '이메일 마케팅',
    groupLabelZh: '邮件营销',
    groupIcon: '📧',
    defaultOpen: true,
    items: [
      { href: '/marketing/email/new', label: '이메일 발송', labelZh: '发送邮件', icon: '✉️' },
      { href: '/marketing/email/campaigns', label: '발송 이력', labelZh: '发送记录', icon: '📋' },
    ],
  },
  {
    groupLabel: 'SMS 마케팅',
    groupLabelZh: 'SMS营销',
    groupIcon: '📱',
    defaultOpen: true,
    items: [
      { href: '/marketing/sms/new', label: '문자 발송', labelZh: '发送短信', icon: '📲' },
      { href: '/marketing/sms/campaigns', label: '발송 이력', labelZh: '发送记录', icon: '📋' },
    ],
  },
  {
    groupLabel: '수신자 관리',
    groupLabelZh: '收件人管理',
    groupIcon: '👥',
    defaultOpen: false,
    items: [
      { href: '/marketing/contacts', label: '수신자 목록', labelZh: '收件人列表', icon: '👥' },
    ],
  },
];

// ─────────────────────────────────────────────
// Inspector 네비게이션 (검수원 전용 - 관리자 메뉴 차단)
// ─────────────────────────────────────────────

export const inspectorNavItems: NavEntry[] = [
  { href: '/admin', label: '대시보드', labelZh: '控制台', icon: '🏠' },
  {
    groupLabel: '검수 관리',
    groupLabelZh: '验货管理',
    groupIcon: '🔍',
    defaultOpen: true,
    items: [
      { href: '/admin/inspections/dashboard', label: '검수 목록', labelZh: '验货列表', icon: '🔍' },
      { href: '/admin/inspections/new', label: '검수서 작성', labelZh: '新建验货单', icon: '📝' },
    ],
  },
  {
    groupLabel: '공장·주문',
    groupLabelZh: '工厂·订单',
    groupIcon: '🏭',
    defaultOpen: false,
    items: [
      { href: '/admin/factories', label: '공장 목록', labelZh: '工厂列表', icon: '🏭' },
      { href: '/admin/payments', label: '주문 확인', labelZh: '订单确认', icon: '📋' },
    ],
  },
];

// ─────────────────────────────────────────────
// Designer 네비게이션
// ─────────────────────────────────────────────

export const designerNavItems: NavItem[] = [
  { href: '/designer/tasks', label: '작업 목록', labelZh: '任务列表', icon: '✏️' },
];

// ─────────────────────────────────────────────
// 배지(Badge) 주입 유틸리티
// ─────────────────────────────────────────────

/**
 * 특정 href에 배지 숫자를 주입하는 헬퍼 함수
 * factory/layout.tsx, seller/layout.tsx 등에서 사용
 */
export function injectBadges(
  navItems: NavEntry[],
  badges: Record<string, number>
): NavEntry[] {
  return navItems.map(entry => {
    if (isNavGroup(entry)) {
      return {
        ...entry,
        items: entry.items.map(item =>
          badges[item.href] !== undefined
            ? { ...item, badge: badges[item.href] }
            : item
        ),
      };
    }
    const flat = entry as NavItem;
    return badges[flat.href] !== undefined
      ? { ...flat, badge: badges[flat.href] }
      : flat;
  });
}
