'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, BadgeCheck, Box, CalendarDays, CircleAlert, Loader2, PackageOpen, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

type DiscoveryAsset = {
  id: string;
  mediaKind: 'image' | 'video' | 'document';
  rendition: 'thumbnail' | 'display' | 'reference';
  altKo: string | null;
  altZh: string | null;
  url: string;
};

type DiscoveryItem = {
  id: string;
  titleKo: string;
  titleZh: string | null;
  summaryKo: string;
  summaryZh: string | null;
  categorySlug: string;
  ipSlug: string | null;
  sampleAvailable: boolean;
  customizationScopeKo: string | null;
  customizationScopeZh: string | null;
  visibleMoqNoteKo: string | null;
  visibleMoqNoteZh: string | null;
  visibleLeadTimeNoteKo: string | null;
  visibleLeadTimeNoteZh: string | null;
  publishedAt: string;
  expiresAt: string;
  assets: DiscoveryAsset[];
};

type FeedResponse = { items: DiscoveryItem[]; visibility: { expiresInDays: number } };

const copy = {
  ko: {
    eyebrow: 'APPROVED BUYER DISCOVERY',
    title: '최근 신상품·샘플',
    description: '운영팀이 검토해 게시한 항목만 보여 드립니다. 각 신상품은 게시일로부터 14일 동안만 피드에 표시됩니다.',
    active: '승인 바이어 전용',
    refresh: '새로고침',
    loading: '신상품·샘플을 불러오고 있습니다.',
    emptyTitle: '현재 열람 가능한 신상품·샘플이 없습니다.',
    emptyDescription: '새 항목이 운영 검토를 거쳐 게시되면 이곳에 표시됩니다. 기간이 지난 항목은 피드에서 자동으로 숨겨집니다.',
    sample: '샘플 가능',
    category: '상품군',
    ip: '연결 IP',
    published: '게시일',
    expires: '피드 종료',
    customization: '맞춤 범위',
    moq: 'MOQ 안내',
    leadTime: '리드타임 안내',
    detail: '상세 보기',
    accessTitle: '회사 인증과 구독 승인이 필요합니다.',
    accessDescription: '최근 신상품·샘플 피드는 승인된 바이어 전용입니다. 회사 인증 상태를 확인해 주세요.',
    checkStatus: '회사 인증·구독 상태 확인',
    login: '바이어 로그인',
    error: '신상품·샘플 피드를 불러오지 못했습니다.',
    noImage: '등록된 이미지 없음',
    notice: '표시되는 이미지와 자료는 검토 목적의 바이어 전용 자료입니다. 외부 공유·재게시 전에 KERYX와 협의해 주세요.',
  },
  zh: {
    eyebrow: 'APPROVED BUYER DISCOVERY',
    title: '最新新品与样品',
    description: '仅展示经过运营团队审核后发布的项目。每个新品仅在发布日期起 14 天内显示于信息流。',
    active: '仅限获批买家',
    refresh: '刷新',
    loading: '正在加载新品与样品。',
    emptyTitle: '目前没有可查看的新品与样品。',
    emptyDescription: '新项目经过运营审核后会显示在这里。超过展示期的项目会自动从信息流隐藏。',
    sample: '可提供样品',
    category: '商品类别',
    ip: '关联 IP',
    published: '发布日期',
    expires: '信息流结束',
    customization: '定制范围',
    moq: 'MOQ 说明',
    leadTime: '交期说明',
    detail: '查看详情',
    accessTitle: '需要企业认证和订阅批准。',
    accessDescription: '最新新品与样品信息流仅向获批买家开放。请确认企业认证状态。',
    checkStatus: '确认企业认证与订阅状态',
    login: '买家登录',
    error: '暂时无法加载新品与样品信息流。',
    noImage: '未登记图片',
    notice: '展示的图片与资料仅供获批买家审核使用。对外分享或转载前请先与 KERYX 协商。',
  },
};

