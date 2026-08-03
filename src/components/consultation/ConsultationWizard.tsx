'use client'
import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'

interface Product {
  id: string
  name_ko: string
  name_zh: string
  image_url: string
  image_urls?: string[]
  price_cny: number
  sample_cost_cny?: number
  moq: number
  product_code: string
}

interface ConsultationData {
  want_product_inquiry: boolean
  want_sample: boolean
  want_quote: boolean
  want_custom_photo: boolean
  want_oem: boolean
  product_id: string
  product_name_snapshot: string
  product_image_snapshot: string
  product_code_snapshot: string
  product_price_snapshot: number | null
  product_sample_cost: number | null
  reference_image_urls: string[]
  referenceFiles: File[]
  requirements: string
  target_use: string
  quantity: number | null
  target_price_cny: number | null
  packaging_type: string
  packaging_detail: string
  custom_label: boolean
  custom_box: boolean
  oem_available: boolean
  print_method: string
  color_options: string
  size_options: string
  requester_name: string
  requester_email: string
  requester_phone: string
  requester_company: string
  requester_country: string
  preferred_contact: string
}

interface ConsultationWizardProps {
  products: Product[]
  landingSlug: string
  lang: 'ko' | 'zh'
  accentColor?: string
  onClose?: () => void
  initialProductId?: string
  initialWantSample?: boolean
}

