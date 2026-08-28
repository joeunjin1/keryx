'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Mail, Search, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

interface Subscriber {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  business_number: string | null;
  business_license_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'unsubscribed';
  rejection_reason: string | null;
  notes: string | null;
  subscribed_at: string;
  approved_at: string | null;
  interest_ip_slugs: string[];
  interest_categories: string[];
  privacy_consent_at: string | null;
  marketing_consent_at: string | null;
  source: string;
}

const statusStyle: Record<Subscriber['status'], string> = {
  pending: 'bg-amber-50 text-amber-800',
  approved: 'bg-emerald-50 text-emerald-800',
  rejected: 'bg-rose-50 text-rose-800',
  unsubscribed: 'bg-stone-100 text-stone-600',
};

export default function SampleSubscribersPage() {
  const router = useRouter();
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filter, setFilter] = useState<'all' | Subscriber['status']>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const supabase = createClient() as any;

  const fetchSubscribers = async () => {
    setLoading(true);
    setMessage('');
    let request = supabase
      .from('b2b_subscribers')
      .select('id, email, company_name, contact_name, phone, business_number, business_license_url, status, rejection_reason, notes, subscribed_at, approved_at, interest_ip_slugs, interest_categories, privacy_consent_at, marketing_consent_at, source')
      .is('deleted_at', null)
      .order('subscribed_at', { ascending: false });
    if (filter !== 'all') request = request.eq('status', filter);
    const { data, error } = await request;
    if (error) setMessage(t('구독자 정보를 불러오지 못했습니다.', '无法加载订阅者信息。'));
    else setSubscribers((data || []).map((item: Subscriber) => ({
      ...item,
      contact_name: item.contact_name || '',
      interest_ip_slugs: Array.isArray(item.interest_ip_slugs) ? item.interest_ip_slugs : [],
      interest_categories: Array.isArray(item.interest_categories) ? item.interest_categories : [],
    })));
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login?next=/admin/b2b-subscribers'); return; }
      const { data: profile } = await supabase.from('user_profiles').select('kind').eq('id', user.id).maybeSingle();
      if (profile?.kind !== 'admin' && profile?.kind !== 'marketing') { router.replace('/admin'); return; }
      fetchSubscribers();
    })();
  }, [filter]);

  const updateStatus = async (subscriber: Subscriber, nextStatus: Subscriber['status'], reason = '') => {
    setActionLoading(subscriber.id);
    const now = new Date().toISOString();
    const updates = nextStatus === 'approved'
      ? { status: nextStatus, approved_at: now, rejection_reason: null, rejected_at: null }
      : { status: nextStatus, rejection_reason: reason || null, rejected_at: now };
    const { error } = await supabase.from('b2b_subscribers').update(updates).eq('id', subscriber.id);
    if (error) setMessage(t('구독 상태를 저장하지 못했습니다.', '无法保存订阅状态。'));
    else await fetchSubscribers();
    setActionLoading(null);
  };

  const reject = (subscriber: Subscriber) => {
    const reason = window.prompt(t('검토 보류 또는 반려 사유를 입력해 주세요.', '请输入暂缓或拒绝原因。'));
    if (reason === null) return;
    updateStatus(subscriber, 'rejected', reason);
  };

  const remove = async (subscriber: Subscriber) => {
    if (!window.confirm(t('이 구독 신청을 목록에서 삭제하시겠습니까? 삭제 기록은 복구할 수 없습니다.', '要从列表中删除此订阅申请吗？删除记录无法恢复。'))) return;
    setActionLoading(subscriber.id);
    const { error } = await supabase.from('b2b_subscribers').update({ deleted_at: new Date().toISOString() }).eq('id', subscriber.id);
    if (error) setMessage(t('삭제하지 못했습니다.', '无法删除。'));
    else await fetchSubscribers();
    setActionLoading(null);
  };

  const visible = useMemo(() => subscribers.filter((subscriber) => {
    const text = `${subscriber.company_name} ${subscriber.contact_name} ${subscriber.email} ${subscriber.phone || ''}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [subscribers, query]);

  const statusLabel = (status: Subscriber['status']) => ({
    pending: t('검토 대기', '待审核'),
    approved: t('발송 대상', '发送对象'),
    rejected: t('보류·반려', '暂缓·拒绝'),
    unsubscribed: t('수신 해지', '退订'),
  }[status]);

  return <div className="mx-auto max-w-screen-2xl p-4 sm:p-6"><div className="border-b border-stone-200 pb-5"><p className="text-xs font-black tracking-[0.16em] text-orange-700">SAMPLE SUBSCRIPTION</p><h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950">{t('샘플 구독 관리', '样品订阅管理')}</h1><p className="mt-2 text-sm leading-6 text-stone-600">{t('사업자 확인 후 신상품·샘플 소식 수신 대상을 검토합니다. 기존 B2B 구독 이력은 유지됩니다.', '确认企业信息后审核新品及样品资讯的接收对象。现有 B2B 订阅历史会保留。')}</p></div><div className="mt-6 flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:flex-row"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-stone-50 px-3"><Search className="h-4 w-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('회사명·담당자·이메일 검색', '搜索公司、负责人或邮箱')} className="min-h-11 w-full bg-transparent text-sm outline-none" /></div><div className="flex gap-2 overflow-x-auto">{(['all', 'pending', 'approved', 'rejected', 'unsubscribed'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold transition ${filter === value ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}>{value === 'all' ? t('전체', '全部') : statusLabel(value)}</button>)}</div></div>{message && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{message}</p>}{loading ? <div className="mt-6 space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-stone-200" />)}</div> : <div className="mt-6 grid gap-4 xl:grid-cols-2">{visible.map((subscriber) => <article key={subscriber.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusStyle[subscriber.status]}`}>{statusLabel(subscriber.status)}</span><span className="text-xs text-stone-400">{new Date(subscriber.subscribed_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}</span></div><h2 className="mt-3 truncate text-lg font-black">{subscriber.company_name}</h2><p className="mt-1 text-sm text-stone-600">{subscriber.contact_name || t('담당자 미입력', '未填写负责人')} · {subscriber.email}</p>{subscriber.phone && <p className="mt-1 text-xs text-stone-500">{subscriber.phone}</p>}</div><Mail className="h-5 w-5 shrink-0 text-stone-400" /></div><div className="mt-5 grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2"><div><p className="text-xs font-bold text-stone-500">{t('관심 IP', '关注 IP')}</p><p className="mt-2 text-sm leading-6 text-stone-800">{subscriber.interest_ip_slugs.length ? subscriber.interest_ip_slugs.join(' · ') : t('선택하지 않음', '未选择')}</p></div><div><p className="text-xs font-bold text-stone-500">{t('관심 상품군', '关注商品类别')}</p><p className="mt-2 text-sm leading-6 text-stone-800">{subscriber.interest_categories.length ? subscriber.interest_categories.join(' · ') : t('선택하지 않음', '未选择')}</p></div></div>{subscriber.rejection_reason && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{t('사유', '原因')}: {subscriber.rejection_reason}</p>}<div className="mt-5 flex flex-wrap gap-2">{subscriber.status === 'pending' && <><button type="button" disabled={actionLoading === subscriber.id} onClick={() => updateStatus(subscriber, 'approved')} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white disabled:bg-stone-300 active:scale-95"><Check className="h-3.5 w-3.5" />{t('발송 대상 승인', '批准为发送对象')}</button><button type="button" disabled={actionLoading === subscriber.id} onClick={() => reject(subscriber)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 active:scale-95"><X className="h-3.5 w-3.5" />{t('보류·반려', '暂缓·拒绝')}</button></>}<button type="button" disabled={actionLoading === subscriber.id} onClick={() => remove(subscriber)} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-stone-500 hover:bg-rose-50 hover:text-rose-700 active:scale-95"><Trash2 className="h-3.5 w-3.5" />{t('삭제', '删除')}</button></div></article>)}</div>}{!loading && visible.length === 0 && <div className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-sm text-stone-500">{t('조건에 맞는 구독 신청이 없습니다.', '没有符合条件的订阅申请。')}</div>}</div>;
}
