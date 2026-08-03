'use client';

import { useState, useRef } from 'react';
import { useLangContext } from '@/components/layout/LangContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Upload, X,
  CheckCircle2, Building2, BarChart3, ClipboardList, Package, MessageSquare
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── 다국어 텍스트 ───────────────────────────────────────────────
const T = {
  ko: {
    title: '상품 구매단가 및 시장조사\n장기적인 이용이 가능한 공장 매칭 의뢰서',
    subtitle: '아래 내용을 상세히 작성해 주시면 전담 MD가 최적의 공장을 찾아드립니다.',
    steps: ['의뢰인 정보', '사업 정보', '의뢰 일반 사항', '파일럿 품목 등록', '추가 사항'],
    next: '다음 단계',
    prev: '이전',
    submit: '의뢰서 제출',
    submitting: '제출 중...',
    required: '필수 항목을 모두 입력해 주세요.',
    success: '의뢰서가 성공적으로 제출되었습니다!',
    successSub: '전담 MD가 검토 후 연락드립니다.',
    viewList: '의뢰 내역 보기',
    // Step 1
    s1_company: '회사명',
    s1_ceo: '대표자명',
    s1_contact: '담당자명',
    s1_phone: '연락처',
    s1_email: '이메일',
    s1_kakao: '카카오톡 ID',
    s1_wechat: 'WeChat ID',
    s1_agree_terms: '서비스 이용약관 및 개인정보 처리방침에 동의합니다. (회원 자동 등록)',
    s1_agree_marketing: '마케팅 정보 수신에 동의합니다. (선택)',
    // Step 2
    s2_stage: '사업 단계',
    s2_stage_opts: ['준비 중', '창업 1년 미만', '1~3년', '3~5년', '5년 이상'],
    s2_revenue: '연 매출 규모',
    s2_revenue_opts: ['매출 없음', '1억 미만', '1~5억', '5~10억', '10~50억', '50억 이상'],
    s2_channels: '주력 판매 채널 (복수 선택)',
    s2_channel_opts: ['스마트스토어', '쿠팡', '11번가', 'G마켓/옥션', '카카오쇼핑', '자사몰', '오프라인 매장', '수출/해외', '기타'],
    s2_challenges: '현재 사업의 어려움을 자유롭게 작성해 주세요',
    // Step 3
    s3_category: '제품 카테고리',
    s3_category_opts: ['완구/굿즈', '부직포 가방/보냉백', '인형/봉제', '패키지/박스', '가방/잡화', '의류/패션', '생활용품', '문구/팬시', '뷰티/건강', '전자/IT', '기타'],
    s3_category_detail: '카테고리 상세 설명',
    s3_qty: '예상 발주량',
    s3_qty_unit: '단위',
    s3_qty_unit_opts: ['개', '세트', 'kg', 'Box'],
    s3_priority: '우선 조사 내용 (가장 먼저 알고 싶은 것을 구체적으로 작성해 주세요)',
    // Step 4
    s4_title: '파일럿 품목 등록',
    s4_desc: '우선적으로 찾거나 조사해야 할 상품을 등록해 주세요. 여러 품목을 추가할 수 있습니다.',
    s4_add: '품목 추가',
    s4_item_name: '상품명',
    s4_item_category: '카테고리',
    s4_item_desc: '상품 설명 (소재, 사이즈, 색상, 특이사항 등)',
    s4_item_price_min: '목표 단가 최소 (CNY)',
    s4_item_price_max: '목표 단가 최대 (CNY)',
    s4_item_qty: '희망 수량',
    s4_item_material: '소재 사양',
    s4_item_size: '사이즈 사양',
    s4_item_color: '색상 사양',
    s4_item_cert: '인증 요구사항',
    s4_item_sample: '샘플 필요',
    s4_item_sample_qty: '샘플 수량',
    s4_item_images: '참고 이미지 (최대 5장)',
    s4_item_refs: '참고 URL',
    s4_item_notes: '추가 메모',
    s4_remove: '품목 삭제',
    // Step 5
    s5_factory_req: '공장에게 바라는 내용',
    s5_factory_req_ph: '예: 친환경 인증 보유, 최소 발주량 500개 이하, 빠른 납기 가능, OEM 경험 풍부 등',
    s5_preferred_type: '희망 공장 유형',
    s5_preferred_type_opts: ['대형 공장 (안정적 품질)', '중소형 공장 (유연한 MOQ)', '전문 특화 공장', '상관없음'],
    s5_preferred_region: '희망 공장 지역',
    s5_preferred_region_opts: ['광저우', '선전', '이우', '닝보', '상하이', '칭다오', '기타', '상관없음'],
    s5_notes: '기타 추가 사항',
  },
  zh: {
    title: '商品采购单价及市场调研\n长期合作工厂匹配委托书',
    subtitle: '请详细填写以下内容，专属MD将为您找到最优工厂。',
    steps: ['委托人信息', '业务信息', '委托一般事项', '试点品目登记', '附加事项'],
    next: '下一步',
    prev: '上一步',
    submit: '提交委托书',
    submitting: '提交中...',
    required: '请填写所有必填项。',
    success: '委托书提交成功！',
    successSub: '专属MD审核后将与您联系。',
    viewList: '查看委托记录',
    s1_company: '公司名称',
    s1_ceo: '法定代表人',
    s1_contact: '负责人姓名',
    s1_phone: '联系电话',
    s1_email: '电子邮箱',
    s1_kakao: 'KakaoTalk ID',
    s1_wechat: 'WeChat ID',
    s1_agree_terms: '同意服务条款及隐私政策（自动注册会员）',
    s1_agree_marketing: '同意接收营销信息（选填）',
    s2_stage: '业务阶段',
    s2_stage_opts: ['筹备中', '创业不足1年', '1~3年', '3~5年', '5年以上'],
    s2_revenue: '年营业额规模',
    s2_revenue_opts: ['无营业额', '1亿以下', '1~5亿', '5~10亿', '10~50亿', '50亿以上'],
    s2_channels: '主要销售渠道（可多选）',
    s2_channel_opts: ['智能商店', '酷澎', '11街', 'G市场/拍卖', '卡卡购物', '自营商城', '线下门店', '出口/海外', '其他'],
    s2_challenges: '请自由描述目前业务面临的困难',
    s3_category: '产品类别',
    s3_category_opts: ['玩具/周边', '无纺布袋/保冷袋', '毛绒/填充玩具', '包装/纸箱', '包包/杂货', '服装/时尚', '生活用品', '文具/精品', '美妆/健康', '电子/IT', '其他'],
    s3_category_detail: '类别详细说明',
    s3_qty: '预计订购量',
    s3_qty_unit: '单位',
    s3_qty_unit_opts: ['个', '套', 'kg', 'Box'],
    s3_priority: '优先调研内容（请具体描述您最想了解的内容）',
    s4_title: '试点品目登记',
    s4_desc: '请登记需要优先寻找或调研的商品，可添加多个品目。',
    s4_add: '添加品目',
    s4_item_name: '商品名称',
    s4_item_category: '类别',
    s4_item_desc: '商品说明（材质、尺寸、颜色、特殊要求等）',
    s4_item_price_min: '目标单价最低（CNY）',
    s4_item_price_max: '目标单价最高（CNY）',
    s4_item_qty: '希望数量',
    s4_item_material: '材质规格',
    s4_item_size: '尺寸规格',
    s4_item_color: '颜色规格',
    s4_item_cert: '认证要求',
    s4_item_sample: '需要样品',
    s4_item_sample_qty: '样品数量',
    s4_item_images: '参考图片（最多5张）',
    s4_item_refs: '参考链接',
    s4_item_notes: '附加备注',
    s4_remove: '删除品目',
    s5_factory_req: '对工厂的要求',
    s5_factory_req_ph: '例：拥有环保认证、最小起订量500个以下、交货期短、OEM经验丰富等',
    s5_preferred_type: '希望工厂类型',
    s5_preferred_type_opts: ['大型工厂（品质稳定）', '中小型工厂（MOQ灵活）', '专业特化工厂', '不限'],
    s5_preferred_region: '希望工厂地区',
    s5_preferred_region_opts: ['广州', '深圳', '义乌', '宁波', '上海', '青岛', '其他', '不限'],
    s5_notes: '其他附加事项',
  },
  en: {
    title: 'Factory Matching & Market Research\nRequest Form',
    subtitle: 'Fill in the details below and your dedicated MD will find the best factory for you.',
    steps: ['Requester Info', 'Business Info', 'General Requirements', 'Pilot Items', 'Additional Info'],
    next: 'Next Step',
    prev: 'Back',
    submit: 'Submit Request',
    submitting: 'Submitting...',
    required: 'Please fill in all required fields.',
    success: 'Your request has been submitted successfully!',
    successSub: 'Your dedicated MD will review and contact you shortly.',
    viewList: 'View My Requests',
    s1_company: 'Company Name',
    s1_ceo: 'CEO / Representative',
    s1_contact: 'Contact Person',
    s1_phone: 'Phone Number',
    s1_email: 'Email Address',
    s1_kakao: 'KakaoTalk ID',
    s1_wechat: 'WeChat ID',
    s1_agree_terms: 'I agree to the Terms of Service and Privacy Policy. (Auto membership registration)',
    s1_agree_marketing: 'I agree to receive marketing information. (Optional)',
    s2_stage: 'Business Stage',
    s2_stage_opts: ['Planning', 'Under 1 year', '1~3 years', '3~5 years', '5+ years'],
    s2_revenue: 'Annual Revenue',
    s2_revenue_opts: ['No revenue', 'Under ₩100M', '₩100M~500M', '₩500M~1B', '₩1B~5B', 'Over ₩5B'],
    s2_channels: 'Main Sales Channels (Multiple)',
    s2_channel_opts: ['Smartstore', 'Coupang', '11Street', 'Gmarket/Auction', 'Kakao Shopping', 'Own Mall', 'Offline Store', 'Export/Overseas', 'Other'],
    s2_challenges: 'Describe your current business challenges',
    s3_category: 'Product Category',
    s3_category_opts: ['Toys/Goods', 'Non-woven Bags/Cooler Bags', 'Plush/Stuffed', 'Packaging/Boxes', 'Bags/Accessories', 'Fashion/Apparel', 'Household', 'Stationery', 'Beauty/Health', 'Electronics/IT', 'Other'],
    s3_category_detail: 'Category Details',
    s3_qty: 'Expected Order Quantity',
    s3_qty_unit: 'Unit',
    s3_qty_unit_opts: ['pcs', 'sets', 'kg', 'Box'],
    s3_priority: 'Priority Research Topics (What do you want to know first?)',
    s4_title: 'Pilot Items Registration',
    s4_desc: 'Register the products you want to find or research first. You can add multiple items.',
    s4_add: 'Add Item',
    s4_item_name: 'Product Name',
    s4_item_category: 'Category',
    s4_item_desc: 'Product Description (material, size, color, special requirements)',
    s4_item_price_min: 'Target Unit Price Min (CNY)',
    s4_item_price_max: 'Target Unit Price Max (CNY)',
    s4_item_qty: 'Desired Quantity',
    s4_item_material: 'Material Spec',
    s4_item_size: 'Size Spec',
    s4_item_color: 'Color Spec',
    s4_item_cert: 'Certification Requirements',
    s4_item_sample: 'Sample Needed',
    s4_item_sample_qty: 'Sample Quantity',
    s4_item_images: 'Reference Images (max 5)',
    s4_item_refs: 'Reference URLs',
    s4_item_notes: 'Additional Notes',
    s4_remove: 'Remove Item',
    s5_factory_req: 'Factory Requirements',
    s5_factory_req_ph: 'e.g. Eco-certified, MOQ under 500, fast delivery, OEM experience, etc.',
    s5_preferred_type: 'Preferred Factory Type',
    s5_preferred_type_opts: ['Large Factory (Stable Quality)', 'SME Factory (Flexible MOQ)', 'Specialized Factory', 'No Preference'],
    s5_preferred_region: 'Preferred Factory Region',
    s5_preferred_region_opts: ['Guangzhou', 'Shenzhen', 'Yiwu', 'Ningbo', 'Shanghai', 'Qingdao', 'Other', 'No Preference'],
    s5_notes: 'Other Additional Notes',
  },
};

