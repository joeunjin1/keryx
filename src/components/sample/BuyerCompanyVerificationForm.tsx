'use client';

import Link from 'next/link';
import { AlertCircle, BadgeCheck, Building2, FileText, Loader2, LockKeyhole, Mail, ShieldCheck, UploadCloud } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';
import { createClient } from '@/lib/supabase/client';

type VerificationStatus = 'submitted' | 'under_review' | 'revision_requested' | 'approved' | 'rejected' | 'reverification_required' | 'revoked';
type AccessStatus = 'pending_verification' | 'active' | 'unsubscribed' | 'suspended' | 'reverification_required' | 'rejected' | 'revoked' | 'not_started';

type StatusPayload = {
  seller: {
    id: string;
    businessName: string | null;
    businessRegistrationNo: string | null;
    legalRepresentative: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  verification: {
    id: string;
    status: VerificationStatus;
    company_name_snapshot: string;
    business_registration_no_snapshot: string;
    contact_name_snapshot: string;
    contact_email_snapshot: string;
    contact_phone_snapshot: string;
    business_address_snapshot: string;
    business_type_snapshot: string;
    submitted_at: string;
    reviewed_at: string | null;
    reviewer_note: string | null;
    decision_reason: string | null;
  } | null;
  access: {
    status: AccessStatus;
    email_consent_at?: string | null;
    activated_at?: string | null;
    status_reason?: string | null;
  };
};

const text = {
  ko: {
    eyebrow: 'APPROVED BUYER DISCOVERY',
    title: '신상품·샘플을 보기 위한 회사 인증',
    description: '최근 14일 이내에 운영팀이 검토해 게시한 신상품·샘플은 회사 인증과 구독 승인이 완료된 바이어에게만 표시됩니다.',
    benefits: ['운영 검토를 거친 신상품·샘플만 확인', '게시일로부터 14일 동안만 열람', '검증된 바이어 전용으로 아이디어와 문의를 연결'],
    loginRequired: '바이어 계정으로 로그인해 회사 인증을 신청해 주세요.',
    signupRequired: '바이어 계정이 없으신가요?',
    login: '바이어 로그인',
    signup: '바이어 회원가입',
    activeTitle: '신상품·샘플 구독이 활성화되어 있습니다.',
    activeDescription: '최근 14일 이내 게시된 신상품·샘플만 확인할 수 있습니다. 기간이 지난 게시물은 피드에서 자동으로 사라지며 운영 이력에는 보존됩니다.',
    openFeed: '신상품·샘플 보기',
    submittedTitle: '회사 인증을 검토하고 있습니다.',
    submittedDescription: '검토가 끝나면 구독 접근 상태가 활성화됩니다. 보완이 필요하면 이 화면에 안내가 표시됩니다.',
    revisionTitle: '회사 정보 보완이 필요합니다.',
    rejectedTitle: '현재 인증이 승인되지 않았습니다.',
    statusNote: '운영자 안내',
    formTitle: '회사 정보 및 사업자등록증',
    companyName: '회사명',
    registrationNo: '사업자등록번호',
    representative: '대표자명',
    contactName: '담당자명',
    contactEmail: '담당자 이메일',
    contactPhone: '담당자 연락처',
    address: '사업장 주소',
    businessType: '사업 형태',
    license: '사업자등록증',
    licenseHelp: 'JPG, PNG 또는 PDF, 최대 10MB. 인증 검토 담당자만 열람합니다.',
    privacy: '회사 인증과 구독 운영을 위한 개인정보 수집·이용에 동의합니다. (필수)',
    marketing: '승인 후 신상품·샘플 관련 이메일 수신에 동의합니다. (선택)',
    submit: '회사 인증 신청하기',
    submitting: '인증 정보를 제출하고 있습니다.',
    error: '인증 신청을 처리하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
    uploaded: '파일 업로드 완료',
    required: '필수',
    back: '샘플 구독 안내로 돌아가기',
  },
  zh: {
    eyebrow: 'APPROVED BUYER DISCOVERY',
    title: '查看新品与样品的企业认证',
    description: '仅向已完成企业认证与订阅审批的买家展示由运营团队审核后发布、且仍在最近 14 天展示期内的新品与样品。',
    benefits: ['仅查看运营团队审核的新产品与样品', '从发布日期起仅展示 14 天', '为经验证买家提供创意与咨询衔接'],
    loginRequired: '请使用买家账户登录后申请企业认证。',
    signupRequired: '还没有买家账户？',
    login: '买家登录',
    signup: '买家注册',
    activeTitle: '新品与样品订阅已启用。',
    activeDescription: '仅可查看最近 14 天内发布的新品与样品。超过展示期的内容会自动从信息流隐藏，但运营记录会保留。',
    openFeed: '查看新品与样品',
    submittedTitle: '企业认证正在审核中。',
    submittedDescription: '审核完成后将启用订阅访问权限。如需补充资料，本页面会显示说明。',
    revisionTitle: '需要补充企业信息。',
    rejectedTitle: '当前认证未获批准。',
    statusNote: '运营说明',
    formTitle: '企业信息与营业执照',
    companyName: '公司名称',
    registrationNo: '营业执照注册号',
    representative: '法定代表人',
    contactName: '负责人姓名',
    contactEmail: '负责人邮箱',
    contactPhone: '负责人电话',
    address: '营业地址',
    businessType: '业务类型',
    license: '营业执照',
    licenseHelp: 'JPG、PNG 或 PDF，最大 10MB。仅认证审核人员可查看。',
    privacy: '同意为企业认证和订阅运营收集及使用个人信息。（必填）',
    marketing: '同意在认证通过后接收新品与样品邮件。（选填）',
    submit: '提交企业认证',
    submitting: '正在提交认证信息。',
    error: '暂时无法处理认证申请。请检查输入后重试。',
    uploaded: '文件上传完成',
    required: '必填',
    back: '返回样品订阅说明',
  },
};

const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function statusStyle(status?: string) {
  if (status === 'active' || status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'revision_requested' || status === 'reverification_required') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status === 'rejected' || status === 'revoked' || status === 'suspended') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

export function BuyerCompanyVerificationForm() {
  const { lang } = useLangContext();
  const t = text[lang];
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [fields, setFields] = useState({
    companyName: '', businessRegistrationNo: '', legalRepresentative: '', contactName: '', contactEmail: '', contactPhone: '', businessAddress: '', businessType: '', privacyConsent: false, marketingConsent: false,
  });

  const reviewMessage = useMemo(() => status?.verification?.decision_reason || status?.verification?.reviewer_note || status?.access?.status_reason || null, [status]);

  useEffect(() => {
    let active = true;
    fetch('/api/buyer/company-verification')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 401) throw new Error('LOGIN_REQUIRED');
          throw new Error(payload.error || 'STATUS_FAILED');
        }
        return payload as StatusPayload;
      })
      .then((payload) => {
        if (!active) return;
        setStatus(payload);
        setFields((current) => ({
          ...current,
          companyName: payload.verification?.company_name_snapshot || payload.seller.businessName || '',
          businessRegistrationNo: payload.verification?.business_registration_no_snapshot || payload.seller.businessRegistrationNo || '',
          legalRepresentative: payload.seller.legalRepresentative || '',
          contactName: payload.verification?.contact_name_snapshot || payload.seller.contactName || '',
          contactEmail: payload.verification?.contact_email_snapshot || payload.seller.contactEmail || '',
          contactPhone: payload.verification?.contact_phone_snapshot || payload.seller.contactPhone || '',
          businessAddress: payload.verification?.business_address_snapshot || '',
          businessType: payload.verification?.business_type_snapshot || '',
          marketingConsent: Boolean(payload.access.email_consent_at),
        }));
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof Error && error.message === 'LOGIN_REQUIRED') setLoginRequired(true);
        else setFormError(error instanceof Error ? error.message : t.error);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t.error]);

  function changeField(field: keyof typeof fields, value: string | boolean) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function handleLicenseChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFormError(null);
    if (!file) { setLicenseFile(null); return; }
    if (!allowedTypes.has(file.type) || file.size > maxFileSize) {
      setLicenseFile(null);
      event.target.value = '';
      setFormError(t.licenseHelp);
      return;
    }
    setLicenseFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status?.seller || !licenseFile) {
      setFormError(licenseFile ? t.error : t.licenseHelp);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const extension = licenseFile.name.split('.').pop()?.toLowerCase() || 'file';
      const objectPath = `${status.seller.id}/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('buyer-verification-documents')
        .upload(objectPath, licenseFile, { contentType: licenseFile.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const response = await fetch('/api/buyer/company-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          licenseStoragePath: `buyer-verification-documents/${objectPath}`,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.error);
      window.location.assign('/sample-subscription/status');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.error);
    } finally {
      setSubmitting(false);
    }
  }

  const isActive = status?.access?.status === 'active';
  const verificationStatus = status?.verification?.status;
  const needsReview = verificationStatus === 'submitted' || verificationStatus === 'under_review';
  const needsRevision = verificationStatus === 'revision_requested' || verificationStatus === 'reverification_required';
  const rejected = verificationStatus === 'rejected' || verificationStatus === 'revoked';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <main className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="grid overflow-hidden rounded-3xl bg-stone-950 text-white lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-10">
            <p className="text-xs font-black tracking-[0.16em] text-orange-300">{t.eyebrow}</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">{t.title}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-300">{t.description}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {t.benefits.map((benefit) => <div key={benefit} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold leading-6 text-stone-100">{benefit}</div>)}
            </div>
          </div>
          <div className="flex items-center justify-center bg-orange-100 p-8 text-stone-900">
            <div className="max-w-sm text-center">
              <ShieldCheck className="mx-auto h-14 w-14 text-orange-700" aria-hidden="true" />
              <p className="mt-4 text-lg font-black">{lang === 'ko' ? '회사 인증 · 승인 바이어 전용' : '企业认证 · 仅限获批买家'}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{lang === 'ko' ? '사업자등록증은 공개되지 않으며 승인 검토에만 사용합니다.' : '营业执照不会公开，仅用于认证审核。'}</p>
            </div>
          </div>
        </section>

        {loading ? <div className="mt-8 flex min-h-48 items-center justify-center rounded-3xl border border-stone-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-stone-500" aria-label="Loading" /></div> : null}

        {!loading && loginRequired ? (
          <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <LockKeyhole className="mx-auto h-12 w-12 text-stone-700" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-black">{t.loginRequired}</h2>
            <p className="mt-3 text-sm text-stone-600">{t.signupRequired}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login?next=/sample-subscription/apply" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.login}</Link>
              <Link href="/signup?role=seller" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-300 px-5 text-sm font-bold text-stone-700 no-underline transition hover:bg-stone-100 active:scale-95">{t.signup}</Link>
            </div>
          </section>
        ) : null}

        {!loading && !loginRequired && isActive ? (
          <section className="mt-8 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-10">
            <BadgeCheck className="h-11 w-11 text-emerald-600" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-black">{t.activeTitle}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">{t.activeDescription}</p>
            <Link href="/buyer/discover" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.openFeed}</Link>
          </section>
        ) : null}

        {!loading && !loginRequired && !isActive && (needsReview || needsRevision || rejected) ? (
          <section className={`mt-8 rounded-3xl border p-6 shadow-sm sm:p-8 ${statusStyle(verificationStatus)}`}>
            <AlertCircle className="h-8 w-8" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black">{needsReview ? t.submittedTitle : needsRevision ? t.revisionTitle : t.rejectedTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6">{needsReview ? t.submittedDescription : reviewMessage || t.submittedDescription}</p>
            {(needsRevision || rejected) && <Link href="/sample-subscription/apply" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-current px-4 text-sm font-bold no-underline transition hover:bg-white/50 active:scale-95">{lang === 'ko' ? '정보 보완·재신청' : '补充信息并重新申请'}</Link>}
          </section>
        ) : null}

        {!loading && !loginRequired && !isActive && !needsReview ? (
          <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
            <p className="text-xs font-black tracking-[0.16em] text-orange-700">VERIFICATION FORM</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{t.formTitle}</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {([
                ['companyName', t.companyName, 'organization'], ['businessRegistrationNo', t.registrationNo, 'off'], ['legalRepresentative', t.representative, 'name'], ['contactName', t.contactName, 'name'], ['contactEmail', t.contactEmail, 'email'], ['contactPhone', t.contactPhone, 'tel'], ['businessAddress', t.address, 'street-address'], ['businessType', t.businessType, 'organization-title'],
              ] as const).map(([key, label, autoComplete]) => (
                <label key={key} className="text-sm font-bold">
                  {label} {key !== 'legalRepresentative' ? <span className="text-rose-600">*</span> : null}
                  <input required={key !== 'legalRepresentative'} type={key === 'contactEmail' ? 'email' : key === 'contactPhone' ? 'tel' : 'text'} inputMode={key === 'contactEmail' ? 'email' : key === 'contactPhone' ? 'tel' : 'text'} autoComplete={autoComplete} value={String(fields[key])} onChange={(event) => changeField(key, event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200" />
                </label>
              ))}
            </div>
            <label className="mt-6 block rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm font-bold">
              <span className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-orange-700" aria-hidden="true" />{t.license} <span className="text-rose-600">*</span></span>
              <span className="mt-2 block text-xs font-normal leading-5 text-stone-500">{t.licenseHelp}</span>
              <input required type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleLicenseChange} className="mt-4 block w-full text-sm" />
              {licenseFile ? <span className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><FileText className="h-4 w-4" aria-hidden="true" />{t.uploaded}: {licenseFile.name}</span> : null}
            </label>
            <div className="mt-6 space-y-3 border-t border-stone-100 pt-5">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input required type="checkbox" checked={fields.privacyConsent} onChange={(event) => changeField('privacyConsent', event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />{t.privacy}</label>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input type="checkbox" checked={fields.marketingConsent} onChange={(event) => changeField('marketingConsent', event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />{t.marketing}</label>
            </div>
            {formError ? <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{formError}</p> : null}
            <button type="submit" disabled={submitting} className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-base font-bold text-white transition hover:bg-stone-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300">{submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Building2 className="h-5 w-5" aria-hidden="true" />}{submitting ? t.submitting : t.submit}</button>
          </form>
        ) : null}
        <Link href="/sample-subscription" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-600 no-underline transition hover:text-stone-950"><Mail className="h-4 w-4" aria-hidden="true" />{t.back}</Link>
      </main>
    </div>
  );
}
