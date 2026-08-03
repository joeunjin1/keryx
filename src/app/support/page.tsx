"use client";
/**
 * /support — KERYX 고객 지원 & FAQ 페이지
 * 디자인: 다크 네이비(#0a0f1e) + 골드(#d4a843) — 사이트 전체 통일
 * 이모지 제거 → SVG 아이콘 시스템
 * KO / ZH / EN 3개 언어 지원
 * 멤버십 FAQ 완전 제거
 * 공장 매칭 / 검수 / 계약 구조(가자트레이드 통관 vs 직송금) / IP / 계정 중심 재편
 */
import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

type Lang = "ko" | "zh" | "en";

/* ─────────────────────────── SVG 아이콘 ─────────────────────────── */
const FactoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

/* ─────────────────────────── 번역 ─────────────────────────── */
const T = {
  ko: {
    hero_eyebrow: "KERYX 고객 지원",
    hero_title: "무엇을 도와드릴까요?",
    hero_sub: "이우(義烏) 25년 경험의 KERYX 전담팀이 소싱부터 납품까지 모든 과정을 함께합니다.",
    hero_cta: "견적 의뢰하기",
    hero_cta2: "서비스 안내",
    contact_title: "직접 문의하기",
    contact_sub: "빠른 답변이 필요하시면 아래 채널로 연락해 주세요.",
    kakao: "카카오톡",
    wechat: "위챗",
    email: "이메일",
    hours: "평일 09:00 ~ 18:00 (KST) · 주말 및 공휴일 휴무",
    faq_title: "자주 묻는 질문",
    faq_sub: "카테고리를 선택하여 원하는 답변을 찾아보세요.",
    form_title: "문의 남기기",
    form_sub: "24시간 이내 담당 MD가 답변드립니다.",
    form_name: "이름 / 회사명",
    form_email: "이메일",
    form_message: "문의 내용",
    form_submit: "문의 보내기",
    form_success: "문의가 접수되었습니다. 24시간 이내에 답변드리겠습니다.",
    form_placeholder_name: "홍길동 / (주)가자트레이드",
    form_placeholder_email: "example@company.com",
    form_placeholder_message:
      "소싱하려는 제품 정보, 수량, 예산 등을 자세히 적어주시면 더 빠르게 안내해 드립니다.",
    cta_title: "지금 바로 시작하세요",
    cta_sub: "무료 1차 진단으로 최적의 공장과 서비스를 확인해보세요.",
    cta_btn: "무료 1차 검토 신청",
    new_inquiry: "새 문의 작성",
  },
  zh: {
    hero_eyebrow: "KERYX 客户支持",
    hero_title: "我们能为您提供什么帮助？",
    hero_sub: "拥有义乌25年经验的KERYX专属团队，从采购到交货全程陪伴。",
    hero_cta: "申请报价",
    hero_cta2: "服务介绍",
    contact_title: "直接联系我们",
    contact_sub: "如需快速回复，请通过以下渠道联系我们。",
    kakao: "KakaoTalk",
    wechat: "微信",
    email: "邮件",
    hours: "工作日 09:00~18:00 (韩国时间) · 周末及节假日休息",
    faq_title: "常见问题",
    faq_sub: "选择类别查找所需答案。",
    form_title: "留言咨询",
    form_sub: "专属MD将在24小时内回复您。",
    form_name: "姓名 / 公司名",
    form_email: "邮箱",
    form_message: "咨询内容",
    form_submit: "发送咨询",
    form_success: "咨询已提交。我们将在24小时内回复您。",
    form_placeholder_name: "张三 / XX贸易有限公司",
    form_placeholder_email: "example@company.com",
    form_placeholder_message:
      "请详细描述您想采购的产品信息、数量、预算等，我们将更快为您提供指导。",
    cta_title: "立即开始",
    cta_sub: "通过免费初步诊断，确认最优工厂和服务。",
    cta_btn: "申请免费初步审查",
    new_inquiry: "新建咨询",
  },
  en: {
    hero_eyebrow: "KERYX Customer Support",
    hero_title: "How can we help you?",
    hero_sub:
      "KERYX's dedicated team with 25 years in Yiwu is with you from sourcing to delivery.",
    hero_cta: "Request a Quote",
    hero_cta2: "Our Services",
    contact_title: "Contact Us Directly",
    contact_sub: "For a quick response, reach us through the channels below.",
    kakao: "KakaoTalk",
    wechat: "WeChat",
    email: "Email",
    hours: "Weekdays 09:00–18:00 KST · Closed on weekends & holidays",
    faq_title: "Frequently Asked Questions",
    faq_sub: "Select a category to find the answer you need.",
    form_title: "Send a Message",
    form_sub: "Your dedicated MD will reply within 24 hours.",
    form_name: "Name / Company",
    form_email: "Email",
    form_message: "Message",
    form_submit: "Send Message",
    form_success:
      "Your inquiry has been received. We will reply within 24 hours.",
    form_placeholder_name: "John Doe / ABC Trading Co.",
    form_placeholder_email: "example@company.com",
    form_placeholder_message:
      "Please describe the product, quantity, and budget you are looking for. The more detail, the faster we can help.",
    cta_title: "Get Started Today",
    cta_sub: "Confirm the best factory and service with a free initial diagnosis.",
    cta_btn: "Apply for Free Review",
    new_inquiry: "New Inquiry",
  },
};

