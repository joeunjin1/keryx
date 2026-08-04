"use client";
/**
 * /about — KERYX 회사 소개 & 사업구조 페이지
 * "IP 제안 + 장기 사업플랜 제시 기반 B2B 소싱 플랫폼" 핵심 비전 표현
 */
import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { useLangContext } from "@/components/layout/LangContext";

const texts = {
  ko: {
    hero_title: "IP 캐릭터를 개발하고 스토리를 연재하며\n상품과 콘텐츠를 만드는 IP 포털 기업",
    hero_sub: "오리지널 캐릭터 개발부터 세계관 구축, 스토리 연재, 상품 기획, 생산까지 — IP의 모든 것을 만듭니다",
    section1_title: "KERYX는 이런 기업입니다",
    section1_desc: "KERYX는 오리지널 IP 캐릭터를 개발하고, 세계관을 구축하며, 스토리를 연재합니다. 그리고 그 캐릭터에 맞는 상품과 콘텐츠를 기획하고, 전문 공장에서 직접 생산까지 합니다. 캐릭터의 탄생부터 소비자의 손에 닿기까지, IP의 전 과정을 운영하는 포털 기업입니다.",
    pillars: [
      { title: "오리지널 IP 개발", desc: "뿌찌프랜즈, 디노몬, 덕클 등 다양한 오리지널 캐릭터를 직접 개발하고 세계관을 구축합니다.", icon: "🎨" },
      { title: "스토리 & 콘텐츠 연재", desc: "동화, 웹툰, 숏폼 등 다양한 형태로 캐릭터의 이야기를 연재하며 IP 가치를 키워갑니다.", icon: "📖" },
      { title: "상품 기획 & 생산", desc: "캐릭터에 맞는 인형, 키링, 가방고리, 뽑기굿즈 등을 기획하고 전문 공장에서 직접 생산합니다.", icon: "🏭" },
      { title: "파트너와 함께 성장", desc: "IP를 활용한 장기 사업플랜을 파트너에게 제시하고, 함께 성장하는 생태계를 만듭니다.", icon: "🤝" },
    ],
    business_title: "사업 구조",
    business_flow: [
      { step: "01", title: "파트너 상담", desc: "사업 방향, 타겟 시장, 예산 파악" },
      { step: "02", title: "IP & 상품 제안", desc: "캐릭터 IP 제안 + 장기 사업플랜 설계" },
      { step: "03", title: "전문 공장 매칭", desc: "굿즈제작 최적화 공장 매칭 & 견적" },
      { step: "04", title: "샘플 개발 & 디자인", desc: "샘플 제작 + 패키지·인쇄 디자인 지원" },
      { step: "05", title: "100% 전수 검수", desc: "모든 상품 사진 증빙 + 실시간 보고" },
      { step: "06", title: "물류 & 납품", desc: "해상/항공 물류 + 한국 택배 지정 대행" },
    ],
    ip_title: "KERYX가 만드는 IP 유니버스",
    ip_desc: "뿌찌프랜즈(뿌찌빌리지 세계관, 동화 연재중), 디노몬(디노몬 아일랜드, 6종 공룡), 덕클(덕클 연못, 일상 에피소드) — 각 IP는 고유한 세계관과 스토리를 가지고 있으며, 캐릭터에 맞는 상품을 기획·생산합니다.",
    stats: [
      { value: "IP", label: "오리지널 캐릭터" },
      { value: "디자인", label: "완성 상품 디자인" },
      { value: "세계관", label: "IP 스토리 연재" },
      { value: "연재중", label: "동화·웹툰·소설" },
    ],
    cta_title: "파트너를 모집합니다",
    cta_desc: "무료 상담을 통해 귀사에 맞는 IP와 장기 사업플랜을 제안받으세요. 의뢰 단계에서는 비용이 없습니다.",
    cta_btn: "파트너 시작하기",
    why_title: "왜 KERYX인가?",
    why_items: [
      { title: "투명한 원가 공개", desc: "공장 원가 + 서비스 수수료를 분리 공개하여 신뢰를 구축합니다." },
      { title: "전담 MD 1:1 관리", desc: "전담 MD가 배정되어 소통부터 납품까지 책임집니다." },
      { title: "100% 전수 검수", desc: "모든 상품을 사진 증빙과 함께 전수 검수합니다." },
      { title: "SLA 자동 보상", desc: "납기 지연 시 자동으로 서비스 크레딧을 보상합니다." },
    ],
  },
  zh: {
    hero_title: "开发IP角色，连载故事\n创造商品和内容的IP门户企业",
    hero_sub: "从原创角色开发到世界观构建、故事连载、商品策划、生产 — 创造IP的一切",
    section1_title: "KERYX是这样的企业",
    section1_desc: "KERYX开发原创IP角色，构建世界观，连载故事。然后策划符合角色的商品和内容，并在专业工厂直接生产。从角色诞生到消费者手中，运营IP全过程的门户企业。",
    pillars: [
      { title: "原创IP开发", desc: "噗吉朋友、恐龙蒙、鸭克等多样原创角色直接开发并构建世界观。", icon: "🎨" },
      { title: "故事 & 内容连载", desc: "通过童话、网漫、短视频等多种形式连载角色故事，提升IP价值。", icon: "📖" },
      { title: "商品策划 & 生产", desc: "策划符合角色的毛绒玩偶、钥匙扣、包挂件、扭蛋周边等，并在专业工厂直接生产。", icon: "🏭" },
      { title: "与合作伙伴共同成长", desc: "向合作伙伴提出利用IP的长期事业规划，构建共同成长的生态系统。", icon: "🤝" },
    ],
    business_title: "事业结构",
    business_flow: [
      { step: "01", title: "合作伙伴咨询", desc: "了解事业方向、目标市场、预算" },
      { step: "02", title: "IP & 商品提案", desc: "角色IP提案 + 长期事业规划设计" },
      { step: "03", title: "专业工厂匹配", desc: "周边制作专业工厂匹配 & 报价" },
      { step: "04", title: "样品开发 & 设计", desc: "样品制作 + 包装·印刷设计支持" },
      { step: "05", title: "100%全数检验", desc: "所有商品照片证据 + 实时报告" },
      { step: "06", title: "物流 & 交货", desc: "海运/空运物流 + 韩国快递指定代行" },
    ],
    ip_title: "KERYX打造的IP宇宙",
    ip_desc: "噗吉朋友(噗吉村庄世界观，童话连载中)、恐龙怪兽(恐龙怪兽岛，6种恐龙)、鸭克(鸭克池塘，日常故事) — 每个IP都拥有独特的世界观和故事，策划·生产符合角色的商品。",
    stats: [
      { value: "IP", label: "原创角色" },
      { value: "设计", label: "完成商品设计" },
      { value: "世界观", label: "IP故事连载" },
      { value: "连载中", label: "童话·漫画·小说" },
    ],
    cta_title: "正在招募合作伙伴",
    cta_desc: "通过免费咨询，获取适合贵司的IP和长期事业规划提案。咨询阶段无任何费用。",
    cta_btn: "成为合作伙伴",
    why_title: "为什么选择KERYX？",
    why_items: [
      { title: "透明成本公开", desc: "分开公开工厂成本+服务手续费，建立信任。" },
      { title: "专属MD 1:1管理", desc: "分配专属MD，从沟通到交货全程负责。" },
      { title: "100%全数检验", desc: "所有商品配合照片证据进行全数检验。" },
      { title: "SLA自动补偿", desc: "交期延迟时自动补偿服务积分。" },
    ],
  },
};

