'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

type Lang = 'ko' | 'zh';

const texts = {
  ko: {
    hero_badge: 'IP 라이선스 무료 제공',
    hero_title: 'KERYX IP를\n무료로 사용하세요',
    hero_desc: 'KERYX는 자체 개발 IP를 유통업체에 무료로 제공합니다. 독점 또는 공동 판매 계약을 통해 함께 성장하는 파트너십을 제안합니다.',
    how_title: '이용 방법',
    step1_title: '라이선스 약관 동의',
    step1_desc: '무료 라이선스 이용 약관을 확인하고 동의합니다.',
    step2_title: '에셋 다운로드',
    step2_desc: '캐릭터별 스타일 가이드(PDF)와 고해상도 이미지(PNG/AI)를 다운로드합니다.',
    step3_title: '굿즈 제작 의뢰',
    step3_desc: '다운로드한 에셋으로 바로 굿즈 제작을 의뢰할 수 있습니다.',
    license_title: '무료 라이선스 약관',
    license_terms: [
      'KERYX IP 캐릭터는 B2B 파트너에게 무료로 제공됩니다.',
      '상업적 사용 시 KERYX를 통한 제조를 권장합니다.',
      '캐릭터의 원본 디자인을 임의로 변형할 수 없습니다.',
      '라이선스는 독점 또는 공동 판매 형태로 협의 가능합니다.',
      '사업자등록증 확인 후 정식 파트너 계약을 체결합니다.',
    ],
    agree_btn: '약관에 동의하고 에셋 다운로드',
    agreed_msg: '라이선스 동의 완료! 아래에서 에셋을 다운로드하세요.',
    download_title: '캐릭터 에셋 다운로드',
    style_guide: '스타일 가이드 (PDF)',
    hi_res: '고해상도 이미지 (PNG)',
    vector: '벡터 파일 (AI/SVG)',
    all_pack: '전체 에셋 팩',
    section_collab: '라이선스 협업 IP',
    section_collab_desc: '글로벌 캐릭터 IP와의 공식 라이선스 협업 상품도 제작합니다.',
    cta_title: '바로 굿즈 제작을 시작하세요',
    cta_desc: '다운로드한 IP 에셋으로 인형, 키링, 가방고리 등 다양한 굿즈를 제작할 수 있습니다.',
    cta_btn: '견적 의뢰하기',
    contact_btn: '파트너 상담',
    login_required: '에셋 다운로드를 위해 회원가입이 필요합니다.',
    login_btn: '회원가입 / 로그인',
  },
  zh: {
    hero_badge: 'IP授权免费提供',
    hero_title: '免费使用\nKERYX IP',
    hero_desc: 'KERYX向分销商免费提供自主开发的IP。通过独家或共同销售合同，提出共同成长的合作伙伴关系。',
    how_title: '使用方法',
    step1_title: '同意授权条款',
    step1_desc: '确认并同意免费授权使用条款。',
    step2_title: '下载素材',
    step2_desc: '下载各角色的风格指南(PDF)和高分辨率图片(PNG/AI)。',
    step3_title: '委托制作商品',
    step3_desc: '使用下载的素材可直接委托制作商品。',
    license_title: '免费授权条款',
    license_terms: [
      'KERYX IP角色免费提供给B2B合作伙伴。',
      '商业使用时建议通过KERYX进行制造。',
      '不得擅自修改角色的原始设计。',
      '授权可协商独家或共同销售形式。',
      '确认营业执照后签订正式合作协议。',
    ],
    agree_btn: '同意条款并下载素材',
    agreed_msg: '授权同意完成！请在下方下载素材。',
    download_title: '角色素材下载',
    style_guide: '风格指南 (PDF)',
    hi_res: '高分辨率图片 (PNG)',
    vector: '矢量文件 (AI/SVG)',
    all_pack: '全部素材包',
    section_collab: '授权合作IP',
    section_collab_desc: '也制作与全球角色IP的官方授权合作商品。',
    cta_title: '立即开始制作商品',
    cta_desc: '使用下载的IP素材可制作玩偶、钥匙扣、包挂件等各种商品。',
    cta_btn: '申请报价',
    contact_btn: '合作咨询',
    login_required: '下载素材需要注册会员。',
    login_btn: '注册 / 登录',
  },
};