/* ─────────────────────────── FAQ 데이터 ─────────────────────────── */
const FAQ_CATEGORIES = [
  {
    id: "sourcing",
    Icon: FactoryIcon,
    label: { ko: "소싱 & 공장 매칭", zh: "采购与工厂匹配", en: "Sourcing & Factory Matching" },
    items: [
      {
        q: {
          ko: "공장 매칭 신청은 어떻게 하나요?",
          zh: "如何申请工厂匹配？",
          en: "How do I apply for factory matching?",
        },
        a: {
          ko: "바이어 대시보드 → 매칭 신청 버튼을 클릭하여 제품 정보(카테고리, 수량, 가격대, 참고 이미지)를 입력하시면 됩니다. KERYX MD팀이 48시간 이내에 최적의 공장 리스트를 제공합니다.",
          zh: "在买家仪表板点击【匹配申请】按钮，填写产品信息（类别、数量、价格范围、参考图片）即可。KERYX MD团队将在48小时内提供最优工厂列表。",
          en: "Click the 'Matching Request' button in your buyer dashboard and fill in product details (category, quantity, price range, reference images). The KERYX MD team will provide an optimized factory list within 48 hours.",
        },
      },
      {
        q: {
          ko: "최소 주문 수량(MOQ)은 얼마인가요?",
          zh: "最小起订量(MOQ)是多少？",
          en: "What is the minimum order quantity (MOQ)?",
        },
        a: {
          ko: "공장마다 다르지만 일반적으로 100~500개입니다. 소량 주문이 필요하신 경우 MD에게 문의하시면 소량 가능 공장을 찾아드립니다.",
          zh: "每个工厂不同，一般为100~500件。如需小批量订单，请联系MD，我们将为您寻找支持小批量的工厂。",
          en: "MOQ varies by factory, but is typically 100–500 units. If you need a smaller quantity, contact your MD and we will find a factory that accommodates small orders.",
        },
      },
      {
        q: {
          ko: "샘플 발주는 어떻게 진행되나요?",
          zh: "样品订单如何进行？",
          en: "How does a sample order work?",
        },
        a: {
          ko: "공장 매칭 후 MD가 샘플 발주를 대행합니다. 샘플 비용(실비)은 바이어가 부담하며, 샘플 수령 후 품질 확인 → 본 발주 진행 순서로 이어집니다.",
          zh: "工厂匹配后，MD代为下样品订单。样品费用（实际费用）由买家承担，收到样品确认质量后进行正式订单。",
          en: "After factory matching, your MD handles the sample order. Sample costs (at cost) are borne by the buyer. After receiving and approving the sample, the full order proceeds.",
        },
      },
      {
        q: {
          ko: "프리미엄 상품과 단순 가공 생산의 차이가 무엇인가요?",
          zh: "优质产品与简单加工生产有什么区别？",
          en: "What is the difference between premium products and simple OEM production?",
        },
        a: {
          ko: "프리미엄 상품(인형, IP 굿즈, 정밀 가공품)은 소재 선택·봉제 기술·인쇄 정밀도가 핵심이며 전문 공장이 필요합니다. 단순 가공(기계 프레스, 사출 성형)은 설비 중심입니다. 잘못된 공장에 발주하면 불량률이 급등하므로, KERYX는 제품 특성에 맞는 공장만 매칭합니다.",
          zh: "优质产品（玩偶、IP周边、精密加工品）的核心在于材料选择、缝制技术和印刷精度，需要专业工厂。简单加工（机械冲压、注塑成型）以设备为主。向错误的工厂下单会导致不良率急剧上升，因此KERYX只匹配适合产品特性的工厂。",
          en: "Premium products (plush toys, IP goods, precision parts) require specialized factories with expertise in materials, sewing, and print precision. Simple OEM (press, injection molding) is equipment-driven. Mismatched factories cause high defect rates. KERYX matches only factories suited to your product type.",
        },
      },
    ],
  },
  {
    id: "inspection",
    Icon: CheckCircleIcon,
    label: { ko: "검수 & 품질 관리", zh: "验货与质量管理", en: "Inspection & Quality Control" },
    items: [
      {
        q: {
          ko: "전수 검수와 AQL 샘플 검수의 차이는 무엇인가요?",
          zh: "全检与AQL抽检有什么区别？",
          en: "What is the difference between 100% inspection and AQL sampling?",
        },
        a: {
          ko: "수공 봉제 제품(인형, 의류)은 개체별 편차가 크므로 전수 검수를 권장합니다. 기계 생산품(사출, 프레스)은 공정 안정성이 높아 AQL 2.5 기준 샘플 검수로 비용을 절감할 수 있습니다. KERYX는 제품 특성에 맞는 검수 방식을 제안합니다.",
          zh: "手工缝制产品（玩偶、服装）个体差异较大，建议全检。机械生产品（注塑、冲压）工艺稳定性高，可按AQL 2.5标准抽检以节省成本。KERYX会根据产品特性推荐合适的验货方式。",
          en: "Hand-sewn products (plush, apparel) have high individual variance and require 100% inspection. Machine-made products (injection, press) have stable processes and can use AQL 2.5 sampling to reduce costs. KERYX recommends the right method for your product.",
        },
      },
      {
        q: {
          ko: "검수 리포트는 어떻게 받나요?",
          zh: "如何获取验货报告？",
          en: "How do I receive the inspection report?",
        },
        a: {
          ko: "검수 완료 후 바이어 대시보드에 12섹션 구조의 상세 검수 리포트가 업로드됩니다. 사진 증빙, 불량 유형 분류, 개선 권고사항이 포함됩니다.",
          zh: "验货完成后，详细的12节结构验货报告将上传至买家仪表板。包含照片证明、不良类型分类和改进建议。",
          en: "After inspection, a detailed 12-section report is uploaded to your buyer dashboard, including photo evidence, defect classification, and improvement recommendations.",
        },
      },
      {
        q: {
          ko: "불량이 발생하면 어떻게 처리되나요?",
          zh: "发生不良品如何处理？",
          en: "How are defects handled?",
        },
        a: {
          ko: "검수 단계에서 발견된 불량은 출고 전 재작업 또는 교체를 요청합니다. SLA 기준 초과 불량률 발생 시 자동 크레딧이 지급됩니다. 납품 후 발견된 불량은 MD가 공장과 협의하여 보상 절차를 진행합니다.",
          zh: "验货阶段发现的不良品，在出货前要求返工或更换。超过SLA标准不良率时自动发放积分。交货后发现的不良品，MD将与工厂协商赔偿程序。",
          en: "Defects found during inspection are reworked or replaced before shipment. If defect rates exceed SLA standards, automatic credits are issued. Post-delivery defects are handled by your MD negotiating compensation with the factory.",
        },
      },
    ],
  },
  {
    id: "contract",
    Icon: FileTextIcon,
    label: { ko: "계약 & 결제 구조", zh: "合同与付款结构", en: "Contract & Payment Structure" },
    items: [
      {
        q: {
          ko: "가자트레이드 통관과 중국 직송금 중 어떤 방식을 선택해야 하나요?",
          zh: "应该选择GAZA贸易清关还是中国直接汇款方式？",
          en: "Should I choose GAZA Trade customs clearance or direct CNY remittance to China?",
        },
        a: {
          ko: "가자트레이드 통관 방식은 한국에서 세금계산서를 수취하고 원화(KRW)로 결제하는 방식입니다. 중국 직송금 방식은 중국 공장에 위안화(CNY)로 직접 송금하며 비용이 더 저렴합니다. 담당 MD가 세금 처리·환율·물량에 따라 최적 방식을 안내해 드립니다.",
          zh: "GAZA贸易清关方式是在韩国收取税务发票并以韩元(KRW)支付。中国直接汇款方式是直接向中国工厂汇入人民币(CNY)，费用更低。专属MD将根据税务处理、汇率和货量为您推荐最优方式。",
          en: "The GAZA Trade customs clearance method issues a Korean tax invoice and accepts KRW payment. Direct CNY remittance to China is lower cost. Your MD will recommend the best option based on tax handling, exchange rate, and order volume.",
        },
      },
      {
        q: {
          ko: "숨겨진 비용이 있나요?",
          zh: "有隐藏费用吗？",
          en: "Are there any hidden fees?",
        },
        a: {
          ko: "없습니다. KERYX의 비용 구조는 무료(초기 진단) / 실비(샘플·물류) / 검수 실비 / 제품 대금 4가지로만 구성됩니다. 모든 비용은 견적서에 사전 명시되며, 추가 청구는 없습니다.",
          zh: "没有。KERYX的费用结构仅由四部分组成：免费（初步诊断）/实际费用（样品·物流）/验货实际费用/产品货款。所有费用在报价单中提前注明，不会有额外收费。",
          en: "No. KERYX's fee structure consists of only four parts: Free (initial diagnosis) / At-cost (samples & logistics) / Inspection at-cost / Product payment. All costs are specified in the quote in advance with no additional charges.",
        },
      },
      {
        q: {
          ko: "바이어-KERYX 계약인가요, 바이어-공장 계약인가요?",
          zh: "是买家-KERYX合同，还是买家-工厂合同？",
          en: "Is the contract between buyer-KERYX or buyer-factory?",
        },
        a: {
          ko: "기본적으로 바이어-KERYX 계약입니다. KERYX가 공장과의 계약을 대행하며, 바이어는 KERYX와만 소통합니다. 단, 바이어가 원할 경우 공장과 직접 계약도 가능하며 이 경우 KERYX는 매칭 및 검수 역할만 수행합니다.",
          zh: "基本上是买家-KERYX合同。KERYX代理与工厂的合同，买家只与KERYX沟通。但如果买家希望，也可以直接与工厂签订合同，此时KERYX仅负责匹配和验货。",
          en: "By default, the contract is between buyer and KERYX. KERYX handles the factory contract on your behalf, and you communicate only with KERYX. If preferred, a direct buyer-factory contract is also possible, with KERYX serving only as matcher and inspector.",
        },
      },
    ],
  },
  {
    id: "logistics",
    Icon: TruckIcon,
    label: { ko: "물류 & 납기", zh: "物流与交期", en: "Logistics & Lead Time" },
    items: [
      {
        q: {
          ko: "일반적인 납기는 얼마나 걸리나요?",
          zh: "一般交期需要多长时间？",
          en: "What is the typical lead time?",
        },
        a: {
          ko: "제품 유형과 수량에 따라 다르지만, 샘플 발주 후 본 발주까지 포함하여 일반적으로 30~60일입니다. 긴급 발주는 MD와 상의하시면 빠른 공장을 우선 매칭해 드립니다.",
          zh: "根据产品类型和数量不同，从样品订单到正式订单通常需要30~60天。如需紧急订单，请与MD商议，我们将优先匹配快速交货的工厂。",
          en: "Lead time varies by product type and quantity, but typically 30–60 days including sample and full order. For urgent orders, discuss with your MD and we will prioritize fast-turnaround factories.",
        },
      },
      {
        q: {
          ko: "물류 방식은 어떻게 선택하나요?",
          zh: "如何选择物流方式？",
          en: "How do I choose a shipping method?",
        },
        a: {
          ko: "소량(LCL)은 CBM 단위 해상 혼재, 대량(FCL)은 컨테이너 단위로 진행합니다. 긴급 납품은 항공 특송도 가능합니다. MD가 물량과 일정에 맞는 최적 물류 방식을 제안합니다.",
          zh: "小批量(LCL)按CBM单位海运拼箱，大批量(FCL)按集装箱单位进行。紧急交货也可选择航空快递。MD将根据货量和时间表推荐最优物流方式。",
          en: "Small quantities (LCL) use CBM-based sea freight consolidation; large quantities (FCL) use full container. Air express is available for urgent deliveries. Your MD will recommend the best option for your volume and schedule.",
        },
      },
      {
        q: {
          ko: "통관 및 관세는 어떻게 처리되나요?",
          zh: "清关和关税如何处理？",
          en: "How are customs and duties handled?",
        },
        a: {
          ko: "가자트레이드 통관 방식 선택 시 KERYX가 한국 통관을 대행합니다. 관세 및 부가세는 실비로 청구되며, 사전 견적서에 명시됩니다.",
          zh: "选择GAZA贸易清关方式时，KERYX代理韩国清关。关税和增值税按实际费用收取，并在事先报价单中注明。",
          en: "When using the GAZA Trade customs clearance method, KERYX handles Korean customs on your behalf. Duties and VAT are charged at cost and specified in the advance quote.",
        },
      },
    ],
  },
  {
    id: "ip",
    Icon: ShieldIcon,
    label: { ko: "IP & 디자인 개발", zh: "IP与设计开发", en: "IP & Design Development" },
    items: [
      {
        q: {
          ko: "IP 라이센스 상품을 소싱하려면 어떻게 해야 하나요?",
          zh: "如何采购IP授权产品？",
          en: "How do I source licensed IP products?",
        },
        a: {
          ko: "KERYX는 정식 IP 라이센스 계약을 체결한 공장만 매칭합니다. 산리오, 짱구 등 주요 IP 라이센스 공장 목록은 MD에게 문의하시면 안내해 드립니다.",
          zh: "KERYX只匹配签订了正式IP授权合同的工厂。主要IP授权工厂列表（如三丽鸥、蜡笔小新等）请联系MD咨询。",
          en: "KERYX matches only factories with official IP license agreements. Contact your MD for a list of licensed factories for major IPs such as Sanrio and Crayon Shin-chan.",
        },
      },
      {
        q: {
          ko: "자체 IP 디자인 개발도 가능한가요?",
          zh: "可以开发自有IP设计吗？",
          en: "Can I develop my own IP design?",
        },
        a: {
          ko: "네, 가능합니다. KERYX의 디자인 개발 서비스를 통해 캐릭터 기획, 굿즈 디자인, 패키지 디자인까지 원스톱으로 진행할 수 있습니다. /apply 페이지에서 디자인 개발 서비스를 신청해 주세요.",
          zh: "是的，可以。通过KERYX的设计开发服务，可以一站式完成角色策划、周边设计、包装设计。请在/apply页面申请设计开发服务。",
          en: "Yes. Through KERYX's design development service, you can handle character planning, goods design, and packaging design all in one place. Apply at the /apply page.",
        },
      },
    ],
  },
  {
    id: "account",
    Icon: UserIcon,
    label: { ko: "계정 & 이용 안내", zh: "账户与使用指南", en: "Account & Usage Guide" },
    items: [
      {
        q: {
          ko: "비밀번호를 잊어버렸어요.",
          zh: "忘记密码了。",
          en: "I forgot my password.",
        },
        a: {
          ko: "로그인 페이지에서 '비밀번호 찾기'를 클릭하시면 이메일로 재설정 링크를 보내드립니다.",
          zh: "在登录页面点击【找回密码】，我们将向您的邮箱发送重置链接。",
          en: "Click 'Forgot Password' on the login page and we will send a reset link to your email.",
        },
      },
      {
        q: {
          ko: "회사 정보를 변경하고 싶어요.",
          zh: "想修改公司信息。",
          en: "I want to update my company information.",
        },
        a: {
          ko: "바이어 대시보드 → 프로필 설정에서 회사명, 담당자명, 연락처 등을 수정할 수 있습니다.",
          zh: "在买家仪表板→个人资料设置中可以修改公司名称、联系人姓名、联系方式等。",
          en: "Go to Buyer Dashboard → Profile Settings to update your company name, contact person, and phone number.",
        },
      },
      {
        q: {
          ko: "담당 MD가 배정되면 어떻게 연락하나요?",
          zh: "分配专属MD后如何联系？",
          en: "How do I contact my assigned MD?",
        },
        a: {
          ko: "MD 배정 후 바이어 대시보드 → 메시지 탭에서 직접 대화할 수 있습니다. 파일, 이미지, 견적서 등을 주고받을 수 있습니다.",
          zh: "MD分配后，可在买家仪表板→消息选项卡中直接对话。可以互发文件、图片、报价单等。",
          en: "After MD assignment, you can chat directly in Buyer Dashboard → Messages. Files, images, and quotes can be exchanged.",
        },
      },
    ],
  },
];

