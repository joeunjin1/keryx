'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { FloatingContact } from '@/components/ui/FloatingContact';
import { useLangContext } from '@/components/layout/LangContext';

// ── 다국어 텍스트 ──────────────────────────────────────────────
const texts = {
  ko: {
    page_title: 'KERYX IP 굿즈',
    page_desc: '뿌찌프랜즈, 덕클, 디노몬 — KERYX가 직접 개발한 오리지널 IP로 만든 프리미엄 굿즈 컬렉션',
    filter_all: '전체',
    filter_ppuchi: '뿌찌프랜즈',
    filter_duckle: '덕클',
    filter_dinomon: '디노몬',
    badge_best: 'BEST',
    badge_new: 'NEW',
    moq_label: 'MOQ',
    inquiry_btn: '파트너 문의',
    cta_title: '이 상품들로 사업을 시작하세요',
    cta_desc: 'KERYX의 자체 IP 상품은 파트너에게 독점 제공됩니다. 의뢰 단계에서는 비용이 없습니다.',
    cta_btn: '파트너 시작하기',
    category_plush: '봉제인형',
    category_keyring: '키링',
    category_bagcharm: '가방고리',
    category_gacha: '뽑기 굿즈',
    category_figure: '피규어',
    category_coolerbag: '보냉백',
  },
  zh: {
    page_title: 'KERYX IP周边商品',
    page_desc: '噗奇朋友、鸭克、恐龙萌 — KERYX自主开发的原创IP打造的高端周边系列',
    filter_all: '全部',
    filter_ppuchi: '噗奇朋友',
    filter_duckle: '鸭克',
    filter_dinomon: '恐龙萌',
    badge_best: 'BEST',
    badge_new: 'NEW',
    moq_label: 'MOQ',
    inquiry_btn: '合作咨询',
    cta_title: '用这些商品开启您的事业',
    cta_desc: 'KERYX自有IP商品专属提供给合作伙伴。咨询阶段完全免费。',
    cta_btn: '成为合作伙伴',
    category_plush: '毛绒公仔',
    category_keyring: '钥匙扣',
    category_bagcharm: '包挂件',
    category_gacha: '扭蛋周边',
    category_figure: '手办',
    category_coolerbag: '保温袋',
  },
};

// ── IP 상품 데이터 ──────────────────────────────────────────────
const IP_GOODS = [
  {
    id: 'ppuchi-plush',
    ip: 'ppuchi',
    image: '/images/ip-goods/ppuchi-plush-doll.jpg',
    name_ko: '뿌찌 봉제인형 25cm',
    name_zh: '噗奇毛绒公仔 25cm',
    category_ko: '봉제인형',
    category_zh: '毛绒公仔',
    price: '¥18.0',
    moq: 100,
    badge: 'best',
  },
  {
    id: 'ppuchi-keyring',
    ip: 'ppuchi',
    image: '/images/ip-goods/ppuchi-keyring.jpg',
    name_ko: '뿌찌 봉제 키링',
    name_zh: '噗奇毛绒钥匙扣',
    category_ko: '키링',
    category_zh: '钥匙扣',
    price: '¥5.5',
    moq: 200,
    badge: 'new',
  },
  {
    id: 'ppuchi-bagcharm',
    ip: 'ppuchi',
    image: '/images/ip-goods/ppuchi-bag-charm.jpg',
    name_ko: '뿌찌 아크릴 가방고리',
    name_zh: '噗奇亚克力包挂件',
    category_ko: '가방고리',
    category_zh: '包挂件',
    price: '¥3.5',
    moq: 300,
    badge: null,
  },
  {
    id: 'ppuchi-gacha',
    ip: 'ppuchi',
    image: '/images/ip-goods/ppuchi-gacha-set.jpg',
    name_ko: '뿌찌프랜즈 뽑기 세트 (5종)',
    name_zh: '噗奇朋友扭蛋套装 (5款)',
    category_ko: '뽑기 굿즈',
    category_zh: '扭蛋周边',
    price: '¥4.0/개',
    moq: 500,
    badge: 'best',
  },
  {
    id: 'duckle-plush',
    ip: 'duckle',
    image: '/images/ip-goods/duckle-plush-doll.jpg',
    name_ko: '덕클 봉제인형 30cm',
    name_zh: '鸭克毛绒公仔 30cm',
    category_ko: '봉제인형',
    category_zh: '毛绒公仔',
    price: '¥22.0',
    moq: 100,
    badge: 'best',
  },
  {
    id: 'duckle-keychain',
    ip: 'duckle',
    image: '/images/ip-goods/duckle-keychain.jpg',
    name_ko: '덕클 봉제 키링',
    name_zh: '鸭克毛绒钥匙扣',
    category_ko: '키링',
    category_zh: '钥匙扣',
    price: '¥6.0',
    moq: 200,
    badge: 'new',
  },
  {
    id: 'duckle-coolerbag',
    ip: 'duckle',
    image: '/images/ip-goods/duckle-cooler-bag.jpg',
    name_ko: '덕클 캐릭터 보냉백',
    name_zh: '鸭克角色保温袋',
    category_ko: '보냉백',
    category_zh: '保温袋',
    price: '¥12.0',
    moq: 100,
    badge: 'best',
  },
  {
    id: 'dinomon-plush',
    ip: 'dinomon',
    image: '/images/ip-goods/dinomon-plush-doll.jpg',
    name_ko: '디노몬 봉제인형 28cm',
    name_zh: '恐龙萌毛绒公仔 28cm',
    category_ko: '봉제인형',
    category_zh: '毛绒公仔',
    price: '¥20.0',
    moq: 100,
    badge: 'new',
  },
  {
    id: 'dinomon-bagcharm',
    ip: 'dinomon',
    image: '/images/ip-goods/dinomon-bag-charm.jpg',
    name_ko: '디노몬 PVC 가방고리',
    name_zh: '恐龙萌PVC包挂件',
    category_ko: '가방고리',
    category_zh: '包挂件',
    price: '¥4.0',
    moq: 300,
    badge: null,
  },
  {
    id: 'dinomon-figure',
    ip: 'dinomon',
    image: '/images/ip-goods/dinomon-figure.jpg',
    name_ko: '디노몬 아트토이 피규어',
    name_zh: '恐龙萌艺术手办',
    category_ko: '피규어',
    category_zh: '手办',
    price: '¥15.0',
    moq: 200,
    badge: null,
  },
  {
    id: 'dinomon-gacha',
    ip: 'dinomon',
    image: '/images/ip-goods/dinomon-gacha-set.jpg',
    name_ko: '디노몬 뽑기 세트 (4종)',
    name_zh: '恐龙萌扭蛋套装 (4款)',
    category_ko: '뽑기 굿즈',
    category_zh: '扭蛋周边',
    price: '¥4.5/개',
    moq: 500,
    badge: 'best',
  },
];

