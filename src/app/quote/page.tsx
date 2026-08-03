'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { createClient } from '@/lib/supabase/client';

// ─── 다국어 텍스트 ───────────────────────────────────────────────────────────
const T = {
  ko: {
    lang_label: '中文',
    back: '← 쇼핑몰로',
    hero_badge: '중국 공장 직접 매칭 B2B 플랫폼',
    hero_title: '정확한 견적 요청',
    hero_sub: '제품 사양과 수량을 알려주시면 영업일 2일 이내에 비교 견적서를 보내드립니다.',
    step_labels: ['제품 정보', '수량 · 사양', '서비스 선택', '연락처 입력'],
    // Step 1
    s1_title: '어떤 제품을 찾고 계신가요?',
    s1_sub: '제품 카테고리와 기본 정보를 알려주세요',
    category_label: '제품 카테고리 *',
    categories: ['인형 · 피규어', '굿즈 · 뽑기 상품', '가방고리 · 키링', '보냉백 · 가방', '패키지 · 박스', '기타'],
    product_name_label: '제품명 또는 설명 *',
    product_name_ph: '예: 10cm 미니 캐릭터 인형, 아크릴 키링 등',
    product_desc_label: '상세 설명 (선택)',
    product_desc_ph: '소재, 색상, 특이사항 등을 자유롭게 적어주세요',
    ref_url_label: '참고 이미지 업로드 (선택)',
    ref_url_ph: '이미지 파일을 선택하세요 (JPG, PNG, GIF, 최대 5MB)',
    // 신규 Step 0 항목
    desired_qty_label: '희망 수량 (선택)',
    desired_qty_ph: '예: 500개, 1,000세트 등',
    desired_deadline_label: '희망 납기 (선택)',
    desired_deadline_ph: '예: 2025년 9월, 약 60일 이내 등',
    sales_country_label: '판매 국가 (선택)',
    sales_countries: ['한국', '일본', '미국', '유럽', '동남아', '기타'],
    cert_label: '인증 필요 여부 (선택)',
    certs: ['없음', 'KC (한국)', 'CE (유럽)', 'FDA (미국)', 'PSE (일본)', '기타'],
    budget_label: '예산 범위 (선택)',
    budgets: ['미정', '100만원 미만', '100~500만원', '500만원~1천만원', '1천만원 이상'],
    has_sample_label: '기존 샘플 보유 여부',
    has_sample_yes: '있음 (샘플 보유)',
    has_sample_no: '없음',
    contact_method_label: '선호 연락 수단 (선택)',
    contact_methods: ['이메일', '카카오톡'],
    // Step 2
    s2_title: '수량과 사양을 알려주세요',
    s2_sub: '정확한 수량과 사양이 있을수록 정확한 견적이 가능합니다',
    qty_label: '희망 수량 *',
    qty_ph: '예: 500',
    unit_label: '단위',
    units: ['pcs (개)', 'set (세트)', 'kg', 'box'],
    size_label: '사이즈 / 규격 (선택)',
    size_ph: '예: 10cm × 8cm × 5cm',
    material_label: '소재 (선택)',
    material_ph: '예: PP, ABS, 면 100%, 부직포 등',
    color_label: '색상 수',
    custom_pkg_label: '커스텀 패키지 필요',
    ip_design_label: 'IP 디자인 개발 필요',
    target_price_label: '희망 단가 (선택)',
    target_price_ph: '예: 개당 500~1,000원, $0.5 이하 등',
    deadline_label: '희망 납기 (선택)',
    deadline_ph: '예: 2025년 8월, 약 60일 이내 등',
    business_purpose_label: '이 제품으로 계획하신 사업을 설명해 주세요 (선택)',
    business_purpose_ph: '예: 판촉물 1회성 구매 / 한국 내 장기 판매 / 일본 수출 대리점 운영 등',
    print_pkg_label: '인쇄 · 패키지 제작이 필요하신가요?',
    print_pkg_options: ['필요 없음', '단순 인쇄 (로고·텍스트)', '커스텀 패키지 박스', '풀 패키지 디자인 개발'],
    factory_region_label: '희망 공장 지역이 있으신가요? (선택)',
    factory_region_ph: '예: 이우(義烏), 광저우(广州), 지역 무관 등',
    // Step 3
    s3_title: '필요한 서비스를 선택하세요',
    s3_sub: '복수 선택 가능합니다. 선택하신 서비스를 포함하여 견적을 드립니다.',
    services: [
      { id: 'market_research', icon: '→', title: '시장조사', desc: '중국 시장 트렌드 및 유사 제품 조사' },
      { id: 'sample_dev', icon: '→', title: '샘플 개발', desc: '공장 샘플 제작 및 한국 배송' },
      { id: 'factory_match', icon: '→', title: '공장 매칭', desc: '최적 공장 발굴 및 매칭 보고서' },
      { id: 'inspection', icon: '→', title: '100% 전수 검수', desc: '출고 전 전수 검수 + 사진 보고서' },
      { id: 'logistics', icon: '→', title: '물류 대행', desc: 'LCL/FCL 해운 및 한국 통관 대행' },
      { id: 'ip_design', icon: '→', title: 'IP 디자인 개발', desc: '캐릭터·패키지 디자인 개발' },
    ],
    delivery_label: '납품 국가',
    deliveries: ['한국 (Korea)', '일본 (Japan)', '미국 (USA)', '기타 (Other)'],
    memo_label: '추가 요청사항 (선택)',
    memo_ph: '기타 요청사항, 주의사항 등을 자유롭게 적어주세요',
    // Step 4
    s4_title: '연락처를 입력해주세요',
    s4_sub: '견적서를 이메일로 보내드립니다. 영업일 2일 이내에 연락드립니다.',
    name_label: '담당자 이름 *',
    name_ph: '홍길동',
    email_label: '이메일 *',
    email_ph: 'example@company.com',
    phone_label: '연락처 (선택)',
    phone_ph: '010-0000-0000',
    company_label: '회사명 (선택)',
    company_ph: '(주)가자트레이드',
    // 버튼
    next: '다음 단계',
    prev: '이전',
    submit: '견적 요청 제출',
    submitting: '제출 중...',
    // 완료
    done_title: '견적 요청이 접수되었습니다!',
    done_sub: '영업일 2일 이내에 이메일로 비교 견적서를 보내드립니다.',
    done_check: [
      '✓ 최소 3개 공장 비교 견적',
      '✓ 공장 검증 체크리스트 포함',
      '✓ LCL/FCL 물류비 별도 산정',
      '✓ 숨겨진 추가 비용 없음',
    ],
    done_back: '홈으로 돌아가기',
    done_more: '서비스 더 알아보기',
    required_msg: '필수 항목을 입력해주세요.',
    error_msg: '제출 중 오류가 발생했습니다. 다시 시도해주세요.',
  },
  zh: {
    lang_label: '한국어',
    back: '← 返回商城',
    hero_badge: '中国工厂直接匹配B2B平台',
    hero_title: '精准报价申请',
    hero_sub: '告知我们产品规格和数量，我们将在2个工作日内发送比较报价单。',
    step_labels: ['产品信息', '数量·规格', '服务选择', '联系方式'],
    s1_title: '您在寻找什么产品？',
    s1_sub: '请告知产品类别和基本信息',
    category_label: '产品类别 *',
    categories: ['玩偶·手办', '周边·扭蛋商品', '包挂·钥匙扣', '保温袋·包包', '包装·纸箱', '其他'],
    product_name_label: '产品名称或描述 *',
    product_name_ph: '例：10cm迷你角色玩偶、亚克力钥匙扣等',
    product_desc_label: '详细说明（选填）',
    product_desc_ph: '材质、颜色、特殊要求等请自由填写',
    ref_url_label: '参考图片上传（选填）',
    ref_url_ph: '请选择图片文件（JPG、PNG、GIF，最大5MB）',
    desired_qty_label: '期望数量（选填）',
    desired_qty_ph: '例：500个、1000套等',
    desired_deadline_label: '期望交期（选填）',
    desired_deadline_ph: '例：2025年9月、约60天内等',
    sales_country_label: '销售国家（选填）',
    sales_countries: ['韩国', '日本', '美国', '欧洲', '东南亚', '其他'],
    cert_label: '认证需求（选填）',
    certs: ['无', 'KC（韩国）', 'CE（欧洲）', 'FDA（美国）', 'PSE（日本）', '其他'],
    budget_label: '预算范围（选填）',
    budgets: ['待定', '100万韩元以下', '100~500万韩元', '500万~1000万韩元', '1000万韩元以上'],
    has_sample_label: '是否有现有样品',
    has_sample_yes: '有（持有样品）',
    has_sample_no: '无',
    contact_method_label: '首选联系方式（选填）',
    contact_methods: ['电子邮件', 'KakaoTalk'],
    s2_title: '请告知数量和规格',
    s2_sub: '数量和规格越精确，报价越准确',
    qty_label: '期望数量 *',
    qty_ph: '例：500',
    unit_label: '单位',
    units: ['pcs（个）', 'set（套）', 'kg', 'box'],
    size_label: '尺寸/规格（选填）',
    size_ph: '例：10cm × 8cm × 5cm',
    material_label: '材质（选填）',
    material_ph: '例：PP、ABS、纯棉100%、无纺布等',
    color_label: '颜色数',
    custom_pkg_label: '需要定制包装',
    ip_design_label: '需要IP设计开发',
    target_price_label: '期望单价（选填）',
    target_price_ph: '例：每个500~1000韩元，$0.5以下等',
    deadline_label: '期望交期（选填）',
    deadline_ph: '例：2025年8月，约60天内等',
    business_purpose_label: '请描述您计划用该产品开展的业务（选填）',
    business_purpose_ph: '例：促销品一次性采购 / 韩国长期销售 / 日本出口代理经营等',
    print_pkg_label: '是否需要印刷·包装制作？',
    print_pkg_options: ['不需要', '简单印刷（logo·文字）', '定制包装盒', '全套包装设计开发'],
    factory_region_label: '是否有希望的工厂地区？（选填）',
    factory_region_ph: '例：义乌、广州、不限地区等',
    s3_title: '请选择所需服务',
    s3_sub: '可多选。我们将包含您选择的服务进行报价。',
    services: [
      { id: 'market_research', icon: '→', title: '市场调研', desc: '中国市场趋势及类似产品调查' },
      { id: 'sample_dev', icon: '→', title: '样品开发', desc: '工厂样品制作及韩国配送' },
      { id: 'factory_match', icon: '→', title: '工厂匹配', desc: '最优工厂发掘及匹配报告' },
      { id: 'inspection', icon: '→', title: '100%全检', desc: '出货前全检+照片报告' },
      { id: 'logistics', icon: '→', title: '物流代理', desc: 'LCL/FCL海运及韩国清关代理' },
      { id: 'ip_design', icon: '→', title: 'IP设计开发', desc: '角色·包装设计开发' },
    ],
    delivery_label: '交货国家',
    deliveries: ['韩国 (Korea)', '日本 (Japan)', '美国 (USA)', '其他 (Other)'],
    memo_label: '其他要求（选填）',
    memo_ph: '其他要求、注意事项等请自由填写',
    s4_title: '请输入联系方式',
    s4_sub: '我们将通过邮件发送报价单。将在2个工作日内与您联系。',
    name_label: '负责人姓名 *',
    name_ph: '张三',
    email_label: '邮箱 *',
    email_ph: 'example@company.com',
    phone_label: '联系电话（选填）',
    phone_ph: '+86-138-0000-0000',
    company_label: '公司名称（选填）',
    company_ph: '公司名称',
    next: '下一步',
    prev: '上一步',
    submit: '提交报价申请',
    submitting: '提交中...',
    done_title: '报价申请已受理！',
    done_sub: '我们将在2个工作日内通过邮件发送比较报价单。',
    done_check: [
      '✓ 最少3家工厂比较报价',
      '✓ 包含工厂验证清单',
      '✓ LCL/FCL物流费单独核算',
      '✓ 无隐藏附加费用',
    ],
    done_back: '返回首页',
    done_more: '了解更多服务',
    required_msg: '请填写必填项。',
    error_msg: '提交时发生错误，请重试。',
  },
  en: {
    lang_label: '한국어',
    back: '← Back to Shop',
    hero_badge: 'China Factory Direct Matching B2B Platform',
    hero_title: 'Request a Quote',
    hero_sub: 'Share your product spec and quantity — we\'ll send a comparison quote within 2 business days.',
    step_labels: ['Product Info', 'Qty · Spec', 'Services', 'Contact'],
    s1_title: 'What product are you looking for?',
    s1_sub: 'Tell us the product category and basic information',
    category_label: 'Product Category *',
    categories: ['Dolls · Figures', 'Goods · Capsule Toys', 'Bag Charms · Keyrings', 'Cooler Bags · Bags', 'Packaging · Boxes', 'Other'],
    product_name_label: 'Product Name or Description *',
    product_name_ph: 'e.g. 10cm mini character doll, acrylic keyring, etc.',
    product_desc_label: 'Detailed Description (optional)',
    product_desc_ph: 'Material, color, special requirements, etc.',
    ref_url_label: 'Reference Image Upload (optional)',
    ref_url_ph: 'Select image file (JPG, PNG, GIF, max 5MB)',
    desired_qty_label: 'Desired Quantity (optional)',
    desired_qty_ph: 'e.g. 500 pcs, 1,000 sets, etc.',
    desired_deadline_label: 'Desired Lead Time (optional)',
    desired_deadline_ph: 'e.g. September 2025, within 60 days, etc.',
    sales_country_label: 'Sales Country (optional)',
    sales_countries: ['Korea', 'Japan', 'USA', 'Europe', 'Southeast Asia', 'Other'],
    cert_label: 'Certification Required (optional)',
    certs: ['None', 'KC (Korea)', 'CE (Europe)', 'FDA (USA)', 'PSE (Japan)', 'Other'],
    budget_label: 'Budget Range (optional)',
    budgets: ['TBD', 'Under ₩1M', '₩1M~5M', '₩5M~10M', 'Over ₩10M'],
    has_sample_label: 'Existing Sample Available',
    has_sample_yes: 'Yes (have sample)',
    has_sample_no: 'No',
    contact_method_label: 'Preferred Contact Method (optional)',
    contact_methods: ['Email', 'KakaoTalk'],
    s2_title: 'Quantity & Specifications',
    s2_sub: 'The more precise the spec, the more accurate the quote',
    qty_label: 'Desired Quantity *',
    qty_ph: 'e.g. 500',
    unit_label: 'Unit',
    units: ['pcs', 'set', 'kg', 'box'],
    size_label: 'Size / Dimensions (optional)',
    size_ph: 'e.g. 10cm × 8cm × 5cm',
    material_label: 'Material (optional)',
    material_ph: 'e.g. PP, ABS, 100% cotton, non-woven fabric, etc.',
    color_label: 'Number of Colors',
    custom_pkg_label: 'Custom Packaging Required',
    ip_design_label: 'IP Design Development Required',
    target_price_label: 'Target Unit Price (optional)',
    target_price_ph: 'e.g. Under $0.50 per piece',
    deadline_label: 'Target Delivery Date (optional)',
    deadline_ph: 'e.g. August 2025, within 60 days, etc.',
    s3_title: 'Select Required Services',
    s3_sub: 'Multiple selection allowed. We\'ll include selected services in the quote.',
    services: [
      { id: 'market_research', icon: '→', title: 'Market Research', desc: 'China market trends & similar product sourcing' },
      { id: 'sample_dev', icon: '→', title: 'Sample Development', desc: 'Factory sample production & Korea shipping' },
      { id: 'factory_match', icon: '→', title: 'Factory Matching', desc: 'Best factory sourcing & matching report' },
      { id: 'inspection', icon: '→', title: '100% Full Inspection', desc: 'Pre-shipment full inspection + photo report' },
      { id: 'logistics', icon: '→', title: 'Logistics Agency', desc: 'LCL/FCL shipping & Korea customs clearance' },
      { id: 'ip_design', icon: '→', title: 'IP Design Development', desc: 'Character & packaging design development' },
    ],
    delivery_label: 'Delivery Country',
    deliveries: ['Korea', 'Japan', 'USA', 'Other'],
    memo_label: 'Additional Notes (optional)',
    memo_ph: 'Any other requirements or notes',
    s4_title: 'Your Contact Information',
    s4_sub: 'We\'ll send the quote to your email within 2 business days.',
    name_label: 'Contact Name *',
    name_ph: 'John Doe',
    email_label: 'Email *',
    email_ph: 'example@company.com',
    phone_label: 'Phone (optional)',
    phone_ph: '+1-000-000-0000',
    company_label: 'Company Name (optional)',
    company_ph: 'Company Inc.',
    next: 'Next',
    prev: 'Back',
    submit: 'Submit Quote Request',
    submitting: 'Submitting...',
    done_title: 'Quote Request Received!',
    done_sub: 'We\'ll send a comparison quote to your email within 2 business days.',
    done_check: [
      '✓ Quotes from at least 3 factories',
      '✓ Factory verification checklist included',
      '✓ LCL/FCL logistics cost calculated separately',
      '✓ No hidden fees',
    ],
    done_back: 'Back to Home',
    done_more: 'Learn More About Services',
    required_msg: 'Please fill in all required fields.',
    error_msg: 'An error occurred. Please try again.',
  },
};

