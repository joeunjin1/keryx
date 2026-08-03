'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

type Lang = 'ko' | 'zh';

const VISIT_PACKAGES = [
  {
    id: 'standard',
    icon: '🏭',
    name: { ko: '스탠다드 방문', zh: '标准参观' },
    badge: { ko: 'VIP PRO 포함', zh: 'VIP PRO包含' },
    badgeColor: 'bg-orange-100 text-orange-700',
    price: { ko: '연 2회 포함', zh: '每年2次包含' },
    priceNote: { ko: 'VIP PRO 구독 시 포함', zh: 'VIP PRO订阅包含' },
    duration: { ko: '1일 (8시간)', zh: '1天（8小时）' },
    features: {
      ko: ['공장 1~2곳 방문', '품질 현장 확인', '가격 협상 지원', '통역 서비스 포함', '방문 보고서 제공', '샘플 수령 대행'],
      zh: ['参观1-2家工厂', '现场质量确认', '价格谈判支持', '包含翻译服务', '提供参观报告', '代收样品'],
    },
    color: 'from-orange-500 to-yellow-500',
    recommended: false,
  },
  {
    id: 'premium',
    icon: '🌟',
    name: { ko: '프리미엄 방문', zh: '高级参观' },
    badge: { ko: '별도 신청', zh: '单独申请' },
    badgeColor: 'bg-purple-100 text-purple-700',
    price: { ko: '¥1,500~', zh: '¥1,500起' },
    priceNote: { ko: '2일 패키지 / 공장 3~5곳', zh: '2天套餐 / 3-5家工厂' },
    duration: { ko: '2일 (16시간)', zh: '2天（16小时）' },
    features: {
      ko: ['공장 3~5곳 방문', '전담 통역사 배정', '숙박 안내 서비스', '공장 사전 검증 보고서', '가격 협상 전략 제공', '샘플 배송 대행', '방문 후 MD 컨설팅'],
      zh: ['参观3-5家工厂', '专属翻译分配', '住宿指引服务', '工厂预验证报告', '提供价格谈判策略', '代办样品配送', '参观后MD咨询'],
    },
    color: 'from-purple-600 to-indigo-600',
    recommended: true,
  },
  {
    id: 'vip',
    icon: '👑',
    name: { ko: 'VIP 투어', zh: 'VIP参观团' },
    badge: { ko: '그룹 투어', zh: '团体参观' },
    badgeColor: 'bg-yellow-100 text-yellow-700',
    price: { ko: '¥2,500~', zh: '¥2,500起' },
    priceNote: { ko: '3일 패키지 / 공장 5~8곳', zh: '3天套餐 / 5-8家工厂' },
    duration: { ko: '3일 (24시간)', zh: '3天（24小时）' },
    features: {
      ko: ['공장 5~8곳 방문', '전담 MD + 통역사', '교통·숙박 풀패키지', '공장별 심층 검증', '현장 계약 지원', '샘플 배송 전량 대행', '귀국 후 종합 보고서', '6개월 사후 관리'],
      zh: ['参观5-8家工厂', '专属MD+翻译', '交通住宿全包', '各工厂深度验证', '现场合同支持', '全量样品配送代办', '回国后综合报告', '6个月售后管理'],
    },
    color: 'from-yellow-500 to-orange-600',
    recommended: false,
  },
];