// ── IP 필터 색상 ──────────────────────────────────────────────
const IP_COLORS: Record<string, { bg: string; text: string; border: string; active: string }> = {
  all: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', active: 'bg-gray-900 text-white border-gray-900' },
  ppuchi: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', active: 'bg-pink-500 text-white border-pink-500' },
  duckle: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', active: 'bg-amber-500 text-white border-amber-500' },
  dinomon: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', active: 'bg-emerald-500 text-white border-emerald-500' },
};

export default function IpGoodsPage() {
  const { lang } = useLangContext();
  const t = texts[lang] || texts.ko;
  const [filter, setFilter] = useState<string>('all');

  const filteredGoods = filter === 'all' ? IP_GOODS : IP_GOODS.filter(g => g.ip === filter);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang} theme="light" />
      <FloatingContact />

      {/* ═══ HERO ═══ */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">{t.page_title}</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">{t.page_desc}</p>
        </div>
      </section>

      {/* ═══ FILTER TABS ═══ */}
      <section className="sticky top-16 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { key: 'all', label: t.filter_all },
              { key: 'ppuchi', label: t.filter_ppuchi },
              { key: 'duckle', label: t.filter_duckle },
              { key: 'dinomon', label: t.filter_dinomon },
            ].map((f) => {
              const colors = IP_COLORS[f.key];
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-all ${isActive ? colors.active : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT GRID ═══ */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredGoods.map((product) => (
              <div key={product.id} className="group rounded-3xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-square relative bg-gray-50 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={lang === 'zh' ? product.name_zh : product.name_ko}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {/* 배지 */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {product.badge === 'best' && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500 text-white font-bold shadow-sm">{t.badge_best}</span>
                    )}
                    {product.badge === 'new' && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold shadow-sm">{t.badge_new}</span>
                    )}
                  </div>
                  {/* IP 라벨 */}
                  <div className="absolute bottom-3 right-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                      product.ip === 'ppuchi' ? 'bg-pink-500/90 text-white' :
                      product.ip === 'duckle' ? 'bg-amber-500/90 text-white' :
                      'bg-emerald-500/90 text-white'
                    }`}>
                      {product.ip === 'ppuchi' ? (lang === 'zh' ? '噗奇' : '뿌찌') :
                       product.ip === 'duckle' ? (lang === 'zh' ? '鸭克' : '덕클') :
                       (lang === 'zh' ? '恐龙萌' : '디노몬')}
                    </span>
                  </div>
                </div>
                <div className="p-4 md:p-5">
                  <div className="text-xs text-gray-400 mb-1">{lang === 'zh' ? product.category_zh : product.category_ko}</div>
                  <h3 className="text-sm md:text-base font-bold text-gray-900 line-clamp-2 mb-3">{lang === 'zh' ? product.name_zh : product.name_ko}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-brand-600">{product.price}</span>
                    <span className="text-xs text-gray-400">{t.moq_label} {product.moq}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1040 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">{t.cta_title}</h2>
          <p className="text-white/60 text-lg mb-10">{t.cta_desc}</p>
          <Link href="/quote" className="inline-flex items-center gap-2 px-10 py-5 text-lg font-bold text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}>
            {t.cta_btn}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
