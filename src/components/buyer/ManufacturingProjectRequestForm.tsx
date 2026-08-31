'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLangContext } from '@/components/layout/LangContext';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

type FormState = {
  projectName: string;
  productCategory: string;
  productSummary: string;
  productName: string;
  productDescription: string;
  targetCustomer: string;
  targetQuantity: string;
  targetMarket: string;
  requiredByDate: string;
  materialPreferences: string;
  dimensionsText: string;
  packagingRequirements: string;
  complianceRequirements: string;
  buyerNotes: string;
};

const initialState: FormState = {
  projectName: '',
  productCategory: '',
  productSummary: '',
  productName: '',
  productDescription: '',
  targetCustomer: '',
  targetQuantity: '',
  targetMarket: '',
  requiredByDate: '',
  materialPreferences: '',
  dimensionsText: '',
  packagingRequirements: '',
  complianceRequirements: '',
  buyerNotes: '',
};

export function ManufacturingProjectRequestForm() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => (lang === 'zh' ? zh : ko);
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setValue = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const nextFiles = Array.from(selected);
    const invalid = nextFiles.find((file) => file.size > MAX_FILE_BYTES || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type));
    if (invalid) {
      setError(t('JPEG, PNG, WebP 이미지 또는 PDF만, 파일당 10MB 이하로 첨부할 수 있습니다.', '仅支持 JPEG、PNG、WebP 图片或 PDF，单个文件须小于等于 10MB。'));
      return;
    }
    setFiles((current) => [...current, ...nextFiles].slice(0, 8));
    setError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!form.projectName.trim() || !form.productName.trim()) {
      setError(t('프로젝트명과 제품명은 필수입니다.', '项目名称和产品名称为必填项。'));
      return;
    }
    const quantity = form.targetQuantity.trim() ? Number(form.targetQuantity) : null;
    if (quantity !== null && (!Number.isSafeInteger(quantity) || quantity <= 0)) {
      setError(t('예상 수량은 1개 이상의 정수로 입력해 주세요.', '预计数量须填写为大于 0 的整数。'));
      return;
    }

    setSubmitting(true);
    try {
      const createResponse = await fetch('/api/buyer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: form.projectName,
          productCategory: form.productCategory,
          productSummary: form.productSummary,
          preferredLanguage: lang,
          brief: {
            productName: form.productName,
            productDescription: form.productDescription,
            targetCustomer: form.targetCustomer,
            targetQuantity: quantity,
            targetMarket: form.targetMarket,
            requiredByDate: form.requiredByDate || null,
            materialPreferences: form.materialPreferences,
            dimensionsText: form.dimensionsText,
            packagingRequirements: form.packagingRequirements,
            complianceRequirements: form.complianceRequirements,
            buyerNotes: form.buyerNotes,
          },
        }),
      });
      const created = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok || !created?.project?.id) throw new Error(created?.error || '프로젝트 초안을 만들지 못했습니다.');

      for (const file of files) {
        const payload = new FormData();
        payload.append('file', file);
        const uploadResponse = await fetch(`/api/buyer/projects/${created.project.id}/files`, { method: 'POST', body: payload });
        const uploaded = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(uploaded?.error || '참고 파일을 올리지 못했습니다.');
      }

      const submitResponse = await fetch(`/api/buyer/projects/${created.project.id}/submit`, { method: 'POST' });
      const submitted = await submitResponse.json().catch(() => ({}));
      if (!submitResponse.ok) throw new Error(submitted?.error || '프로젝트 접수를 제출하지 못했습니다.');
      router.push(`/buyer/projects/${created.project.id}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('프로젝트 접수 중 오류가 발생했습니다.', '提交项目时发生错误。'));
      setSubmitting(false);
    }
  };

  const fieldClass = 'mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100';
  const labelClass = 'block text-sm font-bold text-stone-800';
  const hintClass = 'mt-1 text-xs leading-5 text-stone-500';

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-3xl border border-orange-100 bg-orange-50 p-5 sm:p-7">
        <p className="text-xs font-black tracking-[0.16em] text-orange-700">MANUFACTURING INTAKE</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">{t('새 제조 프로젝트 시작', '开始新的制造项目')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">{t('제품 아이디어와 기본 조건을 접수하면, 운영팀이 기획 범위·샘플·공장 매칭의 다음 단계를 검토합니다. 결제는 이 화면에서 진행되지 않습니다.', '提交产品创意和基本条件后，运营团队将审核规划范围、样品与工厂匹配的下一步。本页面不进行付款。')}</p>
      </div>

      {error && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">{error}</div>}

      <div className="space-y-5">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-stone-950">{t('프로젝트 기본 정보', '项目基本信息')}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>{t('프로젝트명', '项目名称')}<span className="ml-1 text-red-600">*</span><input value={form.projectName} onChange={(event) => setValue('projectName', event.target.value)} className={fieldClass} maxLength={160} placeholder={t('예: 가방고리 인형 신규 개발', '例如：钥匙扣玩偶新品开发')} /></label>
            <label className={labelClass}>{t('제품 카테고리', '产品类别')}<input value={form.productCategory} onChange={(event) => setValue('productCategory', event.target.value)} className={fieldClass} maxLength={100} placeholder={t('예: 봉제인형, 키링, 패키지', '例如：毛绒玩具、钥匙扣、包装')} /></label>
          </div>
          <label className={`${labelClass} mt-5`}>{t('프로젝트 한 줄 설명', '项目简要说明')}<textarea value={form.productSummary} onChange={(event) => setValue('productSummary', event.target.value)} className={fieldClass} rows={3} maxLength={2000} placeholder={t('이번 제품으로 확인하려는 목적과 핵심 포인트를 적어 주세요.', '请填写本次产品开发的目的和重点。')} /></label>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-stone-950">{t('제품 기획', '产品需求')}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>{t('제품명', '产品名称')}<span className="ml-1 text-red-600">*</span><input value={form.productName} onChange={(event) => setValue('productName', event.target.value)} className={fieldClass} maxLength={160} placeholder={t('제품 또는 아이디어 이름', '产品或创意名称')} /></label>
            <label className={labelClass}>{t('예상 수량', '预计数量')}<input value={form.targetQuantity} onChange={(event) => setValue('targetQuantity', event.target.value)} className={fieldClass} type="number" inputMode="numeric" min="1" placeholder={t('미정이면 비워 두세요', '未确定可留空')} /></label>
            <label className={labelClass}>{t('목표 고객', '目标客户')}<input value={form.targetCustomer} onChange={(event) => setValue('targetCustomer', event.target.value)} className={fieldClass} maxLength={300} placeholder={t('예: 캐릭터 굿즈 구매자', '例如：角色周边购买者')} /></label>
            <label className={labelClass}>{t('판매·유통 시장', '销售·流通市场')}<input value={form.targetMarket} onChange={(event) => setValue('targetMarket', event.target.value)} className={fieldClass} maxLength={200} placeholder={t('예: 한국 온라인 채널', '例如：韩国线上渠道')} /></label>
            <label className={labelClass}>{t('희망 일정', '期望时间')}<input value={form.requiredByDate} onChange={(event) => setValue('requiredByDate', event.target.value)} className={fieldClass} type="date" /></label>
            <label className={labelClass}>{t('사이즈·규격', '尺寸·规格')}<input value={form.dimensionsText} onChange={(event) => setValue('dimensionsText', event.target.value)} className={fieldClass} maxLength={500} placeholder={t('예: 약 12cm, 미정 가능', '例如：约 12cm，可暂未确定')} /></label>
          </div>
          <label className={`${labelClass} mt-5`}>{t('제품 상세 설명', '产品详细说明')}<textarea value={form.productDescription} onChange={(event) => setValue('productDescription', event.target.value)} className={fieldClass} rows={5} maxLength={5000} placeholder={t('형태, 기능, 캐릭터·디자인 콘셉트, 꼭 지켜야 할 요소를 적어 주세요.', '请填写形态、功能、角色/设计概念和必须保留的要点。')} /></label>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-stone-950">{t('사양·참고 자료', '规格·参考资料')}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>{t('소재·색상 선호', '材质·颜色偏好')}<textarea value={form.materialPreferences} onChange={(event) => setValue('materialPreferences', event.target.value)} className={fieldClass} rows={4} maxLength={1000} /></label>
            <label className={labelClass}>{t('포장 요구사항', '包装要求')}<textarea value={form.packagingRequirements} onChange={(event) => setValue('packagingRequirements', event.target.value)} className={fieldClass} rows={4} maxLength={1500} /></label>
            <label className={labelClass}>{t('인증·유의사항', '认证·注意事项')}<textarea value={form.complianceRequirements} onChange={(event) => setValue('complianceRequirements', event.target.value)} className={fieldClass} rows={4} maxLength={1500} /></label>
            <label className={labelClass}>{t('운영팀에 전할 내용', '给运营团队的说明')}<textarea value={form.buyerNotes} onChange={(event) => setValue('buyerNotes', event.target.value)} className={fieldClass} rows={4} maxLength={3000} /></label>
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4">
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-stone-800 shadow-sm">
              <span>{t('이미지·PDF 참고 파일 첨부', '上传图片·PDF参考文件')}</span>
              <span className="rounded-lg bg-stone-950 px-3 py-2 text-xs text-white">{t('파일 선택', '选择文件')}</span>
              <input type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => handleFiles(event.target.files)} />
            </label>
            <p className={hintClass}>{t('JPEG·PNG·WebP·PDF, 파일당 10MB 이하, 최대 8개입니다. 파일은 비공개로 보관됩니다.', '支持 JPEG、PNG、WebP、PDF，单个文件不超过 10MB，最多 8 个。文件将以非公开方式保存。')}</p>
            {files.length > 0 && <ul className="mt-3 space-y-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs text-stone-700"><span className="min-w-0 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="min-h-11 shrink-0 rounded-lg px-3 font-bold text-red-600 hover:bg-red-50">{t('제거', '删除')}</button></li>)}</ul>}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-1">
          <p className="hidden text-xs leading-5 text-stone-500 sm:block">{t('접수 후 운영팀 검토가 시작되며, 비용·결제는 별도 견적 승인 이후에만 진행됩니다.', '提交后将进入运营团队审核；费用与付款仅在单独报价批准后进行。')}</p>
          <button type="submit" disabled={submitting} className="ml-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400">
            {submitting ? t('접수 중…', '提交中…') : t('제조 프로젝트 접수', '提交制造项目')}
          </button>
        </div>
      </div>
    </form>
  );
}