const PROCESS_STEPS = [
  {
    step: 1,
    icon: '📋',
    title: { ko: '방문 신청', zh: '申请参观' },
    desc: { ko: '원하는 카테고리, 방문 희망 날짜, 예산을 입력하여 신청합니다.', zh: '填写希望参观的类别、日期和预算提交申请。' },
  },
  {
    step: 2,
    icon: '🔍',
    title: { ko: '공장 사전 검증', zh: '工厂预验证' },
    desc: { ko: '전담 MD가 방문 전 공장 자격증, 생산 능력, 품질 이력을 검토합니다.', zh: '专属MD在参观前审查工厂资质、生产能力和质量记录。' },
  },
  {
    step: 3,
    icon: '📅',
    title: { ko: '일정 확정', zh: '确认行程' },
    desc: { ko: '검증된 공장 목록과 방문 일정, 이동 경로를 확정하고 안내드립니다.', zh: '确认经过验证的工厂名单、参观日程和路线，并通知您。' },
  },
  {
    step: 4,
    icon: '✈️',
    title: { ko: '현지 방문', zh: '实地参观' },
    desc: { ko: '전담 통역사와 함께 공장을 방문하여 품질 확인, 가격 협상을 진행합니다.', zh: '与专属翻译一起参观工厂，进行质量确认和价格谈判。' },
  },
  {
    step: 5,
    icon: '📦',
    title: { ko: '샘플 수령', zh: '接收样品' },
    desc: { ko: '현장에서 샘플을 수령하여 한국으로 배송해 드립니다.', zh: '现场接收样品并配送至韩国。' },
  },
  {
    step: 6,
    icon: '📊',
    title: { ko: '방문 보고서', zh: '参观报告' },
    desc: { ko: '방문한 공장별 상세 보고서(품질, 가격, 납기, 추천도)를 제공합니다.', zh: '提供各工厂详细报告（质量、价格、交期、推荐度）。' },
  },
];

const INCLUDED_SERVICES = [
  { icon: '🗣️', title: { ko: '전담 통역', zh: '专属翻译' }, desc: { ko: '한국어-중국어 전문 통역사 동행', zh: '韩中专业翻译陪同' } },
  { icon: '🚗', title: { ko: '교통 지원', zh: '交通支持' }, desc: { ko: '공장 간 이동 차량 제공', zh: '提供工厂间交通车辆' } },
  { icon: '🏨', title: { ko: '숙박 안내', zh: '住宿指引' }, desc: { ko: '현지 숙박 예약 및 안내', zh: '当地住宿预订及指引' } },
  { icon: '📋', title: { ko: '사전 검증', zh: '预验证' }, desc: { ko: '방문 전 공장 자격 검증', zh: '参观前工厂资质验证' } },
  { icon: '💰', title: { ko: '가격 협상', zh: '价格谈判' }, desc: { ko: 'MD 동행 가격 협상 지원', zh: 'MD陪同价格谈判支持' } },
  { icon: '📦', title: { ko: '샘플 대행', zh: '样品代办' }, desc: { ko: '샘플 수령 및 한국 배송', zh: '样品接收及韩国配送' } },
  { icon: '📊', title: { ko: '방문 보고서', zh: '参观报告' }, desc: { ko: '공장별 상세 분석 보고서', zh: '各工厂详细分析报告' } },
  { icon: '📞', title: { ko: '사후 관리', zh: '售后管理' }, desc: { ko: '방문 후 MD 지속 관리', zh: '参观后MD持续管理' } },
];

const VISIT_REGIONS = [
  { city: { ko: '이우(义乌)', zh: '义乌' }, specialty: { ko: '소품·완구·굿즈·키링', zh: '小商品·玩具·周边·钥匙扣' }, icon: '🎁' },
  { city: { ko: '광저우(广州)', zh: '广州' }, specialty: { ko: '패션·잡화·뷰티·생활용품', zh: '时尚·杂货·美妆·生活用品' }, icon: '👗' },
  { city: { ko: '선전(深圳)', zh: '深圳' }, specialty: { ko: '전자제품·스마트기기', zh: '电子产品·智能设备' }, icon: '📱' },
  { city: { ko: '닝보(宁波)', zh: '宁波' }, specialty: { ko: '인형·봉제·완구', zh: '玩偶·毛绒·玩具' }, icon: '🧸' },
  { city: { ko: '항저우(杭州)', zh: '杭州' }, specialty: { ko: '패션·의류·직물', zh: '时尚·服装·纺织' }, icon: '👘' },
  { city: { ko: '포산(佛山)', zh: '佛山' }, specialty: { ko: '가구·인테리어·세라믹', zh: '家具·室内·陶瓷' }, icon: '🏠' },
];

