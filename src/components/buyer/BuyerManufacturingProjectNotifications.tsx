'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCheck, Clock3 } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';

type Notification = { id: string; title: string; title_zh: string | null; body: string | null; body_zh: string | null; is_read: boolean; created_at: string };

export function BuyerManufacturingProjectNotifications({ projectId }: { projectId: string }) {
  const { lang } = useLangContext();
  const text = useCallback((ko: string, zh: string) => (lang === 'zh' ? zh : ko), [lang]);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/buyer/projects/${projectId}/notifications`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('프로젝트 알림을 불러오지 못했습니다.', '无法加载项目通知。'));
      setItems(payload.notifications ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : text('프로젝트 알림을 불러오지 못했습니다.', '无法加载项目通知。')); }
    finally { setLoading(false); }
  }, [projectId, text]);
  useEffect(() => { void load(); }, [load]);

  async function markRead(notificationId: string) {
    setItems((current) => current.map((item) => item.id === notificationId ? { ...item, is_read: true } : item));
    const response = await fetch(`/api/buyer/projects/${projectId}/notifications`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId }) });
    if (!response.ok) await load();
  }

  const unread = items.filter((item) => !item.is_read).length;
  return <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-black tracking-wider text-amber-800"><BellRing className="size-4" />{text('프로젝트 알림', '项目通知')}</p><h2 className="mt-2 text-lg font-black text-stone-950">{text('확인이 필요한 일정과 진행 안내', '需要确认的日程与进度说明')}</h2></div>{unread > 0 ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900">{text(`${unread}건 미확인`, `${unread}条未读`)}</span> : null}</div>
  {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
  {loading ? <div className="mt-5 space-y-3"><div className="h-16 animate-pulse rounded-2xl bg-stone-100" /><div className="h-16 animate-pulse rounded-2xl bg-stone-100" /></div> : items.length ? <ol className="mt-5 space-y-3">{items.map((item) => <li key={item.id} className={`rounded-2xl border p-4 ${item.is_read ? 'border-stone-100 bg-stone-50' : 'border-amber-200 bg-amber-50'}`}><button type="button" onClick={() => void markRead(item.id)} className="block w-full text-left"><div className="flex gap-3"><Clock3 className={`mt-0.5 size-4 shrink-0 ${item.is_read ? 'text-stone-400' : 'text-amber-700'}`} /><div className="min-w-0"><p className="text-sm font-black text-stone-900">{lang === 'zh' ? item.title_zh || item.title : item.title}</p><p className="mt-1 text-sm leading-6 text-stone-600">{lang === 'zh' ? item.body_zh || item.body : item.body}</p><p className="mt-2 text-xs text-stone-500">{new Date(item.created_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}</p></div>{!item.is_read ? <CheckCheck className="size-4 shrink-0 text-amber-700" /> : null}</div></button></li>)}</ol> : <p className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-600">{text('현재 이 프로젝트에 확인할 새 알림이 없습니다.', '当前此项目没有需要确认的新通知。')}</p>}</section>;
}