const IP_ASSETS = [
  { id: 'ppuji', name_ko: '뿌찌프랜즈', name_zh: '噗奇朋友', image: '/images/ip-characters/ppuji/dangppu.webp', color: 'from-pink-500 to-rose-400', border: 'border-pink-200', bg: 'bg-pink-50', characters: 8, tier: 'A' },
  { id: 'dinomon', name_ko: '디노몬', name_zh: '恐龙萌', image: '/images/ip-characters/dinomon/tino.png', color: 'from-emerald-500 to-teal-400', border: 'border-emerald-200', bg: 'bg-emerald-50', characters: 30, tier: 'A' },
  { id: 'duckle', name_ko: '길덕이 / Duckle', name_zh: '鸭克 / Duckle', image: '/images/ip-characters/duckle/duckle-front.png', color: 'from-yellow-400 to-amber-300', border: 'border-yellow-200', bg: 'bg-yellow-50', characters: 1, tier: 'A' },
  { id: 'hamihot', name_ko: '하미핫', name_zh: '哈米热', color: 'from-rose-400 to-pink-400', border: 'border-rose-200', bg: 'bg-rose-50', characters: 1, tier: 'A' },
  { id: 'kkokomi', name_ko: '꼬꼬미 / 우주 몬스터', name_zh: '咕咕米 / 宇宙怪兽', color: 'from-violet-500 to-purple-400', border: 'border-violet-200', bg: 'bg-violet-50', characters: 6, tier: 'A' },
  { id: 'future-joseon', name_ko: '미래 조선', name_zh: '未来朝鲜', color: 'from-indigo-500 to-blue-400', border: 'border-indigo-200', bg: 'bg-indigo-50', characters: 18, tier: 'A' },
  { id: 'single-ear', name_ko: '한쪽 귀·하트 꼬리', name_zh: '单耳·心尾', color: 'from-cyan-500 to-teal-400', border: 'border-cyan-200', bg: 'bg-cyan-50', characters: 6, tier: 'A' },
  { id: 'inyeoseok', name_ko: '이녀석 / 낙서 생명체', name_zh: '涂鸦生命体', color: 'from-gray-600 to-gray-700', border: 'border-gray-200', bg: 'bg-gray-50', characters: 18, tier: 'A' },
  { id: 'duckle-samguk', name_ko: '길덕 삼국지 500', name_zh: '鸭克三国志500', color: 'from-red-500 to-orange-400', border: 'border-red-200', bg: 'bg-red-50', characters: 20, tier: 'A' },
  { id: 'piggly', name_ko: '피글리', name_zh: '皮咕粒', color: 'from-pink-300 to-pink-400', border: 'border-pink-200', bg: 'bg-pink-50', characters: 2, tier: 'B' },
  { id: 'bread-village', name_ko: '빵 마을', name_zh: '面包村', color: 'from-yellow-400 to-amber-400', border: 'border-yellow-200', bg: 'bg-yellow-50', characters: 8, tier: 'B' },
  { id: 'dot', name_ko: 'DOT', name_zh: 'DOT', color: 'from-gray-500 to-gray-600', border: 'border-gray-200', bg: 'bg-gray-50', characters: 4, tier: 'B' },
  { id: 'mood-district', name_ko: 'MOOD DISTRICT', name_zh: 'MOOD DISTRICT', color: 'from-sky-400 to-blue-400', border: 'border-sky-200', bg: 'bg-sky-50', characters: 3, tier: 'B' },
  { id: 'sweet-ant', name_ko: 'Sweet Ant Kingdom', name_zh: '甜蜜蚂蚁王国', color: 'from-amber-400 to-orange-400', border: 'border-amber-200', bg: 'bg-amber-50', characters: 9, tier: 'B' },
  { id: 'healing-pets', name_ko: '힐링 펫츠', name_zh: '治愈宠物', color: 'from-teal-300 to-green-400', border: 'border-teal-200', bg: 'bg-teal-50', characters: 4, tier: 'B' },
  { id: 'simkung', name_ko: '심쿵빵곰', name_zh: '心动面包熊', color: 'from-rose-300 to-amber-300', border: 'border-rose-200', bg: 'bg-rose-50', characters: 1, tier: 'B' },
];

const COLLAB_IPS = [
  { name_ko: 'PINGU 시즌 상품', name_zh: 'PINGU季节商品', partner: 'PINGU License', status_ko: '개발 중', status_zh: '开发中', color: 'from-blue-500 to-cyan-500' },
  { name_ko: 'Hello Kitty 쿨링팩', name_zh: 'Hello Kitty冷却包', partner: 'Sanrio', status_ko: '개발 중', status_zh: '开发中', color: 'from-pink-500 to-rose-400' },
  { name_ko: 'Sanrio 생활소품', name_zh: 'Sanrio生活小物', partner: 'Sanrio', status_ko: '개발 중', status_zh: '开发中', color: 'from-red-400 to-pink-400' },
  { name_ko: '짱구 골프 컬래버레이션', name_zh: '蜡笔小新高尔夫联名', partner: 'Crayon Shin-chan', status_ko: '기획 중', status_zh: '策划中', color: 'from-yellow-500 to-orange-400' },
  { name_ko: 'TaylorMade 양 커버', name_zh: 'TaylorMade羊套', partner: 'TaylorMade', status_ko: '개발 중', status_zh: '开发中', color: 'from-gray-700 to-gray-900' },
];

