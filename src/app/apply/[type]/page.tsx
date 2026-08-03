"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

type ServiceType = 'market-research' | 'factory-matching' | 'sample-development';
const SERVICE_META = {
  'market-research':    { colorFrom: '#667eea', colorTo: '#764ba2' },
  'factory-matching':   { colorFrom: '#f093fb', colorTo: '#f5576c' },
  'sample-development': { colorFrom: '#4facfe', colorTo: '#00f2fe' },
} as const;
type QuestionType = 'welcome' | 'text' | 'textarea' | 'choice' | 'yesno' | 'contact' | 'complete' | 'image_upload' | 'weight_slider' | 'multi_choice';
interface Question {
  id: string; type: QuestionType; icon?: string;
  title: { ko: string; zh: string };
  subtitle?: { ko: string; zh: string };
  placeholder?: { ko: string; zh: string };
  choices?: { value: string; label: { ko: string; zh: string }; icon?: string }[];
  required?: boolean; optional?: boolean;
  weightKeys?: { key: string; label: { ko: string; zh: string } }[];
}

const MARKET_RESEARCH_QUESTIONS: Question[] = [
  { id: 'welcome', type: 'welcome', icon: '🔍',
    title: { ko: '시장조사 의뢰를\n시작합니다', zh: '开始市场调研\n委托申请' },
    subtitle: { ko: '원하시는 제품의 중국 시장 현황, 가격대, 공장 정보를\n전담 MD가 직접 조사해 드립니다.\n\n약 3~5분이면 완료됩니다 ✨', zh: '专属MD将为您调研所需产品的\n中国市场现状、价格区间及工厂信息。\n\n约3~5分钟即可完成 ✨' } },
  { id: 'product_name', type: 'text', icon: '📦', required: true,
    title: { ko: '어떤 제품을 조사해 드릴까요?', zh: '您需要调研什么产品？' },
    subtitle: { ko: '제품명을 입력해 주세요', zh: '请输入产品名称' },
    placeholder: { ko: '예: 봉제 인형, 아크릴 키링, 보냉백...', zh: '例：毛绒玩具、亚克力钥匙扣、保温袋...' } },
  { id: 'product_desc', type: 'textarea', icon: '📝', required: true,
    title: { ko: '제품을 자세히 설명해 주세요', zh: '请详细描述产品' },
    subtitle: { ko: '크기, 소재, 색상, 수량, 참고 제품 등 구체적일수록 좋습니다', zh: '尺寸、材质、颜色、数量、参考产品等，越详细越好' },
    placeholder: { ko: '예: 높이 20cm 토끼 봉제 인형, 플러시 소재, 파스텔 핑크, 500개 이상 구매 예정...', zh: '例：高20cm兔子毛绒玩具，毛绒材质，粉彩粉色，计划购买500个以上...' } },
  { id: 'product_images', type: 'image_upload', icon: '📸', optional: true,
    title: { ko: '참고 이미지가 있으신가요?', zh: '您有参考图片吗？' },
    subtitle: { ko: '원하시는 제품의 참고 이미지를 첨부해 주시면 더 정확한 조사가 가능합니다 (최대 5장)', zh: '附上参考图片可以帮助我们进行更精准的调研（最多5张）' } },
  { id: 'target_budget', type: 'text', icon: '💰', optional: true,
    title: { ko: '예산 범위가 있으신가요?', zh: '您有预算范围吗？' },
    subtitle: { ko: '대략적인 단가 목표를 알려주시면 맞춤 조사가 가능합니다', zh: '告知大致目标单价，可以进行定制化调研' },
    placeholder: { ko: '예: 개당 ¥3~5, 총 예산 100만원 이내...', zh: '例：每件¥3~5，总预算100万韩元以内...' } },
  { id: 'desired_delivery', type: 'text', icon: '📅', optional: true,
    title: { ko: '희망하는 납기일이 있으신가요?', zh: '您有希望的交货日期吗？' },
    subtitle: { ko: '언제까지 필요하신지 알려주시면 일정에 맞는 공장을 찾아드립니다', zh: '告知需要的时间，我们将为您寻找符合时间要求的工厂' },
    placeholder: { ko: '예: 2025년 8월 이전, 3개월 이내...', zh: '例：2025年8月前，3个月内...' } },
  { id: 'has_sales_exp', type: 'yesno', icon: '🛒',
    title: { ko: '중국 제품을 판매해 본 경험이 있으신가요?', zh: '您有销售中国产品的经验吗？' },
    subtitle: { ko: 'MD가 맞춤 조사 방향을 설정하는 데 도움이 됩니다', zh: '这有助于MD为您制定定制化调研方向' } },
  { id: 'wants_long_term', type: 'yesno', icon: '🤝',
    title: { ko: '장기적인 거래 파트너를 찾고 계신가요?', zh: '您是否在寻找长期合作伙伴？' },
    subtitle: { ko: '장기 거래 희망 시 안정적인 공장 위주로 조사해 드립니다', zh: '如希望长期合作，将优先调研稳定性高的工厂' } },
  { id: 'md_request_note', type: 'textarea', icon: '💬', optional: true,
    title: { ko: 'MD에게 특별히 전달할 내용이 있나요?', zh: '有什么特别想告诉MD的吗？' },
    subtitle: { ko: '조사 시 꼭 확인해 주셨으면 하는 사항을 자유롭게 적어주세요', zh: '请自由填写调研时需要特别确认的事项' },
    placeholder: { ko: '예: 친환경 소재 여부 확인 / 최소 주문 수량 500개 이하 공장만 조사해 주세요...', zh: '例：请确认是否使用环保材料 / 只调研最小订购量500件以下的工厂...' } },
  { id: 'contact', type: 'contact', icon: '👤', required: true,
    title: { ko: '마지막으로 연락처를 알려주세요', zh: '最后，请告诉我们您的联系方式' },
    subtitle: { ko: '전담 MD가 24시간 내에 연락드립니다', zh: '专属MD将在24小时内与您联系' } },
  { id: 'complete', type: 'complete', icon: '🎉',
    title: { ko: '시장조사 의뢰가\n완료되었습니다!', zh: '市场调研委托\n已成功提交！' },
    subtitle: { ko: '전담 MD가 24시간 내에 연락드립니다.\n신청 내역은 마이페이지에서 확인하실 수 있습니다.', zh: '专属MD将在24小时内与您联系。\n申请内容可在我的页面查看。' } },
];

