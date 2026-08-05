"use client";
import { useState, useEffect, useCallback } from 'react';
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
    hero_badge: 'IP 캐릭터 개발 · 스토리 연재 · 굿즈 제조',
    hero_title: '스토리가 있는 제품을\n기획하여 공급합니다',
    hero_sub: '오리지널 IP 개발 · 캐릭터 상품 기획 · 전문 공장 생산 · 품질 검수',
    hero_desc: 'KERYX는 오리지널 캐릭터 IP를 개발하고, 스토리와 세계관을 담은 상품을 기획·생산하는 IP 굿즈 전문 기업입니다.',
    hero_cta_showroom: 'IP 쇼룸 보기',
    hero_cta_catalog: '상품 카탈로그',
    stat1_num: '5', stat1_label: '오리지널 IP',
    stat2_num: '직접', stat2_label: '기획·생산',
    stat3_num: '100%', stat3_label: '전수 검수',
    // IP 캐릭터 슬라이드 데이터
    hero_characters: [
      { name: '길덕이', desc: '변신천재 유연한 오리', color: '#FFB800' },
      { name: '이녀석', desc: '재미있는 낙서 캐릭터', color: '#7C3AED' },
      { name: '꼬물이들', desc: '우주에서 온 몬스터', color: '#6366F1' },
      { name: '하트뿅 햄스터', desc: '사랑스러운 햄스터', color: '#F472B6' },
      { name: '피글리', desc: '동글동글 귀여운 돼지', color: '#FFB6C1' },
    ],
    // IP 섹션
    ip_section_badge: 'IP Universe — 연재중',
    ip_section_title: '우리가 만들고 있는 캐릭터와 세계관',
    ip_section_desc: '뿌찌프랜즈, 덕클, 디노몬 — 각각 고유한 세계관과 스토리를 가진 KERYX 오리지널 캐릭터입니다. 스토리를 연재하며 캐릭터를 성장시키고, 그에 맞는 상품과 콘텐츠를 지속적으로 개발하고 있습니다.',
    ip_cta: 'IP 스토리 & 세계관 보기',
    ip_propose: 'IP 굿즈 보기',
    // 카탈로그 섹션
    catalog_badge: 'IP 굿즈 카탈로그',
    catalog_title: '바로 진행 가능한 검증 상품',
    catalog_desc: '인형, 가방고리, 뽑기 굿즈, 보냉백 등 — 모든 상품은 전문 공장에서 즉시 생산 가능하며, KERYX 품질 기준을 통과한 검증 제품입니다.',
    catalog_cta: '전체 카탈로그 보기',
    catalog_moq: '최소주문',
    catalog_featured: '추천',
    catalog_new: 'NEW',
    // 서비스 섹션 (IP에서 상품까지)
    svc_badge: 'IP에서 상품까지',
    svc_title: '이렇게 만듭니다',
    svc_desc: '디자이너의 창의력과 전문 공장의 기술력이 만나 스토리가 담긴 상품이 탄생합니다.',
    svc_steps: [
      { title: '캐릭터 디자인', desc: '전문 디자이너가 오리지널 캐릭터를 개발합니다' },
      { title: '상품 기획', desc: '캐릭터에 맞는 상품 아이디어를 기획합니다' },
      { title: '샘플 제작', desc: '전문 공장에서 샘플을 제작합니다' },
      { title: '양산 & 검수', desc: '100% 전수 검수 후 납품합니다' },
    ],
    // Why KERYX
    trust_badge: '왜 KERYX인가',
    trust_title: 'KERYX가 특별한 이유',
    trust_items: [
      { title: '직접 만드는 IP', desc: '외부 라이선스가 아닌, 자체 개발 캐릭터와 세계관으로 독보적 경쟁력을 가집니다.' },
      { title: '스토리가 있는 상품', desc: '단순 캐릭터 상품이 아닌, 스토리와 세계관이 담긴 콘텐츠 기반 굿즈입니다.' },
      { title: '기획부터 생산까지', desc: '캐릭터 디자인, 스토리 개발, 상품 기획, 생산을 모두 직접 수행합니다.' },
      { title: '글로벌 품질 기준', desc: '중국 현지 전문 공장에서 생산하고, 100% 전수 검수로 품질을 보증합니다.' },
    ],
    // 신상품 구독
    subscribe_badge: '신상품 소식',
    subscribe_title: '신상품 정보를 받아보세요',
    subscribe_desc: '이메일을 등록하시면 새로운 IP 굿즈 출시 소식을 보내드립니다.',
    subscribe_placeholder_email: '이메일 주소',
    subscribe_placeholder_company: '회사명',
    subscribe_placeholder_phone: '연락처',
    subscribe_btn: '구독 신청',
    subscribe_note: '* 신상품 출시 시 알림을 보내드립니다',
  },
  zh: {
    hero_badge: 'IP角色开发 · 故事连载 · 周边制造',
    hero_title: '策划有故事的产品\n并供应给您',
    hero_sub: '原创IP开发 · 角色商品策划 · 专业工厂生产 · 品质检验',
    hero_desc: 'KERYX是一家开发原创角色IP、策划并生产融入故事与世界观的商品的IP周边专业企业。',
    hero_cta_showroom: 'IP展厅',
    hero_cta_catalog: '商品目录',
    stat1_num: '5', stat1_label: '原创IP',
    stat2_num: '直接', stat2_label: '策划·生产',
    stat3_num: '100%', stat3_label: '全检',
    hero_characters: [
      { name: '吉德鸭', desc: '变身天才柔软鸭', color: '#FFB800' },
      { name: '这家伙', desc: '有趣的涂鸦角色', color: '#7C3AED' },
      { name: '小怪物们', desc: '来自宇宙的怪物', color: '#6366F1' },
      { name: '心动仓鼠', desc: '可爱的仓鼠', color: '#F472B6' },
      { name: '小猪丽', desc: '圆滚滚可爱小猪', color: '#FFB6C1' },
    ],
    ip_section_badge: 'IP Universe — 连载中',
    ip_section_title: '我们正在创造的角色与世界观',
    ip_section_desc: '噗奇朋友、鸭克、恐龙萌 — 各自拥有独特世界观和故事的KERYX原创角色。我们连载故事、培育角色，并持续开发相应的产品和内容。',
    ip_cta: 'IP故事&世界观',
    ip_propose: 'IP周边产品',
    catalog_badge: 'IP商品目录',
    catalog_title: 'KERYX IP商品系列',
    catalog_desc: '噗奇朋友、鸭克、恐龙萌 — KERYX原创IP制作的毛绒公仔、钥匙扣、包挂件、扭蛋周边。',
    catalog_cta: '查看全部目录',
    catalog_moq: '起订量',
    catalog_featured: '推荐',
    catalog_new: 'NEW',
    svc_badge: '从IP到产品',
    svc_title: '这样制造',
    svc_desc: '设计师的创意与专业工厂的技术相结合，诞生融入故事的产品。',
    svc_steps: [
      { title: '角色设计', desc: '专业设计师开发原创角色' },
      { title: '产品策划', desc: '根据角色策划商品创意' },
      { title: '样品制作', desc: '在专业工厂制作样品' },
      { title: '量产&检验', desc: '100%全检后交货' },
    ],
    trust_badge: '为什么选择KERYX',
    trust_title: 'KERYX的特别之处',
    trust_items: [
      { title: '直接创造的IP', desc: '不是外部授权，而是自主开发的角色和世界观，拥有独特竞争力。' },
      { title: '有故事的产品', desc: '不是简单的角色商品，而是融入故事和世界观的内容型周边。' },
      { title: '从策划到生产', desc: '角色设计、故事开发、产品策划、生产全部直接执行。' },
      { title: '全球品质标准', desc: '中国当地专业工厂生产，100%全检保证品质。' },
    ],
    subscribe_badge: '新品资讯',
    subscribe_title: '接收新品信息',
    subscribe_desc: '注册邮箱后，我们会发送新IP周边上市消息。',
    subscribe_placeholder_email: '邮箱地址',
    subscribe_placeholder_company: '公司名称',
    subscribe_placeholder_phone: '联系电话',
    subscribe_btn: '订阅',
    subscribe_note: '* 新品上市时发送通知',
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

// ── 히어로 캐릭터 슬라이드 이미지 ──────────────────────────────
const HERO_SLIDES = [
  { // 길덕이
    images: [
      '/images/hero-characters/gilduck-1.webp',
      '/images/hero-characters/gilduck-2.webp',
    ],
  },
  { // 이녀석
    images: [
      '/images/hero-characters/inyeoseok-plush-1.webp',
      '/images/hero-characters/inyeoseok-illust-1.webp',
      '/images/hero-characters/inyeoseok-plush-2.webp',
    ],
  },
  { // 꼬물이들
    images: [
      '/images/hero-characters/kkomul-group.webp',
      '/images/hero-characters/kkomul-6types.webp',
      '/images/hero-characters/kkomul-char-1.webp',
    ],
  },
  { // 하트뿅 햄스터
    images: [
      '/images/hero-characters/heartbbung-hamster.webp',
    ],
  },
  { // 피글리
    images: [
      '/images/hero-characters/piggly.webp',
    ],
  },
];

// ── 신상품 구독 폼 컴포넌트 ────────────────────────────────────────
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
        setMessage(lang === 'zh' ? '订阅成功！新品上市时通知您。' : '구독 완료! 신상품 출시 시 알려드립니다.');
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
        <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <p className="text-green-800 font-bold">{message}</p>
      </div>
    );
  }

  return (
    <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t.subscribe_placeholder_email} className="flex-1 px-5 py-4 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition" />
      <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder={t.subscribe_placeholder_company} className="flex-1 px-5 py-4 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition" />
      <button type="submit" disabled={status === 'loading'} className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors whitespace-nowrap disabled:opacity-50">
        {status === 'loading' ? (lang === 'zh' ? '提交中...' : '제출 중...') : t.subscribe_btn}
      </button>
      {status === 'error' && <p className="text-xs text-red-500 text-center sm:hidden">{message}</p>}
    </form>
  );
}