/* ─────────────────────────── 컴포넌트 ─────────────────────────── */
export default function SupportPage() {
  const [lang, setLang] = useState<Lang>("ko");
  const [activeCategory, setActiveCategory] = useState("sourcing");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const t = T[lang];
  const activeItems =
    FAQ_CATEGORIES.find((c) => c.id === activeCategory)?.items ?? [];

  function handleContact(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}
    >
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} theme="dark" />

      {/* ── Hero ── */}
      <section
        className="relative pt-24 pb-20 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)",
        }}
      >
        {/* 격자 배경 */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* 글로우 */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #d4a843 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
            style={{
              background: "rgba(212,168,67,0.15)",
              color: "#d4a843",
              border: "1px solid rgba(212,168,67,0.3)",
            }}
          >
            {t.hero_eyebrow}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-5 leading-tight tracking-tight">
            {t.hero_title}
          </h1>
          <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t.hero_sub}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/apply/factory-matching"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #d4a843, #f59e0b)",
                color: "#0a0f1e",
              }}
            >
              {t.hero_cta}
              <ArrowRightIcon />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-white/20 text-white hover:bg-white/10 transition-all"
            >
              {t.hero_cta2}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 연락처 카드 ── */}
      <section className="py-14 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t.contact_title}
            </h2>
            <p className="text-sm text-gray-500">{t.contact_sub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 카카오톡 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#FEE500" }}
              >
                <MessageIcon />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  {t.kakao}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  @keryx_support
                </div>
              </div>
            </div>
            {/* 위챗 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#07c160" }}
              >
                <PhoneIcon />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  {t.wechat}
                </div>
                <div className="text-sm font-bold text-gray-900">keryx_cn</div>
              </div>
            </div>
            {/* 이메일 */}
            <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#e0e7ff" }}
              >
                <MailIcon />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                  {t.email}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  support@keryx.kr
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-gray-400">
            <ClockIcon />
            <span>{t.hours}</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              {t.faq_title}
            </h2>
            <p className="text-sm text-gray-500">{t.faq_sub}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 카테고리 사이드바 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24">
                <div className="flex flex-col gap-1">
                  {FAQ_CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setOpenFaq(null);
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(135deg, #0a0f1e, #0d1b3e)",
                                color: "#d4a843",
                              }
                            : { color: "#374151" }
                        }
                      >
                        <span
                          className={
                            isActive ? "text-amber-400" : "text-gray-400"
                          }
                        >
                          <cat.Icon />
                        </span>
                        {cat.label[lang]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FAQ 아코디언 */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {activeItems.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      <span className="text-sm font-semibold text-gray-900 leading-snug">
                        {item.q[lang]}
                      </span>
                      <span
                        className="flex-shrink-0 text-gray-400 transition-transform duration-200"
                        style={{
                          transform: isOpen
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <ChevronDownIcon />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 border-t border-gray-50">
                        <p className="text-sm text-gray-600 leading-relaxed pt-4">
                          {item.a[lang]}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 문의 폼 ── */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              {t.form_title}
            </h2>
            <p className="text-sm text-gray-500">{t.form_sub}</p>
          </div>
          {submitted ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: "linear-gradient(135deg, #0a0f1e, #0d1b3e)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(212,168,67,0.2)" }}
              >
                <CheckCircleIcon />
              </div>
              <p className="text-white font-semibold text-base mb-4">
                {t.form_success}
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setContactForm({ name: "", email: "", message: "" });
                }}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #d4a843, #f59e0b)",
                  color: "#0a0f1e",
                }}
              >
                {t.new_inquiry}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleContact}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col gap-5"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t.form_name}
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                  placeholder={t.form_placeholder_name}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t.form_email}
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                  placeholder={t.form_placeholder_email}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t.form_message}
                </label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({
                      ...contactForm,
                      message: e.target.value,
                    })
                  }
                  placeholder={t.form_placeholder_message}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #d4a843, #f59e0b)",
                  color: "#0a0f1e",
                }}
              >
                {t.form_submit}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── 하단 CTA ── */}
      <section
        className="py-20"
        style={{
          background: "linear-gradient(180deg, #0a0f1e 0%, #0d1b3e 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
            {t.cta_title}
          </h2>
          <p className="text-white/60 text-sm mb-8">{t.cta_sub}</p>
          <Link
            href="/apply/factory-matching"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #d4a843, #f59e0b)",
              color: "#0a0f1e",
            }}
          >
            {t.cta_btn}
            <ArrowRightIcon />
          </Link>
        </div>
      </section>

      <PublicFooter lang={lang} />
    </div>
  );
}
