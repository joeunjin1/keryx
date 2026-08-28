'use client';

import Link from 'next/link';
import { CheckCircle2, Mail, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';
import { useLangContext } from '@/components/layout/LangContext';

const ipOptions = [
  { ko: '길덕이', zh: '吉鸭' },
  { ko: '이녀석', zh: '这家伙' },
  { ko: '꼬물이들', zh: '小怪物们' },
  { ko: '하트뿅 햄스터', zh: '爱心仓鼠' },
  { ko: '피글리', zh: '皮格利' },
];

const categoryOptions = [
  { ko: '봉제인형', zh: '毛绒玩偶' },
  { ko: '키링·가방고리', zh: '钥匙扣·包挂' },
  { ko: '피규어', zh: '手办' },
  { ko: '랜덤·뽑기 굿즈', zh: '盲盒·扭蛋周边' },
];

const copy = {
  ko: {
    eyebrow: 'SAMPLE SUBSCRIPTION',
    title: '새로운 상품과 샘플 소식을 받아보세요.',
    description: '관심 있는 IP와 상품군을 남겨주시면, 운영팀이 사업자 정보를 확인한 뒤 새로운 상품 및 샘플 소식을 안내해 드립니다.',
    benefits: [
      ['관심 상품 중심 안내', '선택한 IP와 상품군을 기준으로 새로 준비된 상품 정보를 받습니다.'],
      ['간결한 구독 관리', '신청 내역과 수신 상태는 운영자가 검토하며 언제든 관리할 수 있습니다.'],
      ['필요한 정보만 수집', '구독 확인과 상품 안내에 필요한 최소 정보만 받습니다.'],
    ],
    formTitle: '샘플 구독 신청',
    required: '필수 항목을 입력해 주세요.',
    company: '회사명',
    contact: '담당자명',
    phone: '연락처',
    email: '이메일',
    ip: '관심 IP',
    category: '관심 상품군',
    optional: '선택',
    privacy: '구독 확인 및 신상품 안내를 위한 개인정보 수집·이용에 동의합니다. (필수)',
    marketing: '신상품·샘플 관련 소식 수신에 동의합니다. (선택)',
    submit: '샘플 구독 신청하기',
    submitting: '신청 내용을 보내고 있습니다.',
    successTitle: '신청이 접수되었습니다.',
    successStore: '스토어 둘러보기',
    back: '신청 화면으로 돌아가기',
    error: '구독을 신청하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  zh: {
    eyebrow: 'SAMPLE SUBSCRIPTION',
    title: '订阅新品与样品消息。',
    description: '留下感兴趣的 IP 与商品类别后，运营团队将核实企业信息，并向您说明新品和样品消息。',
    benefits: [
      ['以关注商品为中心', '根据选择的 IP 和商品类别接收新商品信息。'],
      ['简洁的订阅管理', '运营人员会审核申请和接收状态，便于后续管理。'],
      ['只收集必要信息', '仅收集订阅确认和商品通知所需的最少信息。'],
    ],
    formTitle: '申请样品订阅',
    required: '请填写必填项目。',
    company: '公司名称',
    contact: '负责人姓名',
    phone: '联系电话',
    email: '电子邮箱',
    ip: '感兴趣的 IP',
    category: '感兴趣的商品类别',
    optional: '选填',
    privacy: '同意为订阅确认及新品通知而收集和使用个人信息。（必填）',
    marketing: '同意接收新品和样品相关消息。（选填）',
    submit: '申请样品订阅',
    submitting: '正在提交申请。',
    successTitle: '申请已提交。',
    successStore: '前往商店',
    back: '返回申请页面',
    error: '暂时无法提交订阅申请，请稍后重试。',
  },
};

export function SampleSubscriptionForm() {
  const { lang } = useLangContext();
  const t = copy[lang];
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ipSlugs, setIpSlugs] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const toggle = (value: string, current: string[], setCurrent: (values: string[]) => void) => {
    setCurrent(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch('/api/subscribe/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          interestIpSlugs: ipSlugs,
          interestCategories: categories,
          privacyConsent,
          marketingConsent,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.error);
      setResult({ ok: true, message: payload.message });
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : t.error });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-950">
        <RetailStoreHeader mode="sample" showCart={false} />
        <main className="mx-auto flex min-h-[70dvh] max-w-screen-md items-center px-4 py-10 sm:px-6">
          <section className="w-full rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
            <p className="mt-6 text-xs font-black tracking-[0.16em] text-emerald-700">SAMPLE SUBSCRIPTION</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t.successTitle}</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-600">{result.message}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/shop" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.successStore}</Link>
              <button type="button" onClick={() => setResult(null)} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 active:scale-95">{t.back}</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <main className="mx-auto grid max-w-screen-xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
        <section className="rounded-3xl bg-stone-950 p-6 text-white sm:p-9">
          <p className="text-xs font-black tracking-[0.16em] text-orange-300">{t.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-300">{t.description}</p>
          <div className="mt-8 space-y-5 border-t border-stone-700 pt-7">
            {[PackageCheck, Mail, ShieldCheck].map((Icon, index) => (
              <div key={t.benefits[index][0]} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-orange-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="text-sm font-black">{t.benefits[index][0]}</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-300">{t.benefits[index][1]}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/ip" className="mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-black text-orange-200 no-underline transition hover:text-white active:scale-95"><Sparkles className="h-4 w-4" />{lang === 'ko' ? '자체 디자인 IP 보기' : '查看原创 IP'}</Link>
        </section>

        <form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-black tracking-[0.16em] text-orange-700">SAMPLE FORM</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{t.formTitle}</h2>
          <p className="mt-2 text-base text-stone-600">{t.required}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold sm:col-span-2">{t.company}<input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200" autoComplete="organization" /></label>
            <label className="text-sm font-bold">{t.contact}<input value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200" autoComplete="name" /></label>
            <label className="text-sm font-bold">{t.phone}<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" className="mt-2 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200" /></label>
            <label className="text-sm font-bold sm:col-span-2">{t.email}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="email" className="mt-2 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200" /></label>
          </div>
          <fieldset className="mt-7"><legend className="text-sm font-black">{t.ip} <span className="font-normal text-stone-400">({t.optional})</span></legend><div className="mt-3 flex flex-wrap gap-2">{ipOptions.map((option) => <label key={option.ko} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm font-bold transition active:scale-95 ${ipSlugs.includes(option.ko) ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}><input type="checkbox" checked={ipSlugs.includes(option.ko)} onChange={() => toggle(option.ko, ipSlugs, setIpSlugs)} className="sr-only" />{lang === 'ko' ? option.ko : option.zh}</label>)}</div></fieldset>
          <fieldset className="mt-7"><legend className="text-sm font-black">{t.category} <span className="font-normal text-stone-400">({t.optional})</span></legend><div className="mt-3 flex flex-wrap gap-2">{categoryOptions.map((option) => <label key={option.ko} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm font-bold transition active:scale-95 ${categories.includes(option.ko) ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}><input type="checkbox" checked={categories.includes(option.ko)} onChange={() => toggle(option.ko, categories, setCategories)} className="sr-only" />{lang === 'ko' ? option.ko : option.zh}</label>)}</div></fieldset>
          <div className="mt-7 space-y-3 border-t border-stone-100 pt-5"><label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input required type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />{t.privacy}</label><label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />{t.marketing}</label></div>
          {result && <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{result.message}</p>}
          <button type="submit" disabled={submitting} className="mt-7 flex min-h-14 w-full items-center justify-center rounded-2xl bg-stone-950 px-5 text-base font-bold text-white transition hover:bg-stone-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300">{submitting ? t.submitting : t.submit}</button>
        </form>
      </main>
    </div>
  );
}
