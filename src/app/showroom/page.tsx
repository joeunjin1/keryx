'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

// ─── IP 캐릭터 정의 ───────────────────────────────────────────
const IP_CHARACTERS = [
  {
    slug: 'ppuchi-friends',
    name_ko: '뿌찌프랜즈',
    name_zh: '噗奇朋友',
    name_en: 'Ppuchi Friends',
    tagline_ko: '귀여움이 폭발하는 뿌찌 패밀리',
    tagline_zh: '可爱爆炸的噗奇家族',
    heroImage: '/images/ip-characters/ppuji/dangppu.webp',
    description_ko: '뿌찌프랜즈는 KERYX가 독자 개발한 오리지널 IP입니다. 통통하고 귀여운 캐릭터들이 인형, 가방고리 등 다양한 굿즈로 상품화되어 파트너들에게 장기적 성장을 제공합니다.',
    description_zh: '噗奇朋友是KERYX自主开发的原创IP。圆润可爱的角色们以玩偶、包挂件等各种周边形式商品化，为合作伙伴提供长期增长。',
    color_primary: '#FF6B9D',
    color_secondary: '#FFB3CC',
    color_accent: '#FF3D7F',
    emoji: '🌸',
    bg_gradient: 'from-pink-400 to-rose-300',
    text_color: 'text-pink-900',
    badge_color: 'bg-pink-500',
    characters: [
      { name_ko: '당뿌', name_zh: '当噗', color: '#FF6B9D' },
      { name_ko: '모찌', name_zh: '年糕', color: '#FF8FAB' },
      { name_ko: '췤라', name_zh: '秋拉', color: '#FFB3CC' },
      { name_ko: '도니', name_zh: '多尼', color: '#FFA0C4' },
      { name_ko: '핫뚨', name_zh: '哈吐', color: '#FF4081' },
      { name_ko: '파시', name_zh: '帕西', color: '#E91E63' },
      { name_ko: '뛱치', name_zh: '胖奇', color: '#F48FB1' },
      { name_ko: '블랙', name_zh: '布莱克', color: '#880E4F' },
    ],
  },
  {
    slug: 'duckle',
    name_ko: '덕클',
    name_zh: '鸭克',
    name_en: 'Duckle',
    tagline_ko: '노란 행복을 전하는 덕클',
    tagline_zh: '传递黄色幸福的鸭克',
    heroImage: '/images/ip-characters/duckle/duckle-front.png',
    description_ko: '덕클은 노란 오리 캐릭터로, 밝고 유쾌한 에너지를 가진 KERYX 오리지널 IP입니다. 뽑기용 굿즈와 인형에서 특히 인기가 높으며, 파트너에게 높은 수익성을 제공합니다.',
    description_zh: '鸭克是KERYX原创IP，充满明亮愉快的能量。在扭蛋商品和玩偶中特别受欢迎，为合作伙伴提供高收益。',
    color_primary: '#FFD93D',
    color_secondary: '#FFE87C',
    color_accent: '#FFC300',
    emoji: '🦆',
    bg_gradient: 'from-yellow-400 to-amber-300',
    text_color: 'text-yellow-900',
    badge_color: 'bg-yellow-500',
    characters: [
      { name_ko: '덕클', name_zh: '鸭克', color: '#FFD93D' },
      { name_ko: '미니덕클', name_zh: '迷你鸭克', color: '#FFE87C' },
    ],
  },
  {
    slug: 'dinomon',
    name_ko: '디노몬',
    name_zh: '恐龙萌',
    name_en: 'Dinomon',
    tagline_ko: '공룡 세계를 탐험하는 디노몬',
    tagline_zh: '探索恐龙世界的恐龙萌',
    heroImage: '/images/ip-characters/dinomon/tino.png',
    description_ko: '디노몬은 귀여운 공룡 캐릭터들의 세계관을 가진 KERYX 오리지널 IP입니다. 다양한 공룡 캐릭터들이 아이들과 어른 모두에게 사랑받으며, 다양한 상품 라인업 확장이 가능합니다.',
    description_zh: '恐龙萌是KERYX原创IP，拥有可爱恐龙角色的世界观。深受儿童和成人喜爱，可持续扩展多样化商品线。',
    color_primary: '#6BCB77',
    color_secondary: '#A8E6CF',
    color_accent: '#4CAF50',
    emoji: '🦕',
    bg_gradient: 'from-green-400 to-emerald-300',
    text_color: 'text-green-900',
    badge_color: 'bg-green-500',
    characters: [
      { name_ko: '티노', name_zh: '蒂诺', color: '#6BCB77' },
      { name_ko: '앙키', name_zh: '安基', color: '#A8E6CF' },
      { name_ko: '브라키', name_zh: '布拉基', color: '#4CAF50' },
      { name_ko: '스테고', name_zh: '斯特戈', color: '#81C784' },
      { name_ko: '트리니', name_zh: '特里尼', color: '#66BB6A' },
      { name_ko: '벨로', name_zh: '维洛', color: '#388E3C' },
    ],
  },
];

