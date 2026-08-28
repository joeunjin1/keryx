'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Mail, PackageCheck, ShieldCheck } from 'lucide-react';

const ipOptions = ['길덕이', '이녀석', '꼬물이들', '하트뿅 햄스터', '피글리'];
const categoryOptions = ['봉제인형', '키링·가방고리', '피규어', '랜덤·뽑기 굿즈'];

export function SampleSubscriptionForm() {
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
      if (!response.ok) throw new Error(payload.error || '구독을 신청하지 못했습니다.');
      setResult({ ok: true, message: payload.message });
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : '구독을 신청하지 못했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.ok) return <div className="min-h-screen bg-stone-50 px-4 py-16 sm:px-6"><main className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-10"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><p className="mt-6 text-xs font-black tracking-[0.16em] text-emerald-700">SAMPLE SUBSCRIPTION</p><h1 className="mt-2 text-2xl font-black tracking-tight">신청이 접수되었습니다.</h1><p className="mt-4 text-sm leading-6 text-stone-600">{result.message}</p><Link href="/shop" className="mt-7 inline-flex min-h-12 items-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline active:scale-95">스토어 둘러보기</Link></main></div>;

  return <div className="min-h-screen bg-stone-50 text-stone-950"><header className="border-b border-stone-200 bg-white"><div className="mx-auto flex min-h-16 max-w-screen-lg items-center justify-between px-4 sm:px-6"><Link href="/" className="font-black text-stone-950 no-underline">KERYX</Link><Link href="/shop" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-stone-600 no-underline hover:bg-stone-100">스토어</Link></div></header><main className="mx-auto grid max-w-screen-lg gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16"><section><p className="text-xs font-black tracking-[0.16em] text-orange-700">SAMPLE SUBSCRIPTION</p><h1 className="mt-3 text-4xl font-black leading-tight tracking-tight">새로운 상품과 샘플 소식을 받아보세요.</h1><p className="mt-5 text-base leading-7 text-stone-600">관심 있는 IP와 상품군을 남겨주시면, 사업자 정보를 확인한 뒤 신상품 및 샘플 소식을 안내해 드립니다.</p><div className="mt-8 space-y-4"><div className="flex gap-3"><PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" /><div><h2 className="text-sm font-black">관심 상품 중심 안내</h2><p className="mt-1 text-sm leading-6 text-stone-600">선택한 IP와 상품군을 기준으로 새로 준비된 상품 정보를 받습니다.</p></div></div><div className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" /><div><h2 className="text-sm font-black">간결한 구독 관리</h2><p className="mt-1 text-sm leading-6 text-stone-600">발송 대상과 신청 정보는 운영자가 검토하며, 수신 상태는 관리 화면에서 확인합니다.</p></div></div><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" /><div><h2 className="text-sm font-black">필요한 정보만 수집</h2><p className="mt-1 text-sm leading-6 text-stone-600">구독 확인과 상품 안내에 필요한 최소 정보만 받습니다.</p></div></div></div></section><form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">샘플 구독 신청</h2><p className="mt-2 text-sm text-stone-600">필수 항목을 입력해 주세요.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold sm:col-span-2">회사명<input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 px-3.5 outline-none focus:ring-2 focus:ring-stone-200" /></label><label className="text-sm font-bold">담당자명<input value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 px-3.5 outline-none focus:ring-2 focus:ring-stone-200" /></label><label className="text-sm font-bold">연락처<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 px-3.5 outline-none focus:ring-2 focus:ring-stone-200" inputMode="tel" autoComplete="tel" /></label><label className="text-sm font-bold sm:col-span-2">이메일<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 px-3.5 outline-none focus:ring-2 focus:ring-stone-200" inputMode="email" autoComplete="email" /></label></div><fieldset className="mt-6"><legend className="text-sm font-black">관심 IP <span className="font-normal text-stone-400">(선택)</span></legend><div className="mt-3 flex flex-wrap gap-2">{ipOptions.map((value) => <label key={value} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm font-semibold transition ${ipSlugs.includes(value) ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600'}`}><input type="checkbox" checked={ipSlugs.includes(value)} onChange={() => toggle(value, ipSlugs, setIpSlugs)} className="sr-only" />{value}</label>)}</div></fieldset><fieldset className="mt-6"><legend className="text-sm font-black">관심 상품군 <span className="font-normal text-stone-400">(선택)</span></legend><div className="mt-3 flex flex-wrap gap-2">{categoryOptions.map((value) => <label key={value} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm font-semibold transition ${categories.includes(value) ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600'}`}><input type="checkbox" checked={categories.includes(value)} onChange={() => toggle(value, categories, setCategories)} className="sr-only" />{value}</label>)}</div></fieldset><div className="mt-7 space-y-3 border-t border-stone-100 pt-5"><label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input required type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1 h-5 w-5" />구독 확인 및 신상품 안내를 위한 개인정보 수집·이용에 동의합니다. (필수)</label><label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-1 h-5 w-5" />신상품·샘플 관련 소식 수신에 동의합니다. (선택)</label></div>{result && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{result.message}</p>}<button type="submit" disabled={submitting} className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:bg-stone-300 active:scale-95">{submitting ? '신청 중...' : '샘플 구독 신청하기'}</button></form></main></div>;
}
