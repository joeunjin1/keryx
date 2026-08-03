'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

type Lang = 'ko' | 'zh' | 'en';
type PortfolioItem = {
  id: string;
  category: string;
  catKey: string;
  title: string;
  buyer: string;
  year: string;
  tags: string[];
  desc: string;
  specs: { label: string; value: string }[];
  process: string;
  why: string;
  result: string;
  inspectionType?: string;
  duration?: string;
  clientType?: string;
  tagColor: string;
  lightColor?: string;
  color?: string;
  textColor?: string;
  iconKey?: string;
  borderColor?: string;
};

const T = {
  ko: {
    back: '← 홈으로',
    eyebrow: '제작 포트폴리오 · Portfolio',
    title: '함께 만든 것들',
    sub: '한 번의 매칭이 양측 사업을 십 년 동안 지탱하는 모습을 우리는 여러 번 보았습니다. 모든 사례는 실제 의뢰를 바탕으로 하며, 바이어 및 공장 정보는 동의 하에 익명 처리되었습니다.',
    filter_all: '전체',
    filters: ['전체', '캐릭터 굿즈', '부직포 가방', '인형', '패키지', '기타'],
    cta_title: '다음 포트폴리오의 주인공이 되세요',
    cta_sub: '지금 의뢰하시면 영업일 2일 이내에 회신드립니다.',
    cta_btn: '공장 매칭 의뢰하기',
    process_label: '진행 과정',
    why_label: '이 매칭이 성사된 이유',
    anon: '실제 고객 보호를 위해 바이어명·공장명 익명 처리',
    items: [
      {
        id: 'P-001',
        category: '인형',
        catKey: 'doll',
        title: '한 평짜리 방에서 시작된 위로 인형 브랜드',
        buyer: 'Buyer A · Korean indie founder',
        year: '2024',
        tags: ['무역 초보', '자체 디자인', '글로벌 D2C'],
        desc: '학생 알바로 모은 자본만 들고 부모님 댁 한 평짜리 방에서 시작한 한국 1인 디자이너. 처음에는 이우 도매시장의 기성품으로 시장을 검증했고, 자신의 색이 분명해진 뒤에 자체 디자인 라인으로 옮겨 가야 했습니다. KERYX는 양저우(揚州) 봉제 클러스터 안에서 작은 컬렉션도 정성껏 만들어 줄 공장을 찾았습니다.',
        specs: [
          { label: 'Category', value: '패브릭 인형' },
          { label: 'Material', value: '미니키 원단 + 고밀도 PP cotton' },
          { label: 'Audit', value: 'CPSIA, REACH' },
          { label: 'Outcome', value: '글로벌 D2C 정기 양산' },
        ],
        process: '이우 도매로 시장 검증 → 자체 디자인 전환 시점 함께 결정 → 양저우 봉제 클러스터에서 결이 맞는 소규모 정밀 공장 발굴 → 첫 시리즈 디자인 협력',
        why: '소량 정밀 봉제 노하우, 1인 디자이너의 디테일 요청을 끝까지 받아주는 PM, 해외 D2C 발송 패키징 표준 보유',
        result: '기성품 셀러에서 글로벌 자체 IP 브랜드로 성장',
        inspectionType: '전수 검수',
        duration: '2024 · 3개월',
        clientType: '1인 브랜드',
        color: 'from-emerald-500 to-teal-600',
        lightColor: 'from-emerald-50 to-teal-50',
        borderColor: 'border-emerald-100',
        textColor: 'text-emerald-700',
        tagColor: 'bg-emerald-50 text-emerald-600',
      },
      {
        id: 'P-002',
        category: '캐릭터 굿즈',
        catKey: 'character',
        title: '게임 메가 시즌, 굿즈가 게임만큼 빨리 달려야 했다',
        buyer: 'Buyer B · Korean game studio · global title',
        year: '2024',
        tags: ['글로벌 게임 IP', '멀티 SKU', '시즌 동기화'],
        desc: '한국 게임 스튜디오의 글로벌 메가 모바일 게임 신규 시즌 출시 동반 프로젝트. 인앱 이벤트 시작일에 맞춰 피규어·키링·아크릴 스탠드·소형 봉제까지 카테고리가 다른 SKU들이 같은 날 손에 닿아야 했습니다. KERYX는 카테고리별로 가장 잘 맞는 공장 세 곳을 묶어 한 PM이 한 호흡으로 운영했습니다.',
        specs: [
          { label: 'Category', value: '멀티 SKU 게임 굿즈' },
          { label: 'Material', value: 'PVC · 아크릴 · 메탈 · 봉제 혼합' },
          { label: 'Audit', value: 'CPSIA, EN71, 게임사 IP 감수' },
          { label: 'Outcome', value: '시즌 출시일 다국가 동시 입고' },
        ],
        process: '시즌 캘린더 역산 → 카테고리별 최적 공장 분리 매칭 → KERYX PM 단일 운영 → 합본 입수검사 후 다국가 동시 발송',
        why: '한 공장 의존이 만드는 단일 실패 지점을 분산, 게임사 IP 감수 노하우 보유 PM, 글로벌 다채널 발송 표준화',
        result: '시즌 출시일, 모든 채널이 같은 날 열렸다',
        inspectionType: '기능+포장 검수',
        duration: '2024 · 6주',
        clientType: '게임 스튜디오',
        color: 'from-indigo-500 to-purple-600',
        lightColor: 'from-indigo-50 to-purple-50',
        borderColor: 'border-indigo-100',
        textColor: 'text-indigo-700',
        tagColor: 'bg-indigo-50 text-indigo-600',
      },
      {
        id: 'P-003',
        category: '인형',
        catKey: 'doll',
        title: '미국 대형 리테일러의 자체 브랜드 봉제 라인을 맡다',
        buyer: 'Buyer C · North American mass retailer',
        year: '2023',
        tags: ['미주 PB OEM', '홀리데이 시즌', '정기 갱신'],
        desc: '미주의 대형 리테일 체인이 자사 PB(Private Brand) 봉제 인형 라인을 맡길 곳을 찾고 있었습니다. CPSIA와 캐나다 CCPSA를 같은 시점에 통과해야 했고, 시즌마다 캐릭터가 바뀌는 회전 부담도 컸습니다. 첫 시즌 평가가 본사 기준을 통과한 뒤로, 매년 시즌 캐릭터가 같은 라인에서 새로 태어나는 정기 발주 라인이 됐습니다.',
        specs: [
          { label: 'Category', value: 'PB 봉제 인형 OEM' },
          { label: 'Material', value: '슈퍼 소프트 보아 + 고밀도 PP cotton' },
          { label: 'Audit', value: 'CPSIA, CCPSA, ASTM F963' },
          { label: 'Outcome', value: '매년 시즌 갱신 정기 OEM' },
        ],
        process: '미주·캐나다 인증 동시 통과 가능 공장 압축 → 시즌 회전 라인 안정성 검증 → PB 보안 체계 현장 확인 → 첫 시즌 본사 평가 동행',
        why: '두 인증 동시 보유 라인 운영, 시즌마다 캐릭터가 바뀌는 회전에도 흔들리지 않는 봉제 안정성, 본사 입수검사 이력 누적',
        result: '매년 시즌 캐릭터가 같은 라인에서 새로 태어난다',
        inspectionType: '전수 검수',
        duration: '2023~ 정기',
        clientType: '대형 리테일러',
        color: 'from-rose-500 to-pink-600',
        lightColor: 'from-rose-50 to-pink-50',
        borderColor: 'border-rose-100',
        textColor: 'text-rose-700',
        tagColor: 'bg-rose-50 text-rose-600',
      },
      {
        id: 'P-004',
        category: '캐릭터 굿즈',
        catKey: 'character',
        title: '클레임 한 번이 십 년의 시작이 된 공장',
        buyer: 'Buyer D · Established Korean buyer',
        year: '2023',
        tags: ['공장 윈윈', '장기 동반', '전용 라인'],
        desc: '이 공장과의 첫 거래는 클레임으로 끝났습니다. 다른 곳이라면 책임을 미뤘을 자리에서, 공장은 자비로 전량 재생산을 결정했습니다. KERYX는 그 한 번의 책임감을 무겁게 보았습니다. 시간이 흐르며 이 공장의 신규 라인 한 곳은 자연스럽게 이 바이어 전용으로 운영되고 있습니다.',
        specs: [
          { label: 'Category', value: '복합 캐릭터 굿즈' },
          { label: 'Material', value: 'PVC · ABS · 봉제 혼합' },
          { label: 'Audit', value: '전용 라인 단독 품질 관리' },
          { label: 'Outcome', value: '전용 라인 운영 · 장기 동반' },
        ],
        process: '첫 거래 클레임 발생 → 공장 자비 전량 재생산 → KERYX 점진 의뢰 확장 → 양측 신뢰 누적 → 신규 라인 한 곳을 바이어 전용으로 자연 배치',
        why: '실수했을 때 무엇을 하는지가 곧 그 공장의 본질이라는 KERYX의 신념과 정확히 맞은 사례',
        result: '한 라인이 한 바이어를 위해 돌아간다',
        inspectionType: '전수 검수',
        duration: '2023~ 정기',
        clientType: '중견 브랜드',
        color: 'from-amber-500 to-orange-500',
        lightColor: 'from-amber-50 to-orange-50',
        borderColor: 'border-amber-100',
        textColor: 'text-amber-700',
        tagColor: 'bg-amber-50 text-amber-600',
      },
      {
        id: 'P-005',
        category: '부직포 가방',
        catKey: 'bag',
        title: '월드 투어와 함께 도시를 옮겨 다닌 토트백',
        buyer: 'Buyer E · K-pop entertainment label',
        year: '2024',
        tags: ['K-pop 월드 투어', '도시 한정', '다국가 동시 발송'],
        desc: '글로벌 K-pop 그룹의 월드 투어 공식 굿즈 토트백. 도시별 한정 디자인, 멤버 시그니처 라인, 친환경 부직포 본체 — 그리고 가장 어려운 부분은 투어 일정에 맞춰 도시마다 입고 시점이 달라야 한다는 것이었습니다. 투어가 진행되는 동안 어느 도시에서도 토트백이 비어 있는 매장은 없었습니다.',
        specs: [
          { label: 'Category', value: '콘서트 굿즈 토트백' },
          { label: 'Material', value: '친환경 고밀도 부직포' },
          { label: 'Audit', value: 'REACH, OEKO-TEX' },
          { label: 'Outcome', value: '월드 투어 전 도시 동행 공급' },
        ],
        process: '투어 도시 캘린더 정리 → 도시 단위 입고 일정 역산 → 라인 회전 캘린더 공장과 합의 → 도시별 발송 라벨링·통관 동선 동시 설계',
        why: '도시 단위 변동 사양에 흔들리지 않는 인쇄 안정성, 다국가 통관 라벨링 표준화, 한정판 보안 작업 동선',
        result: '투어가 멈춘 도시 없이, 매장도 멈추지 않았다',
        inspectionType: '샘플링+포장 검수',
        duration: '2024 · 4개월',
        clientType: '음악 레이블',
        color: 'from-violet-500 to-indigo-600',
        lightColor: 'from-violet-50 to-indigo-50',
        borderColor: 'border-violet-100',
        textColor: 'text-violet-700',
        tagColor: 'bg-violet-50 text-violet-600',
      },
      {
        id: 'P-006',
        category: '인형',
        catKey: 'doll',
        title: '럭셔리 콜라보, 인형 한 점이 하나의 작품이었다',
        buyer: 'Buyer F · Luxury fashion house × Korean artist',
        year: '2024',
        tags: ['럭셔리 콜라보', '한정판', '컬렉터블'],
        desc: '글로벌 럭셔리 패션 하우스와 한국 일러스트 디자이너의 한정판 콜라보 봉제 인형. 럭셔리의 결은 양보가 없습니다 — 원단의 결, 자수의 정밀도, 자석 클로저가 닫히는 소리까지 사양에 들어가 있었습니다. 백화점 한정으로 출시됐고, 컬렉터블 시장에서 즉시 매진됐습니다.',
        specs: [
          { label: 'Category', value: '럭셔리 한정판 봉제' },
          { label: 'Material', value: '실크 블렌드 + 정밀 자수 + 자석 패키지' },
          { label: 'Audit', value: '럭셔리 하우스 자체 마감 기준 감수' },
          { label: 'Outcome', value: '백화점 한정 즉시 매진' },
        ],
        process: '럭셔리 사양서 분해 → 카테고리별 정밀 공장 분리 매칭 → 럭셔리 감수 익숙한 PM 단일 운영 → 백화점 입고 동선까지 동행',
        why: '럭셔리 마감 기준에 길든 봉제·자수·패키지 트리오, 한 PM이 세 공장을 한 호흡으로 묶는 운영력',
        result: '백화점 한정 출시 즉시 컬렉터블 매진',
        inspectionType: '전수 검수',
        duration: '2024 · 8주',
        clientType: '럭셔리 브랜드',
        color: 'from-cyan-500 to-blue-600',
        lightColor: 'from-cyan-50 to-blue-50',
        borderColor: 'border-cyan-100',
        textColor: 'text-cyan-700',
        tagColor: 'bg-cyan-50 text-cyan-600',
      },
      {
        id: 'P-007',
        category: '패키지',
        catKey: 'package',
        title: '펀딩 대박 후, 약속 일정 안에 모두 도착했다',
        buyer: 'Buyer G · Korean crowdfunding creator',
        year: '2024',
        tags: ['크라우드펀딩', '친환경', '메가 히트'],
        desc: '한국 크라우드펀딩 목표를 크게 초과 달성한 프로젝트. 백커들에게 약속한 납기는 다가오는데, 양산 패키지로의 전환은 아직이었습니다. KERYX는 디자인의 핵심을 잃지 않으면서도 양산이 가능하도록 다이컷을 단순화하고, 친환경 인증 종이로 라인업을 바꿨습니다.',
        specs: [
          { label: 'Category', value: '친환경 양산 패키지' },
          { label: 'Material', value: 'FSC 인증 크라프트 + 콩기름 인쇄' },
          { label: 'Audit', value: 'FSC, 환경 인증' },
          { label: 'Outcome', value: '백커 약속 일정 내 글로벌 발송' },
        ],
        process: '백커 일정 역산 → 디자인 핵심 보존 가능한 다이컷 단순화 협의 → 친환경 인증 종이 전환 → 글로벌 발송 동선 동시 설계',
        why: '크라우드펀딩-양산 전환 경험, 친환경 인증 종이 단가 협상력, 다국가 발송 라벨링 경험',
        result: '약속한 날, 약속한 모습으로 백커에게',
        inspectionType: '전수 검수',
        duration: '2024 · 10주',
        clientType: '크라우드펀딩',
        color: 'from-emerald-500 to-green-600',
        lightColor: 'from-emerald-50 to-green-50',
        borderColor: 'border-emerald-100',
        textColor: 'text-emerald-700',
        tagColor: 'bg-emerald-50 text-emerald-600',
      },
      {
        id: 'P-008',
        category: '캐릭터 굿즈',
        catKey: 'character',
        title: '음반과 함께 세계로 보낸 굿즈',
        buyer: 'Buyer H · Major Korean entertainment agency',
        year: '2024',
        tags: ['K-pop 글로벌', '멀티 채널', '팬덤 동시 주문'],
        desc: '한국 대형 엔터테인먼트사의 글로벌 굿즈 라인. 음반 동봉 굿즈, 글로벌 직영몰, 팝업 스토어, 콘서트장 한정 — 같은 캐릭터가 채널마다 다른 사양으로 동시에 흘러야 했습니다. KERYX는 채널별로 공장을 분리해 위험을 분산했고, 본사 직영몰과 해외 팝업이 같은 시점에 같은 모양으로 열렸습니다.',
        specs: [
          { label: 'Category', value: '멀티 채널 K-pop 굿즈' },
          { label: 'Material', value: 'PVC · 아크릴 · 메탈 · 봉제 혼합' },
          { label: 'Audit', value: '엔터테인먼트사 자체 감수' },
          { label: 'Outcome', value: '발매일 글로벌 멀티 채널 동시 오픈' },
        ],
        process: '채널별 SKU 정리 → 채널 단위 공장 분리 매칭 → 동시 주문 폭증 대응 라인 사전 확보 → 다국가 직영·팝업 동시 입고',
        why: '단일 공장 실패 지점 분산 설계, 엔터사 보안·감수 절차 익숙, 다채널 동시 입고 운영 경험',
        result: '발매 당일, 모든 채널이 같은 시간에 열렸다',
        inspectionType: '기능+포장 검수',
        duration: '2024 · 5주',
        clientType: '음악 레이블',
        color: 'from-rose-500 to-red-600',
        lightColor: 'from-rose-50 to-red-50',
        borderColor: 'border-rose-100',
        textColor: 'text-rose-700',
        tagColor: 'bg-rose-50 text-rose-600',
      },
      {
        id: 'P-009',
        category: '기타',
        catKey: 'other',
        title: '진짜 MOQ는 인쇄박스에 있었다',
        buyer: 'Buyer I · Korean lifestyle startup',
        year: '2024',
        tags: ['무역 초보', '패키지 인사이트', '백화점 입점'],
        desc: '처음 중국 수입을 시도하던 신생 라이프스타일 브랜드. 모든 공장이 같은 벽을 들이밀었습니다 — "최소 수량을 채우셔야 합니다." KERYX가 분해해 보니, 그 벽은 제품이 아니라 인쇄박스에 있었습니다. 시장 검증을 거친 뒤, 이 브랜드는 백화점·대형마트에 동시 입점했습니다.',
        specs: [
          { label: 'Category', value: '라이프스타일 일용품' },
          { label: 'Material', value: '스테인리스 + 실리콘 그립' },
          { label: 'Audit', value: 'KC, LFGB' },
          { label: 'Outcome', value: '백화점·대형마트 동시 입점' },
        ],
        process: 'MOQ 벽의 진짜 원인 분해 → 패키지 단계화 설계 → 1차 시범으로 시장 검증 → 양산 전환 시 인쇄박스 정식 적용 → 유통 채널 동시 입점 동행',
        why: '제품과 패키지 MOQ를 구조적으로 분리해 본 사고, 검증 비용 보존이 가능한 첫 거래 설계',
        result: '첫 수입 후 한 시즌 만에 대형 유통 입점',
        inspectionType: '샘플링 검수',
        duration: '2023 · 6주',
        clientType: '스타트업',
        color: 'from-slate-600 to-gray-700',
        lightColor: 'from-slate-50 to-gray-50',
        borderColor: 'border-slate-100',
        textColor: 'text-slate-700',
        tagColor: 'bg-slate-50 text-slate-600',
      },
    ],
  },
  zh: {
    back: '← 返回首页',
    eyebrow: '制作案例集 · Portfolio',
    title: '共同创造的作品',
    sub: '我们多次见证了一次匹配支撑双方业务十年的案例。所有案例均基于真实委托，买家及工厂信息经同意后匿名处理。',
    filter_all: '全部',
    filters: ['全部', '角色周边', '无纺布包', '玩偶', '包装', '其他'],
    cta_title: '成为下一个案例的主角',
    cta_sub: '现在申请，我们将在2个工作日内回复。',
    cta_btn: '申请工厂匹配',
    process_label: '进行过程',
    why_label: '促成此次匹配的原因',
    anon: '为保护真实客户，买家名称及工厂名称已匿名处理',
    items: [
      {
        id: 'P-001',
        category: '玩偶',
        catKey: 'doll',
        title: '从一间小屋出发的治愈玩偶品牌',
        buyer: 'Buyer A · 韩国独立设计师',
        year: '2024',
        tags: ['贸易新手', '自主设计', '全球D2C'],
        desc: '一位韩国独立设计师，用打工攒下的资金，从父母家一间小屋起步。最初通过义乌批发市场的现成品验证市场，确立自己的风格后转向自主设计线。KERYX在扬州缝纫产业集群中找到了愿意精心制作小批量系列的工厂。',
        specs: [
          { label: 'Category', value: '布艺玩偶' },
          { label: 'Material', value: 'Minky面料 + 高密度PP棉' },
          { label: 'Audit', value: 'CPSIA, REACH' },
          { label: 'Outcome', value: '全球D2C定期量产' },
        ],
        process: '义乌批发验证市场 → 共同决定转向自主设计的时机 → 在扬州缝纫集群发掘精品小厂 → 协作完成首个系列设计',
        why: '小批量精密缝纫经验、能全程响应独立设计师细节要求的PM、具备海外D2C发货包装标准',
        result: '从现货卖家成长为全球自有IP品牌',
        color: 'from-emerald-500 to-teal-600',
        lightColor: 'from-emerald-50 to-teal-50',
        borderColor: 'border-emerald-100',
        textColor: 'text-emerald-700',
        tagColor: 'bg-emerald-50 text-emerald-600',
      },
      {
        id: 'P-002',
        category: '角色周边',
        catKey: 'character',
        title: '游戏大赛季，周边要跑得和游戏一样快',
        buyer: 'Buyer B · 韩国游戏工作室 · 全球游戏',
        year: '2024',
        tags: ['全球游戏IP', '多SKU', '赛季同步'],
        desc: '韩国游戏工作室全球爆款手游新赛季上线联动项目。手办、钥匙扣、亚克力立牌、小型毛绒等不同品类的SKU，需要在同一天送到玩家手中。KERYX将各品类最匹配的三家工厂组合，由一位PM统一调度运营。',
        specs: [
          { label: 'Category', value: '多SKU游戏周边' },
          { label: 'Material', value: 'PVC · 亚克力 · 金属 · 毛绒混合' },
          { label: 'Audit', value: 'CPSIA, EN71, 游戏公司IP审核' },
          { label: 'Outcome', value: '赛季上线日多国同步入库' },
        ],
        process: '赛季日历倒推 → 按品类分拆最优工厂 → KERYX PM统一运营 → 合并入库检验后多国同步发货',
        why: '分散单一工厂依赖带来的失败风险、具备游戏公司IP审核经验的PM、全球多渠道发货标准化',
        result: '赛季上线日，所有渠道同一天开放',
        color: 'from-indigo-500 to-purple-600',
        lightColor: 'from-indigo-50 to-purple-50',
        borderColor: 'border-indigo-100',
        textColor: 'text-indigo-700',
        tagColor: 'bg-indigo-50 text-indigo-600',
      },
      {
        id: 'P-003',
        category: '玩偶',
        catKey: 'doll',
        title: '承接美国大型零售商自有品牌毛绒产品线',
        buyer: 'Buyer C · 北美大型零售商',
        year: '2023',
        tags: ['北美PB OEM', '节日季', '定期续签'],
        desc: '北美大型连锁零售商寻找承接自有品牌(PB)毛绒玩偶产品线的合作方。需同时通过CPSIA和加拿大CCPSA认证，且每季更换角色的压力也很大。首季评估通过总部标准后，成为每年定期续签的稳定订单线。',
        specs: [
          { label: 'Category', value: 'PB毛绒玩偶OEM' },
          { label: 'Material', value: '超柔软长毛绒 + 高密度PP棉' },
          { label: 'Audit', value: 'CPSIA, CCPSA, ASTM F963' },
          { label: 'Outcome', value: '每年季节更新定期OEM' },
        ],
        process: '筛选可同时通过美加认证的工厂 → 验证季节轮换产线稳定性 → 现场确认PB保密体系 → 陪同首季总部评估',
        why: '同时持有两项认证的产线运营、季季换角色也不动摇的缝纫稳定性、总部入库检验记录积累',
        result: '每年，新角色在同一条产线上诞生',
        color: 'from-rose-500 to-pink-600',
        lightColor: 'from-rose-50 to-pink-50',
        borderColor: 'border-rose-100',
        textColor: 'text-rose-700',
        tagColor: 'bg-rose-50 text-rose-600',
      },
      {
        id: 'P-004',
        category: '角色周边',
        catKey: 'character',
        title: '一次索赔，成为十年合作的起点',
        buyer: 'Buyer D · 韩国资深买家',
        year: '2023',
        tags: ['工厂共赢', '长期合作', '专属产线'],
        desc: '与这家工厂的第一笔交易以索赔告终。在其他工厂可能推卸责任的情况下，这家工厂决定自费全量返工。KERYX对这份担当给予了高度重视。随着时间推移，工厂新开的一条产线自然而然地成为这位买家的专属线。',
        specs: [
          { label: 'Category', value: '复合角色周边' },
          { label: 'Material', value: 'PVC · ABS · 毛绒混合' },
          { label: 'Audit', value: '专属产线独立品质管理' },
          { label: 'Outcome', value: '专属产线运营 · 长期合作' },
        ],
        process: '首次交易发生索赔 → 工厂自费全量返工 → KERYX逐步扩大委托 → 双方信任积累 → 新产线自然配置为买家专属',
        why: '出错时如何应对，才是工厂本质的体现——与KERYX的核心理念完全契合的案例',
        result: '一条产线，只为一位买家运转',
        color: 'from-amber-500 to-orange-500',
        lightColor: 'from-amber-50 to-orange-50',
        borderColor: 'border-amber-100',
        textColor: 'text-amber-700',
        tagColor: 'bg-amber-50 text-amber-600',
      },
      {
        id: 'P-005',
        category: '无纺布包',
        catKey: 'bag',
        title: '随世界巡演辗转各城市的托特包',
        buyer: 'Buyer E · K-pop娱乐厂牌',
        year: '2024',
        tags: ['K-pop世界巡演', '城市限定', '多国同步发货'],
        desc: '全球K-pop团体世界巡演官方周边托特包。城市限定设计、成员签名款、环保无纺布本体——最难的部分是每座城市的入库时间必须与巡演日程精准对齐。巡演期间，没有任何一座城市的门店出现断货。',
        specs: [
          { label: 'Category', value: '演唱会周边托特包' },
          { label: 'Material', value: '环保高密度无纺布' },
          { label: 'Audit', value: 'REACH, OEKO-TEX' },
          { label: 'Outcome', value: '世界巡演全城市同步供货' },
        ],
        process: '整理巡演城市日历 → 按城市倒推入库时间 → 与工厂协商产线轮换日历 → 同步设计各城市发货标签及通关流程',
        why: '印刷稳定性不受城市规格变化影响、多国通关标签标准化、限定版保密作业流程',
        result: '巡演未停，门店也未断货',
        color: 'from-violet-500 to-indigo-600',
        lightColor: 'from-violet-50 to-indigo-50',
        borderColor: 'border-violet-100',
        textColor: 'text-violet-700',
        tagColor: 'bg-violet-50 text-violet-600',
      },
      {
        id: 'P-006',
        category: '玩偶',
        catKey: 'doll',
        title: '奢侈品联名，每一只玩偶都是一件艺术品',
        buyer: 'Buyer F · 奢侈品时装屋 × 韩国艺术家',
        year: '2024',
        tags: ['奢侈品联名', '限量版', '收藏品'],
        desc: '全球奢侈品时装屋与韩国插画设计师的限量联名毛绒玩偶。奢侈品的品质标准毫不妥协——面料纹理、刺绣精度、磁扣闭合的声音，全部写入规格书。在百货公司限定发售，上市即售罄。',
        specs: [
          { label: 'Category', value: '奢侈品限量毛绒' },
          { label: 'Material', value: '真丝混纺 + 精密刺绣 + 磁扣包装' },
          { label: 'Audit', value: '奢侈品牌自有品质标准审核' },
          { label: 'Outcome', value: '百货限定即刻售罄' },
        ],
        process: '拆解奢侈品规格书 → 按品类分拆精品工厂 → 由熟悉奢侈品审核的PM统一运营 → 全程陪同百货入库流程',
        why: '擅长奢侈品收尾标准的缝纫·刺绣·包装三厂组合、一位PM将三家工厂融为一体的运营能力',
        result: '百货限定发售，即刻成为收藏品售罄',
        color: 'from-cyan-500 to-blue-600',
        lightColor: 'from-cyan-50 to-blue-50',
        borderColor: 'border-cyan-100',
        textColor: 'text-cyan-700',
        tagColor: 'bg-cyan-50 text-cyan-600',
      },
      {
        id: 'P-007',
        category: '包装',
        catKey: 'package',
        title: '众筹爆款后，如期送达每一位支持者',
        buyer: 'Buyer G · 韩国众筹创作者',
        year: '2024',
        tags: ['众筹', '环保', '爆款'],
        desc: '韩国众筹项目大幅超越目标。承诺给支持者的交期日益临近，量产包装的转换却尚未完成。KERYX在保留设计核心的前提下简化了模切工艺，并将材料换为环保认证纸张。最终在承诺日期内完成全球发货，后续量产自然转为定期订单。',
        specs: [
          { label: 'Category', value: '环保量产包装' },
          { label: 'Material', value: 'FSC认证牛皮纸 + 大豆油墨印刷' },
          { label: 'Audit', value: 'FSC, 环保认证' },
          { label: 'Outcome', value: '在承诺期限内完成全球发货' },
        ],
        process: '倒推支持者交期 → 协商保留设计核心的模切简化方案 → 转换为环保认证纸张 → 同步设计全球发货流程',
        why: '众筹转量产经验、环保认证纸张议价能力、多国发货标签经验',
        result: '承诺的日期，以承诺的样子，送到每位支持者手中',
        color: 'from-emerald-500 to-green-600',
        lightColor: 'from-emerald-50 to-green-50',
        borderColor: 'border-emerald-100',
        textColor: 'text-emerald-700',
        tagColor: 'bg-emerald-50 text-emerald-600',
      },
      {
        id: 'P-008',
        category: '角色周边',
        catKey: 'character',
        title: '随专辑一起走向世界的周边',
        buyer: 'Buyer H · 韩国大型娱乐公司',
        year: '2024',
        tags: ['K-pop全球', '多渠道', '粉丝同步下单'],
        desc: '韩国大型娱乐公司的全球周边产品线。专辑附赠周边、全球官方商城、快闪店、演唱会限定——同一角色需以不同规格同时在各渠道流通。KERYX按渠道分拆工厂以分散风险，官方商城与海外快闪店在同一时刻以同样的面貌开放。',
        specs: [
          { label: 'Category', value: '多渠道K-pop周边' },
          { label: 'Material', value: 'PVC · 亚克力 · 金属 · 毛绒混合' },
          { label: 'Audit', value: '娱乐公司自有审核' },
          { label: 'Outcome', value: '发售日全球多渠道同步开放' },
        ],
        process: '整理各渠道SKU → 按渠道分拆工厂 → 提前锁定应对同步爆单的产线 → 多国官方商城及快闪店同步入库',
        why: '分散单一工厂失败风险的设计、熟悉娱乐公司保密及审核流程、多渠道同步入库运营经验',
        result: '发售当日，所有渠道在同一时刻开放',
        color: 'from-rose-500 to-red-600',
        lightColor: 'from-rose-50 to-red-50',
        borderColor: 'border-rose-100',
        textColor: 'text-rose-700',
        tagColor: 'bg-rose-50 text-rose-600',
      },
      {
        id: 'P-009',
        category: '其他',
        catKey: 'other',
        title: '真正的MOQ壁垒在印刷纸箱上',
        buyer: 'Buyer I · 韩国生活方式初创品牌',
        year: '2024',
        tags: ['贸易新手', '包装洞察', '百货入驻'],
        desc: '首次尝试中国进口的新兴生活方式品牌。每家工厂都抛出同一道墙——"您需要达到最低起订量。" KERYX拆解后发现，这道墙不在产品，而在印刷纸箱。经过市场验证后，该品牌同步入驻百货公司和大型超市。',
        specs: [
          { label: 'Category', value: '生活日用品' },
          { label: 'Material', value: '不锈钢 + 硅胶握把' },
          { label: 'Audit', value: 'KC, LFGB' },
          { label: 'Outcome', value: '百货公司及大型超市同步入驻' },
        ],
        process: '拆解MOQ壁垒的真正原因 → 设计包装分阶段方案 → 首批试单验证市场 → 量产转换时正式启用印刷纸箱 → 陪同同步进驻流通渠道',
        why: '将产品与包装MOQ结构性分离的思维、能保留验证成本的首单设计',
        result: '首次进口后，仅一个季度即入驻大型流通渠道',
        color: 'from-slate-600 to-gray-700',
        lightColor: 'from-slate-50 to-gray-50',
        borderColor: 'border-slate-100',
        textColor: 'text-slate-700',
        tagColor: 'bg-slate-50 text-slate-600',
      },
    ],
  },
  en: {
    back: '← Back to Home',
    eyebrow: 'Production Portfolio',
    title: 'What We\'ve Built Together',
    sub: 'We have seen many times how a single match sustains both businesses for a decade. All cases are based on real engagements. Buyer and factory information has been anonymized with consent.',
    filter_all: 'All',
    filters: ['All', 'Character Goods', 'Non-Woven Bags', 'Plush / Dolls', 'Packaging', 'Other'],
    cta_title: 'Be the Next Case Study',
    cta_sub: 'Submit your brief and we\'ll reply within 2 business days.',
    cta_btn: 'Request Factory Matching',
    process_label: 'Process',
    why_label: 'Why This Match',
    anon: 'Buyer name and factory location anonymised by mutual consent.',
    items: [
      {
        id: 'P-001',
        category: 'Plush / Dolls',
        catKey: 'doll',
        title: 'A Comfort Doll Brand Born in a Tiny Room',
        buyer: 'Buyer A · Korean indie founder',
        year: '2024',
        tags: ['First-time Importer', 'Original Design', 'Global D2C'],
        desc: 'A Korean solo designer who started with savings from part-time work, in a small room at her parents\' home. She first validated the market with off-the-shelf products from Yiwu, then transitioned to her own design line. KERYX found a small precision factory in Yangzhou\'s sewing cluster willing to craft even small collections with care.',
        specs: [
          { label: 'Category', value: 'Fabric Plush Doll' },
          { label: 'Material', value: 'Minky fabric + High-density PP cotton' },
          { label: 'Audit', value: 'CPSIA, REACH' },
          { label: 'Outcome', value: 'Global D2C regular production' },
        ],
        process: 'Yiwu wholesale market validation → Joint decision on design transition timing → Sourcing a precision small factory in Yangzhou cluster → First series design collaboration',
        why: 'Small-batch precision sewing expertise, PM who fully accommodates solo designer\'s detail requests, overseas D2C shipping packaging standards',
        result: 'From off-the-shelf seller to global self-owned IP brand',
        color: 'from-emerald-500 to-teal-600',
        lightColor: 'from-emerald-50 to-teal-50',
        borderColor: 'border-emerald-100',
        textColor: 'text-emerald-700',
        tagColor: 'bg-emerald-50 text-emerald-600',
      },
      {
        id: 'P-002',
        category: 'Character Goods',
        catKey: 'character',
        title: 'Game Mega Season — Merchandise Had to Run as Fast as the Game',
        buyer: 'Buyer B · Korean game studio · global title',
        year: '2024',
        tags: ['Global Game IP', 'Multi-SKU', 'Season Sync'],
        desc: 'A project accompanying the new season launch of a Korean game studio\'s global mega mobile game. Figures, keyrings, acrylic stands, and small plush — all different SKU categories — had to arrive in players\' hands on the same day as the in-app event. KERYX grouped the three best-matched factories by category and had a single PM run them in one breath.',
        specs: [
          { label: 'Category', value: 'Multi-SKU game merchandise' },
          { label: 'Material', value: 'PVC · Acrylic · Metal · Plush mixed' },
          { label: 'Audit', value: 'CPSIA, EN71, Game IP review' },
          { label: 'Outcome', value: 'Multi-country simultaneous delivery on season launch day' },
        ],
        process: 'Season calendar back-calculation → Category-by-category factory split matching → Single KERYX PM operation → Combined incoming inspection then multi-country simultaneous shipment',
        why: 'Distributed single-factory failure points, PM with game IP review expertise, global multi-channel shipping standardization',
        result: 'On season launch day, every channel opened on the same day',
        color: 'from-indigo-500 to-purple-600',
        lightColor: 'from-indigo-50 to-purple-50',
        borderColor: 'border-indigo-100',
        textColor: 'text-indigo-700',
        tagColor: 'bg-indigo-50 text-indigo-600',
      },
      {
        id: 'P-003',
        category: 'Plush / Dolls',
        catKey: 'doll',
        title: 'Taking On a US Major Retailer\'s Private Brand Plush Line',
        buyer: 'Buyer C · North American mass retailer',
        year: '2023',
        tags: ['North America PB OEM', 'Holiday Season', 'Annual Renewal'],
        desc: 'A major North American retail chain was looking for a partner to handle its Private Brand plush doll line. Both CPSIA and Canadian CCPSA had to be passed simultaneously, with the added pressure of character rotation every season. After the first season passed headquarters\' standards, it became a regular annual order line where new season characters are born on the same line.',
        specs: [
          { label: 'Category', value: 'PB plush doll OEM' },
          { label: 'Material', value: 'Super soft boa + High-density PP cotton' },
          { label: 'Audit', value: 'CPSIA, CCPSA, ASTM F963' },
          { label: 'Outcome', value: 'Annual season renewal regular OEM' },
        ],
        process: 'Narrowing factories capable of passing both US/Canada certifications → Verifying seasonal rotation line stability → On-site confirmation of PB security system → Accompanying first season HQ evaluation',
        why: 'Line operation holding both certifications simultaneously, sewing stability unshaken by seasonal character rotation, accumulated HQ incoming inspection records',
        result: 'Every year, new season characters are born on the same line',
        color: 'from-rose-500 to-pink-600',
        lightColor: 'from-rose-50 to-pink-50',
        borderColor: 'border-rose-100',
        textColor: 'text-rose-700',
        tagColor: 'bg-rose-50 text-rose-600',
      },
      {
        id: 'P-004',
        category: 'Character Goods',
        catKey: 'character',
        title: 'One Claim That Became the Start of a Decade',
        buyer: 'Buyer D · Established Korean buyer',
        year: '2023',
        tags: ['Factory Win-Win', 'Long-term Partnership', 'Dedicated Line'],
        desc: 'The first transaction with this factory ended in a claim. Where others might have deflected responsibility, the factory decided to reproduce the entire order at their own cost. KERYX took that single act of accountability seriously. Over time, one of the factory\'s new lines naturally became dedicated to this buyer.',
        specs: [
          { label: 'Category', value: 'Complex character goods' },
          { label: 'Material', value: 'PVC · ABS · Plush mixed' },
          { label: 'Audit', value: 'Dedicated line solo quality management' },
          { label: 'Outcome', value: 'Dedicated line operation · Long-term partnership' },
        ],
        process: 'First transaction claim → Factory self-funded full reproduction → KERYX gradual order expansion → Trust accumulation on both sides → New line naturally assigned as buyer-dedicated',
        why: 'A case that perfectly matched KERYX\'s belief that what a factory does when it makes a mistake is its true nature',
        result: 'One line runs for one buyer',
        color: 'from-amber-500 to-orange-500',
        lightColor: 'from-amber-50 to-orange-50',
        borderColor: 'border-amber-100',
        textColor: 'text-amber-700',
        tagColor: 'bg-amber-50 text-amber-600',
      },
      {
        id: 'P-005',
        category: 'Non-Woven Bags',
        catKey: 'bag',
        title: 'A Tote Bag That Traveled City to City with the World Tour',
        buyer: 'Buyer E · K-pop entertainment label',
        year: '2024',
        tags: ['K-pop World Tour', 'City-Limited', 'Multi-country Simultaneous Shipping'],
        desc: 'Official merchandise tote bag for a global K-pop group\'s world tour. City-limited designs, member signature lines, eco-friendly non-woven body — and the hardest part was that delivery timing had to differ city by city according to the tour schedule. Throughout the tour, no store in any city ran out of tote bags.',
        specs: [
          { label: 'Category', value: 'Concert goods tote bag' },
          { label: 'Material', value: 'Eco-friendly high-density non-woven' },
          { label: 'Audit', value: 'REACH, OEKO-TEX' },
          { label: 'Outcome', value: 'Full world tour city-by-city supply' },
        ],
        process: 'Organizing tour city calendar → Back-calculating city-unit delivery schedules → Agreeing on line rotation calendar with factory → Simultaneously designing city-specific shipping labels and customs routing',
        why: 'Print stability unshaken by city-unit specification changes, multi-country customs labeling standardization, limited edition security work flow',
        result: 'No tour stop was missed, and no store ran dry',
        color: 'from-violet-500 to-indigo-600',
        lightColor: 'from-violet-50 to-indigo-50',
        borderColor: 'border-violet-100',
        textColor: 'text-violet-700',
        tagColor: 'bg-violet-50 text-violet-600',
      },
      {
        id: 'P-006',
        category: 'Plush / Dolls',
        catKey: 'doll',
        title: 'Luxury Collab — Each Doll Was a Work of Art',
        buyer: 'Buyer F · Luxury fashion house × Korean artist',
        year: '2024',
        tags: ['Luxury Collab', 'Limited Edition', 'Collectible'],
        desc: 'A limited-edition collaboration plush doll between a global luxury fashion house and a Korean illustration designer. Luxury standards are uncompromising — fabric texture, embroidery precision, and even the sound of the magnetic closure were in the spec sheet. Released exclusively at department stores and immediately sold out in the collectibles market.',
        specs: [
          { label: 'Category', value: 'Luxury limited edition plush' },
          { label: 'Material', value: 'Silk blend + Precision embroidery + Magnetic package' },
          { label: 'Audit', value: 'Luxury house proprietary finishing standard review' },
          { label: 'Outcome', value: 'Department store exclusive immediate sellout' },
        ],
        process: 'Deconstructing luxury spec sheet → Category-by-category precision factory split matching → Single PM operation familiar with luxury review → Accompanying all the way to department store delivery',
        why: 'Sewing, embroidery, and packaging trio seasoned in luxury finishing standards; PM\'s ability to bind three factories in one breath',
        result: 'Department store exclusive launch — immediate collectible sellout',
        color: 'from-cyan-500 to-blue-600',
        lightColor: 'from-cyan-50 to-blue-50',
        borderColor: 'border-cyan-100',
        textColor: 'text-cyan-700',
        tagColor: 'bg-cyan-50 text-cyan-600',
      },
      {
        id: 'P-007',
        category: 'Packaging',
        catKey: 'package',
        title: 'After the Funding Hit, Everyone Got Theirs on Time',
        buyer: 'Buyer G · Korean crowdfunding creator',
        year: '2024',
        tags: ['Crowdfunding', 'Eco-Friendly', 'Mega Hit'],
        desc: 'A Korean crowdfunding project that far exceeded its goal. The promised delivery date to backers was approaching, but the transition to mass production packaging was not yet done. KERYX simplified the die-cut while preserving the design\'s essence, and switched to eco-certified paper. Everything arrived within the promised schedule, and follow-up production naturally converted to regular orders.',
        specs: [
          { label: 'Category', value: 'Eco-friendly mass production packaging' },
          { label: 'Material', value: 'FSC-certified kraft + Soy ink printing' },
          { label: 'Audit', value: 'FSC, Environmental certification' },
          { label: 'Outcome', value: 'Global shipment within promised backer schedule' },
        ],
        process: 'Back-calculating backer schedule → Negotiating die-cut simplification that preserves design core → Switching to eco-certified paper → Simultaneously designing global shipping routing',
        why: 'Crowdfunding-to-mass-production transition experience, eco-certified paper price negotiation, multi-country shipping labeling experience',
        result: 'On the promised day, in the promised form, to every backer',
        color: 'from-emerald-500 to-green-600',
        lightColor: 'from-emerald-50 to-green-50',
        borderColor: 'border-emerald-100',
        textColor: 'text-emerald-700',
        tagColor: 'bg-emerald-50 text-emerald-600',
      },
      {
        id: 'P-008',
        category: 'Character Goods',
        catKey: 'character',
        title: 'Merchandise Sent to the World Alongside the Album',
        buyer: 'Buyer H · Major Korean entertainment agency',
        year: '2024',
        tags: ['K-pop Global', 'Multi-channel', 'Fandom Simultaneous Orders'],
        desc: 'Global merchandise line for a major Korean entertainment agency. Album-bundled goods, global official store, pop-up stores, concert venue exclusives — the same character had to flow simultaneously in different specs across every channel. KERYX split factories by channel to distribute risk, and the official store and overseas pop-ups opened at the same moment in the same form.',
        specs: [
          { label: 'Category', value: 'Multi-channel K-pop merchandise' },
          { label: 'Material', value: 'PVC · Acrylic · Metal · Plush mixed' },
          { label: 'Audit', value: 'Entertainment agency proprietary review' },
          { label: 'Outcome', value: 'Release day global multi-channel simultaneous opening' },
        ],
        process: 'Organizing channel-by-channel SKUs → Channel-unit factory split matching → Pre-securing lines to handle simultaneous order surge → Multi-country official store and pop-up simultaneous delivery',
        why: 'Single-factory failure point distribution design, familiarity with entertainment company security and review procedures, multi-channel simultaneous delivery operation experience',
        result: 'On release day, every channel opened at the same moment',
        color: 'from-rose-500 to-red-600',
        lightColor: 'from-rose-50 to-red-50',
        borderColor: 'border-rose-100',
        textColor: 'text-rose-700',
        tagColor: 'bg-rose-50 text-rose-600',
      },
      {
        id: 'P-009',
        category: 'Other',
        catKey: 'other',
        title: 'The Real MOQ Wall Was in the Printed Box',
        buyer: 'Buyer I · Korean lifestyle startup',
        year: '2024',
        tags: ['First-time Importer', 'Packaging Insight', 'Department Store Entry'],
        desc: 'A new lifestyle brand attempting its first China import. Every factory presented the same wall — "You need to meet the minimum order quantity." When KERYX broke it down, the wall wasn\'t in the product — it was in the printed box. After market validation, this brand simultaneously entered department stores and major supermarkets.',
        specs: [
          { label: 'Category', value: 'Lifestyle daily goods' },
          { label: 'Material', value: 'Stainless steel + Silicone grip' },
          { label: 'Audit', value: 'KC, LFGB' },
          { label: 'Outcome', value: 'Simultaneous department store and supermarket entry' },
        ],
        process: 'Deconstructing the real cause of the MOQ wall → Designing a phased packaging approach → First trial order for market validation → Applying official printed boxes upon mass production transition → Accompanying simultaneous distribution channel entry',
        why: 'Structural thinking to separate product and packaging MOQ, first-order design that preserves validation budget',
        result: 'First import — major retail entry within one season',
        color: 'from-slate-600 to-gray-700',
        lightColor: 'from-slate-50 to-gray-50',
        borderColor: 'border-slate-100',
        textColor: 'text-slate-700',
        tagColor: 'bg-slate-50 text-slate-600',
      },
    ],
  },
};