const TESTIMONIALS = [
  {
    name: { ko: '김○○ 대표', zh: '金总' },
    company: { ko: '서울 완구 유통', zh: '首尔玩具批发' },
    text: {
      ko: '이우 공장 방문 투어를 통해 기존 거래처보다 30% 저렴한 공장을 찾았습니다. 통역과 MD 지원이 정말 큰 도움이 됐어요.',
      zh: '通过义乌工厂参观，找到了比现有供应商便宜30%的工厂。翻译和MD支持真的帮了大忙。',
    },
    rating: 5,
  },
  {
    name: { ko: '박○○ 팀장', zh: '朴组长' },
    company: { ko: '부산 굿즈 기획사', zh: '釜山周边策划公司' },
    text: {
      ko: '공장 사전 검증 보고서가 특히 유용했습니다. 불량 공장을 미리 걸러내고 신뢰할 수 있는 파트너를 찾을 수 있었습니다.',
      zh: '工厂预验证报告特别有用。提前筛除了不良工厂，找到了可信赖的合作伙伴。',
    },
    rating: 5,
  },
  {
    name: { ko: '이○○ 대표', zh: '李总' },
    company: { ko: '인천 수입 무역', zh: '仁川进口贸易' },
    text: {
      ko: '샘플 수령부터 한국 배송까지 모두 대행해 주셔서 직접 들고 오는 번거로움이 없었습니다. 다음에도 꼭 이용할 예정입니다.',
      zh: '从样品接收到韩国配送全程代办，省去了亲自携带的麻烦。下次一定还会使用。',
    },
    rating: 5,
  },
];