const FACTORY_MATCHING_QUESTIONS: Question[] = [
  { id: 'welcome', type: 'welcome', icon: '🏭',
    title: { ko: '공장매칭 의뢰를\n시작합니다', zh: '开始工厂匹配\n委托申请' },
    subtitle: { ko: '품질·가격·납기·안정성 기준으로 최적의 공장을\n전담 MD가 직접 선별하여 매칭해 드립니다.\n\n약 4~6분이면 완료됩니다 🏭', zh: '专属MD将按品质、价格、交期、稳定性标准\n为您筛选最优工厂进行匹配。\n\n约4~6分钟即可完成 🏭' } },
  { id: 'product_name', type: 'text', icon: '📦', required: true,
    title: { ko: '어떤 제품의 공장을 찾고 계신가요?', zh: '您在寻找什么产品的工厂？' },
    subtitle: { ko: '제품명을 입력해 주세요', zh: '请输入产品名称' },
    placeholder: { ko: '예: 봉제 인형, 아크릴 키링, 부직포 가방...', zh: '例：毛绒玩具、亚克力钥匙扣、无纺布袋...' } },
  { id: 'product_desc', type: 'textarea', icon: '📝', required: true,
    title: { ko: '제품을 자세히 설명해 주세요', zh: '请详细描述产品' },
    subtitle: { ko: '크기, 소재, 색상, 수량, 참고 제품 등 구체적일수록 정확한 공장을 찾을 수 있습니다', zh: '尺寸、材质、颜色、数量、参考产品等，越详细越能找到精准工厂' },
    placeholder: { ko: '예: 높이 15cm, PP 소재 아크릴 키링, 투명 배경에 캐릭터 인쇄, 1000개 이상 주문 예정...', zh: '例：高15cm，PP材质亚克力钥匙扣，透明背景印刷角色，计划订购1000个以上...' } },
  { id: 'product_images', type: 'image_upload', icon: '📸', optional: true,
    title: { ko: '참고 이미지나 디자인 파일이 있으신가요?', zh: '您有参考图片或设计文件吗？' },
    subtitle: { ko: '제품 이미지, 디자인 시안, 참고 샘플 사진 등을 첨부해 주세요 (최대 5장)', zh: '请附上产品图片、设计稿、参考样品照片等（最多5张）' } },
  { id: 'priority', type: 'choice', icon: '⚖️', required: true,
    title: { ko: '공장 선택에서 가장 중요한 것은 무엇인가요?', zh: '选择工厂时，什么最重要？' },
    subtitle: { ko: '우선순위에 맞는 공장을 집중적으로 찾아드립니다', zh: '我们将重点寻找符合您优先级的工厂' },
    choices: [
      { value: 'price',    label: { ko: '가격이 저렴한 공장',   zh: '价格实惠的工厂'   }, icon: '💰' },
      { value: 'quality',  label: { ko: '품질이 우수한 공장',   zh: '品质优秀的工厂'   }, icon: '⭐' },
      { value: 'delivery', label: { ko: '납기가 빠른 공장',     zh: '交期快速的工厂'   }, icon: '🚀' },
      { value: 'stable',   label: { ko: '안정적이고 신뢰할 수 있는 공장', zh: '稳定可信赖的工厂' }, icon: '🛡️' },
    ] },
  { id: 'product_purpose', type: 'choice', icon: '🎯', required: true,
    title: { ko: '이 제품을 어떤 용도로 사용하실 건가요?', zh: '这个产品将用于什么用途？' },
    subtitle: { ko: '용도에 따라 적합한 공장 유형이 달라집니다', zh: '用途不同，适合的工厂类型也不同' },
    choices: [
      { value: 'sale',      label: { ko: '판매용 (온라인/오프라인 판매)',  zh: '销售用（线上/线下销售）'  }, icon: '🛒' },
      { value: 'gift',      label: { ko: '판촉·증정용 (기업 선물, 이벤트)', zh: '促销·赠品用（企业礼品、活动）' }, icon: '🎁' },
      { value: 'personal',  label: { ko: '개인 사용',                      zh: '个人使用'                 }, icon: '👤' },
      { value: 'wholesale', label: { ko: '도매·대리점 운영',               zh: '批发·代理商运营'          }, icon: '🏪' },
    ] },
  { id: 'moq', type: 'text', icon: '📊', optional: true,
    title: { ko: '최소 주문 수량(MOQ)은 어느 정도 생각하고 계신가요?', zh: '您预计的最小订购量（MOQ）是多少？' },
    subtitle: { ko: 'MOQ에 맞는 공장을 찾아드립니다', zh: '我们将为您寻找符合MOQ要求的工厂' },
    placeholder: { ko: '예: 500개, 1000개, 협의 가능...', zh: '例：500件、1000件、可协商...' } },
  { id: 'target_price', type: 'text', icon: '💵', optional: true,
    title: { ko: '희망하는 단가가 있으신가요?', zh: '您有目标单价吗？' },
    subtitle: { ko: '대략적인 가격대를 알려주시면 더 정확한 매칭이 가능합니다', zh: '告知大致价格区间，可以实现更精准的匹配' },
    placeholder: { ko: '예: ¥3~5, ₩600~1,000, 최대한 저렴하게...', zh: '例：¥3~5，尽量便宜...' } },
  { id: 'desired_delivery', type: 'text', icon: '📅', optional: true,
    title: { ko: '희망 납기일 또는 필요 시기가 있으신가요?', zh: '您有希望的交货日期或需要时间吗？' },
    subtitle: { ko: '언제까지 필요하신지 알려주시면 일정에 맞는 공장을 찾아드립니다', zh: '告知需要的时间，我们将为您寻找符合时间要求的工厂' },
    placeholder: { ko: '예: 2025년 8월 이전, 주문 후 30일 이내...', zh: '例：2025年8月前，下单后30天内...' } },
  { id: 'factory_region', type: 'text', icon: '📍', optional: true,
    title: { ko: '희망하는 공장 지역이 있으신가요?', zh: '您有偏好的工厂地区吗？' },
    subtitle: { ko: '특정 지역의 공장을 원하시면 알려주세요', zh: '如果您希望特定地区的工厂，请告知' },
    placeholder: { ko: '예: 광저우, 이우, 상하이, 상관없음...', zh: '例：广州、义乌、上海、不限...' } },
  { id: 'factory_weights', type: 'weight_slider', icon: '⚖️', optional: true,
    title: { ko: '각 항목의 중요도를 설정해 주세요', zh: '请设置各项目的重要程度' },
    subtitle: { ko: 'MD가 공장을 선별할 때 이 우선순위를 반영합니다 (1=낮음, 5=매우 높음)', zh: 'MD在筛选工厂时将参考这些优先级（1=低，5=非常高）' } },
  { id: 'required_certs', type: 'multi_choice', icon: '📜', optional: true,
    title: { ko: '필요한 인증이 있으신가요?', zh: '您需要哪些认证？' },
    subtitle: { ko: '해당하는 인증을 모두 선택해 주세요', zh: '请选择所有需要的认证' },
    choices: [
      { value: 'KC',   label: { ko: 'KC 인증 (한국)',    zh: 'KC认证（韩国）'    }, icon: '🇰🇷' },
      { value: 'CE',   label: { ko: 'CE 인증 (유럽)',    zh: 'CE认证（欧洲）'    }, icon: '🇪🇺' },
      { value: 'FDA',  label: { ko: 'FDA 인증 (미국)',   zh: 'FDA认证（美国）'   }, icon: '🇺🇸' },
      { value: 'JIS',  label: { ko: 'JIS 인증 (일본)',   zh: 'JIS认证（日本）'   }, icon: '🇯🇵' },
      { value: 'ISO',  label: { ko: 'ISO 9001',          zh: 'ISO 9001'          }, icon: '🏆' },
      { value: 'BSCI', label: { ko: 'BSCI (사회책임)',   zh: 'BSCI（社会责任）'  }, icon: '🌱' },
      { value: 'none', label: { ko: '인증 불필요',        zh: '无需认证'          }, icon: '✅' },
    ] },
  { id: 'wants_package', type: 'yesno', icon: '🎨',
    title: { ko: '패키지 디자인도 함께 의뢰하고 싶으신가요?', zh: '您是否也想一起委托包装设计？' },
    subtitle: { ko: '패키지 디자인이 필요하신 경우 함께 진행해 드립니다', zh: '如需包装设计，我们可以一起安排' } },
  { id: 'wants_sample', type: 'yesno', icon: '📬',
    title: { ko: '공장 매칭 후 샘플도 받아보고 싶으신가요?', zh: '工厂匹配后，您是否想收到样品？' },
    subtitle: { ko: '샘플 수령을 원하시면 매칭 완료 후 샘플 개발 서비스로 연결해 드립니다', zh: '如需样品，匹配完成后将为您对接样品开发服务' } },
  { id: 'contact', type: 'contact', icon: '👤', required: true,
    title: { ko: '마지막으로 연락처를 알려주세요', zh: '最后，请告诉我们您的联系方式' },
    subtitle: { ko: '전담 MD가 24시간 내에 연락드립니다', zh: '专属MD将在24小时内与您联系' } },
  { id: 'complete', type: 'complete', icon: '🎉',
    title: { ko: '공장매칭 의뢰가\n완료되었습니다!', zh: '工厂匹配委托\n已成功提交！' },
    subtitle: { ko: '전담 MD가 24시간 내에 연락드립니다.\n신청 내역은 마이페이지에서 확인하실 수 있습니다.', zh: '专属MD将在24小时内与您联系。\n申请内容可在我的页面查看。' } },
];