const PRODUCT_TYPES = [
  { id: 'all', ko: '전체', zh: '全部' },
  { id: '인형/봉제', ko: '인형/봉제', zh: '毛绒玩具' },
  { id: '뽑기 굿즈', ko: '뽑기 굿즈', zh: '扭蛋商品' },
  { id: '가방고리/키링', ko: '가방고리/키링', zh: '包挂件/钥匙扣' },
  { id: '피규어', ko: '피규어', zh: '手办' },
];

export default function ShowroomPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient() as any;

  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState('all');
  const [ipStats, setIpStats] = useState<Record<string, number>>({});

  // IP별 상품 수 조회
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('ip_character_slug, id')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .not('ip_character_slug', 'is', null);

      if (data) {
        const stats: Record<string, number> = {};
        data.forEach((p: any) => {
          if (p.ip_character_slug) {
            stats[p.ip_character_slug] = (stats[p.ip_character_slug] || 0) + 1;
          }
        });
        setIpStats(stats);
      }
    })();
  }, []);

  // IP 선택 시 상품 로딩
  useEffect(() => {
    if (!selectedIP) return;
    setLoading(true);
    (async () => {
      let query = supabase
        .from('products')
        .select('id, product_code, name_ko, name_zh, category, sell_price_cny, moq, image_url, is_new, is_hot, is_featured, cbm_per_box, pcs_per_box, oem_available, odm_available')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .eq('ip_character_slug', selectedIP)
        .order('created_at', { ascending: false });

      if (productType !== 'all') query = query.eq('category', productType);

      const { data } = await query;
      setProducts(data ?? []);
      setLoading(false);
    })();
  }, [selectedIP, productType]);

  const currentIP = IP_CHARACTERS.find(ip => ip.slug === selectedIP);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public Header */}
      <PublicHeader lang={lang} theme="dark" />

      {/* 상단 히어로 배너 */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{t('KERYX 오리지널 IP · 무료 라이선스 제공', 'KERYX 原创IP · 免费授权提供')}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">
            {t('IP 쇼룸', 'IP 展厅')}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            {t(
              'KERYX가 독자 개발한 오리지널 IP를 활용하여 인형, 가방고리, 등 다양한 굿즈를 기획·제조·공급합니다. 파트너에게 무료 IP 라이선스와 독점/공동 판매 기회를 제공합니다.',
              'KERYX利用自主开发的原创IP，企划·制造·供应各种周边商品。为合作伙伴提供免费IP授权和独家/共同销售机会。'
            )}
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm text-white/60">
            <span>{t('굿즈 전문 제조', '周边专业制造')}</span>
            <span>{t('아이템 결정 즉시 진행', '确定商品后立即推进')}</span>
            <span>{t('무료 IP 라이선스 제공', '免费IP授权提供')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* IP 캐릭터 선택 카드 */}
        {!selectedIP ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              {t('캐릭터를 선택하세요', '请选择角色')}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {t('원하는 IP 캐릭터를 클릭하면 관련 상품을 볼 수 있습니다', '点击想要的IP角色即可查看相关商品')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {IP_CHARACTERS.map(ip => (
                <button
                  key={ip.slug}
                  onClick={() => setSelectedIP(ip.slug)}
                  className="group text-left rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* 배경 그라디언트 + 캐릭터 이미지 */}
                  <div className={`bg-gradient-to-br ${ip.bg_gradient} p-8 relative overflow-hidden`}>
                    {ip.heroImage && (
                      <div className="absolute top-2 right-2 w-24 h-24 opacity-90">
                        <Image src={ip.heroImage} alt={ip.name_ko} fill className="object-contain" sizes="96px" />
                      </div>
                    )}
                    {!ip.heroImage && (
                      <div className="absolute top-0 right-0 text-8xl opacity-20 -rotate-12 translate-x-4 -translate-y-2">
                        {ip.emoji}
                      </div>
                    )}
                    <div className="relative z-10">
                      <span className={`inline-block ${ip.badge_color} text-white text-xs px-3 py-1 rounded-full font-bold mb-3`}>
                        ORIGINAL IP
                      </span>
                      <h3 className={`text-2xl font-black ${ip.text_color} mb-1`}>
                        {t(ip.name_ko, ip.name_zh)}
                      </h3>
                      <p className={`text-sm ${ip.text_color} opacity-80 mb-4`}>
                        {t(ip.tagline_ko, ip.tagline_zh)}
                      </p>
                      {/* 캐릭터 색상 점 */}
                      <div className="flex gap-2">
                        {ip.characters.map(c => (
                          <div
                            key={c.name_ko}
                            className="w-5 h-5 rounded-full border-2 border-white/50"
                            style={{ backgroundColor: c.color }}
                            title={t(c.name_ko, c.name_zh)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* 하단 정보 */}
                  <div className="bg-white p-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {t(ip.description_ko, ip.description_zh)}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">
                        {ipStats[ip.slug]
                          ? t(`상품 ${ipStats[ip.slug]}개`, `${ipStats[ip.slug]}件商品`)
                          : t('IP 굿즈 보기', '查看IP周边')}
                      </span>
                      <span className="text-indigo-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                        {t('상품 보기', '查看商品')} →
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 파트너 안내 섹션 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.8} className="w-6 h-6"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t('IP 활용 상품화', 'IP商品化')}</h3>
                  <p className="text-sm text-gray-600">{t('KERYX 자체 IP를 활용한 차별화된 굿즈로 장기적 성장을 설계합니다', '利用KERYX自有IP打造差异化周边，设计长期增长路径')}</p>
                </div>
                <div>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.8} className="w-6 h-6"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t('즉시 진행 가능', '立即推进')}</h3>
                  <p className="text-sm text-gray-600">{t('아이템 결정과 동시에 전문 공장에서 쉽고 빠르게 생산을 시작합니다', '确定商品后在专业工厂立即开始生产')}</p>
                </div>
                <div>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.8} className="w-6 h-6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t('장기 성장 플랜', '长期增长规划')}</h3>
                  <p className="text-sm text-gray-600">{t('전담 MD와 함께 IP 상품 라인업을 지속 확장하는 장기 파트너십', '与专属MD一起持续扩展IP商品线的长期合作')}</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <Link
                  href="/quote"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  {t('파트너 시작하기', '成为合作伙伴')}
                </Link>
              </div>
            </div>
          </>
        ) : (
          /* IP 상품 목록 */
          <>
            {/* IP 헤더 */}
            {currentIP && (
              <div className={`bg-gradient-to-r ${currentIP.bg_gradient} rounded-2xl p-6 mb-6 relative overflow-hidden`}>
                <button
                  onClick={() => { setSelectedIP(null); setProducts([]); }}
                  className="absolute top-4 left-4 bg-white/30 hover:bg-white/50 text-white rounded-full px-3 py-1 text-sm font-medium transition-colors"
                >
                  ← {t('뒤로', '返回')}
                </button>
                <div className="text-center pt-4">
                  <div className="text-5xl mb-2">{currentIP.emoji}</div>
                  <h2 className={`text-3xl font-black ${currentIP.text_color} mb-1`}>
                    {t(currentIP.name_ko, currentIP.name_zh)}
                  </h2>
                  <p className={`text-sm ${currentIP.text_color} opacity-80`}>
                    {t(currentIP.tagline_ko, currentIP.tagline_zh)}
                  </p>
                </div>
              </div>
            )}

            {/* 상품 타입 필터 */}
            <div className="flex gap-2 flex-wrap mb-6">
              {PRODUCT_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setProductType(type.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    productType === type.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t(type.ko, type.zh)}
                </button>
              ))}
            </div>

            {/* 상품 그리드 */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">{currentIP?.emoji ?? '📦'}</div>
                <p className="text-gray-500 text-lg mb-2">
                  {t('이 카테고리의 상품이 없습니다', '此分类暂无商品')}
                </p>
                <p className="text-gray-400 text-sm">
                  {t('상품이 곧 추가될 예정입니다', '商品即将上架')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => (
                  <Link
                    key={product.id}
                    href={`/catalog?product=${product.id}`}
                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={t(product.name_ko, product.name_zh)}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                          {currentIP?.emoji ?? '📦'}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.is_new && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">NEW</span>}
                        {product.is_hot && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">HOT</span>}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-400 mb-0.5">{product.product_code}</p>
                      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">
                        {t(product.name_ko, product.name_zh)}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-indigo-700">¥{product.sell_price_cny?.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">MOQ {product.moq}{t('개', '件')}</p>
                        </div>
                        <div className="flex gap-1">
                          {product.oem_available && <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded font-bold">OEM</span>}
                          {product.odm_available && <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded font-bold">ODM</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 하단 파트너 CTA */}
            <div className="mt-10 text-center bg-white rounded-2xl p-8 shadow-sm border">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t(`${currentIP ? t(currentIP.name_ko, currentIP.name_zh) : ''} IP로 장기 사업을 시작하세요`, `用${currentIP ? t(currentIP.name_ko, currentIP.name_zh) : ''}IP开启您的长期事业`)}
              </h3>
              <p className="text-gray-500 mb-4 text-sm">
                {t('IP 활용 상품화, 샘플 개발, 디자인 지원까지 — 아이템 결정과 동시에 쉽고 빠르게 진행합니다', 'IP商品化、样品开发、设计支持 — 确定商品后立即快速推进')}
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Link
                  href="/quote"
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
                >
                  {t('파트너 시작하기', '成为合作伙伴')}
                </Link>
                <Link
                  href="/catalog"
                  className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors text-sm"
                >
                  {t('전체 카탈로그 보기', '查看全部目录')}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Public Footer */}
      <PublicFooter />
    </div>
  );
}
