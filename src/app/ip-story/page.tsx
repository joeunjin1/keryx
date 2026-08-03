'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Lang = 'ko' | 'zh';

const texts = {
  ko: {
    hero_badge: 'KERYX IP Universe',
    hero_title: '캐릭터를 만들고\n스토리를 연재합니다',
    hero_desc: 'KERYX는 오리지널 IP 캐릭터를 개발하고, 세계관을 구축하며, 스토리를 연재하고, 그에 맞는 상품과 콘텐츠를 기획·생산하는 IP 포털 기업입니다.',
    stats: [
      { num: '15종', label: '오리지널 캐릭터' },
      { num: '71개', label: '디자인 완성' },
      { num: '3개', label: 'IP 세계관' },
      { num: '연재중', label: '스토리·동화' },
    ],
    section_worlds: 'IP 세계관 소개',
    section_worlds_desc: '각 IP는 고유한 세계관과 스토리를 가지고 있으며, 캐릭터들의 이야기가 계속 확장됩니다.',
    section_process: '이렇게 만들어집니다',
    section_process_desc: '캐릭터 탄생부터 상품화까지, KERYX의 IP 개발 과정을 소개합니다.',
    section_products: 'IP에서 상품으로',
    section_products_desc: '캐릭터가 실제 상품이 되어 소비자에게 전달되기까지의 여정입니다.',
    cta_title: '함께 만들어갈 파트너를 찾습니다',
    cta_desc: 'KERYX의 IP를 활용한 상품 기획부터 생산까지, 장기적인 사업 파트너십을 제안합니다.',
    cta_button: '파트너 상담 시작하기',
    process_steps: [
      { title: '캐릭터 개발', desc: '세계관 설정과 캐릭터 디자인. 각 캐릭터의 성격, 스토리, 비주얼을 확정합니다.' },
      { title: '스토리 연재', desc: '동화, 웹툰, 숏폼 콘텐츠로 캐릭터의 이야기를 확장합니다.' },
      { title: '상품 아이디어', desc: '캐릭터의 특성에 맞는 상품 카테고리와 디자인을 기획합니다.' },
      { title: '샘플 제작', desc: '전문 공장에서 프로토타입을 제작하고 품질을 검증합니다.' },
      { title: '양산 & 납품', desc: '검증된 공장에서 대량 생산 후 100% 전수 검수를 거쳐 납품합니다.' },
    ],
  },
  zh: {
    hero_badge: 'KERYX IP Universe',
    hero_title: '创造角色\n连载故事',
    hero_desc: 'KERYX是一家开发原创IP角色、构建世界观、连载故事，并策划·生产相关商品和内容的IP门户企业。',
    stats: [
      { num: '15种', label: '原创角色' },
      { num: '71个', label: '设计完成' },
      { num: '3个', label: 'IP世界观' },
      { num: '连载中', label: '故事·童话' },
    ],
    section_worlds: 'IP世界观介绍',
    section_worlds_desc: '每个IP都拥有独特的世界观和故事，角色们的故事在不断扩展。',
    section_process: '这样创造的',
    section_process_desc: '从角色诞生到商品化，介绍KERYX的IP开发过程。',
    section_products: '从IP到商品',
    section_products_desc: '角色变成实际商品并传递给消费者的旅程。',
    cta_title: '寻找共同成长的合作伙伴',
    cta_desc: '从利用KERYX IP的商品策划到生产，提供长期商业合作伙伴关系。',
    cta_button: '开始合作咨询',
    process_steps: [
      { title: '角色开发', desc: '世界观设定和角色设计。确定每个角色的性格、故事和视觉。' },
      { title: '故事连载', desc: '通过童话、网漫、短视频内容扩展角色故事。' },
      { title: '商品创意', desc: '根据角色特性策划商品类别和设计。' },
      { title: '样品制作', desc: '在专业工厂制作原型并验证质量。' },
      { title: '量产&交付', desc: '在验证工厂大量生产后经100%全检后交付。' },
    ],
  },
};