const SAMPLE_DEVELOPMENT_QUESTIONS: Question[] = [
  { id: 'welcome', type: 'welcome', icon: '📦',
    title: { ko: '샘플개발 의뢰를\n시작합니다', zh: '开始样品开发\n委托申请' },
    subtitle: { ko: '원하시는 제품의 샘플을 제작하고\n한국까지 안전하게 발송해 드립니다.\n\n약 3~5분이면 완료됩니다 📦', zh: '我们将为您制作所需产品的样品，\n安全发货至韩国。\n\n约3~5分钟即可完成 📦' } },
  { id: 'product_name', type: 'text', icon: '📦', required: true,
    title: { ko: '어떤 제품의 샘플을 원하시나요?', zh: '您需要什么产品的样品？' },
    subtitle: { ko: '제품명을 입력해 주세요', zh: '请输入产品名称' },
    placeholder: { ko: '예: 봉제 인형, 아크릴 키링, 보냉백...', zh: '例：毛绒玩具、亚克力钥匙扣、保温袋...' } },
  { id: 'product_desc', type: 'textarea', icon: '📝', required: true,
    title: { ko: '제품을 자세히 설명해 주세요', zh: '请详细描述产品' },
    subtitle: { ko: '크기, 소재, 색상, 디자인 등 구체적일수록 원하시는 샘플을 받으실 수 있습니다', zh: '尺寸、材质、颜色、设计等，越详细越能收到您想要的样品' },
    placeholder: { ko: '예: 높이 20cm 토끼 봉제 인형, 플러시 소재, 파스텔 핑크, 눈은 자수로 처리...', zh: '例：高20cm兔子毛绒玩具，毛绒材质，粉彩粉色，眼睛用刺绣处理...' } },
  { id: 'product_images', type: 'image_upload', icon: '📸', optional: true,
    title: { ko: '참고 이미지나 디자인 파일을 첨부해 주세요', zh: '请附上参考图片或设计文件' },
    subtitle: { ko: '로고, 디자인 시안, 참고 제품 사진 등을 첨부해 주시면 원하시는 샘플을 만들 수 있습니다 (최대 5장)', zh: '附上Logo、设计稿、参考产品照片等，可以制作出您想要的样品（最多5张）' } },
  { id: 'sample_qty', type: 'text', icon: '🔢', required: true,
    title: { ko: '샘플 수량은 몇 개가 필요하신가요?', zh: '您需要多少个样品？' },
    subtitle: { ko: '일반적으로 1~5개를 권장드립니다', zh: '通常建议1~5个' },
    placeholder: { ko: '예: 3개', zh: '例：3件' } },
  { id: 'design_notes', type: 'textarea', icon: '🎨', optional: true,
    title: { ko: '디자인 관련 요청사항이 있으신가요?', zh: '有关于设计的特别要求吗？' },
    subtitle: { ko: '색상, 로고 위치, 특수 인쇄 방법, IP 캐릭터 적용 여부 등을 알려주세요', zh: '请告知颜色、Logo位置、特殊印刷方式、是否应用IP角色等' },
    placeholder: { ko: '예: 로고는 가슴 중앙에 자수, 꼬리 부분은 다른 색상으로 포인트, IP 캐릭터 라이선스 적용 필요...', zh: '例：Logo刺绣在胸部中央，尾部用不同颜色作为点缀，需要应用IP角色授权...' } },
  { id: 'target_price', type: 'text', icon: '💵', optional: true,
    title: { ko: '샘플 단가 목표가 있으신가요?', zh: '您有样品目标单价吗？' },
    subtitle: { ko: '양산 시 희망 단가를 알려주시면 그에 맞는 소재와 공장을 선택해 드립니다', zh: '告知量产时的目标单价，我们将为您选择合适的材料和工厂' },
    placeholder: { ko: '예: 개당 ¥5~8, ₩1,000~1,500...', zh: '例：每件¥5~8，₩1,000~1,500...' } },
  { id: 'desired_delivery', type: 'text', icon: '📅', optional: true,
    title: { ko: '샘플을 언제까지 받고 싶으신가요?', zh: '您希望什么时候收到样品？' },
    subtitle: { ko: '희망 수령 일정을 알려주시면 최대한 맞춰드립니다', zh: '告知希望收到的日期，我们将尽量配合' },
    placeholder: { ko: '예: 2025년 7월 이전, 1개월 이내...', zh: '例：2025年7月前，1个月内...' } },
  { id: 'delivery_address', type: 'textarea', icon: '📍', required: true,
    title: { ko: '샘플을 받으실 주소를 알려주세요', zh: '请告诉我们样品收货地址' },
    subtitle: { ko: '정확한 주소를 입력해 주시면 빠르게 발송해 드립니다', zh: '请输入准确地址，我们将尽快发货' },
    placeholder: { ko: '예: 서울시 강남구 테헤란로 123, ○○빌딩 5층, 홍길동 010-0000-0000', zh: '例：首尔市江南区德黑兰路123号，○○大厦5楼，收件人：홍길동 010-0000-0000' } },
  { id: 'contact', type: 'contact', icon: '👤', required: true,
    title: { ko: '마지막으로 연락처를 알려주세요', zh: '最后，请告诉我们您的联系方式' },
    subtitle: { ko: '전담 MD가 24시간 내에 연락드립니다', zh: '专属MD将在24小时内与您联系' } },
  { id: 'complete', type: 'complete', icon: '🎉',
    title: { ko: '샘플개발 의뢰가\n완료되었습니다!', zh: '样品开发委托\n已成功提交！' },
    subtitle: { ko: '전담 MD가 24시간 내에 연락드립니다.\n신청 내역은 마이페이지에서 확인하실 수 있습니다.', zh: '专属MD将在24小时内与您联系。\n申请内容可在我的页面查看。' } },
];

