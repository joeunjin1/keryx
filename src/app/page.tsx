"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { FloatingContact } from '@/components/ui/FloatingContact';
import { useLangContext } from '@/components/layout/LangContext';

// ── 다국어 텍스트 ──────────────────────────────────────────────
const texts = {
  ko: {
    hero_badge: 'IP 캐릭터 개발 · 스토리 연재 · 굿즈 제조 포털',
    hero_title: '캐릭터를 만들고\n스토리를 연재하며\n상품으로 세상에 내놓습니다',
    hero_sub: '오리지널 IP 개발 · 세계관 스토리 연재 · 굿즈 기획/생산 · 콘텐츠 제작',
    hero_desc: 'KERYX는 오리지널 캐릭터 IP를 개발하고, 각 캐릭터의 세계관과 스토리를 연재하며, 그에 맞는 상품과 콘텐츠를 기획·제조하는 IP 포털 기업입니다.',
    hero_cta_start: '파트너 시작하기',
    hero_cta_showroom: 'IP 쇼룸 보기',
    hero_cta_how: '진행 방법 보기',
    stat1_num: '3+', stat1_label: '오리지널 IP 시리즈',
    stat2_num: '연재중', stat2_label: 'IP 스토리 & 콘텐츠',
    stat3_num: '50+', stat3_label: '종 IP 굿즈 라인업',
    stat4_num: '직접', stat4_label: '기획부터 생산까지',
    // 파트너 모집 섹션
    partner_badge: 'Partner Recruitment',
    partner_title: 'IP 사업을 함께할 파트너를 찾습니다',
    partner_desc: 'KERYX는 자체 개발한 IP 캐릭터와 스토리 콘텐츠를 기반으로, 파트너와 함께 상품을 기획하고 생산하여 시장에 내놓는 장기적 IP 사업 파트너십을 추구합니다.',
    partner_steps: [
      { num: '01', title: 'IP 제안 & 아이템 결정', desc: '파트너의 타겟 시장에 맞는 IP와 상품을 제안합니다. 뿌찌프랜즈, 덕클, 디노몬 등 자체 IP 또는 맞춤 디자인 개발이 가능합니다.' },
      { num: '02', title: '샘플 개발 & 디자인 지원', desc: '아이템 결정과 동시에 샘플 제작을 시작합니다. 패키지 디자인, 인쇄 디자인까지 원스톱으로 지원하여 초기 출발에 힘이 됩니다.' },
      { num: '03', title: '전문 공장 매칭 & 생산', desc: '굿즈 제작에 최적화된 전문 공장들과 일합니다. 아이템 결정과 동시에 쉽고 빠른 진행을 약속합니다.' },
      { num: '04', title: '100% 검수 & 납품', desc: '전수 검수 후 사진 증빙과 함께 안전하게 납품합니다. 불량 발생 시 즉시 재생산 보장합니다.' },
    ],
    partner_cta: '파트너 문의하기',
    partner_benefit_title: '파트너가 되면',
    partner_benefits: [
      '장기적 성장이 가능한 IP 사업플랜 제시',
      '자체 IP를 활용한 독점 굿즈 기획',
      '샘플 개발 + 패키지/인쇄 디자인 무료 지원',
      '전담 MD 1:1 배정으로 빠른 소통',
    ],
    // IP 섹션
    ip_section_badge: 'IP Universe — 연재중',
    ip_section_title: '우리가 만들고 있는 캐릭터와 세계관',
    ip_section_desc: '뿌찌프랜즈, 덕클, 디노몬 — 각각 고유한 세계관과 스토리를 가진 KERYX 오리지널 캐릭터입니다. 스토리를 연재하며 캐릭터를 성장시키고, 그에 맞는 상품과 콘텐츠를 지속적으로 개발하고 있습니다.',
    ip_cta: 'IP 스토리 & 세계관 보기',
    ip_propose: 'IP 굿즈 보기',
    // 카탈로그 섹션
    catalog_badge: 'B2B Product Catalog',
    catalog_title: '바로 진행 가능한 검증 상품',
    catalog_desc: '인형, 가방고리, 뽑기 굿즈, 보냉백 등 — 모든 상품은 전문 공장에서 즉시 생산 가능하며, KERYX 품질 기준을 통과한 검증 제품입니다.',
    catalog_cta: '전체 카탈로그 보기',
    catalog_moq: '최소주문',
    catalog_featured: '추천',
    catalog_new: 'NEW',
    // 서비스 섹션
    svc_badge: 'What We Do',
    svc_title: 'IP에서 상품까지, 이렇게 만듭니다',
    svc_desc: '캐릭터 개발부터 스토리 연재, 상품 기획, 생산, 콘텐츠 제작까지 — IP의 모든 과정을 직접 수행합니다.',
    svc_items: [
      { icon: 'search', title: '캐릭터 & 세계관 개발', desc: '오리지널 캐릭터를 디자인하고 고유한 세계관과 스토리를 구축합니다' },
      { icon: 'factory', title: '스토리 연재 & 콘텐츠', desc: '각 캐릭터의 에피소드를 연재하며 팬덤과 브랜드 가치를 키웁니다' },
      { icon: 'inspect', title: '상품 아이디어 기획', desc: '스토리에 맞는 굿즈 아이디어를 기획하고 디자인합니다' },
      { icon: 'ship', title: '샘플 개발 & 생산', desc: '전문 공장에서 샘플을 개발하고 양산까지 직접 진행합니다' },
      { icon: 'plan', title: '검수 & 품질 관리', desc: '100% 전수 검수로 완벽한 품질의 상품만 출하합니다' },
      { icon: 'protect', title: '파트너 & 유통', desc: '파트너와 함께 IP 굿즈를 시장에 내놓고 함께 성장합니다' },
    ],
    // IP 라이선스 무료 제공
    license_badge: 'IP License — FREE',
    license_title: 'IP 라이선스를 무료로 제공합니다',
    license_desc: 'KERYX는 자체 개발 IP(뿌찌프랜즈, 덕클, 디노몬)의 라이선스를 파트너에게 무료로 제공합니다. 유통업체와 독점 또는 공동 판매 계약을 통해 함께 성장하는 모델입니다.',
    license_items: [
      { title: '라이선스 비용 0원', desc: '자체 IP 사용에 별도 로열티가 없습니다. 상품 제작과 판매에만 집중하세요.' },
      { title: '독점 판매 계약', desc: '특정 카테고리 또는 지역에서 독점 판매권을 부여합니다.' },
      { title: '공동 판매 모델', desc: '여러 유통 채널에서 함께 판매하며 수익을 공유합니다.' },
      { title: '장기 파트너십', desc: '일회성 거래가 아닌, IP를 함께 키워가는 장기 사업 파트너입니다.' },
    ],
    // B2B 구독 서비스
    subscribe_badge: 'B2B Weekly Report',
    subscribe_title: '매주 B2B 트렌드 정보를 받아보세요',
    subscribe_desc: '이메일과 사업자 정보를 등록하시면, 사업자 확인 후 매주 IP 굿즈 트렌드, 신상품 정보, 시장 동향을 보내드립니다.',
    subscribe_placeholder_email: '이메일 주소',
    subscribe_placeholder_company: '회사명',
    subscribe_placeholder_phone: '연락처',
    subscribe_btn: '무료 구독 신청',
    subscribe_note: '* 사업자 등록증 확인 후 B2B 정보가 발송됩니다',
    subscribe_benefits: ['IP 굿즈 트렌드 리포트', '신상품 & 베스트셀러 정보', '시장 동향 & 가격 분석', '파트너 전용 할인 안내'],
    // CTA
    cta_title: '지금 파트너를 시작하세요',
    cta_desc: '의뢰 단계에서는 비용이 발생하지 않습니다. 영업일 2일 내 전담 MD가 연락드립니다.',
    cta_btn1: '무료 견적 의뢰',
    cta_btn2: '서비스 자세히 보기',
    // Why KERYX
    trust_badge: 'Why KERYX',
    trust_title: 'KERYX가 특별한 이유',
    trust_items: [
      { title: '직접 만드는 IP', desc: '외부 라이선스가 아닌, 자체 개발 캐릭터와 세계관으로 독보적 경쟁력을 가집니다.' },
      { title: '스토리가 있는 상품', desc: '단순 캐릭터 상품이 아닌, 스토리와 세계관이 담긴 콘텐츠 기반 굿즈입니다.' },
      { title: '기획부터 생산까지', desc: '캐릭터 디자인, 스토리 개발, 상품 기획, 생산을 모두 직접 수행합니다.' },
      { title: '함께 성장하는 파트너십', desc: 'IP 사업을 함께할 파트너에게 장기적 성장 로드맵을 제시합니다.' },
    ],
  },
  zh: {
    hero_badge: 'IP角色开发 · 故事连载 · 周边制造门户',
    hero_title: '创造角色\n连载故事\n将产品带到世界',
    hero_sub: '原创IP开发 · 世界观故事连载 · 周边策划/生产 · 内容制作',
    hero_desc: 'KERYX是一家开发原创角色IP、连载各角色世界观与故事、策划并制造相应产品与内容的IP门户企业。',
    hero_cta_start: '成为合作伙伴',
    hero_cta_showroom: 'IP展厅',
    hero_cta_how: '了解流程',
    stat1_num: '3+', stat1_label: '原创IP系列',
    stat2_num: '连载中', stat2_label: 'IP故事&内容',
    stat3_num: '50+', stat3_label: '种IP周边产品线',
    stat4_num: '直接', stat4_label: '从策划到生产',
    partner_badge: '合作伙伴招募',
    partner_title: '寻找共同成长的合作伙伴',
    partner_desc: 'KERYX不做一次性交易，追求长期事业合作关系。从IP提案到样品开发、包装设计、工厂匹配、检验、交货——从合作伙伴的起步到成长，全程陪伴。',
    partner_steps: [
      { num: '01', title: 'IP提案 & 商品确定', desc: '根据合作伙伴的目标市场推荐IP和商品。可使用噗奇朋友、鸭克、恐龙萌等自有IP，也可定制设计开发。' },
      { num: '02', title: '样品开发 & 设计支持', desc: '确定商品后立即开始样品制作。包装设计、印刷设计一站式支持，助力初期启动。' },
      { num: '03', title: '专业工厂匹配 & 生产', desc: '与周边制作专业工厂合作。确定商品后即可快速推进。' },
      { num: '04', title: '100%检验 & 交货', desc: '全检后附照片证明安全交货。如有不良品立即重新生产。' },
    ],
    partner_cta: '合作咨询',
    partner_benefit_title: '成为合作伙伴后',
    partner_benefits: [
      '提供可持续增长的贸易规划',
      '利用自有IP策划独家周边',
      '样品开发 + 包装/印刷设计免费支持',
      '专属MD 1对1分配，快速沟通',
    ],
    ip_section_badge: 'IP Universe — 连载中',
    ip_section_title: '我们正在创造的角色与世界观',
    ip_section_desc: '嘔奇朋友、鸭克、恐龙萌 — 各自拥有独特世界观和故事的KERYX原创角色。我们连载故事、培育角色，并持续开发相应的产品和内容。',
    ip_cta: 'IP故事&世界观',
    ip_propose: 'IP周边产品',
    catalog_badge: 'IP商品目录',
    catalog_title: 'KERYX IP商品系列',
    catalog_desc: '噗奇朋友、鸭克、迪诺蒙 — KERYX原创IP制作的毛绒公仔、钥匙扣、包挂件、扮蛋周边。免费授权可立即开始。',
    catalog_cta: '查看全部目录',
    catalog_moq: '起订量',
    catalog_featured: '推荐',
    catalog_new: 'NEW',
    svc_badge: '我们做什么',
    svc_title: '从IP到产品，这样制造',
    svc_desc: '从角色开发到故事连载、产品策划、生产、内容制作 — 直接执行IP的所有过程。',
    svc_items: [
      { icon: 'search', title: '角色&世界观开发', desc: '设计原创角色，构建独特的世界观和故事' },
      { icon: 'factory', title: '故事连载&内容', desc: '连载各角色的故事，培育粉丝和品牌价值' },
      { icon: 'inspect', title: '产品创意策划', desc: '根据故事策划周边创意并进行设计' },
      { icon: 'ship', title: '样品开发&生产', desc: '在专业工厂开发样品并直接进行量产' },
      { icon: 'plan', title: '检验&品质管理', desc: '100%全检，只出货完美品质的产品' },
      { icon: 'protect', title: '合作伙伴&渠道', desc: '与合作伙伴一起将IP周边推向市场，共同成长' },
    ],
    // IP 授权免费提供
    license_badge: 'IP License — FREE',
    license_title: '免费提供IP授权',
    license_desc: 'KERYX将自主开发的IP（噗奇朋友、鸭克、恐龙萌）授权免费提供给合作伙伴。通过与渠道商签订独家或联合销售协议，实现共同成长。',
    license_items: [
      { title: '授权费用0元', desc: '使用自有IP无需支付版权费。专注产品制作和销售。' },
      { title: '独家销售协议', desc: '在特定品类或地区授予独家销售权。' },
      { title: '联合销售模式', desc: '在多个渠道共同销售，共享收益。' },
      { title: '长期合作', desc: '不是一次性交易，而是共同培育IP的长期事业伙伴。' },
    ],
    // B2B订阅服务
    subscribe_badge: 'B2B Weekly Report',
    subscribe_title: '每周接收B2B趋势信息',
    subscribe_desc: '注册邮箱和企业信息后，经营业执照确认后，每周发送IP周边趋势、新品信息、市场动态。',
    subscribe_placeholder_email: '邮箱地址',
    subscribe_placeholder_company: '公司名称',
    subscribe_placeholder_phone: '联系电话',
    subscribe_btn: '免费订阅',
    subscribe_note: '* 经营业执照确认后发送B2B信息',
    subscribe_benefits: ['IP周边趋势报告', '新品&畅销品信息', '市场动态&价格分析', '合作伙伴专属优惠'],
    // CTA
    cta_title: '立即成为合作伙伴',
    cta_desc: '咨询阶段不产生费用。2个工作日内专属MD联系您。',
    cta_btn1: '免费询价',
    cta_btn2: '了解服务详情',
    trust_badge: 'Why KERYX',
    trust_title: 'KERYX的特别之处',
    trust_items: [
      { title: '直接创造的IP', desc: '不是外部授权，而是自主开发的角色和世界观，拥有独特竞争力。' },
      { title: '有故事的产品', desc: '不是简单的角色商品，而是融入故事和世界观的内容型周边。' },
      { title: '从策划到生产', desc: '角色设计、故事开发、产品策划、生产全部直接执行。' },
      { title: '共同成长的合作', desc: '为IP事业合作伙伴提供长期成长路线图。' },
    ],
  },
};