const IP_WORLDS = {
  ko: [
    {
      id: 'ppuji',
      name: '뿌지프랜즈',
      subtitle: 'PPUJI FRIENDS',
      world: '뿌지빌리지',
      story: '뿌지빌리지에 사는 8명의 친구들. 각자 다른 성격과 재능을 가진 캐릭터들이 마을에서 벌어지는 크고 작은 사건을 함께 해결해 나가는 이야기입니다. 현재 동화 시리즈로 연재 중입니다.',
      characters: [
        { name: '당뿌', image: '/images/ip-characters/ppuji/dangppu.webp', desc: '뿌지빌리지의 리더' },
        { name: '모찌', image: '/images/ip-characters/ppuji/mochi.webp', desc: '부드러운 성격의 친구' },
        { name: '파시', image: '/images/ip-characters/ppuji/pashi.webp', desc: '활발한 모험가' },
        { name: '뚱치', image: '/images/ip-characters/ppuji/ttungchi.webp', desc: '든든한 힘센 친구' },
        { name: '도니', image: '/images/ip-characters/ppuji/doni.webp', desc: '영리한 발명가' },
        { name: '핫투', image: '/images/ip-characters/ppuji/hattu.webp', desc: '따뜻한 마음의 소유자' },
        { name: '츄라', image: '/images/ip-characters/ppuji/chura.webp', desc: '우아한 예술가' },
        { name: '블랙', image: '/images/ip-characters/ppuji/black.webp', desc: '신비로운 수호자' },
      ],
      stats: { characters: 8, designs: 15, approved: 15 },
      features: ['동화 연재', '캐릭터 디자인', '포장 디자인'],
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
    },
    {
      id: 'dinomon',
      name: '디노몬 월드',
      subtitle: 'DINOMON WORLD',
      world: '디노몬 아일랜드',
      story: '먼 옛날 공룡들이 살던 신비의 섬, 디노몬 아일랜드. 6종의 공룡 캐릭터들이 각자의 능력을 활용해 섬을 지키고 모험을 떠나는 이야기입니다. 각 공룡은 실제 공룡 종을 기반으로 디자인되었습니다.',
      characters: [
        { name: '티노', image: '/images/ip-characters/dinomon/tino.png', desc: '티라노사우루스 - 용감한 리더' },
        { name: '트리니', image: '/images/ip-characters/dinomon/trini.png', desc: '트리케라톱스 - 든든한 방패' },
        { name: '벨로', image: '/images/ip-characters/dinomon/velo.png', desc: '벨로시랩터 - 빠른 정찰병' },
        { name: '스테고', image: '/images/ip-characters/dinomon/stego.png', desc: '스테고사우루스 - 지혜로운 참모' },
        { name: '브라키', image: '/images/ip-characters/dinomon/brachi.png', desc: '브라키오사우루스 - 온화한 거인' },
        { name: '앙키', image: '/images/ip-characters/dinomon/anki.png', desc: '안킬로사우루스 - 철벽 수비수' },
      ],
      stats: { characters: 6, designs: 45, approved: 7 },
      features: ['캐릭터 디자인', '승인 관리', '포장 디자인', '갤러리'],
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'duckle',
      name: '덕클 월드',
      subtitle: 'DUCKLE WORLD',
      world: '덕클 연못',
      story: '호기심 많은 노란 오리 덕클의 일상 이야기. 연못을 중심으로 펼쳐지는 소소하지만 따뜻한 에피소드들이 매력입니다. 다양한 포즈와 표정으로 일상의 감정을 표현합니다.',
      characters: [
        { name: '덕클', image: '/images/ip-characters/duckle/duckle-front.png', desc: '호기심 많은 노란 오리' },
      ],
      stats: { characters: 1, designs: 11, approved: 7 },
      features: ['삼면도', '포즈별 디자인', '포장 디자인'],
      color: 'from-amber-500 to-yellow-500',
      bgColor: 'bg-amber-50',
    },
  ],
  zh: [
    {
      id: 'ppuji',
      name: '噗吉朋友们',
      subtitle: 'PPUJI FRIENDS',
      world: '噗吉村庄',
      story: '住在噗吉村庄的8位朋友。拥有不同性格和才能的角色们一起解决村庄里大大小小的事件。目前正在以童话系列连载中。',
      characters: [
        { name: '当噗', image: '/images/ip-characters/ppuji/dangppu.webp', desc: '噗吉村庄的领袖' },
        { name: '麻糬', image: '/images/ip-characters/ppuji/mochi.webp', desc: '温柔性格的朋友' },
        { name: '帕西', image: '/images/ip-characters/ppuji/pashi.webp', desc: '活泼的冒险家' },
        { name: '胖奇', image: '/images/ip-characters/ppuji/ttungchi.webp', desc: '可靠的力量型朋友' },
        { name: '多尼', image: '/images/ip-characters/ppuji/doni.webp', desc: '聪明的发明家' },
        { name: '哈图', image: '/images/ip-characters/ppuji/hattu.webp', desc: '温暖心灵的拥有者' },
        { name: '秋拉', image: '/images/ip-characters/ppuji/chura.webp', desc: '优雅的艺术家' },
        { name: '布莱克', image: '/images/ip-characters/ppuji/black.webp', desc: '神秘的守护者' },
      ],
      stats: { characters: 8, designs: 15, approved: 15 },
      features: ['童话连载', '角色设计', '包装设计'],
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
    },
    {
      id: 'dinomon',
      name: '恐龙怪兽世界',
      subtitle: 'DINOMON WORLD',
      world: '恐龙怪兽岛',
      story: '远古时代恐龙生活的神秘岛屿——恐龙怪兽岛。6种恐龙角色利用各自的能力守护岛屿并展开冒险。每只恐龙都基于真实恐龙种类设计。',
      characters: [
        { name: '提诺', image: '/images/ip-characters/dinomon/tino.png', desc: '霸王龙 - 勇敢的领袖' },
        { name: '特里尼', image: '/images/ip-characters/dinomon/trini.png', desc: '三角龙 - 坚实的盾牌' },
        { name: '维洛', image: '/images/ip-characters/dinomon/velo.png', desc: '迅猛龙 - 快速侦察兵' },
        { name: '斯特戈', image: '/images/ip-characters/dinomon/stego.png', desc: '剑龙 - 智慧的参谋' },
        { name: '布拉奇', image: '/images/ip-characters/dinomon/brachi.png', desc: '腕龙 - 温和的巨人' },
        { name: '安奇', image: '/images/ip-characters/dinomon/anki.png', desc: '甲龙 - 铁壁防守者' },
      ],
      stats: { characters: 6, designs: 45, approved: 7 },
      features: ['角色设计', '审批管理', '包装设计', '画廊'],
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'duckle',
      name: '鸭克世界',
      subtitle: 'DUCKLE WORLD',
      world: '鸭克池塘',
      story: '好奇心旺盛的黄色鸭子鸭克的日常故事。围绕池塘展开的虽小却温暖的故事充满魅力。用各种姿势和表情表达日常情感。',
      characters: [
        { name: '鸭克', image: '/images/ip-characters/duckle/duckle-front.png', desc: '好奇心旺盛的黄色鸭子' },
      ],
      stats: { characters: 1, designs: 11, approved: 7 },
      features: ['三面图', '姿势设计', '包装设计'],
      color: 'from-amber-500 to-yellow-500',
      bgColor: 'bg-amber-50',
    },
  ],
};