const QUESTIONS_MAP: Record<ServiceType, Question[]> = {
  'market-research': MARKET_RESEARCH_QUESTIONS,
  'factory-matching': FACTORY_MATCHING_QUESTIONS,
  'sample-development': SAMPLE_DEVELOPMENT_QUESTIONS,
};

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const serviceType = (params?.type as ServiceType) || 'market-research';
  const questions = QUESTIONS_MAP[serviceType] || MARKET_RESEARCH_QUESTIONS;
  const meta = SERVICE_META[serviceType] || SERVICE_META['market-research'];

  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contactData, setContactData] = useState({ name: '', company: '', phone: '', wechat: '', email: '' });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedRequestNo, setSubmittedRequestNo] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [animDir, setAnimDir] = useState<'up' | 'down'>('up');
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.filter(q => q.type !== 'welcome' && q.type !== 'complete').length;
  const answeredCount = questions.filter((q, i) => i < currentIndex && q.type !== 'welcome' && q.type !== 'complete').length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const t = (obj: { ko: string; zh: string }) => obj[lang];

  useEffect(() => {
    const stored = localStorage.getItem('keryx_lang');
    if (stored === 'zh') setLang('zh');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (isAnimating) return;
    const q = questions[currentIndex];
    if (q.required && !answers[q.id] && q.type !== 'contact' && q.type !== 'welcome' && q.type !== 'image_upload') return;
    if (q.type === 'contact') {
      if (!contactData.name || !contactData.phone) return;
    }
    if (currentIndex < questions.length - 1) {
      setAnimDir('up');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setIsAnimating(false);
      }, 300);
    }
  }, [isAnimating, questions, currentIndex, answers, contactData]);

  const goPrev = useCallback(() => {
    if (isAnimating || currentIndex === 0) return;
    setAnimDir('down');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(i => i - 1);
      setIsAnimating(false);
    }, 300);
  }, [isAnimating, currentIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const q = questions[currentIndex];
      if (q.type === 'textarea') return;
      goNext();
    }
  }, [goNext, questions, currentIndex]);

  const handleImageUpload = async (files: FileList) => {
    if (uploadedImages.length >= 5) {
      alert(lang === 'ko' ? '최대 5장까지 첨부 가능합니다.' : '最多可附上5张图片。');
      return;
    }
    setIsUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < Math.min(files.length, 5 - uploadedImages.length); i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/apply/upload-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) newUrls.push(data.url);
      } catch (err) {
        console.error('Image upload error:', err);
      }
    }
    setUploadedImages(prev => [...prev, ...newUrls]);
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: Record<string, unknown> = {
        service_type: serviceType,
        status: 'pending',
        user_id: user?.id || null,
        contact_name: contactData.name,
        company_name: contactData.company || null,
        phone: contactData.phone,
        wechat_id: contactData.wechat || null,
        email: contactData.email || null,
        product_name: answers['product_name'] || null,
        product_desc: answers['product_desc'] || null,
        product_images: uploadedImages.length > 0 ? uploadedImages : null,
        // 시장조사 전용
        has_sales_exp: answers['has_sales_exp'] === 'yes' ? true : answers['has_sales_exp'] === 'no' ? false : null,
        wants_long_term: answers['wants_long_term'] === 'yes' ? true : answers['wants_long_term'] === 'no' ? false : null,
        md_request_note: answers['md_request_note'] || null,
        // 공장매칭 전용
        priority: answers['priority'] || null,
        product_purpose: answers['product_purpose'] || null,
        moq: answers['moq'] || null,
        target_price: answers['target_price'] || null,
        wants_package: answers['wants_package'] === 'yes' ? true : answers['wants_package'] === 'no' ? false : null,
        wants_sample: answers['wants_sample'] === 'yes' ? true : answers['wants_sample'] === 'no' ? false : null,
        factory_region: answers['factory_region'] || null,
        // 가중치 (weight_slider에서 수집)
        weight_price: answers['weight_price'] ? parseInt(answers['weight_price']) : 3,
        weight_quality: answers['weight_quality'] ? parseInt(answers['weight_quality']) : 3,
        weight_delivery: answers['weight_delivery'] ? parseInt(answers['weight_delivery']) : 3,
        weight_stability: answers['weight_stability'] ? parseInt(answers['weight_stability']) : 3,
        weight_communication: answers['weight_communication'] ? parseInt(answers['weight_communication']) : 3,
        weight_certification: answers['weight_certification'] ? parseInt(answers['weight_certification']) : 3,
        // 인증 요구사항 (multi_choice에서 수집)
        required_certs: answers['required_certs'] ? JSON.parse(answers['required_certs'] || '[]') : [],
        need_ip_audit: answers['required_certs'] ? JSON.parse(answers['required_certs'] || '[]').includes('IP_AUDIT') : false,
        // 품질 등급
        quality_grade: answers['quality_grade'] || null,
        // 신규 필드
        desired_delivery: answers['desired_delivery'] || null,
        product_category: answers['product_name'] || null,
        // 샘플개발 전용
        sample_qty: answers['sample_qty'] || null,
        design_notes: answers['design_notes'] || null,
        delivery_address: answers['delivery_address'] || null,
        // 공통 추가 필드 (DB에 없으면 md_request_note에 합산)
        // target_budget, desired_delivery는 md_request_note에 추가
      };

      // target_budget, desired_delivery를 md_request_note에 합산
      const extras: string[] = [];
      if (answers['target_budget']) extras.push(`예산: ${answers['target_budget']}`);
      if (answers['desired_delivery']) extras.push(`희망납기: ${answers['desired_delivery']}`);
      if (extras.length > 0) {
        payload['md_request_note'] = [payload['md_request_note'], ...extras].filter(Boolean).join('\n');
      }

      // null 값 제거
      Object.keys(payload).forEach(k => {
        if (payload[k] === null || payload[k] === undefined || payload[k] === '') delete payload[k];
      });

      const res = await fetch('/api/apply/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        const errMsg = result.error || result.details || '알 수 없는 오류';
        console.error('[apply] submit error:', result);
        throw new Error(errMsg);
      }
      setSubmittedId(result.id || 'done');
      setSubmittedRequestNo(result.request_no || null);
      // 로그인 여부 확인
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setIsLoggedIn(!!currentUser);
      setAnimDir('up');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(questions.length - 1);
        setIsAnimating(false);
      }, 300);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(lang === 'ko'
        ? '제출 중 오류가 발생했습니다.\n오류: ' + errMsg
        : '提交时发生错误。\n错误: ' + errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceLabels: Record<ServiceType, { ko: string; zh: string }> = {
    'market-research':    { ko: '시장조사', zh: '市场调研' },
    'factory-matching':   { ko: '공장매칭', zh: '工厂匹配' },
    'sample-development': { ko: '샘플개발', zh: '样品开发' },
  };

  const isNextDisabled = () => {
    const q = currentQ;
    if (q.type === 'welcome' || q.type === 'complete' || q.optional || q.type === 'image_upload') return false;
    if (q.type === 'contact') return !contactData.name || !contactData.phone;
    if (q.type === 'yesno' || q.type === 'choice') return !answers[q.id];
    if (q.required) return !answers[q.id]?.trim();
    return false;
  };

  const animClass = isAnimating
    ? animDir === 'up' ? 'translate-y-8 opacity-0' : '-translate-y-8 opacity-0'
    : 'translate-y-0 opacity-100';

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${meta.colorFrom} 0%, ${meta.colorTo} 100%)` }}
      onKeyDown={handleKeyDown}
    >
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white/90 text-sm font-medium">{t(serviceLabels[serviceType])}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newLang = lang === 'ko' ? 'zh' : 'ko';
              setLang(newLang);
              localStorage.setItem('keryx_lang', newLang);
            }}
            className="text-white/80 hover:text-white text-xs border border-white/30 rounded-full px-3 py-1 transition-colors"
          >
            {lang === 'ko' ? '中文' : '한국어'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {currentQ.type !== 'welcome' && currentQ.type !== 'complete' && (
        <div className="fixed top-12 left-0 right-0 z-40 h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center pt-16 pb-24 px-4">
        <div className={`w-full max-w-2xl transition-all duration-300 ease-out ${animClass}`}>

          {/* Welcome screen */}
          {currentQ.type === 'welcome' && (
            <div className="text-center text-white">
              <div className="text-6xl mb-6">{currentQ.icon}</div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 whitespace-pre-line leading-tight">
                {t(currentQ.title)}
              </h1>
              {currentQ.subtitle && (
                <p className="text-white/80 text-base md:text-lg mb-10 whitespace-pre-line leading-relaxed">
                  {t(currentQ.subtitle)}
                </p>
              )}
              {/* 견적 의뢰 가이드 */}
              <div className="mb-8 rounded-2xl bg-white/10 border border-white/20 p-6 text-left max-w-md mx-auto">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-4">
                  {lang === 'ko' ? '📋 입력 준비 가이드' : '📋 填写准备指南'}
                </p>
                <div className="space-y-3">
                  {(lang === 'ko' ? [
                    { step: '1', text: '제품명 또는 카테고리 (예: 봉제 인형, 아크릴 키링)' },
                    { step: '2', text: '원하는 사이즈·소재·색상 등 기본 사양' },
                    { step: '3', text: '예상 주문 수량 또는 예산 범위' },
                    { step: '4', text: '참고 이미지가 있으면 업로드 가능 (선택)' },
                  ] : [
                    { step: '1', text: '产品名称或类别（例：毛绒玩具、亚克力钥匙扣）' },
                    { step: '2', text: '所需尺寸、材质、颜色等基本规格' },
                    { step: '3', text: '预计订购数量或预算范围' },
                    { step: '4', text: '如有参考图片可上传（可选）' },
                  ]).map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-gray-900 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{item.step}</span>
                      <span className="text-sm text-white/80">{item.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-4">
                  {lang === 'ko' ? '* 모르는 항목은 건너뛰어도 됩니다. KERYX MD가 확인 후 연락드립니다.' : '* 不知道的项目可以跳过。KERYX MD确认后会与您联系。'}
                </p>
              </div>
              <button
                onClick={goNext}
                className="bg-white text-gray-800 font-bold text-lg px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
              >
                {lang === 'ko' ? '시작하기 →' : '开始 →'}
              </button>
            </div>
          )}

          {/* Complete screen */}
          {currentQ.type === 'complete' && (
            <div className="text-center text-white">
              <div className="text-6xl mb-6 animate-bounce">{currentQ.icon}</div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 whitespace-pre-line leading-tight">
                {t(currentQ.title)}
              </h1>
              {currentQ.subtitle && (
                <p className="text-white/80 text-base md:text-lg mb-4 whitespace-pre-line leading-relaxed">
                  {t(currentQ.subtitle)}
                </p>
              )}
              {/* 신청번호 표시 */}
              {submittedRequestNo && (
                <div className="bg-white/10 rounded-xl px-5 py-3 mb-4 inline-block">
                  <p className="text-white/60 text-xs mb-1">{lang === 'ko' ? '신청번호' : '申请编号'}</p>
                  <p className="text-white font-mono font-bold text-base">{submittedRequestNo}</p>
                  <p className="text-white/50 text-xs mt-1">{lang === 'ko' ? '이 번호로 언제든지 현황을 조회할 수 있습니다' : '您可以随时使用此编号查询申请状态'}</p>
                </div>
              )}
              {/* 비로그인 시 로그인 유도 */}
              {!isLoggedIn && (
                <div className="bg-white/10 rounded-xl px-5 py-3 mb-5 text-left">
                  <p className="text-white font-bold text-sm mb-1">💡 {lang === 'ko' ? '로그인하면 더 편리합니다!' : '登录后更方便！'}</p>
                  <p className="text-white/70 text-xs">{lang === 'ko' ? '로그인하면 신청 현황을 실시간으로 확인하고 MD와 직접 소통할 수 있습니다.' : '登录后可实时查看申请状态，并与MD直接沟通。'}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isLoggedIn ? (
                  <button
                    onClick={() => router.push('/seller/service-requests')}
                    className="bg-white text-gray-800 font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    {lang === 'ko' ? '신청 내역 확인' : '查看申请记录'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => submittedRequestNo && router.push(`/apply/status?no=${encodeURIComponent(submittedRequestNo)}`)}
                      disabled={!submittedRequestNo}
                      className="bg-white text-gray-800 font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {lang === 'ko' ? '신청 현황 조회' : '查看申请状态'}
                    </button>
                    <button
                      onClick={() => router.push('/login?role=seller')}
                      className="bg-white/20 text-white font-bold px-8 py-3 rounded-xl border border-white/50 hover:bg-white/30 transition-all"
                    >
                      {lang === 'ko' ? '로그인하기' : '立即登录'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push('/')}
                  className="bg-white/10 text-white font-medium px-8 py-3 rounded-xl border border-white/20 hover:bg-white/20 transition-all"
                >
                  {lang === 'ko' ? '홈으로' : '返回首页'}
                </button>
              </div>
            </div>
          )}

          {/* Text input */}
          {currentQ.type === 'text' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={answers[currentQ.id] || ''}
                onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
                placeholder={currentQ.placeholder ? t(currentQ.placeholder) : ''}
                className="w-full bg-transparent border-b-2 border-white/50 focus:border-white text-white text-xl py-3 outline-none placeholder-white/40 transition-colors"
              />
              {currentQ.placeholder && (
                <div className="mt-4 rounded-xl bg-white/10 border border-white/20 px-4 py-3">
                  <p className="text-xs font-bold text-amber-300 mb-1">
                    {lang === 'ko' ? '💡 입력 예시' : '💡 输入示例'}
                  </p>
                  <p className="text-sm text-white/70">{currentQ.placeholder ? t(currentQ.placeholder) : ''}</p>
                </div>
              )}
              <p className="text-white/50 text-xs mt-2">
                {lang === 'ko' ? 'Enter를 눌러 다음으로 →' : '按Enter继续 →'}
              </p>
            </div>
          )}

          {/* Textarea */}
          {currentQ.type === 'textarea' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={answers[currentQ.id] || ''}
                onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
                placeholder={currentQ.placeholder ? t(currentQ.placeholder) : ''}
                rows={4}
                className="w-full bg-white/10 border border-white/30 focus:border-white rounded-xl text-white text-base p-4 outline-none placeholder-white/40 resize-none transition-colors"
              />
              {currentQ.placeholder && (
                <div className="mt-3 rounded-xl bg-white/10 border border-white/20 px-4 py-3">
                  <p className="text-xs font-bold text-amber-300 mb-1">
                    {lang === 'ko' ? '💡 입력 예시' : '💡 输入示例'}
                  </p>
                  <p className="text-sm text-white/70">{currentQ.placeholder ? t(currentQ.placeholder) : ''}</p>
                </div>
              )}
              <p className="text-white/50 text-xs mt-2">
                {lang === 'ko' ? 'Shift+Enter로 줄바꿈, 아래 버튼으로 다음 →' : 'Shift+Enter换行，点击下方按钮继续 →'}
              </p>
            </div>
          )}

          {/* Image Upload */}
          {currentQ.type === 'image_upload' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}

              {/* 업로드된 이미지 미리보기 */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {uploadedImages.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/10">
                      <img src={url} alt={`uploaded-${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 업로드 버튼 */}
              {uploadedImages.length < 5 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && handleImageUpload(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full border-2 border-dashed border-white/40 rounded-xl p-8 text-center hover:border-white/70 hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        <span className="text-white/70 text-sm">{lang === 'ko' ? '업로드 중...' : '上传中...'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📎</span>
                        <span className="text-white font-medium">{lang === 'ko' ? '이미지 첨부하기' : '附上图片'}</span>
                        <span className="text-white/50 text-xs">{lang === 'ko' ? `JPG, PNG, WEBP (최대 10MB, ${5 - uploadedImages.length}장 더 추가 가능)` : `JPG, PNG, WEBP（最大10MB，还可添加${5 - uploadedImages.length}张）`}</span>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {uploadedImages.length > 0 && (
                <p className="text-white/60 text-xs mt-3 text-center">
                  {lang === 'ko' ? `${uploadedImages.length}장 첨부됨` : `已附上${uploadedImages.length}张`}
                </p>
              )}
            </div>
          )}

          {/* Choice */}
          {currentQ.type === 'choice' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.choices?.map(choice => (
                  <button
                    key={choice.value}
                    onClick={() => {
                      setAnswers(a => ({ ...a, [currentQ.id]: choice.value }));
                      setTimeout(goNext, 300);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      answers[currentQ.id] === choice.value
                        ? 'bg-white text-gray-800 border-white shadow-lg scale-105'
                        : 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/60'
                    }`}
                  >
                    <span className="text-2xl">{choice.icon}</span>
                    <span className="font-medium text-sm md:text-base">{t(choice.label)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* Weight Slider */}
          {currentQ.type === 'weight_slider' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}
              <div className="space-y-5">
                {(currentQ.weightKeys || [
                  { key: 'weight_price',        label: { ko: '💰 가격 (저렴한 단가)',        zh: '💰 价格（低单价）' } },
                  { key: 'weight_quality',       label: { ko: '⭐ 품질 (제품 완성도)',         zh: '⭐ 品质（产品完成度）' } },
                  { key: 'weight_delivery',      label: { ko: '🚀 납기 (빠른 생산·발송)',      zh: '🚀 交期（快速生产·发货）' } },
                  { key: 'weight_stability',     label: { ko: '🛡️ 안정성 (장기 거래 신뢰)',    zh: '🛡️ 稳定性（长期合作信赖）' } },
                  { key: 'weight_communication', label: { ko: '💬 소통 (빠른 응대·정확한 이해)', zh: '💬 沟通（快速响应·准确理解）' } },
                  { key: 'weight_certification', label: { ko: '📜 인증 (KC·CE·FDA 등)',         zh: '📜 认证（KC·CE·FDA等）' } },
                ]).map(item => (
                  <div key={item.key} className="flex items-center gap-3">
                    <span className="text-sm w-44 flex-shrink-0 leading-tight">{t(item.label)}</span>
                    <input
                      type="range" min="1" max="5"
                      value={answers[item.key] || '3'}
                      onChange={e => setAnswers(a => ({ ...a, [item.key]: e.target.value }))}
                      className="flex-1 accent-amber-400 h-2 cursor-pointer"
                    />
                    <span className="text-amber-400 font-bold w-6 text-center text-lg">{answers[item.key] || '3'}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-xs mt-4">
                {lang === 'ko' ? '1 = 중요하지 않음, 5 = 매우 중요함' : '1 = 不重要，5 = 非常重要'}
              </p>
            </div>
          )}

          {/* Multi Choice */}
          {currentQ.type === 'multi_choice' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}
              <div className="grid grid-cols-2 gap-3">
                {(currentQ.choices || []).map(choice => {
                  const selected: string[] = (() => {
                    try { return answers[currentQ.id] ? JSON.parse(answers[currentQ.id]) : []; }
                    catch { return []; }
                  })();
                  const isSelected = selected.includes(choice.value);
                  return (
                    <button
                      key={choice.value}
                      onClick={() => {
                        const cur: string[] = (() => {
                          try { return answers[currentQ.id] ? JSON.parse(answers[currentQ.id]) : []; }
                          catch { return []; }
                        })();
                        const next = isSelected ? cur.filter(v => v !== choice.value) : [...cur, choice.value];
                        setAnswers(a => ({ ...a, [currentQ.id]: JSON.stringify(next) }));
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? 'bg-amber-400 text-gray-900 border-amber-400 shadow-lg'
                          : 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/60'
                      }`}
                    >
                      <span className="text-xl">{choice.icon}</span>
                      <span className="text-sm font-medium">{t(choice.label)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-white/50 text-xs mt-4">
                {lang === 'ko' ? '해당하는 항목을 모두 선택해 주세요' : '请选择所有适用的选项'}
              </p>
            </div>
          )}

          {/* Yes/No */}
          {currentQ.type === 'yesno' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}
              <div className="flex gap-4">
                {[
                  { value: 'yes', label: { ko: '네', zh: '是' }, icon: '👍' },
                  { value: 'no', label: { ko: '아니요', zh: '否' }, icon: '👎' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setAnswers(a => ({ ...a, [currentQ.id]: opt.value }));
                      setTimeout(goNext, 300);
                    }}
                    className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 ${
                      answers[currentQ.id] === opt.value
                        ? 'bg-white text-gray-800 border-white shadow-lg scale-105'
                        : 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/60'
                    }`}
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <span className="font-bold text-base">{t(opt.label)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {currentQ.type === 'contact' && (
            <div className="text-white">
              <div className="text-4xl mb-4">{currentQ.icon}</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{t(currentQ.title)}</h2>
              {currentQ.subtitle && <p className="text-white/70 mb-6 text-sm md:text-base">{t(currentQ.subtitle)}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'name',    label: { ko: '이름 *',    zh: '姓名 *'    }, type: 'text',  required: true  },
                  { key: 'company', label: { ko: '회사명',    zh: '公司名称'  }, type: 'text',  required: false },
                  { key: 'phone',   label: { ko: '전화번호 *', zh: '电话号码 *' }, type: 'tel',   required: true  },
                  { key: 'wechat',  label: { ko: '위챗 ID',   zh: '微信ID'    }, type: 'text',  required: false },
                  { key: 'email',   label: { ko: '이메일',    zh: '邮箱'      }, type: 'email', required: false },
                ].map(field => (
                  <div key={field.key} className={field.key === 'email' ? 'sm:col-span-2' : ''}>
                    <label className="block text-white/70 text-xs mb-1">{t(field.label)}</label>
                    <input
                      type={field.type}
                      value={contactData[field.key as keyof typeof contactData]}
                      onChange={e => setContactData(d => ({ ...d, [field.key]: e.target.value }))}
                      className="w-full bg-white/10 border border-white/30 focus:border-white rounded-lg text-white text-sm px-3 py-2.5 outline-none placeholder-white/30 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      {currentQ.type !== 'welcome' && currentQ.type !== 'complete' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 bg-black/20 backdrop-blur-sm">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="text-white/70 hover:text-white disabled:opacity-30 transition-colors flex items-center gap-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {lang === 'ko' ? '이전' : '上一步'}
          </button>

          <span className="text-white/60 text-xs">
            {answeredCount} / {totalQuestions}
          </span>

          {currentQ.type === 'contact' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !contactData.name || !contactData.phone}
              className="bg-white text-gray-800 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all text-sm"
            >
              {isSubmitting
                ? (lang === 'ko' ? '제출 중...' : '提交中...')
                : (lang === 'ko' ? '의뢰 제출 ✓' : '提交委托 ✓')}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={isNextDisabled()}
              className="bg-white text-gray-800 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all text-sm flex items-center gap-1"
            >
              {currentQ.type === 'image_upload' || (currentQ.optional && !answers[currentQ.id])
                ? (lang === 'ko' ? '건너뛰기 →' : '跳过 →')
                : (lang === 'ko' ? '다음 →' : '下一步 →')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
