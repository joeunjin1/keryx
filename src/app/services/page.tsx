"use client";
/**
 * /services — KERYX 서비스 소개 페이지
 * 메인 사이트 디자인 통일 (다크 네이비 + 골드)
 * KO / ZH / EN 3개 언어 지원
 */
import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

/* ── 아이콘 SVG ── */
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const FlaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M9 3h6M9 3v8l-4 9h14l-4-9V3"/>
  </svg>
);
const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);
const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>
  </svg>
);
const FactoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const ShipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
    <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
    <polyline points="12 3 12 9"/><path d="m8 9 4-6 4 6"/>
  </svg>
);
const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
    <rect x="9" y="11" width="14" height="10" rx="2"/>
    <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
  </svg>
);
const CrownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

/* ── 텍스트 ── */
const T = {
  ko: {
    hero_eyebrow: "IP 개발 · 스토리 연재 · 상품 기획 · 생산",
    hero_title: "이렇게 일합니다",
    hero_sub: "IP 제안부터 샘플 개발, 공장 매칭, 검수, 납품까지 — 아이템 결정과 동시에 쉽고 빠르게 진행합니다.",
    hero_cta: "파트너 시작하기",
    hero_cta2: "자주 묻는 질문",
    stats: [
      { value: "IP", label: "오리지널 캐릭터" },
      { value: "즉시", label: "아이템 결정 후 진행" },
      { value: "100%", label: "전수 검수 원칙" },
      { value: "원스톱", label: "디자인·샘플·생산·납품" },
    ],
    services_title: "9대 핵심 서비스",
    services_sub: "IP 제안부터 납품까지, 파트너에게 필요한 모든 것을 제공합니다.",
    process_title: "파트너 진행 흐름",
    process_sub: "IP 제안부터 납품까지 5단계",
    scope_title: "서비스 포함 범위",
    scope_sub: "투명하게 공개합니다",
    scope_included: "기본 포함",
    scope_extra: "별도 비용",
    faq_title: "자주 묻는 질문",
    faq_sub: "더 궁금한 점은 언제든 문의해 주세요.",
    faq_more: "추가 문의하기",
    cta_title: "지금 파트너를 시작하세요",
    cta_sub: "의뢰 단계에서는 비용이 발생하지 않습니다. 영업일 2일 내 전담 MD가 연락드립니다.",
    cta_btn: "파트너 시작하기",
    cta_btn2: "문의하기",
  },
  zh: {
    hero_eyebrow: "IP开发 · 故事连载 · 商品策划 · 生产",
    hero_title: "我们这样工作",
    hero_sub: "从IP提案到样品开发、工厂匹配、检验、交货 — 确定商品后即刻快速推进。",
    hero_cta: "成为合作伙伴",
    hero_cta2: "常见问题",
    stats: [
      { value: "IP", label: "原创角色" },
      { value: "即时", label: "确定商品后启动" },
      { value: "100%", label: "全检原则" },
      { value: "一站式", label: "设计·样品·生产·交货" },
    ],
    services_title: "9大核心服务",
    services_sub: "从IP提案到交货，为合作伙伴提供所需的一切。",
    process_title: "合作流程",
    process_sub: "从IP提案到交货，5个步骤",
    scope_title: "服务范围",
    scope_sub: "透明公开",
    scope_included: "基本包含",
    scope_extra: "额外费用",
    faq_title: "常见问题",
    faq_sub: "如有更多问题，请随时联系我们。",
    faq_more: "更多咨询",
    cta_title: "立即成为合作伙伴",
    cta_sub: "咨询阶段不产生费用。2个工作日内专属MD联系您。",
    cta_btn: "成为合作伙伴",
    cta_btn2: "联系我们",
  },
  en: {
    hero_eyebrow: "IP-Proposal Based Premium B2B Sourcing · 25 Years in Yiwu",
    hero_title: "How We Work",
    hero_sub: "From IP proposal to sample development, factory matching, inspection, and delivery — fast execution once the item is decided.",
    hero_cta: "Become a Partner",
    hero_cta2: "FAQ",
    stats: [
      { value: "25+", label: "Years in Yiwu" },
      { value: "Instant", label: "Start After Item Decision" },
      { value: "100%", label: "Full Inspection" },
      { value: "One-Stop", label: "Design·Sample·Production·Delivery" },
    ],
    services_title: "9 Core Services",
    services_sub: "Everything a partner needs, from IP proposal to delivery.",
    process_title: "Partner Workflow",
    process_sub: "5 steps from IP proposal to delivery",
    scope_title: "Service Scope",
    scope_sub: "Full transparency",
    scope_included: "Included",
    scope_extra: "Billed Separately",
    faq_title: "Frequently Asked Questions",
    faq_sub: "Feel free to contact us for more questions.",
    faq_more: "Contact Us",
    cta_title: "Become a Partner Now",
    cta_sub: "No cost at the inquiry stage. Your dedicated MD will contact you within 2 business days.",
    cta_btn: "Become a Partner",
    cta_btn2: "Contact Us",
  },
};

type ServiceItem = {
  id: string;
  Icon: () => JSX.Element;
  color: string;
  ko: { title: string; desc: string; features: string[]; badge: string | null };
  zh: { title: string; desc: string; features: string[]; badge: string | null };
  en: { title: string; desc: string; features: string[]; badge: string | null };
};

