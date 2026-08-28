'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpenText, Package, Sparkles } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';

const characters = [
  { ko: '길덕이', zh: '吉鸭', conceptKo: '변신천재 유연한 오리', conceptZh: '灵活百变的小鸭', image: '/images/hero-characters/gilduck.webp', storyKo: '일상의 작은 순간을 유연하고 유쾌하게 풀어내는 캐릭터입니다.', storyZh: '用灵活又愉快的方式描绘日常小瞬间的角色。' },
  { ko: '이녀석', zh: '这家伙', conceptKo: '재미있는 낙서 캐릭터', conceptZh: '有趣的涂鸦角色', image: '/images/hero-characters/inyeoseok.webp', storyKo: '자유로운 낙서의 선과 표정을 바탕으로 다양한 굿즈로 확장하는 캐릭터 브랜드입니다.', storyZh: '以自由涂鸦的线条和表情为基础，延展为多样周边的角色品牌。' },
  { ko: '꼬물이들', zh: '小怪物们', conceptKo: '우주에서 온 몬스터', conceptZh: '来自宇宙的小怪物', image: '/images/hero-characters/kkomul.webp', storyKo: '낯선 우주에서 찾아온 개성 있는 친구들의 모험을 담은 캐릭터입니다.', storyZh: '记录来自陌生宇宙的个性伙伴们冒险的角色。' },
  { ko: '하트뿅 햄스터', zh: '爱心仓鼠', conceptKo: '마음을 전하는 햄스터', conceptZh: '传递心意的仓鼠', image: '/images/hero-characters/heartbbung.webp', storyKo: '작은 손짓과 표정으로 다정한 마음을 전하는 캐릭터입니다.', storyZh: '用小小手势和表情传递温暖心意的角色。' },
  { ko: '피글리', zh: '皮格利', conceptKo: '동글동글 귀여운 돼지', conceptZh: '圆滚滚的可爱小猪', image: '/images/hero-characters/piggly.webp', storyKo: '부드러운 실루엣과 편안한 표정이 매력인 일상형 캐릭터입니다.', storyZh: '以柔和轮廓和轻松表情见长的日常角色。' },
];

const copy = {
  ko: {
    eyebrow: 'ORIGINAL IP',
    title: '이야기에서 시작해 상품으로 이어지는 KERYX의 자체 디자인 IP',
    description: '캐릭터의 성격과 세계관을 먼저 설계하고, 콘텐츠와 제품 아이디어를 연결해 일상에서 만나는 굿즈로 발전시킵니다.',
    characterCta: '캐릭터 보기',
    storeCta: '상품 스토어',
    sectionEyebrow: 'CHARACTERS',
    sectionTitle: '캐릭터와 세계관',
    sectionDescription: '캐릭터의 성격과 콘텐츠 방향을 먼저 정리해, 상품의 디자인 언어가 흔들리지 않도록 합니다.',
    productLink: '관련 상품 보기',
    storyEyebrow: 'STORY ARCHIVE',
    storyTitle: '세계관 아카이브',
    storyDescription: '캐릭터가 태어난 배경과 관계, 디자인 모티프를 콘텐츠 중심으로 살펴봅니다.',
    storyLink: '스토리 보기',
    serialEyebrow: 'SERIAL CONTENT',
    serialTitle: '동화·웹툰·소설 연재',
    serialDescription: '캐릭터의 이야기를 지속적으로 쌓아가며, 다음 콘텐츠와 상품 아이디어로 연결합니다.',
    serialLink: '연재 보기',
    connectionEyebrow: 'PRODUCT CONNECTION',
    connectionTitle: 'IP가 적용된 상품을 직접 확인해 보세요.',
    connectionDescription: '판매 준비가 완료된 상품만 스토어에 공개합니다.',
    connectionCta: 'KERYX 스토어',
  },
  zh: {
    eyebrow: 'ORIGINAL IP',
    title: '从故事出发，延展为商品的 KERYX 原创设计 IP',
    description: '先构建角色性格与世界观，再连接内容和产品创意，发展为日常可见的角色周边。',
    characterCta: '查看角色',
    storeCta: '商品商店',
    sectionEyebrow: 'CHARACTERS',
    sectionTitle: '角色与世界观',
    sectionDescription: '先梳理角色性格与内容方向，让商品的设计语言保持一致。',
    productLink: '查看相关商品',
    storyEyebrow: 'STORY ARCHIVE',
    storyTitle: '世界观档案',
    storyDescription: '以内容为中心了解角色诞生的背景、关系和设计灵感。',
    storyLink: '查看故事',
    serialEyebrow: 'SERIAL CONTENT',
    serialTitle: '童话·漫画·小说连载',
    serialDescription: '持续积累角色故事，并连接下一阶段的内容和商品创意。',
    serialLink: '查看连载',
    connectionEyebrow: 'PRODUCT CONNECTION',
    connectionTitle: '直接了解应用 IP 的商品。',
    connectionDescription: '仅在商店公开已完成销售准备的商品。',
    connectionCta: 'KERYX 商店',
  },
};