// ── IP 캐릭터 데이터 ──────────────────────────────────────────
const IP_CHARACTERS = [
  {
    slug: 'ppuchi-friends',
    name_ko: '뿌찌프랜즈', name_zh: '噗奇朋友',
    tagline_ko: '귀여움이 폭발하는 뿌찌 패밀리',
    tagline_zh: '可爱爆炸的噗奇家族',
    color: '#FF6B9D', gradient: 'from-pink-400 to-rose-300',
    image: '/images/ip/ppuchi-friends-hero.jpg',
    products: ['인형', '키링', '가방고리', '뽑기 굿즈'],
    products_zh: ['公仔', '钥匙扣', '包挂件', '扭蛋周边'],
  },
  {
    slug: 'duckle',
    name_ko: '덕클', name_zh: '鸭克',
    tagline_ko: '유쾌한 오리 친구들의 모험',
    tagline_zh: '欢乐鸭子朋友的冒险',
    color: '#FFB800', gradient: 'from-amber-400 to-yellow-300',
    image: '/images/ip/duckle-hero.jpg',
    products: ['인형', '보냉백', '키링', '피규어'],
    products_zh: ['公仔', '保温袋', '钥匙扣', '手办'],
  },
  {
    slug: 'dinomon',
    name_ko: '디노몬', name_zh: '恐龙萌',
    tagline_ko: '작지만 용감한 공룡 세계',
    tagline_zh: '虽小但勇敢的恐龙世界',
    color: '#10B981', gradient: 'from-emerald-400 to-teal-300',
    image: '/images/ip/dinomon-hero.jpg',
    products: ['인형', '피규어', '뽑기 굿즈', '문구'],
    products_zh: ['公仔', '手办', '扭蛋周边', '文具'],
  },
];