const SERVICES: ServiceItem[] = [
  {
    id: "market_research",
    Icon: SearchIcon,
    color: "from-indigo-500 to-indigo-600",
    ko: { title: "시장조사 & IP 제안", desc: "파트너의 타겟 시장에 맞는 트렌드 분석과 최적 IP·상품을 제안합니다.", features: ["타겟 시장 트렌드 분석", "최적 IP · 상품 제안", "경쟁사 제품 가격 조사", "장기 사업플랜 제시 (3~5일)"], badge: "FREE" },
    zh: { title: "市场调研 & IP提案", desc: "根据合作伙伴的目标市场进行趋势分析，推荐最优IP·商品。", features: ["目标市场趋势分析", "最优IP·商品推荐", "竞争对手产品价格调查", "长期事业规划提示（3~5天）"], badge: "FREE" },
    en: { title: "Market Research & IP Proposal", desc: "Trend analysis for your target market and optimal IP/product proposal.", features: ["Target market trend analysis", "Optimal IP & product proposal", "Competitor price research", "Long-term business plan (3–5 days)"], badge: "FREE" },
  },
  {
    id: "sample_dev",
    Icon: FlaskIcon,
    color: "from-violet-500 to-violet-600",
    ko: { title: "샘플 개발", desc: "아이템 결정과 동시에 샘플 제작을 시작합니다. 초기 출발에 힘이 되는 빠른 진행.", features: ["아이템 결정 즉시 샘플 제작 시작", "소재·색상·사이즈 지정 가능", "샘플 사진 실시간 공유", "한국 배송 대행"], badge: null },
    zh: { title: "样品开发", desc: "确定商品后立即开始样品制作。助力初期启动的快速推进。", features: ["确定商品后立即开始样品制作", "可指定材质、颜色、尺寸", "实时共享样品照片", "韩国快递代理"], badge: null },
    en: { title: "Sample Development", desc: "Sample production starts immediately after item decision. Fast execution to support your initial launch.", features: ["Immediate sample production after item decision", "Material, color & size specification", "Real-time sample photo sharing", "Korea delivery service"], badge: null },
  },
  {
    id: "design_dev",
    Icon: PaletteIcon,
    color: "from-pink-500 to-rose-500",
    ko: { title: "디자인 개발", desc: "자체 IP(뿀찌프렌즈, 덕클, 디노몬) 활용 또는 맞춤 IP 개발로 차별화된 굿즈를 기획합니다.", features: ["자체 IP 활용 또는 맞춤 IP 개발", "제품 외관 디자인", "패키지·라벨 디자인", "2D/3D 시안 제공"], badge: "IP 전문" },
    zh: { title: "设计开发", desc: "专业设计师开发IP角色设计、包装设计、产品外观设计。", features: ["IP角色设计", "产品外观设计", "包装·标签设计", "提供2D/3D方案"], badge: "IP专业" },
    en: { title: "Design Development", desc: "Professional designers develop IP character, packaging, and product appearance designs.", features: ["IP character design", "Product appearance design", "Package & label design", "2D/3D concept delivery"], badge: "IP Expert" },
  },
  {
    id: "package_design",
    Icon: PackageIcon,
    color: "from-amber-500 to-orange-500",
    ko: { title: "패키지 & 인쇄 디자인", desc: "초기 출발에 힘이 되도록 패키지·인쇄 디자인까지 원스톱으로 지원합니다.", features: ["브랜드 로고 적용", "박스·봉투·라벨 디자인", "인쇄 사양 최적화", "중국 현지 인쇄 대행"], badge: "초기 지원" },
    zh: { title: "包装 & 印刷设计", desc: "助力初期启动，包装·印刷设计一站式支持。", features: ["品牌Logo应用", "箱子·袋子·标签设计", "印刷规格优化", "中国本地印刷代理"], badge: "初期支持" },
    en: { title: "Package & Print Design", desc: "One-stop package and print design support to help your initial launch.", features: ["Brand logo application", "Box, bag & label design", "Print spec optimization", "China local printing service"], badge: "Launch Support" },
  },
  {
    id: "factory_match",
    Icon: FactoryIcon,
    color: "from-emerald-500 to-teal-500",
    ko: { title: "전문 공장 매칭", desc: "굿즈 제작에 최적화된 전문 공장들과 일합니다. 아이템 결정과 동시에 쉽고 빠른 진행.", features: ["전담 MD 배정", "굿즈 제작 전문 공장 매칭", "공장 실사 사진 제공", "아이템 결정 즉시 생산 시작"], badge: "FREE" },
    zh: { title: "专业工厂匹配", desc: "与周边制作专业工厂合作。确定商品后即刻快速推进。", features: ["专属MD分配", "周边制作专业工厂匹配", "提供工厂实拍照片", "确定商品后立即开始生产"], badge: "FREE" },
    en: { title: "Expert Factory Matching", desc: "We work with factories specialized in goods production. Fast execution once the item is decided.", features: ["Dedicated MD assignment", "Goods-specialized factory matching", "Factory on-site photos", "Immediate production start after item decision"], badge: "FREE" },
  },
  {
    id: "inspection",
    Icon: CheckCircleIcon,
    color: "from-blue-500 to-cyan-500",
    ko: { title: "100% 전수 검수", desc: "적용 가능한 품목에 한해 전수 검수 원칙을 적용합니다. 품목 특성에 따라 샘플링·기능·포장 검수를 병행합니다.", features: ["전수 검수 (적용 품목 100% 개별 확인)", "검수 사진 증빙 제공", "샘플링·기능·포장 검수 병행", "SLA 위반 시 자동 크레딧"], badge: "품질 보장" },
    zh: { title: "100%全检", desc: "针对适用品类实行全检原则，根据品类特性并行抽检、功能、包装检验。", features: ["适用品类100%逐个确认", "提供检验照片证明", "抽检、功能、包装检验并行", "SLA违反时自动积分"], badge: "质量保障" },
    en: { title: "100% Full Inspection", desc: "Full inspection principle applied to eligible product types. Sampling, functional, and packaging inspections are conducted based on product characteristics.", features: ["100% item check (eligible products)", "Inspection photo evidence provided", "Sampling / functional / packaging inspection", "Auto credit on SLA breach"], badge: "Quality Assured" },
  },
  {
    id: "logistics",
    Icon: ShipIcon,
    color: "from-sky-500 to-blue-600",
    ko: { title: "물류 대행", desc: "중국에서 한국까지 LCL/FCL 해운 물류를 대행합니다.", features: ["LCL/FCL 해운 대행", "CBM 계산 및 최적화", "한국 통관 대행", "실시간 배송 추적"], badge: null },
    zh: { title: "物流代理", desc: "代理从中国到韩国的LCL/FCL海运物流。", features: ["LCL/FCL海运代理", "CBM计算及优化", "韩国清关代理", "实时物流追踪"], badge: null },
    en: { title: "Logistics Service", desc: "LCL/FCL ocean freight logistics from China to Korea.", features: ["LCL/FCL ocean freight", "CBM calculation & optimization", "Korea customs clearance", "Real-time shipment tracking"], badge: null },
  },
  {
    id: "domestic_delivery",
    Icon: TruckIcon,
    color: "from-purple-500 to-violet-600",
    ko: { title: "한국 택배 지정 대행", desc: "한국 도착 후 지정 주소로 택배 배송을 대행합니다.", features: ["한국 내 택배 대행", "다수 주소 분할 배송", "반품·교환 처리", "배송 현황 알림"], badge: null },
    zh: { title: "韩国快递指定代理", desc: "货物到达韩国后，代理配送至指定地址。", features: ["韩国境内快递代理", "多地址分割配送", "退换货处理", "配送状态通知"], badge: null },
    en: { title: "Korea Delivery Service", desc: "Courier delivery to designated addresses after arrival in Korea.", features: ["Korea domestic courier", "Multi-address split delivery", "Return & exchange handling", "Delivery status notifications"], badge: null },
  },
  {
    id: "md_service",
    Icon: CrownIcon,
    color: "from-yellow-500 to-amber-500",
    ko: { title: "전담 MD 서비스", desc: "전담 MD가 IP 제안부터 납품까지 모든 과정을 1:1로 관리하며 장기 사업플랜을 함께 설계합니다.", features: ["1:1 전담 MD 배정", "장기 사업플랜 공동 설계", "실시간 카카오톡 소통", "주간 진행 리포트"], badge: "VIP" },
    zh: { title: "专属MD服务", desc: "专属MD从IP提案到交货全程1对1管理，共同设计长期事业规划。", features: ["1对1专属MD分配", "长期事业规划共同设计", "实时KakaoTalk沟通", "每周进度报告"], badge: "VIP" },
    en: { title: "Dedicated MD Service", desc: "Your dedicated MD manages everything 1:1 from IP proposal to delivery, co-designing your long-term business plan.", features: ["1:1 dedicated MD assignment", "Long-term business plan co-design", "Real-time KakaoTalk communication", "Weekly progress report"], badge: "VIP" },
  },
];

