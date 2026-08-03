"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useLangContext } from '@/components/layout/LangContext';

// ── IP 캐릭터 정적 데이터 ──────────────────────────────────────
const IP_DATA: Record<string, any> = {
  'ppuchi-friends': {
    name_ko: '뿌찌프랜즈', name_zh: '噗奇朋友', name_en: 'Ppuchi Friends',
    tagline_ko: '귀여움이 폭발하는 뿌찌 패밀리',
    tagline_zh: '可爱爆炸的噗奇家族',
    description_ko: '뿌찌프랜즈는 KERYX가 독자 개발한 오리지널 IP입니다. 통통하고 귀여운 캐릭터들이 다양한 굿즈로 만들어져 전 세계 바이어들에게 사랑받고 있습니다. 인형, 키링, 가방고리, 뽑기 굿즈 등 다양한 상품군에 적용 가능합니다.',
    description_zh: '噗奇朋友是KERYX自主开发的原创IP。圆润可爱的角色们以各种周边形式呈现，深受全球买家喜爱。可应用于公仔、钥匙扣、包挂件、扭蛋周边等多种商品。',
    color: '#FF6B9D', gradient: 'from-pink-400 to-rose-300', emoji: '🌸',
    features_ko: ['인형 & 봉제완구', '키링 & 가방고리', '뽑기 굿즈', '문구 & 스티커', '보냉백'],
    features_zh: ['公仔 & 毛绒玩具', '钥匙扣 & 包挂件', '扭蛋周边', '文具 & 贴纸', '保温袋'],
  },
  'duckle': {
    name_ko: '덕클', name_zh: '鸭克', name_en: 'Duckle',
    tagline_ko: '유쾌한 오리 친구들의 모험',
    tagline_zh: '欢乐鸭子朋友的冒险',
    description_ko: '덕클은 노란 오리 캐릭터로, 밝고 유쾌한 에너지를 가진 KERYX 오리지널 IP입니다. 뽑기 굿즈와 인형에서 특히 인기가 높으며, 보냉백 시리즈로도 확장 중입니다.',
    description_zh: '鸭克是一个黄色鸭子角色，是KERYX原创IP，充满明亮愉快的能量。在扭蛋商品和玩偶中特别受欢迎，也正在扩展保温袋系列。',
    color: '#FFB800', gradient: 'from-amber-400 to-yellow-300', emoji: '🦆',
    features_ko: ['인형 & 봉제완구', '보냉백 시리즈', '키링 & 피규어', '뽑기 굿즈', '패키지 디자인'],
    features_zh: ['公仔 & 毛绒玩具', '保温袋系列', '钥匙扣 & 手办', '扭蛋周边', '包装设计'],
  },
  'dinomon': {
    name_ko: '디노몬', name_zh: '恐龙萌', name_en: 'Dinomon',
    tagline_ko: '작지만 용감한 공룡 세계',
    tagline_zh: '虽小但勇敢的恐龙世界',
    description_ko: '디노몬은 작지만 용감한 공룡 캐릭터들의 세계입니다. 남녀 모두에게 사랑받는 유니섹스 IP로, 피규어와 뽑기 굿즈에서 높은 인기를 보이고 있습니다.',
    description_zh: '恐龙萌是小巧但勇敢的恐龙角色世界。作为男女通吃的中性IP，在手办和扭蛋商品中非常受欢迎。',
    color: '#10B981', gradient: 'from-emerald-400 to-teal-300', emoji: '🦕',
    features_ko: ['피규어 & 미니어처', '인형 & 봉제완구', '뽑기 굿즈', '문구 세트', '키링'],
    features_zh: ['手办 & 微缩模型', '公仔 & 毛绒玩具', '扭蛋周边', '文具套装', '钥匙扣'],
  },
};

