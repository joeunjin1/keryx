'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

type Lang = 'ko' | 'zh';
type Tier = 'all' | 'A' | 'B' | 'C';

const texts = {
  ko: {
    hero_badge: 'KERYX IP Universe',
    hero_title: '오리지널 IP를 만들고\n스토리를 연재합니다',
    hero_desc: 'KERYX는 오리지널 IP 캐릭터를 개발하고, 세계관을 구축하며, 스토리를 연재하고, 그에 맞는 상품과 콘텐츠를 기획·생산하는 IP 포털 기업입니다.',
    stats: [
      { num: 'IP', label: '오리지널 캐릭터' },
      { num: '핵심', label: '대표 IP 라인업' },
      { num: '성장', label: '확장 IP 포트폴리오' },
      { num: '연재중', label: '스토리·동화' },
    ],
    section_worlds: 'IP 포트폴리오',
    section_worlds_desc: '각 IP는 고유한 세계관과 스토리를 가지고 있으며, 캐릭터들의 이야기가 계속 확장됩니다.',
    section_process: '이렇게 만들어집니다',
    section_process_desc: '캐릭터 탄생부터 상품화까지, KERYX의 IP 개발 과정을 소개합니다.',
    section_products: 'IP에서 상품으로',
    section_products_desc: '캐릭터가 실제 상품이 되어 소비자에게 전달되기까지의 여정입니다.',
    cta_title: '함께 만들어갈 파트너를 찾습니다',
    cta_desc: 'KERYX의 IP를 활용한 상품 기획부터 생산까지, 장기적인 사업 파트너십을 제안합니다.',
    cta_button: '파트너 상담 시작하기',
    filter_all: '전체',
    filter_a: '핵심 A등급',
    filter_b: '성장 B등급',
    filter_c: '실험 C등급',
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
    hero_title: '原创IP\n连载故事',
    hero_desc: 'KERYX是一家开发原创IP角色、构建世界观、连载故事，并策划·生产相关商品和内容的IP门户企业。',
    stats: [
      { num: 'IP', label: '原创角色' },
      { num: '核心', label: '代表IP阵容' },
      { num: '成长', label: '扩展IP作品集' },
      { num: '连载中', label: '故事·童话' },
    ],
    section_worlds: 'IP作品集',
    section_worlds_desc: '每个IP都拥有独特的世界观和故事，角色们的故事在不断扩展。',
    section_process: '这样创造的',
    section_process_desc: '从角色诞生到商品化，介绍KERYX的IP开发过程。',
    section_products: '从IP到商品',
    section_products_desc: '角色变成实际商品并传递给消费者的旅程。',
    cta_title: '寻找共同成长的合作伙伴',
    cta_desc: '从利用KERYX IP的商品策划到生产，提供长期商业合作伙伴关系。',
    cta_button: '开始合作咨询',
    filter_all: '全部',
    filter_a: '核心A级',
    filter_b: '成长B级',
    filter_c: '实验C级',
    process_steps: [
      { title: '角色开发', desc: '世界观设定和角色设计。确定每个角色的性格、故事和视觉。' },
      { title: '故事连载', desc: '通过童话、网漫、短视频内容扩展角色故事。' },
      { title: '商品创意', desc: '根据角色特性策划商品类别和设计。' },
      { title: '样品制作', desc: '在专业工厂制作原型并验证质量。' },
      { title: '量产&交付', desc: '在验证工厂大量生产后经100%全检后交付。' },
    ],
  },
};

interface IPWorld {
  id: string;
  name: string;
  name_zh: string;
  subtitle: string;
  tier: 'A' | 'B' | 'C';
  concept: string;
  concept_zh: string;
  characters: string;
  characters_zh: string;
  products: string;
  products_zh: string;
  completeness: string;
  color: string;
  bgColor: string;
  image?: string;
}