type ProcessStep = {
  step: number;
  ko: { title: string; desc: string };
  zh: { title: string; desc: string };
  en: { title: string; desc: string };
};

const PROCESS: ProcessStep[] = [
  {
    step: 1,
    ko: { title: "IP 제안 & 아이템 결정", desc: "파트너의 타겟 시장에 맞는 IP와 상품을 제안합니다. 영업일 2일 내 전담 MD 배정." },
    zh: { title: "IP提案 & 商品确定", desc: "根据合作伙伴的目标市场推荐IP和商品。2个工作日内分配专属MD。" },
    en: { title: "IP Proposal & Item Decision", desc: "We propose IP and products for your target market. Dedicated MD assigned within 2 business days." },
  },
  {
    step: 2,
    ko: { title: "샘플 개발 & 디자인 지원", desc: "아이템 결정과 동시에 샘플 제작 시작. 패키지·인쇄 디자인까지 원스톱 지원." },
    zh: { title: "样品开发 & 设计支持", desc: "确定商品后立即开始样品制作。包装·印刷设计一站式支持。" },
    en: { title: "Sample Dev & Design Support", desc: "Sample production starts immediately. Package & print design one-stop support." },
  },
  {
    step: 3,
    ko: { title: "전문 공장 매칭 & 생산", desc: "굿즈 제작에 최적화된 전문 공장에서 즉시 생산을 시작합니다." },
    zh: { title: "专业工厂匹配 & 生产", desc: "在周边制作专业工厂立即开始生产。" },
    en: { title: "Factory Matching & Production", desc: "Immediate production start at goods-specialized factories." },
  },
  {
    step: 4,
    ko: { title: "100% 검수", desc: "전수 검수 후 사진 증빙과 함께 결과 보고서를 제공합니다." },
    zh: { title: "100%全检", desc: "全检后提供照片证明和结果报告。" },
    en: { title: "100% Inspection", desc: "Full inspection with photo evidence and result report." },
  },
  {
    step: 5,
    ko: { title: "물류 & 납품", desc: "LCL/FCL 최적 운송으로 한국까지 안전하게 납품합니다." },
    zh: { title: "物流 & 交货", desc: "通过LCL/FCL最优运输安全送达韩国。" },
    en: { title: "Logistics & Delivery", desc: "Safe delivery to Korea via optimal LCL/FCL shipping." },
  },
];

const SCOPE = {
  ko: {
    included: [
      "공장 현지 조사 및 인증 검증",
      "매칭 보고서 발행 (PDF 25~36페이지)",
      "중국어 소통 · 계약 검토 · 협상 대행",
      "첫 거래 전 과정 동행",
      "출고 전 100% 전수 검수",
      "LCL/FCL 물류 · 한국 통관 대행",
    ],
    extra: [
      "샘플 개발비·구매비 (의뢰 시 개별 명시)",
      "IP 디자인 개발비 (프로젝트 범위에 따라 제시)",
      "패키지 디자인비 (프로젝트 범위에 따라 제시)",
      "생산 단가 · 원재료비 (공장 직접 정산)",
      "실제 물류비용 (CBM/컨테이너 기준)",
    ],
    note: "주문 계약 선수금 30% 납부 후 생산, 검수 합격 후 잔금 정산.",
  },
  zh: {
    included: [
      "工厂现地调查及认证验证",
      "匹配报告发行（PDF 25~36页）",
      "中文沟通·合同审查·谈判代理",
      "首次交易全程陪同",
      "出货前100%全检",
      "LCL/FCL物流·韩国清关代理",
    ],
    extra: [
      "样品开发费·购买费（委托时逐件明示）",
      "IP设计开发费（根据项目范围提示）",
      "包装设计费（根据项目范围提示）",
      "生产单价·原材料费（工厂直接结算）",
      "实际物流费用（按CBM/集装箱计算）",
    ],
    note: "订单合同预付款30%后生产，检验合格后结算余款。",
  },
  en: {
    included: [
      "Factory on-site inspection & certification verification",
      "Matching report (PDF 25–36 pages)",
      "Chinese communication, contract review & negotiation",
      "Full accompaniment through first transaction",
      "100% pre-shipment full inspection",
      "LCL/FCL logistics & Korea customs clearance",
    ],
    extra: [
      "Sample development & purchase cost (itemized per request)",
      "IP design development fee (quoted by project scope)",
      "Package design fee (quoted by project scope)",
      "Production unit price & raw material cost (settled directly with factory)",
      "Actual logistics cost (based on CBM/container)",
    ],
    note: "30% deposit upon order contract, balance settled after inspection approval.",
  },
};

