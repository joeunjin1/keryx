'use client';

import Link from 'next/link';
import { ArrowLeft, Bookmark, CheckCircle2, CircleAlert, FileText, Loader2, PackageCheck, ShieldCheck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

type Asset = { id: string; mediaKind: 'image' | 'video' | 'document'; altKo: string | null; altZh: string | null; url: string };
type Item = {
  id: string; titleKo: string; titleZh: string | null; summaryKo: string; summaryZh: string | null; categorySlug: string; ipSlug: string | null; sampleAvailable: boolean; customizationScopeKo: string | null; customizationScopeZh: string | null; visibleMoqNoteKo: string | null; visibleMoqNoteZh: string | null; visibleLeadTimeNoteKo: string | null; visibleLeadTimeNoteZh: string | null; publishedAt: string; expiresAt: string; assets: Asset[];
};

const copy = {
  ko: { back: '신상품·샘플 목록', loading: '상세 정보를 불러오고 있습니다.', accessTitle: '현재 이 항목을 열람할 수 없습니다.', accessDescription: '회사 인증·구독 상태를 확인하거나 피드 종료 여부를 확인해 주세요.', status: '회사 인증·구독 상태 확인', save: '관심 항목 저장', saved: '관심 항목으로 저장됨', saving: '저장 중', sample: '샘플 가능', category: '상품군', ip: '연결 IP', published: '게시일', expires: '피드 종료', customization: '맞춤 범위', moq: 'MOQ 안내', leadTime: '리드타임 안내', docs: '참고 자료', notice: '이 항목은 승인 바이어의 검토 목적을 위한 자료입니다. 외부 공유 또는 재게시 전에는 KERYX와 협의해 주세요.', error: '상세 정보를 불러오지 못했습니다.' },
  zh: { back: '新品与样品列表', loading: '正在加载详情。', accessTitle: '目前无法查看此项目。', accessDescription: '请确认企业认证、订阅状态或信息流展示期。', status: '确认企业认证与订阅状态', save: '保存关注项目', saved: '已保存为关注项目', saving: '正在保存', sample: '可提供样品', category: '商品类别', ip: '关联 IP', published: '发布日期', expires: '信息流结束', customization: '定制范围', moq: 'MOQ 说明', leadTime: '交期说明', docs: '参考资料', notice: '此项目仅供获批买家审核使用。对外分享或转载前请先与 KERYX 协商。', error: '暂时无法加载详情。' },
};

function formatDate(value: string, lang: 'ko' | 'zh') {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
}

export function ApprovedBuyerDiscoveryDetail() {
  const { lang } = useLangContext();
  const t = copy[lang];
  const params = useParams<{ offeringId: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!params.offeringId) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/buyer/discover/${params.offeringId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.error);
      setItem(payload.item as Item);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.error);
    } finally { setLoading(false); }
  }, [params.offeringId, t.error]);

  useEffect(() => { void load(); }, [load]);

  async function toggleSave() {
    if (!item || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/buyer/discover/${item.id}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: saved ? 'unsave' : 'save' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.error);
      setSaved(Boolean(payload.saved));
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : t.error); }
    finally { setSaving(false); }
  }

  const display = (ko: string | null, zh: string | null) => lang === 'ko' ? ko : zh || ko;

  return <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
    <Link href="/buyer/discover" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-600 no-underline transition hover:text-stone-950"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t.back}</Link>
    {loading ? <section className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-stone-500" aria-hidden="true" /><p className="mt-4 text-sm font-bold text-stone-600">{t.loading}</p></section> : null}
    {!loading && error ? <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-9"><CircleAlert className="h-9 w-9 text-amber-700" aria-hidden="true" /><h1 className="mt-4 text-2xl font-black">{t.accessTitle}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">{error || t.accessDescription}</p><Link href="/sample-subscription/status" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{t.status}</Link></section> : null}
    {!loading && item ? <article className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">{item.assets.filter((asset) => asset.mediaKind === 'image').length > 0 ? item.assets.filter((asset) => asset.mediaKind === 'image').map((asset) => <img key={asset.id} src={asset.url} alt={display(asset.altKo, asset.altZh) || display(item.titleKo, item.titleZh) || ''} className="aspect-[4/3] w-full rounded-3xl border border-stone-200 bg-stone-100 object-cover" />) : <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-stone-200 bg-stone-100 text-sm font-bold text-stone-400">{t.docs}</div>}</div>
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap gap-2">{item.sampleAvailable ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><PackageCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{t.sample}</span> : null}<span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{t.category}: {item.categorySlug}</span>{item.ipSlug ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{t.ip}: {item.ipSlug}</span> : null}</div><h1 className="mt-5 text-3xl font-black tracking-tight">{display(item.titleKo, item.titleZh)}</h1><p className="mt-4 text-base leading-7 text-stone-600">{display(item.summaryKo, item.summaryZh)}</p><dl className="mt-7 divide-y divide-stone-100 border-y border-stone-100"><div className="grid gap-1 py-4 sm:grid-cols-3"><dt className="text-sm font-black">{t.published}</dt><dd className="text-sm text-stone-600 sm:col-span-2">{formatDate(item.publishedAt, lang)}</dd></div><div className="grid gap-1 py-4 sm:grid-cols-3"><dt className="text-sm font-black">{t.expires}</dt><dd className="text-sm text-stone-600 sm:col-span-2">{formatDate(item.expiresAt, lang)}</dd></div>{display(item.customizationScopeKo, item.customizationScopeZh) ? <div className="grid gap-1 py-4 sm:grid-cols-3"><dt className="text-sm font-black">{t.customization}</dt><dd className="text-sm leading-6 text-stone-600 sm:col-span-2">{display(item.customizationScopeKo, item.customizationScopeZh)}</dd></div> : null}{display(item.visibleMoqNoteKo, item.visibleMoqNoteZh) ? <div className="grid gap-1 py-4 sm:grid-cols-3"><dt className="text-sm font-black">{t.moq}</dt><dd className="text-sm leading-6 text-stone-600 sm:col-span-2">{display(item.visibleMoqNoteKo, item.visibleMoqNoteZh)}</dd></div> : null}{display(item.visibleLeadTimeNoteKo, item.visibleLeadTimeNoteZh) ? <div className="grid gap-1 py-4 sm:grid-cols-3"><dt className="text-sm font-black">{t.leadTime}</dt><dd className="text-sm leading-6 text-stone-600 sm:col-span-2">{display(item.visibleLeadTimeNoteKo, item.visibleLeadTimeNoteZh)}</dd></div> : null}</dl><button type="button" onClick={() => void toggleSave()} disabled={saving} className={`mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition active:scale-95 disabled:cursor-not-allowed ${saved ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-stone-950 text-white hover:bg-stone-800'}`}><Bookmark className="h-4 w-4" aria-hidden="true" />{saving ? t.saving : saved ? <><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{t.saved}</> : t.save}</button><p className="mt-5 flex gap-2 rounded-2xl bg-stone-50 p-4 text-xs leading-5 text-stone-500"><ShieldCheck className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />{t.notice}</p></div>
    </article> : null}
  </main>;
}