type Lang = 'ko' | 'zh' | 'en';

// ─── 폼 상태 타입 ─────────────────────────────────────────────────────────────
interface FormData {
  // Step 1
  product_category: string;
  product_name: string;
  product_desc: string;
  reference_url: string;
  reference_image_url: string; // Supabase Storage URL
  desired_qty: string;
  desired_deadline: string;
  sales_country: string;
  cert_needed: string;
  budget_range: string;
  has_sample: string;
  contact_method: string;
  // Step 2
  quantity: string;
  unit: string;
  size_spec: string;
  material: string;
  color_count: number;
  custom_packaging: boolean;
  ip_design_needed: boolean;
  target_price: string;
  deadline: string;
  business_purpose: string;
  print_pkg: string;
  factory_region: string;
  // Step 3
  services_needed: string[];
  delivery_country: string;
  memo: string;
  // Step 4
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  company_name: string;
}

const INIT: FormData = {
  product_category: '',
  product_name: '',
  product_desc: '',
  reference_url: '',
  reference_image_url: '',
  desired_qty: '',
  desired_deadline: '',
  sales_country: '',
  cert_needed: '',
  budget_range: '',
  has_sample: '',
  contact_method: '',
  quantity: '',
  unit: 'pcs',
  size_spec: '',
  material: '',
  color_count: 1,
  custom_packaging: false,
  ip_design_needed: false,
  target_price: '',
  deadline: '',
  business_purpose: '',
  print_pkg: '',
  factory_region: '',
  services_needed: ['factory_match'],
  delivery_country: '',
  memo: '',
  requester_name: '',
  requester_email: '',
  requester_phone: '',
  company_name: '',
};

