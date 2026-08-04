'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

type Lang = 'ko' | 'zh';

const texts = {
  ko: {
    hero_badge: 'IP Serial Contents',
    hero_title: '캐릭터의 이야기를\n연재합니다',
    hero_desc: 'KERYX의 오리지널 IP 캐릭터들의 동화, 웹툰, 소설을 연재합니다. 캐릭터의 세계관이 확장되고, 스토리가 쌓일수록 IP의 가치가 높아집니다.',
    tab_all: '전체',
    tab_fairytale: '동화',
    tab_webtoon: '웹툰',
    tab_novel: '소설',
    coming_soon: '새로운 에피소드 준비 중',
    coming_soon_desc: '곧 새로운 이야기가 시작됩니다. 기대해 주세요!',
    episode: '화',
    read: '읽기',
    new_badge: 'NEW',
    cta_title: 'IP 콘텐츠 파트너를 찾습니다',
    cta_desc: '우리의 IP를 활용한 콘텐츠 제작, 출판, 애니메이션 등 다양한 협업을 제안합니다.',
    cta_btn: '파트너 상담 시작',
  },
  zh: {
    hero_badge: 'IP Serial Contents',
    hero_title: '连载角色的故事',
    hero_desc: 'KERYX原创IP角色的童话、网漫、小说连载中。随着角色世界观的扩展和故事的积累，IP的价值不断提升。',
    tab_all: '全部',
    tab_fairytale: '童话',
    tab_webtoon: '网漫',
    tab_novel: '小说',
    coming_soon: '新篇章准备中',
    coming_soon_desc: '新的故事即将开始，敬请期待！',
    episode: '话',
    read: '阅读',
    new_badge: 'NEW',
    cta_title: '寻找IP内容合作伙伴',
    cta_desc: '提供利用我们IP进行内容制作、出版、动画等多种合作。',
    cta_btn: '开始合作咨询',
  },
};

// ── 에피소드 데이터 (정적 초기 콘텐츠) ──────────────────────────
interface Episode {
  id: string;
  ip: 'ppuji' | 'dinomon' | 'duckle';
  ipName_ko: string;
  ipName_zh: string;
  type: 'fairytale' | 'webtoon' | 'novel';
  episode_number: number;
  title_ko: string;
  title_zh: string;
  summary_ko: string;
  summary_zh: string;
  thumbnail: string;
  color: string;
  isNew?: boolean;
  published_at: string;
}

const EPISODES: Episode[] = [
  {
    id: 'ppuji-ft-01',
    ip: 'ppuji',
    ipName_ko: '뿌찌프랜즈',
    ipName_zh: '噗奇朋友们',
    type: 'fairytale',
    episode_number: 1,
    title_ko: '뿌찌빌리지의 첫 번째 아침',
    title_zh: '噗吉村庄的第一个早晨',
    summary_ko: '뿌찌빌리지에 새로운 하루가 시작됩니다. 당뿌가 마을 친구들을 하나씩 깨우며 특별한 하루를 준비하는 이야기.',
    summary_zh: '噗吉村庄新的一天开始了。当噗一个一个叫醒村里的朋友们，准备特别的一天的故事。',
    thumbnail: '/images/ip-story/ppuchi-world.jpg',
    color: 'from-pink-500 to-rose-400',
    isNew: true,
    published_at: '2026-07-28',
  },
  {
    id: 'ppuji-ft-02',
    ip: 'ppuji',
    ipName_ko: '뿌찌프랜즈',
    ipName_zh: '噗奇朋友们',
    type: 'fairytale',
    episode_number: 2,
    title_ko: '모찌의 비밀 레시피',
    title_zh: '年糕的秘密食谱',
    summary_ko: '모찌가 마을 축제를 위해 특별한 요리를 준비합니다. 하지만 중요한 재료가 부족해서 친구들의 도움이 필요한데...',
    summary_zh: '年糕为村庄节日准备特别的料理。但是重要的食材不够，需要朋友们的帮助...',
    thumbnail: '/images/ip-story/ppuchi-world.jpg',
    color: 'from-pink-500 to-rose-400',
    isNew: true,
    published_at: '2026-08-01',
  },
  {
    id: 'dinomon-ft-01',
    ip: 'dinomon',
    ipName_ko: '디노몬',
    ipName_zh: '恐龙萌',
    type: 'fairytale',
    episode_number: 1,
    title_ko: '디노몬 아일랜드의 비밀',
    title_zh: '恐龙萌岛的秘密',
    summary_ko: '신비의 섬 디노몬 아일랜드에서 티노가 발견한 고대 지도. 6명의 공룡 친구들이 섬의 비밀을 찾아 모험을 떠납니다.',
    summary_zh: '在神秘的恐龙萌岛上，蒂诺发现了古老的地图。6位恐龙朋友踏上了寻找岛屿秘密的冒险之旅。',
    thumbnail: '/images/ip-story/dinomon-world.jpg',
    color: 'from-emerald-500 to-teal-400',
    published_at: '2026-07-15',
  },
  {
    id: 'dinomon-wt-01',
    ip: 'dinomon',
    ipName_ko: '디노몬',
    ipName_zh: '恐龙萌',
    type: 'webtoon',
    episode_number: 1,
    title_ko: '용감한 티노의 하루',
    title_zh: '勇敢的蒂诺的一天',
    summary_ko: '디노몬 아일랜드의 리더 티노! 오늘도 섬을 지키기 위해 순찰을 돌지만, 예상치 못한 사건이 발생합니다.',
    summary_zh: '恐龙萌岛的领袖蒂诺！今天也为了守护岛屿进行巡逻，但发生了意想不到的事件。',
    thumbnail: '/images/ip-story/dinomon-world.jpg',
    color: 'from-emerald-500 to-teal-400',
    isNew: true,
    published_at: '2026-07-25',
  },
  {
    id: 'duckle-ft-01',
    ip: 'duckle',
    ipName_ko: '덕클',
    ipName_zh: '鸭克',
    type: 'fairytale',
    episode_number: 1,
    title_ko: '덕클의 연못 탐험',
    title_zh: '鸭克的池塘探险',
    summary_ko: '호기심 많은 노란 오리 덕클이 연못 너머의 세계를 처음으로 탐험합니다. 새로운 친구를 만나고, 작은 용기를 배우는 이야기.',
    summary_zh: '好奇的黄色小鸭鸭克第一次探索池塘那边的世界。遇到新朋友，学习小小勇气的故事。',
    thumbnail: '/images/ip-story/duckle-adventure.jpg',
    color: 'from-amber-500 to-yellow-400',
    published_at: '2026-07-20',
  },
  {
    id: 'duckle-nv-01',
    ip: 'duckle',
    ipName_ko: '덕클',
    ipName_zh: '鸭克',
    type: 'novel',
    episode_number: 1,
    title_ko: '비 오는 날의 덕클',
    title_zh: '下雨天的鸭克',
    summary_ko: '비가 내리는 날, 덕클은 연못 위에 떨어지는 빗방울을 세기 시작합니다. 그러다 발견한 무지개빛 물방울의 비밀...',
    summary_zh: '下雨天，鸭克开始数落在池塘上的雨滴。然后发现了彩虹色水滴的秘密...',
    thumbnail: '/images/ip-story/duckle-adventure.jpg',
    color: 'from-amber-500 to-yellow-400',
    published_at: '2026-07-30',
  },
];