// ── B2B 구독 폼 컴포넌트 ────────────────────────────────────────
function SubscribeForm({ lang, t }: { lang: string; t: any }) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company_name: company, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(lang === 'zh' ? '订阅申请已提交！确认后发送。' : '구독 신청이 완료되었습니다! 사업자 확인 후 발송됩니다.');
        setEmail(''); setCompany(''); setPhone('');
      } else {
        setStatus('error');
        setMessage(data.error || '오류가 발생했습니다.');
      }
    } catch {
      setStatus('error');
      setMessage(lang === 'zh' ? '网络错误，请重试。' : '네트워크 오류가 발생했습니다.');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center p-8 rounded-xl bg-green-50 border border-green-200">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-green-800 font-bold">{message}</p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t.subscribe_placeholder_email} className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition" />
      <input type="text" required value={company} onChange={e => setCompany(e.target.value)} placeholder={t.subscribe_placeholder_company} className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition" />
      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t.subscribe_placeholder_phone} className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition" />
      <button type="submit" disabled={status === 'loading'} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors text-lg disabled:opacity-50">
        {status === 'loading' ? (lang === 'zh' ? '提交中...' : '제출 중...') : t.subscribe_btn}
      </button>
      {status === 'error' && <p className="text-xs text-red-500 text-center">{message}</p>}
      <p className="text-xs text-gray-400 text-center">{t.subscribe_note}</p>
    </form>
  );
}