type FaqItem = {
  ko: { q: string; a: string };
  zh: { q: string; a: string };
  en: { q: string; a: string };
};

const FAQS: FaqItem[] = [
  {
    ko: { q: "회원가입 후 바로 서비스를 이용할 수 있나요?", a: "네, 무료 회원가입 후 시장조사 및 공장 매칭 서비스를 무료로 이용하실 수 있습니다. 서비스 이용 범위와 비용은 의뢰 내용에 따라 개별 안내 드립니다." },
    zh: { q: "注册后可以立即使用服务吗？", a: "是的，免费注册后可以免费使用市场调研及工厂匹配服务。服务范围和费用将根据委托内容个别说明。" },
    en: { q: "Can I use the service immediately after signing up?", a: "Yes, after free registration you can use market research and factory matching services at no cost. Service scope and fees are explained individually based on your request." },
  },
  {
    ko: { q: "공장 매칭은 얼마나 걸리나요?", a: "일반적으로 신청 후 3~5 영업일 내에 매칭 결과를 받으실 수 있습니다. 의뢰 내용에 따라 1~2 영업일 내 결과를 제공하기도 합니다." },
    zh: { q: "工厂匹配需要多长时间？", a: "一般申请后3~5个工作日内可收到匹配结果。根据委托内容，有时可在1~2个工作日内提供结果。" },
    en: { q: "How long does factory matching take?", a: "Typically 3–5 business days after submission. Depending on the request, results may be provided within 1–2 business days." },
  },
  {
    ko: { q: "샘플 제작 비용은 얼마인가요?", a: "샘플 개발비와 구매비는 의뢰 시 정확하게 개별 건으로 명시하여 사전 안내 드립니다. 별도의 관리 수수료는 없으며, 실제 발생 비용만 청구합니다." },
    zh: { q: "样品制作费用是多少？", a: "样品开发费和购买费在委托时按件精确明示，提前告知。不收取额外管理费，仅按实际发生费用收取。" },
    en: { q: "How much does sample production cost?", a: "Sample development and purchase costs are itemized and communicated upfront at the time of request. No additional management fee — only actual costs are charged." },
  },
  {
    ko: { q: "물류 비용은 어떻게 계산되나요?", a: "물류비는 실비로 청구됩니다. LCL은 CBM(세제곱미터) 기준, FCL은 컨테이너 기준으로 계산되며, 부피와 상황에 맞게 LCL/FCL 중 최적의 방법을 제안해 드립니다." },
    zh: { q: "物流费用如何计算？", a: "物流费按实际费用收取。LCL按CBM（立方米）计算，FCL按集装箱计算，根据体积和实际情况推荐最优LCL/FCL方案。" },
    en: { q: "How are logistics costs calculated?", a: "Logistics costs are billed at actual cost. LCL is calculated by CBM, FCL by container. We recommend the optimal option based on volume and circumstances." },
  },
  {
    ko: { q: "검수는 어떻게 진행되나요?", a: "중국 현지 검수팀이 출고 전 100% 전수 검수를 진행합니다. 검수 비용은 정확한 임금비용을 명시하여 청구하며, 검수 결과는 사진과 함께 검수 보고서로 제공됩니다." },
    zh: { q: "检验如何进行？", a: "中国本地检验团队在出货前进行100%全检。检验费用按明确人工费用收取，检验结果以照片和检验报告形式提供。" },
    en: { q: "How does the inspection process work?", a: "Our China-based inspection team conducts 100% full inspection before shipment. Inspection fees are itemized by labor cost, and results are provided with photos and an inspection report." },
  },
  {
    ko: { q: "IP 디자인 개발도 가능한가요?", a: "KERYX는 자체 IP(뿌찌프랜즈, 덕클, 디노몬)를 보유하고 있으며, 바이어 전용 IP 캐릭터 개발도 가능합니다. 디자인 개발 서비스를 통해 2D/3D 시안을 제공해 드립니다." },
    zh: { q: "可以开发IP设计吗？", a: "KERYX拥有自有IP（뿌찌프랜즈、덕클、디노몬），也可为买家开发专属IP角色。通过设计开发服务提供2D/3D方案。" },
    en: { q: "Is IP design development available?", a: "KERYX owns its own IPs (Ppucchi Friends, Duckle, Dinomon) and can develop exclusive IP characters for buyers. 2D/3D concepts are provided through our design development service." },
  },
];

type Lang = "ko" | "zh" | "en";