const T = {
  ko: {
    title: '무료 상담 신청',
    subtitle: '전담 MD가 24시간 내 연락드립니다',
    step: (n: number, total: number) => `${n} / ${total}단계`,
    prev: '이전', next: '다음', submit: '상담 신청 완료', submitting: '제출 중...',
    s1title: '어떤 도움이 필요하신가요?',
    s1sub: '해당하는 항목을 모두 선택해 주세요 (복수 선택 가능)',
    types: {
      want_product_inquiry: { label: '📦 등록 상품 문의', desc: 'KERYX 플랫폼의 등록 상품에 대해 문의합니다' },
      want_sample: { label: '🧪 샘플 요청', desc: '제품 샘플을 받아보고 싶습니다' },
      want_quote: { label: '💰 견적 요청', desc: '수량과 요구사항을 알려주시면 가격을 안내해 드립니다' },
      want_custom_photo: { label: '📸 내 사진으로 문의', desc: '참고 이미지를 업로드하여 유사 제품을 찾습니다' },
      want_oem: { label: '🏭 OEM/ODM 제작', desc: '내 브랜드로 제품을 제작하고 싶습니다' },
    },
    s2title_product: '어떤 상품이 궁금하신가요?',
    s2sub_product: '관심 있는 상품을 선택해 주세요 (샘플 요청 시 가격이 표시됩니다)',
    s2title_photo: '참고 이미지를 업로드해 주세요',
    s2sub_photo: '원하시는 제품과 유사한 이미지를 올려주세요 (최대 5장)',
    searchPlaceholder: '상품명 검색...',
    uploadBtn: '이미지 업로드',
    uploadHint: 'JPG, PNG, WEBP · 최대 10MB · 최대 5장',
    skipProduct: '상품을 선택하지 않고 진행',
    samplePriceLabel: '샘플 가격',
    samplePriceNote: '대량 주문 시 샘플 비용 전액 환급',
    noSamplePrice: '샘플 가격 문의 필요',
    s3title: '요구사항을 알려주세요',
    s3sub: '원하시는 내용을 자세히 적어주실수록 정확한 견적을 드릴 수 있습니다',
    requirementsLabel: '상세 요구사항 *',
    requirementsPlaceholder: '원하시는 제품 특성, 품질 기준, 특별 요청사항 등을 자유롭게 적어주세요',
    targetUseLabel: '사용 목적 / 판매 채널',
    targetUsePlaceholder: '예: 온라인 쇼핑몰 판매, 기업 판촉물, 소매점 납품 등',
    quoteNote: '💡 견적 요청은 수량과 요구사항만 입력하시면 MD가 가격을 바로 안내해 드립니다.',
    s4title: '주문 옵션을 설정해 주세요',
    s4sub: '정확한 가격 계산을 위해 아래 항목을 입력해 주세요',
    quantityLabel: '희망 주문 수량', quantityPlaceholder: '예: 1000',
    targetPriceLabel: '희망 단가 (CNY)', targetPricePlaceholder: '예: 15',
    packagingLabel: '포장 방식',
    packagingTypes: ['OPP 봉투', '폴리백', '컬러박스', '화이트박스', '크래프트박스', '기타'],
    packagingDetailLabel: '포장 상세 요청',
    packagingDetailPlaceholder: '예: 로고 인쇄, 바코드 부착, 행택 추가 등',
    customLabelLabel: '커스텀 라벨 필요', customBoxLabel: '커스텀 박스 필요', oemLabel: 'OEM 제작 희망',
    printMethodLabel: '인쇄 방식',
    printMethods: ['실크스크린', '열전사', 'UV인쇄', '자수', '레이저각인', '없음'],
    colorLabel: '희망 색상', colorPlaceholder: '예: 빨강, 파랑, 화이트',
    sizeLabel: '희망 사이즈', sizePlaceholder: '예: 20x30cm, S/M/L',
    s5title: '연락처를 입력해 주세요',
    s5sub: '전담 MD가 입력하신 연락처로 24시간 내 연락드립니다',
    nameLabel: '이름 *', namePlaceholder: '홍길동',
    emailLabel: '이메일 *', emailPlaceholder: 'example@company.com',
    phoneLabel: '연락처', phonePlaceholder: '010-1234-5678',
    companyLabel: '회사명', companyPlaceholder: '(주)케릭스',
    countryLabel: '국가',
    preferredContactLabel: '선호 연락 방법',
    preferredContacts: { email: '이메일', phone: '전화', kakao: '카카오톡', wechat: '위챗' },
    privacyNote: '개인정보는 상담 목적으로만 사용되며 안전하게 보호됩니다',
    successTitle: '상담 신청이 완료되었습니다!',
    successSub: '전담 MD가 24시간 내에 연락드립니다',
    successNote: '신청 내용은 이메일로도 발송됩니다',
    closeBtn: '닫기',
    required: '필수 항목입니다',
    emailInvalid: '올바른 이메일 형식이 아닙니다',
    selectAtLeastOne: '하나 이상 선택해 주세요',
    badgeSample: '샘플 요청', badgeQuote: '견적 요청', badgeOem: 'OEM/ODM', badgePhoto: '사진 문의',
    selectedProduct: '선택 상품',
  },
  zh: {
    title: '免费咨询申请',
    subtitle: '专属MD将在24小时内联系您',
    step: (n: number, total: number) => `第 ${n} / ${total} 步`,
    prev: '上一步', next: '下一步', submit: '提交咨询申请', submitting: '提交中...',
    s1title: '您需要什么帮助？',
    s1sub: '请选择所有适用项（可多选）',
    types: {
      want_product_inquiry: { label: '📦 产品咨询', desc: '咨询KERYX平台上已注册的产品' },
      want_sample: { label: '🧪 样品申请', desc: '希望收到产品样品' },
      want_quote: { label: '💰 报价申请', desc: '告知数量和需求，MD将立即提供价格' },
      want_custom_photo: { label: '📸 图片咨询', desc: '上传参考图片，寻找类似产品' },
      want_oem: { label: '🏭 OEM/ODM定制', desc: '希望以自有品牌生产产品' },
    },
    s2title_product: '您对哪款产品感兴趣？',
    s2sub_product: '请选择您感兴趣的产品（选择后将显示样品价格）',
    s2title_photo: '请上传参考图片',
    s2sub_photo: '请上传与您想要的产品相似的图片（最多5张）',
    searchPlaceholder: '搜索产品名称...',
    uploadBtn: '上传图片', uploadHint: 'JPG, PNG, WEBP · 最大10MB · 最多5张',
    skipProduct: '不选择产品，直接继续',
    samplePriceLabel: '样品价格', samplePriceNote: '大量订购时，样品费用全额退还',
    noSamplePrice: '样品价格需咨询',
    s3title: '请告诉我们您的需求',
    s3sub: '描述越详细，我们能提供越准确的报价',
    requirementsLabel: '详细需求 *',
    requirementsPlaceholder: '请自由描述您对产品特性、质量标准、特殊要求等',
    targetUseLabel: '用途 / 销售渠道', targetUsePlaceholder: '例：网络销售、企业礼品、零售店供货等',
    quoteNote: '💡 报价申请只需填写数量和需求，MD将立即为您提供价格。',
    s4title: '请设置订单选项', s4sub: '为了准确计算价格，请填写以下信息',
    quantityLabel: '期望订购数量', quantityPlaceholder: '例：1000',
    targetPriceLabel: '期望单价（CNY）', targetPricePlaceholder: '例：15',
    packagingLabel: '包装方式',
    packagingTypes: ['OPP袋', '透明袋', '彩盒', '白盒', '牛皮纸盒', '其他'],
    packagingDetailLabel: '包装详细要求', packagingDetailPlaceholder: '例：印刷LOGO、贴条形码、添加吊牌等',
    customLabelLabel: '需要定制标签', customBoxLabel: '需要定制包装盒', oemLabel: '希望OEM生产',
    printMethodLabel: '印刷方式',
    printMethods: ['丝网印刷', '热转印', 'UV印刷', '刺绣', '激光雕刻', '无'],
    colorLabel: '期望颜色', colorPlaceholder: '例：红色、蓝色、白色',
    sizeLabel: '期望尺寸', sizePlaceholder: '例：20x30cm, S/M/L',
    s5title: '请输入联系方式', s5sub: '专属MD将在24小时内通过您填写的联系方式与您联系',
    nameLabel: '姓名 *', namePlaceholder: '张三',
    emailLabel: '邮箱 *', emailPlaceholder: 'example@company.com',
    phoneLabel: '联系电话', phonePlaceholder: '+86 138-0000-0000',
    companyLabel: '公司名称', companyPlaceholder: '某某贸易有限公司',
    countryLabel: '国家/地区',
    preferredContactLabel: '首选联系方式',
    preferredContacts: { email: '邮件', phone: '电话', kakao: 'KakaoTalk', wechat: '微信' },
    privacyNote: '您的个人信息仅用于咨询目的，将受到安全保护',
    successTitle: '咨询申请已提交！', successSub: '专属MD将在24小时内联系您',
    successNote: '申请内容也将发送至您的邮箱', closeBtn: '关闭',
    required: '此项为必填项', emailInvalid: '请输入正确的邮箱格式',
    selectAtLeastOne: '请至少选择一项',
    badgeSample: '样品申请', badgeQuote: '报价申请', badgeOem: 'OEM/ODM', badgePhoto: '图片咨询',
    selectedProduct: '已选产品',
  },
}

