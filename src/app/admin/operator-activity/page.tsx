'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';

type ActivityItem = { id: string; actor_id: string | null; action: string; target_table: string; target_id: string | null; metadata: Record<string, unknown>; created_at: string };

const labelMap: Record<string, { ko: string; zh: string }> = {
  ip_characters: { ko: 'IP', zh: 'IP' }, ip_cast_members: { ko: '캐릭터', zh: '角色' }, ip_content_entries: { ko: '연재 콘텐츠', zh: '连载内容' }, content_media_assets: { ko: '이미지·미디어', zh: '图片·媒体' }, products: { ko: '상품', zh: '商品' }, product_options: { ko: '상품 옵션', zh: '商品选项' }, retail_products: { ko: '소매 판매 설정', zh: '零售销售设置' }, preorder_purchase_queue: { ko: '주문 전 발주', zh: '预采购' },
};

export default function OperatorActivityPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [items, setItems] = useState<ActivityItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const response = await fetch('/api/admin/operator-activity', { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || t('운영 이력을 불러오지 못했습니다.', '无法读取运营记录。')); setItems(payload.items || []); } catch (err) { setError(err instanceof Error ? err.message : t('운영 이력을 불러오지 못했습니다.', '无法读取运营记录。')); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <div className="mx-auto max-w-screen-xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-cyan-300"><ShieldCheck className="h-4 w-4" /> OPERATOR ACTIVITY</div><h1 className="mt-4 text-3xl font-black tracking-tight">{t('운영 이력', '运营记录')}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t('IP, 상품, 콘텐츠, 판매 설정, 발주 상태의 등록·수정·공개 전환 기록을 확인합니다. 이 화면에서는 이력을 변경하거나 삭제할 수 없습니다.', '在此查看 IP、商品、内容、销售设置和预采购状态的登记、修改、公开转换记录。此页面不可修改或删除记录。')}</p></div><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10 active:scale-95"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('새로고침', '刷新')}</button></div></section>
    {error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>}
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white"><div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4"><Activity className="h-5 w-5 text-indigo-700" /><h2 className="text-lg font-black text-stone-950">{t('최근 변경 기록', '最近变更记录')}</h2></div>{loading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-stone-100" />)}</div> : items.length === 0 ? <div className="p-10 text-center"><Activity className="mx-auto h-10 w-10 text-stone-300" /><p className="mt-4 font-bold text-stone-700">{t('아직 기록된 운영 변경이 없습니다.', '尚无已记录的运营变更。')}</p><p className="mt-2 text-sm text-stone-500">{t('IP·상품·콘텐츠를 등록하거나 공개 상태를 변경하면 이력이 표시됩니다.', '登记 IP、商品、内容或变更公开状态后，记录将显示在此处。')}</p></div> : <ul className="divide-y divide-stone-100">{items.map((item) => { const label = labelMap[item.target_table]?.[lang] || item.target_table; return <li key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div><p className="font-bold text-stone-950">{label} · {item.action}</p><p className="mt-1 break-all text-xs text-stone-500">{t('대상 ID:', '对象 ID:')} {item.target_id || '—'}</p></div><time dateTime={item.created_at} className="text-xs text-stone-500">{new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</time></li>; })}</ul>}</section></div>;
}
