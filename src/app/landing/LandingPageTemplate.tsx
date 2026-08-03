'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ConsultationWizard from '@/components/consultation/ConsultationWizard';
import BookmarkInstallBar from '@/components/landing/BookmarkInstallBar';

/* ── 다국어 ── */
const T = {
  ko: {
    nav_home: '홈',
    nav_products: '제품',
    nav_process: '진행방법',
    nav_inspection: '검수',
    nav_faq: 'FAQ',
    nav_contact: '문의',
    lang: '中文',
    hero_cta: '무료 샘플 요청',
    hero_cta2: '제품 둘러보기',
    hero_badge: '중국 공장 직거래 플랫폼',
    products_title: '추천 제품',
    products_sub: '검증된 중국 공장의 최고 품질 제품을 직접 만나보세요',
    moq: 'MOQ',
    lead: '납기',
    days: '일',
    view_all: '전체 제품 보기',
    /* 진행 프로세스 */
    process_title: 'KERYX 이용 방법',
    process_sub: '복잡한 중국 소싱, KERYX와 함께라면 5단계로 간단하게',
    step1_title: '회원가입 & 상담 신청',
    step1_desc: '무료 회원가입 후 전담 MD에게 원하는 제품 카테고리와 예산을 알려주세요. 24시간 내 연락드립니다.',
    step2_title: '제품 소싱 & 공장 매칭',
    step2_desc: '전담 MD가 검증된 공장 파트너 중 최적의 공장을 선별하여 제품 라인업과 가격을 제안합니다.',
    step3_title: '샘플 수령 & 품질 확인',
    step3_desc: '7~14일 내 샘플을 수령하고 직접 품질을 확인하세요. 샘플 비용은 대량 주문 시 환급됩니다.',
    step4_title: '주문 확정 & 생산 진행',
    step4_desc: '샘플 승인 후 정식 주문을 확정합니다. 생산 진행 상황을 KERYX 플랫폼에서 실시간으로 확인할 수 있습니다.',
    step5_title: '검수 & 배송',
    step5_desc: '출고 전 전수 검수를 진행합니다. 검수 사진과 리포트를 제공하며, 이상이 없을 때만 배송이 시작됩니다.',
    /* 검수 안내 */
    inspection_title: '100% 전수 검수 시스템',
    inspection_sub: '바이어가 직접 보지 않아도 안심할 수 있는 이유',
    insp1_title: '출고 전 전수 검수',
    insp1_desc: '모든 제품은 공장 출고 전 KERYX 검수팀이 수량, 외관, 기능을 100% 전수 검사합니다.',
    insp2_title: '사진 증빙 제공',
    insp2_desc: '검수 현장 사진을 실시간으로 제공합니다. 제품 상태를 눈으로 직접 확인하세요.',
    insp3_title: '검수 리포트 발행',
    insp3_desc: '검수 결과를 상세 리포트로 발행합니다. 불량률, 수량 확인, 포장 상태가 모두 기록됩니다.',
    insp4_title: '불량 발생 시 신속 조치',
    insp4_desc: '검수 중 불량이 발견될 경우 공장 추가제작 또는 쇼티지 처리 등 신속하게 조치합니다. 전담 MD가 직접 조율합니다.',
    insp5_title: '포장 & 라벨링 확인',
    insp5_desc: '바이어 요청 사항에 맞는 포장 방식과 라벨이 적용되었는지 최종 확인합니다.',
    insp6_title: '선적 서류 일괄 제공',
    insp6_desc: 'PI, CI, PL 등 모든 선적 서류를 KERYX 플랫폼에서 한 번에 다운로드할 수 있습니다.',
    /* 신뢰 지표 */
    stats_factories: '검증된 공장',
    stats_products: '등록 제품',
    stats_buyers: '활성 바이어',
    stats_countries: '수출 국가',
    stats_satisfaction: '바이어 만족도',
    stats_inspection: '검수 통과율',
    /* FAQ */
    faq_title: '자주 묻는 질문',
    faq_sub: '바이어들이 가장 많이 궁금해하는 내용을 모았습니다',
    faq_q1: '최소 주문 수량(MOQ)은 얼마인가요?',
    faq_a1: '제품마다 다르지만 일반적으로 200~500개입니다. 샘플은 1~5개부터 가능하며, 대량 주문 시 MOQ 협의가 가능합니다. 전담 MD에게 문의하시면 최적의 조건을 안내해 드립니다.',
    faq_q2: '샘플 비용은 얼마인가요?',
    faq_a2: '샘플 비용은 제품 단가와 배송비로 구성됩니다. 정식 주문(대량 발주) 시 샘플 비용은 전액 환급됩니다. 샘플 수령까지는 보통 7~14일이 소요됩니다.',
    faq_q3: '중국 공장을 믿을 수 있나요? 품질 문제가 생기면 어떻게 되나요?',
    faq_a3: 'KERYX에 등록된 모든 공장은 현장 실사와 품질 심사를 통과한 검증된 파트너입니다. 출고 전 100% 전수 검수를 진행하며, 불량 발생 시 전담 MD가 공장과 협의하여 신속하게 해결합니다.',
    faq_q4: '납기는 얼마나 걸리나요?',
    faq_a4: '일반적으로 샘플 7~14일, 대량 생산 15~30일, 한국 도착까지 해상 운송 10~15일이 소요됩니다. 긴급 주문의 경우 항공 운송도 가능합니다. 정확한 납기는 제품과 수량에 따라 달라집니다.',
    faq_q5: '결제는 어떻게 하나요? 안전한가요?',
    faq_a5: 'KERYX 플랫폼을 통해 안전하게 결제가 이루어집니다. 일반적으로 주문 확정 시 30% 선금, 출고 전 70% 잔금 방식으로 진행됩니다. 모든 거래는 KERYX가 보증합니다.',
    faq_q6: '한국어로 소통이 가능한가요?',
    faq_a6: '네, 전담 MD가 한국어로 모든 소통을 지원합니다. 중국 공장과의 언어 장벽 없이 편리하게 거래하실 수 있습니다. 계약서, 검수 리포트, 선적 서류도 모두 한국어로 제공됩니다.',
    faq_q7: '내 브랜드(OEM/ODM)로 제작이 가능한가요?',
    faq_a7: '네, OEM(기존 제품에 브랜드 적용)과 ODM(디자인부터 개발) 모두 가능합니다. 패키지 디자인, 라벨링, 전용 색상 등 바이어 요구에 맞게 커스터마이징할 수 있습니다.',
    faq_q8: 'KERYX 멤버십은 어떻게 되나요?',
    faq_a8: 'KERYX는 무료 체험부터 프리미엄 멤버십까지 다양한 플랜을 제공합니다. 멤버십 등급에 따라 전담 MD 지원, 검수 서비스, 물류 대행 등의 혜택이 달라집니다. 자세한 내용은 멤버십 페이지를 확인해 주세요.',
    /* 회사 소개 */
    about_title: '왜 KERYX인가?',
    about_sub: '중국 최고의 공장과 직접 연결하는 B2B 플랫폼',
    feature1_title: '공장 직거래',
    feature1_desc: '중간 유통 없이 공장과 직접 거래. 최저 가격 보장.',
    feature2_title: '품질 보증',
    feature2_desc: '모든 공장은 KERYX 품질 심사를 통과한 검증된 파트너.',
    feature3_title: '전담 MD 지원',
    feature3_desc: '전담 MD가 소싱부터 배송까지 전 과정을 지원합니다.',
    feature4_title: '빠른 샘플',
    feature4_desc: '7~14일 내 샘플 수령. 빠른 의사결정 지원.',
    /* 문의 폼 */
    inquiry_title: '무료 상담 & 샘플 요청',
    inquiry_sub: '지금 문의하시면 전담 MD가 24시간 내 연락드립니다. 첫 상담은 무료입니다.',
    form_name: '이름 *',
    form_email: '이메일 *',
    form_phone: '연락처',
    form_company: '회사명',
    form_type: '문의 유형',
    form_type_general: '일반 문의',
    form_type_sample: '샘플 요청',
    form_type_quote: '견적 요청',
    form_message: '문의 내용 *',
    form_product: '관심 제품 (선택)',
    form_qty: '희망 수량',
    form_price: '목표 가격 (CNY)',
    form_submit: '무료 상담 신청하기',
    form_submitting: '전송 중...',
    form_success: '문의가 접수되었습니다! 전담 MD가 24시간 내 연락드립니다.',
    form_error: '전송 중 오류가 발생했습니다. 다시 시도해주세요.',
    required_error: '이름, 이메일, 문의 내용은 필수입니다.',
    footer_biz: '사업자등록번호: 609-81-63010',
    footer_ceo: '대표: 조은진',
    footer_email: 'support@keryx.kr',
    footer_rights: '© 2026 KERYX. All rights reserved.',
  },
  zh: {
    nav_home: '首页',
    nav_products: '产品',
    nav_process: '流程',
    nav_inspection: '检验',
    nav_faq: '常见问题',
    nav_contact: '联系我们',
    lang: '한국어',
    hero_cta: '免费申请样品',
    hero_cta2: '浏览产品',
    hero_badge: '中国工厂直销平台',
    products_title: '推荐产品',
    products_sub: '来自经过认证的中国工厂的优质产品',
    moq: '最小订购量',
    lead: '交货期',
    days: '天',
    view_all: '查看全部产品',
    process_title: 'KERYX使用方法',
    process_sub: '复杂的中国采购，与KERYX合作只需5步',
    step1_title: '注册会员 & 申请咨询',
    step1_desc: '免费注册后，告知专属MD您想要的产品类别和预算，我们将在24小时内联系您。',
    step2_title: '产品采购 & 工厂匹配',
    step2_desc: '专属MD从经过认证的工厂合作伙伴中筛选最优工厂，提供产品方案和价格。',
    step3_title: '收取样品 & 确认品质',
    step3_desc: '7-14天内收到样品，亲自确认品质。大量订购时，样品费用将全额退还。',
    step4_title: '确认订单 & 开始生产',
    step4_desc: '样品确认后，正式确认订单。可在KERYX平台实时查看生产进度。',
    step5_title: '检验 & 发货',
    step5_desc: '出货前进行全数检验。提供检验照片和报告，确认无误后才开始发货。',
    inspection_title: '100%全数检验系统',
    inspection_sub: '即使买家不亲自到场也能放心的原因',
    insp1_title: '出货前全数检验',
    insp1_desc: '所有产品在工厂出货前，KERYX检验团队对数量、外观、功能进行100%全数检查。',
    insp2_title: '提供照片证明',
    insp2_desc: '实时提供检验现场照片。亲眼确认产品状态。',
    insp3_title: '发布检验报告',
    insp3_desc: '以详细报告形式发布检验结果。不良率、数量确认、包装状态全部记录在案。',
    insp4_title: '发现不良品迅速处理',
    insp4_desc: '检验中发现不良品时，工厂追加生产或短缺处理等迅速采取措施。专属 MD 直接调度处理。',
    insp5_title: '包装 & 标签确认',
    insp5_desc: '最终确认是否按照买家要求的包装方式和标签进行了处理。',
    insp6_title: '统一提供装运文件',
    insp6_desc: 'PI、CI、PL等所有装运文件可在KERYX平台一次性下载。',
    stats_factories: '认证工厂',
    stats_products: '注册产品',
    stats_buyers: '活跃买家',
    stats_countries: '出口国家',
    stats_satisfaction: '买家满意度',
    stats_inspection: '检验通过率',
    faq_title: '常见问题',
    faq_sub: '收集了买家最常问的问题',
    faq_q1: '最小订购量(MOQ)是多少？',
    faq_a1: '根据产品不同，一般为200~500个。样品从1~5个开始，大量订购时可协商MOQ。请咨询专属MD，我们将为您提供最优条件。',
    faq_q2: '样品费用是多少？',
    faq_a2: '样品费用由产品单价和运费组成。正式订单（大量发货）时，样品费用全额退还。收到样品通常需要7-14天。',
    faq_q3: '中国工厂可信吗？出现质量问题怎么办？',
    faq_a3: 'KERYX注册的所有工厂都是通过现场实地考察和质量审查的认证合作伙伴。出货前进行100%全数检验，发现不良品时由专属MD与工厂协商迅速解决。',
    faq_q4: '交货期需要多长时间？',
    faq_a4: '一般样品7-14天，大量生产15-30天，到达韩国的海运需要10-15天。紧急订单也可以选择空运。具体交货期根据产品和数量而有所不同。',
    faq_q5: '如何付款？安全吗？',
    faq_a5: '通过KERYX平台安全付款。一般采用确认订单时支付30%定金，出货前支付70%尾款的方式。所有交易均由KERYX保证。',
    faq_q6: '可以用韩语沟通吗？',
    faq_a6: '是的，专属MD支持全程韩语沟通。无需语言障碍即可与中国工厂方便交易。合同、检验报告、装运文件也全部提供韩语版本。',
    faq_q7: '可以用我的品牌(OEM/ODM)制作吗？',
    faq_a7: '是的，OEM（在现有产品上应用品牌）和ODM（从设计开始开发）均可。可根据买家要求对包装设计、标签、专用颜色等进行定制。',
    faq_q8: 'KERYX会员制度是怎样的？',
    faq_a8: 'KERYX提供从免费体验到高级会员的多种方案。根据会员等级，专属MD支持、检验服务、物流代理等福利有所不同。详情请查看会员页面。',
    about_title: '为什么选择KERYX？',
    about_sub: '直接连接中国顶级工厂的B2B平台',
    feature1_title: '工厂直销',
    feature1_desc: '无中间商，直接与工厂交易，保证最低价格。',
    feature2_title: '品质保证',
    feature2_desc: '所有工厂均通过KERYX品质审查，是经过认证的合作伙伴。',
    feature3_title: '专属MD支持',
    feature3_desc: '专属MD从采购到交付全程支持。',
    feature4_title: '快速样品',
    feature4_desc: '7-14天内收到样品，支持快速决策。',
    inquiry_title: '免费咨询 & 样品申请',
    inquiry_sub: '现在咨询，专属MD将在24小时内联系您。首次咨询免费。',
    form_name: '姓名 *',
    form_email: '邮箱 *',
    form_phone: '联系方式',
    form_company: '公司名称',
    form_type: '咨询类型',
    form_type_general: '一般咨询',
    form_type_sample: '样品申请',
    form_type_quote: '报价申请',
    form_message: '咨询内容 *',
    form_product: '感兴趣的产品（可选）',
    form_qty: '期望数量',
    form_price: '目标价格（CNY）',
    form_submit: '申请免费咨询',
    form_submitting: '发送中...',
    form_success: '咨询已提交！专属MD将在24小时内联系您。',
    form_error: '发送时出现错误，请重试。',
    required_error: '姓名、邮箱、咨询内容为必填项。',
    footer_biz: '营业执照号: 609-81-63010',
    footer_ceo: '代表: 조은진',
    footer_email: 'support@keryx.kr',
    footer_rights: '© 2026 KERYX. All rights reserved.',
  },
};

