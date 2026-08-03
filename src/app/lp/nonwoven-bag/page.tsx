"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

type Lang = "ko" | "zh" | "en";

const t = {
  ko: {
    hero_eyebrow: "부직포 보냉백 OEM 전문",
    hero_title: "부직포 보냉백 OEM,\n한국 최고 디자인으로",
    hero_sub: "중국 부직포 전문 공장 직접 연결. 디자인 개발부터 양산·검수·납품까지 KERYX가 함께합니다.",
    hero_cta: "무료 공장 매칭 진단 받기",
    hero_cta2: "포트폴리오 보기",
    stats: [
      { value: "25년", label: "부직포 가방 소싱 경험" },
      { value: "100%", label: "전수 검수 원칙" },
      { value: "다양한", label: "디자인 옵션" },
      { value: "0건", label: "미승인 추가 비용" },
    ],
    pain_title: "이런 어려움을 겪고 계신가요?",
    pains: [
      "보냉 기능은 있지만 디자인이 평범해서 경쟁력이 없다",
      "원단 두께·보냉재 품질이 샘플마다 달라 일관성이 없다",
      "대량 주문 시 납기가 지연되는 경험이 반복된다",
      "인쇄 색상이 시안과 달라 재작업 비용이 발생했다",
      "공장 직접 소통이 어렵고 중간 연락이 끊겼다",
    ],
    solution_title: "KERYX가 해결합니다",
    solutions: [
      { icon: "design", title: "디자인 개발 협력", desc: "한국 시장에 맞는 트렌디한 디자인을 공장과 함께 개발합니다. 색상 매칭, 인쇄 방식, 원단 선택을 전담 PM이 조율합니다." },
      { icon: "quality", title: "원단·보냉재 품질 관리", desc: "원단 두께, 알루미늄 보냉재 밀도, 지퍼·손잡이 내구성을 사전 검증합니다. 샘플마다 동일한 품질 기준을 유지합니다." },
      { icon: "inspect", title: "전수 검수 + 사진 보고서", desc: "출고 전 전수 검수를 진행하며 불량품은 현장에서 분리합니다. 검수 사진 보고서를 납품 전 제공합니다." },
      { icon: "delivery", title: "납기 준수 관리", desc: "생산 일정을 주 단위로 모니터링합니다. 납기 리스크가 발생하면 사전에 알리고 대안을 제시합니다." },
    ],
    process_title: "진행 순서",
    process: [
      { step: "01", title: "디자인 상담", desc: "사용 목적, 용량, 디자인 방향을 알려주세요." },
      { step: "02", title: "공장 매칭", desc: "조건에 맞는 부직포 전문 공장을 선별합니다." },
      { step: "03", title: "샘플 제작", desc: "디자인·원단·보냉재를 확정하고 샘플을 제작합니다." },
      { step: "04", title: "양산 & 검수", desc: "양산 후 전수 검수, 검수 보고서를 제공합니다." },
      { step: "05", title: "납품", desc: "LCL/FCL 물류로 한국에 납품합니다." },
    ],
    spec_title: "취급 가능 보냉백 유형",
    specs: [
      { name: "소형 보냉백 (6~10L)", detail: "도시락용·편의점용, 지퍼 개폐, MOQ 500~1,000개" },
      { name: "중형 보냉백 (15~20L)", detail: "장보기·피크닉용, 손잡이+어깨끈, MOQ 500개~" },
      { name: "대형 보냉백 (30L+)", detail: "캠핑·대용량 쇼핑용, 롤업·박스형, MOQ 300개~" },
      { name: "세트 구성", detail: "소·중·대 세트, 선물 패키지 포함, MOQ 300세트~" },
      { name: "PB 브랜드 OEM", detail: "자체 브랜드 라벨, 전면 인쇄, 맞춤 색상" },
    ],
    faq_title: "자주 묻는 질문",
    faqs: [
      { q: "최소 주문 수량(MOQ)은 얼마인가요?", a: "제품 유형에 따라 다르지만 일반적으로 300~1,000개입니다. 소량 첫 주문의 경우 공장 조건에 따라 협의 가능합니다." },
      { q: "디자인 개발도 함께 해주나요?", a: "네, 디자인 방향을 알려주시면 공장과 함께 개발합니다. 색상 매칭, 인쇄 방식, 원단 선택을 전담 PM이 조율합니다." },
      { q: "보냉 성능은 어떻게 검증하나요?", a: "알루미늄 보냉재 밀도, 두께, 지퍼 밀폐력을 샘플 단계에서 사전 검증합니다. 기준에 미달하면 원자재 교체를 요청합니다." },
      { q: "납기는 얼마나 걸리나요?", a: "샘플 제작 15~20일, 양산 25~35일이 일반적입니다. 시즌 수요에 맞춰 역산 스케줄을 함께 계획합니다." },
    ],
    cta_title: "보냉백 프로젝트를 시작하세요",
    cta_sub: "디자인 방향과 수량을 알려주시면 24시간 내 담당 MD가 연락드립니다.",
    cta_btn: "무료 공장 매칭 진단 받기",
  },
  zh: {
    hero_eyebrow: "无纺布保冷袋OEM专家",
    hero_title: "无纺布保冷袋OEM，\n以韩国顶级设计",
    hero_sub: "直接对接中国无纺布专业工厂。从设计开发到量产·检验·交货，KERYX全程陪同。",
    hero_cta: "免费工厂匹配诊断",
    hero_cta2: "查看案例",
    stats: [
      { value: "25年", label: "无纺布包袋采购经验" },
      { value: "100%", label: "全数检验原则" },
      { value: "多样化", label: "设计选项" },
      { value: "0件", label: "未经批准的额外费用" },
    ],
    pain_title: "您是否遇到这些困难？",
    pains: [
      "有保冷功能但设计普通，缺乏竞争力",
      "面料厚度·保冷材质量每次样品都不一致",
      "大批量订单时交期反复延迟",
      "印刷颜色与设计稿不符，产生返工费用",
      "与工厂直接沟通困难，中间联络中断",
    ],
    solution_title: "KERYX为您解决",
    solutions: [
      { icon: "design", title: "设计开发协作", desc: "与工厂共同开发符合韩国市场的时尚设计。专属PM协调颜色匹配、印刷方式和面料选择。" },
      { icon: "quality", title: "面料·保冷材质量管理", desc: "事先验证面料厚度、铝制保冷材密度、拉链·手柄耐久性。维持每次样品相同的质量标准。" },
      { icon: "inspect", title: "全数检验+照片报告", desc: "出货前进行全数检验，不良品现场分离。发货前提供检验照片报告。" },
      { icon: "delivery", title: "交期管理", desc: "按周监控生产进度。出现交期风险时提前告知并提出替代方案。" },
    ],
    process_title: "进行流程",
    process: [
      { step: "01", title: "设计咨询", desc: "请告知使用目的、容量和设计方向。" },
      { step: "02", title: "工厂匹配", desc: "筛选符合条件的无纺布专业工厂。" },
      { step: "03", title: "样品制作", desc: "确定设计·面料·保冷材后制作样品。" },
      { step: "04", title: "量产&检验", desc: "量产后全数检验，提供检验报告。" },
      { step: "05", title: "交货", desc: "通过LCL/FCL物流发货至韩国。" },
    ],
    spec_title: "可处理的保冷袋类型",
    specs: [
      { name: "小型保冷袋 (6~10L)", detail: "便当·便利店用，拉链开合，MOQ 500~1,000个" },
      { name: "中型保冷袋 (15~20L)", detail: "购物·野餐用，手柄+肩带，MOQ 500个~" },
      { name: "大型保冷袋 (30L+)", detail: "露营·大容量购物用，卷式·箱式，MOQ 300个~" },
      { name: "套装组合", detail: "小·中·大套装，含礼品包装，MOQ 300套~" },
      { name: "PB品牌OEM", detail: "自有品牌标签，全面印刷，定制颜色" },
    ],
    faq_title: "常见问题",
    faqs: [
      { q: "最小订购量(MOQ)是多少？", a: "根据产品类型不同，一般为300~1,000个。小批量首单可根据工厂条件协商。" },
      { q: "可以一起做设计开发吗？", a: "可以，请告知设计方向，我们将与工厂共同开发。专属PM协调颜色匹配、印刷方式和面料选择。" },
      { q: "保冷性能如何验证？", a: "在样品阶段事先验证铝制保冷材密度、厚度和拉链密封性。未达标准时要求更换原材料。" },
      { q: "交期需要多长时间？", a: "样品制作15~20天，量产25~35天为一般标准。我们会根据季节需求共同制定倒推计划。" },
    ],
    cta_title: "开始您的保冷袋项目",
    cta_sub: "请告知设计方向和数量，24小时内负责MD将与您联系。",
    cta_btn: "免费工厂匹配诊断",
  },
  en: {
    hero_eyebrow: "Nonwoven Cooler Bag OEM Specialist",
    hero_title: "Nonwoven Cooler Bag OEM —\nKorea's Best Design Quality",
    hero_sub: "Direct connection to China's specialized nonwoven fabric factories. KERYX guides you from design development to mass production, inspection, and delivery.",
    hero_cta: "Get Free Factory Matching",
    hero_cta2: "View Portfolio",
    stats: [
      { value: "25 Years", label: "Nonwoven Bag Sourcing" },
      { value: "100%", label: "Full Inspection Policy" },
      { value: "Diverse", label: "Design Options" },
      { value: "Zero", label: "Unapproved Extra Charges" },
    ],
    pain_title: "Are You Facing These Challenges?",
    pains: [
      "Cooler function works but design is generic — no competitive edge",
      "Fabric thickness and insulation quality vary between samples",
      "Delivery delays keep repeating on large orders",
      "Print colors don't match the design file — rework costs pile up",
      "Direct factory communication is difficult and breaks down",
    ],
    solution_title: "KERYX Solves It",
    solutions: [
      { icon: "design", title: "Design Development Collaboration", desc: "We develop trendy designs suited to the Korean market together with the factory. A dedicated PM coordinates color matching, print method, and fabric selection." },
      { icon: "quality", title: "Fabric & Insulation Quality Control", desc: "Fabric thickness, aluminum insulation density, and zipper/handle durability are verified at the sample stage. Consistent quality standards maintained across every sample." },
      { icon: "inspect", title: "Full Inspection + Photo Report", desc: "Full 100% inspection before shipment. Defects separated on-site. Photo inspection report provided before delivery." },
      { icon: "delivery", title: "Delivery Schedule Management", desc: "Production schedule monitored weekly. If delivery risk arises, we notify you in advance and propose alternatives." },
    ],
    process_title: "How It Works",
    process: [
      { step: "01", title: "Design Consultation", desc: "Tell us the intended use, capacity, and design direction." },
      { step: "02", title: "Factory Matching", desc: "We select specialized nonwoven factories that match your requirements." },
      { step: "03", title: "Sample Production", desc: "Design, fabric, and insulation confirmed — sample produced." },
      { step: "04", title: "Mass Production & Inspection", desc: "Full inspection after mass production with photo report." },
      { step: "05", title: "Delivery", desc: "LCL/FCL logistics delivery to Korea or your destination." },
    ],
    spec_title: "Cooler Bag Types We Handle",
    specs: [
      { name: "Small Cooler Bag (6~10L)", detail: "Lunch / convenience store use, zipper closure, MOQ 500~1,000 pcs" },
      { name: "Medium Cooler Bag (15~20L)", detail: "Grocery / picnic use, handle + shoulder strap, MOQ 500 pcs+" },
      { name: "Large Cooler Bag (30L+)", detail: "Camping / bulk shopping, roll-up / box style, MOQ 300 pcs+" },
      { name: "Set Combinations", detail: "S/M/L sets with gift packaging, MOQ 300 sets+" },
      { name: "Private Brand OEM", detail: "Custom label, full-surface print, custom colors" },
    ],
    faq_title: "Frequently Asked Questions",
    faqs: [
      { q: "What is the minimum order quantity (MOQ)?", a: "Typically 300~1,000 pcs depending on product type. Small first orders can be negotiated based on factory conditions." },
      { q: "Can you help with design development?", a: "Yes. Share your design direction and we'll develop it together with the factory. A dedicated PM coordinates color matching, print method, and fabric selection." },
      { q: "How is cooling performance verified?", a: "Aluminum insulation density, thickness, and zipper seal strength are verified at the sample stage. If standards aren't met, we request raw material replacement." },
      { q: "What is the typical lead time?", a: "Sample production: 15~20 days. Mass production: 25~35 days. We plan a reverse schedule together based on your seasonal demand." },
    ],
    cta_title: "Start Your Cooler Bag Project",
    cta_sub: "Share your design direction and quantity — our MD will contact you within 24 hours.",
    cta_btn: "Get Free Factory Matching",
  },
};

const iconMap: Record<string, JSX.Element> = {
  design: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  quality: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  inspect: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  delivery: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
};

export default function NonwovenBag() {
  const [lang, setLang] = useState<Lang>("ko");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const c = t[lang];

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} />

      {/* HERO */}
      <section className="pt-24 pb-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0a2818 50%, #0a1628 100%)" }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #d4a843 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full border" style={{ color: "#d4a843", borderColor: "rgba(212,168,67,0.3)", background: "rgba(212,168,67,0.08)" }}>
              {c.hero_eyebrow}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight whitespace-pre-line">{c.hero_title}</h1>
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
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0a2818, #1a5c38)" }}>
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
      <section className="py-20" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0a2818 100%)" }}>
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
                <div className="sm:w-52 font-black text-gray-900 text-sm flex-shrink-0">{s.name}</div>
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
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-900 text-sm pr-4">{f.q}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-5 h-5 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {openFaq === i && <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-4">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0a2818 100%)" }}>
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