const IP_PORTFOLIO: IPWorld[] = [
  // === 핵심 A등급 (9개) ===
  {
    id: 'ppuji',
    name: '뿌지프랜즈',
    name_zh: '噗吉朋友们',
    subtitle: 'PPUJI FRIENDS',
    tier: 'A',
    concept: '뿌지빌리지에 사는 8명의 친구들. 각자 다른 직업과 성격을 가진 마을 공동체 캐릭터입니다.',
    concept_zh: '住在噗吉村庄的8位朋友。拥有不同职业和性格的村庄共同体角色。',
    characters: '당뿌, 모찌, 파시, 뚱치, 도니, 핫투, 츄라, 블랙 (8종)',
    characters_zh: '当噗、麻糬、帕西、胖奇、多尼、哈图、秋拉、布莱克 (8种)',
    products: '봉제인형, 피규어, 문구, 랜덤박스',
    products_zh: '毛绒玩偶、手办、文具、随机盒',
    completeness: '83%',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    image: '/images/ip-characters/ppuji/dangppu.webp',
  },
  {
    id: 'dinomon',
    name: '디노몬',
    name_zh: '恐龙萌',
    subtitle: 'DINOMON / DINOMO',
    tier: 'A',
    concept: '친근한 공룡을 반복 가능한 봉제 컬렉션으로 확장. 기본 6종 + 확장 24종의 대규모 라인업.',
    concept_zh: '将亲切的恐龙扩展为可重复的毛绒收藏系列。基本6种 + 扩展24种的大规模阵容。',
    characters: '티노, 트리니, 벨로, 스테고, 브라키, 앙키 외 24종 (총 30종)',
    characters_zh: '提诺、特里尼、维洛、斯特戈、布拉奇、安奇等24种 (共30种)',
    products: '봉제, 키링, 피규어, 랜덤박스',
    products_zh: '毛绒、钥匙扣、手办、随机盒',
    completeness: '100%',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    image: '/images/ip-characters/dinomon/tino.png',
  },
  {
    id: 'duckle',
    name: '길덕이 / Duckle',
    name_zh: '鸭克 / Duckle',
    subtitle: 'DUCKLE WORLD',
    tier: 'A',
    concept: '유성에 소원을 빈 뒤 머리가 빵·과일 등으로 변하는 긴 오리. 50p 1권, 30권 계획의 대형 스토리 IP.',
    concept_zh: '向流星许愿后头部变成面包·水果等的长鸭子。50页1卷、30卷计划的大型故事IP。',
    characters: '길덕이 (변신형 캐릭터)',
    characters_zh: '鸭克 (变身型角色)',
    products: '봉제, 키링, 변신 피규어, 출판',
    products_zh: '毛绒、钥匙扣、变身手办、出版',
    completeness: '100%',
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50',
    image: '/images/ip-characters/duckle/duckle-front.png',
  },
  {
    id: 'hamihot',
    name: '하미핫',
    name_zh: '哈米热',
    subtitle: 'HAMI-HOT',
    tier: 'A',
    concept: '사랑 에너지를 품은 길쭉한 햄스터형 친구. 핑크·브라운 컬러, 머리 복털, 볼주머니, 하트, 꼬리 비밀주머니가 특징.',
    concept_zh: '蕴含爱的能量的细长仓鼠型朋友。粉红·棕色、头部绒毛、颊囊、爱心、尾巴秘密口袋为特征。',
    characters: '하미핫 (단독 캐릭터)',
    characters_zh: '哈米热 (单独角色)',
    products: '롱 바디필로우, 키링, 봉제',
    products_zh: '长抱枕、钥匙扣、毛绒',
    completeness: '100%',
    color: 'from-rose-400 to-pink-500',
    bgColor: 'bg-rose-50',
  },
  {
    id: 'kkokomi',
    name: '꼬꼬미 / 우주 몬스터',
    name_zh: '咕咕米 / 宇宙怪兽',
    subtitle: 'KKOKOMI',
    tier: 'A',
    concept: '충돌 후 보이지 않게 된 외계 생명체가 에너지를 먹고 드러나는 이야기. 에너지 섭취 시 눈 발광이 특징.',
    concept_zh: '碰撞后变得不可见的外星生命体吃掉能量后显现的故事。吃能量时眼睛发光为特征。',
    characters: '꼬꼬미와 우주 친구들',
    characters_zh: '咕咕米和宇宙朋友们',
    products: '봉제, 피규어, 키링',
    products_zh: '毛绒、手办、钥匙扣',
    completeness: '100%',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50',
  },
  {
    id: 'duckle-samguk',
    name: '길덕 삼국지 500',
    name_zh: '鸭克三国志500',
    subtitle: 'DUCKLE SAMGUKJI 500',
    tier: 'A',
    concept: '길덕이 유비의 네 번째 의형제가 되는 500화 동물 삼국지. 120장 골격의 대형 장편 프로젝트.',
    concept_zh: '鸭克成为刘备第四义兄弟的500话动物三国志。120章骨架的大型长篇项目。',
    characters: '길덕과 삼국지 동물 인물군',
    characters_zh: '鸭克和三国志动物人物群',
    products: '출판, 웹툰, 애니, 피규어',
    products_zh: '出版、网漫、动画、手办',
    completeness: '67%',
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-50',
  },
  {
    id: 'future-joseon',
    name: '미래 조선',
    name_zh: '未来朝鲜',
    subtitle: 'FUTURE JOSEON',
    tier: 'A',
    concept: '고도로 발전한 미래에도 조선의 습관과 생활 도구가 살아 있는 세계. 도구·사물·요괴 생명체 18종+.',
    concept_zh: '在高度发展的未来，朝鲜的习惯和生活工具依然存在的世界。工具·事物·妖怪生命体18种+。',
    characters: '18종 도감 생명체',
    characters_zh: '18种图鉴生命体',
    products: '봉제, 피규어, 문구, 전시',
    products_zh: '毛绒、手办、文具、展览',
    completeness: '100%',
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'single-ear',
    name: '한쪽 귀·하트 꼬리',
    name_zh: '单耳·心尾',
    subtitle: 'SINGLE EAR',
    tier: 'A',
    concept: '원하는 소리와 감정 쪽으로 한쪽 귀가 움직이는 친구. 도마뱀/악어형 입체 주둥이, 평평하게 융합된 하트 꼬리 패드.',
    concept_zh: '向想听的声音和感情方向移动单耳的朋友。蜥蜴/鳄鱼型立体嘴巴，平坦融合的心形尾巴垫。',
    characters: '싱글 이어 캐릭터 (12포즈·6종 봉제)',
    characters_zh: '单耳角色 (12姿势·6种毛绒)',
    products: '봉제, 키링, 이모티콘',
    products_zh: '毛绒、钥匙扣、表情包',
    completeness: '83%',
    color: 'from-cyan-500 to-teal-400',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'inyeoseok',
    name: '이녀석 / 낙서 생명체',
    name_zh: '这家伙 / 涂鸦生命体',
    subtitle: 'SCRIBBLE CREATURES',
    tier: 'A',
    concept: '삐뚤빼뚤한 낙서가 조금 입체적인 봉제 친구가 되는 컬렉션. 무외곽선, 기묘 50·귀여움 50.',
    concept_zh: '歪歪扭扭的涂鸦变成稍微立体的毛绒朋友的收藏系列。无轮廓线，奇妙50·可爱50。',
    characters: '18종 낙서 생명체',
    characters_zh: '18种涂鸦生命体',
    products: '가방고리, 봉제, 랜덤박스',
    products_zh: '包挂、毛绒、随机盒',
    completeness: '83%',
    color: 'from-gray-600 to-gray-800',
    bgColor: 'bg-gray-50',
  },
  // === 성장 B등급 (주요 19개) ===
  {
    id: 'piggly',
    name: '피글리',
    name_zh: '皮咕粒',
    subtitle: 'PIGGLY',
    tier: 'B',
    concept: '아무것도 하지 않아도 괜찮은 세계. 무모발·감자형·목 없음·저채도 핑크의 미니멀 캐릭터.',
    concept_zh: '什么都不做也没关系的世界。无毛发·土豆型·无脖子·低饱和粉色的极简角色。',
    characters: '피글리, 피그보',
    characters_zh: '皮咕粒、皮咕宝',
    products: '봉제, 문구, 생활소품',
    products_zh: '毛绒、文具、生活小物',
    completeness: '67%',
    color: 'from-pink-300 to-pink-400',
    bgColor: 'bg-pink-50',
  },
  {
    id: 'mwojimmon',
    name: '뭐지몬 / 선머몬',
    name_zh: '什么怪 / 仙魔怪',
    subtitle: 'MWOJIMMON',
    tier: 'B',
    concept: '감정에서 태어난 정체불명의 생명체. 기본→끌림→폭발 3단 변형 시스템.',
    concept_zh: '从感情中诞生的不明生命体。基本→吸引→爆发3段变形系统。',
    characters: '잼몬, 씽크몬 등 감정 생명체',
    characters_zh: '果酱怪、思考怪等感情生命体',
    products: '봉제, 피규어, 문구',
    products_zh: '毛绒、手办、文具',
    completeness: '67%',
    color: 'from-fuchsia-400 to-purple-400',
    bgColor: 'bg-fuchsia-50',
  },
  {
    id: 'sweet-ant',
    name: 'Sweet Ant Kingdom',
    name_zh: '甜蜜蚂蚁王国',
    subtitle: 'SWEET ANT KINGDOM',
    tier: 'B',
    concept: '달콤한 변화로 색과 성격을 얻는 작은 개미 왕국. 기본 개미 + 8가지 맛 개미.',
    concept_zh: '通过甜蜜变化获得颜色和性格的小蚂蚁王国。基本蚂蚁 + 8种口味蚂蚁。',
    characters: '9종 개미 라인업',
    characters_zh: '9种蚂蚁阵容',
    products: '피규어, 미니어처, 랜덤박스',
    products_zh: '手办、微缩模型、随机盒',
    completeness: '83%',
    color: 'from-amber-400 to-orange-400',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'lumi-field',
    name: 'LUMI FIELD / Poniduck',
    name_zh: 'LUMI FIELD / 波尼鸭',
    subtitle: 'LUMI FIELD',
    tier: 'B',
    concept: '청춘의 마음을 작은 빛과 음악으로 기록하는 오리. Lumi Seed·Letter·Night의 잔잔한 야간 감성.',
    concept_zh: '用小光和音乐记录青春心情的鸭子。Lumi Seed·Letter·Night的宁静夜间感性。',
    characters: '포니덕',
    characters_zh: '波尼鸭',
    products: '앨범 굿즈, 봉제, 조명',
    products_zh: '专辑周边、毛绒、灯具',
    completeness: '67%',
    color: 'from-blue-300 to-indigo-400',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'bread-village',
    name: '빵 마을',
    name_zh: '面包村',
    subtitle: 'BAKERY BABY ANIMAL',
    tier: 'B',
    concept: '빵으로 놀고 싸우며 세상을 구하는 아기 동물 마을. 굽기 정도가 감정에 영향.',
    concept_zh: '用面包玩耍、战斗并拯救世界的婴儿动物村庄。烘烤程度影响情感。',
    characters: '소금빵이, 팥콩, 식빵냥이, 토스트바둑이, 탄토끼, 녹차도넛, 피자, 버터빵 (8종)',
    characters_zh: '盐面包、红豆、吐司猫、烤面包狗、焦兔、绿茶甜甜圈、披萨、黄油面包 (8种)',
    products: '봉제, 키링, 베이커리 콜라보',
    products_zh: '毛绒、钥匙扣、面包店联名',
    completeness: '83%',
    color: 'from-yellow-400 to-amber-400',
    bgColor: 'bg-yellow-50',
  },
  {
    id: 'dot',
    name: 'DOT',
    name_zh: 'DOT',
    subtitle: 'DOT FAMILY',
    tier: 'B',
    concept: '검은 점이 많은 소심하고 호기심 많은 먹보 돼지. 엄마 개, 아빠 돼지, 딸 펭귄의 가족 세트.',
    concept_zh: '有很多黑点的胆小好奇贪吃猪。妈妈狗、爸爸猪、女儿企鹅的家庭套装。',
    characters: 'DOT, 엄마, 아빠, 딸 (4종)',
    characters_zh: 'DOT、妈妈、爸爸、女儿 (4种)',
    products: '봉제, 키링, 가족 세트',
    products_zh: '毛绒、钥匙扣、家庭套装',
    completeness: '83%',
    color: 'from-gray-500 to-gray-700',
    bgColor: 'bg-gray-50',
  },
  {
    id: 'poki',
    name: 'POKI',
    name_zh: 'POKI',
    subtitle: 'POKI',
    tier: 'B',
    concept: '주방 뒤에서 음식을 몰래 맛보는 아기 돼지 요정. 작은 돼지코, 짙은 갈색 주근깨 3~4개.',
    concept_zh: '在厨房后面偷偷品尝食物的小猪精灵。小猪鼻、深棕色雀斑3~4个。',
    characters: '포키, 삼촌(35세), 조카(6세)',
    characters_zh: 'POKI、叔叔(35岁)、侄子(6岁)',
    products: '봉제, 주방 굿즈',
    products_zh: '毛绒、厨房周边',
    completeness: '67%',
    color: 'from-orange-300 to-rose-300',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'mood-district',
    name: 'MOOD DISTRICT',
    name_zh: 'MOOD DISTRICT',
    subtitle: 'DELISENS BAG',
    tier: 'B',
    concept: '프리미엄 보냉백 안에 사는 큰입 동물 주민들. 두꺼운 부직포·고밀도 단열.',
    concept_zh: '住在高级保温袋里的大嘴动物居民们。厚无纺布·高密度隔热。',
    characters: 'WARMY(곰), CHILLO(물개), SWEEMI(토끼)',
    characters_zh: 'WARMY(熊)、CHILLO(海豹)、SWEEMI(兔)',
    products: '재사용 보냉백, 생활가방',
    products_zh: '可重复使用保温袋、生活包',
    completeness: '83%',
    color: 'from-sky-400 to-blue-400',
    bgColor: 'bg-sky-50',
  },
  {
    id: 'healing-pets',
    name: '힐링 펫츠',
    name_zh: '治愈宠物',
    subtitle: 'HEALING PETS',
    tier: 'B',
    concept: '반려동물이 사람의 감정을 안아주는 키덜트 힐링 세계. 성인 감정에 맞춘 차분한 동물 캐릭터.',
    concept_zh: '宠物拥抱人类情感的成人治愈世界。针对成人情感的沉稳动物角色。',
    characters: '솔, 네로, 비비, 모아 (4종)',
    characters_zh: '索尔、尼罗、比比、莫阿 (4种)',
    products: '봉제, 향, 수면 굿즈',
    products_zh: '毛绒、香薰、睡眠周边',
    completeness: '50%',
    color: 'from-teal-300 to-green-300',
    bgColor: 'bg-teal-50',
  },
  {
    id: 'simkung',
    name: '심쿵빵곰',
    name_zh: '心动面包熊',
    subtitle: 'HEART BREAD BEAR',
    tier: 'B',
    concept: '사랑을 빵처럼 구워 하트로 건네는 곰. 둥근 곰·하트 액션·따뜻한 베이커리 톤.',
    concept_zh: '像烤面包一样烤出爱心递给别人的熊。圆熊·心形动作·温暖面包店色调。',
    characters: '심쿵빵곰 (단독)',
    characters_zh: '心动面包熊 (单独)',
    products: '봉제, 빵집 콜라보, 문구',
    products_zh: '毛绒、面包店联名、文具',
    completeness: '50%',
    color: 'from-rose-300 to-amber-300',
    bgColor: 'bg-rose-50',
  },
  {
    id: 'alien-collection',
    name: '외계 생명체 컬렉션',
    name_zh: '外星生命体收藏',
    subtitle: 'ALIEN CREATURES',
    tier: 'B',
    concept: '낙서가 색과 표정, 봉제로 발전하는 집단형 우주 생명체 6~12종.',
    concept_zh: '涂鸦发展为颜色、表情、毛绒的集体型宇宙生命体6~12种。',
    characters: '미지 외계 생명체 6~12종',
    characters_zh: '未知外星生命体6~12种',
    products: '봉제, 피규어, 가족 세트',
    products_zh: '毛绒、手办、家庭套装',
    completeness: '83%',
    color: 'from-purple-400 to-indigo-400',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'turbo-tursooni',
    name: '털보 & 털순이',
    name_zh: '毛宝 & 毛顺',
    subtitle: 'TURBO & TURSOONI',
    tier: 'B',
    concept: '빵집의 하루를 함께 굴리는 털복숭이 듀오. 공통 몸체+표정+소품 1개+헤드웨어.',
    concept_zh: '一起度过面包店一天的毛茸茸二人组。共同体型+表情+1个道具+头饰。',
    characters: '털보, 털순이',
    characters_zh: '毛宝、毛顺',
    products: '키링, 봉제, 베이커리 굿즈',
    products_zh: '钥匙扣、毛绒、面包店周边',
    completeness: '83%',
    color: 'from-amber-300 to-yellow-300',
    bgColor: 'bg-amber-50',
  },
  // === 실험 C등급 (주요 5개) ===
  {
    id: 'local-market',
    name: '로컬 마켓 에디션',
    name_zh: '本地市场版',
    subtitle: 'LOCAL MARKET EDITION',
    tier: 'C',
    concept: '시장에서 바로 쓰는 유쾌한 먹거리 메시지 컬렉션. 과일부심·오늘도 달다·빵은 기본.',
    concept_zh: '市场上直接使用的愉快食物信息收藏。水果自豪·今天也甜·面包是基本。',
    characters: '과일·빵·간식 그래픽군',
    characters_zh: '水果·面包·零食图形群',
    products: '가방, 포장, 앞치마, 문구',
    products_zh: '包、包装、围裙、文具',
    completeness: '50%',
    color: 'from-green-400 to-lime-400',
    bgColor: 'bg-green-50',
  },
  {
    id: 'monster-keyring',
    name: '괴물 얼굴 동물 키링',
    name_zh: '怪物脸动物钥匙扣',
    subtitle: 'MONSTER FACE KEYRING',
    tier: 'C',
    concept: '성형 괴물 얼굴과 부드러운 봉제 몸체의 대비. 개·오리·판다·레서판다·곰·수달 6종.',
    concept_zh: '整形怪物脸和柔软毛绒身体的对比。狗·鸭·熊猫·小熊猫·熊·水獭6种。',
    characters: '개, 오리, 판다, 레서판다, 곰, 수달 (6종)',
    characters_zh: '狗、鸭、熊猫、小熊猫、熊、水獭 (6种)',
    products: '키링, 랜덤박스',
    products_zh: '钥匙扣、随机盒',
    completeness: '33%',
    color: 'from-slate-400 to-gray-500',
    bgColor: 'bg-slate-50',
  },
  {
    id: 'candy-dino',
    name: '캔디 공룡 6종',
    name_zh: '糖果恐龙6种',
    subtitle: 'CANDY DINO',
    tier: 'C',
    concept: '달콤한 수집형 공룡 컬렉션. 캔디롱·리본롱·허그T·블루혼·플라워스테고·밀크롱.',
    concept_zh: '甜蜜收集型恐龙收藏。糖果龙·丝带龙·拥抱T·蓝角·花剑龙·牛奶龙。',
    characters: '캔디롱, 리본롱, 허그T, 블루혼, 플라워스테고, 밀크롱 (6종)',
    characters_zh: '糖果龙、丝带龙、拥抱T、蓝角、花剑龙、牛奶龙 (6种)',
    products: '피규어, 봉제',
    products_zh: '手办、毛绒',
    completeness: '33%',
    color: 'from-pink-300 to-violet-300',
    bgColor: 'bg-pink-50',
  },
];