export default function IpStoryPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [selectedWorld, setSelectedWorld] = useState<string>('ppuji');
  const t = texts[lang];
  const worlds = IP_WORLDS[lang];
  const currentWorld = worlds.find(w => w.id === selectedWorld) || worlds[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Language Toggle */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={() => setLang('ko')} className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${lang === 'ko' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>한국어</button>
        <button onClick={() => setLang('zh')} className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${lang === 'zh' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>中文</button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-pink-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-emerald-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-36 h-36 bg-amber-500 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6">{t.hero_badge}</span>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight whitespace-pre-line mb-6">{t.hero_title}</h1>
              <p className="text-lg text-gray-300 leading-relaxed mb-8">{t.hero_desc}</p>
              <div className="grid grid-cols-4 gap-4">
                {t.stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-white">{stat.num}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-3 gap-3">
                {worlds[0].characters.slice(0, 3).map((char, i) => (
                  <div key={`ppuji-${i}`} className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm p-2">
                    <Image src={char.image} alt={char.name} fill className="object-contain p-2" sizes="150px" />
                  </div>
                ))}
                {worlds[1].characters.slice(0, 3).map((char, i) => (
                  <div key={`dino-${i}`} className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm p-2">
                    <Image src={char.image} alt={char.name} fill className="object-contain p-2" sizes="150px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IP Worlds Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t.section_worlds}</h2>
          <p className="text-lg text-gray-600">{t.section_worlds_desc}</p>
        </div>

        <div className="flex justify-center gap-4 mb-12">
          {worlds.map((world) => (
            <button
              key={world.id}
              onClick={() => setSelectedWorld(world.id)}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                selectedWorld === world.id
                  ? `bg-gradient-to-r ${world.color} text-white shadow-lg`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {world.name}
            </button>
          ))}
        </div>

        <div className={`rounded-3xl p-8 lg:p-12 ${currentWorld.bgColor}`}>
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div>
              <span className="text-sm font-medium text-gray-500">{currentWorld.subtitle}</span>
              <h3 className="text-3xl font-bold text-gray-900 mt-2 mb-2">{currentWorld.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{lang === 'ko' ? '세계관' : '世界观'}: {currentWorld.world}</p>
              <p className="text-gray-700 leading-relaxed mb-6">{currentWorld.story}</p>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{currentWorld.stats.characters}{lang === 'ko' ? '종' : '种'}</div>
                  <div className="text-xs text-gray-500">{lang === 'ko' ? '캐릭터' : '角色'}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{currentWorld.stats.designs}{lang === 'ko' ? '개' : '个'}</div>
                  <div className="text-xs text-gray-500">{lang === 'ko' ? '디자인' : '设计'}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{currentWorld.stats.approved}{lang === 'ko' ? '개' : '个'}</div>
                  <div className="text-xs text-gray-500">{lang === 'ko' ? '승인' : '审批'}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                {currentWorld.features.map((f, i) => (
                  <span key={i} className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 shadow-sm">{f}</span>
                ))}
              </div>
            </div>
            <div className={`grid ${currentWorld.characters.length > 4 ? 'grid-cols-4' : currentWorld.characters.length > 1 ? 'grid-cols-3' : 'grid-cols-1 max-w-[200px] mx-auto'} gap-3`}>
              {currentWorld.characters.map((char, i) => (
                <div key={i} className="group relative">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm group-hover:shadow-md transition-shadow p-2">
                    <Image src={char.image} alt={char.name} fill className="object-contain p-1" sizes="120px" />
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-sm font-medium text-gray-900">{char.name}</div>
                    <div className="text-xs text-gray-500">{char.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Development Process */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t.section_process}</h2>
            <p className="text-lg text-gray-600">{t.section_process_desc}</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {t.process_steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center text-white font-bold text-sm mb-4">
                    {i + 1}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
                {i < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-gray-300 text-xl">&rarr;</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IP to Products */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t.section_products}</h2>
          <p className="text-lg text-gray-600">{t.section_products_desc}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '🎨', title: lang === 'ko' ? '캐릭터 디자인' : '角色设计', desc: lang === 'ko' ? '세계관에 맞는 캐릭터를 디자인하고 삼면도, 포즈, 표정을 완성합니다.' : '设计符合世界观的角色，完成三面图、姿势和表情。', items: lang === 'ko' ? ['삼면도 제작', '포즈 디자인', '표정 시트', '컬러 가이드'] : ['三面图制作', '姿势设计', '表情表', '色彩指南'] },
            { icon: '📦', title: lang === 'ko' ? '상품 기획' : '商品策划', desc: lang === 'ko' ? '캐릭터 특성에 맞는 상품을 기획하고 패키지 디자인까지 완성합니다.' : '策划符合角色特性的商品，完成包装设计。', items: lang === 'ko' ? ['봉제인형', '키링·가방고리', '뽑기 굿즈', '보냉백·생활용품'] : ['毛绒玩偶', '钥匙扣·包挂', '扭蛋周边', '保温袋·生活用品'] },
            { icon: '🏭', title: lang === 'ko' ? '생산·납품' : '生产·交付', desc: lang === 'ko' ? '전문 공장에서 생산하고 100% 전수 검수 후 납품합니다.' : '在专业工厂生产，100%全检后交付。', items: lang === 'ko' ? ['전문 공장 매칭', '샘플 검증', '100% 전수 검수', '물류·통관'] : ['专业工厂匹配', '样品验证', '100%全检', '物流·通关'] },
          ].map((card, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{card.icon}</div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h4>
              <p className="text-gray-600 mb-4">{card.desc}</p>
              <ul className="space-y-2">
                {card.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">{t.cta_title}</h2>
          <p className="text-lg text-gray-300 mb-8">{t.cta_desc}</p>
          <Link href="/contact" className="inline-block px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors">
            {t.cta_button}
          </Link>
        </div>
      </section>
    </div>
  );
}