const TYPE_ICONS: Record<string, string> = {
  fairytale: '📖',
  webtoon: '🎨',
  novel: '✍️',
};

export default function IPSerialPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeIP, setActiveIP] = useState<string>('all');
  const t = texts[lang];

  const filteredEpisodes = EPISODES.filter(ep => {
    if (activeTab !== 'all' && ep.type !== activeTab) return false;
    if (activeIP !== 'all' && ep.ip !== activeIP) return false;
    return true;
  }).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang} onLangChange={setLang} theme="dark" />

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0a1e 50%, #1a1040 100%)' }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-purple-500 blur-[100px]" />
          <div className="absolute bottom-10 right-20 w-96 h-96 rounded-full bg-pink-500 blur-[120px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs font-bold tracking-widest text-purple-300 uppercase mb-4 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30">
            {t.hero_badge}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mt-6 whitespace-pre-line leading-tight">
            {t.hero_title}
          </h1>
          <p className="text-white/60 text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
            {t.hero_desc}
          </p>
        </div>
      </section>

      {/* ═══ FILTER TABS ═══ */}
      <section className="py-8 border-b border-gray-100 sticky top-[64px] bg-white/95 backdrop-blur-sm z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* 콘텐츠 유형 필터 */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: t.tab_all },
                { key: 'fairytale', label: t.tab_fairytale, icon: '📖' },
                { key: 'webtoon', label: t.tab_webtoon, icon: '🎨' },
                { key: 'novel', label: t.tab_novel, icon: '✍️' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.icon && <span className="mr-1">{tab.icon}</span>}
                  {tab.label}
                </button>
              ))}
            </div>
            {/* IP 필터 */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: lang === 'zh' ? '全部IP' : '전체 IP' },
                { key: 'ppuji', label: lang === 'zh' ? '噗奇' : '뿌찌' },
                { key: 'dinomon', label: lang === 'zh' ? '恐龙萌' : '디노몬' },
                { key: 'duckle', label: lang === 'zh' ? '鸭克' : '덕클' },
              ].map(ip => (
                <button
                  key={ip.key}
                  onClick={() => setActiveIP(ip.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeIP === ip.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {ip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ EPISODES GRID ═══ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredEpisodes.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t.coming_soon}</h3>
              <p className="text-gray-500">{t.coming_soon_desc}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEpisodes.map(ep => (
                <Link key={ep.id} href={`/ip-serial/${ep.id}`}>
                <article className="group rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300">
                  {/* 썸네일 */}
                  <div className="relative h-48 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${ep.color} opacity-80`} />
                    <Image
                      src={ep.thumbnail}
                      alt={lang === 'zh' ? ep.title_zh : ep.title_ko}
                      fill
                      className="object-cover mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-2 py-1 bg-white/90 rounded-md text-xs font-bold text-gray-800">
                        {TYPE_ICONS[ep.type]} {lang === 'zh' ? (ep.type === 'fairytale' ? '童话' : ep.type === 'webtoon' ? '网漫' : '小说') : (ep.type === 'fairytale' ? '동화' : ep.type === 'webtoon' ? '웹툰' : '소설')}
                      </span>
                      {ep.isNew && (
                        <span className="px-2 py-1 bg-red-500 text-white rounded-md text-xs font-bold">
                          {t.new_badge}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                        {ep.episode_number}{t.episode}
                      </span>
                    </div>
                  </div>
                  {/* 내용 */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-gray-400">
                        {lang === 'zh' ? ep.ipName_zh : ep.ipName_ko}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(ep.published_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {lang === 'zh' ? ep.title_zh : ep.title_ko}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                      {lang === 'zh' ? ep.summary_zh : ep.summary_ko}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 group-hover:text-purple-700">
                        {t.read} →
                      </span>
                    </div>
                  </div>
                </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0a1e 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">{t.cta_title}</h2>
          <p className="text-white/60 text-lg mb-10">{t.cta_desc}</p>
          <Link href="/quote" className="inline-block px-10 py-5 text-lg font-bold text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}>
            {t.cta_btn}
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