// ── 메인 페이지 컴포넌트 ──────────────────────────────────────
export default function HomePage() {
  const { lang } = useLangContext();
  const t = texts[lang] || texts.ko;
  const [heroVisible, setHeroVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 히어로 슬라이드 자동 전환
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  useEffect(() => {
    const supabase = createClient();
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
        if (data && data.length > 0) setProducts(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang} theme="dark" />
      <FloatingContact />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
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
            {/* 왼쪽: 텍스트 */}
            <div className={`transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/30 bg-amber-400/5 mb-8">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-300/90 text-sm font-medium">{t.hero_badge}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 whitespace-pre-line">{t.hero_title}</h1>
              <p className="text-amber-300/90 text-lg md:text-xl font-semibold mb-4">{t.hero_sub}</p>
              <p className="text-white/50 text-base leading-relaxed mb-10 max-w-lg">{t.hero_desc}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/showroom" className="px-7 py-4 text-base font-bold text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}>{t.hero_cta_showroom}</Link>
                <Link href="/catalog" className="px-7 py-4 text-base font-bold text-white border-2 border-white/30 rounded-2xl hover:bg-white/10 hover:border-white/60 transition-all">{t.hero_cta_catalog}</Link>
              </div>
              {/* 통계 배지 */}
              <div className="flex gap-3 mt-8">
                <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-center">
                  <div className="text-xl font-black text-amber-400">{t.stat1_num}</div>
                  <div className="text-white/50 text-[10px]">{t.stat1_label}</div>
                </div>
                <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-center">
                  <div className="text-xl font-black text-emerald-400">{t.stat2_num}</div>
                  <div className="text-white/50 text-[10px]">{t.stat2_label}</div>
                </div>
                <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-center">
                  <div className="text-xl font-black text-sky-400">{t.stat3_num}</div>
                  <div className="text-white/50 text-[10px]">{t.stat3_label}</div>
                </div>
              </div>
            </div>
            {/* 오른쪽: 캐릭터 슬라이드 */}
            <div className={`transition-all duration-1000 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="relative">
                {/* 캐릭터 이름 표시 */}
                <div className="absolute -top-8 left-0 right-0 flex justify-center z-10">
                  <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <span className="text-white font-bold text-sm">{t.hero_characters[currentSlide]?.name}</span>
                    <span className="text-white/60 text-xs ml-2">{t.hero_characters[currentSlide]?.desc}</span>
                  </div>
                </div>
                {/* 메인 이미지 */}
                <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                  {HERO_SLIDES.map((slide, idx) => (
                    <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                      <Image
                        src={slide.images[0]}
                        alt={t.hero_characters[idx]?.name || ''}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 90vw, 45vw"
                        priority={idx === 0}
                      />
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                {/* 슬라이드 인디케이터 */}
                <div className="flex justify-center gap-2 mt-4">
                  {HERO_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-amber-400 w-8' : 'bg-white/30 hover:bg-white/50'}`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ IP GOODS HIGHLIGHT ═══ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest text-rose-600 uppercase mb-4 px-4 py-2 bg-rose-50 rounded-full border border-rose-100">
              {lang === 'zh' ? 'IP周边商品' : 'IP 굿즈'}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">
              {lang === 'zh' ? '"哇！" 的商品们' : '"와!" 하는 상품들'}
            </h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
              {lang === 'zh' ? 'KERYX自主开发的原创IP打造的高端周边系列 — 马上可以开始生产' : 'KERYX가 직접 개발한 오리지널 IP로 만든 프리미엄 굿즈 — 바로 생산 가능'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { img: '/images/ip-goods/ppuchi-plush-doll.webp', name: lang === 'zh' ? '噗奇毛绒公仔 25cm' : '뿌찌 봉제인형 25cm', price: '¥18.0', badge: 'BEST' },
              { img: '/images/ip-goods/duckle-plush-doll.webp', name: lang === 'zh' ? '鸭克毛绒公仔 30cm' : '덕클 봉제인형 30cm', price: '¥22.0', badge: 'BEST' },
              { img: '/images/ip-goods/dinomon-plush-doll.webp', name: lang === 'zh' ? '恐龙萌毛绒公仔' : '디노몬 봉제인형', price: '¥15.0', badge: 'NEW' },
              { img: '/images/ip-goods/ppuchi-gacha-set.webp', name: lang === 'zh' ? '扭蛋套装' : '뽑기 세트', price: '¥3.5', badge: 'HOT' },
            ].map((item, i) => (
              <Link key={i} href="/catalog" className="group rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <div className="aspect-square relative bg-gray-50 overflow-hidden">
                  <Image src={item.img} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">{item.badge}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{item.name}</h3>
                  <span className="text-lg font-black text-brand-600">{item.price}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/catalog" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-900 text-gray-900 font-bold rounded-2xl hover:bg-gray-900 hover:text-white transition-all">
              {t.catalog_cta}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ IP UNIVERSE ═══ */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-indigo-600 uppercase mb-4 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">{t.ip_section_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.ip_section_title}</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-3xl mx-auto leading-relaxed">{t.ip_section_desc}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {IP_CHARACTERS.map((ip) => (
              <Link key={ip.slug} href={`/ip-goods`} className="group rounded-3xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${ip.gradient} opacity-20`} />
                  <Image src={ip.image} alt={lang === 'zh' ? ip.name_zh : ip.name_ko} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 90vw, 30vw" />
                  <div className="absolute bottom-3 left-3">
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
      {products.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-bold tracking-widest text-amber-600 uppercase mb-4 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">{t.catalog_badge}</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.catalog_title}</h2>
              <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">{t.catalog_desc}</p>
            </div>
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
            <div className="text-center mt-12">
              <Link href="/catalog" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-900 text-gray-900 font-bold rounded-2xl hover:bg-gray-900 hover:text-white transition-all">
                {t.catalog_cta}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ HOW WE WORK - IP에서 상품까지 (이미지 포함) ═══ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-brand-600 uppercase mb-4 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">{t.svc_badge}</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-4">{t.svc_title}</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">{t.svc_desc}</p>
          </div>
          {/* 4단계 프로세스 with 이미지 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.svc_steps.map((step: any, i: number) => (
              <div key={i} className="relative p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* 상단 이미지 영역 */}
                <div className="relative h-40 rounded-2xl overflow-hidden mb-6 bg-gray-100">
                  <Image
                    src={[
                      '/images/process/step1-design.webp',
                      '/images/process/step2-planning.webp',
                      '/images/process/step3-factory.webp',
                      '/images/process/step4-inspection.webp',
                    ][i]}
                    alt={step.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, 25vw"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                )}
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
            {t.trust_items.map((item: any, i: number) => (
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

      {/* ═══ 신상품 구독 (심플) ═══ */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8 md:p-12">
            <div className="text-center mb-8">
              <span className="inline-block text-xs font-bold tracking-widest text-brand-600 uppercase mb-3 px-4 py-2 bg-brand-50 rounded-full border border-brand-100">{t.subscribe_badge}</span>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-3">{t.subscribe_title}</h2>
              <p className="text-gray-500 mt-3">{t.subscribe_desc}</p>
            </div>
            <SubscribeForm lang={lang} t={t} />
            <p className="text-xs text-gray-400 text-center mt-4">{t.subscribe_note}</p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