// ── 메인 페이지 컴포넌트 ──────────────────────────────────────
export default function HomePage() {
  const { lang } = useLangContext();
  const t = texts[lang] || texts.ko;
  const [heroVisible, setHeroVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    // IP 굿즈 상품만 우선 노출 (ip_character_id가 있는 상품)
    supabase
      .from('products')
      .select('id, product_code, name_ko, name_zh, name_en, sell_price_cny, moq, image_url, is_featured, is_new, is_hot, ip_character_id')
      .eq('catalog_visible', true)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .not('ip_character_id', 'is', null)
      .is('deleted_at', null)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        // IP 상품이 없으면 products를 비워두어 정적 IP 굿즈 카드가 표시되도록 함
        if (data && data.length > 0) setProducts(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang} theme="dark" />
      <FloatingContact />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute inset-0">
          <Image src="/images/hero/hero-banner-bg.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,15,30,0.85) 0%, rgba(26,16,64,0.8) 40%, rgba(13,27,42,0.85) 100%)' }} />
        </div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #d4a843, transparent)' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={`transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/30 bg-amber-400/5 mb-8">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-300/90 text-sm font-medium">{t.hero_badge}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 whitespace-pre-line">{t.hero_title}</h1>
              <p className="text-amber-300/90 text-lg md:text-xl font-semibold mb-4">{t.hero_sub}</p>
              <p className="text-white/50 text-base leading-relaxed mb-10 max-w-lg">{t.hero_desc}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/quote" className="px-7 py-4 text-base font-bold text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}>{t.hero_cta_start}</Link>
                <Link href="/showroom" className="px-7 py-4 text-base font-bold text-white border-2 border-white/30 rounded-2xl hover:bg-white/10 hover:border-white/60 transition-all">{t.hero_cta_showroom}</Link>
                <Link href="/services" className="px-7 py-4 text-base font-bold text-white/80 border border-white/20 rounded-2xl hover:bg-white/5 hover:text-white transition-all">{t.hero_cta_how}</Link>
              </div>
            </div>
            <div className={`transition-all duration-1000 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* IP 상품 이미지 그리드 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { img: '/images/ip-goods/ppuchi-plush-doll.webp', label: lang === 'zh' ? '噗奇公仔' : '뿌찌 인형' },
                  { img: '/images/ip-goods/duckle-keychain.webp', label: lang === 'zh' ? '鸭克钥匙扣' : '덕클 키링' },
                  { img: '/images/ip-goods/dinomon-bag-charm.webp', label: lang === 'zh' ? '恐龙萌包挂' : '디노몬 가방고리' },
                  { img: '/images/ip-goods/ppuchi-gacha-set.webp', label: lang === 'zh' ? '扭蛋套装' : '뽑기 세트' },
                ].map((item, i) => (
                  <Link key={i} href="/ip-goods" className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all">
                    <div className="aspect-square relative">
                      <Image src={item.img} alt={item.label} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 40vw, 20vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <span className="text-white text-xs font-bold">{item.label}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {/* 통계 배지 */}
              <div className="flex gap-3 mt-4">
                <div className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-center">
                  <div className="text-xl font-black text-amber-400">{t.stat1_num}</div>
                  <div className="text-white/50 text-[10px]">{t.stat1_label}</div>
                </div>
                <div className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-center">
                  <div className="text-xl font-black text-emerald-400">{t.stat3_num}</div>
                  <div className="text-white/50 text-[10px]">{t.stat3_label}</div>
                </div>
                <div className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-center">
                  <div className="text-xl font-black text-sky-400">{t.stat4_num}</div>
                  <div className="text-white/50 text-[10px]">{t.stat4_label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PARTNER RECRUITMENT - 파트너 모집 프로세스 ═══ */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-600 uppercase mb-4 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">{t.partner_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.partner_title}</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-3xl mx-auto leading-relaxed">{t.partner_desc}</p>
          </div>
          {/* 4단계 프로세스 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {t.partner_steps.map((step, i) => (
              <div key={i} className="relative p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="text-5xl font-black text-gray-100 mb-4">{step.num}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* 파트너 혜택 + CTA */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-brand-50 to-emerald-50 border border-brand-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">{t.partner_benefit_title}</h3>
              <ul className="space-y-4">
                {t.partner_benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-gray-700 font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                {lang === 'zh'
                  ? 'KERYX凭借25年积累的中国制造经验和义乌本地运营团队的执行力，解决不透明的传统采购市场问题，为合作伙伴提供值得信赖的合作关系。'
                  : 'KERYX는 축적된 중국 제조 노하우와 이우(義烏) 현지 운영팀의 실행력을 바탕으로, 불투명한 기존 소싱 시장의 문제를 해결하고 파트너에게 신뢰할 수 있는 파트너십을 제공합니다.'}
              </p>
              <Link href="/quote" className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 transition-colors shadow-lg hover:shadow-xl">
                {t.partner_cta}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ IP GOODS HIGHLIGHT - 홈 첫 화면 상품 쇼케이스 ═══ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest text-rose-600 uppercase mb-4 px-4 py-2 bg-rose-50 rounded-full border border-rose-100">
              {lang === 'zh' ? 'IP周边商品' : 'IP 굿즈'}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">
              {lang === 'zh' ? '“哇！” 的商品们' : '“와!” 하는 상품들'}
            </h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
              {lang === 'zh' ? 'KERYX自主开发的原创IP打造的高端周边系列 — 马上可以开始生产' : 'KERYX가 직접 개발한 오리지널 IP로 만든 프리미엄 굿즈 — 바로 생산 가능'}
            </p>
          </div>
          {/* 상품 그리드 - 8개 하이라이트 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { img: '/images/ip-goods/ppuchi-plush-doll.webp', name: lang === 'zh' ? '噗奇毛绒公仔 25cm' : '뿌찌 봉제인형 25cm', price: '¥18.0', badge: 'BEST' },
              { img: '/images/ip-goods/duckle-plush-doll.webp', name: lang === 'zh' ? '鸭克毛绒公仔 30cm' : '덕클 봉제인형 30cm', price: '¥22.0', badge: 'BEST' },
              { img: '/images/ip-goods/dinomon-plush-doll.webp', name: lang === 'zh' ? '恐龙萌毛绒公仔 28cm' : '디노몬 봉제인형 28cm', price: '¥20.0', badge: 'NEW' },
              { img: '/images/ip-goods/duckle-cooler-bag.webp', name: lang === 'zh' ? '鸭克保温袋' : '덕클 보냉백', price: '¥12.0', badge: 'BEST' },
              { img: '/images/ip-goods/ppuchi-gacha-set.webp', name: lang === 'zh' ? '噗奇扭蛋套装(5款)' : '뿌찌 뽑기세트(5종)', price: '¥4.0/개', badge: 'BEST' },
              { img: '/images/ip-goods/dinomon-gacha-set.webp', name: lang === 'zh' ? '恐龙萌扭蛋套装(4款)' : '디노몬 뽑기세트(4종)', price: '¥4.5/개', badge: 'BEST' },
              { img: '/images/ip-goods/ppuchi-keyring.webp', name: lang === 'zh' ? '噗奇毛绒钥匙扣' : '뿌찌 봉제 키링', price: '¥5.5', badge: 'NEW' },
              { img: '/images/ip-goods/dinomon-figure.webp', name: lang === 'zh' ? '恐龙萌艺术手办' : '디노몬 아트토이 피규어', price: '¥15.0', badge: null },
            ].map((item, i) => (
              <Link key={i} href="/ip-goods" className="group rounded-3xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-square relative bg-gray-50 overflow-hidden">
                  <Image src={item.img} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                  {item.badge && (
                    <span className={`absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm ${item.badge === 'BEST' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>{item.badge}</span>
                  )}
                </div>
                <div className="p-3 md:p-4">
                  <h3 className="text-xs md:text-sm font-bold text-gray-900 line-clamp-1 mb-1">{item.name}</h3>
                  <span className="text-sm md:text-base font-black text-brand-600">{item.price}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/ip-goods" className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl">
              {lang === 'zh' ? '查看全部IP商品' : '전체 IP 상품 보기'}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ IP SHOWROOM PREVIEW ═══ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-brand-600 uppercase mb-4 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">{t.ip_section_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.ip_section_title}</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">{t.ip_section_desc}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {IP_CHARACTERS.map((ip) => (
              <Link key={ip.slug} href={`/showroom/${ip.slug}`} className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="h-56 relative overflow-hidden">
                  <Image src={ip.image} alt={lang === 'zh' ? ip.name_zh : ip.name_ko} fill className="object-cover group-hover:scale-110 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: ip.color }}>{lang === 'zh' ? ip.name_zh : ip.name_ko}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{lang === 'zh' ? ip.name_zh : ip.name_ko}</h3>
                  <p className="text-gray-500 text-sm mb-4">{lang === 'zh' ? ip.tagline_zh : ip.tagline_ko}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(lang === 'zh' ? ip.products_zh : ip.products).map((p, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{p}</span>
                    ))}
                  </div>
                  <div className="flex items-center text-sm font-semibold group-hover:translate-x-1 transition-transform" style={{ color: ip.color }}>
                    {t.ip_propose}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/showroom" className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 transition-colors shadow-lg hover:shadow-xl">
              {t.ip_cta}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CATALOG PREVIEW ═══ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-amber-600 uppercase mb-4 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">{t.catalog_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.catalog_title}</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">{t.catalog_desc}</p>
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="group rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="aspect-square relative bg-gray-50 overflow-hidden">
                    {product.image_url ? (
                      <Image src={product.image_url} alt={lang === 'zh' ? product.name_zh : product.name_ko} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {product.is_featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t.catalog_featured}</span>}
                      {product.is_new && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">{t.catalog_new}</span>}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{lang === 'zh' ? product.name_zh : product.name_ko}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-brand-600">&yen;{product.sell_price_cny?.toFixed(1)}</span>
                      {product.moq && <span className="text-xs text-gray-400">{t.catalog_moq} {product.moq}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DB 상품이 없을 때 IP 상품 쇼케이스 */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { img: '/images/ip-goods/ppuchi-plush-doll.webp', name: lang === 'zh' ? '噗奇毛绒公仔' : '뿌찌프랜즈 봉제인형', price: '18.0', moq: '100', ip: '뿌찌' },
                { img: '/images/ip-goods/duckle-keychain.webp', name: lang === 'zh' ? '鸭克钥匙扣' : '덕클 키링', price: '5.5', moq: '200', ip: '덕클' },
                { img: '/images/ip-goods/dinomon-bag-charm.webp', name: lang === 'zh' ? '迪诺蒙包挂件' : '디노몬 가방고리', price: '8.0', moq: '300', ip: '디노몬' },
                { img: '/images/ip-goods/ppuchi-gacha-set.webp', name: lang === 'zh' ? '噗奇扮蛋套装' : '뿌찌 뽑기 세트', price: '3.5', moq: '500', ip: '뿌찌' },
              ].map((item, i) => (
                <div key={i} className="group rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="aspect-square relative bg-gray-50 overflow-hidden">
                    <Image src={item.img} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t.catalog_featured}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{item.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-brand-600">&yen;{item.price}</span>
                      <span className="text-xs text-gray-400">{t.catalog_moq} {item.moq}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <Link href="/catalog" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-900 text-gray-900 font-bold rounded-2xl hover:bg-gray-900 hover:text-white transition-all">
              {t.catalog_cta}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ HOW WE WORK ═══ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-brand-600 uppercase mb-4 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">{t.svc_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.svc_title}</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">{t.svc_desc}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.svc_items.map((svc, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-6 group-hover:bg-brand-100 transition-colors">
                  <ServiceIcon name={svc.icon} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{svc.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY KERYX ═══ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-amber-600 uppercase mb-4 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">{t.trust_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.trust_title}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.trust_items.map((item, i) => (
              <div key={i} className="text-center p-8 rounded-3xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-6">
                  <span className="text-2xl font-black text-amber-600">{i + 1}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ IP LICENSE FREE ═══ */}
      <section className="py-24 bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-600 uppercase mb-4 px-4 py-2 bg-emerald-100 rounded-full border border-emerald-200">{t.license_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.license_title}</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">{t.license_desc}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.license_items.map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                  <span className="text-xl font-black text-emerald-600">{['\u20a9', '\ud83d\udd12', '\ud83e\udd1d', '\ud83d\ude80'][i]}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ B2B SUBSCRIBE ═══ */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 border border-brand-100 p-12 md:p-16">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold tracking-widest text-brand-600 uppercase mb-4 px-4 py-2 bg-white rounded-full border border-brand-100">{t.subscribe_badge}</span>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-4">{t.subscribe_title}</h2>
              <p className="text-gray-500 mt-4 max-w-xl mx-auto">{t.subscribe_desc}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-3">
                {t.subscribe_benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/80">
                    <span className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">{i+1}</span>
                    <span className="text-sm font-medium text-gray-700">{b}</span>
                  </div>
                ))}
              </div>
              <SubscribeForm lang={lang} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1040 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">{t.cta_title}</h2>
          <p className="text-white/60 text-lg mb-10">{t.cta_desc}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/quote" className="px-10 py-5 text-lg font-bold text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}>{t.cta_btn1}</Link>
            <Link href="/services" className="px-10 py-5 text-lg font-bold text-white border-2 border-white/30 rounded-2xl hover:bg-white/10 hover:border-white/60 transition-all">{t.cta_btn2}</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

// ── 서비스 아이콘 ──────────────────────────────────────────────
function ServiceIcon({ name }: { name: string }) {
  const cls = "w-7 h-7 text-brand-600";
  switch (name) {
    case 'search': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeWidth={1.5} d="m21 21-4.35-4.35"/></svg>;
    case 'factory': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 20a2 2 0 002 2h16a2 2 0 002-2V8l-7 5V8l-7 5V4a2 2 0 00-2-2H4a2 2 0 00-2 2z"/></svg>;
    case 'inspect': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
    case 'ship': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1zm0 0l6-3v7l-6 3-6-3v-4"/></svg>;
    case 'plan': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>;
    case 'protect': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    default: return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>;
  }
}
