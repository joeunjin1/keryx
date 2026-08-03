"use client";
import { useState } from "react";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { createClient } from "@/lib/supabase/client";

type Lang = "ko" | "zh" | "en" | "ja";

const t = {
  ko: {
    hero_eyebrow: "일본 배송 완결 · 캐릭터 인형 OEM",
    hero_title: "あなたの世界観を\nぬいぐるみにする",
    hero_title_ko: "당신의 세계관을\n인형으로 만듭니다",
    hero_sub: "캐릭터 인형 주문 제작부터 선물용 인형, 굿즈 인형까지. MOQ 500개부터 일본 현지 도착까지 KERYX가 책임집니다.",
    hero_cta: "샘플 제작 의뢰하기",
    hero_cta2: "견적 의뢰하기",
    stats: [
      { value: "500개~", label: "최소 주문 수량 (MOQ)" },
      { value: "30일", label: "평균 샘플 제작 기간" },
      { value: "일본 직배송", label: "목적지 완결 서비스" },
      { value: "현지 에이전시", label: "일본 내 파트너 운영" },
    ],
    portfolio_title: "납품 포트폴리오",
    portfolio_sub: "실제 제작·납품된 캐릭터 인형 사례",
    portfolio_items: [
      { img: "/lp-japan/doll-kawaii.jpg", title: "카와이 캐릭터 인형", tag: "캐릭터 OEM", spec: "20cm · 극세사 · MOQ 500" },
      { img: "/lp-japan/doll-anime.jpg", title: "애니메이션 캐릭터 인형", tag: "IP 굿즈", spec: "25cm · 보아 원단 · MOQ 1,000" },
      { img: "/lp-japan/doll-cat.jpg", title: "동물 캐릭터 인형", tag: "선물용", spec: "15cm · 미니키 · MOQ 500" },
      { img: "/lp-japan/doll-fox.jpg", title: "오리지널 동물 인형", tag: "선물용 OEM", spec: "30cm · 극세사 · MOQ 500" },
      { img: "/lp-japan/doll-original.jpg", title: "오리지널 캐릭터 인형", tag: "SNS 굿즈", spec: "20cm · 커스텀 · MOQ 300" },
      { img: "/lp-japan/doll-custom.jpg", title: "커스텀 캐릭터 인형", tag: "기업 굿즈", spec: "15cm · 다양한 원단 · MOQ 500" },
    ],
    service_title: "KERYX 일본 서비스",
    service_sub: "공장 선정부터 일본 도착까지 원스톱",
    services: [
      { icon: "design", title: "캐릭터 디자인 협력", desc: "일러스트·3D 도면 기반 인형 설계. 원단·눈동자·표정 디테일까지 조율합니다." },
      { icon: "sample", title: "샘플 제작 & 수정", desc: "초도 샘플 제작 후 무제한 수정. 일본 감성에 맞는 퀄리티로 완성합니다." },
      { icon: "factory", title: "검증 공장 매칭", desc: "양저우·광저우 봉제 클러스터 내 일본 수출 경험 공장을 선별 매칭합니다." },
      { icon: "inspect", title: "전수 검수 & 사진 보고서", desc: "출고 전 전수 검수 후 검수 사진 보고서를 제공합니다. 불량 현장 분리." },
      { icon: "ship", title: "일본 직배송 완결", desc: "LCL/FCL 물류로 일본 지정 주소까지 배송. 통관 서류 일체 지원." },
      { icon: "agent", title: "일본 현지 에이전시", desc: "일본 내 파트너 에이전시를 통해 현지 소통·반품·AS 대응이 가능합니다." },
    ],
    process_title: "진행 순서",
    process: [
      { step: "01", title: "의뢰 접수", desc: "샘플 또는 견적 의뢰 폼을 작성하시면 24시간 내 담당 MD가 연락합니다." },
      { step: "02", title: "공장 제안 & 견적", desc: "조건에 맞는 공장 2~3곳을 비교 견적과 함께 제안합니다." },
      { step: "03", title: "샘플 제작", desc: "선택 공장에서 샘플 제작. PM이 일본어·한국어로 공장과 직접 소통합니다." },
      { step: "04", title: "양산 & 검수", desc: "샘플 승인 후 양산. 출고 전 전수 검수 + 사진 보고서 제공." },
      { step: "05", title: "일본 납품", desc: "LCL/FCL 물류로 일본 지정 주소까지 배송 완결. 통관 지원 포함." },
    ],
    types_title: "취급 가능 인형 유형",
    types: [
      { title: "캐릭터 OEM 인형", desc: "자체 IP 또는 오리지널 캐릭터, 20~60cm, MOQ 500개~" },
      { title: "선물용 봉제 인형", desc: "기념일·웨딩·기업 선물용, 패키지 포함, MOQ 500개~" },
      { title: "애니메이션 굿즈 인형", desc: "애니·게임 캐릭터 스타일, 라이선스 대응 가능, MOQ 1,000개~" },
      { title: "미니 봉제 키링", desc: "5~10cm 가방고리 타입, MOQ 300개~" },
      { title: "뽑기용 인형 세트", desc: "가챠·UFO 캐처용, 박스 패키지 포함, MOQ 500개~" },
      { title: "기업 굿즈 인형", desc: "마스코트·노벨티·판촉용, 로고 자수 가능, MOQ 500개~" },
    ],
    form_title: "샘플 제작 의뢰 / 견적 의뢰",
    form_sub: "아래 폼을 작성하시면 24시간 내 담당 MD가 연락드립니다",
    form_type_label: "의뢰 유형",
    form_type_sample: "샘플 제작 의뢰",
    form_type_quote: "견적 의뢰",
    form_name: "담당자 이름 *",
    form_name_ph: "홍길동",
    form_company: "회사명",
    form_company_ph: "주식회사 ○○",
    form_email: "이메일 *",
    form_email_ph: "your@company.com",
    form_phone: "연락처",
    form_phone_ph: "010-0000-0000 또는 일본 번호",
    form_product: "인형 종류 / 캐릭터 설명 *",
    form_product_ph: "예: 고양이 캐릭터 인형, 20cm, 극세사 원단, 귀여운 표정",
    form_qty: "희망 수량",
    form_qty_ph: "예: 500개",
    form_deadline: "희망 납기",
    form_deadline_ph: "예: 2025년 9월",
    form_dest: "납품 목적지",
    form_dest_ph: "예: 도쿄, 오사카, 후쿠오카",
    form_budget: "예산 범위",
    form_budget_opts: ["미정", "100만원 미만", "100~500만원", "500만~1천만원", "1천만원 이상"],
    form_ref: "참고 이미지 URL 또는 설명",
    form_ref_ph: "참고할 이미지 링크나 추가 설명을 입력해주세요",
    form_contact_pref: "선호 연락 수단",
    form_contact_email: "이메일",
    form_contact_kakao: "카카오톡",
    form_contact_line: "LINE",
    form_submit: "의뢰 제출하기",
    form_submitting: "제출 중...",
    form_success_title: "의뢰가 접수되었습니다!",
    form_success_sub: "24시간 내 담당 MD가 연락드립니다. 감사합니다.",
    form_error: "제출 중 오류가 발생했습니다. 다시 시도해주세요.",
    faq_title: "자주 묻는 질문",
    faqs: [
      { q: "MOQ(최소 주문 수량)는 얼마인가요?", a: "기본 MOQ는 500개입니다. 미니 키링 타입은 300개부터 가능합니다. 소량 테스트 오더는 별도 상담 후 진행합니다." },
      { q: "샘플 비용은 얼마인가요?", a: "샘플 비용은 디자인 복잡도에 따라 다르며, 양산 시 샘플 비용의 일부를 공제해드립니다. 견적 의뢰 후 정확한 금액을 안내드립니다." },
      { q: "일본까지 배송이 가능한가요?", a: "네, 일본 지정 주소까지 LCL/FCL 물류로 배송합니다. 통관 서류 일체를 지원하며, 일본 내 파트너 에이전시를 통해 현지 대응도 가능합니다." },
      { q: "납기는 얼마나 걸리나요?", a: "샘플 제작 약 30일, 양산 약 45~60일(수량·복잡도에 따라 상이)입니다. 정확한 납기는 공장 확정 후 안내드립니다." },
      { q: "CPSIA, CE, PSE 등 인증이 필요한데 가능한가요?", a: "네, 인증 대응 가능한 공장을 선별 매칭합니다. 필요 인증을 의뢰 시 알려주시면 적합한 공장을 제안합니다." },
    ],
    cta_title: "지금 바로 의뢰하세요",
    cta_sub: "캐릭터 인형 주문 제작, 선물용 인형, 굿즈 인형 — 모든 문의를 환영합니다",
    cta_btn: "샘플 제작 의뢰하기",
  },
  zh: {
    hero_eyebrow: "日本配送完结 · 角色玩偶OEM",
    hero_title: "あなたの世界観を\nぬいぐるみにする",
    hero_title_ko: "将您的世界观\n制作成玩偶",
    hero_sub: "从角色玩偶定制到礼品玩偶、周边玩偶。MOQ 500个起，KERYX负责送达日本。",
    hero_cta: "申请样品制作",
    hero_cta2: "申请报价",
    stats: [
      { value: "500个~", label: "最低起订量 (MOQ)" },
      { value: "30天", label: "平均样品制作周期" },
      { value: "日本直送", label: "目的地完结服务" },
      { value: "本地代理", label: "日本境内合作伙伴" },
    ],
    portfolio_title: "交付案例",
    portfolio_sub: "实际制作并交付的角色玩偶案例",
    portfolio_items: [
      { img: "/lp-japan/doll-kawaii.jpg", title: "可爱角色玩偶", tag: "角色OEM", spec: "20cm · 超细纤维 · MOQ 500" },
      { img: "/lp-japan/doll-anime.jpg", title: "动漫角色玩偶", tag: "IP周边", spec: "25cm · 仿羊羔绒 · MOQ 1,000" },
      { img: "/lp-japan/doll-cat.jpg", title: "动物角色玩偶", tag: "礼品用", spec: "15cm · 迷你毛绒 · MOQ 500" },
      { img: "/lp-japan/doll-fox.jpg", title: "原创动物玩偶", tag: "礼品OEM", spec: "30cm · 超细纤维 · MOQ 500" },
      { img: "/lp-japan/doll-original.jpg", title: "原创角色玩偶", tag: "SNS周边", spec: "20cm · 定制 · MOQ 300" },
      { img: "/lp-japan/doll-custom.jpg", title: "定制角色玩偶", tag: "企业周边", spec: "15cm · 多种面料 · MOQ 500" },
    ],
    service_title: "KERYX 日本服务",
    service_sub: "从工厂选定到日本到达，一站式服务",
    services: [
      { icon: "design", title: "角色设计协作", desc: "基于插画·3D图纸的玩偶设计。协调面料、眼睛、表情等细节。" },
      { icon: "sample", title: "样品制作 & 修改", desc: "初版样品制作后无限修改。以符合日本审美的品质完成。" },
      { icon: "factory", title: "认证工厂匹配", desc: "从扬州·广州缝制产业集群中精选有日本出口经验的工厂。" },
      { icon: "inspect", title: "全检 & 照片报告", desc: "出货前全数检验，提供检验照片报告。现场分离不良品。" },
      { icon: "ship", title: "日本直送完结", desc: "LCL/FCL物流送达日本指定地址。提供全套通关文件支持。" },
      { icon: "agent", title: "日本本地代理", desc: "通过日本境内合作代理，实现本地沟通、退换货及售后服务。" },
    ],
    process_title: "服务流程",
    process: [
      { step: "01", title: "接受委托", desc: "填写样品或报价申请表，24小时内由负责MD联系。" },
      { step: "02", title: "工厂推荐 & 报价", desc: "推荐2~3家符合条件的工厂，附比较报价。" },
      { step: "03", title: "样品制作", desc: "选定工厂制作样品。PM以日语·韩语直接与工厂沟通。" },
      { step: "04", title: "量产 & 检验", desc: "样品确认后量产。出货前全数检验 + 照片报告。" },
      { step: "05", title: "日本交货", desc: "LCL/FCL物流送达日本指定地址。含通关支持。" },
    ],
    types_title: "可制作玩偶类型",
    types: [
      { title: "角色OEM玩偶", desc: "自有IP或原创角色，20~60cm，MOQ 500个~" },
      { title: "礼品毛绒玩偶", desc: "纪念日·婚礼·企业礼品，含包装，MOQ 500个~" },
      { title: "动漫周边玩偶", desc: "动漫·游戏角色风格，可对应授权，MOQ 1,000个~" },
      { title: "迷你毛绒挂件", desc: "5~10cm包包挂件款，MOQ 300个~" },
      { title: "扭蛋玩偶套装", desc: "扭蛋·UFO抓机用，含盒装，MOQ 500个~" },
      { title: "企业周边玩偶", desc: "吉祥物·礼品·促销用，可绣LOGO，MOQ 500个~" },
    ],
    form_title: "样品制作申请 / 报价申请",
    form_sub: "填写下方表单，24小时内由负责MD联系",
    form_type_label: "申请类型",
    form_type_sample: "样品制作申请",
    form_type_quote: "报价申请",
    form_name: "负责人姓名 *",
    form_name_ph: "张三",
    form_company: "公司名称",
    form_company_ph: "○○株式会社",
    form_email: "邮箱 *",
    form_email_ph: "your@company.com",
    form_phone: "联系方式",
    form_phone_ph: "手机号或日本电话",
    form_product: "玩偶种类 / 角色说明 *",
    form_product_ph: "例：猫咪角色玩偶，20cm，超细纤维，可爱表情",
    form_qty: "希望数量",
    form_qty_ph: "例：500个",
    form_deadline: "希望交货期",
    form_deadline_ph: "例：2025年9月",
    form_dest: "交货目的地",
    form_dest_ph: "例：东京、大阪、福冈",
    form_budget: "预算范围",
    form_budget_opts: ["待定", "10万元以下", "10~50万元", "50~100万元", "100万元以上"],
    form_ref: "参考图片URL或说明",
    form_ref_ph: "请输入参考图片链接或补充说明",
    form_contact_pref: "偏好联系方式",
    form_contact_email: "邮件",
    form_contact_kakao: "KakaoTalk",
    form_contact_line: "LINE",
    form_submit: "提交申请",
    form_submitting: "提交中...",
    form_success_title: "申请已受理！",
    form_success_sub: "24小时内负责MD将与您联系。感谢您的信任。",
    form_error: "提交时发生错误，请重试。",
    faq_title: "常见问题",
    faqs: [
      { q: "MOQ（最低起订量）是多少？", a: "基本MOQ为500个。迷你挂件款从300个起。小批量测试订单可另行咨询。" },
      { q: "样品费用是多少？", a: "样品费用因设计复杂度而异，量产时可抵扣部分样品费。提交报价申请后将提供准确报价。" },
      { q: "可以配送到日本吗？", a: "可以，通过LCL/FCL物流送达日本指定地址，提供全套通关文件支持，日本境内合作代理可提供本地服务。" },
      { q: "交货期需要多久？", a: "样品约30天，量产约45~60天（因数量和复杂度而异）。确认工厂后提供准确交货期。" },
      { q: "需要CPSIA、CE、PSE等认证，可以吗？", a: "可以，我们会精选具备相应认证能力的工厂进行匹配。申请时请告知所需认证。" },
    ],
    cta_title: "立即提交申请",
    cta_sub: "角色玩偶定制、礼品玩偶、周边玩偶——欢迎所有咨询",
    cta_btn: "申请样品制作",
  },
  en: {
    hero_eyebrow: "Japan Delivery Complete · Character Doll OEM",
    hero_title: "あなたの世界観を\nぬいぐるみにする",
    hero_title_ko: "Bring Your Character\nto Life as a Plush",
    hero_sub: "From custom character plush dolls to gift plushies and goods dolls. MOQ from 500 units, delivered to Japan. KERYX handles everything.",
    hero_cta: "Request Sample Production",
    hero_cta2: "Request a Quote",
    stats: [
      { value: "500+", label: "Minimum Order Qty (MOQ)" },
      { value: "30 days", label: "Avg. Sample Lead Time" },
      { value: "Japan Delivery", label: "End-to-End Service" },
      { value: "Local Agency", label: "Japan Partner Network" },
    ],
    portfolio_title: "Portfolio",
    portfolio_sub: "Real character dolls manufactured and delivered",
    portfolio_items: [
      { img: "/lp-japan/doll-kawaii.jpg", title: "Kawaii Character Plush", tag: "Character OEM", spec: "20cm · Microfiber · MOQ 500" },
      { img: "/lp-japan/doll-anime.jpg", title: "Anime Character Plush", tag: "IP Goods", spec: "25cm · Boa Fabric · MOQ 1,000" },
      { img: "/lp-japan/doll-cat.jpg", title: "Animal Character Plush", tag: "Gift", spec: "15cm · Mini Plush · MOQ 500" },
      { img: "/lp-japan/doll-fox.jpg", title: "Original Animal Plush", tag: "Gift OEM", spec: "30cm · Microfiber · MOQ 500" },
      { img: "/lp-japan/doll-original.jpg", title: "Original Character Plush", tag: "SNS Goods", spec: "20cm · Custom · MOQ 300" },
      { img: "/lp-japan/doll-custom.jpg", title: "Custom Character Plush", tag: "Corporate Goods", spec: "15cm · Various Fabrics · MOQ 500" },
    ],
    service_title: "KERYX Japan Services",
    service_sub: "One-stop from factory selection to Japan delivery",
    services: [
      { icon: "design", title: "Character Design Support", desc: "Plush design from illustrations or 3D drawings. Coordinate fabric, eyes, and expression details." },
      { icon: "sample", title: "Sample Production & Revision", desc: "Unlimited revisions after initial sample. Completed to the quality standard that Japanese market demands." },
      { icon: "factory", title: "Verified Factory Matching", desc: "Selected factories with Japan export experience from Yangzhou and Guangzhou clusters." },
      { icon: "inspect", title: "Full Inspection & Photo Report", desc: "100% inspection before shipment with photo report. Defects separated on-site." },
      { icon: "ship", title: "Japan Direct Delivery", desc: "LCL/FCL logistics to your specified address in Japan. Full customs documentation support." },
      { icon: "agent", title: "Japan Local Agency", desc: "Local partner agency in Japan for on-site communication, returns, and after-sales support." },
    ],
    process_title: "Process",
    process: [
      { step: "01", title: "Submit Request", desc: "Fill out the sample or quote form. Our MD will contact you within 24 hours." },
      { step: "02", title: "Factory Proposal & Quote", desc: "We propose 2~3 matching factories with comparative quotes." },
      { step: "03", title: "Sample Production", desc: "Selected factory produces samples. PM communicates directly in Japanese & Korean." },
      { step: "04", title: "Mass Production & Inspection", desc: "Mass production after sample approval. Full inspection + photo report before shipment." },
      { step: "05", title: "Japan Delivery", desc: "LCL/FCL logistics to your Japan address. Customs support included." },
    ],
    types_title: "Doll Types Available",
    types: [
      { title: "Character OEM Plush", desc: "Original IP or custom character, 20~60cm, MOQ 500+" },
      { title: "Gift Plush Dolls", desc: "Anniversary, wedding, corporate gifts with packaging, MOQ 500+" },
      { title: "Anime Goods Plush", desc: "Anime/game character style, license-ready, MOQ 1,000+" },
      { title: "Mini Plush Keychain", desc: "5~10cm bag charm type, MOQ 300+" },
      { title: "Gacha Plush Set", desc: "For gacha/UFO catcher, with box packaging, MOQ 500+" },
      { title: "Corporate Goods Plush", desc: "Mascot, novelty, promotional use, logo embroidery available, MOQ 500+" },
    ],
    form_title: "Sample Request / Quote Request",
    form_sub: "Fill in the form below and our MD will contact you within 24 hours",
    form_type_label: "Request Type",
    form_type_sample: "Sample Production Request",
    form_type_quote: "Quote Request",
    form_name: "Contact Name *",
    form_name_ph: "John Smith",
    form_company: "Company Name",
    form_company_ph: "Your Company Ltd.",
    form_email: "Email *",
    form_email_ph: "your@company.com",
    form_phone: "Phone",
    form_phone_ph: "Your phone or Japan number",
    form_product: "Doll Type / Character Description *",
    form_product_ph: "e.g. Cat character plush, 20cm, microfiber, cute expression",
    form_qty: "Desired Quantity",
    form_qty_ph: "e.g. 500 pcs",
    form_deadline: "Desired Delivery Date",
    form_deadline_ph: "e.g. September 2025",
    form_dest: "Delivery Destination",
    form_dest_ph: "e.g. Tokyo, Osaka, Fukuoka",
    form_budget: "Budget Range",
    form_budget_opts: ["TBD", "Under $1,000", "$1,000~$5,000", "$5,000~$10,000", "Over $10,000"],
    form_ref: "Reference Image URL or Notes",
    form_ref_ph: "Enter reference image link or additional notes",
    form_contact_pref: "Preferred Contact",
    form_contact_email: "Email",
    form_contact_kakao: "KakaoTalk",
    form_contact_line: "LINE",
    form_submit: "Submit Request",
    form_submitting: "Submitting...",
    form_success_title: "Request Received!",
    form_success_sub: "Our MD will contact you within 24 hours. Thank you!",
    form_error: "An error occurred. Please try again.",
    faq_title: "FAQ",
    faqs: [
      { q: "What is the MOQ?", a: "The basic MOQ is 500 units. Mini keychain types start from 300. Small test orders can be discussed separately." },
      { q: "How much does a sample cost?", a: "Sample costs vary by design complexity. Part of the sample cost can be deducted upon mass production. Exact pricing will be provided after quote request." },
      { q: "Can you deliver to Japan?", a: "Yes, we deliver to your specified address in Japan via LCL/FCL logistics. Full customs documentation support and local Japan agency available." },
      { q: "How long does it take?", a: "Sample: approx. 30 days. Mass production: approx. 45~60 days (varies by quantity and complexity). Exact lead time provided after factory confirmation." },
      { q: "Can you handle CPSIA, CE, PSE certifications?", a: "Yes, we match you with factories capable of the required certifications. Please specify needed certifications when submitting your request." },
    ],
    cta_title: "Submit Your Request Now",
    cta_sub: "Custom character plush, gift dolls, goods plush — all inquiries welcome",
    cta_btn: "Request Sample Production",
  },
  ja: {
    hero_eyebrow: "日本配送完結 · キャラクターぬいぐるみOEM",
    hero_title: "あなたの世界観を\nぬいぐるみにする",
    hero_title_ko: "あなたのキャラクターを\nぬいぐるみにします",
    hero_sub: "キャラクターぬいぐるみのオーダーメイドから、ギフト用ぬいぐるみ、グッズぬいぐるみまで。MOQ 500個から日本現地到着までKERYXがお任せします。",
    hero_cta: "サンプル制作を依頼する",
    hero_cta2: "見積もりを依頼する",
    stats: [
      { value: "500個〜", label: "最低注文数量 (MOQ)" },
      { value: "30日", label: "平均サンプル制作期間" },
      { value: "日本直送", label: "目的地完結サービス" },
      { value: "現地エージェント", label: "日本国内パートナー運営" },
    ],
    portfolio_title: "納品ポートフォリオ",
    portfolio_sub: "実際に制作・納品されたキャラクターぬいぐるみの事例",
    portfolio_items: [
      { img: "/lp-japan/doll-kawaii.jpg", title: "かわいいキャラクターぬいぐるみ", tag: "キャラクターOEM", spec: "20cm · 超極細繊維 · MOQ 500" },
      { img: "/lp-japan/doll-anime.jpg", title: "アニメキャラクターぬいぐるみ", tag: "IPグッズ", spec: "25cm · ボア生地 · MOQ 1,000" },
      { img: "/lp-japan/doll-cat.jpg", title: "動物キャラクターぬいぐるみ", tag: "ギフト用", spec: "15cm · ミニキ · MOQ 500" },
      { img: "/lp-japan/doll-fox.jpg", title: "オリジナル動物ぬいぐるみ", tag: "ギフトOEM", spec: "30cm · 超極細繊維 · MOQ 500" },
      { img: "/lp-japan/doll-original.jpg", title: "オリジナルキャラクターぬいぐるみ", tag: "SNSグッズ", spec: "20cm · カスタム · MOQ 300" },
      { img: "/lp-japan/doll-custom.jpg", title: "カスタムキャラクターぬいぐるみ", tag: "企業グッズ", spec: "15cm · 各種生地 · MOQ 500" },
    ],
    service_title: "KERYX 日本向けサービス",
    service_sub: "工場選定から日本到着まで、ワンストップ",
    services: [
      { icon: "design", title: "キャラクターデザイン協力", desc: "イラスト・3D図面をもとにぬいぐるみを設計。生地・目・表情の細部まで調整します。" },
      { icon: "sample", title: "サンプル制作 & 修正", desc: "初回サンプル制作後、無制限修正対応。日本の感性に合った品質で仕上げます。" },
      { icon: "factory", title: "認定工場マッチング", desc: "揚州・広州の縫製クラスターから、日本輸出経験のある工場を厳選してマッチングします。" },
      { icon: "inspect", title: "全数検品 & 写真レポート", desc: "出荷前に全数検品を実施し、検品写真レポートを提供します。不良品は現場で分離。" },
      { icon: "ship", title: "日本直送完結", desc: "LCL/FCL物流で日本の指定住所までお届け。通関書類一式をサポートします。" },
      { icon: "agent", title: "日本国内エージェント", desc: "日本国内のパートナーエージェントを通じて、現地対応・返品・アフターサービスが可能です。" },
    ],
    process_title: "ご依頼の流れ",
    process: [
      { step: "01", title: "依頼受付", desc: "サンプルまたは見積もり依頼フォームをご記入ください。24時間以内に担当MDよりご連絡します。" },
      { step: "02", title: "工場提案 & 見積もり", desc: "条件に合う工場を2〜3社、比較見積もりとともにご提案します。" },
      { step: "03", title: "サンプル制作", desc: "選定工場でサンプルを制作。PMが日本語・韓国語で工場と直接やり取りします。" },
      { step: "04", title: "量産 & 検品", desc: "サンプル承認後に量産開始。出荷前に全数検品 + 写真レポートを提供します。" },
      { step: "05", title: "日本納品", desc: "LCL/FCL物流で日本の指定住所まで配送完結。通関サポート込み。" },
    ],
    types_title: "取り扱い可能なぬいぐるみの種類",
    types: [
      { title: "キャラクターOEMぬいぐるみ", desc: "自社IPまたはオリジナルキャラクター、20〜60cm、MOQ 500個〜" },
      { title: "ギフト用ぬいぐるみ", desc: "記念日・ウェディング・企業ギフト、パッケージ込み、MOQ 500個〜" },
      { title: "アニメグッズぬいぐるみ", desc: "アニメ・ゲームキャラクター風、ライセンス対応可、MOQ 1,000個〜" },
      { title: "ミニぬいぐるみキーホルダー", desc: "5〜10cmバッグチャームタイプ、MOQ 300個〜" },
      { title: "ガチャ用ぬいぐるみセット", desc: "ガチャ・UFOキャッチャー用、ボックスパッケージ込み、MOQ 500個〜" },
      { title: "企業グッズぬいぐるみ", desc: "マスコット・ノベルティ・販促用、ロゴ刺繍可、MOQ 500個〜" },
    ],
    form_title: "サンプル制作依頼 / 見積もり依頼",
    form_sub: "下記フォームをご記入ください。24時間以内に担当MDよりご連絡します",
    form_type_label: "依頼種別",
    form_type_sample: "サンプル制作依頼",
    form_type_quote: "見積もり依頼",
    form_name: "担当者名 *",
    form_name_ph: "山田 太郎",
    form_company: "会社名",
    form_company_ph: "株式会社○○",
    form_email: "メールアドレス *",
    form_email_ph: "your@company.com",
    form_phone: "電話番号",
    form_phone_ph: "日本の電話番号または携帯番号",
    form_product: "ぬいぐるみの種類 / キャラクター説明 *",
    form_product_ph: "例：ねこキャラクターぬいぐるみ、20cm、超極細繊維、かわいい表情",
    form_qty: "希望数量",
    form_qty_ph: "例：500個",
    form_deadline: "希望納期",
    form_deadline_ph: "例：2025年9月",
    form_dest: "納品先",
    form_dest_ph: "例：東京、大阪、福岡",
    form_budget: "予算範囲",
    form_budget_opts: ["未定", "10万円未満", "10〜50万円", "50〜100万円", "100万円以上"],
    form_ref: "参考画像URLまたは補足説明",
    form_ref_ph: "参考画像のリンクや追加説明をご入力ください",
    form_contact_pref: "ご希望の連絡手段",
    form_contact_email: "メール",
    form_contact_kakao: "KakaoTalk",
    form_contact_line: "LINE",
    form_submit: "依頼を送信する",
    form_submitting: "送信中...",
    form_success_title: "依頼を受け付けました！",
    form_success_sub: "24時間以内に担当MDよりご連絡いたします。ありがとうございます。",
    form_error: "送信中にエラーが発生しました。もう一度お試しください。",
    faq_title: "よくある質問",
    faqs: [
      { q: "MOQ（最低注文数量）はいくつですか？", a: "基本MOQは500個です。ミニキーホルダータイプは300個から対応可能です。少量テストオーダーは別途ご相談ください。" },
      { q: "サンプル費用はいくらですか？", a: "サンプル費用はデザインの複雑さによって異なります。量産時にサンプル費用の一部を差し引くことができます。見積もり依頼後に正確な金額をご案内します。" },
      { q: "日本への配送は可能ですか？", a: "はい、LCL/FCL物流で日本の指定住所までお届けします。通関書類一式をサポートし、日本国内のパートナーエージェントによる現地対応も可能です。" },
      { q: "納期はどのくらいかかりますか？", a: "サンプル制作は約30日、量産は約45〜60日（数量・複雑さにより異なります）。工場確定後に正確な納期をご案内します。" },
      { q: "CPSIA・CE・PSEなどの認証に対応できますか？", a: "はい、必要な認証に対応できる工場を厳選してマッチングします。ご依頼時に必要な認証をお知らせください。" },
    ],
    cta_title: "今すぐご依頼ください",
    cta_sub: "キャラクターぬいぐるみ制作・ギフト用ぬいぐるみ・グッズぬいぐるみ — すべてのお問い合わせを歓迎します",
    cta_btn: "サンプル制作を依頼する",
  },
};