export default function IpStoryPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [selectedTier, setSelectedTier] = useState<Tier>('all');
  const [selectedIP, setSelectedIP] = useState<string>('ppuji');
  const t = texts[lang];

  const filteredIPs = selectedTier === 'all' ? IP_PORTFOLIO : IP_PORTFOLIO.filter(ip => ip.tier === selectedTier);
  const currentIP = IP_PORTFOLIO.find(ip => ip.id === selectedIP) || IP_PORTFOLIO[0];

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader lang={lang} theme="dark" />
      {/* Language Toggle */}
      <div className="fixed top-4 right-20 z-40 flex gap-2">
        <button onClick={() => setLang('ko')} className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${lang === 'ko' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>한국어</button>
        <button onClick={() => setLang('zh')} className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${lang === 'zh' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>中文</button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-pink-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-emerald-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-36 h-36 bg-amber-500 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-20 w-28 h-28 bg-violet-500 rounded-full blur-3xl"></div>
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
                {IP_PORTFOLIO.filter(ip => ip.image).slice(0, 6).map((ip, i) => (
                  <div key={`hero-${i}`} className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm p-2">
                    <Image src={ip.image!} alt={ip.name} fill className="object-contain p-2" sizes="150px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IP Portfolio Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t.section_worlds}</h2>
          <p className="text-lg text-gray-600">{t.section_worlds_desc}</p>
        </div>

        {/* Tier Filter */}
        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          {(['all', 'A', 'B', 'C'] as Tier[]).map((tier) => {
            const label = tier === 'all' ? t.filter_all : tier === 'A' ? t.filter_a : tier === 'B' ? t.filter_b : t.filter_c;
            const count = tier === 'all' ? IP_PORTFOLIO.length : IP_PORTFOLIO.filter(ip => ip.tier === tier).length;
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all text-sm ${
                  selectedTier === tier
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* IP Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filteredIPs.map((ip) => (
            <button
              key={ip.id}
              onClick={() => setSelectedIP(ip.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md ${
                selectedIP === ip.id
                  ? `${ip.bgColor} border-gray-300 shadow-md`
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {ip.image && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    <Image src={ip.image} alt={ip.name} fill className="object-contain p-1" sizes="48px" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">{lang === 'ko' ? ip.name : ip.name_zh}</div>
                  <div className="text-xs text-gray-500">{ip.subtitle}</div>
                </div>
                <span className={`ml-auto shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                  ip.tier === 'A' ? 'bg-red-100 text-red-700' :
                  ip.tier === 'B' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{ip.tier}</span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{lang === 'ko' ? ip.concept : ip.concept_zh}</p>
            </button>
          ))}
        </div>

        {/* Selected IP Detail */}
        <div className={`rounded-3xl p-8 lg:p-12 ${currentIP.bgColor}`}>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentIP.tier === 'A' ? 'bg-red-100 text-red-700' :
                  currentIP.tier === 'B' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{currentIP.tier}{lang === 'ko' ? '등급' : '级'}</span>
                <span className="text-sm text-gray-500">{currentIP.subtitle}</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">{lang === 'ko' ? currentIP.name : currentIP.name_zh}</h3>
              <p className="text-gray-700 leading-relaxed mb-6">{lang === 'ko' ? currentIP.concept : currentIP.concept_zh}</p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-500 w-20 shrink-0">{lang === 'ko' ? '캐릭터' : '角色'}</span>
                  <span className="text-sm text-gray-800">{lang === 'ko' ? currentIP.characters : currentIP.characters_zh}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-500 w-20 shrink-0">{lang === 'ko' ? '상품 확장' : '商品扩展'}</span>
                  <span className="text-sm text-gray-800">{lang === 'ko' ? currentIP.products : currentIP.products_zh}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-500 w-20 shrink-0">{lang === 'ko' ? '완성도' : '完成度'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-white rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${currentIP.color} rounded-full`} style={{ width: currentIP.completeness }}></div>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{currentIP.completeness}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              {currentIP.image ? (
                <div className="relative w-64 h-64 rounded-3xl overflow-hidden bg-white shadow-lg p-4">
                  <Image src={currentIP.image} alt={currentIP.name} fill className="object-contain p-4" sizes="256px" />
                </div>
              ) : (
                <div className={`w-64 h-64 rounded-3xl bg-gradient-to-br ${currentIP.color} flex items-center justify-center shadow-lg`}>
                  <span className="text-white text-6xl font-bold opacity-50">{currentIP.name.charAt(0)}</span>
                </div>
              )}
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
            { title: lang === 'ko' ? '캐릭터 디자인' : '角色设计', desc: lang === 'ko' ? '세계관에 맞는 캐릭터를 디자인하고 삼면도, 포즈, 표정을 완성합니다.' : '设计符合世界观的角色，完成三面图、姿势和表情。', items: lang === 'ko' ? ['삼면도 제작', '포즈 디자인', '표정 시트', '컬러 가이드'] : ['三面图制作', '姿势设计', '表情表', '色彩指南'] },
            { title: lang === 'ko' ? '상품 기획' : '商品策划', desc: lang === 'ko' ? '캐릭터 특성에 맞는 상품을 기획하고 패키지 디자인까지 완성합니다.' : '策划符合角色特性的商品，完成包装设计。', items: lang === 'ko' ? ['봉제인형', '키링·가방고리', '뽑기 굿즈', '보냉백·생활용품'] : ['毛绒玩偶', '钥匙扣·包挂', '扭蛋周边', '保温袋·生活用品'] },
            { title: lang === 'ko' ? '생산·납품' : '生产·交付', desc: lang === 'ko' ? '전문 공장에서 생산하고 100% 전수 검수 후 납품합니다.' : '在专业工厂生产，100%全检后交付。', items: lang === 'ko' ? ['전문 공장 매칭', '샘플 검증', '100% 전수 검수', '물류·통관'] : ['专业工厂匹配', '样品验证', '100%全检', '物流·通关'] },
          ].map((card, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${i === 0 ? 'from-pink-500 to-rose-500' : i === 1 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500'} flex items-center justify-center text-white font-bold text-lg mb-4`}>
                {i + 1}
              </div>
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
          <Link href="/quote" className="inline-block px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors">
            {t.cta_button}
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