export function IpHubContent() {
  const { lang } = useLangContext();
  const t = copy[lang];

  return (
    <main>
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-black tracking-[0.18em] text-orange-700">{t.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">{t.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600">{t.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#characters" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95"><Sparkles className="h-4 w-4" />{t.characterCta}</Link>
            <Link href="/shop" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-800 no-underline transition hover:bg-stone-100 active:scale-95"><Package className="h-4 w-4" />{t.storeCta}</Link>
          </div>
        </div>
      </section>

      <section id="characters" className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black tracking-[0.16em] text-orange-700">{t.sectionEyebrow}</p><h2 className="mt-2 text-3xl font-black tracking-tight">{t.sectionTitle}</h2></div>
          <p className="max-w-md text-base leading-7 text-stone-600">{t.sectionDescription}</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => {
            const name = lang === 'ko' ? character.ko : character.zh;
            const concept = lang === 'ko' ? character.conceptKo : character.conceptZh;
            const story = lang === 'ko' ? character.storyKo : character.storyZh;
            return <article key={character.ko} className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-square overflow-hidden bg-stone-100"><Image src={character.image} alt={`${name} ${lang === 'ko' ? '캐릭터' : '角色'}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div><div className="p-5"><p className="text-sm font-bold text-orange-700">{concept}</p><h3 className="mt-1 text-xl font-black">{name}</h3><p className="mt-3 text-sm leading-6 text-stone-600">{story}</p><Link href="/shop" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-stone-950 no-underline transition hover:text-orange-700 active:scale-95">{t.productLink}<ArrowRight className="h-4 w-4" /></Link></div></article>;
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-screen-xl gap-4 px-4 pb-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Link href="/ip-story" className="rounded-3xl bg-stone-950 p-6 text-white no-underline transition hover:bg-stone-800 active:scale-[0.99] sm:p-8"><BookOpenText className="h-6 w-6 text-orange-300" /><p className="mt-7 text-xs font-black tracking-[0.16em] text-orange-200">{t.storyEyebrow}</p><h2 className="mt-2 text-2xl font-black">{t.storyTitle}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-stone-300">{t.storyDescription}</p><span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold">{t.storyLink}<ArrowRight className="h-4 w-4" /></span></Link>
        <Link href="/ip-serial" className="rounded-3xl border border-stone-200 bg-white p-6 text-stone-950 no-underline transition hover:border-stone-400 active:scale-[0.99] sm:p-8"><BookOpenText className="h-6 w-6 text-orange-700" /><p className="mt-7 text-xs font-black tracking-[0.16em] text-orange-700">{t.serialEyebrow}</p><h2 className="mt-2 text-2xl font-black">{t.serialTitle}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">{t.serialDescription}</p><span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold">{t.serialLink}<ArrowRight className="h-4 w-4" /></span></Link>
      </section>

      <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><div className="rounded-3xl border border-orange-200 bg-orange-50 p-6 sm:flex sm:items-center sm:justify-between sm:p-8"><div><p className="text-xs font-black tracking-[0.16em] text-orange-700">{t.connectionEyebrow}</p><h2 className="mt-2 text-2xl font-black">{t.connectionTitle}</h2><p className="mt-3 text-base leading-7 text-stone-600">{t.connectionDescription}</p></div><Link href="/shop" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95 sm:mt-0">{t.connectionCta}<ArrowRight className="h-4 w-4" /></Link></div></section>
    </main>
  );
}
