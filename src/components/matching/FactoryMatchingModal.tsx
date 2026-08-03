'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  isOpen?: boolean
  onClose: () => void
  onSuccess?: () => void
  lang?: 'ko' | 'zh'
  userId?: string
}

const TEXTS = {
  ko: {
    title: '공장 매칭 신청서',
    subtitle: '원하시는 제품을 상세히 알려주세요',
    step1: '신청서',
    step2: '사업 정보',
    step3: '우선순위',
    step4: '연락처',
    next: '다음',
    prev: '이전',
    submit: '신청 완료',
    submitting: '신청 중...',
    // Step 1
    s1_title: '1. 원하시는 제품을 알려주세요 *',
    s1_hint: '소재, 색상, 크기, 수량, 예산 등 자세하게 작성할수록 정확한 매칭이 됩니다',
    s1_placeholder: '예) 귀여운 캐릭터 인형, 20cm, 부드러운 소재, 1,000개, 개당 3,000원 이내...',
    s1_category: '제품 카테고리',
    s1_cat_options: ['완구·굿즈', '인형·봉제', '키링·액세서리', '가방·파우치', '문구·팬시', '생활용품', '뷰티·잡화', '기타'],
    s1_moq: '희망 최소 수량 (MOQ)',
    s1_price: '희망 단가 (CNY)',
    s1_package: '3. 인쇄 패키지를 원하시나요?',
    s1_package_yes: '네, 원합니다',
    s1_package_no: '아니요',
    s1_region: '희망 공장 지역 (선택)',
    s1_region_placeholder: '예) 광저우, 이우, 항저우 등',
    // Step 2
    s2_title: '2. 이 제품으로 원하시는 사업을 설명해주세요 *',
    s2_options: ['판촉물', '1회성 구매', '장기 판매 (대리점)', '온라인 쇼핑몰', '기업 선물', '기타'],
    s2_scale: '월 예상 주문 규모',
    s2_scale_options: ['100개 미만', '100~500개', '500~2,000개', '2,000~10,000개', '10,000개 이상'],
    s2_market: '판매 대상 국가/지역',
    s2_market_options: ['한국', '일본', '동남아', '유럽', '북미', '기타'],
    s2_ip: 'IP 라이선스 보유 여부',
    s2_ip_yes: '보유 (캐릭터명 입력)',
    s2_ip_no: '없음',
    s2_ip_name: 'IP/캐릭터 이름',
    // Step 3
    s3_title: '3. 공장 선정 우선순위를 설정해주세요',
    s3_hint: '슬라이더를 조정하여 중요도를 설정하세요 (합계 100%)',
    s3_price: '가격 경쟁력',
    s3_quality: '품질',
    s3_delivery: '납기 속도',
    s3_stability: '공급 안정성',
    s3_grade: '희망 품질 등급',
    s3_grade_options: ['A급 (최고급)', 'B급 (표준)', 'C급 (경제형)'],
    s3_certs: '필요 인증',
    s3_cert_options: ['CE', 'ASTM', 'EN71', 'ISO9001', 'BSCI', '없음'],
    s3_ip_audit: 'IP 감사 필요 여부',
    // Step 4
    s4_title: '4. 연락처를 남겨주세요',
    s4_hint: '비상 또는 급한 업무일 때만 문자로 알림 연락 드립니다',
    s4_company: '회사/상호명 *',
    s4_contact: '담당자 성함 *',
    s4_phone: '연락처 (선택)',
    s4_email: '이메일 (선택)',
    s4_wechat: '위챗 ID (선택)',
    s4_tier_title: '🎁 정기 회원이 되시면 드리는 특전',
    s4_tier_hint: '회원 가입 시 더 많은 혜택을 받으실 수 있습니다',
    s4_tiers: [
      { id: 'free', name: '무료', price: '0 CNY', features: ['공장 매칭 1회/월', '시장조사 3건/월'] },
      { id: 'basic', name: '베이직', price: '300 CNY/월', features: ['공장 매칭 2회/월', '시장조사 10건/월', '우선 처리'] },
      { id: 'pro', name: '프로', price: '500 CNY/월', features: ['공장 매칭 4회/월', '시장조사 무제한', '전담 MD 배정', '샘플 비용 지원'] },
    ],
    success_title: '신청이 완료되었습니다!',
    success_msg: '담당 MD가 검토 후 1~2 영업일 내에 연락드리겠습니다.',
    success_close: '닫기',
  },
  zh: {
    title: '工厂匹配申请',
    subtitle: '请详细描述您需要的产品',
    step1: '申请表',
    step2: '业务信息',
    step3: '优先级',
    step4: '联系方式',
    next: '下一步',
    prev: '上一步',
    submit: '提交申请',
    submitting: '提交中...',
    s1_title: '1. 请告诉我们您需要的产品 *',
    s1_hint: '材质、颜色、尺寸、数量、预算等，描述越详细匹配越准确',
    s1_placeholder: '例）可爱卡通玩偶，20cm，柔软材质，1000个，单价3元以内...',
    s1_category: '产品类别',
    s1_cat_options: ['玩具·周边', '玩偶·毛绒', '挂件·配饰', '包袋·收纳', '文具·精品', '生活用品', '美妆·杂货', '其他'],
    s1_moq: '最低起订量 (MOQ)',
    s1_price: '目标单价 (CNY)',
    s1_package: '3. 是否需要印刷包装？',
    s1_package_yes: '是，需要',
    s1_package_no: '不需要',
    s1_region: '希望工厂地区（可选）',
    s1_region_placeholder: '例）广州、义乌、杭州等',
    s2_title: '2. 请说明您的业务需求 *',
    s2_options: ['促销品', '一次性采购', '长期销售（代理商）', '网络商城', '企业礼品', '其他'],
    s2_scale: '月预计订单规模',
    s2_scale_options: ['100个以下', '100~500个', '500~2000个', '2000~10000个', '10000个以上'],
    s2_market: '销售目标国家/地区',
    s2_market_options: ['韩国', '日本', '东南亚', '欧洲', '北美', '其他'],
    s2_ip: '是否持有IP授权',
    s2_ip_yes: '持有（请输入角色名）',
    s2_ip_no: '没有',
    s2_ip_name: 'IP/角色名称',
    s3_title: '3. 请设置工厂筛选优先级',
    s3_hint: '调整滑块设置重要度（合计100%）',
    s3_price: '价格竞争力',
    s3_quality: '品质',
    s3_delivery: '交期速度',
    s3_stability: '供货稳定性',
    s3_grade: '期望品质等级',
    s3_grade_options: ['A级（顶级）', 'B级（标准）', 'C级（经济型）'],
    s3_certs: '所需认证',
    s3_cert_options: ['CE', 'ASTM', 'EN71', 'ISO9001', 'BSCI', '无'],
    s3_ip_audit: '是否需要IP审核',
    s4_title: '4. 请留下联系方式',
    s4_hint: '仅在紧急情况下通过短信联系您',
    s4_company: '公司/商号 *',
    s4_contact: '联系人姓名 *',
    s4_phone: '联系电话（可选）',
    s4_email: '邮箱（可选）',
    s4_wechat: '微信号（可选）',
    s4_tier_title: '🎁 成为会员享受更多优惠',
    s4_tier_hint: '注册会员后可享受更多专属权益',
    s4_tiers: [
      { id: 'free', name: '免费', price: '0 CNY', features: ['工厂匹配 1次/月', '市场调研 3次/月'] },
      { id: 'basic', name: '基础版', price: '300 CNY/月', features: ['工厂匹配 2次/月', '市场调研 10次/月', '优先处理'] },
      { id: 'pro', name: '专业版', price: '500 CNY/月', features: ['工厂匹配 4次/月', '市场调研 无限次', '专属MD服务', '样品费用支持'] },
    ],
    success_title: '申请已提交！',
    success_msg: '专属MD审核后将在1-2个工作日内与您联系。',
    success_close: '关闭',
  },
}

