"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

type Lang = "ko" | "zh";

const t = {
  ko: {
    hero_eyebrow: "캐릭터 굿즈 OEM 전문",
    hero_title: "캐릭터 굿즈 OEM,\n아이디어에서 양산까지",
    hero_sub: "아크릴 키링·피규어·봉제·뱃지·포토카드 홀더까지. 게임·웹툰·K-POP 굿즈 전문 공장 네트워크를 보유하고 있습니다.",
    hero_cta: "무료 공장 매칭 진단 받기",
    hero_cta2: "포트폴리오 보기",
    stats: [
      { value: "9종", label: "취급 굿즈 카테고리" },
      { value: "4주", label: "평균 샘플 납기" },
      { value: "IP 감수", label: "게임사·레이블 대응" },
      { value: "다국가", label: "동시 발송 경험" },
    ],
    pain_title: "이런 어려움을 겪고 계신가요?",
    pains: [
      "굿즈 종류가 다양해서 공장을 여러 곳 관리해야 한다",
      "IP 감수 기준이 까다로워 공장이 맞추기 어렵다",
      "시즌 출시일에 맞춰 여러 SKU를 동시에 납품해야 한다",
      "소량 주문이라 공장에서 관심을 받기 어렵다",
      "해외 팬 대상 굿즈라 국제 발송 경험이 있는 공장이 필요하다",
    ],
    solution_title: "KERYX가 해결합니다",
    solutions: [
      { icon: "multi", title: "멀티 카테고리 원스톱", desc: "아크릴·PVC·봉제·금속·종이 등 카테고리별 전문 공장을 묶어 한 PM이 운영합니다. 여러 공장을 직접 관리할 필요가 없습니다." },
      { icon: "ip", title: "IP 감수 대응 노하우", desc: "게임사·엔터테인먼트 레이블의 IP 감수 기준에 맞춘 샘플 제작 경험이 있습니다. 색상 매칭, 라인 정확도, 마감 기준을 공장에 전달합니다." },
      { icon: "season", title: "시즌 역산 스케줄링", desc: "출시일을 기준으로 역산하여 각 카테고리별 생산 일정을 계획합니다. 동시 납품이 필요한 멀티 SKU 프로젝트 경험이 풍부합니다." },
      { icon: "global", title: "글로벌 발송 대응", desc: "한국·일본·미국·유럽 등 다국가 동시 발송 경험이 있습니다. LCL/FCL 및 소량 항공 발송 옵션을 제안합니다." },
    ],
    process_title: "진행 순서",
    process: [
      { step: "01", title: "굿즈 기획 상담", desc: "IP 정보, 굿즈 종류, 수량, 출시 일정을 알려주세요." },
      { step: "02", title: "카테고리별 공장 매칭", desc: "굿즈 종류에 따라 최적 공장을 선별합니다." },
      { step: "03", title: "샘플 & IP 감수", desc: "샘플 제작 후 IP 감수 기준에 맞게 수정합니다." },
      { step: "04", title: "양산 & 검수", desc: "시즌 일정에 맞춰 양산하고 출고 전 전수 검수합니다." },
      { step: "05", title: "동시 납품", desc: "출시일에 맞춰 국내외 동시 납품을 진행합니다." },
    ],
    spec_title: "취급 굿즈 카테고리",
    specs: [
      { name: "아크릴 키링·스탠드", detail: "투명 아크릴, 양면 인쇄, 다양한 형태 커팅, MOQ 200~500개" },
      { name: "PVC 피규어·배지", detail: "소프트 PVC, 하드 PVC, 에나멜 핀, MOQ 300~500개" },
      { name: "봉제 굿즈", detail: "미니 봉제 인형, 봉제 키링, 쿠션, MOQ 300~500개" },
      { name: "포토카드·홀더", detail: "포토카드, 슬리브, 홀더, 앨범 패키지, MOQ 500개~" },
      { name: "에코백·파우치", detail: "캔버스·부직포 에코백, 지퍼 파우치, MOQ 300개~" },
      { name: "금속 굿즈", detail: "메탈 키링, 에나멜 핀, 뱃지, MOQ 300~500개" },
    ],
    faq_title: "자주 묻는 질문",
    faqs: [
      { q: "여러 종류의 굿즈를 한 번에 의뢰할 수 있나요?", a: "네, 멀티 카테고리 프로젝트가 KERYX의 강점입니다. 카테고리별 전문 공장을 묶어 한 PM이 운영하므로 여러 공장을 직접 관리할 필요가 없습니다." },
      { q: "IP 감수가 까다로운 경우에도 가능한가요?", a: "게임사·엔터테인먼트 레이블의 IP 감수 기준에 맞춘 샘플 제작 경험이 있습니다. 감수 기준서를 공유해 주시면 공장에 정확히 전달합니다." },
      { q: "소량 주문도 가능한가요?", a: "카테고리에 따라 MOQ 200~500개부터 가능합니다. 소량 첫 주문의 경우 공장 조건에 따라 협의 가능합니다." },
      { q: "시즌 출시일에 맞춰 납품이 가능한가요?", a: "출시일을 기준으로 역산하여 생산 일정을 계획합니다. 시즌 동기화 멀티 SKU 납품 경험이 풍부합니다." },
    ],
    cta_title: "캐릭터 굿즈 프로젝트를 시작하세요",
    cta_sub: "IP 정보와 굿즈 종류를 알려주시면 24시간 내 담당 MD가 연락드립니다.",
    cta_btn: "무료 공장 매칭 진단 받기",
  },
  zh: {
    hero_eyebrow: "IP周边商品OEM专家",
    hero_title: "IP周边商品OEM，\n从创意到量产",
    hero_sub: "亚克力挂件·手办·毛绒·徽章·卡片夹等。拥有游戏·漫画·K-POP周边专业工厂网络。",
    hero_cta: "免费工厂匹配诊断",
    hero_cta2: "查看案例",
    stats: [
      { value: "9类", label: "周边商品类别" },
      { value: "4周", label: "平均样品交期" },
      { value: "IP审核", label: "游戏公司·厂牌对应" },
      { value: "多国", label: "同时发货经验" },
    ],
    pain_title: "您是否遇到这些困难？",
    pains: [
      "周边种类多，需要管理多家工厂",
      "IP审核标准严格，工厂难以达到要求",
      "需要在季节发布日同时交付多个SKU",
      "小批量订单难以获得工厂关注",
      "面向海外粉丝的周边，需要有国际发货经验的工厂",
    ],
    solution_title: "KERYX为您解决",
    solutions: [
      { icon: "multi", title: "多品类一站式服务", desc: "将亚克力·PVC·毛绒·金属·纸质等各品类专业工厂整合，由一位PM统一运营。无需直接管理多家工厂。" },
      { icon: "ip", title: "IP审核应对经验", desc: "拥有符合游戏公司·娱乐厂牌IP审核标准的样品制作经验。将颜色匹配、线条精度、收尾标准传达给工厂。" },
      { icon: "season", title: "季节倒推排期", desc: "以发布日为基准倒推，规划各品类生产日程。拥有丰富的多SKU同时交付项目经验。" },
      { icon: "global", title: "全球发货对应", desc: "拥有韩国·日本·美国·欧洲等多国同时发货经验。提供LCL/FCL及小批量空运选项。" },
    ],
    process_title: "进行流程",
    process: [
      { step: "01", title: "周边企划咨询", desc: "请告知IP信息、周边种类、数量和发布日程。" },
      { step: "02", title: "按品类工厂匹配", desc: "根据周边种类筛选最优工厂。" },
      { step: "03", title: "样品&IP审核", desc: "制作样品后按IP审核标准进行修改。" },
      { step: "04", title: "量产&检验", desc: "按季节日程量产，出货前全数检验。" },
      { step: "05", title: "同时交货", desc: "按发布日进行国内外同时交货。" },
    ],
    spec_title: "可处理的周边类别",
    specs: [
      { name: "亚克力挂件·立牌", detail: "透明亚克力，双面印刷，多种形状裁切，MOQ 200~500个" },
      { name: "PVC手办·徽章", detail: "软PVC、硬PVC、珐琅别针，MOQ 300~500个" },
      { name: "毛绒周边", detail: "迷你毛绒玩具、毛绒挂件、抱枕，MOQ 300~500个" },
      { name: "卡片·卡套", detail: "卡片、卡套、卡夹、专辑包装，MOQ 500个~" },
      { name: "环保袋·收纳袋", detail: "帆布·无纺布环保袋、拉链收纳袋，MOQ 300个~" },
      { name: "金属周边", detail: "金属挂件、珐琅别针、徽章，MOQ 300~500个" },
    ],
    faq_title: "常见问题",
    faqs: [
      { q: "可以同时委托多种周边吗？", a: "可以，多品类项目是KERYX的强项。各品类专业工厂由一位PM统一运营，无需直接管理多家工厂。" },
      { q: "IP审核严格的情况也能处理吗？", a: "拥有符合游戏公司·娱乐厂牌IP审核标准的样品制作经验。请共享审核标准书，我们将准确传达给工厂。" },
      { q: "可以接受小批量订单吗？", a: "根据品类不同，最低从MOQ 200~500个开始。小批量首单可根据工厂条件协商。" },
      { q: "能按季节发布日交货吗？", a: "以发布日为基准倒推规划生产日程。拥有丰富的季节同步多SKU交货经验。" },
    ],
    cta_title: "开始您的IP周边项目",
    cta_sub: "请告知IP信息和周边种类，24小时内负责MD将与您联系。",
    cta_btn: "免费工厂匹配诊断",
  },
  en: {
    hero_eyebrow: "Character Goods OEM Specialist",
    hero_title: "Character Goods OEM —\nFrom Concept to Mass Production",
    hero_sub: "Acrylic keychains, figures, plush, badges, photocard holders and more. Specialized factory network for game, webtoon, and K-POP merchandise.",
    hero_cta: "Get Free Factory Matching",
    hero_cta2: "View Portfolio",
    stats: [
      { value: "9 Types", label: "Goods Categories" },
      { value: "4 Weeks", label: "Avg. Sample Lead Time" },
      { value: "IP Review", label: "Game & Label Ready" },
      { value: "Multi-Country", label: "Simultaneous Shipping" },
    ],
    pain_title: "Are You Facing These Challenges?",
    pains: [
      "Managing multiple factories for different goods types is exhausting",
      "IP approval standards are strict and factories struggle to meet them",
      "Multiple SKUs need to arrive simultaneously on season launch day",
      "Small orders get ignored by factories",
      "Need a factory with international shipping experience for overseas fans",
    ],
    solution_title: "KERYX Solves It",
    solutions: [
      { icon: "multi", title: "Multi-Category One-Stop", desc: "We bundle specialized factories for acrylic, PVC, plush, metal, and paper goods under one PM. No need to manage multiple factories yourself." },
      { icon: "ip", title: "IP Approval Expertise", desc: "Experienced in producing samples that meet game company and entertainment label IP standards. Color matching, line accuracy, and finish standards are communicated precisely to factories." },
      { icon: "season", title: "Season Reverse Scheduling", desc: "We plan production schedules reverse-calculated from your launch date. Extensive experience with multi-SKU simultaneous delivery projects." },
      { icon: "global", title: "Global Shipping Ready", desc: "Experience with simultaneous multi-country shipping to Korea, Japan, US, and Europe. LCL/FCL and small-batch air freight options available." },
    ],
    process_title: "How It Works",
    process: [
      { step: "01", title: "Goods Planning Consultation", desc: "Share your IP info, goods types, quantities, and launch schedule." },
      { step: "02", title: "Category-by-Category Matching", desc: "We select optimal factories for each goods type." },
      { step: "03", title: "Sample & IP Review", desc: "Samples produced and revised to meet IP approval standards." },
      { step: "04", title: "Mass Production & Inspection", desc: "Production on season schedule with full inspection before shipment." },
      { step: "05", title: "Simultaneous Delivery", desc: "Domestic and international simultaneous delivery on launch day." },
    ],
    spec_title: "Goods Categories We Handle",
    specs: [
      { name: "Acrylic Keychains & Stands", detail: "Clear acrylic, double-sided print, custom die-cut shapes, MOQ 200~500 pcs" },
      { name: "PVC Figures & Badges", detail: "Soft PVC, hard PVC, enamel pins, MOQ 300~500 pcs" },
      { name: "Plush Goods", detail: "Mini plush dolls, plush keychains, cushions, MOQ 300~500 pcs" },
      { name: "Photocards & Holders", detail: "Photocards, sleeves, holders, album packaging, MOQ 500 pcs+" },
      { name: "Eco Bags & Pouches", detail: "Canvas/nonwoven eco bags, zip pouches, MOQ 300 pcs+" },
      { name: "Metal Goods", detail: "Metal keychains, enamel pins, badges, MOQ 300~500 pcs" },
    ],
    faq_title: "Frequently Asked Questions",
    faqs: [
      { q: "Can I order multiple types of goods at once?", a: "Yes — multi-category projects are KERYX's specialty. Specialized factories for each category are managed by a single PM, so you don't need to manage multiple factories yourself." },
      { q: "Can you handle strict IP approval standards?", a: "Yes. We have experience producing samples that meet game company and entertainment label IP standards. Share your approval guidelines and we'll communicate them precisely to the factory." },
      { q: "Are small orders possible?", a: "Depending on category, MOQ starts from 200~500 pcs. Small first orders can be negotiated based on factory conditions." },
      { q: "Can you guarantee delivery by season launch date?", a: "We plan production schedules reverse-calculated from your launch date. We have extensive experience with season-synchronized multi-SKU delivery." },
    ],
    cta_title: "Start Your Character Goods Project",
    cta_sub: "Share your IP info and goods types — our MD will contact you within 24 hours.",
    cta_btn: "Get Free Factory Matching",
  },
};

const iconMap: Record<string, JSX.Element> = {
  multi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  ip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  season: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  global: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

export default function CharacterGoods() {
  const [lang, setLang] = useState<Lang>("ko");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const c = t[lang];

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} />

      {/* HERO */}
      <section className="pt-24 pb-20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a0a3e 50%, #0a1628 100%)" }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }} />
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
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #1a0a3e, #3b1a7e)" }}>
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
      <section className="py-20" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a0a3e 100%)" }}>
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
      <section className="py-24" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a0a3e 100%)" }}>
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
