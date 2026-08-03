"use client";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

type Lang = 'ko' | 'zh' | 'en';

const T = {
  ko: {
    back: '← 홈으로',
    eyebrow: '가격 가이드라인',
    title: '투명하게, 경쟁력 있게',
    sub: '제품 사양과 수량에 따라 비용이 달라지기 때문에, 먼저 무료 검토 후 항목별 비용을 투명하게 안내드립니다. 의뢰 내용과 공장 조건에 따라 최적의 가격을 협의합니다.\n우리가 약속하는 것은 단 하나 — 시장에서 가장 경쟁력 있는 조건입니다.',
    philosophy_title: '가격 철학',
    philosophy: [
      {
        icon: 'scale',
        title: '비교 견적 기반',
        desc: '동일 사양으로 최소 3개 공장에서 견적을 받아 비교합니다. 가장 좋은 조건을 선택할 수 있도록 투명하게 제시합니다.',
      },
      {
        icon: 'shield',
        title: '숨겨진 비용 없음',
        desc: '별도의 소개비, 임금비 등의 추가비용은 없습니다. 필요한 샘플비나 개발 몰드비용은 정확한 금액을 산출하여 사전에 명시합니다. 제품 대금 역시 계약 후 추가비용은 발생하지도 청구하지도 않습니다.',
      },
      {
        icon: 'trending',
        title: '규모에 따른 최적화',
        desc: '소량 주문부터 대량 발주까지 물량에 맞는 공장을 연결합니다. 불필요하게 큰 MOQ를 강요하지 않습니다.',
      },
    ],
    samples_title: '실제 제품 가격 예시',
    samples_note: '아래 가격은 알리바바 실제 거래 기준 참고값(위안화 CNY)입니다. 소재, 사양, 수량에 따라 달라질 수 있습니다.',
    samples: [
      {
        category: '가방류',
        img: '/pricing-products/bag-tote.png',
        items: [
          { name: '캔버스 토트백 (대형)', moq: '100개', price: 'CN¥3.05~10.15', unit: '개당', note: '맞춤 로고 인쇄 포함' },
          { name: '나일론 쇼핑백 (중형)', moq: '200개', price: 'CN¥8.50~18.00', unit: '개당', note: '경량, 방수 코팅' },
          { name: '캔버스 숄더백', moq: '100개', price: 'CN¥12.00~25.00', unit: '개당', note: 'OEM 맞춤 제작' },
        ],
      },
      {
        category: '봉제인형',
        img: '/pricing-products/plush-doll.jpg',
        items: [
          { name: '봉제 동물인형 (20cm)', moq: '100개', price: 'CN¥13.47~33.77', unit: '개당', note: '맞춤 디자인, CPSIA 인증' },
          { name: '미니 봉제인형 (10cm)', moq: '300개', price: 'CN¥9.88~13.67', unit: '개당', note: '블라인드박스용 소형' },
          { name: '대형 봉제인형 (40cm)', moq: '100개', price: 'CN¥49.33~54.06', unit: '개당', note: 'PP 코튼 고밀도 충전' },
        ],
      },
      {
        category: '봉제 가방고리',
        img: '/pricing-products/plush-keychain.jpg',
        items: [
          { name: '미니 봉제 키링 (5~8cm)', moq: '200개', price: 'CN¥3.50~8.00', unit: '개당', note: '맞춤 캐릭터 디자인' },
          { name: '봉제 가방 참 (10cm)', moq: '200개', price: 'CN¥5.00~12.00', unit: '개당', note: '금속 고리 포함' },
          { name: '세트 봉제 키링 (3종)', moq: '100세트', price: 'CN¥15.00~28.00', unit: '세트당', note: '캐릭터 시리즈 구성' },
        ],
      },
      {
        category: '모자',
        img: '/pricing-products/cap-hat.jpg',
        items: [
          { name: '베이스볼캡 (6패널)', moq: '100개', price: 'CN¥8.00~18.00', unit: '개당', note: '자수 로고 포함' },
          { name: '버킷햇 (면)', moq: '100개', price: 'CN¥10.00~22.00', unit: '개당', note: 'OEM 맞춤 제작' },
          { name: '트러커캡 (메쉬)', moq: '100개', price: 'CN¥6.50~14.00', unit: '개당', note: '스냅백 조절 포함' },
        ],
      },
      {
        category: '보조배터리',
        img: '/pricing-products/power-bank.jpg',
        items: [
          { name: '슬림 파워뱅크 (10,000mAh)', moq: '100개', price: 'CN¥35.00~65.00', unit: '개당', note: 'OEM 로고 인쇄 가능' },
          { name: '대용량 파워뱅크 (20,000mAh)', moq: '50개', price: 'CN¥55.00~95.00', unit: '개당', note: 'LED 디스플레이 포함' },
          { name: '무선충전 파워뱅크 (5,000mAh)', moq: '100개', price: 'CN¥45.00~80.00', unit: '개당', note: 'MagSafe 호환' },
        ],
      },
    ],
    service_title: '서비스 비용 구조',
    service_note: '서비스 비용은 의뢰 내용과 범위에 따라 협의합니다. 아래는 일반적인 구조입니다.',
    services: [
      { name: '시장조사 & 공장 발굴', price: '회원 혜택 적용', note: '가입 후 무료 제공' },
      { name: '샘플 개발 관리', price: '공장 샘플개발비·구매비 청구', note: '의뢰 시 정확하게 개별 건으로 명시' },
      { name: '검수 서비스', price: '정확한 임금비용 명시 청구', note: '전수검사 + 사진 포함 검수 보고서 제공' },
      { name: '물류 대행', price: '실비 청구', note: 'LCL/FCL 부피·상황에 맞춰 제안 선택' },
    ],
    cta_title: '정확한 견적이 필요하신가요?',
    cta_sub: '제품 사양과 수량을 알려주시면 영업일 2일 이내에 비교 견적서를 보내드립니다.',
    cta_btn: '견적 요청하기',
    disclaimer: '* 위 가격은 2025~2026년 최근 거래 기준 참고값이며, 환율·원자재 가격 변동에 따라 달라질 수 있습니다.',
  },
  zh: {
    back: '← 返回首页',
    eyebrow: '价格指南',
    title: '透明，有竞争力',
    sub: '我们不会预先提出固定费率。根据委托内容和工厂条件协商最优价格。\n我们承诺的只有一件事 — 市场上最具竞争力的条件。',
    philosophy_title: '价格理念',
    philosophy: [
      {
        icon: 'scale',
        title: '基于比较报价',
        desc: '以相同规格从至少3家工厂获取报价并进行比较，透明地呈现最优条件供您选择。',
      },
      {
        icon: 'shield',
        title: '无隐藏费用',
        desc: '不收取额外的介绍费、人工费等附加费用。所需样品费或开发模具费用将精确核算并提前明示。产品货款在合同签订后也不会产生或收取任何额外费用。',
      },
      {
        icon: 'trending',
        title: '按规模优化',
        desc: '从小批量订单到大批量采购，我们为您匹配适合的工厂，不强迫接受不必要的大MOQ。',
      },
    ],
    samples_title: '实际产品价格示例',
    samples_note: '以下价格为阿里巴巴实际交易参考值（人民币CNY），可能因材质、规格、数量而有所不同。',
    samples: [
      {
        category: '包袋类',
        img: '/pricing-products/bag-tote.png',
        items: [
          { name: '帆布托特包 (大号)', moq: '100个', price: 'CN¥3.05~10.15', unit: '每个', note: '含定制Logo印刷' },
          { name: '尼龙购物袋 (中号)', moq: '200个', price: 'CN¥8.50~18.00', unit: '每个', note: '轻量防水涂层' },
          { name: '帆布单肩包', moq: '100个', price: 'CN¥12.00~25.00', unit: '每个', note: 'OEM定制生产' },
        ],
      },
      {
        category: '毛绒玩偶',
        img: '/pricing-products/plush-doll.jpg',
        items: [
          { name: '毛绒动物玩偶 (20cm)', moq: '100个', price: 'CN¥13.47~33.77', unit: '每个', note: '定制设计，CPSIA认证' },
          { name: '迷你毛绒玩偶 (10cm)', moq: '300个', price: 'CN¥9.88~13.67', unit: '每个', note: '盲盒用小型款' },
          { name: '大型毛绒玩偶 (40cm)', moq: '100个', price: 'CN¥49.33~54.06', unit: '每个', note: 'PP棉高密度填充' },
        ],
      },
      {
        category: '毛绒挂件',
        img: '/pricing-products/plush-keychain.jpg',
        items: [
          { name: '迷你毛绒钥匙扣 (5~8cm)', moq: '200个', price: 'CN¥3.50~8.00', unit: '每个', note: '定制角色设计' },
          { name: '毛绒包挂 (10cm)', moq: '200个', price: 'CN¥5.00~12.00', unit: '每个', note: '含金属挂环' },
          { name: '套装毛绒钥匙扣 (3款)', moq: '100套', price: 'CN¥15.00~28.00', unit: '每套', note: '角色系列组合' },
        ],
      },
      {
        category: '帽子',
        img: '/pricing-products/cap-hat.jpg',
        items: [
          { name: '棒球帽 (6片)', moq: '100个', price: 'CN¥8.00~18.00', unit: '每个', note: '含刺绣Logo' },
          { name: '渔夫帽 (棉质)', moq: '100个', price: 'CN¥10.00~22.00', unit: '每个', note: 'OEM定制生产' },
          { name: '卡车帽 (网眼)', moq: '100个', price: 'CN¥6.50~14.00', unit: '每个', note: '含Snapback调节' },
        ],
      },
      {
        category: '移动电源',
        img: '/pricing-products/power-bank.jpg',
        items: [
          { name: '超薄充电宝 (10,000mAh)', moq: '100个', price: 'CN¥35.00~65.00', unit: '每个', note: '可OEM印刷Logo' },
          { name: '大容量充电宝 (20,000mAh)', moq: '50个', price: 'CN¥55.00~95.00', unit: '每个', note: '含LED显示屏' },
          { name: '无线充电宝 (5,000mAh)', moq: '100个', price: 'CN¥45.00~80.00', unit: '每个', note: '兼容MagSafe' },
        ],
      },
    ],
    service_title: '服务费用结构',
    service_note: '服务费用根据委托内容和范围协商，以下为一般结构。',
    services: [
      { name: '市场调研 & 工厂发掘', price: '会员优惠适用', note: '注册后免费提供' },
      { name: '样品开发管理', price: '收取工厂样品开发费·采购费', note: '委托时按件精确明示' },
      { name: '检验服务', price: '明确人工费用收取', note: '全检 + 含照片的检验报告' },
      { name: '物流代理', price: '按实际费用收取', note: '根据体积情况提供LCL/FCL方案供选择' },
    ],
    cta_title: '需要准确报价吗？',
    cta_sub: '告知我们产品规格和数量，我们将在2个工作日内发送比较报价单。',
    cta_btn: '申请报价',
    disclaimer: '* 以上价格为2025~2026年最新交易参考值，可能因汇率和原材料价格变动而有所不同。',
  },
  en: {
    back: '← Back to Home',
    eyebrow: 'Pricing Guide',
    title: 'Transparent. Competitive.',
    sub: 'We don\'t quote fixed rates upfront. We negotiate the best price based on your brief and factory conditions.\nOur single promise — the most competitive terms in the market.',
    philosophy_title: 'Our Pricing Philosophy',
    philosophy: [
      {
        icon: 'scale',
        title: 'Comparison-Based Quotes',
        desc: 'We collect quotes from at least 3 factories for the same spec and present them transparently so you can choose the best deal.',
      },
      {
        icon: 'shield',
        title: 'No Hidden Fees',
        desc: 'No additional fees such as introduction fees or labor charges. Required sample costs or mold development costs are calculated precisely and disclosed in advance. Product payments after contract signing will not incur or be billed for any additional costs.',
      },
      {
        icon: 'trending',
        title: 'Optimized for Your Scale',
        desc: 'From small batches to bulk orders, we match you with the right factory. We never push unnecessary large MOQs.',
      },
    ],
    samples_title: 'Sample Product Pricing',
    samples_note: 'Prices below are reference values from Alibaba actual transactions (CNY). May vary by material, spec, and quantity.',
    samples: [
      {
        category: 'Bags',
        img: '/pricing-products/bag-tote.png',
        items: [
          { name: 'Canvas Tote Bag (Large)', moq: '100 pcs', price: 'CN¥3.05~10.15', unit: '/pc', note: 'Custom logo print included' },
          { name: 'Nylon Shopping Bag (Medium)', moq: '200 pcs', price: 'CN¥8.50~18.00', unit: '/pc', note: 'Lightweight, waterproof coating' },
          { name: 'Canvas Shoulder Bag', moq: '100 pcs', price: 'CN¥12.00~25.00', unit: '/pc', note: 'OEM custom production' },
        ],
      },
      {
        category: 'Plush Dolls',
        img: '/pricing-products/plush-doll.jpg',
        items: [
          { name: 'Stuffed Animal Doll (20cm)', moq: '100 pcs', price: 'CN¥13.47~33.77', unit: '/pc', note: 'Custom design, CPSIA certified' },
          { name: 'Mini Plush Doll (10cm)', moq: '300 pcs', price: 'CN¥9.88~13.67', unit: '/pc', note: 'Blind box size' },
          { name: 'Large Plush Doll (40cm)', moq: '100 pcs', price: 'CN¥49.33~54.06', unit: '/pc', note: 'High-density PP cotton fill' },
        ],
      },
      {
        category: 'Plush Keychains',
        img: '/pricing-products/plush-keychain.jpg',
        items: [
          { name: 'Mini Plush Keyring (5~8cm)', moq: '200 pcs', price: 'CN¥3.50~8.00', unit: '/pc', note: 'Custom character design' },
          { name: 'Plush Bag Charm (10cm)', moq: '200 pcs', price: 'CN¥5.00~12.00', unit: '/pc', note: 'Metal ring included' },
          { name: 'Set Plush Keyring (3-piece)', moq: '100 sets', price: 'CN¥15.00~28.00', unit: '/set', note: 'Character series set' },
        ],
      },
      {
        category: 'Hats & Caps',
        img: '/pricing-products/cap-hat.jpg',
        items: [
          { name: 'Baseball Cap (6-panel)', moq: '100 pcs', price: 'CN¥8.00~18.00', unit: '/pc', note: 'Embroidery logo included' },
          { name: 'Bucket Hat (Cotton)', moq: '100 pcs', price: 'CN¥10.00~22.00', unit: '/pc', note: 'OEM custom production' },
          { name: 'Trucker Cap (Mesh)', moq: '100 pcs', price: 'CN¥6.50~14.00', unit: '/pc', note: 'Snapback adjustment included' },
        ],
      },
      {
        category: 'Power Banks',
        img: '/pricing-products/power-bank.jpg',
        items: [
          { name: 'Slim Power Bank (10,000mAh)', moq: '100 pcs', price: 'CN¥35.00~65.00', unit: '/pc', note: 'OEM logo print available' },
          { name: 'High-Cap Power Bank (20,000mAh)', moq: '50 pcs', price: 'CN¥55.00~95.00', unit: '/pc', note: 'LED display included' },
          { name: 'Wireless Power Bank (5,000mAh)', moq: '100 pcs', price: 'CN¥45.00~80.00', unit: '/pc', note: 'MagSafe compatible' },
        ],
      },
    ],
    service_title: 'Service Fee Structure',
    service_note: 'Service fees are negotiated based on scope. Below is the general structure.',
    services: [
      { name: 'Market Research & Factory Sourcing', price: 'Member benefit applied', note: 'Free after signup' },
      { name: 'Sample Development Management', price: 'Factory sample & development cost billed', note: 'Itemized per request at time of inquiry' },
      { name: 'Inspection Service', price: 'Exact labor cost billed', note: '100% full inspection + photo inspection report' },
      { name: 'Logistics Agency', price: 'Actual cost billed', note: 'LCL/FCL options proposed based on volume' },
    ],
    cta_title: 'Need an Accurate Quote?',
    cta_sub: 'Share your product spec and quantity and we\'ll send a comparison quote within 2 business days.',
    cta_btn: 'Request a Quote',
    disclaimer: '* Prices above are reference values from recent 2025~2026 transactions and may vary with exchange rates and raw material costs.',
  },
};