function formatDate(value: string, language: 'ko' | 'zh') {
  const date = new Date(value);
  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function ApprovedBuyerDiscoveryFeed() {
  const { lang } = useLangContext();
  const t = copy[lang];
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessRequired, setAccessRequired] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/buyer/discover', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) { setLoginRequired(true); setAccessRequired(false); return; }
        if (response.status === 403) { setAccessRequired(true); setLoginRequired(false); return; }
        throw new Error(payload.error || t.error);
      }
      setItems((payload as FeedResponse).items);
      setAccessRequired(false);
      setLoginRequired(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="flex flex-col gap-5 rounded-3xl bg-stone-950 p-6 text-white sm:p-9 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-orange-300">{t.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300 sm:text-base">{t.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-orange-300" aria-hidden="true" />{t.active}</span>
          <button type="button" onClick={() => void loadFeed()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/25 px-4 text-sm font-bold transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />{t.refresh}</button>
        </div>
      </section>

      {loading ? <section className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-stone-500" aria-hidden="true" /><p className="mt-4 text-sm font-bold text-stone-600">{t.loading}</p></section> : null}

      {!loading && (accessRequired || loginRequired) ? (
        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-9">
          <CircleAlert className="h-10 w-10 text-amber-700" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-black text-stone-950">{t.accessTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">{t.accessDescription}</p>
          <Link href={loginRequired ? '/login?next=/buyer/discover' : '/sample-subscription/status'} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95">{loginRequired ? t.login : t.checkStatus}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>
      ) : null}

      {!loading && error ? <section className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-6"><AlertCircle className="h-7 w-7 text-rose-700" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-rose-800">{error}</p><button type="button" onClick={() => void loadFeed()} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-rose-300 px-4 text-sm font-bold text-rose-800 transition hover:bg-white active:scale-95">{t.refresh}</button></section> : null}

      {!loading && !error && !accessRequired && !loginRequired && items.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-center sm:p-12"><PackageOpen className="mx-auto h-12 w-12 text-stone-400" aria-hidden="true" /><h2 className="mt-5 text-xl font-black">{t.emptyTitle}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600">{t.emptyDescription}</p></section>
      ) : null}

      {!loading && !error && !accessRequired && !loginRequired && items.length > 0 ? (
        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const image = item.assets.find((asset) => asset.mediaKind === 'image');
            const title = lang === 'ko' ? item.titleKo : item.titleZh || item.titleKo;
            const summary = lang === 'ko' ? item.summaryKo : item.summaryZh || item.summaryKo;
            const scope = lang === 'ko' ? item.customizationScopeKo : item.customizationScopeZh || item.customizationScopeKo;
            const moq = lang === 'ko' ? item.visibleMoqNoteKo : item.visibleMoqNoteZh || item.visibleMoqNoteKo;
            const leadTime = lang === 'ko' ? item.visibleLeadTimeNoteKo : item.visibleLeadTimeNoteZh || item.visibleLeadTimeNoteKo;
            return <article key={item.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-[4/3] bg-stone-100">{image ? <img src={image.url} alt={(lang === 'ko' ? image.altKo : image.altZh) || title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-bold text-stone-400"><Box className="mr-2 h-5 w-5" aria-hidden="true" />{t.noImage}</div>}</div>
              <div className="p-5">
                <div className="flex flex-wrap gap-2">{item.sampleAvailable ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{t.sample}</span> : null}<span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{t.category}: {item.categorySlug}</span>{item.ipSlug ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{t.ip}: {item.ipSlug}</span> : null}</div>
                <h2 className="mt-4 text-xl font-black tracking-tight">{title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{summary}</p>
                <dl className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-xs leading-5 text-stone-600"><div className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" /><div><dt className="font-black text-stone-700">{t.published}</dt><dd>{formatDate(item.publishedAt, lang)}</dd></div></div><div className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" /><div><dt className="font-black text-stone-700">{t.expires}</dt><dd>{formatDate(item.expiresAt, lang)}</dd></div></div>{scope ? <div><dt className="font-black text-stone-700">{t.customization}</dt><dd>{scope}</dd></div> : null}{moq ? <div><dt className="font-black text-stone-700">{t.moq}</dt><dd>{moq}</dd></div> : null}{leadTime ? <div><dt className="font-black text-stone-700">{t.leadTime}</dt><dd>{leadTime}</dd></div> : null}</dl>
                <Link href={`/buyer/discover/${item.id}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black text-stone-950 no-underline transition hover:text-orange-700">{t.detail}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
            </article>;
          })}
        </section>
      ) : null}
      <p className="mt-8 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500">{t.notice}</p>
    </main>
  );
}
