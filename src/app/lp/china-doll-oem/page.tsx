"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

type Lang = "ko" | "zh" | "en";

const t = {
  ko: {
    meta_title: "중국 봉제 인형 OEM 공장 연결 | KERYX",
    hero_eyebrow: "중국 인형 OEM 전문",
    hero_title: "봉제 인형 OEM,\n공장 찾는 시간을 줄이세요",
    hero_sub: "양저우·광저우 봉제 클러스터 검증 공장 직접 연결. 샘플부터 양산까지 KERYX가 함께합니다.",
    hero_cta: "무료 공장 매칭 진단 받기",
    hero_cta2: "포트폴리오 보기",
    stats: [
      { value: "10년+", label: "봉제 공장 네트워크" },
      { value: "100%", label: "전수 검수 원칙" },
      { value: "30일", label: "평균 샘플 제작 기간" },
      { value: "0건", label: "미승인 추가 비용" },
    ],
    pain_title: "이런 어려움을 겪고 계신가요?",
    pains: [
      "알리바바에서 공장을 찾았지만 샘플 품질이 기대와 달랐다",
      "MOQ가 너무 높아 소량 첫 주문이 부담스럽다",
      "CPSIA, CE 인증이 필요한데 어떤 공장이 가능한지 모른다",
      "공장과 직접 소통이 어렵고 중간 연락이 끊겼다",
      "납기를 지키지 않아 시즌 출시가 늦어진 경험이 있다",
    ],
    solution_title: "KERYX가 해결합니다",
    solutions: [
      {
        icon: "factory",
        title: "검증된 봉제 공장만 연결",
        desc: "양저우·광저우 클러스터 내 직접 방문 검증 공장만 매칭합니다. 품질 이력, 인증 보유 현황, MOQ 조건을 사전에 확인합니다.",
      },
      {
        icon: "sample",
        title: "샘플 단계부터 PM 동행",
        desc: "첫 샘플부터 전담 PM이 공장과 직접 소통합니다. 수정 요청, 원단 변경, 디테일 조정을 한국어로 처리합니다.",
      },
      {
        icon: "inspect",
        title: "전수 검수 + 사진 보고서",
        desc: "출고 전 전수 검수를 진행하며 불량품은 현장에서 분리합니다. 검수 사진 보고서를 납품 전 제공합니다.",
      },
      {
        icon: "cert",
        title: "인증 대응 가능 공장 선별",
        desc: "CPSIA, CE, KC, FDA 등 필요 인증에 따라 대응 가능한 공장을 선별 매칭합니다.",
      },
    ],
    process_title: "진행 순서",
    process: [
      { step: "01", title: "무료 상담 접수", desc: "제품 카테고리, 수량, 인증 요건을 알려주세요. 24시간 내 담당 MD가 연락합니다." },
      { step: "02", title: "공장 후보 제안", desc: "조건에 맞는 공장 2~3곳을 비교 리스트로 제안합니다. 공장 검증 이력 포함." },
      { step: "03", title: "샘플 제작", desc: "선택한 공장에서 샘플을 제작합니다. PM이 공장과 직접 소통하며 수정을 반영합니다." },
      { step: "04", title: "양산 & 검수", desc: "샘플 승인 후 양산을 시작합니다. 출고 전 전수 검수 후 검수 보고서를 제공합니다." },
      { step: "05", title: "납품", desc: "LCL/FCL 물류로 한국 또는 지정 국가에 납품합니다. 물류비는 사전 견적으로 제시합니다." },
    ],
    spec_title: "취급 가능 인형 유형",
    specs: [
      { name: "패브릭 봉제 인형", detail: "미니키·보아·극세사 원단, 20~60cm, MOQ 500~1,000개" },
      { name: "PB 브랜드 OEM", detail: "자체 브랜드 라벨, 패키지 포함, 미주·유럽 인증 대응" },
      { name: "캐릭터 IP 인형", detail: "자체 IP 또는 라이선스 캐릭터, 디자인 협력 가능" },
      { name: "미니 봉제 키링", detail: "5~10cm, 가방고리 부자재 포함, MOQ 300~500개" },
      { name: "인형 세트 패키지", detail: "박스 패키지 포함 세트, 선물용·뽑기용 대응" },
    ],
    faq_title: "자주 묻는 질문",
    faqs: [
      { q: "최소 주문 수량(MOQ)은 얼마인가요?", a: "제품 유형에 따라 다르지만 일반적으로 500~1,000개입니다. 소량 첫 주문의 경우 공장 조건에 따라 협의 가능합니다." },
      { q: "샘플 비용은 얼마인가요?", a: "샘플비는 공장 실제 비용을 그대로 전달합니다. 일반적으로 ¥50~500/개 수준이며, 양산 시 샘플비 차감 협의가 가능한 공장도 있습니다." },
      { q: "CPSIA, CE 인증이 필요한데 가능한가요?", a: "네, 인증 요건을 사전에 알려주시면 해당 인증 보유 공장을 선별 매칭합니다. 인증 테스트 기관 연결도 지원합니다." },
      { q: "납기는 얼마나 걸리나요?", a: "샘플 제작 20~30일, 양산 30~45일이 일반적입니다. 시즌 일정에 맞춰 역산 스케줄을 함께 계획합니다." },
    ],
    cta_title: "지금 무료로 공장 매칭 진단을 받아보세요",
    cta_sub: "제품 정보를 알려주시면 24시간 내 담당 MD가 연락드립니다.",
    cta_btn: "무료 공장 매칭 진단 받기",
  },
  zh: {
    meta_title: "中国毛绒玩具OEM工厂对接 | KERYX",
    hero_eyebrow: "中国毛绒玩具OEM专家",
    hero_title: "毛绒玩具OEM，\n节省寻找工厂的时间",
    hero_sub: "直接对接扬州·广州毛绒集群验证工厂。从样品到量产，KERYX全程陪同。",
    hero_cta: "免费工厂匹配诊断",
    hero_cta2: "查看案例",
    stats: [
      { value: "10年+", label: "毛绒工厂网络" },
      { value: "100%", label: "全数检验原则" },
      { value: "30天", label: "平均样品制作周期" },
      { value: "0件", label: "未经批准的额外费用" },
    ],
    pain_title: "您是否遇到这些困难？",
    pains: [
      "在阿里巴巴找到工厂，但样品质量与预期不符",
      "MOQ太高，小批量首单压力大",
      "需要CPSIA、CE认证，但不知道哪家工厂能做",
      "与工厂直接沟通困难，中间联络中断",
      "工厂不守交期，导致季节发布延迟",
    ],
    solution_title: "KERYX为您解决",
    solutions: [
      { icon: "factory", title: "只对接经过验证的毛绒工厂", desc: "仅匹配扬州·广州集群内经过实地验证的工厂。事先确认质量记录、认证持有情况和MOQ条件。" },
      { icon: "sample", title: "从样品阶段起PM全程陪同", desc: "从第一个样品起，专属PM直接与工厂沟通。修改要求、面料变更、细节调整均由PM处理。" },
      { icon: "inspect", title: "全数检验+照片报告", desc: "出货前进行全数检验，不良品现场分离。发货前提供检验照片报告。" },
      { icon: "cert", title: "筛选可应对认证的工厂", desc: "根据CPSIA、CE、KC、FDA等所需认证，筛选可应对的工厂进行匹配。" },
    ],
    process_title: "进行流程",
    process: [
      { step: "01", title: "免费咨询接受", desc: "请告知产品类别、数量和认证要求。24小时内负责MD联系。" },
      { step: "02", title: "候选工厂提案", desc: "提供符合条件的2~3家工厂比较清单，包含工厂验证记录。" },
      { step: "03", title: "样品制作", desc: "在选定工厂制作样品。PM直接与工厂沟通，反映修改意见。" },
      { step: "04", title: "量产&检验", desc: "样品批准后开始量产。出货前全数检验后提供检验报告。" },
      { step: "05", title: "交货", desc: "通过LCL/FCL物流发货至韩国或指定国家。物流费用以事前报价提示。" },
    ],
    spec_title: "可处理的玩具类型",
    specs: [
      { name: "布艺毛绒玩具", detail: "minky·毛绒·超细纤维面料，20~60cm，MOQ 500~1,000个" },
      { name: "PB品牌OEM", detail: "自有品牌标签，含包装，可应对美洲·欧洲认证" },
      { name: "IP角色玩具", detail: "自有IP或授权角色，可提供设计协作" },
      { name: "迷你毛绒挂件", detail: "5~10cm，含包袋配件，MOQ 300~500个" },
      { name: "玩具套装包装", detail: "含盒装套装，可应对礼品用·扭蛋用" },
    ],
    faq_title: "常见问题",
    faqs: [
      { q: "最小订购量(MOQ)是多少？", a: "根据产品类型不同，一般为500~1,000个。小批量首单可根据工厂条件协商。" },
      { q: "样品费用是多少？", a: "样品费按工厂实际费用转交，一般为¥50~500/个。量产时部分工厂可协商扣除样品费。" },
      { q: "需要CPSIA、CE认证，可以吗？", a: "可以。请提前告知认证要求，我们将筛选持有相应认证的工厂进行匹配，并支持认证检测机构对接。" },
      { q: "交期需要多长时间？", a: "样品制作20~30天，量产30~45天为一般标准。我们会根据季节日程共同制定倒推计划。" },
    ],
    cta_title: "立即免费获取工厂匹配诊断",
    cta_sub: "请告知产品信息，24小时内负责MD将与您联系。",
    cta_btn: "免费工厂匹配诊断",
  },
  en: {
    meta_title: "China Plush Doll OEM Factory Matching | KERYX",
    hero_eyebrow: "China Plush Doll OEM Specialist",
    hero_title: "Plush Doll OEM —\nStop Wasting Time Finding Factories",
    hero_sub: "Direct connection to verified factories in Yangzhou & Guangzhou plush clusters. KERYX guides you from sample to mass production.",
    hero_cta: "Get Free Factory Matching",
    hero_cta2: "View Portfolio",
    stats: [
      { value: "10Y+", label: "Plush Factory Network" },
      { value: "100%", label: "Full Inspection Policy" },
      { value: "30 Days", label: "Avg. Sample Lead Time" },
      { value: "Zero", label: "Unapproved Extra Charges" },
    ],
    pain_title: "Are You Facing These Challenges?",
    pains: [
      "Found a factory on Alibaba but sample quality didn't match expectations",
      "MOQ is too high — first small order feels risky",
      "Need CPSIA or CE certification but don't know which factory qualifies",
      "Direct communication with factories is difficult and breaks down",
      "Missed deadlines caused your season launch to be delayed",
    ],
    solution_title: "KERYX Solves It",
    solutions: [
      { icon: "factory", title: "Only Verified Plush Factories", desc: "We match only factories personally visited and verified in Yangzhou & Guangzhou clusters. Quality records, certifications, and MOQ confirmed upfront." },
      { icon: "sample", title: "Dedicated PM from Sample Stage", desc: "A dedicated PM communicates directly with the factory from the very first sample. Revisions, fabric changes, and detail adjustments handled in your language." },
      { icon: "inspect", title: "Full Inspection + Photo Report", desc: "Full 100% inspection before shipment. Defects are separated on-site. Photo inspection report provided before delivery." },
      { icon: "cert", title: "Certification-Ready Factory Selection", desc: "We match factories capable of meeting CPSIA, CE, KC, FDA, and other required certifications." },
    ],
    process_title: "How It Works",
    process: [
      { step: "01", title: "Free Consultation", desc: "Tell us your product category, quantity, and certification requirements. Our MD will contact you within 24 hours." },
      { step: "02", title: "Factory Candidates", desc: "We propose 2~3 matching factories with comparison list and verification history." },
      { step: "03", title: "Sample Production", desc: "Samples produced at selected factory. PM communicates directly and reflects all revisions." },
      { step: "04", title: "Mass Production & Inspection", desc: "Mass production starts after sample approval. Full inspection before shipment with photo report." },
      { step: "05", title: "Delivery", desc: "LCL/FCL logistics to Korea or your designated country. Logistics cost quoted in advance." },
    ],
    spec_title: "Doll Types We Handle",
    specs: [
      { name: "Fabric Plush Dolls", detail: "Minky / Boa / Microfiber, 20~60cm, MOQ 500~1,000 pcs" },
      { name: "Private Brand OEM", detail: "Custom label + packaging, US/EU certification ready" },
      { name: "Character IP Dolls", detail: "Original IP or licensed characters, design collaboration available" },
      { name: "Mini Plush Keychains", detail: "5~10cm, bag charm hardware included, MOQ 300~500 pcs" },
      { name: "Doll Gift Sets", detail: "Box packaging sets, gift / gashapon ready" },
    ],
    faq_title: "Frequently Asked Questions",
    faqs: [
      { q: "What is the minimum order quantity (MOQ)?", a: "Typically 500~1,000 pcs depending on product type. Small first orders can be negotiated based on factory conditions." },
      { q: "How much does a sample cost?", a: "Sample cost is passed through at factory actual cost — typically ¥50~500 per piece. Some factories allow deduction from mass production order." },
      { q: "Can you handle CPSIA or CE certification?", a: "Yes. Tell us your certification requirements upfront and we'll match factories that hold the relevant certifications. We also support testing lab connections." },
      { q: "What is the typical lead time?", a: "Sample production: 20~30 days. Mass production: 30~45 days. We plan a reverse schedule together based on your season deadline." },
    ],
    cta_title: "Get Your Free Factory Matching Consultation",
    cta_sub: "Share your product details and our MD will contact you within 24 hours.",
    cta_btn: "Get Free Factory Matching",
  },
};