export default function ConsultationWizard({ products, landingSlug, lang, accentColor = '#667eea', onClose, initialProductId, initialWantSample }: ConsultationWizardProps) {
  const t = T[lang]
  const TOTAL_STEPS = 5
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  // initialProductId/initialWantSample 적용 여부 추적 (중복 적용 방지)
  const [initialApplied, setInitialApplied] = useState(false)

  const [data, setData] = useState<ConsultationData>({
    want_product_inquiry: false, want_sample: initialWantSample ?? false, want_quote: false,
    want_custom_photo: false, want_oem: false,
    product_id: '', product_name_snapshot: '', product_image_snapshot: '',
    product_code_snapshot: '', product_price_snapshot: null, product_sample_cost: null,
    reference_image_urls: [], referenceFiles: [],
    requirements: '', target_use: '',
    quantity: null, target_price_cny: null,
    packaging_type: '', packaging_detail: '',
    custom_label: false, custom_box: false, oem_available: false,
    print_method: '', color_options: '', size_options: '',
    requester_name: '', requester_email: '', requester_phone: '',
    requester_company: '', requester_country: 'KR', preferred_contact: 'email',
  })

  const update = useCallback((field: keyof ConsultationData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const e = { ...prev }; delete e[field as string]; return e })
  }, [])

  const toggleCheck = useCallback((field: keyof ConsultationData) => {
    setData(prev => ({ ...prev, [field]: !prev[field] }))
    setErrors(prev => { const e = { ...prev }; delete e['inquiry_type']; return e })
  }, [])

  const hasAnySelected = data.want_product_inquiry || data.want_sample || data.want_quote || data.want_custom_photo || data.want_oem
  const isQuoteOnly = data.want_quote && !data.want_product_inquiry && !data.want_sample && !data.want_custom_photo && !data.want_oem
  const needsPhotoUpload = data.want_custom_photo && !data.want_product_inquiry && !data.want_sample

  const getInquiryType = useCallback(() => {
    const types: string[] = []
    if (data.want_product_inquiry) types.push('product_inquiry')
    if (data.want_sample) types.push('sample_request')
    if (data.want_quote) types.push('quote_request')
    if (data.want_custom_photo) types.push('custom_photo')
    if (data.want_oem) types.push('oem_odm')
    return types.join(',') || 'general'
  }, [data])

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 5 - data.referenceFiles.length)
    const previews = newFiles.map(f => URL.createObjectURL(f))
    setPreviewImages(prev => [...prev, ...previews])
    update('referenceFiles', [...data.referenceFiles, ...newFiles])
  }, [data.referenceFiles, update])

  const removeImage = useCallback((idx: number) => {
    update('referenceFiles', data.referenceFiles.filter((_, i) => i !== idx))
    setPreviewImages(prev => prev.filter((_, i) => i !== idx))
  }, [data.referenceFiles, update])

  const selectProd = useCallback((p: Product) => {
    setSelectedProduct(p)
    update('product_id', p.id)
    update('product_name_snapshot', lang === 'ko' ? (p.name_ko || p.name_zh) : (p.name_zh || p.name_ko))
    update('product_image_snapshot', p.image_urls?.[0] || p.image_url)
    update('product_code_snapshot', p.product_code)
    update('product_price_snapshot', p.price_cny)
    update('product_sample_cost', p.sample_cost_cny ?? null)
  }, [lang, update])

  // 팝업에서 샘플 신청 시: 상품 목록 로드 후 initialProductId에 해당하는 상품 자동 선택
  useEffect(() => {
    if (initialApplied) return
    if (!initialProductId || products.length === 0) return
    const found = products.find(p => p.id === initialProductId)
    if (found) {
      selectProd(found)
      setInitialApplied(true)
      // want_sample이 true이고 상품이 선택되면 step 1은 이미 완료된 상태이므로 step 2로 이동
      if (initialWantSample) {
        setStep(2)
      }
    }
  }, [initialProductId, initialWantSample, products, initialApplied, selectProd])

  const validate = useCallback((currentStep: number): boolean => {
    const newErrors: Record<string, string> = {}
    if (currentStep === 1 && !hasAnySelected) newErrors.inquiry_type = t.selectAtLeastOne
    if (currentStep === 3 && !data.requirements.trim()) newErrors.requirements = t.required
    if (currentStep === 5) {
      if (!data.requester_name.trim()) newErrors.requester_name = t.required
      if (!data.requester_email.trim()) newErrors.requester_email = t.required
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.requester_email)) newErrors.requester_email = t.emailInvalid
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [data, hasAnySelected, t])

  const handleNext = useCallback(() => { if (validate(step)) setStep(s => Math.min(s + 1, TOTAL_STEPS)) }, [step, validate, TOTAL_STEPS])
  const handlePrev = useCallback(() => setStep(s => Math.max(s - 1, 1)), [])

  const handleSubmit = useCallback(async () => {
    if (!validate(5)) return
    setIsSubmitting(true)
    try {
      let uploadedUrls: string[] = []
      if (data.referenceFiles.length > 0) {
        const fd = new FormData()
        data.referenceFiles.forEach(f => fd.append('files', f))
        const upRes = await fetch('/api/public/consultation/upload', { method: 'POST', body: fd })
        if (upRes.ok) { const upData = await upRes.json(); uploadedUrls = upData.urls ?? [] }
      }
      const res = await fetch('/api/public/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_type: getInquiryType(),
          want_product_inquiry: data.want_product_inquiry,
          want_sample: data.want_sample,
          want_quote: data.want_quote,
          want_custom_photo: data.want_custom_photo,
          want_oem: data.want_oem,
          product_id: data.product_id || null,
          product_name_snapshot: data.product_name_snapshot || null,
          product_image_snapshot: data.product_image_snapshot || null,
          product_code_snapshot: data.product_code_snapshot || null,
          product_price_snapshot: data.product_price_snapshot,
          product_sample_cost: data.product_sample_cost,
          reference_image_urls: uploadedUrls,
          requirements: data.requirements,
          target_use: data.target_use,
          quantity: data.quantity,
          target_price_cny: data.target_price_cny,
          packaging_type: data.packaging_type,
          packaging_detail: data.packaging_detail,
          custom_label: data.custom_label,
          custom_box: data.custom_box,
          oem_available: data.oem_available,
          print_method: data.print_method,
          color_options: data.color_options,
          size_options: data.size_options,
          requester_name: data.requester_name,
          requester_email: data.requester_email,
          requester_phone: data.requester_phone,
          requester_company: data.requester_company,
          requester_country: data.requester_country,
          preferred_contact: data.preferred_contact,
          landing_slug: landingSlug,
          source_url: typeof window !== 'undefined' ? window.location.href : '',
        }),
      })
      if (!res.ok) throw new Error('submit failed')
      setIsSuccess(true)
    } catch {
      setErrors({ submit: lang === 'ko' ? '제출 중 오류가 발생했습니다. 다시 시도해 주세요.' : '提交时出现错误，请重试。' })
    } finally {
      setIsSubmitting(false)
    }
  }, [data, landingSlug, validate, getInquiryType, lang])

  const filteredProducts = products.filter(p =>
    (p.name_ko || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.name_zh || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.product_code || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const Badges = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {data.want_sample && <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-amber-500">🧪 {t.badgeSample}</span>}
      {data.want_quote && <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-emerald-500">💰 {t.badgeQuote}</span>}
      {data.want_oem && <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-purple-500">🏭 {t.badgeOem}</span>}
      {data.want_custom_photo && <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-blue-500">📸 {t.badgePhoto}</span>}
    </div>
  )

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{t.successTitle}</h3>
        <p className="text-gray-600 mb-2">{t.successSub}</p>
        <p className="text-sm text-gray-500 mb-8">{t.successNote}</p>
        <button onClick={onClose} className="px-8 py-3 rounded-xl font-semibold text-white" style={{ background: accentColor }}>
          {t.closeBtn}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
        <p className="text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* 진행 바 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: accentColor }}>{t.step(step, TOTAL_STEPS)}</span>
          <span className="text-sm text-gray-400">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%`, background: accentColor }} />
        </div>
        <div className="flex justify-between mt-2">
          {(lang === 'ko' ? ['유형','상품','요구사항','옵션','연락처'] : ['类型','产品','需求','选项','联系']).map((label, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                style={{
                  background: i + 1 < step ? accentColor : 'transparent',
                  borderColor: i + 1 <= step ? accentColor : '#d1d5db',
                  color: i + 1 < step ? '#fff' : i + 1 === step ? accentColor : '#9ca3af',
                }}>
                {i + 1 < step
                  ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  : i + 1}
              </div>
              <span className="text-xs mt-1 hidden sm:block" style={{ color: i + 1 <= step ? accentColor : '#9ca3af' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 스텝 콘텐츠 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 min-h-[360px]">

        {/* STEP 1: 체크박스 통합 유형 선택 */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{t.s1title}</h3>
            <p className="text-gray-500 text-sm mb-6">{t.s1sub}</p>
            <div className="space-y-3">
              {(Object.entries(t.types) as [keyof ConsultationData, { label: string; desc: string }][]).map(([key, val]) => {
                const isChecked = !!data[key]
                return (
                  <label key={key}
                    className="flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                    style={{ borderColor: isChecked ? accentColor : '#e5e7eb', background: isChecked ? `${accentColor}10` : 'white' }}
                    onClick={() => toggleCheck(key)}>
                    <div className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                      style={{ borderColor: isChecked ? accentColor : '#d1d5db', background: isChecked ? accentColor : 'white' }}>
                      {isChecked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{val.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{val.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
            {errors.inquiry_type && <p className="text-red-500 text-sm mt-3">{errors.inquiry_type}</p>}
            {isQuoteOnly && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">{t.quoteNote}</div>
            )}
          </div>
        )}

        {/* STEP 2: 상품 선택 or 사진 업로드 */}
        {step === 2 && (
          needsPhotoUpload ? (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{t.s2title_photo}</h3>
              <p className="text-gray-500 text-sm mb-6">{t.s2sub_photo}</p>
              <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${previewImages.length >= 5 ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50'}`}>
                <input type="file" accept="image/*" multiple className="hidden" disabled={previewImages.length >= 5} onChange={e => handleFileUpload(e.target.files)} />
                <svg className="w-10 h-10 text-indigo-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-semibold text-gray-700">{t.uploadBtn}</p>
                <p className="text-xs text-gray-400 mt-1">{t.uploadHint}</p>
              </label>
              {previewImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
                  {previewImages.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <Image src={src} alt={`ref-${i}`} fill className="object-cover" />
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{t.s2title_product}</h3>
              <p className="text-gray-500 text-sm mb-4">{t.s2sub_product}</p>
              <Badges />
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {filteredProducts.map(p => {
                  const isSelected = data.product_id === p.id
                  const imgUrl = p.image_urls?.[0] || p.image_url
                  const name = lang === 'ko' ? (p.name_ko || p.name_zh) : (p.name_zh || p.name_ko)
                  return (
                    <button key={p.id} onClick={() => selectProd(p)} className="p-2 rounded-xl border-2 text-left transition-all"
                      style={{ borderColor: isSelected ? accentColor : '#e5e7eb', background: isSelected ? `${accentColor}10` : 'white' }}>
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                        {imgUrl
                          ? <Image src={imgUrl} alt={name} fill className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">¥{p.price_cny || '–'}</p>
                      {p.sample_cost_cny && (
                        <div className="mt-1 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
                          🧪 ¥{p.sample_cost_cny}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedProduct && data.want_sample && (
                <div className="mt-4 p-4 rounded-xl border-2 border-amber-300 bg-amber-50 flex items-center gap-3">
                  <span className="text-2xl">🧪</span>
                  <div>
                    <p className="font-bold text-amber-800 text-sm">{t.samplePriceLabel}</p>
                    {selectedProduct.sample_cost_cny ? (
                      <>
                        <p className="text-2xl font-black text-amber-600">¥{selectedProduct.sample_cost_cny}</p>
                        <p className="text-xs text-amber-600 mt-0.5">{t.samplePriceNote}</p>
                      </>
                    ) : <p className="text-sm text-amber-600">{t.noSamplePrice}</p>}
                  </div>
                </div>
              )}
              <button onClick={() => { update('product_id', ''); setSelectedProduct(null) }} className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline">
                {t.skipProduct}
              </button>
            </>
          )
        )}

        {/* STEP 3: 요구사항 */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{t.s3title}</h3>
            <p className="text-gray-500 text-sm mb-4">{t.s3sub}</p>
            <Badges />
            {data.want_quote && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">{t.quoteNote}</div>
            )}
            {data.product_name_snapshot && (
              <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
                {data.product_image_snapshot && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={data.product_image_snapshot} alt="product" fill className="object-cover" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">{t.selectedProduct}</p>
                  <p className="font-semibold text-gray-800 text-sm">{data.product_name_snapshot}</p>
                  {data.product_sample_cost && data.want_sample && (
                    <p className="text-xs text-amber-600 font-bold">🧪 {t.samplePriceLabel}: ¥{data.product_sample_cost}</p>
                  )}
                </div>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.requirementsLabel}</label>
              <textarea rows={5} placeholder={t.requirementsPlaceholder} value={data.requirements} onChange={e => update('requirements', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none ${errors.requirements ? 'border-red-400' : 'border-gray-300'}`} />
              {errors.requirements && <p className="text-red-500 text-xs mt-1">{errors.requirements}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.targetUseLabel}</label>
              <input type="text" placeholder={t.targetUsePlaceholder} value={data.target_use} onChange={e => update('target_use', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
        )}

        {/* STEP 4: 주문 옵션 */}
        {step === 4 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{t.s4title}</h3>
            <p className="text-gray-500 text-sm mb-4">{t.s4sub}</p>
            <Badges />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.quantityLabel}</label>
                <input type="number" placeholder={t.quantityPlaceholder} value={data.quantity ?? ''}
                  onChange={e => update('quantity', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.targetPriceLabel}</label>
                <input type="number" placeholder={t.targetPricePlaceholder} value={data.target_price_cny ?? ''}
                  onChange={e => update('target_price_cny', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
              </div>
            </div>
            {!isQuoteOnly && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.packagingLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {t.packagingTypes.map(pt => (
                      <button key={pt} onClick={() => update('packaging_type', pt)} className="px-3 py-1.5 rounded-lg text-sm border-2 transition-all"
                        style={{ borderColor: data.packaging_type === pt ? accentColor : '#e5e7eb', background: data.packaging_type === pt ? `${accentColor}15` : 'white', color: data.packaging_type === pt ? accentColor : '#374151', fontWeight: data.packaging_type === pt ? 700 : 400 }}>
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.printMethodLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {t.printMethods.map(pm => (
                      <button key={pm} onClick={() => update('print_method', pm)} className="px-3 py-1.5 rounded-lg text-sm border-2 transition-all"
                        style={{ borderColor: data.print_method === pm ? accentColor : '#e5e7eb', background: data.print_method === pm ? `${accentColor}15` : 'white', color: data.print_method === pm ? accentColor : '#374151', fontWeight: data.print_method === pm ? 700 : 400 }}>
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.colorLabel}</label>
                    <input type="text" placeholder={t.colorPlaceholder} value={data.color_options} onChange={e => update('color_options', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.sizeLabel}</label>
                    <input type="text" placeholder={t.sizePlaceholder} value={data.size_options} onChange={e => update('size_options', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {([['custom_label', t.customLabelLabel], ['custom_box', t.customBoxLabel], ['oem_available', t.oemLabel]] as [keyof ConsultationData, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer" onClick={() => update(key, !data[key])}>
                      <div className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                        style={{ borderColor: data[key] ? accentColor : '#d1d5db', background: data[key] ? accentColor : 'white' }}>
                        {data[key] && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.packagingDetailLabel}</label>
              <input type="text" placeholder={t.packagingDetailPlaceholder} value={data.packaging_detail} onChange={e => update('packaging_detail', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
        )}

        {/* STEP 5: 연락처 */}
        {step === 5 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{t.s5title}</h3>
            <p className="text-gray-500 text-sm mb-4">{t.s5sub}</p>
            <Badges />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.nameLabel}</label>
                <input type="text" placeholder={t.namePlaceholder} value={data.requester_name} onChange={e => update('requester_name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.requester_name ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.requester_name && <p className="text-red-500 text-xs mt-1">{errors.requester_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.emailLabel}</label>
                <input type="email" placeholder={t.emailPlaceholder} value={data.requester_email} onChange={e => update('requester_email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 ${errors.requester_email ? 'border-red-400' : 'border-gray-300'}`} />
                {errors.requester_email && <p className="text-red-500 text-xs mt-1">{errors.requester_email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.phoneLabel}</label>
                <input type="tel" placeholder={t.phonePlaceholder} value={data.requester_phone} onChange={e => update('requester_phone', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.companyLabel}</label>
                <input type="text" placeholder={t.companyPlaceholder} value={data.requester_company} onChange={e => update('requester_company', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.preferredContactLabel}</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(t.preferredContacts) as [string, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => update('preferred_contact', key)} className="px-4 py-2 rounded-lg text-sm border-2 transition-all"
                    style={{ borderColor: data.preferred_contact === key ? accentColor : '#e5e7eb', background: data.preferred_contact === key ? `${accentColor}15` : 'white', color: data.preferred_contact === key ? accentColor : '#374151', fontWeight: data.preferred_contact === key ? 700 : 400 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {t.privacyNote}
            </p>
            {errors.submit && <p className="text-red-500 text-sm mt-3">{errors.submit}</p>}
          </div>
        )}
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex justify-between mt-6">
        <button onClick={handlePrev} disabled={step === 1} className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          ← {t.prev}
        </button>
        {step < TOTAL_STEPS ? (
          <button onClick={handleNext} className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90" style={{ background: accentColor }}>
            {t.next} →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ background: accentColor }}>
            {isSubmitting ? t.submitting : t.submit}
          </button>
        )}
      </div>
    </div>
  )
}