export default function QuotePage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [step, setStep] = useState(0); // 0~3
  const [form, setForm] = useState<FormData>(INIT);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const t = T[lang];

  const cycleLang = () => {
    setLang(l => l === 'ko' ? 'zh' : l === 'zh' ? 'en' : 'ko');
  };

  const set = (key: keyof FormData, val: unknown) =>
    setForm(f => ({ ...f, [key]: val }));

  const toggleService = (id: string) => {
    setForm(f => ({
      ...f,
      services_needed: f.services_needed.includes(id)
        ? f.services_needed.filter(s => s !== id)
        : [...f.services_needed, id],
    }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.product_category || !form.product_name.trim()) {
        setError(t.required_msg); return false;
      }
    }
    if (step === 1) {
      if (!form.quantity.trim()) {
        setError(t.required_msg); return false;
      }
    }
    if (step === 3) {
      if (!form.requester_name.trim() || !form.requester_email.trim()) {
        setError(t.required_msg); return false;
      }
    }
    setError(''); return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setError('');
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');
    try {
      // 서버 API 라우트 호출 (service_role 키로 RLS 우회)
      const res = await fetch('/api/quote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: form.requester_name,
          requester_email: form.requester_email,
          requester_phone: form.requester_phone || null,
          company_name: form.company_name || null,
          lang,
          product_category: form.product_category,
          product_name: form.product_name,
          product_desc: form.product_desc || null,
          reference_url: form.reference_url || null,
          quantity: form.quantity || null,
          unit: form.unit,
          size_spec: form.size_spec || null,
          material: form.material || null,
          color_count: form.color_count,
          custom_packaging: form.custom_packaging,
          ip_design_needed: form.ip_design_needed,
          services_needed: form.services_needed,
          delivery_country: form.delivery_country || null,
          target_price: form.target_price || null,
          deadline: form.deadline || null,
          memo: form.memo || null,
          reference_image_url: form.reference_image_url || null,
          desired_qty: form.desired_qty || null,
          desired_deadline: form.desired_deadline || null,
          sales_country: form.sales_country || null,
          cert_needed: form.cert_needed || null,
          budget_range: form.budget_range || null,
          has_sample: form.has_sample || null,
          contact_method: form.contact_method || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'submit failed');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(t.error_msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 완료 화면 ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} theme="light" />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          
          <h1 className="text-3xl font-black text-gray-900 mb-4">{t.done_title}</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">{t.done_sub}</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 text-left space-y-3">
            {t.done_check.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="text-green-500 font-bold text-base">{c.slice(0, 1)}</span>
                <span>{c.slice(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/shop" className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm no-underline hover:bg-gray-700 transition-colors">
              {t.done_back}
            </Link>
            <Link href="/services" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl font-bold text-sm no-underline hover:bg-gray-50 transition-colors">
              {t.done_more}
            </Link>
          </div>
        </div>
        <PublicFooter lang={lang} theme="dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} theme="light" />

      {/* ── 히어로 ── */}
      <section className="bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-900 text-white py-12 sm:py-16">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold mb-4">
            {t.hero_badge}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">{t.hero_title}</h1>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto">{t.hero_sub}</p>
        </div>
      </section>

      {/* ── 스텝 인디케이터 ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {t.step_labels.map((label, i) => (
              <div key={i} className="flex items-center gap-1 sm:gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-indigo-600 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`hidden sm:block text-xs font-semibold transition-colors ${
                  i === step ? 'text-indigo-600' : i < step ? 'text-green-600' : 'text-gray-400'
                }`}>{label}</span>
                {i < 3 && <div className="w-4 sm:w-8 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 폼 본문 ── */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">

          {/* ── STEP 0: 제품 정보 ── */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">{t.s1_title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.s1_sub}</p>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.category_label}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {t.categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => set('product_category', cat)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.product_category === cat
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.product_name_label}</label>
                <input
                  type="text"
                  value={form.product_name}
                  onChange={e => set('product_name', e.target.value)}
                  placeholder={t.product_name_ph}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.product_desc_label}</label>
                <textarea
                  value={form.product_desc}
                  onChange={e => set('product_desc', e.target.value)}
                  placeholder={t.product_desc_ph}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>

              {/* 참고 이미지 업로드 */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.ref_url_label}</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="ref-image-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        setError('이미지 파일은 5MB 이하만 업로드 가능합니다.');
                        return;
                      }
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const res = await fetch('/api/quote/upload-image', {
                          method: 'POST',
                          body: fd,
                        });
                        const json = await res.json();
                        if (!res.ok || !json.url) throw new Error(json.error || 'upload failed');
                        set('reference_image_url', json.url);
                        setError('');
                      } catch {
                        setError('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
                      }
                    }}
                  />
                  <label
                    htmlFor="ref-image-upload"
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>{form.reference_image_url ? '✓ 이미지 업로드 완료' : t.ref_url_ph}</span>
                  </label>
                  {form.reference_image_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={form.reference_image_url} alt="참고 이미지" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => set('reference_image_url', '')}
                        className="text-xs text-red-500 hover:text-red-700"
                      >삭제</button>
                    </div>
                  )}
                </div>
              </div>

              {/* 희망 수량 */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.desired_qty_label}</label>
                <input
                  type="text"
                  value={form.desired_qty}
                  onChange={e => set('desired_qty', e.target.value)}
                  placeholder={t.desired_qty_ph}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* 희망 납기 */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.desired_deadline_label}</label>
                <input
                  type="text"
                  value={form.desired_deadline}
                  onChange={e => set('desired_deadline', e.target.value)}
                  placeholder={t.desired_deadline_ph}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* 판매 국가 */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.sales_country_label}</label>
                <div className="flex flex-wrap gap-2">
                  {t.sales_countries.map((c: string) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('sales_country', c)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        form.sales_country === c
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >{c}</button>
                  ))}
                </div>
              </div>

              {/* 인증 필요 여부 */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.cert_label}</label>
                <div className="flex flex-wrap gap-2">
                  {t.certs.map((c: string) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('cert_needed', c)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        form.cert_needed === c
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >{c}</button>
                  ))}
                </div>
              </div>

              {/* 예산 범위 */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.budget_label}</label>
                <div className="flex flex-wrap gap-2">
                  {t.budgets.map((b: string) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => set('budget_range', b)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        form.budget_range === b
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >{b}</button>
                  ))}
                </div>
              </div>

              {/* 기존 샘플 보유 여부 */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.has_sample_label}</label>
                <div className="flex gap-3">
                  {[t.has_sample_yes, t.has_sample_no].map((opt: string) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set('has_sample', opt)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.has_sample === opt
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* 선호 연락 수단 */}
              <div className="mb-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.contact_method_label}</label>
                <div className="flex gap-3">
                  {t.contact_methods.map((m: string) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set('contact_method', m)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.contact_method === m
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >{m}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: 수량 · 사양 ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">{t.s2_title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.s2_sub}</p>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.qty_label}</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => set('quantity', e.target.value)}
                    placeholder={t.qty_ph}
                    min={1}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.unit_label}</label>
                  <select
                    value={form.unit}
                    onChange={e => set('unit', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    {t.units.map(u => <option key={u} value={u.split(' ')[0]}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.size_label}</label>
                <input
                  type="text"
                  value={form.size_spec}
                  onChange={e => set('size_spec', e.target.value)}
                  placeholder={t.size_ph}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.material_label}</label>
                <input
                  type="text"
                  value={form.material}
                  onChange={e => set('material', e.target.value)}
                  placeholder={t.material_ph}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.color_label}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, '6+'].map(n => (
                    <button
                      key={n}
                      onClick={() => set('color_count', typeof n === 'number' ? n : 6)}
                      className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${
                        form.color_count === (typeof n === 'number' ? n : 6)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-5">
                {[
                  { key: 'custom_packaging' as const, label: t.custom_pkg_label },
                  { key: 'ip_design_needed' as const, label: t.ip_design_label },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => set(key, !form[key])}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        form[key] ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                      }`}
                    >
                      {form[key] && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.target_price_label}</label>
                  <input
                    type="text"
                    value={form.target_price}
                    onChange={e => set('target_price', e.target.value)}
                    placeholder={t.target_price_ph}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.deadline_label}</label>
                  <input
                    type="text"
                    value={form.deadline}
                    onChange={e => set('deadline', e.target.value)}
                    placeholder={t.deadline_ph}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: 서비스 선택 ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">{t.s3_title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.s3_sub}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {t.services.map(svc => {
                  const selected = form.services_needed.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      onClick={() => toggleService(svc.id)}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{svc.icon}</span>
                      <div>
                        <div className={`text-sm font-bold ${selected ? 'text-indigo-700' : 'text-gray-800'}`}>
                          {svc.title}
                          {selected && <span className="ml-2 text-xs bg-indigo-600 text-white rounded-full px-2 py-0.5">✓</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{svc.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.delivery_label}</label>
                <div className="flex flex-wrap gap-2">
                  {t.deliveries.map(d => (
                    <button
                      key={d}
                      onClick={() => set('delivery_country', d)}
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        form.delivery_country === d
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t.memo_label}</label>
                <textarea
                  value={form.memo}
                  onChange={e => set('memo', e.target.value)}
                  placeholder={t.memo_ph}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: 연락처 ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">{t.s4_title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.s4_sub}</p>

              {/* 요약 카드 */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
                <div className="font-bold text-gray-700 mb-2">
                  {lang === 'ko' ? '요청 요약' : lang === 'zh' ? '申请摘要' : 'Request Summary'}
                </div>
                <div className="space-y-1 text-gray-600">
                  <div><span className="font-semibold">{lang === 'ko' ? '제품' : lang === 'zh' ? '产品' : 'Product'}:</span> {form.product_category} — {form.product_name}</div>
                  {form.quantity && <div><span className="font-semibold">{lang === 'ko' ? '수량' : lang === 'zh' ? '数量' : 'Qty'}:</span> {form.quantity} {form.unit}</div>}
                  {form.services_needed.length > 0 && (
                    <div><span className="font-semibold">{lang === 'ko' ? '서비스' : lang === 'zh' ? '服务' : 'Services'}:</span> {form.services_needed.join(', ')}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.name_label}</label>
                  <input
                    type="text"
                    value={form.requester_name}
                    onChange={e => set('requester_name', e.target.value)}
                    placeholder={t.name_ph}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.email_label}</label>
                  <input
                    type="email"
                    value={form.requester_email}
                    onChange={e => set('requester_email', e.target.value)}
                    placeholder={t.email_ph}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.phone_label}</label>
                  <input
                    type="tel"
                    value={form.requester_phone}
                    onChange={e => set('requester_phone', e.target.value)}
                    placeholder={t.phone_ph}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t.company_label}</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    placeholder={t.company_ph}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* 개인정보 동의 */}
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
                {lang === 'ko' && '입력하신 정보는 견적 제공 목적으로만 사용되며, 개인정보처리방침에 따라 보호됩니다.'}
                {lang === 'zh' && '您提供的信息仅用于报价目的，并根据隐私政策受到保护。'}
                {lang === 'en' && 'Your information will only be used for quoting purposes and is protected under our privacy policy.'}
              </div>
            </div>
          )}

          {/* ── 오류 메시지 ── */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── 버튼 ── */}
          <div className="flex justify-between items-center mt-8">
            {step > 0 ? (
              <button
                onClick={handlePrev}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← {t.prev}
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors active:scale-95"
              >
                {t.next} →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 rounded-xl text-sm font-black text-gray-900 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}
              >
                {submitting ? t.submitting : t.submit}
              </button>
            )}
          </div>
        </div>

        {/* ── 신뢰 배지 ── */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '→', text: lang === 'ko' ? '숨겨진 비용 없음' : lang === 'zh' ? '无隐藏费用' : 'No Hidden Fees' },
            { icon: '', text: lang === 'ko' ? '영업일 2일 이내 회신' : lang === 'zh' ? '2个工作日内回复' : 'Reply in 2 Business Days' },
            { icon: '→', text: lang === 'ko' ? '3개 공장 비교 견적' : lang === 'zh' ? '3家工厂比较报价' : '3+ Factory Comparison' },
            { icon: '', text: lang === 'ko' ? '공장 검증 포함' : lang === 'zh' ? '含工厂验证' : 'Factory Verified' },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <div className="text-xl mb-1">{b.icon}</div>
              <div className="text-xs font-semibold text-gray-600">{b.text}</div>
            </div>
          ))}
        </div>
      </div>
      <PublicFooter lang={lang} theme="dark" />
    </div>
  );
}