type Lang = 'ko' | 'zh';

interface PilotItem {
  product_name: string;
  category: string;
  description: string;
  target_unit_price_min: string;
  target_unit_price_max: string;
  target_qty: string;
  qty_unit: string;
  material_spec: string;
  size_spec: string;
  color_spec: string;
  certification_req: string;
  wants_sample: boolean;
  sample_qty: string;
  reference_image_urls: string[];
  reference_urls: string;
  additional_notes: string;
}

const emptyItem = (): PilotItem => ({
  product_name: '', category: '', description: '',
  target_unit_price_min: '', target_unit_price_max: '',
  target_qty: '', qty_unit: '개',
  material_spec: '', size_spec: '', color_spec: '',
  certification_req: '', wants_sample: false, sample_qty: '1',
  reference_image_urls: [], reference_urls: '', additional_notes: '',
});

const STEP_ICONS = [Building2, BarChart3, ClipboardList, Package, MessageSquare];

export default function UnifiedRequestNewPage() {
  const { lang, setLang } = useLangContext();
  const router = useRouter();
  const t = T[lang];
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedNo, setSubmittedNo] = useState('');
  const [error, setError] = useState('');

  // Step 1
  const [company_name, setCompanyName] = useState('');
  const [ceo_name, setCeoName] = useState('');
  const [contact_name, setContactName] = useState('');
  const [contact_phone, setContactPhone] = useState('');
  const [contact_email, setContactEmail] = useState('');
  const [kakao_id, setKakaoId] = useState('');
  const [wechat_id, setWechatId] = useState('');
  const [agree_terms, setAgreeTerms] = useState(false);
  const [agree_marketing, setAgreeMarketing] = useState(false);

  // Step 2
  const [business_stage, setBusinessStage] = useState('');
  const [annual_revenue, setAnnualRevenue] = useState('');
  const [main_channels, setMainChannels] = useState<string[]>([]);
  const [current_challenges, setCurrentChallenges] = useState('');

  // Step 3
  const [product_category, setProductCategory] = useState('');
  const [product_category_detail, setProductCategoryDetail] = useState('');
  const [expected_order_qty, setExpectedOrderQty] = useState('');
  const [expected_order_unit, setExpectedOrderUnit] = useState('개');
  const [priority_research, setPriorityResearch] = useState('');

  // Step 4
  const [items, setItems] = useState<PilotItem[]>([emptyItem()]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const supabase = createClient();

  // Step 5
  const [factory_requirements, setFactoryRequirements] = useState('');
  const [preferred_factory_type, setPreferredFactoryType] = useState('');
  const [preferred_region, setPreferredRegion] = useState('');
  const [additional_notes, setAdditionalNotes] = useState('');

  const toggleChannel = (ch: string) => {
    setMainChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const updateItem = (idx: number, field: keyof PilotItem, value: unknown) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  // 이미지 업로드
  const handleImageUpload = async (idx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const current = items[idx].reference_image_urls;
    if (current.length >= 5) return;

    const uploaded: string[] = [];
    for (let i = 0; i < Math.min(files.length, 5 - current.length); i++) {
      const file = files[i];
      const ext = file.name.split('.').pop();
      const path = `unified-request-items/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('inspection-photos')
        .upload(path, file, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(path);
        uploaded.push(urlData.publicUrl);
      }
    }
    updateItem(idx, 'reference_image_urls', [...current, ...uploaded]);
  };

  const validateStep = (): boolean => {
    setError('');
    if (step === 0) {
      if (!company_name || !contact_name || !contact_phone || !contact_email || !agree_terms) {
        setError(t.required);
        return false;
      }
    }
    if (step === 1) {
      if (!business_stage || !annual_revenue || main_channels.length === 0) {
        setError(t.required);
        return false;
      }
    }
    if (step === 2) {
      if (!product_category || !expected_order_qty || !priority_research) {
        setError(t.required);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        company_name, ceo_name, contact_name, contact_phone, contact_email,
        kakao_id, wechat_id, agree_terms, agree_marketing,
        business_stage, annual_revenue, main_channels, current_challenges,
        product_category, product_category_detail, expected_order_qty, expected_order_unit,
        priority_research, factory_requirements, preferred_factory_type,
        preferred_region, additional_notes,
        items: items.map(it => ({
          ...it,
          target_unit_price_min: it.target_unit_price_min ? parseFloat(it.target_unit_price_min) : null,
          target_unit_price_max: it.target_unit_price_max ? parseFloat(it.target_unit_price_max) : null,
          target_qty: it.target_qty ? parseInt(it.target_qty) : null,
          sample_qty: it.sample_qty ? parseInt(it.sample_qty) : 1,
          reference_urls: it.reference_urls ? it.reference_urls.split('\n').filter(Boolean) : [],
        })),
      };

      const res = await fetch('/api/unified-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || '제출 중 오류가 발생했습니다.');
        return;
      }
      setSubmittedNo(data.requestNo);
      setSubmitted(true);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.success}</h2>
          <p className="text-gray-500 mb-2">{t.successSub}</p>
          <p className="text-sm font-mono bg-gray-100 rounded px-3 py-2 inline-block mb-6">
            {submittedNo}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/seller/unified-request')}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              {t.viewList}
            </button>
            <button
              onClick={() => router.push('/seller')}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 언어 선택 */}
      <div className="fixed top-4 right-4 z-50 flex gap-1 bg-white rounded-full shadow border px-2 py-1">
        {((['ko', 'zh'] as Lang[])).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              lang === l ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900 whitespace-pre-line leading-snug">
            {t.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {t.steps.map((label, i) => {
              const Icon = STEP_ICONS[i];
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive ? 'bg-green-600 text-white' :
                    isDone ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </div>
                  {i < t.steps.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 폼 본문 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* ── STEP 0: 의뢰인 정보 ── */}
        {step === 0 && (
          <div className="space-y-5">
            <SectionCard title={t.steps[0]}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t.s1_company} required>
                  <input value={company_name} onChange={e => setCompanyName(e.target.value)} className={inputCls} />
                </Field>
                <Field label={t.s1_ceo}>
                  <input value={ceo_name} onChange={e => setCeoName(e.target.value)} className={inputCls} />
                </Field>
                <Field label={t.s1_contact} required>
                  <input value={contact_name} onChange={e => setContactName(e.target.value)} className={inputCls} />
                </Field>
                <Field label={t.s1_phone} required>
                  <input value={contact_phone} onChange={e => setContactPhone(e.target.value)} className={inputCls} type="tel" />
                </Field>
                <Field label={t.s1_email} required>
                  <input value={contact_email} onChange={e => setContactEmail(e.target.value)} className={inputCls} type="email" />
                </Field>
                <Field label={t.s1_kakao}>
                  <input value={kakao_id} onChange={e => setKakaoId(e.target.value)} className={inputCls} />
                </Field>
                <Field label={t.s1_wechat}>
                  <input value={wechat_id} onChange={e => setWechatId(e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agree_terms} onChange={e => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-green-600" />
                  <span className="text-sm text-gray-700">{t.s1_agree_terms} <span className="text-red-500">*</span></span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agree_marketing} onChange={e => setAgreeMarketing(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-green-600" />
                  <span className="text-sm text-gray-500">{t.s1_agree_marketing}</span>
                </label>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 1: 사업 정보 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <SectionCard title={t.steps[1]}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t.s2_stage} required>
                  <select value={business_stage} onChange={e => setBusinessStage(e.target.value)} className={inputCls}>
                    <option value="">선택</option>
                    {t.s2_stage_opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label={t.s2_revenue} required>
                  <select value={annual_revenue} onChange={e => setAnnualRevenue(e.target.value)} className={inputCls}>
                    <option value="">선택</option>
                    {t.s2_revenue_opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={t.s2_channels} required>
                <div className="flex flex-wrap gap-2 mt-1">
                  {t.s2_channel_opts.map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        main_channels.includes(ch)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t.s2_challenges}>
                <textarea value={current_challenges} onChange={e => setCurrentChallenges(e.target.value)}
                  rows={4} className={inputCls} />
              </Field>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 2: 의뢰 일반 사항 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <SectionCard title={t.steps[2]}>
              <Field label={t.s3_category} required>
                <select value={product_category} onChange={e => setProductCategory(e.target.value)} className={inputCls}>
                  <option value="">선택</option>
                  {t.s3_category_opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label={t.s3_category_detail}>
                <input value={product_category_detail} onChange={e => setProductCategoryDetail(e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t.s3_qty} required>
                  <input value={expected_order_qty} onChange={e => setExpectedOrderQty(e.target.value)}
                    className={inputCls} type="number" min="1" />
                </Field>
                <Field label={t.s3_qty_unit}>
                  <select value={expected_order_unit} onChange={e => setExpectedOrderUnit(e.target.value)} className={inputCls}>
                    {t.s3_qty_unit_opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={t.s3_priority} required>
                <textarea value={priority_research} onChange={e => setPriorityResearch(e.target.value)}
                  rows={5} className={inputCls}
                  placeholder={lang === 'ko' ? '예: 부직포 보냉백 500개 단가 조사, 친환경 소재 가능 여부, 인쇄 방식 옵션...' :
                    lang === 'zh' ? '例：无纺布保冷袋500个单价调查，是否可用环保材料，印刷方式选项...' :
                    'e.g. Unit price for 500 non-woven cooler bags, eco-material options, printing methods...'} />
              </Field>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 3: 파일럿 품목 등록 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-1">{t.s4_title}</h3>
              <p className="text-sm text-blue-700">{t.s4_desc}</p>
            </div>
            {items.map((item, idx) => (
              <SectionCard key={idx} title={`${t.s4_title} #${idx + 1}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t.s4_item_name} required>
                    <input value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label={t.s4_item_category}>
                    <select value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)} className={inputCls}>
                      <option value="">선택</option>
                      {T.ko.s3_category_opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label={t.s4_item_desc}>
                  <textarea value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                    rows={3} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label={t.s4_item_price_min}>
                    <input value={item.target_unit_price_min} onChange={e => updateItem(idx, 'target_unit_price_min', e.target.value)}
                      className={inputCls} type="number" min="0" step="0.01" />
                  </Field>
                  <Field label={t.s4_item_price_max}>
                    <input value={item.target_unit_price_max} onChange={e => updateItem(idx, 'target_unit_price_max', e.target.value)}
                      className={inputCls} type="number" min="0" step="0.01" />
                  </Field>
                  <Field label={t.s4_item_qty}>
                    <input value={item.target_qty} onChange={e => updateItem(idx, 'target_qty', e.target.value)}
                      className={inputCls} type="number" min="1" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={t.s4_item_material}>
                    <input value={item.material_spec} onChange={e => updateItem(idx, 'material_spec', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label={t.s4_item_size}>
                    <input value={item.size_spec} onChange={e => updateItem(idx, 'size_spec', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label={t.s4_item_color}>
                    <input value={item.color_spec} onChange={e => updateItem(idx, 'color_spec', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <Field label={t.s4_item_cert}>
                  <input value={item.certification_req} onChange={e => updateItem(idx, 'certification_req', e.target.value)} className={inputCls} />
                </Field>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={item.wants_sample}
                      onChange={e => updateItem(idx, 'wants_sample', e.target.checked)}
                      className="w-4 h-4 accent-green-600" />
                    <span className="text-sm text-gray-700">{t.s4_item_sample}</span>
                  </label>
                  {item.wants_sample && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{t.s4_item_sample_qty}:</span>
                      <input value={item.sample_qty} onChange={e => updateItem(idx, 'sample_qty', e.target.value)}
                        className="w-20 border rounded-lg px-2 py-1 text-sm" type="number" min="1" />
                    </div>
                  )}
                </div>
                {/* 이미지 업로드 */}
                <Field label={t.s4_item_images}>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.reference_image_urls.map((url, imgIdx) => (
                      <div key={imgIdx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <Image src={url} alt="" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => updateItem(idx, 'reference_image_urls',
                            item.reference_image_urls.filter((_, i) => i !== imgIdx))}
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {item.reference_image_urls.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-600 transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-xs mt-1">업로드</span>
                      </button>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      ref={el => { fileInputRefs.current[idx] = el; }}
                      onChange={e => handleImageUpload(idx, e.target.files)}
                    />
                  </div>
                </Field>
                <Field label={t.s4_item_refs}>
                  <textarea value={item.reference_urls}
                    onChange={e => updateItem(idx, 'reference_urls', e.target.value)}
                    rows={2} className={inputCls}
                    placeholder="https://... (한 줄에 하나씩)" />
                </Field>
                <Field label={t.s4_item_notes}>
                  <textarea value={item.additional_notes}
                    onChange={e => updateItem(idx, 'additional_notes', e.target.value)}
                    rows={2} className={inputCls} />
                </Field>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t.s4_remove}
                  </button>
                )}
              </SectionCard>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="w-full py-3 border-2 border-dashed border-green-300 rounded-xl text-green-700 font-medium hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t.s4_add}
            </button>
          </div>
        )}

        {/* ── STEP 4: 추가 사항 ── */}
        {step === 4 && (
          <div className="space-y-5">
            <SectionCard title={t.steps[4]}>
              <Field label={t.s5_factory_req}>
                <textarea value={factory_requirements} onChange={e => setFactoryRequirements(e.target.value)}
                  rows={4} className={inputCls} placeholder={t.s5_factory_req_ph} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t.s5_preferred_type}>
                  <select value={preferred_factory_type} onChange={e => setPreferredFactoryType(e.target.value)} className={inputCls}>
                    <option value="">선택</option>
                    {t.s5_preferred_type_opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label={t.s5_preferred_region}>
                  <select value={preferred_region} onChange={e => setPreferredRegion(e.target.value)} className={inputCls}>
                    <option value="">선택</option>
                    {t.s5_preferred_region_opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={t.s5_notes}>
                <textarea value={additional_notes} onChange={e => setAdditionalNotes(e.target.value)}
                  rows={4} className={inputCls} />
              </Field>
            </SectionCard>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {t.prev}
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              {t.next}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 재사용 컴포넌트 ───────────────────────────────────────────────
const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-800 text-base border-b pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