const PhilosophyIcon = ({ type }: { type: string }) => {
  if (type === 'scale') return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="21"/><path d="M5 6l7-3 7 3"/><path d="M3 12l4 4 4-4"/><path d="M13 12l4 4 4-4"/>
    </svg>
  );
  if (type === 'shield') return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  );
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  );
};

export default function PricingPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const t = T[lang];

  return (
    <div className="min-h-screen bg-white">
      {/* NAV (공통 컴포넌트) */}
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} theme="light" />

      {/* HERO */}
      <section className="py-20 text-center" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <span className="inline-block text-xs font-bold tracking-widest text-amber-400 uppercase mb-4 px-4 py-1.5 bg-amber-400/10 rounded-full border border-amber-400/30">
            {t.eyebrow}
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 mt-4">{t.title}</h1>
          <div className="text-white/55 text-base max-w-2xl mx-auto whitespace-pre-line leading-relaxed">{t.sub}</div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-12">{t.philosophy_title}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {t.philosophy.map((p, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-5 text-amber-600">
                  <PhilosophyIcon type={p.icon} />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-3">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICE SAMPLES */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-gray-900 mb-3">{t.samples_title}</h2>
            <p className="text-sm text-gray-400">{t.samples_note}</p>
          </div>

          <div className="space-y-10">
            {t.samples.map((section, si) => (
              <div key={si} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* 카테고리 헤더 */}
                <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm font-bold text-gray-700 px-4 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
                    {section.category}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                {/* 이미지 + 테이블 레이아웃 */}
                <div className="flex flex-col md:flex-row">
                  {/* 상품 이미지 */}
                  {(section as {category: string; img?: string; items: {name: string; moq: string; price: string; unit: string; note: string}[]}).img && (
                    <div className="md:w-48 flex-shrink-0 bg-gray-50 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-100">
                      <div className="relative w-full aspect-square max-w-[160px]">
                        <Image
                          src={(section as {category: string; img?: string; items: {name: string; moq: string; price: string; unit: string; note: string}[]}).img!}
                          alt={section.category}
                          fill
                          className="object-cover rounded-xl"
                          sizes="160px"
                        />
                      </div>
                    </div>
                  )}
                  {/* 가격 테이블 */}
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left text-xs font-bold text-gray-400 px-5 py-3 uppercase tracking-wide">
                            {lang === 'ko' ? '제품명' : lang === 'zh' ? '产品名称' : 'Product'}
                          </th>
                          <th className="text-left text-xs font-bold text-gray-400 px-4 py-3 uppercase tracking-wide whitespace-nowrap">MOQ</th>
                          <th className="text-left text-xs font-bold text-gray-400 px-4 py-3 uppercase tracking-wide whitespace-nowrap">
                            {lang === 'ko' ? '가격 (CNY)' : lang === 'zh' ? '价格 (CNY)' : 'Price (CNY)'}
                          </th>
                          <th className="text-left text-xs font-bold text-gray-400 px-4 py-3 uppercase tracking-wide hidden sm:table-cell">
                            {lang === 'ko' ? '비고' : lang === 'zh' ? '备注' : 'Note'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item, ii) => (
                          <tr key={ii} className="border-b border-gray-50 last:border-0 hover:bg-amber-50/30 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-sm text-gray-500">{item.moq}</span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-sm font-black text-amber-600">{item.price}</span>
                              <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3.5 hidden sm:table-cell">
                              <span className="text-xs text-gray-400">{item.note}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-8 text-center">{t.disclaimer}</p>
        </div>
      </section>

      {/* COST FLOW - 4단계 비용 구조 */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-indigo-600 uppercase mb-4 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
              {lang === 'zh' ? '费用结构 · Cost Flow' : '비용 구조 · Cost Flow'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              {lang === 'zh' ? '从探索到交货：4阶段费用结构' : '탐색부터 납품까지: 4단계 비용 구조'}
            </h2>
            <p className="text-sm text-gray-400 max-w-xl mx-auto">
              {lang === 'zh' ? '提前了解每个阶段的费用，制定合理的采购预算。' : '각 단계별 비용을 미리 파악하고 합리적인 소싱 예산을 계획하세요.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: '→',
                title: lang === 'zh' ? '探索' : '탐색',
                subtitle: lang === 'zh' ? '市场调研 · 工厂发掘' : '시장조사 · 공장 발굴',
                cost: lang === 'zh' ? '免费' : '무료',
                costColor: 'text-emerald-600',
                badge: lang === 'zh' ? '免费' : '무료',
                badgeColor: 'bg-emerald-100 text-emerald-700',
                desc: lang === 'zh' ? '注册后可免费使用市场调研和工厂匹配服务。' : '가입 후 시장조사 및 공장 매칭 무료 제공.',
              },
              {
                step: '02',
                icon: '→',
                title: lang === 'zh' ? '验证' : '검증',
                subtitle: lang === 'zh' ? '样品制作 · 开发费' : '샘플 제작 · 개발비',
                cost: lang === 'zh' ? '另行提示' : '별도 제시',
                costColor: 'text-amber-600',
                badge: lang === 'zh' ? '按项目报价' : '프로젝트별 제시',
                badgeColor: 'bg-amber-100 text-amber-700',
                desc: lang === 'zh' ? '样品费¥50~500/个（视产品而定）。IP·包装设计费另行报价。' : '샘플비 ¥50~500/개 (제품에 따라 다름). IP·패키지 디자인비 별도.',
              },
              {
                step: '03',
                icon: '→',
                title: lang === 'zh' ? '生产' : '생산',
                subtitle: lang === 'zh' ? '订单合同 · 预付款30%' : '주문 계약 · 선수금 30%',
                cost: lang === 'zh' ? '合同金额×30%' : '계약금액×30%',
                costColor: 'text-blue-600',
                badge: lang === 'zh' ? '合同后先付' : '계약 후 선납',
                badgeColor: 'bg-blue-100 text-blue-700',
                desc: lang === 'zh' ? '签订订单合同后支付30%预付款，正式启动生产。MOQ 1,000~3,000个起。' : '주문 계약 체결 후 30% 선수금 납부 시 생산 시작. MOQ 1,000~3,000개 기준.',
              },
              {
                step: '04',
                icon: '✅',
                title: lang === 'zh' ? '交货' : '납품',
                subtitle: lang === 'zh' ? '检验合格 · 尾款结算' : '검수 합격 · 잔금 정산',
                cost: lang === 'zh' ? '合同金额×70%' : '계약금액×70%',
                costColor: 'text-indigo-600',
                badge: lang === 'zh' ? '检验后付尾款' : '검수 후 잔금',
                badgeColor: 'bg-indigo-100 text-indigo-700',
                desc: lang === 'zh' ? '100%全检合格后支付尾款，安排LCL/FCL物流发货至韩国。' : '100% 전수 검수 합격 후 잔금 정산, LCL/FCL 물류로 한국 납품.',
              },
            ].map((stage, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-3xl">{stage.icon}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stage.badgeColor}`}>{stage.badge}</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 mb-0.5">STEP {stage.step}</div>
                  <div className="text-lg font-black text-gray-900">{stage.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stage.subtitle}</div>
                </div>
                <div className={`text-xl font-black ${stage.costColor}`}>{stage.cost}</div>
                <p className="text-xs text-gray-400 leading-relaxed">{stage.desc}</p>
              </div>
            ))}
          </div>

          {/* 하단 안내 */}
          <div className="mt-10 p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              {lang === 'zh'
                ? '物流费用（LCL/FCL）和实际生产单价根据产品规格和数量单独计算。免费咨询后提供准确报价。'
                : '물류비(LCL/FCL)와 실제 생산 단가는 제품 사양과 수량에 따라 별도 산정됩니다. 무료 상담 후 정확한 견적을 제공합니다.'}
            </p>
          </div>
        </div>
      </section>

      {/* SERVICE FEES */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-gray-900 mb-3">{t.service_title}</h2>
            <p className="text-sm text-gray-400">{t.service_note}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {t.services.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0 text-white font-black text-sm">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm mb-1">{s.name}</div>
                  <div className="text-amber-600 font-black text-base mb-1">{s.price}</div>
                  <div className="text-xs text-gray-400">{s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KERYX 비용 투명성 섹션 */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-600 uppercase mb-4 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
              TRANSPARENCY
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              {lang === 'ko' ? 'KERYX 비용 발생 구조' : lang === 'zh' ? 'KERYX费用产生结构' : 'KERYX Cost Structure'}
            </h2>
            <p className="text-sm text-gray-400 max-w-xl mx-auto">
              {lang === 'ko' ? '무엇이 무료이고, 언제 비용이 발생하는지 사전에 정확히 안내드립니다.' : lang === 'zh' ? '提前明确告知哪些是免费的，哪些阶段会产生费用。' : 'We clearly inform you in advance what is free and when costs arise.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 무료 범위 */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-lg font-black text-emerald-800">
                  {lang === 'ko' ? '무료 제공 범위' : lang === 'zh' ? '免费提供范围' : 'Free Services'}
                </h3>
              </div>
              <ul className="space-y-3">
                {(lang === 'ko'
                  ? ['시장조사 및 공장 유형 진단', '공장 매칭 의뢰 접수 및 상담', '후보 공장 리스트 제공', '견적 검토 및 1차 커스터마이징', 'MD 배정 및 커스토머 서포트']
                  : lang === 'zh'
                  ? ['市场调研及工厂类型诊断', '工厂匹配委托接收及咨询', '候选工厂名单提供', '报价审查及初次定制', 'MD分配及客户支持']
                  : ['Market research & factory type diagnosis', 'Inquiry reception & initial consultation', 'Candidate factory list', 'Quote review & first customization', 'MD assignment & customer support']
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-emerald-800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} className="w-4 h-4 mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* 비용 발생 시점 */}
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h3 className="text-lg font-black text-amber-800">
                  {lang === 'ko' ? '비용 발생 시점' : lang === 'zh' ? '费用产生时点' : 'When Costs Arise'}
                </h3>
              </div>
              <ul className="space-y-3">
                {(lang === 'ko'
                  ? ['샘플 제작비 (공장 실질 비용 전달)', '디자인 개발비 (IP/패키지 디자인)', '검수 서비스비 (실질 인건비 명세 청구)', '물류비 (LCL/FCL 실제 운임비)', '제품 대금 (선수금 30% + 잔금 70%)']
                  : lang === 'zh'
                  ? ['样品制作费（工厂实际费用转交）', '设计开发费（IP/包装设计）', '检验服务费（实际人工费用明细计费）', '物流费（LCL/FCL实际运费）', '产品货款（首付30%+尾款70%）']
                  : ['Sample production cost (factory actual cost)', 'Design development fee (IP/packaging)', 'Inspection service fee (itemized labor cost)', 'Logistics cost (LCL/FCL actual freight)', 'Product payment (30% deposit + 70% balance)']
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} className="w-4 h-4 mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-amber-700 bg-amber-100 rounded-xl px-4 py-3">
                {lang === 'ko' ? '모든 비용 항목은 사전 견적에 명시하여 승인 후 진행합니다. 승인 없는 추가 비용은 청구하지 않습니다.' : lang === 'zh' ? '所有费用项目均在事前报价中注明，经批准后方可进行。未经批准不收取额外费用。' : 'All cost items are stated in the advance quote and proceed only after your approval. No unapproved charges will be billed.'}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* 계약 구조 선택 섹션 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-blue-600 uppercase mb-4 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100">
              {lang === 'zh' ? '合同结构 · Contract Structure' : '계약 구조 · Contract Structure'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              {lang === 'zh' ? '选择适合您的付款与通关方式' : '나에게 맞는 결제·통관 방식을 선택하세요'}
            </h2>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              {lang === 'zh'
                ? 'KERYX提供两种合同结构，根据您的业务规模和税务环境灵活选择。'
                : 'KERYX는 두 가지 계약 구조를 제공합니다. 사업 규모와 세금 환경에 맞게 유연하게 선택하세요.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 옵션 A: 가자트레이드 통관 납품 */}
            <div className="rounded-2xl border-2 border-blue-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">A</div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  {lang === 'zh' ? '推荐 · 韩国通关' : '추천 · 한국 통관'}
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1 mt-3">
                {lang === 'zh' ? '通过GAZA TRADE进口通关' : '가자트레이드 명의 통관 납품'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {lang === 'zh'
                  ? '由KERYX运营公司GAZA TRADE代为进行韩国进口通关，货物直接送达您的仓库。'
                  : 'KERYX 운영사 가자트레이드 명의로 한국 수입 통관을 대행하여 바이어 창고까지 직납합니다.'}
              </p>
              <div className="space-y-3 mb-6">
                {(lang === 'zh' ? [
                  { icon: '✅', text: '韩国增值税发票（税务局认证）' },
                  { icon: '✅', text: '无需自行处理进口通关手续' },
                  { icon: '✅', text: '韩元(KRW)结算，无汇率风险' },
                  { icon: '✅', text: '货物直接送达韩国仓库' },
                  { icon: '', text: '产品货款+通关代行费用适用' },
                ] : [
                  { icon: '✅', text: '한국 세금계산서 발행 (국세청 인증)' },
                  { icon: '✅', text: '수입 통관 절차 직접 처리 불필요' },
                  { icon: '✅', text: '원화(KRW) 결제, 환율 리스크 없음' },
                  { icon: '✅', text: '한국 창고까지 직납' },
                  { icon: '', text: '제품 대금 + 통관 대행 수수료 적용' },
                ]).map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-xs font-bold text-blue-700 mb-1">
                  {lang === 'zh' ? '结算流程' : '결제 흐름'}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-blue-600 font-semibold">
                  <span className="bg-white border border-blue-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? '买家→KERYX' : '바이어 → KERYX'}</span>
                  <span>→</span>
                  <span className="bg-white border border-blue-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? 'KRW结算' : 'KRW 결제'}</span>
                  <span>→</span>
                  <span className="bg-white border border-blue-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? '税务发票' : '세금계산서'}</span>
                  <span>→</span>
                  <span className="bg-white border border-blue-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? '通关→仓库' : '통관 → 창고'}</span>
                </div>
              </div>
            </div>
            {/* 옵션 B: 중국 직접 송금 */}
            <div className="rounded-2xl border-2 border-amber-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black text-lg">B</div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  {lang === 'zh' ? '直接汇款' : '직접 송금'}
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1 mt-3">
                {lang === 'zh' ? '直接向中国工厂汇款' : '중국 공장 직접 송금'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {lang === 'zh'
                  ? '买家直接向中国工厂汇款（CNY/USD），KERYX负责监督生产和检验，买家自行办理进口通关。'
                  : '바이어가 중국 공장에 직접 송금(CNY/USD)하고, KERYX는 생산 감독·검수를 담당합니다. 통관은 바이어가 직접 처리합니다.'}
              </p>
              <div className="space-y-3 mb-6">
                {(lang === 'zh' ? [
                  { icon: '✅', text: '产品货款直接汇至工厂，无中间差价' },
                  { icon: '✅', text: '适合已有进口通关经验的买家' },
                  { icon: '✅', text: 'CNY/USD结算，适合外汇账户' },
                  { icon: '', text: '需自行处理韩国进口通关' },
                  { icon: '', text: '需承担汇率波动风险' },
                ] : [
                  { icon: '✅', text: '제품 대금 공장 직접 지급, 중간 마진 없음' },
                  { icon: '✅', text: '수입 통관 경험 있는 바이어에게 적합' },
                  { icon: '✅', text: 'CNY/USD 결제, 외화 계좌 보유자 유리' },
                  { icon: '', text: '한국 수입 통관 직접 처리 필요' },
                  { icon: '', text: '환율 변동 리스크 바이어 부담' },
                ]).map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs font-bold text-amber-700 mb-1">
                  {lang === 'zh' ? '结算流程' : '결제 흐름'}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-amber-600 font-semibold">
                  <span className="bg-white border border-amber-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? '买家→工厂' : '바이어 → 공장'}</span>
                  <span>→</span>
                  <span className="bg-white border border-amber-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? 'CNY/USD' : 'CNY/USD'}</span>
                  <span>→</span>
                  <span className="bg-white border border-amber-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? 'KERYX监督' : 'KERYX 감독'}</span>
                  <span>→</span>
                  <span className="bg-white border border-amber-200 rounded-lg px-2.5 py-1">{lang === 'zh' ? '自行通关' : '직접 통관'}</span>
                </div>
              </div>
            </div>
          </div>
          {/* 하단 안내 */}
          <div className="mt-8 rounded-2xl bg-gray-900 text-white p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p className="font-black text-base mb-1">
                {lang === 'zh' ? '两种方式均由KERYX全程监督生产与检验' : '두 방식 모두 KERYX가 생산·검수 전 과정을 감독합니다'}
              </p>
              <p className="text-sm text-white/60">
                {lang === 'zh'
                  ? '无论选择哪种合同结构，KERYX都会对生产过程进行监督，并提供检验报告。结算方式的差异不影响服务质量。'
                  : '어떤 계약 구조를 선택하더라도 KERYX는 생산 과정을 감독하고 검수 보고서를 제공합니다. 결제 방식의 차이가 서비스 품질에 영향을 주지 않습니다.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-5">{t.cta_title}</h2>
          <p className="text-white/55 text-base mb-10 max-w-xl mx-auto">{t.cta_sub}</p>
          <Link href="/quote"
            className="inline-block px-10 py-4 text-base font-black text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}>
            {t.cta_btn}
          </Link>
        </div>
      </section>
      {/* FOOTER (공통 컴포넌트) */}
      <PublicFooter lang={lang} theme="light" />
    </div>
  );
}
