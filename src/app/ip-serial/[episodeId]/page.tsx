'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

type Lang = 'ko' | 'zh';

// ── 에피소드 콘텐츠 데이터 (정적) ──────────────────────────
interface EpisodeContent {
  id: string;
  ip: string;
  ipName_ko: string;
  ipName_zh: string;
  type: 'fairytale' | 'webtoon' | 'novel';
  episode_number: number;
  title_ko: string;
  title_zh: string;
  thumbnail: string;
  color: string;
  // 실제 콘텐츠
  content_ko: string[];
  content_zh: string[];
  // 웹툰인 경우 이미지 목록
  images?: string[];
}

const EPISODE_CONTENTS: Record<string, EpisodeContent> = {
  'ppuji-ft-01': {
    id: 'ppuji-ft-01',
    ip: 'ppuji',
    ipName_ko: '뿌찌프랜즈',
    ipName_zh: '噗奇朋友们',
    type: 'fairytale',
    episode_number: 1,
    title_ko: '뿌찌빌리지의 첫 번째 아침',
    title_zh: '噗吉村庄的第一个早晨',
    thumbnail: '/images/ip-story/ppuchi-world.jpg',
    color: 'from-pink-500 to-rose-400',
    content_ko: [
      '뿌찌빌리지에 새로운 하루가 시작되었습니다.',
      '해가 뜨자마자 당뿌는 눈을 떴습니다. 오늘은 특별한 날이었거든요. 마을 친구들 모두가 모여 축제를 준비하는 날!',
      '"좋은 아침이야, 모찌!" 당뿌가 옆집 문을 두드렸습니다.',
      '모찌는 아직 이불 속에서 꿈나라를 여행 중이었습니다. "음... 5분만 더..." 모찌가 중얼거렸습니다.',
      '당뿌는 웃으며 다음 집으로 향했습니다. 초코의 집에서는 벌써 달콤한 냄새가 솔솔 풍겨왔습니다.',
      '"초코야! 벌써 요리를 시작했구나!" 당뿌가 감탄했습니다.',
      '"응! 축제에 쓸 쿠키를 만들고 있어. 당뿌도 하나 먹어볼래?" 초코가 갓 구운 별 모양 쿠키를 내밀었습니다.',
      '바삭하고 달콤한 쿠키를 먹으며 당뿌는 생각했습니다. 뿌찌빌리지에서 가장 좋은 것은 바로 이런 따뜻한 아침이라고.',
      '그때, 마을 광장에서 큰 소리가 들려왔습니다. "다들 모여! 축제 준비 시작이야!"',
      '당뿌와 초코는 서로 눈을 마주치며 웃었습니다. 오늘 하루가 정말 기대됩니다!',
      '— 계속 —',
    ],
    content_zh: [
      '噗吉村庄新的一天开始了。',
      '太阳一升起，当噗就睁开了眼睛。因为今天是特别的日子——村里的朋友们都要聚在一起准备节日！',
      '"早上好，年糕！"当噗敲了敲隔壁的门。',
      '年糕还在被窝里游览梦境。"嗯...再睡5分钟..."年糕嘟囔着。',
      '当噗笑着走向下一家。巧克力的家里已经飘出了甜甜的香味。',
      '"巧克力！你已经开始做饭了啊！"当噗感叹道。',
      '"嗯！我在做节日用的饼干。当噗也来尝一个吧？"巧克力递出了刚烤好的星形饼干。',
      '吃着酥脆香甜的饼干，当噗想着：噗吉村庄最好的就是这样温暖的早晨。',
      '这时，村庄广场传来了大声的呼喊。"大家集合！节日准备开始了！"',
      '当噗和巧克力相视而笑。今天一定会是美好的一天！',
      '— 未完待续 —',
    ],
  },
  'ppuji-ft-02': {
    id: 'ppuji-ft-02',
    ip: 'ppuji',
    ipName_ko: '뿌찌프랜즈',
    ipName_zh: '噗奇朋友们',
    type: 'fairytale',
    episode_number: 2,
    title_ko: '모찌의 비밀 레시피',
    title_zh: '年糕的秘密食谱',
    thumbnail: '/images/ip-story/ppuchi-world.jpg',
    color: 'from-pink-500 to-rose-400',
    content_ko: [
      '뿌찌빌리지의 축제가 코앞으로 다가왔습니다.',
      '모찌는 올해 축제에서 특별한 요리를 선보이기로 마음먹었습니다. 할머니에게 물려받은 비밀 레시피가 있었거든요.',
      '"무지개 떡... 일곱 가지 색깔의 떡을 만들려면 특별한 재료가 필요해."',
      '모찌는 레시피를 펼쳐 보았습니다. 빨간색은 딸기, 주황색은 당근, 노란색은 호박... 하지만 마지막 보라색 재료가 문제였습니다.',
      '"보라색 꽃잎... 이건 마을 뒷산 꼭대기에만 피는 꽃인데..."',
      '모찌는 혼자서 산을 오르기가 걱정되었습니다. 그때 당뿌가 찾아왔습니다.',
      '"모찌야, 무슨 고민이야?" 당뿌가 물었습니다.',
      '모찌가 사정을 이야기하자, 당뿌는 활짝 웃었습니다. "걱정 마! 우리 다 같이 가면 되지!"',
      '당뿌의 한마디에 초코, 밀키, 베리까지 모두 모였습니다. 다섯 친구는 함께 뒷산을 향해 출발했습니다.',
      '산길은 험했지만, 친구들과 함께라서 하나도 무섭지 않았습니다. 서로 손을 잡고, 노래를 부르며 올라갔습니다.',
      '드디어 산꼭대기에 도착하자, 보라빛 꽃들이 바람에 살랑살랑 흔들리고 있었습니다.',
      '"와... 정말 예쁘다!" 모두가 감탄했습니다.',
      '모찌는 조심스럽게 꽃잎을 모았습니다. "고마워, 친구들. 이제 무지개 떡을 완성할 수 있어!"',
      '축제 날, 모찌의 무지개 떡은 뿌찌빌리지 역사상 가장 아름답고 맛있는 요리가 되었습니다.',
      '— 계속 —',
    ],
    content_zh: [
      '噗吉村庄的节日近在眼前。',
      '年糕决定在今年的节日上展示一道特别的料理。因为有从奶奶那里传下来的秘密食谱。',
      '"彩虹糕...要做七种颜色的糕需要特别的食材。"',
      '年糕展开了食谱。红色是草莓，橙色是胡萝卜，黄色是南瓜...但最后紫色的食材是个问题。',
      '"紫色花瓣...这是只在村后山顶上开的花..."',
      '年糕担心一个人爬山。这时当噗来了。',
      '"年糕，你在烦恼什么？"当噗问道。',
      '年糕说明了情况，当噗灿烂地笑了。"别担心！我们大家一起去就好了！"',
      '当噗一句话，巧克力、牛奶、莓莓都聚集了。五个朋友一起向后山出发了。',
      '山路虽然崎岖，但和朋友们在一起一点都不害怕。互相牵着手，唱着歌爬上去了。',
      '终于到达山顶时，紫色的花朵在风中轻轻摇曳。',
      '"哇...真漂亮！"大家都感叹道。',
      '年糕小心翼翼地收集了花瓣。"谢谢你们，朋友们。现在可以完成彩虹糕了！"',
      '节日那天，年糕的彩虹糕成为了噗吉村庄历史上最美丽、最美味的料理。',
      '— 未完待续 —',
    ],
  },
  'dinomon-ft-01': {
    id: 'dinomon-ft-01',
    ip: 'dinomon',
    ipName_ko: '디노몬',
    ipName_zh: '恐龙萌',
    type: 'fairytale',
    episode_number: 1,
    title_ko: '디노몬 아일랜드의 비밀',
    title_zh: '恐龙萌岛的秘密',
    thumbnail: '/images/ip-story/dinomon-world.jpg',
    color: 'from-emerald-500 to-teal-400',
    content_ko: [
      '아주 먼 바다 한가운데, 안개에 둘러싸인 신비의 섬이 있었습니다.',
      '그곳이 바로 디노몬 아일랜드. 여섯 마리의 특별한 공룡 친구들이 사는 곳이었습니다.',
      '어느 날 아침, 섬의 리더 티노가 해변을 산책하다가 이상한 것을 발견했습니다.',
      '"이건... 지도?" 모래 속에서 반짝이는 금빛 종이가 나타났습니다.',
      '지도에는 섬 곳곳에 별 모양 표시가 되어 있었고, 한가운데에는 커다란 X 표시가 있었습니다.',
      '티노는 친구들을 불러 모았습니다. "다들 봐! 우리 섬에 비밀이 숨겨져 있어!"',
      '트리케라가 지도를 자세히 살펴보았습니다. "이 별 표시들... 각각 우리가 사는 곳 근처야!"',
      '"그럼 우리 각자 자기 근처의 별 표시를 찾아보는 건 어때?" 브라키가 제안했습니다.',
      '여섯 친구들은 각자의 모험을 시작했습니다. 화산 근처의 렉스, 깊은 숲의 스테고, 높은 절벽의 프테로...',
      '과연 이 지도가 가리키는 디노몬 아일랜드의 비밀은 무엇일까요?',
      '— 계속 —',
    ],
    content_zh: [
      '在很远的大海中央，有一座被雾气环绕的神秘岛屿。',
      '那就是恐龙萌岛。六只特别的恐龙朋友生活的地方。',
      '一天早上，岛上的领袖蒂诺在海滩散步时发现了奇怪的东西。',
      '"这是...地图？"沙子里出现了闪闪发光的金色纸张。',
      '地图上岛屿各处标着星形标记，正中间有一个大大的X标记。',
      '蒂诺召集了朋友们。"大家看！我们的岛上隐藏着秘密！"',
      '三角龙仔细查看了地图。"这些星形标记...各自在我们住的地方附近！"',
      '"那我们各自去找自己附近的星形标记怎么样？"腕龙提议道。',
      '六个朋友各自开始了冒险。火山附近的霸王龙、深林中的剑龙、高崖上的翼龙...',
      '这张地图指向的恐龙萌岛的秘密究竟是什么呢？',
      '— 未完待续 —',
    ],
  },
  'dinomon-wt-01': {
    id: 'dinomon-wt-01',
    ip: 'dinomon',
    ipName_ko: '디노몬',
    ipName_zh: '恐龙萌',
    type: 'webtoon',
    episode_number: 1,
    title_ko: '용감한 티노의 하루',
    title_zh: '勇敢的蒂诺的一天',
    thumbnail: '/images/ip-story/dinomon-world.jpg',
    color: 'from-emerald-500 to-teal-400',
    content_ko: [
      '[패널 1] 아침 해가 디노몬 아일랜드를 비춥니다.',
      '[패널 2] 티노: "좋은 아침! 오늘도 섬을 지키러 출발!"',
      '[패널 3] 티노가 해안가를 순찰합니다. 파도가 찰랑찰랑.',
      '[패널 4] 갑자기! 바다에서 이상한 소리가 들립니다. "꾸르르르..."',
      '[패널 5] 티노: "뭐지?! 혹시 위험한 건 아닐까?"',
      '[패널 6] 용기를 내어 바다 쪽으로 다가가는 티노.',
      '[패널 7] 알고 보니... 작은 거북이가 바위에 끼어 있었습니다!',
      '[패널 8] 티노: "걱정 마! 내가 도와줄게!"',
      '[패널 9] 조심스럽게 거북이를 구해주는 티노.',
      '[패널 10] 거북이: "고마워, 티노! 너 정말 용감해!"',
      '[패널 11] 티노: "하하, 별거 아니야. 친구를 돕는 건 당연한 거지!"',
      '[패널 12] 석양이 지는 디노몬 아일랜드. 오늘도 평화로운 하루가 저물어갑니다.',
      '— 다음 화에 계속 —',
    ],
    content_zh: [
      '[面板 1] 朝阳照耀着恐龙萌岛。',
      '[面板 2] 蒂诺："早上好！今天也出发守护岛屿！"',
      '[面板 3] 蒂诺在海岸巡逻。波浪轻轻拍打。',
      '[面板 4] 突然！海里传来奇怪的声音。"咕噜噜..."',
      '[面板 5] 蒂诺："什么？！会不会有危险？"',
      '[面板 6] 鼓起勇气向海边走去的蒂诺。',
      '[面板 7] 原来...一只小海龟被卡在岩石里了！',
      '[面板 8] 蒂诺："别担心！我来帮你！"',
      '[面板 9] 小心翼翼地救出海龟的蒂诺。',
      '[面板 10] 海龟："谢谢你，蒂诺！你真勇敢！"',
      '[面板 11] 蒂诺："哈哈，没什么。帮助朋友是理所当然的！"',
      '[面板 12] 夕阳下的恐龙萌岛。今天也是平和的一天渐渐落幕。',
      '— 下一话继续 —',
    ],
  },
  'duckle-ft-01': {
    id: 'duckle-ft-01',
    ip: 'duckle',
    ipName_ko: '덕클',
    ipName_zh: '鸭克',
    type: 'fairytale',
    episode_number: 1,
    title_ko: '덕클의 연못 탐험',
    title_zh: '鸭克的池塘探险',
    thumbnail: '/images/ip-story/duckle-adventure.jpg',
    color: 'from-amber-500 to-yellow-400',
    content_ko: [
      '작은 연못 한가운데, 노란 오리 한 마리가 살고 있었습니다.',
      '이름은 덕클. 호기심이 아주 많은 오리였습니다.',
      '덕클은 매일 연못 위를 둥둥 떠다니며 생각했습니다. "연못 저 너머에는 뭐가 있을까?"',
      '어느 날, 덕클은 드디어 용기를 냈습니다. "오늘은 꼭 연못 밖으로 나가볼 거야!"',
      '풀숲을 헤치고 나가자, 눈앞에 넓은 들판이 펼쳐졌습니다.',
      '"와아! 세상이 이렇게 넓었어?" 덕클의 눈이 동그래졌습니다.',
      '들판을 걷다가 덕클은 작은 토끼를 만났습니다.',
      '"안녕! 나는 덕클이야. 너는 누구니?"',
      '"나는 봄이야! 여기서 뭐 하는 거야, 덕클?" 토끼가 물었습니다.',
      '"연못 밖 세상을 탐험하고 있어!" 덕클이 자랑스럽게 말했습니다.',
      '"그럼 내가 재미있는 곳을 알려줄게! 따라와!" 봄이가 깡충깡충 뛰기 시작했습니다.',
      '덕클은 새 친구를 따라 신나게 뒤뚱뒤뚱 걸었습니다. 오늘은 정말 특별한 하루의 시작이었습니다.',
      '— 계속 —',
    ],
    content_zh: [
      '在一个小池塘中央，住着一只黄色的小鸭子。',
      '它的名字叫鸭克。是一只非常好奇的鸭子。',
      '鸭克每天漂浮在池塘上想着："池塘那边有什么呢？"',
      '有一天，鸭克终于鼓起了勇气。"今天一定要去池塘外面看看！"',
      '穿过草丛后，眼前展开了广阔的田野。',
      '"哇！世界这么大啊？"鸭克的眼睛睁得圆圆的。',
      '走在田野上，鸭克遇到了一只小兔子。',
      '"你好！我是鸭克。你是谁？"',
      '"我是小春！你在这里做什么，鸭克？"兔子问道。',
      '"我在探索池塘外面的世界！"鸭克自豪地说。',
      '"那我告诉你一个有趣的地方！跟我来！"小春开始蹦蹦跳跳。',
      '鸭克跟着新朋友开心地摇摇摆摆走着。今天真是特别的一天的开始。',
      '— 未完待续 —',
    ],
  },
  'duckle-nv-01': {
    id: 'duckle-nv-01',
    ip: 'duckle',
    ipName_ko: '덕클',
    ipName_zh: '鸭克',
    type: 'novel',
    episode_number: 1,
    title_ko: '비 오는 날의 덕클',
    title_zh: '下雨天的鸭克',
    thumbnail: '/images/ip-story/duckle-adventure.jpg',
    color: 'from-amber-500 to-yellow-400',
    content_ko: [
      '빗방울이 연못 위에 떨어지기 시작했다.',
      '덕클은 빗방울을 세기 시작했다. 하나, 둘, 셋... 빗방울은 너무 많아서 곧 셀 수 없게 되었다.',
      '"빗방울마다 소리가 달라." 덕클이 중얼거렸다.',
      '큰 빗방울은 "퐁!" 하고 떨어졌고, 작은 빗방울은 "톡톡" 소리를 냈다. 마치 누군가 연못 위에서 음악을 연주하는 것 같았다.',
      '그때, 덕클의 눈에 이상한 것이 들어왔다. 연못 한쪽 구석에서 무지개빛으로 빛나는 물방울이 하나 떠오르고 있었다.',
      '"저건 뭐지?" 덕클은 조심스럽게 다가갔다.',
      '무지개빛 물방울은 마치 살아있는 것처럼 덕클 주위를 빙글빙글 돌았다.',
      '"안녕?" 덕클이 말을 걸었다.',
      '물방울이 반짝 빛났다. 마치 대답하는 것 같았다.',
      '덕클은 물방울을 따라 연못 깊은 곳으로 들어갔다. 그곳에는... 덕클이 한 번도 본 적 없는 신비로운 세계가 펼쳐져 있었다.',
      '수정처럼 맑은 물속 궁전, 형형색색의 물고기들, 그리고 연못 바닥에서 자라는 빛나는 꽃들.',
      '"이런 곳이 내 연못 아래에 있었다니..." 덕클은 숨을 죽이며 감탄했다.',
      '무지개빛 물방울이 다시 한번 반짝였다. 마치 "더 보여줄게"라고 말하는 것처럼.',
      '비 오는 날, 덕클은 연못의 비밀을 알게 되었다.',
      '— 계속 —',
    ],
    content_zh: [
      '雨滴开始落在池塘上。',
      '鸭克开始数雨滴。一、二、三...雨滴太多了，很快就数不过来了。',
      '"每个雨滴的声音都不一样。"鸭克嘟囔着。',
      '大雨滴"噗"地落下，小雨滴发出"滴答"的声音。就像有人在池塘上演奏音乐一样。',
      '这时，鸭克的眼睛里映入了奇怪的东西。池塘的一个角落里，一个闪着彩虹光芒的水滴正在浮起。',
      '"那是什么？"鸭克小心翼翼地靠近了。',
      '彩虹色的水滴像活着一样围着鸭克转圈圈。',
      '"你好？"鸭克打了个招呼。',
      '水滴闪了一下。好像在回答一样。',
      '鸭克跟着水滴进入了池塘深处。那里...展开了鸭克从未见过的神秘世界。',
      '水晶般清澈的水下宫殿、五颜六色的鱼儿，还有从池塘底部生长的发光花朵。',
      '"我的池塘下面竟然有这样的地方..."鸭克屏住呼吸感叹道。',
      '彩虹色水滴又闪了一下。好像在说"还有更多要给你看"。',
      '下雨天，鸭克知道了池塘的秘密。',
      '— 未完待续 —',
    ],
  },
};