const texts = {
  ko: {
    back: '← IP 쇼룸으로 돌아가기',
    products_title: '이 IP의 상품',
    products_empty: '등록된 상품이 아직 없습니다.',
    moq: '최소주문',
    featured: '추천',
    new_badge: 'NEW',
    cta_title: '이 IP로 맞춤 제안을 받으세요',
    cta_desc: '바이어의 사업 방향에 맞게 이 IP를 활용한 맞춤 굿즈를 기획해 드립니다.',
    cta_btn: '무료 IP 제안 받기',
    applicable: '적용 가능 상품군',
    all_catalog: '전체 카탈로그 보기',
  },
  zh: {
    back: '← 返回IP展厅',
    products_title: '该IP的商品',
    products_empty: '暂无注册商品。',
    moq: '起订量',
    featured: '推荐',
    new_badge: 'NEW',
    cta_title: '获取该IP的定制提案',
    cta_desc: '根据买家的事业方向，利用该IP为您定制周边商品企划。',
    cta_btn: '免费获取IP提案',
    applicable: '可应用商品类别',
    all_catalog: '查看全部目录',
  },
};

export default function ShowroomDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { lang } = useLangContext();
  const t = texts[lang] || texts.ko;
  const ip = IP_DATA[slug];
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    // ip_characters 테이블에서 slug로 id 찾기 → products 조회
    supabase
      .from('ip_characters')
      .select('id')
      .eq('slug', slug)
      .single()
      .then(({ data: ipChar }) => {
        if (ipChar) {
          supabase
            .from('products')
            .select('id, product_code, name_ko, name_zh, name_en, sell_price_cny, moq, image_url, is_featured, is_new')
            .eq('ip_character_id', ipChar.id)
            .eq('showroom_visible', true)
            .eq('is_active', true)
            .eq('approval_status', 'approved')
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })
            .then(({ data }) => {
              if (data) setProducts(data);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [slug]);

  if (!ip) {
    return (
      <div className="min-h-screen bg-white">
        <PublicHeader lang={lang} />
        <div className="max-w-4xl mx-auto px-4 py-32 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">IP를 찾을 수 없습니다</h1>
          <Link href="/showroom" className="text-brand-600 hover:underline">{t.back}</Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang} />

      {/* Hero Banner */}
      <section className={`relative py-24 bg-gradient-to-br ${ip.gradient}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/showroom" className="inline-flex items-center text-sm text-white/80 hover:text-white mb-8 transition-colors">{t.back}</Link>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-8xl mb-6 block">{ip.emoji}</span>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
                {lang === 'zh' ? ip.name_zh : ip.name_ko}
              </h1>
              <p className="text-xl text-white/90 font-medium mb-4">
                {lang === 'zh' ? ip.tagline_zh : ip.tagline_ko}
              </p>
              <p className="text-white/70 text-base leading-relaxed max-w-lg">
                {lang === 'zh' ? ip.description_zh : ip.description_ko}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              <h3 className="text-white font-bold text-lg mb-4">{t.applicable}</h3>
              <div className="space-y-3">
                {(lang === 'zh' ? ip.features_zh : ip.features_ko).map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white/90 font-medium">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{t.products_title}</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded" /><div className="h-4 bg-gray-100 rounded w-2/3" /></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-3xl">
              <p className="text-gray-400 text-lg">{t.products_empty}</p>
              <Link href="/catalog" className="mt-4 inline-block text-brand-600 font-semibold hover:underline">{t.all_catalog}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
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
                      {product.is_featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t.featured}</span>}
                      {product.is_new && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">{t.new_badge}</span>}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{lang === 'zh' ? product.name_zh : product.name_ko}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black" style={{ color: ip.color }}>&yen;{product.sell_price_cny?.toFixed(1)}</span>
                      {product.moq && <span className="text-xs text-gray-400">{t.moq} {product.moq}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">{t.cta_title}</h2>
          <p className="text-gray-500 text-lg mb-8">{t.cta_desc}</p>
          <Link href="/quote" className="inline-flex items-center gap-2 px-10 py-5 text-lg font-bold text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ background: ip.color }}>
            {t.cta_btn}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