export default function PortfolioPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [activeFilter, setActiveFilter] = useState(0);

  const t = T[lang];

  const filterMap: Record<Lang, string[]> = {
    ko: ['전체', '캐릭터 굿즈', '부직포 가방', '인형', '패키지', '기타'],
    zh: ['全部', '角色周边', '无纺布包', '玩偶', '包装', '其他'],
    en: ['All', 'Character Goods', 'Non-Woven Bags', 'Plush / Dolls', 'Packaging', 'Other'],
  };

  const catKeyMap = ['all', 'character', 'bag', 'doll', 'package', 'other'];

  const filteredItems: PortfolioItem[] = (activeFilter === 0
    ? t.items
    : t.items.filter(item => item.catKey === catKeyMap[activeFilter])) as PortfolioItem[];

  return (
    <div className="min-h-screen bg-white">
      {/* NAV (공통 컴포넌트) */}
      <PublicHeader lang={lang as "ko" | "zh"} onLangChange={setLang as (l: "ko" | "zh") => void} theme="dark" />

      {/* HERO */}
      <section className="py-20 text-center" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <span className="inline-block text-xs font-bold tracking-widest text-amber-400 uppercase mb-4 px-4 py-1.5 bg-amber-400/10 rounded-full border border-amber-400/30">
            {t.eyebrow}
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-5 mt-4">{t.title}</h1>
          <p className="text-white/55 text-base max-w-2xl mx-auto leading-relaxed">{t.sub}</p>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-white/40">
            <span>이우(義烏) 현지 운영팀 직접 작성</span>
            <span>·</span>
            <span>전 사례 동의 기반 익명화</span>
            <span>·</span>
            <span>바이어·공장·거래량 보호</span>
          </div>
        </div>
      </section>

      {/* FILTER */}
      <section className="py-8 border-b border-gray-100 bg-white sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {filterMap[lang].map((f, i) => (
              <button key={i} onClick={() => setActiveFilter(i)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeFilter === i
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div key={item.id}
                className="group flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                {/* 상단 그라디언트 영역 */}
                <div className={`h-36 bg-gradient-to-br ${item.lightColor} flex items-center justify-center relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10`} />
                  <div className="relative text-center">
                    <div className={`text-4xl font-black ${item.textColor} opacity-20`}>{item.id}</div>
                    <div className={`text-sm font-bold ${item.textColor} mt-1`}>{item.category}</div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-bold text-gray-400 bg-white/80 px-2 py-1 rounded-full">{item.year}</span>
                  </div>
                </div>

                <div className="p-7 flex flex-col flex-1">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags.map((tag, j) => (
                      <span key={j} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.tagColor}`}>{tag}</span>
                    ))}
                  </div>

                  <h3 className="text-lg font-black text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-400 mb-4">{item.buyer}</p>
                  <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">{item.desc}</p>

                  {/* 스펙 테이블 */}
                  <div className={`rounded-xl bg-gradient-to-br ${item.lightColor} border ${item.borderColor} p-4 mb-5`}>
                    <div className="grid grid-cols-2 gap-3">
                      {item.specs.map((spec, j) => (
                        <div key={j}>
                          <div className="text-xs text-gray-400 mb-0.5">{spec.label}</div>
                          <div className={`text-xs font-bold ${item.textColor}`}>{spec.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 진행 과정 */}
                  <div className="mb-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.process_label}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{item.process}</p>
                  </div>

                  {/* 이 매칭이 성사된 이유 */}
                  <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 flex-shrink-0">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">{t.why_label}</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">{item.why}</p>
                  </div>

                  {/* 증빙 레벨 배지 */}
                  {item.inspectionType && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        {item.inspectionType}
                      </span>
                      {item.duration && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {item.duration}
                        </span>
                      )}
                      {item.clientType && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {item.clientType}
                        </span>
                      )}
                    </div>
                  )}
                  {/* 결과 */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${item.color} text-white`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-xs font-bold">{item.result}</span>
                  </div>

                  {/* 익명 처리 안내 */}
                  <p className="text-xs text-gray-400 mt-3 text-center italic">{t.anon}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Before / After 증거 자료 ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-indigo-600 uppercase mb-4 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
              {lang === 'zh' ? '实证案例 · Evidence' : '실증 사례 · Evidence'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
              {lang === 'zh' ? 'Before / After 实际数据' : 'Before / After 실제 수치'}
            </h2>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '以下所有案例均为实际发生的交易，买家信息已匿名处理。数字是真实的。'
                : '아래 모든 사례는 실제 발생한 거래이며, 바이어 정보는 익명 처리되었습니다. 수치는 실제입니다.'}
            </p>
          </div>
          <div className="space-y-10">
            {/* 사례 1: 불량률 개선 */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-900 px-7 py-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Case 01 · 봉제 인형</span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {lang === 'zh' ? '不良率从18%降至0.3%' : '불량률 18% → 0.3% 달성'}
                  </h3>
                </div>
                <span className="text-xs text-white/40 hidden sm:block">Buyer A · 한국 캐릭터 굿즈 바이어 · 2023</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-7 bg-red-50">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-4">
                    {lang === 'zh' ? 'BEFORE — 问题状态' : 'BEFORE — 문제 상태'}
                  </p>
                  <div className="space-y-3">
                    {(lang === 'zh' ? [
                      { label: '不良率', value: '18%', sub: '每100个中18个不合格' },
                      { label: '退货损失', value: '月均 ₩3.2M', sub: '退货+重新生产费用' },
                      { label: '交货延误', value: '平均 11天', sub: '重新生产导致的延误' },
                      { label: '问题原因', value: '缝制不均匀', sub: '手工差异未被检验' },
                    ] : [
                      { label: '불량률', value: '18%', sub: '100개 중 18개 불합격' },
                      { label: '반품 손실', value: '월평균 ₩3.2M', sub: '반품+재생산 비용' },
                      { label: '납기 지연', value: '평균 11일', sub: '재생산으로 인한 지연' },
                      { label: '원인', value: '봉제 불균일', sub: '수작업 편차 미검수' },
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-500">{item.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-red-600">{item.value}</span>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-7 bg-emerald-50">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
                    {lang === 'zh' ? 'AFTER — KERYX介入后' : 'AFTER — KERYX 개입 후'}
                  </p>
                  <div className="space-y-3">
                    {(lang === 'zh' ? [
                      { label: '不良率', value: '0.3%', sub: '100%全检后达成' },
                      { label: '退货损失', value: '月均 ₩0', sub: '连续6个月零退货' },
                      { label: '交货延误', value: '0日', sub: '连续8个月准时交货' },
                      { label: '解决方案', value: '100%全检', sub: '手工缝制品专用检验方案' },
                    ] : [
                      { label: '불량률', value: '0.3%', sub: '100% 전수 검수 후 달성' },
                      { label: '반품 손실', value: '월평균 ₩0', sub: '6개월 연속 반품 제로' },
                      { label: '납기 지연', value: '0일', sub: '8개월 연속 납기 준수' },
                      { label: '해결책', value: '100% 전수 검수', sub: '수공 봉제 전용 검수 방안' },
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-500">{item.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-600">{item.value}</span>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-7 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">
                    {lang === 'zh' ? '핵심 인사이트: ' : '핵심 인사이트: '}
                  </span>
                  {lang === 'zh'
                    ? '手工缝制品的个体差异无法通过抽样检验发现。KERYX将100%全检作为标准，将不良率降至接近零。'
                    : '수공 봉제품의 개체 편차는 샘플링으로 발견할 수 없습니다. KERYX는 100% 전수 검수를 기준으로 적용하여 불량률을 제로에 가깝게 낮췄습니다.'}
                </p>
              </div>
            </div>

            {/* 사례 2: 공장 교체로 단가 절감 */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-900 px-7 py-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Case 02 · 플라스틱 굿즈</span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {lang === 'zh' ? '单价降低22%，同时品质提升' : '단가 22% 절감, 품질은 동시에 향상'}
                  </h3>
                </div>
                <span className="text-xs text-white/40 hidden sm:block">Buyer B · 뽑기 굿즈 유통사 · 2024</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-7 bg-red-50">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-4">
                    {lang === 'zh' ? 'BEFORE — 问题状态' : 'BEFORE — 문제 상태'}
                  </p>
                  <div className="space-y-3">
                    {(lang === 'zh' ? [
                      { label: '单价', value: '¥8.4/개', sub: '에이전시 소개 공장' },
                      { label: '불량률', value: '6.2%', sub: '색상 편차·표면 스크래치' },
                      { label: '최소발주량', value: '5,000개', sub: '재고 부담 과다' },
                      { label: '납기', value: '45일', sub: '시즌 대응 불가' },
                    ] : [
                      { label: '단가', value: '¥8.4/개', sub: '에이전시 소개 공장' },
                      { label: '불량률', value: '6.2%', sub: '색상 편차·표면 스크래치' },
                      { label: '최소발주량', value: '5,000개', sub: '재고 부담 과다' },
                      { label: '납기', value: '45일', sub: '시즌 대응 불가' },
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-500">{item.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-red-600">{item.value}</span>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-7 bg-emerald-50">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
                    {lang === 'zh' ? 'AFTER — KERYX介入后' : 'AFTER — KERYX 개입 후'}
                  </p>
                  <div className="space-y-3">
                    {(lang === 'zh' ? [
                      { label: '단가', value: '¥6.5/개', sub: 'KERYX 직접 매칭 공장' },
                      { label: '불량률', value: '0.8%', sub: 'AQL 1.5 샘플링 검수' },
                      { label: '최소발주량', value: '2,000개', sub: '소량 다품종 가능' },
                      { label: '납기', value: '28일', sub: '시즌 회전 대응 가능' },
                    ] : [
                      { label: '단가', value: '¥6.5/개', sub: 'KERYX 직접 매칭 공장' },
                      { label: '불량률', value: '0.8%', sub: 'AQL 1.5 샘플링 검수' },
                      { label: '최소발주량', value: '2,000개', sub: '소량 다품종 가능' },
                      { label: '납기', value: '28일', sub: '시즌 회전 대응 가능' },
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-500">{item.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-600">{item.value}</span>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-7 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">
                    {lang === 'zh' ? '핵심 인사이트: ' : '핵심 인사이트: '}
                  </span>
                  {lang === 'zh'
                    ? '代理商介绍的工厂并非最优选择。KERYX通过25年积累的工厂网络，找到了价格更低、品质更好的工厂。'
                    : '에이전시가 소개한 공장이 최선이 아닐 수 있습니다. KERYX는 25년 축적된 공장 네트워크로 더 낮은 단가와 더 높은 품질을 동시에 달성했습니다.'}
                </p>
              </div>
            </div>

            {/* 사례 3: IP 상품 색상 관리 */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-900 px-7 py-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wide">Case 03 · IP 라이센스 굿즈</span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {lang === 'zh' ? 'IP持有方验收通过率从40%提升至98%' : 'IP 홀더 승인율 40% → 98% 달성'}
                  </h3>
                </div>
                <span className="text-xs text-white/40 hidden sm:block">Buyer C · IP 라이센스 굿즈 바이어 · 2024</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-7 bg-red-50">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-4">
                    {lang === 'zh' ? 'BEFORE — 问题状态' : 'BEFORE — 문제 상태'}
                  </p>
                  <div className="space-y-3">
                    {(lang === 'zh' ? [
                      { label: 'IP 홀더 승인율', value: '40%', sub: '색상 편차로 반복 탈락' },
                      { label: '샘플 재작업', value: '평균 4.2회', sub: '승인까지 소요 횟수' },
                      { label: '승인 소요 기간', value: '평균 67일', sub: '시즌 타이밍 놓침' },
                      { label: '원인', value: '일반 공장 사용', sub: 'IP 색상 관리 미숙' },
                    ] : [
                      { label: 'IP 홀더 승인율', value: '40%', sub: '색상 편차로 반복 탈락' },
                      { label: '샘플 재작업', value: '평균 4.2회', sub: '승인까지 소요 횟수' },
                      { label: '승인 소요 기간', value: '평균 67일', sub: '시즌 타이밍 놓침' },
                      { label: '원인', value: '일반 공장 사용', sub: 'IP 색상 관리 미숙' },
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-500">{item.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-red-600">{item.value}</span>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-7 bg-emerald-50">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-4">
                    {lang === 'zh' ? 'AFTER — KERYX介入后' : 'AFTER — KERYX 개입 후'}
                  </p>
                  <div className="space-y-3">
                    {(lang === 'zh' ? [
                      { label: 'IP 홀더 승인율', value: '98%', sub: '1차 샘플 승인 달성' },
                      { label: '샘플 재작업', value: '평균 1.1회', sub: '거의 1회에 승인' },
                      { label: '승인 소요 기간', value: '평균 18일', sub: '시즌 타이밍 확보' },
                      { label: '해결책', value: 'IP 전문 공장 매칭', sub: '팬톤 색상 관리 전문 라인' },
                    ] : [
                      { label: 'IP 홀더 승인율', value: '98%', sub: '1차 샘플 승인 달성' },
                      { label: '샘플 재작업', value: '평균 1.1회', sub: '거의 1회에 승인' },
                      { label: '승인 소요 기간', value: '평균 18일', sub: '시즌 타이밍 확보' },
                      { label: '해결책', value: 'IP 전문 공장 매칭', sub: '팬톤 색상 관리 전문 라인' },
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-500">{item.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-600">{item.value}</span>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-7 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">
                    {lang === 'zh' ? '핵심 인사이트: ' : '핵심 인사이트: '}
                  </span>
                  {lang === 'zh'
                    ? 'IP授权产品需要专门管理Pantone色彩的工厂。KERYX将工厂分类为"IP专用工厂"，实现了近乎完美的一次性验收通过率。'
                    : 'IP 라이센스 상품은 팬톤 색상을 전문적으로 관리하는 공장이 필요합니다. KERYX는 공장을 "IP 전용 공장"으로 분류하여 거의 완벽한 1차 승인율을 달성했습니다.'}
                </p>
              </div>
            </div>
          </div>
          {/* 익명 처리 안내 */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              {lang === 'zh'
                ? '* 以上所有数据均为实际交易数据，买家信息已匿名处理。如需了解更多详情，请通过免费咨询联系我们。'
                : '* 위 모든 수치는 실제 거래 데이터이며, 바이어 정보는 익명 처리되었습니다. 더 자세한 내용은 무료 상담을 통해 문의해 주세요.'}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-5">{t.cta_title}</h2>
          <p className="text-white/55 text-base mb-10 max-w-xl mx-auto">{t.cta_sub}</p>
          <Link href="/quote"
            className="inline-block px-10 py-4 text-base font-black text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #d4a843, #f59e0b)' }}>
            {t.cta_btn}
          </Link>
        </div>
      </section>
      {/* FOOTER (공통 컴포넌트) */}
      <PublicFooter lang={lang} theme="dark" />
    </div>
  );
}