const texts = {
  ko: {
    back: '← 목록으로',
    episode: '화',
    prev: '이전 화',
    next: '다음 화',
    type_fairytale: '동화',
    type_webtoon: '웹툰',
    type_novel: '소설',
    share: '공유하기',
    not_found: '에피소드를 찾을 수 없습니다.',
    go_back: '목록으로 돌아가기',
    cta: '이 캐릭터로 굿즈 만들기',
  },
  zh: {
    back: '← 返回列表',
    episode: '话',
    prev: '上一话',
    next: '下一话',
    type_fairytale: '童话',
    type_webtoon: '网漫',
    type_novel: '小说',
    share: '分享',
    not_found: '找不到该章节。',
    go_back: '返回列表',
    cta: '用这个角色制作商品',
  },
};

export default function EpisodeDetailPage() {
  const params = useParams();
  const episodeId = params.episodeId as string;
  const [lang, setLang] = useState<Lang>('ko');
  const t = texts[lang];

  const episode = EPISODE_CONTENTS[episodeId];

  if (!episode) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="text-6xl mb-4">📖</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.not_found}</h1>
            <Link href="/ip-serial" className="text-purple-600 font-medium hover:underline">{t.go_back}</Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const content = lang === 'zh' ? episode.content_zh : episode.content_ko;
  const title = lang === 'zh' ? episode.title_zh : episode.title_ko;
  const ipName = lang === 'zh' ? episode.ipName_zh : episode.ipName_ko;
  const typeLabel = lang === 'zh'
    ? (episode.type === 'fairytale' ? '童话' : episode.type === 'webtoon' ? '网漫' : '小说')
    : (episode.type === 'fairytale' ? '동화' : episode.type === 'webtoon' ? '웹툰' : '소설');

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-white">
        {/* 언어 전환 */}
        <div className="fixed top-20 right-4 z-40 flex gap-1 bg-white/90 backdrop-blur rounded-full border px-1 py-1 shadow-sm">
          <button onClick={() => setLang('ko')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${lang === 'ko' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>KO</button>
          <button onClick={() => setLang('zh')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${lang === 'zh' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>ZH</button>
        </div>

        {/* 히어로 배너 */}
        <section className={`relative pt-28 pb-16 bg-gradient-to-br ${episode.color}`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative max-w-3xl mx-auto px-6 text-center text-white">
            <Link href="/ip-serial" className="inline-block text-white/70 hover:text-white text-sm mb-6 transition">
              {t.back}
            </Link>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold">{ipName}</span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold">{typeLabel}</span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold">{episode.episode_number}{t.episode}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black">{title}</h1>
          </div>
        </section>

        {/* 본문 콘텐츠 */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-6">
            <article className="prose prose-lg max-w-none">
              {content.map((paragraph, i) => (
                <p key={i} className={`text-gray-700 leading-loose mb-6 text-lg ${
                  paragraph.startsWith('—') ? 'text-center text-gray-400 italic mt-12' : ''
                } ${
                  paragraph.startsWith('[') ? 'font-medium text-gray-800 bg-gray-50 p-4 rounded-lg border-l-4 border-purple-300' : ''
                }`}>
                  {paragraph}
                </p>
              ))}
            </article>

            {/* 네비게이션 */}
            <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
              <Link href="/ip-serial" className="text-purple-600 font-medium hover:underline">
                {t.back}
              </Link>
              <Link href="/quote" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition">
                {t.cta}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