export default function FactoryVisitPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [applyForm, setApplyForm] = useState({
    name: '', company: '', email: '', phone: '',
    category: '', visitDate: '', budget: '', note: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const t = (ko: string, zh: string) => lang === 'ko' ? ko : zh;

  const handleApply = (pkgId: string) => {
    setSelectedPackage(pkgId);
    setShowApplyModal(true);
    setSubmitted(false);
  };

  const handleSubmitApply = async () => {
    if (!applyForm.name || !applyForm.email) {
      alert(t('이름과 이메일을 입력해주세요.', '请填写姓名和邮箱。'));
      return;
    }
    // 실제 구현 시 Supabase에 저장
    setSubmitted(true);
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col pb-16">

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/shop" className="flex items-center gap-2">
            <Image src="/logos/logo-horizontal.png" alt="KERYX" width={160} height={40} style={{ objectFit: 'contain' }} priority />
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'ko' ? 'zh' : 'ko')}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              {lang === 'ko' ? '中文' : '한국어'}
            </button>
            <Link href="/membership" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
              {t('멤버십 보기', '查看会员')}
            </Link>
          </div>
        </div>
      </header>


      <section className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
              />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-2 text-yellow-400 text-sm font-semibold mb-6">
                <span>🏢</span>
                <span>{t('중국 현지 공장 방문 서비스', '中国工厂实地参观服务')}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
                {t('중국 공장을', '直接去中国工厂')}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                  {t('직접 눈으로 확인하세요', '亲眼确认')}
                </span>
              </h1>
              <p className="text-gray-300 text-lg mb-8 max-w-xl">
                {t(
                  '전담 통역사·MD와 함께 중국 현지 공장을 방문하여 품질 확인, 가격 협상, 샘플 수령까지 원스톱으로 해결하세요.',
                  '与专属翻译和MD一起赴中国工厂，品质确认、价格谈判、样品接收一站式解决。'
                )}
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-400">✓</span>
                  {t('5,200+ 검증 공장', '5,200+家认证工厂')}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-400">✓</span>
                  {t('전담 통역사 동행', '专属翻译陪同')}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-400">✓</span>
                  {t('방문 보고서 제공', '提供参观报告')}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleApply('premium')}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold text-base hover:from-yellow-600 hover:to-orange-600 shadow-lg"
                >
                  {t('방문 신청하기 →', '申请参观 →')}
                </button>
                <Link href="/membership" className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold text-base hover:bg-white/20">
                  {t('VIP PRO 멤버십', 'VIP PRO会员')}
                </Link>
              </div>
            </div>
            <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
              {[
                { num: '5,200+', label: { ko: '검증 공장', zh: '认证工厂' } },
                { num: '98%', label: { ko: '고객 만족도', zh: '客户满意度' } },
                { num: '6', label: { ko: '주요 방문 도시', zh: '主要参观城市' } },
                { num: '3년+', label: { ko: '서비스 운영', zh: '服务运营' } },
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-4 min-w-[110px]">
                  <div className="text-2xl font-black text-yellow-400">{stat.num}</div>
                  <div className="text-xs text-gray-300 mt-1">{stat.label[lang]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{t('방문 패키지 선택', '选择参观套餐')}</h2>
        <p className="text-center text-gray-500 text-sm mb-8">{t('목적과 예산에 맞는 패키지를 선택하세요', '根据目的和预算选择套餐')}</p>
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VISIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={'relative rounded-2xl border-2 p-6 shadow-sm bg-white ' + (pkg.recommended ? 'border-purple-400 ring-2 ring-purple-400 ring-offset-2' : 'border-gray-200')}
            >
              {pkg.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {t('가장 인기', '最受欢迎')}
                </div>
              )}
              <div className={'bg-gradient-to-r ' + pkg.color + ' rounded-xl p-4 mb-4'}>
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{pkg.icon}</span>
                  <span className={'text-xs font-bold px-2 py-1 rounded-full ' + pkg.badgeColor}>{pkg.badge[lang]}</span>
                </div>
                <h3 className="text-xl font-black text-white mt-2">{pkg.name[lang]}</h3>
                <div className="text-white font-bold text-lg mt-1">{pkg.price[lang]}</div>
                <div className="text-white/70 text-xs mt-0.5">{pkg.priceNote[lang]}</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span>⏱️</span>
                <span>{pkg.duration[lang]}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {pkg.features[lang].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleApply(pkg.id)}
                className={'w-full py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r ' + pkg.color + ' hover:opacity-90'}
              >
                {t('이 패키지로 신청 →', '选择此套餐申请 →')}
              </button>
            </div>
          ))}
        </div>
      </section>


      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{t('포함 서비스', '包含服务')}</h2>
          <p className="text-center text-gray-500 text-sm mb-8">{t('방문 서비스에 포함된 모든 지원', '参观服务包含的所有支持')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INCLUDED_SERVICES.map((svc, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-3xl mb-2">{svc.icon}</div>
                <div className="font-bold text-gray-900 text-sm">{svc.title[lang]}</div>
                <div className="text-xs text-gray-500 mt-1">{svc.desc[lang]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{t('방문 진행 프로세스', '参观流程')}</h2>
        <p className="text-center text-gray-500 text-sm mb-10">{t('신청부터 보고서 수령까지 6단계', '从申请到报告接收共6步')}</p>
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROCESS_STEPS.map((step) => (
            <div key={step.step} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm">
                {step.step}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{step.icon}</span>
                  <h3 className="font-bold text-gray-900">{step.title[lang]}</h3>
                </div>
                <p className="text-sm text-gray-600">{step.desc[lang]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      <section className="bg-gradient-to-br from-slate-800 to-gray-900 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">{t('방문 가능 지역', '可参观地区')}</h2>
          <p className="text-center text-gray-400 text-sm mb-8">{t('중국 주요 산업 도시 6곳 커버', '覆盖中国6大主要工业城市')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VISIT_REGIONS.map((region, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{region.icon}</span>
                  <div>
                    <div className="font-bold text-white">{region.city[lang]}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-300">{region.specialty[lang]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{t('고객 후기', '客户评价')}</h2>
        <p className="text-center text-gray-500 text-sm mb-8">{t('실제 방문 서비스를 이용한 고객들의 이야기', '实际使用参观服务的客户故事')}</p>
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((review, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <span key={j} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">&ldquo;{review.text[lang]}&rdquo;</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                  {review.name[lang].charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{review.name[lang]}</div>
                  <div className="text-xs text-gray-500">{review.company[lang]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      <section className="bg-gradient-to-r from-yellow-500 to-orange-500 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-2xl md:text-3xl font-black mb-4">
            {t('지금 바로 공장 방문을 신청하세요', '立即申请工厂参观')}
          </h2>
          <p className="text-white/90 mb-6">
            {t('VIP PRO 회원은 연 2회 무료 포함 · 일반 신청도 가능합니다', 'VIP PRO会员每年2次免费包含 · 也可单独申请')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => handleApply('premium')}
              className="px-8 py-4 bg-white text-orange-600 rounded-xl font-black text-base hover:bg-orange-50 shadow-lg"
            >
              {t('방문 신청하기 →', '申请参观 →')}
            </button>
            <Link href="/membership" className="px-8 py-4 bg-white/20 border border-white/30 text-white rounded-xl font-semibold text-base hover:bg-white/30">
              {t('VIP PRO 멤버십 보기', '查看VIP PRO会员')}
            </Link>
          </div>
        </div>
      </section>


      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <div className="font-bold text-sm">{t('공장 방문 서비스 문의', '工厂参观服务咨询')}</div>
              <div className="text-xs text-purple-200">{t('방문 일정, 패키지, 비용 등 친절하게 안내해 드립니다.', '参观日程、套餐、费用等，我们将为您提供贴心解答。')}</div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/support" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors">
              {t('FAQ', '常见问题')}
            </Link>
            <Link href="/support" className="px-4 py-2 bg-white text-purple-700 hover:bg-purple-50 rounded-lg text-sm font-bold transition-colors">
              {t('고객센터 →', '客服中心 →')}
            </Link>
          </div>
        </div>
      </div>


      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('신청이 완료되었습니다!', '申请已完成！')}</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    {t('담당 MD가 1~2 영업일 이내에 연락드립니다. 방문 일정과 세부 사항을 안내해 드리겠습니다.', '专属MD将在1-2个工作日内联系您，为您安排参观日程和详细事项。')}
                  </p>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                  >
                    {t('확인', '确认')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{t('공장 방문 신청', '工厂参观申请')}</h3>
                    <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('이름 *', '姓名 *')}</label>
                        <input
                          type="text"
                          value={applyForm.name}
                          onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder={t('홍길동', '姓名')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('회사명', '公司名')}</label>
                        <input
                          type="text"
                          value={applyForm.company}
                          onChange={(e) => setApplyForm({ ...applyForm, company: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder={t('(주)회사명', '公司名称')}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('이메일 *', '邮箱 *')}</label>
                      <input
                        type="email"
                        value={applyForm.email}
                        onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('연락처', '联系方式')}</label>
                      <input
                        type="tel"
                        value={applyForm.phone}
                        onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={t('010-0000-0000', '手机号码')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('관심 카테고리', '感兴趣的类别')}</label>
                      <select
                        value={applyForm.category}
                        onChange={(e) => setApplyForm({ ...applyForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">{t('선택해주세요', '请选择')}</option>
                        <option value="toys">{t('완구·굿즈·키링', '玩具·周边·钥匙扣')}</option>
                        <option value="fashion">{t('패션·잡화', '时尚·杂货')}</option>
                        <option value="beauty">{t('뷰티·생활용품', '美妆·生活用品')}</option>
                        <option value="electronics">{t('전자제품', '电子产品')}</option>
                        <option value="dolls">{t('인형·봉제', '玩偶·毛绒')}</option>
                        <option value="other">{t('기타', '其他')}</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('희망 방문 시기', '希望参观时间')}</label>
                        <input
                          type="month"
                          value={applyForm.visitDate}
                          onChange={(e) => setApplyForm({ ...applyForm, visitDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('예산 (¥)', '预算（¥）')}</label>
                        <select
                          value={applyForm.budget}
                          onChange={(e) => setApplyForm({ ...applyForm, budget: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">{t('선택', '请选择')}</option>
                          <option value="free">{t('VIP PRO 포함', 'VIP PRO包含')}</option>
                          <option value="1500">¥1,500~</option>
                          <option value="2500">¥2,500~</option>
                          <option value="custom">{t('협의', '协商')}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('추가 요청사항', '其他要求')}</label>
                      <textarea
                        value={applyForm.note}
                        onChange={(e) => setApplyForm({ ...applyForm, note: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        placeholder={t('방문하고 싶은 공장 유형, 특별 요청사항 등을 입력해주세요.', '请填写希望参观的工厂类型、特殊要求等。')}
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 mt-3 text-xs text-blue-700">
                    💡 {t('신청 후 담당 MD가 1~2 영업일 이내에 방문 일정과 세부 사항을 안내해 드립니다.', '申请后，专属MD将在1-2个工作日内为您安排参观日程和详细事项。')}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setShowApplyModal(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {t('취소', '取消')}
                    </button>
                    <button
                      onClick={handleSubmitApply}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold hover:from-yellow-600 hover:to-orange-600"
                    >
                      {t('신청하기 →', '申请 →')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