const serviceIcons: Record<string, React.ReactNode> = {
  design: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  sample: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg>
  ),
  factory: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20V8l6-4v4l6-4v4l6-4v16H2z"/>
    </svg>
  ),
  inspect: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  ship: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20l2-2h16l2 2"/><path d="M5 20V10l7-7 7 7v10"/><path d="M9 20v-5h6v5"/>
    </svg>
  ),
  agent: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
};

export default function JapanDollPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formType, setFormType] = useState<"sample" | "quote">("sample");
  const [formData, setFormData] = useState({
    name: "", company: "", email: "", phone: "",
    product: "", qty: "", deadline: "", dest: "",
    budget: "", ref: "", contact_pref: "email",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const c = t[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase.from("japan_doll_inquiries").insert({
        form_type: formType,
        lang,
        name: formData.name,
        company: formData.company || null,
        email: formData.email,
        phone: formData.phone || null,
        product: formData.product,
        qty: formData.qty || null,
        deadline: formData.deadline || null,
        dest: formData.dest || null,
        budget: formData.budget || null,
        ref: formData.ref || null,
        contact_pref: formData.contact_pref,
        status: "new",
      });
      if (dbErr) throw dbErr;
      setSubmitted(true);
    } catch {
      setError(c.form_error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)", minHeight: "100vh" }}>
      <PublicHeader />

      {/* 언어 선택 바 */}
      <div className="flex justify-center gap-2 py-3 border-b border-white/10">
        {(["ja", "ko", "zh", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              lang === l
                ? "bg-amber-400 text-gray-900"
                : "text-white/60 hover:text-white border border-white/20 hover:border-white/40"
            }`}
          >
            {l === "ja" ? "日本語" : l === "ko" ? "한국어" : l === "zh" ? "中文" : "EN"}
          </button>
        ))}
      </div>

      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32 text-center">
        {/* 배경 장식 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20 mb-6">
            {c.hero_eyebrow}
          </span>
          {/* 일본어 타이틀 (장식) */}
          <p className="text-2xl md:text-3xl text-white/30 font-light mb-2 tracking-widest" style={{ fontFamily: "'Noto Serif JP', serif" }}>
            {c.hero_title.split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
          </p>
          {/* 메인 타이틀 */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {c.hero_title_ko.split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            {c.hero_sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#inquiry-form"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-amber-400 text-gray-900 font-bold text-lg hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20"
            >
              {c.hero_cta}
            </a>
            <a
              href="#portfolio"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-white/30 text-white font-semibold text-lg hover:border-white/60 hover:bg-white/5 transition-all"
            >
              {c.hero_cta2}
            </a>
          </div>
        </div>
      </section>

      {/* 통계 */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {c.stats.map((stat, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-amber-400 mb-1">{stat.value}</div>
              <div className="text-sm text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 포트폴리오 */}
      <section id="portfolio" className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{c.portfolio_title}</h2>
            <p className="text-white/60">{c.portfolio_sub}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {c.portfolio_items.map((item, i) => (
              <div key={i} className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-amber-400/30 transition-all">
                <div className="relative h-48 md:h-56 overflow-hidden bg-gray-800">
                  <Image
                    src={item.img}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-400 text-gray-900">
                      {item.tag}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-white/50 text-xs">{item.spec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 서비스 */}
      <section className="px-4 py-16 bg-white/2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{c.service_title}</h2>
            <p className="text-white/60">{c.service_sub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {c.services.map((svc, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-amber-400/30 transition-all">
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-4">
                  {serviceIcons[svc.icon]}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{svc.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 진행 순서 */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">{c.process_title}</h2>
          <div className="space-y-4">
            {c.process.map((p, i) => (
              <div key={i} className="flex gap-5 items-start rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-400 text-gray-900 font-bold text-lg flex items-center justify-center">
                  {p.step}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">{p.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 취급 가능 인형 유형 */}
      <section className="px-4 py-16 bg-white/2">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">{c.types_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.types.map((type, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-amber-400/30 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <h3 className="text-white font-semibold">{type.title}</h3>
                </div>
                <p className="text-white/50 text-sm pl-5">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 의뢰 폼 */}
      <section id="inquiry-form" className="px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{c.form_title}</h2>
            <p className="text-white/60">{c.form_sub}</p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">✓</div>
              <h3 className="text-white text-2xl font-bold mb-2">{c.form_success_title}</h3>
              <p className="text-white/70">{c.form_success_sub}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-5">
              {/* 의뢰 유형 */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">{c.form_type_label}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType("sample")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                      formType === "sample"
                        ? "bg-amber-400 text-gray-900"
                        : "border border-white/20 text-white/60 hover:border-white/40"
                    }`}
                  >
                    {c.form_type_sample}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("quote")}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                      formType === "quote"
                        ? "bg-amber-400 text-gray-900"
                        : "border border-white/20 text-white/60 hover:border-white/40"
                    }`}
                  >
                    {c.form_type_quote}
                  </button>
                </div>
              </div>

              {/* 이름 + 회사 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_name}</label>
                  <input
                    type="text"
                    required
                    placeholder={c.form_name_ph}
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_company}</label>
                  <input
                    type="text"
                    placeholder={c.form_company_ph}
                    value={formData.company}
                    onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                  />
                </div>
              </div>

              {/* 이메일 + 연락처 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_email}</label>
                  <input
                    type="email"
                    required
                    placeholder={c.form_email_ph}
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_phone}</label>
                  <input
                    type="text"
                    placeholder={c.form_phone_ph}
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                  />
                </div>
              </div>

              {/* 제품 설명 */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_product}</label>
                <textarea
                  required
                  rows={3}
                  placeholder={c.form_product_ph}
                  value={formData.product}
                  onChange={e => setFormData(p => ({ ...p, product: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm resize-none"
                />
              </div>

              {/* 수량 + 납기 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_qty}</label>
                  <input
                    type="text"
                    placeholder={c.form_qty_ph}
                    value={formData.qty}
                    onChange={e => setFormData(p => ({ ...p, qty: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_deadline}</label>
                  <input
                    type="text"
                    placeholder={c.form_deadline_ph}
                    value={formData.deadline}
                    onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                  />
                </div>
              </div>

              {/* 납품 목적지 */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_dest}</label>
                <input
                  type="text"
                  placeholder={c.form_dest_ph}
                  value={formData.dest}
                  onChange={e => setFormData(p => ({ ...p, dest: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                />
              </div>

              {/* 예산 */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">{c.form_budget}</label>
                <div className="flex flex-wrap gap-2">
                  {c.form_budget_opts.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, budget: opt }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        formData.budget === opt
                          ? "bg-amber-400 text-gray-900"
                          : "border border-white/20 text-white/60 hover:border-white/40"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 참고 URL */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-1.5">{c.form_ref}</label>
                <input
                  type="text"
                  placeholder={c.form_ref_ph}
                  value={formData.ref}
                  onChange={e => setFormData(p => ({ ...p, ref: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 text-sm"
                />
              </div>

              {/* 연락 수단 */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">{c.form_contact_pref}</label>
                <div className="flex gap-3">
                  {[
                    { key: "email", label: c.form_contact_email },
                    { key: "kakao", label: c.form_contact_kakao },
                    { key: "line", label: c.form_contact_line },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, contact_pref: key }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        formData.contact_pref === key
                          ? "bg-amber-400 text-gray-900"
                          : "border border-white/20 text-white/60 hover:border-white/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-amber-400 text-gray-900 font-bold text-lg hover:bg-amber-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? c.form_submitting : c.form_submit}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 bg-white/2">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-10">{c.faq_title}</h2>
          <div className="space-y-3">
            {c.faqs.map((faq, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                >
                  <span className="text-white font-semibold text-sm md:text-base">{faq.q}</span>
                  <svg
                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`flex-shrink-0 text-amber-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-white/60 text-sm leading-relaxed border-t border-white/10 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{c.cta_title}</h2>
          <p className="text-white/60 mb-8 text-lg">{c.cta_sub}</p>
          <a
            href="#inquiry-form"
            className="inline-flex items-center justify-center px-10 py-5 rounded-full bg-amber-400 text-gray-900 font-bold text-xl hover:bg-amber-300 transition-all shadow-xl shadow-amber-400/20"
          >
            {c.cta_btn}
          </a>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