interface LandingPageTemplateProps {
  slug: string;
  defaultBannerTitle?: string;
  defaultBannerSubtitle?: string;
  defaultBannerTitleZh?: string;
  defaultBannerSubtitleZh?: string;
  accentColor?: string;
  heroEmoji?: string;
  categoryLabel?: string;
  categoryLabelZh?: string;
}

export default function LandingPageTemplate({
  slug,
  defaultBannerTitle = 'KERYX 공장 직거래',
  defaultBannerSubtitle = '최고 품질 · 최저 가격 · 직접 연결',
  defaultBannerTitleZh = 'KERYX 工厂直销',
  defaultBannerSubtitleZh = '最高品质 · 最低价格 · 直接对接',
  accentColor = '#667eea',
  heroEmoji = '🏭',
  categoryLabel = '제품',
  categoryLabelZh = '产品',
}: LandingPageTemplateProps) {
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const [landing, setLanding] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '',
    inquiry_type: 'general', message: '',
    sample_qty: 1, target_price: '',
  });
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);
  // 팝업에서 샘플 신청 버튼 클릭 시 ConsultationWizard에 전달할 초기값
  const [wizardInitialProductId, setWizardInitialProductId] = useState<string | undefined>(undefined);
  const [wizardInitialWantSample, setWizardInitialWantSample] = useState<boolean>(false);

  const t = T[lang];

  useEffect(() => {
    const saved = localStorage.getItem('keryx_lang') as 'ko' | 'zh' | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    fetch(`/api/public/landing/${slug}`)
      .then(r => r.json())
      .then(d => {
        setLanding(d.landing);
        setProducts(d.products || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const toggleLang = () => {
    const next = lang === 'ko' ? 'zh' : 'ko';
    setLang(next);
    localStorage.setItem('keryx_lang', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      alert(t.required_error);
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch('/api/public/landing/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_slug: slug,
          inquiry_type: formData.inquiry_type,
          requester_name: formData.name,
          requester_email: formData.email,
          requester_phone: formData.phone || null,
          requester_company: formData.company || null,
          message: formData.message,
          product_id: selectedProduct?.id ?? null,
          product_name_snapshot: selectedProduct ? (lang === 'ko' ? selectedProduct.name_ko : selectedProduct.name_zh) : null,
          product_image_snapshot: selectedProduct?.image_url ?? null,
          sample_quantity: formData.sample_qty,
          target_price_cny: formData.target_price ? parseFloat(formData.target_price) : null,
          source_url: window.location.href,
        }),
      });
      if (resp.ok) {
        setSubmitResult('success');
        setFormData({ name: '', email: '', phone: '', company: '', inquiry_type: 'general', message: '', sample_qty: 1, target_price: '' });
        setSelectedProduct(null);
      } else {
        setSubmitResult('error');
      }
    } catch {
      setSubmitResult('error');
    } finally {
      setSubmitting(false);
    }
  };

  const bannerTitle = lang === 'ko'
    ? (landing?.banner_title_ko || defaultBannerTitle)
    : (landing?.banner_title_zh || defaultBannerTitleZh);
  const bannerSubtitle = lang === 'ko'
    ? (landing?.banner_subtitle_ko || defaultBannerSubtitle)
    : (landing?.banner_subtitle_zh || defaultBannerSubtitleZh);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
  };

  const navItems = [
    { id: 'home', label: t.nav_home },
    { id: 'products', label: lang === 'ko' ? categoryLabel : categoryLabelZh },
    { id: 'process', label: t.nav_process },
    { id: 'inspection', label: t.nav_inspection },
    { id: 'faq', label: t.nav_faq },
    { id: 'contact', label: t.nav_contact },
  ];

  const faqItems = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
    { q: t.faq_q5, a: t.faq_a5 },
    { q: t.faq_q6, a: t.faq_a6 },
    { q: t.faq_q7, a: t.faq_a7 },
    { q: t.faq_q8, a: t.faq_a8 },
  ];

  const processSteps = [
    { num: '01', title: t.step1_title, desc: t.step1_desc, icon: '📋' },
    { num: '02', title: t.step2_title, desc: t.step2_desc, icon: '🔍' },
    { num: '03', title: t.step3_title, desc: t.step3_desc, icon: '📦' },
    { num: '04', title: t.step4_title, desc: t.step4_desc, icon: '🏭' },
    { num: '05', title: t.step5_title, desc: t.step5_desc, icon: '✅' },
  ];

  const inspectionItems = [
    { icon: '🔎', title: t.insp1_title, desc: t.insp1_desc },
    { icon: '📸', title: t.insp2_title, desc: t.insp2_desc },
    { icon: '📄', title: t.insp3_title, desc: t.insp3_desc },
    { icon: '🛡️', title: t.insp4_title, desc: t.insp4_desc },
    { icon: '📦', title: t.insp5_title, desc: t.insp5_desc },
    { icon: '📋', title: t.insp6_title, desc: t.insp6_desc },
  ];

  // 현재 페이지 URL (클라이언트에서만)
  const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://keryx.kr/landing/${slug}`;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif' }}>
      {/* ── 즐겨찾기/바탕화면 바로가기 바 ── */}
      {landing && (
        <BookmarkInstallBar
          pageTitle={landing.title_ko || landing.banner_title_ko || defaultBannerTitle}
          pageTitleZh={landing.title_zh || landing.banner_title_zh || defaultBannerTitleZh}
          pageUrl={pageUrl}
          lang={lang}
        />
      )}
      {/* ── 헤더 ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, height: 64 }}>
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Image src="/logos/logo-horizontal.png" alt="KERYX" width={120} height={34} style={{ objectFit: 'contain' }} priority />
          </Link>
          <nav style={{ display: 'flex', gap: 2, marginLeft: 16, overflowX: 'auto' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  background: activeSection === item.id ? `${accentColor}18` : 'transparent',
                  color: activeSection === item.id ? accentColor : '#4b5563',
                  transition: 'all 0.15s',
                }}
              >{item.label}</button>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          <button onClick={toggleLang} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151', flexShrink: 0 }}>{t.lang}</button>
          <Link href="/shop" style={{ padding: '8px 16px', borderRadius: 10, background: `linear-gradient(135deg, ${accentColor}, #764ba2)`, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {lang === 'ko' ? '쇼핑몰' : '商城'}
          </Link>
        </div>
      </header>

      {/* ── 히어로 배너 ── */}
      <section id="home" style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`, color: '#fff', padding: '96px 20px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 24, fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {t.hero_badge}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.02em' }}>{bannerTitle}</h1>
          <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', opacity: 0.9, marginBottom: 40, lineHeight: 1.7 }}>{bannerSubtitle}</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollTo('contact')}
              style={{ padding: '16px 36px', background: '#fff', color: accentColor, border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >{t.hero_cta}</button>
            <button
              onClick={() => scrollTo('products')}
              style={{ padding: '16px 36px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >{t.hero_cta2}</button>
          </div>
          {/* 통계 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, marginTop: 60, maxWidth: 700, margin: '60px auto 0' }}>
            {[
              { value: '200+', label: t.stats_factories },
              { value: '5,000+', label: t.stats_products },
              { value: '98%', label: t.stats_satisfaction },
              { value: '99.2%', label: t.stats_inspection },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '20px 12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{stat.value}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 제품 섹션 ── */}
      <section id="products" style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#111827', marginBottom: 12 }}>{t.products_title}</h2>
          <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 500, margin: '0 auto' }}>{t.products_sub}</p>
        </div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 300, borderRadius: 16, background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p>{lang === 'ko' ? '현재 등록된 제품이 없습니다' : '暂无产品'}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {products.map(product => {
                const imgUrl = product.image_urls?.[0] || product.image_url;
                const price = product.sell_price_cny || product.price_cny;
                const name = lang === 'ko' ? (product.name_ko || product.name_zh) : (product.name_zh || product.name_ko);
                return (
                  <div
                    key={product.id}
                    style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div style={{ height: 200, background: imgUrl ? `url(${imgUrl}) center/cover` : `linear-gradient(135deg, ${accentColor}20, ${accentColor}40)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {!imgUrl && <span style={{ fontSize: 48 }}>📦</span>}
                      {product.is_in_stock === false && (
                        <div style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                          {lang === 'ko' ? '재고 없음' : '无库存'}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{name}</div>
                      {price && <div style={{ fontSize: 20, fontWeight: 900, color: accentColor, marginBottom: 4 }}>¥{price}</div>}
                      {product.sample_cost_cny && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                          <span>🧪</span>
                          <span>{lang === 'ko' ? `샘플 ¥${product.sample_cost_cny}` : `样品 ¥${product.sample_cost_cny}`}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280', marginTop: product.sample_cost_cny ? 0 : 8 }}>
                        <span>{t.moq}: {product.moq || 200}</span>
                        <span>{t.lead}: {product.lead_time_days || 15}{t.days}</span>
                      </div>
                      {product.factory && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                          🏭 {lang === 'ko' ? (product.factory.company_name_ko || product.factory.company_name) : product.factory.company_name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link href="/shop" style={{ display: 'inline-block', padding: '14px 40px', background: `linear-gradient(135deg, ${accentColor}, #764ba2)`, color: '#fff', textDecoration: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>
                {t.view_all} →
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ── 진행 프로세스 ── */}
      <section id="process" style={{ background: `linear-gradient(135deg, ${accentColor}08, #764ba208)`, padding: '80px 20px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: `${accentColor}18`, color: accentColor, padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              {lang === 'ko' ? 'STEP BY STEP' : '步骤说明'}
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#111827', marginBottom: 12 }}>{t.process_title}</h2>
            <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 500, margin: '0 auto' }}>{t.process_sub}</p>
          </div>
          <div style={{ position: 'relative' }}>
            {/* 연결선 */}
            <div style={{ position: 'absolute', top: 36, left: '10%', right: '10%', height: 2, background: `linear-gradient(90deg, ${accentColor}40, #764ba240)`, zIndex: 0, display: 'none' }} className="process-line" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
              {processSteps.map((step, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${accentColor}, #764ba2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 4px 16px ${accentColor}40` }}>
                    <span style={{ fontSize: 24 }}>{step.icon}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, letterSpacing: '0.1em', marginBottom: 8 }}>STEP {step.num}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 10, lineHeight: 1.4 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>{step.desc}</p>
                  {i < processSteps.length - 1 && (
                    <div style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: accentColor, zIndex: 2 }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 검수 안내 ── */}
      <section id="inspection" style={{ background: '#111827', padding: '80px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16, border: '1px solid rgba(255,255,255,0.2)' }}>
              {lang === 'ko' ? '품질 보증' : '质量保证'}
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginBottom: 12 }}>{t.inspection_title}</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: '0 auto' }}>{t.inspection_sub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {inspectionItems.map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${accentColor}60, #764ba260)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{item.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* 검수 보증 배너 */}
          <div style={{ marginTop: 48, background: `linear-gradient(135deg, ${accentColor}30, #764ba230)`, borderRadius: 20, padding: '32px 40px', border: `1px solid ${accentColor}40`, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 48 }}>🛡️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>
                {lang === 'ko' ? 'KERYX 품질 보증 약속' : 'KERYX品质保证承诺'}
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                {lang === 'ko'
                  ? '검수 통과 후 불량이 발견될 경우, KERYX가 전액 책임집니다. 바이어 손해 없이 재생산 또는 환불로 해결합니다.'
                  : '检验通过后发现不良品时，KERYX承担全部责任。通过重新生产或退款解决，买家无需承担任何损失。'}
              </p>
            </div>
            <button
              onClick={() => scrollTo('contact')}
              style={{ padding: '14px 28px', background: '#fff', color: accentColor, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
            >
              {lang === 'ko' ? '자세히 알아보기' : '了解更多'}
            </button>
          </div>
        </div>
      </section>

      {/* ── 왜 KERYX인가 ── */}
      <section id="about" style={{ background: '#fff', padding: '80px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#111827', marginBottom: 12 }}>{t.about_title}</h2>
            <p style={{ fontSize: 16, color: '#6b7280' }}>{t.about_sub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              { icon: '🔗', title: t.feature1_title, desc: t.feature1_desc, color: accentColor, bg: `${accentColor}12` },
              { icon: '✅', title: t.feature2_title, desc: t.feature2_desc, color: '#10b981', bg: '#10b98112' },
              { icon: '👤', title: t.feature3_title, desc: t.feature3_desc, color: '#f59e0b', bg: '#f59e0b12' },
              { icon: '⚡', title: t.feature4_title, desc: t.feature4_desc, color: '#8b5cf6', bg: '#8b5cf612' },
            ].map((feature, i) => (
              <div key={i} style={{ background: feature.bg, borderRadius: 20, padding: '28px 24px', border: `1px solid ${feature.color}20` }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: feature.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{feature.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 10 }}>{feature.title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: '#f8f9fa', padding: '80px 20px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: `${accentColor}18`, color: accentColor, padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>FAQ</div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#111827', marginBottom: 12 }}>{t.faq_title}</h2>
            <p style={{ fontSize: 16, color: '#6b7280' }}>{t.faq_sub}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqItems.map((item, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${openFaq === i ? accentColor + '40' : '#e5e7eb'}`, overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: openFaq === i ? `0 4px 20px ${accentColor}15` : '0 1px 4px rgba(0,0,0,0.04)' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: openFaq === i ? `linear-gradient(135deg, ${accentColor}, #764ba2)` : '#f3f4f6', color: openFaq === i ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>Q</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.5 }}>{item.q}</span>
                  </div>
                  <span style={{ fontSize: 20, color: accentColor, flexShrink: 0, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px 64px', fontSize: 14, color: '#4b5563', lineHeight: 1.8, borderTop: `1px solid ${accentColor}20` }}>
                    <div style={{ paddingTop: 16 }}>{item.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 16 }}>
              {lang === 'ko' ? '더 궁금한 점이 있으신가요?' : '还有其他问题吗？'}
            </p>
            <button
              onClick={() => scrollTo('contact')}
              style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${accentColor}, #764ba2)`, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              {lang === 'ko' ? '직접 문의하기' : '直接咨询'}
            </button>
          </div>
        </div>
      </section>

      {/* ── 무료 상담 위자드 ── */}
      <section id="contact" style={{ padding: '80px 20px', background: `linear-gradient(135deg, ${accentColor}06, #764ba206)`, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: `${accentColor}18`, color: accentColor, padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              {lang === 'ko' ? '24시간 내 답변 보장 · 첫 상담 무료' : '24小时内保证回复 · 首次咨询免费'}
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#111827', marginBottom: 12 }}>
              {lang === 'ko' ? '무료 상담 & 샘플 요청' : '免费咨询 & 样品申请'}
            </h2>
            <p style={{ fontSize: 16, color: '#6b7280' }}>
              {lang === 'ko' ? '단계별 안내에 따라 요청사항을 입력하시면 전담 MD가 맞춤 답변을 드립니다.' : '按照步骤输入需求，专属MD将为您提供定制化答复。'}
            </p>
          </div>
          <ConsultationWizard
            lang={lang}
            accentColor={accentColor}
            products={products}
            landingSlug={slug}
            initialProductId={wizardInitialProductId}
            initialWantSample={wizardInitialWantSample}
          />
        </div>
      </section>

      {/* ── 제품 상세 모달 ── */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedProduct(null)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1.3, flex: 1, paddingRight: 12 }}>
                {lang === 'ko' ? (selectedProduct.name_ko || selectedProduct.name_zh) : (selectedProduct.name_zh || selectedProduct.name_ko)}
              </h3>
              <button onClick={() => setSelectedProduct(null)} style={{ background: '#f3f4f6', border: 'none', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            </div>
            {(selectedProduct.image_urls?.[0] || selectedProduct.image_url) && (
              <img src={selectedProduct.image_urls?.[0] || selectedProduct.image_url} alt="" style={{ width: '100%', borderRadius: 16, marginBottom: 20, objectFit: 'cover', height: 220 }} />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: lang === 'ko' ? '가격' : '价格', value: `¥${selectedProduct.sell_price_cny || selectedProduct.price_cny || '–'}` },
                { label: t.moq, value: `${selectedProduct.moq || 200}${lang === 'ko' ? '개' : '件'}` },
                { label: t.lead, value: `${selectedProduct.lead_time_days || 15}${t.days}` },
                { label: lang === 'ko' ? '카테고리' : '分类', value: selectedProduct.category || '–' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href={`/products/${selectedProduct.id}`} style={{ flex: 1, textAlign: 'center', padding: '13px', background: '#f3f4f6', color: '#374151', textDecoration: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
                {lang === 'ko' ? '상세 보기' : '查看详情'}
              </Link>
              <button
                onClick={() => {
                  // 선택된 상품 ID와 샘플 신청 의도를 ConsultationWizard에 전달
                  setWizardInitialProductId(selectedProduct.id);
                  setWizardInitialWantSample(true);
                  setSelectedProduct(null); // 팝업 닫기
                  scrollTo('contact');
                }}
                style={{ flex: 1, padding: '13px', background: `linear-gradient(135deg, ${accentColor}, #764ba2)`, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {t.hero_cta}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 푸터 ── */}
      <footer style={{ background: '#0f172a', color: 'rgba(255,255,255,0.6)', padding: '48px 20px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div style={{ maxWidth: 280 }}>
            <Image src="/logos/logo-horizontal.png" alt="KERYX" width={100} height={32} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: 16 }} />
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.5)' }}>
              {lang === 'ko' ? '중국 공장과 한국 바이어를 직접 연결하는 B2B 무역 플랫폼' : '直接连接中国工厂与韩国买家的B2B贸易平台'}
            </p>
            <div style={{ fontSize: 13, lineHeight: 2, marginTop: 12 }}>
              <div>{t.footer_biz}</div>
              <div>{t.footer_ceo}</div>
              <div>{t.footer_email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{lang === 'ko' ? '서비스' : '服务'}</div>
              {[
                { href: '/shop', label: lang === 'ko' ? '쇼핑몰' : '商城' },
                { href: '/pricing', label: lang === 'ko' ? '멤버십' : '会员' },
                { href: '/landing/storage', label: lang === 'ko' ? '수납용품' : '收纳用品' },
                { href: '/landing/travel', label: lang === 'ko' ? '여행·캠핑' : '旅行露营' },
              ].map(link => (
                <Link key={link.href} href={link.href} style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8, transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                >{link.label}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{lang === 'ko' ? '법적 고지' : '法律声明'}</div>
              {[
                { href: '/terms', label: lang === 'ko' ? '이용약관' : '使用条款' },
                { href: '/privacy', label: lang === 'ko' ? '개인정보처리방침' : '隐私政策' },
              ].map(link => (
                <Link key={link.href} href={link.href} style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8 }}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '32px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>{t.footer_rights}</span>
          <span>{lang === 'ko' ? '한국 · 중국 B2B 무역 전문' : '韩中B2B贸易专家'}</span>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (max-width: 640px) {
          nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