export default function IPLicensePage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const t = texts[lang];

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-white">
        {/* 언어 전환 */}
        <div className="fixed top-20 right-4 z-40 flex gap-1 bg-white/90 backdrop-blur rounded-full border px-1 py-1 shadow-sm">
          <button onClick={() => setLang('ko')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${lang === 'ko' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>KO</button>
          <button onClick={() => setLang('zh')} className={`px-3 py-1 rounded-full text-xs font-bold transition ${lang === 'zh' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>ZH</button>
        </div>

        {/* 히어로 */}
        <section className="relative py-24 md:py-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-5xl mx-auto px-6 text-center">
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-2 bg-white/20 backdrop-blur rounded-full">{t.hero_badge}</span>
            <h1 className="text-4xl md:text-6xl font-black whitespace-pre-line leading-tight">{t.hero_title}</h1>
            <p className="text-lg md:text-xl text-white/80 mt-6 max-w-2xl mx-auto">{t.hero_desc}</p>
          </div>
        </section>

        {/* 이용 방법 3단계 */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-12">{t.how_title}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { num: '01', title: t.step1_title, desc: t.step1_desc },
                { num: '02', title: t.step2_title, desc: t.step2_desc },
                { num: '03', title: t.step3_title, desc: t.step3_desc },
              ].map((step) => (
                <div key={step.num} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">{step.num}</div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 라이선스 약관 동의 */}
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-8">{t.license_title}</h2>
            
            {!agreed ? (
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <ul className="space-y-4 mb-8">
                  {t.license_terms.map((term, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-gray-700">{term}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { setAgreed(true); setShowTerms(true); }}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition text-lg"
                >
                  {t.agree_btn}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">&#x2705;</div>
                <p className="text-green-800 font-bold">{t.agreed_msg}</p>
              </div>
            )}
          </div>
        </section>

        {/* 에셋 다운로드 섹션 */}
        {agreed && (
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-2xl md:text-3xl font-black text-center mb-12">{t.download_title}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {IP_ASSETS.map((ip) => (
                  <div key={ip.id} className={`rounded-2xl border ${ip.border} overflow-hidden ${ip.bg}`}>
                    <div className={`h-36 bg-gradient-to-br ${ip.color} flex items-center justify-center relative`}>
                      {ip.image ? (
                        <Image src={ip.image} alt={lang === 'zh' ? ip.name_zh : ip.name_ko} width={90} height={90} className="object-contain drop-shadow-lg" />
                      ) : (
                        <span className="text-white text-4xl font-bold opacity-60">{ip.name_ko.charAt(0)}</span>
                      )}
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold ${ip.tier === 'A' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{ip.tier}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold mb-1">{lang === 'zh' ? ip.name_zh : ip.name_ko}</h3>
                      <p className="text-xs text-gray-500 mb-3">{ip.characters}{lang === 'ko' ? '종 캐릭터' : '种角色'}</p>
                      <div className="space-y-1.5">
                        <button className="w-full py-1.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition">{t.style_guide}</button>
                        <button className="w-full py-1.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition">{t.hi_res}</button>
                        <button className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-xs font-bold hover:opacity-90 transition">{t.all_pack}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 라이선스 협업 IP */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-black mb-4">{t.section_collab}</h2>
              <p className="text-lg text-gray-600">{t.section_collab_desc}</p>
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              {COLLAB_IPS.map((collab, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${collab.color} flex items-center justify-center text-white font-bold text-sm mb-3`}>
                    {collab.partner.charAt(0)}
                  </div>
                  <div className="font-bold text-gray-900 text-sm mb-1">{lang === 'ko' ? collab.name_ko : collab.name_zh}</div>
                  <div className="text-xs text-gray-500 mb-2">{collab.partner}</div>
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                    {lang === 'ko' ? collab.status_ko : collab.status_zh}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-black mb-4">{t.cta_title}</h2>
            <p className="text-gray-300 text-lg mb-8">{t.cta_desc}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quote" className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition text-lg">
                {t.cta_btn}
              </Link>
              <Link href="/about" className="px-8 py-4 border border-white/30 text-white font-medium rounded-full hover:bg-white/10 transition text-lg">
                {t.contact_btn}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