const iconMap: Record<string, JSX.Element> = {
  factory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M3 21h18M3 7v14M21 7v14M6 7V3l6 4 6-4v4M9 21v-4h6v4"/></svg>,
  sample: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>,
  inspect: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  cert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
};

export default function ChinaDollOEM() {
  const [lang, setLang] = useState<Lang>("ko");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const c = t[lang];

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} />

      {/* HERO */}
      <section className="pt-24 pb-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)" }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #d4a843 0%, transparent 70%)" }} />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full border" style={{ color: "#d4a843", borderColor: "rgba(212,168,67,0.3)", background: "rgba(212,168,67,0.08)" }}>
              {c.hero_eyebrow}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight whitespace-pre-line">
              {c.hero_title}
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">{c.hero_sub}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quote" className="inline-block px-8 py-4 text-base font-black text-gray-900 rounded-2xl shadow-xl hover:scale-[1.03] transition-all duration-200" style={{ background: "linear-gradient(135deg, #d4a843, #f59e0b)" }}>
                {c.hero_cta}
              </Link>
              <Link href="/portfolio" className="inline-block px-8 py-4 text-base font-bold text-white rounded-2xl border border-white/20 hover:bg-white/10 transition-all duration-200">
                {c.hero_cta2}
              </Link>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {c.stats.map((s, i) => (
              <div key={i} className="text-center p-5 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-2xl font-black mb-1" style={{ color: "#d4a843" }}>{s.value}</div>
                <div className="text-xs text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-10">{c.pain_title}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {c.pains.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2.5} className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTIONS */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-12">{c.solution_title}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {c.solutions.map((s, i) => (
              <div key={i} className="p-7 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0d1b3e, #1e3a6e)" }}>
                  {iconMap[s.icon]}
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">{c.process_title}</h2>
          <div className="grid sm:grid-cols-5 gap-4">
            {c.process.map((p, i) => (
              <div key={i} className="text-center p-5 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-3xl font-black mb-2" style={{ color: "#d4a843" }}>{p.step}</div>
                <h3 className="text-sm font-black text-white mb-2">{p.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPEC TABLE */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-10">{c.spec_title}</h2>
          <div className="space-y-3">
            {c.specs.map((s, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="sm:w-44 font-black text-gray-900 text-sm flex-shrink-0">{s.name}</div>
                <div className="text-sm text-gray-500">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-10">{c.faq_title}</h2>
          <div className="space-y-3">
            {c.faqs.map((f, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-900 text-sm pr-4">{f.q}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-5 h-5 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-4">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-5">{c.cta_title}</h2>
          <p className="text-white/55 text-base mb-10 max-w-xl mx-auto">{c.cta_sub}</p>
          <Link href="/quote" className="inline-block px-10 py-4 text-base font-black text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200" style={{ background: "linear-gradient(135deg, #d4a843, #f59e0b)" }}>
            {c.cta_btn}
          </Link>
        </div>
      </section>

      <PublicFooter lang={lang} theme="light" />
    </div>
  );
}