export default function FactoryMatchingModal({ isOpen, onClose, onSuccess, lang = 'ko', userId }: Props): React.ReactPortal | null {
  const t = TEXTS[lang]
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // 단계 변경 시 스크롤 최상단으로 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [step])

  // Form state
  const [form, setForm] = useState({
    // Step 1
    product_desc: '',
    product_category: '',
    moq: '',
    target_price: '',
    need_package: false,
    preferred_region: '',
    // Step 2
    business_type: '',
    monthly_order_scale: '',
    target_markets: [] as string[],
    has_ip_license: false,
    ip_license_name: '',
    // Step 3
    priority_price: 25,
    priority_quality: 25,
    priority_delivery: 25,
    priority_stability: 25,
    quality_grade: '',
    required_certs: [] as string[],
    need_ip_audit: false,
    // Step 4
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    wechat_id: '',
    selected_tier: '',
  })

  // isOpen이 true일 때만 표시 (undefined 또는 false이면 숨김)
  if (!isOpen) return null

  const totalPriority = form.priority_price + form.priority_quality + form.priority_delivery + form.priority_stability

  const updatePriority = (field: string, value: number) => {
    const others = ['priority_price', 'priority_quality', 'priority_delivery', 'priority_stability'].filter(f => f !== field)
    const remaining = 100 - value
    const perOther = Math.floor(remaining / 3)
    const extra = remaining - perOther * 3
    const newVals: Record<string, number> = { [field]: value }
    others.forEach((f, i) => { newVals[f] = perOther + (i === 0 ? extra : 0) })
    setForm(prev => ({ ...prev, ...newVals }))
  }

  const toggleArrayItem = (field: 'target_markets' | 'required_certs', item: string) => {
    setForm(prev => {
      const arr = prev[field] as string[]
      return { ...prev, [field]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] }
    })
  }

  const validateStep = () => {
    const newErrors: Record<string, string> = {}
    if (step === 1 && !form.product_desc.trim()) newErrors.product_desc = lang === 'ko' ? '제품 설명을 입력해주세요' : '请输入产品描述'
    if (step === 2 && !form.business_type) newErrors.business_type = lang === 'ko' ? '사업 유형을 선택해주세요' : '请选择业务类型'
    if (step === 4) {
      if (!form.company_name.trim()) newErrors.company_name = lang === 'ko' ? '회사명을 입력해주세요' : '请输入公司名'
      if (!form.contact_name.trim()) newErrors.contact_name = lang === 'ko' ? '담당자명을 입력해주세요' : '请输入联系人姓名'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep(s => Math.min(s + 1, 4))
  }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/matching/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_id: userId || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSubmitted(true)
      if (onSuccess) setTimeout(onSuccess, 2000)
    } catch (err) {
      alert(lang === 'ko' ? '신청 중 오류가 발생했습니다. 다시 시도해주세요.' : '提交时发生错误，请重试。')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">🔗 {t.title}</h2>
            <p className="text-purple-200 text-sm mt-1">{t.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none ml-4">×</button>
        </div>

        {/* Step indicator */}
        {!submitted && (
          <div className="px-5 py-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    s === step ? 'bg-purple-600 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {s < step ? '✓' : s}
                  </div>
                  <span className={`ml-1 text-xs hidden sm:inline ${s === step ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
                    {[t.step1, t.step2, t.step3, t.step4][s - 1]}
                  </span>
                  {s < 4 && <div className={`w-6 h-0.5 mx-2 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t.success_title}</h3>
              <p className="text-gray-500 mb-6">{t.success_msg}</p>
              <button onClick={onClose} className="bg-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors">
                {t.success_close}
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              {/* 안내 메시지 박스 */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏭</span>
                  <div>
                    <p className="text-sm font-bold text-purple-800">
                      {lang === 'ko' ? '고객님만의 공장을 매칭해 드립니다' : '为您专属匹配工厂'}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      {lang === 'ko'
                        ? '고객님의 공장이 될 수 있는 소중한 생산 공급파트너를 매칭해드립니다.'
                        : '为您匹配能成为您专属工厂的优质生产供应合作伙伴。'}
                    </p>
                  </div>
                </div>
                <blockquote className="mt-3 pl-3 border-l-2 border-purple-300 text-xs text-purple-700">
                  {lang === 'ko'
                    ? '한번에 완벽하진 않겠지만 저희는 장단기적으로 고객님에게 꼭 필요한 공장들을 매칭시켜드릴 것입니다.'
                    : '虽然一次可能无法完美，但我们会从短期和长期角度，为您匹配最适合的工厂。'}
                </blockquote>
                <p className="mt-2 text-xs text-gray-500">
                  {lang === 'ko'
                    ? '주요품목을 자세하게 알려주시면 적합한 공장을 찾아 매칭해드리겠습니다.'
                    : '请详细告知主要品类，我们将为您寻找并匹配合适的工厂。'}
                </p>
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                  {lang === 'ko'
                    ? '공장매칭이 되면 공장에서는 공장의 환경, 주요제품, 기계설비 등을 보실 수 있도록 자세한 정보를 드릴 것입니다. 샘플 구매 등 테스트 오더를 해보시고 좋은 파트너로 연결되길 기원합니다.'
                    : '匹配成功后，工厂将提供详细信息，包括工厂环境、主要产品、机械设备等。欢迎通过样品采购等测试订单，期待与您建立良好的合作关系。'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t.s1_title}</label>
                <p className="text-xs text-gray-400 mb-2">{t.s1_hint}</p>
                <textarea
                  rows={4}
                  value={form.product_desc}
                  onChange={e => setForm(p => ({ ...p, product_desc: e.target.value }))}
                  placeholder={t.s1_placeholder}
                  className={`w-full border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 ${errors.product_desc ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.product_desc && <p className="text-red-500 text-xs mt-1">{errors.product_desc}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s1_category}</label>
                <div className="grid grid-cols-2 gap-2">
                  {t.s1_cat_options.map(cat => (
                    <button key={cat} onClick={() => setForm(p => ({ ...p, product_category: cat }))}
                      className={`py-2 px-3 rounded-xl text-sm border transition-all ${form.product_category === cat ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t.s1_moq}</label>
                  <input type="number" value={form.moq} onChange={e => setForm(p => ({ ...p, moq: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="1000" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t.s1_price}</label>
                  <input type="number" value={form.target_price} onChange={e => setForm(p => ({ ...p, target_price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="5.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s1_package}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setForm(p => ({ ...p, need_package: v }))}
                      className={`py-2.5 rounded-xl text-sm border transition-all ${form.need_package === v ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {v ? t.s1_package_yes : t.s1_package_no}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t.s1_region}</label>
                <input type="text" value={form.preferred_region} onChange={e => setForm(p => ({ ...p, preferred_region: e.target.value }))}
                  placeholder={t.s1_region_placeholder}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s2_title}</label>
                {errors.business_type && <p className="text-red-500 text-xs mb-2">{errors.business_type}</p>}
                <div className="space-y-2">
                  {t.s2_options.map(opt => (
                    <button key={opt} onClick={() => setForm(p => ({ ...p, business_type: opt }))}
                      className={`w-full py-3 px-4 rounded-xl text-sm border text-left transition-all ${form.business_type === opt ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s2_scale}</label>
                <select value={form.monthly_order_scale} onChange={e => setForm(p => ({ ...p, monthly_order_scale: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">선택</option>
                  {t.s2_scale_options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s2_market}</label>
                <div className="flex flex-wrap gap-2">
                  {t.s2_market_options.map(m => (
                    <button key={m} onClick={() => toggleArrayItem('target_markets', m)}
                      className={`py-1.5 px-3 rounded-full text-sm border transition-all ${form.target_markets.includes(m) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s2_ip}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setForm(p => ({ ...p, has_ip_license: v }))}
                      className={`py-2.5 rounded-xl text-sm border transition-all ${form.has_ip_license === v ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {v ? t.s2_ip_yes : t.s2_ip_no}
                    </button>
                  ))}
                </div>
                {form.has_ip_license && (
                  <input type="text" value={form.ip_license_name} onChange={e => setForm(p => ({ ...p, ip_license_name: e.target.value }))}
                    placeholder={t.s2_ip_name} className="mt-2 w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                )}
              </div>
            </div>
          ) : step === 3 ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t.s3_title}</label>
                <p className="text-xs text-gray-400 mb-3">{t.s3_hint} — {lang === 'ko' ? '현재 합계' : '当前合计'}: <span className={totalPriority === 100 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{totalPriority}%</span></p>
                {[
                  { key: 'priority_price', label: t.s3_price },
                  { key: 'priority_quality', label: t.s3_quality },
                  { key: 'priority_delivery', label: t.s3_delivery },
                  { key: 'priority_stability', label: t.s3_stability },
                ].map(({ key, label }) => (
                  <div key={key} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-bold text-purple-600">{form[key as keyof typeof form]}%</span>
                    </div>
                    <input type="range" min={5} max={70} step={5}
                      value={form[key as keyof typeof form] as number}
                      onChange={e => updatePriority(key, parseInt(e.target.value))}
                      className="w-full accent-purple-600" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s3_grade}</label>
                <div className="grid grid-cols-3 gap-2">
                  {t.s3_grade_options.map(g => (
                    <button key={g} onClick={() => setForm(p => ({ ...p, quality_grade: g }))}
                      className={`py-2 rounded-xl text-xs border transition-all ${form.quality_grade === g ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.s3_certs}</label>
                <div className="flex flex-wrap gap-2">
                  {t.s3_cert_options.map(c => (
                    <button key={c} onClick={() => toggleArrayItem('required_certs', c)}
                      className={`py-1.5 px-3 rounded-full text-sm border transition-all ${form.required_certs.includes(c) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(p => ({ ...p, need_ip_audit: !p.need_ip_audit }))}
                  className={`w-12 h-6 rounded-full transition-all ${form.need_ip_audit ? 'bg-purple-600' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.need_ip_audit ? 'translate-x-6' : ''}`} />
                </button>
                <span className="text-sm text-gray-600">{t.s3_ip_audit}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t.s4_title}</label>
                <p className="text-xs text-gray-400 mb-3">{t.s4_hint}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.s4_company}</label>
                  <input type="text" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                    className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 ${errors.company_name ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.s4_contact}</label>
                  <input type="text" value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                    className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 ${errors.contact_name ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors.contact_name && <p className="text-red-500 text-xs mt-1">{errors.contact_name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.s4_phone}</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="010-0000-0000" className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{t.s4_email}</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com" className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t.s4_wechat}</label>
                <input type="text" value={form.wechat_id} onChange={e => setForm(p => ({ ...p, wechat_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              {/* 멤버십 특전 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <h4 className="font-bold text-amber-800 mb-1">{t.s4_tier_title}</h4>
                <p className="text-xs text-amber-600 mb-3">{t.s4_tier_hint}</p>
                <div className="grid grid-cols-3 gap-2">
                  {t.s4_tiers.map(tier => (
                    <button key={tier.id} onClick={() => setForm(p => ({ ...p, selected_tier: tier.id }))}
                      className={`p-2 rounded-xl border text-left transition-all ${form.selected_tier === tier.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-amber-200 hover:border-amber-400'}`}>
                      <div className="font-bold text-xs mb-1">{tier.name}</div>
                      <div className={`text-xs mb-1 ${form.selected_tier === tier.id ? 'text-amber-100' : 'text-amber-600'}`}>{tier.price}</div>
                      {tier.features.map(f => (
                        <div key={f} className={`text-xs ${form.selected_tier === tier.id ? 'text-amber-100' : 'text-gray-500'}`}>• {f}</div>
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {!submitted && (
          <div className="p-4 border-t bg-gray-50 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                ← {t.prev}
              </button>
            )}
            {step < 4 ? (
              <button onClick={handleNext}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
                {t.next} →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-60">
                {submitting ? t.submitting : `🚀 ${t.submit}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  , document.body)
}