const IP_SHOWCASE = [
  { name_ko: "뿌찌프랜즈", name_zh: "噗奇朋友", color: "#FF6B9D", gradient: "from-pink-400 to-rose-300", emoji: "🌸", slug: "ppuchi-friends", image: "/images/ip-characters/ppuji/dangppu.webp", desc_ko: "뿌찌빌리지 8명의 친구들", desc_zh: "噗吉村庄8位朋友" },
  { name_ko: "덕클", name_zh: "鸭克", color: "#FFB800", gradient: "from-amber-400 to-yellow-300", emoji: "🦆", slug: "duckle", image: "/images/ip-characters/duckle/duckle-front.png", desc_ko: "호기심 많은 노란 오리", desc_zh: "好奇心旺盛的黄色鸭子" },
  { name_ko: "디노몬", name_zh: "恐龙萌", color: "#10B981", gradient: "from-emerald-400 to-teal-300", emoji: "🦕", slug: "dinomon", image: "/images/ip-characters/dinomon/tino.png", desc_ko: "디노몬 아일랜드 6종 공룡", desc_zh: "恐龙怪兽岛6种恐龙" },
];

export default function AboutPage() {
  const { lang } = useLangContext();
  const t = texts[lang] || texts.ko;

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang} />

      {/* Hero */}
      <section className="relative py-28 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTJ2NEgyNFYwSDIydjRIMTB2Mkg4VjRIMHYyaDhWMGgydjZoMTJ2LTJoMlYwaDJ2NGgxMlYyaDJWMGgydjRoMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight whitespace-pre-line mb-6">
            {t.hero_title}
          </h1>
          <p className="text-lg md:text-xl text-indigo-200 max-w-2xl mx-auto">{t.hero_sub}</p>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            {t.stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-white">{s.value}</div>
                <div className="text-sm text-indigo-300 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What makes KERYX different */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-4">{t.section1_title}</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">{t.section1_desc}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.pillars.map((p, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow border border-gray-100">
                <span className="text-4xl block mb-4">{p.icon}</span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Flow */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-12">{t.business_title}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.business_flow.map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-5xl font-black text-gray-100">{step.step}</div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm mb-4">{step.step}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IP Showcase */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-4">{t.ip_title}</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">{t.ip_desc}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {IP_SHOWCASE.map((ip, i) => (
              <Link key={i} href="/ip-story" className={`block rounded-3xl p-8 bg-gradient-to-br ${ip.gradient} hover:scale-[1.02] transition-transform shadow-lg relative overflow-hidden`}>
                <div className="relative w-24 h-24 mb-4">
                  <Image src={ip.image} alt={lang === 'zh' ? ip.name_zh : ip.name_ko} fill className="object-contain drop-shadow-lg" sizes="96px" />
                </div>
                <h3 className="text-2xl font-black text-white mb-1">{lang === 'zh' ? ip.name_zh : ip.name_ko}</h3>
                <p className="text-white/80 text-sm mb-2">{lang === 'zh' ? ip.desc_zh : ip.desc_ko}</p>
                <div className="text-white/70 text-sm">→ {lang === 'zh' ? '查看详情' : '자세히 보기'}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why KERYX */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-12">{t.why_title}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {t.why_items.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">{t.cta_title}</h2>
          <p className="text-indigo-100 text-lg mb-8">{t.cta_desc}</p>
          <Link href="/quote" className="inline-flex items-center gap-2 px-10 py-5 bg-white text-indigo-700 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all">
            {t.cta_btn}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