export default function ServicesPage() {
  const [lang, setLang] = useState<Lang>("ko");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const t = T[lang];
  const scopeData = SCOPE[lang];

  return (
    <div className="min-h-screen bg-white font-sans">
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} theme="dark" />

      {/* ── HERO ── */}
      <section
        className="relative min-h-[72vh] flex items-center overflow-hidden pt-20"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)" }}
      >
        {/* 격자 배경 */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* 글로우 */}
        <div
          className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-56 h-56 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #d4a843 0%, transparent 70%)" }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white/70 text-xs font-medium tracking-wide">{t.hero_eyebrow}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
              {t.hero_title}
            </h1>
            <p className="text-amber-300/90 text-lg md:text-xl font-medium mb-10 leading-relaxed">
              {t.hero_sub}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-black text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200"
                style={{ background: "linear-gradient(135deg, #d4a843 0%, #f0c040 100%)" }}
              >
                {t.hero_cta}
                <ArrowRightIcon />
              </Link>
              <a
                href="#faq"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200"
              >
                {t.hero_cta2}
              </a>
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-14">
            {t.stats.map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mb-1">{s.value}</div>
                <div className="text-white/55 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3패키지 카드 ── */}
      <section className="py-20 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-amber-600 uppercase mb-4 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100">
              PACKAGES
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 mb-3">
              {lang === 'ko' ? '어떤 파트너십이 맞나요?' : lang === 'zh' ? '哪种合作方式适合您？' : 'Which Partnership Fits You?'}
            </h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              {lang === 'ko' ? 'IP 제안부터 풀케어 생산까지, 필요한 단계만 선택할 수 있습니다.' : lang === 'zh' ? '从IP提案到全程管理生产，可选择所需阶段。' : 'From IP proposal to full-care production, choose only what you need.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 패키지 1: 공장 매칭 진단 */}
            <div className="rounded-2xl border-2 border-neutral-200 p-8 flex flex-col hover:border-amber-400 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={1.8} className="w-6 h-6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">FREE</div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">
                {lang === 'ko' ? 'IP 제안 & 진단' : lang === 'zh' ? 'IP提案 & 诊断' : 'IP Proposal & Diagnosis'}
              </h3>
              <p className="text-neutral-500 text-sm mb-6 flex-1">
                {lang === 'ko' ? '어떤 IP와 상품이 내 시장에 맞는지 모르는 분을 위한 첫 단계. 타겟 시장 분석과 최적 상품을 제안합니다.' : lang === 'zh' ? '适合不确定哪种IP和商品适合自己市场的人的第一步。提供目标市场分析和最优商品提案。' : 'The first step for those unsure which IP and products fit their market. We analyze your target market and propose optimal items.'}
              </p>
              <ul className="space-y-2 mb-8">
                {(lang === 'ko' ? ['타겟 시장 분석', '최적 IP · 상품 제안', '영업일 2일 이내 MD 배정', '비용 없음'] : lang === 'zh' ? ['目标市场分析', '最优IP·商品提案', '2个工作日内分配MD', '免费'] : ['Target market analysis', 'Optimal IP & product proposal', 'MD assigned within 2 business days', 'No cost']).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.5} className="w-4 h-4 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/quote" className="block w-full text-center py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold text-sm transition-colors">
                {lang === 'ko' ? '무료 IP 제안 받기' : lang === 'zh' ? '免费IP提案' : 'Get Free IP Proposal'}
              </a>
            </div>
            {/* 패키지 2: 스탠다드 매칭 */}
            <div className="rounded-2xl border-2 border-amber-400 p-8 flex flex-col shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-400 text-gray-900 text-xs font-black px-4 py-1 rounded-full">
                  {lang === 'ko' ? '추천' : lang === 'zh' ? '推荐' : 'Recommended'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={1.8} className="w-6 h-6"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>
              </div>
              <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">PARTNER</div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">
                {lang === 'ko' ? 'IP 상품화 파트너' : lang === 'zh' ? 'IP商品化合作' : 'IP Commercialization Partner'}
              </h3>
              <p className="text-neutral-500 text-sm mb-6 flex-1">
                {lang === 'ko' ? 'IP 제안 + 샘플 개발 + 디자인 지원까지. 첫 거래를 위한 완벽한 시작을 도와드립니다.' : lang === 'zh' ? 'IP提案 + 样品开发 + 设计支持。助力首次交易的完美启动。' : 'IP proposal + sample development + design support. A perfect start for your first transaction.'}
              </p>
              <ul className="space-y-2 mb-8">
                {(lang === 'ko' ? ['IP 제안 + 상품 기획', '샘플 개발 & 디자인 지원', '전문 공장 매칭 & 첫 거래 동행', '패키지·인쇄 디자인 포함'] : lang === 'zh' ? ['IP提案 + 商品企划', '样品开发 & 设计支持', '专业工厂匹配 & 首次交易陪同', '包装·印刷设计包含'] : ['IP proposal + product planning', 'Sample dev & design support', 'Expert factory matching & first transaction', 'Package & print design included']).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.5} className="w-4 h-4 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/quote" className="block w-full text-center py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold text-sm transition-colors">
                {lang === 'ko' ? '파트너 시작하기' : lang === 'zh' ? '成为合作伙伴' : 'Become a Partner'}
              </a>
            </div>
            {/* 패키지 3: 풀케어 생산 */}
            <div className="rounded-2xl border-2 border-neutral-200 p-8 flex flex-col hover:border-amber-400 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={1.8} className="w-6 h-6"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
              </div>
              <div className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">FULL-CARE</div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">
                {lang === 'ko' ? '장기 성장 파트너' : lang === 'zh' ? '长期成长合作' : 'Long-Term Growth Partner'}
              </h3>
              <p className="text-neutral-500 text-sm mb-6 flex-1">
                {lang === 'ko' ? 'IP 제안부터 생산·검수·물류까지 전 과정을 한 팀이 전담합니다. 캐릭터의 탄생부터 상품화까지, IP의 전 과정을 함께 만들어갑니다.' : lang === 'zh' ? '从IP提案到生产·检验·物流，一个团队全程负责。从角色诞生到商品化，共同打造IP的全过程。' : 'One team handles everything from IP proposal to production, inspection, and logistics. We co-design a trade plan for sustainable growth.'}
              </p>
              <ul className="space-y-2 mb-8">
                {(lang === 'ko' ? ['전담 MD와 장기 사업플랜 설계', '샘플·생산·검수·물류 원스톱', 'IP 상품 라인업 지속 확장', '우선 처리 & VIP 전담 서비스'] : lang === 'zh' ? ['专属MD共同设计长期事业规划', '样品·生产·检验·物流一站式', 'IP商品线持续扩展', '优先处理 & VIP专属服务'] : ['Dedicated MD co-designs long-term business plan', 'Sample, production, inspection & logistics one-stop', 'Continuous IP product lineup expansion', 'Priority processing & VIP dedicated service']).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.5} className="w-4 h-4 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/quote" className="block w-full text-center py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold text-sm transition-colors">
                {lang === 'ko' ? '장기 파트너 시작' : lang === 'zh' ? '开始长期合作' : 'Start Long-Term Partnership'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9대 서비스 카드 ── */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-amber-600 uppercase mb-4 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100">
              CORE SERVICES
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 mb-3">{t.services_title}</h2>
            <p className="text-neutral-500 max-w-xl mx-auto">{t.services_sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((svc) => {
              const d = svc[lang];
              return (
                <div
                  key={svc.id}
                  className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${svc.color} flex items-center justify-center text-white shadow-md`}
                    >
                      <svc.Icon />
                    </div>
                    {d.badge && (
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${svc.color}`}
                      >
                        {d.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 mb-2">{d.title}</h3>
                  <p className="text-sm text-neutral-500 mb-4 leading-relaxed flex-1">{d.desc}</p>
                  <ul className="space-y-2 border-t border-neutral-100 pt-4">
                    {d.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-neutral-700">
                        <span className="text-emerald-500 flex-shrink-0">
                          <CheckIcon />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 프로세스 ── */}
      <section className="py-20 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-indigo-600 uppercase mb-4 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 mb-3">{t.process_title}</h2>
            <p className="text-neutral-500">{t.process_sub}</p>
          </div>
          <div className="relative">
            {/* 연결선 */}
            <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-indigo-200 via-amber-300 to-emerald-200" />
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8">
              {PROCESS.map((step) => {
                const d = step[lang];
                return (
                  <div key={step.step} className="flex flex-col items-center text-center relative">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-lg"
                      style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a2744 100%)" }}
                    >
                      <span className="text-2xl font-black text-amber-400">{step.step}</span>
                    </div>
                    <h3 className="text-sm font-black text-neutral-900 mb-2">{d.title}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed max-w-[150px]">{d.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 서비스 범위 ── */}
      <section
        className="py-20"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)" }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-amber-400 uppercase mb-4 px-4 py-1.5 bg-amber-400/10 rounded-full border border-amber-400/30">
              TRANSPARENCY
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">{t.scope_title}</h2>
            <p className="text-white/50">{t.scope_sub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* 포함 */}
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400">
                  <CheckIcon />
                </div>
                <span className="text-emerald-400 font-black text-sm">{t.scope_included}</span>
              </div>
              <ul className="space-y-3">
                {scopeData.included.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* 별도 */}
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-black text-sm">
                  +
                </div>
                <span className="text-amber-400 font-black text-sm">{t.scope_extra}</span>
              </div>
              <ul className="space-y-3">
                {scopeData.extra.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                    <span className="text-amber-400 mt-0.5 flex-shrink-0 font-bold">+</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-white/40 text-xs mt-5 pt-4 border-t border-white/10">{scopeData.note}</p>
            </div>
          </div>
        </div>
      </section>


      {/* ── 기계적 생산 vs 수공 봉제 검수 기준 ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-600 uppercase mb-4 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
              {lang === 'zh' ? '检验标准 · Inspection Standard' : '검수 기준 · Inspection Standard'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              {lang === 'zh' ? '不同生产方式，检验方法也不同' : '생산 방식에 따라 검수 방법이 다릅니다'}
            </h2>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '机械生产品与手工缝制品的品质风险点完全不同。KERYX根据产品特性制定最优检验方案，在实现零风险的同时降低检验成本。'
                : '기계 생산품과 수공 봉제품의 품질 리스크 포인트는 완전히 다릅니다. KERYX는 제품 특성에 맞는 최적 검수 방안을 설계하여 리스크 제로와 비용 절감을 동시에 달성합니다.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* 기계적 생산품 */}
            <div className="rounded-2xl border-2 border-blue-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-blue-600 px-7 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {lang === 'zh' ? '机械生产品' : '기계적 생산품'}
                    </h3>
                    <p className="text-xs text-blue-200">
                      {lang === 'zh' ? '塑料玩具 · 金属配件 · 印刷品 · 电子产品' : '플라스틱 굿즈 · 금속 부품 · 인쇄물 · 전자제품'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-7">
                <div className="mb-5">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">
                    {lang === 'zh' ? '主要风险点' : '주요 리스크 포인트'}
                  </p>
                  <div className="space-y-2">
                    {(lang === 'zh' ? [
                      '尺寸偏差（模具磨损导致）',
                      '色差（批次间颜色不一致）',
                      '表面划痕·气泡·缩水',
                      '印刷错位·色彩偏差',
                      '功能性故障（电子产品）',
                    ] : [
                      '치수 편차 (금형 마모로 인한 오차)',
                      '색상 편차 (배치 간 색상 불일치)',
                      '표면 스크래치·기포·수축',
                      '인쇄 오정렬·색상 편차',
                      '기능 불량 (전자제품)',
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-red-400 flex-shrink-0 mt-0.5">▸</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">
                    {lang === 'zh' ? 'KERYX检验方案' : 'KERYX 검수 방안'}
                  </p>
                  <div className="space-y-2">
                    {(lang === 'zh' ? [
                      'AQL 1.5 기준 샘플링 검수 (대량 생산)',
                      '치수 측정 + 색상 비교 (판톤 기준)',
                      '기능 테스트 100% 전수 (전자제품)',
                      '포장 상태 및 라벨 정확도 확인',
                    ] : [
                      'AQL 1.5 기준 샘플링 검수 (대량 생산)',
                      '치수 측정 + 색상 비교 (팬톤 기준)',
                      '기능 테스트 100% 전수 (전자제품)',
                      '포장 상태 및 라벨 정확도 확인',
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3">
                    <p className="text-xs text-blue-700 font-semibold">
                      {lang === 'zh'
                        ? '机械生产品通过AQL抽样检验可高效覆盖大批量，降低检验成本。'
                        : '기계 생산품은 AQL 샘플링으로 대량 배치를 효율적으로 커버하여 검수 비용을 절감합니다.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* 수공 봉제 생산품 */}
            <div className="rounded-2xl border-2 border-rose-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-rose-600 px-7 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {lang === 'zh' ? '手工缝制品' : '수공 봉제 생산품'}
                    </h3>
                    <p className="text-xs text-rose-200">
                      {lang === 'zh' ? '毛绒玩偶 · 布偶 · 填充玩具 · 布艺包包' : '봉제 인형 · 봉제 가방고리 · 패브릭 굿즈'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-7">
                <div className="mb-5">
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-3">
                    {lang === 'zh' ? '主要风险点' : '주요 리스크 포인트'}
                  </p>
                  <div className="space-y-2">
                    {(lang === 'zh' ? [
                      '缝制不均匀（手工差异）',
                      '填充量不一致（重量偏差）',
                      '刺绣位置偏移·线头外露',
                      '布料色差·拉毛·起球',
                      '配件脱落（眼睛·鼻子·扣子）',
                    ] : [
                      '봉제 불균일 (수작업 편차)',
                      '충전재 양 불일치 (중량 편차)',
                      '자수 위치 이탈·실밥 노출',
                      '원단 색상 편차·보풀·필링',
                      '부속품 탈락 (눈·코·단추)',
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-red-400 flex-shrink-0 mt-0.5">▸</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">
                    {lang === 'zh' ? 'KERYX检验方案' : 'KERYX 검수 방안'}
                  </p>
                  <div className="space-y-2">
                    {(lang === 'zh' ? [
                      '100% 전수 검수 (개별 수작업 편차 대응)',
                      '중량 측정 + 외관 5포인트 체크',
                      '자수·프린트 위치 정확도 확인',
                      '부속품 부착 강도 테스트',
                      '검수 사진 전수 촬영 제공',
                    ] : [
                      '100% 전수 검수 (개별 수작업 편차 대응)',
                      '중량 측정 + 외관 5포인트 체크',
                      '자수·프린트 위치 정확도 확인',
                      '부속품 부착 강도 테스트',
                      '검수 사진 전수 촬영 제공',
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3">
                    <p className="text-xs text-rose-700 font-semibold">
                      {lang === 'zh'
                        ? '手工缝制品因个体差异大，必须进行100%全检。KERYX将检验成本控制在最低限度，同时确保零风险。'
                        : '수공 봉제품은 개체 편차가 크기 때문에 100% 전수 검수가 필수입니다. KERYX는 검수 비용을 최소화하면서 리스크 제로를 보장합니다.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* AQL 기준표 */}
          <div className="rounded-2xl bg-gray-900 text-white p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-white mb-1">
                  {lang === 'zh' ? 'AQL 合格质量水平 기준표' : 'AQL 합격품질수준 기준표'}
                </h3>
                <p className="text-sm text-white/60">
                  {lang === 'zh'
                    ? 'KERYX根据产品类型和批量选择最优AQL水平，兼顾质量保障与成本效率。'
                    : 'KERYX는 제품 유형과 배치 규모에 따라 최적 AQL 수준을 선택하여 품질 보장과 비용 효율을 동시에 달성합니다.'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-xs font-bold text-white/50 py-3 pr-4 whitespace-nowrap">
                      {lang === 'zh' ? '产品类型' : '제품 유형'}
                    </th>
                    <th className="text-left text-xs font-bold text-white/50 py-3 pr-4 whitespace-nowrap">
                      {lang === 'zh' ? '检验方式' : '검수 방식'}
                    </th>
                    <th className="text-left text-xs font-bold text-white/50 py-3 pr-4 whitespace-nowrap">AQL</th>
                    <th className="text-left text-xs font-bold text-white/50 py-3 whitespace-nowrap">
                      {lang === 'zh' ? '理由' : '이유'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(lang === 'zh' ? [
                    { type: '毛绒玩偶·布偶', method: '100% 전수', aql: '전수', reason: '手工差异大，个体偏差不可预测', color: 'text-rose-400' },
                    { type: '봉제 가방고리·패브릭', method: '100% 전수', aql: '전수', reason: '부속품 탈락 리스크, 개체 편차', color: 'text-rose-400' },
                    { type: '플라스틱 굿즈·피규어', method: 'AQL 샘플링', aql: 'AQL 1.5', reason: '机械生产，批次一致性高', color: 'text-blue-400' },
                    { type: '인쇄물·스티커·패키지', method: 'AQL 샘플링', aql: 'AQL 2.5', reason: '印刷偏差可通过抽样检测', color: 'text-blue-400' },
                    { type: '전자제품·기능성 굿즈', method: '기능 전수 + AQL', aql: 'AQL 1.5+전수', reason: '功能性故障需100%测试', color: 'text-amber-400' },
                  ] : [
                    { type: '봉제 인형·패브릭 굿즈', method: '100% 전수', aql: '전수', reason: '수작업 편차 크고 개체별 리스크 불예측', color: 'text-rose-400' },
                    { type: '봉제 가방고리·패브릭', method: '100% 전수', aql: '전수', reason: '부속품 탈락 리스크, 개체 편차', color: 'text-rose-400' },
                    { type: '플라스틱 굿즈·피규어', method: 'AQL 샘플링', aql: 'AQL 1.5', reason: '기계 생산, 배치 일관성 높음', color: 'text-blue-400' },
                    { type: '인쇄물·스티커·패키지', method: 'AQL 샘플링', aql: 'AQL 2.5', reason: '인쇄 편차는 샘플링으로 검출 가능', color: 'text-blue-400' },
                    { type: '전자제품·기능성 굿즈', method: '기능 전수 + AQL', aql: 'AQL 1.5+전수', reason: '기능 불량은 100% 테스트 필수', color: 'text-amber-400' },
                  ]).map((row, i) => (
                    <tr key={i} className="border-b border-white/10 last:border-0">
                      <td className="py-3 pr-4 text-white font-semibold whitespace-nowrap">{row.type}</td>
                      <td className="py-3 pr-4 whitespace-nowrap"><span className={`font-bold ${row.color}`}>{row.method}</span></td>
                      <td className="py-3 pr-4 whitespace-nowrap"><span className={`text-xs font-black px-2 py-0.5 rounded-full bg-white/10 ${row.color}`}>{row.aql}</span></td>
                      <td className="py-3 text-white/50 text-xs">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── IP 상품 생산 문제점 + KERYX 차별점 ── */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-red-600 uppercase mb-4 px-4 py-1.5 bg-red-50 rounded-full border border-red-100">
              {lang === 'zh' ? '行业问题 · Industry Problem' : '업계 문제 · Industry Problem'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              {lang === 'zh' ? 'IP商品生产中常见的误解与损失' : 'IP 상품 생산에서 흔히 겪는 오해와 손실'}
            </h2>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '不了解"高端定制生产"与"简单加工生产"的区别，往往导致质量问题和额外损失。KERYX帮助您在正确的工厂生产正确的产品。'
                : '"프리미엄 상품 제작"과 "단순 가공 생산"의 차이를 정확히 이해하지 못하면 품질 문제와 추가 손실로 이어집니다. KERYX는 올바른 공장에서 올바른 제품을 생산하도록 안내합니다.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {(lang === 'zh' ? [
              {
                icon: '❌',
                title: '误解1: 价格低=利润高',
                desc: '选择最低价工厂，结果收到不合格品，退货和重新生产的损失远超初始节省金额。',
                color: 'border-red-200 bg-red-50',
                titleColor: 'text-red-700',
              },
              {
                icon: '❌',
                title: '误解2: 任何工厂都能做好IP商品',
                desc: 'IP角色商品需要精密的色彩管理和细节处理。普通工厂无法展现角色的魅力。',
                color: 'border-red-200 bg-red-50',
                titleColor: 'text-red-700',
              },
              {
                icon: '❌',
                title: '误解3: 所有工厂都能做IP产品',
                desc: 'IP授权产品需要精密印刷和严格的色彩管理，普通工厂无法满足IP持有方的质量标准。',
                color: 'border-red-200 bg-red-50',
                titleColor: 'text-red-700',
              },
            ] : [
              {
                icon: '❌',
                title: '오해 1: 가격이 낮으면 마진이 높다',
                desc: '최저가 공장을 선택했다가 불량품을 받아 반품·재생산 손실이 초기 절감액을 훨씬 초과하는 경우가 빈번합니다.',
                color: 'border-red-200 bg-red-50',
                titleColor: 'text-red-700',
              },
              {
                icon: '❌',
                title: '오해 2: 아무 공장이나 IP 상품을 잘 만든다',
                desc: 'IP 캐릭터 상품은 정밀한 색상 관리와 디테일이 필수입니다. 일반 공장에서는 캐릭터의 매력을 살릴 수 없습니다.',
                color: 'border-red-200 bg-red-50',
                titleColor: 'text-red-700',
              },
              {
                icon: '❌',
                title: '오해 3: 모든 공장이 IP 상품을 만들 수 있다',
                desc: 'IP 라이센스 상품은 정밀 인쇄와 엄격한 색상 관리가 필요합니다. 일반 공장은 IP 홀더의 품질 기준을 충족하지 못합니다.',
                color: 'border-red-200 bg-red-50',
                titleColor: 'text-red-700',
              },
            ]).map((item, i) => (
              <div key={i} className={`rounded-2xl border-2 p-6 ${item.color}`}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className={`font-black text-base mb-2 ${item.titleColor}`}>{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
          {/* KERYX 해결책 */}
          <div className="rounded-2xl bg-gray-900 text-white p-8">
            <h3 className="text-xl font-black text-white mb-2">
              {lang === 'zh' ? 'KERYX的解决方案：根据产品特性匹配正确的工厂' : 'KERYX의 해결책: 제품 특성에 맞는 공장 매칭'}
            </h3>
            <p className="text-sm text-white/60 mb-8">
              {lang === 'zh'
                ? 'KERYX自己开发IP并生产商品，深知IP商品的特殊要求。将工厂分为高端定制工厂和高效加工工厂，根据产品特性进行精准匹配。'
                : 'KERYX는 직접 IP를 개발하고 상품을 생산하기 때문에 IP 상품의 특수한 요구사항을 잘 알고 있습니다. 공장을 프리미엄 커스텀 공장과 효율 가공 공장으로 분류하고 제품 특성에 맞게 정밀 매칭합니다.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-xl bg-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <h4 className="font-black text-white">
                    {lang === 'zh' ? '高端定制工厂' : '프리미엄 커스텀 공장'}
                  </h4>
                </div>
                <div className="space-y-2">
                  {(lang === 'zh' ? [
                    'IP授权产品（精密色彩管理）',
                    '高端毛绒玩偶（高密度填充）',
                    '定制包装·礼品套装',
                    'OEM品牌产品',
                  ] : [
                    'IP 라이센스 상품 (정밀 색상 관리)',
                    '프리미엄 봉제 인형 (고밀도 충전)',
                    '커스텀 패키지·기프트 세트',
                    'OEM 브랜드 상품',
                  ]).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-white/80">
                      <span className="text-amber-400 flex-shrink-0">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4 h-4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <h4 className="font-black text-white">
                    {lang === 'zh' ? '高效加工工厂' : '효율 가공 공장'}
                  </h4>
                </div>
                <div className="space-y-2">
                  {(lang === 'zh' ? [
                    '대량 표준 상품 (단납기·저단가)',
                    '기본 봉제 굿즈 (소형 가방고리)',
                    '단순 인쇄·가공 상품',
                    '뽑기용 대량 소형 굿즈',
                  ] : [
                    '대량 표준 상품 (단납기·저단가)',
                    '기본 봉제 굿즈 (소형 가방고리)',
                    '단순 인쇄·가공 상품',
                    '뽑기용 대량 소형 굿즈',
                  ]).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-white/80">
                      <span className="text-blue-400 flex-shrink-0">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-amber-500/20 border border-amber-500/30 px-5 py-4">
              <p className="text-sm text-amber-200 font-semibold">
                {lang === 'zh'
                  ? 'KERYX根据每个项目的产品特性、预算、交期进行工厂匹配，而非简单推荐最低价工厂。作为自己开发IP并生产商品的企业，我们深知哪些工厂能做出最好的IP商品。'
                  : 'KERYX는 각 프로젝트의 제품 특성·예산·납기에 맞는 공장을 매칭합니다. 단순히 최저가 공장을 소개하지 않습니다. 직접 IP를 개발하고 생산하는 기업이기에, 어떤 공장이 최고의 IP 상품을 만들 수 있는지 잘 알고 있습니다.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-neutral-500 uppercase mb-4 px-4 py-1.5 bg-white rounded-full border border-neutral-200">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 mb-3">{t.faq_title}</h2>
            <p className="text-neutral-500">{t.faq_sub}</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const d = faq[lang];
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`bg-white rounded-2xl border transition-all duration-200 ${
                    isOpen ? "border-indigo-200 shadow-md" : "border-neutral-100 shadow-sm"
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span className="font-bold text-neutral-900 text-sm sm:text-base">{d.q}</span>
                    <span
                      className={`flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDownIcon />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5">
                      <p className="text-sm text-neutral-600 leading-relaxed">{d.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/support"
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <MessageIcon />
              {t.faq_more}
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-20"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)" }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{t.cta_title}</h2>
          <p className="text-white/55 mb-10 leading-relaxed">{t.cta_sub}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/quote"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-black text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #d4a843 0%, #f0c040 100%)" }}
            >
              {t.cta_btn}
              <ArrowRightIcon />
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200"
            >
              <MessageIcon />
              {t.cta_btn2}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter lang={lang} />
    </div>
  );
}
