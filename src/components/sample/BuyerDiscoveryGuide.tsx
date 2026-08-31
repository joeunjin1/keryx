'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, BellRing, Building2, ClipboardCheck, LockKeyhole, PackageSearch } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';

const copy = {
  ko: {
    eyebrow: 'APPROVED BUYER DISCOVERY',
    title: '검증된 바이어에게만 신상품·샘플을 제공합니다.',
    description: 'KERYX가 검토해 게시한 신상품과 샘플은 회사 인증 및 구독 승인이 완료된 바이어 전용 피드에서 확인할 수 있습니다. 게시 후 14일이 지난 신상품은 피드에서 자동으로 보이지 않습니다.',
    primary: '회사 인증 시작하기',
    secondary: '이미 바이어 계정이 있습니다',
    processTitle: '이용 절차',
    process: [
      ['바이어 계정으로 로그인', '회사별 접근 권한을 안전하게 연결합니다.'],
      ['회사 정보·사업자등록증 제출', '필수 회사 정보를 작성하고 검토용 증빙을 비공개로 제출합니다.'],
      ['운영팀 검토·승인', '승인된 회사에만 신상품·샘플 구독 접근을 활성화합니다.'],
      ['최근 신상품·샘플 확인', '게시일 기준 14일 이내의 검토된 항목만 피드에서 열람합니다.'],
    ],
    policyTitle: '운영 원칙',
    policy: [
      ['승인 바이어 전용', '로그인만으로는 열람할 수 없으며, 회사 인증과 구독 승인이 모두 필요합니다.'],
      ['최근 정보 중심', '만료된 게시물을 삭제하지 않고 피드에서만 숨겨 최신 검토 대상을 명확히 합니다.'],
      ['민감 정보 보호', '사업자등록증은 공개하지 않으며 인증 담당자만 검토 목적으로 접근합니다.'],
    ],
    signupPrompt: '바이어 계정이 없으신가요?',
    signup: '바이어 회원가입',
    ip: '자체 디자인 IP 보기',
  },
  zh: {
    eyebrow: 'APPROVED BUYER DISCOVERY',
    title: '仅向已验证买家提供新品与样品。',
    description: '由 KERYX 审核后发布的新品和样品仅可在已完成企业认证与订阅审批的买家专属信息流中查看。发布超过 14 天的新品会自动从信息流中隐藏。',
    primary: '开始企业认证',
    secondary: '我已有买家账户',
    processTitle: '使用流程',
    process: [
      ['使用买家账户登录', '安全连接企业专属访问权限。'],
      ['提交企业信息与营业执照', '填写必填企业资料，并以非公开方式提交审核证明。'],
      ['运营团队审核与批准', '仅为获批企业启用新品与样品订阅访问。'],
      ['查看最新新品与样品', '信息流仅展示按发布日期计算未超过 14 天的审核内容。'],
    ],
    policyTitle: '运营原则',
    policy: [
      ['仅限获批买家', '仅登录无法访问，企业认证和订阅审批均为必需。'],
      ['聚焦最新信息', '过期内容不会删除，只会从信息流隐藏，确保当前审核目标清晰。'],
      ['保护敏感信息', '营业执照不会公开，仅由认证审核人员用于审核目的。'],
    ],
    signupPrompt: '还没有买家账户？',
    signup: '买家注册',
    ip: '查看原创 IP',
  },
};

const processIcons = [LockKeyhole, Building2, ClipboardCheck, PackageSearch];
const policyIcons = [BadgeCheck, BellRing, LockKeyhole];

export function BuyerDiscoveryGuide() {
  const { lang } = useLangContext();
  const t = copy[lang];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <main className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <section className="overflow-hidden rounded-3xl bg-stone-950 text-white">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 sm:p-10 lg:p-14">
              <p className="text-xs font-black tracking-[0.16em] text-orange-300">{t.eyebrow}</p>
              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">{t.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300">{t.description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/sample-subscription/apply" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-300 px-5 text-sm font-black text-stone-950 no-underline transition hover:bg-orange-200 active:scale-95">{t.primary}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Link href="/sample-subscription/status" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 px-5 text-sm font-bold text-white no-underline transition hover:bg-white/10 active:scale-95">{t.secondary}</Link>
              </div>
            </div>
            <div className="flex items-center justify-center bg-orange-100 p-8 text-stone-950 sm:p-12">
              <div className="max-w-xs rounded-3xl border border-orange-200 bg-white p-6 shadow-lg shadow-orange-950/10">
                <BadgeCheck className="h-10 w-10 text-orange-700" aria-hidden="true" />
                <p className="mt-4 text-xl font-black">{lang === 'ko' ? '최근 14일' : '最近 14 天'}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{lang === 'ko' ? '검토·승인 후 게시된 신상품과 샘플만 바이어 전용 피드에서 확인합니다.' : '买家专属信息流仅展示审核批准后发布的新品与样品。'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <p className="text-xs font-black tracking-[0.16em] text-orange-700">HOW IT WORKS</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t.processTitle}</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {t.process.map(([title, description], index) => {
              const Icon = processIcons[index];
              return <article key={title} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-950"><Icon className="h-5 w-5" aria-hidden="true" /></span><p className="mt-5 text-base font-black">{title}</p><p className="mt-2 text-sm leading-6 text-stone-600">{description}</p></article>;
            })}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-stone-200 bg-white p-6 sm:p-9">
          <p className="text-xs font-black tracking-[0.16em] text-orange-700">DISCOVERY POLICY</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t.policyTitle}</h2>
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {t.policy.map(([title, description], index) => {
              const Icon = policyIcons[index];
              return <div key={title} className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="text-sm font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-stone-600">{description}</p></div></div>;
            })}
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-600">{t.signupPrompt}</p>
            <div className="flex flex-wrap gap-4"><Link href="/signup?role=seller" className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-stone-950 no-underline transition hover:text-orange-700"><Building2 className="h-4 w-4" aria-hidden="true" />{t.signup}</Link><Link href="/ip" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-600 no-underline transition hover:text-stone-950">{t.ip}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
          </div>
        </section>
      </main>
    </div>
  );
}
