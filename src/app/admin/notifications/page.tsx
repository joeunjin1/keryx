'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';


type NotifType = 'all' | 'order' | 'inspection' | 'payment' | 'research' | 'ip';

const NOTIF_TABS: { id: NotifType; ko: string; zh: string; icon: string; color: string }[] = [
  { id: 'all', ko: '전체', zh: '全部', icon: '🔔', color: '#6b7280' },
  { id: 'order', ko: '신규 주문', zh: '新订单', icon: '🛒', color: '#f97316' },
  { id: 'inspection', ko: '검수', zh: '检验', icon: '🔍', color: '#4f46e5' },
  { id: 'payment', ko: '결제', zh: '付款', icon: '💳', color: '#10b981' },
  { id: 'research', ko: '시장조사', zh: '市场调研', icon: '🔬', color: '#0ea5e9' },
  { id: 'ip', ko: 'IP 승인', zh: 'IP审批', icon: '🎨', color: '#ec4899' },
];

interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  titleZh: string;
  desc: string;
  descZh: string;
  time: string;
  link: string;
  urgent?: boolean;
  read?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function AdminNotificationsPage() {

  // 페이지 제목 설정
  useEffect(() => {
    document.title = '알림 관리 | KERYX';
  }, []);
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const router = useRouter();
  const supabase = createClient() as any;
  const [userName, setUserName] = useState('관리자');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<NotifType>('all');
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [summary, setSummary] = useState({
    newOrders: 0,
    pendingInspections: 0,
    pendingPayments: 0,
    pendingResearch: 0,
    pendingIp: 0,
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const [orders, inspections, payments, research, ipApprovals] = await Promise.all([
      supabase.from('orders')
        .select('id, order_no, status, total_cny, created_at, seller:sellers(business_name)')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(20) as unknown as { data: any[] },
      supabase.from('inspections')
        .select('id, inspection_no, status, completed_at, outcome, order:orders(order_no, seller:sellers(business_name))')
        .eq('status', 'completed')
        .is('admin_reviewed_at', null)
        .order('completed_at', { ascending: false })
        .limit(20) as unknown as { data: any[] },
      supabase.from('payment_requests')
        .select('id, amount_cny, status, created_at, seller:sellers(business_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20) as unknown as { data: any[] },
      supabase.from('market_research_requests')
        .select('id, request_no, product_count, is_urgent, created_at, seller:sellers(business_name)')
        .eq('status', 'md_completed')
        .order('created_at', { ascending: false })
        .limit(20) as unknown as { data: any[] },
      supabase.from('ip_characters')
        .select('id, name_ko, name_zh, created_at, designer:internal_users(name_ko)')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(20) as unknown as { data: any[] },
    ]);

    const items: NotifItem[] = [];

    (orders.data ?? []).forEach((o: any) => {
      items.push({
        id: `order-${o.id}`,
        type: 'order',
        title: `신규 주문 승인 대기`,
        titleZh: `新订单待审批`,
        desc: `${o.seller?.business_name ?? '바이어(고객)'} · ${o.order_no} · ¥${(o.total_cny ?? 0).toLocaleString()}`,
        descZh: `${o.seller?.business_name ?? '买家(客户)'} · ${o.order_no} · ¥${(o.total_cny ?? 0).toLocaleString()}`,
        time: o.created_at,
        link: `/admin/inspections`,
        urgent: false,
      });
    });

    (inspections.data ?? []).forEach((i: any) => {
      const order = i.order ?? {};
      items.push({
        id: `insp-${i.id}`,
        type: 'inspection',
        title: `검수 완료 - 검토 필요`,
        titleZh: `检验完成 - 需要审核`,
        desc: `${order.seller?.business_name ?? '바이어(고객)'} · ${i.inspection_no} · ${i.outcome === 'pass' ? '✓ 합격' : i.outcome === 'fail' ? '✗ 불합격' : '결과 없음'}`,
        descZh: `${order.seller?.business_name ?? '买家(客户)'} · ${i.inspection_no}`,
        time: i.completed_at,
        link: `/admin/inspections/${i.id}`,
        urgent: i.outcome === 'fail',
      });
    });

    (payments.data ?? []).forEach((p: any) => {
      items.push({
        id: `pay-${p.id}`,
        type: 'payment',
        title: `결제 승인 대기`,
        titleZh: `付款待审批`,
        desc: `${p.seller?.business_name ?? '바이어(고객)'} · ¥${(p.amount_cny ?? 0).toLocaleString()}`,
        descZh: `${p.seller?.business_name ?? '买家(客户)'} · ¥${(p.amount_cny ?? 0).toLocaleString()}`,
        time: p.created_at,
        link: `/admin/payments`,
        urgent: false,
      });
    });

    (research.data ?? []).forEach((r: any) => {
      items.push({
        id: `res-${r.id}`,
        type: 'research',
        title: `시장조사 보고서 승인 대기`,
        titleZh: `市场调研报告待审批`,
        desc: `${r.seller?.business_name ?? '바이어(고객)'} · ${r.request_no} · ${r.product_count}건`,
        descZh: `${r.seller?.business_name ?? '买家(客户)'} · ${r.request_no} · ${r.product_count}件`,
        time: r.created_at,
        link: `/admin/research`,
        urgent: r.is_urgent,
      });
    });

    (ipApprovals.data ?? []).forEach((ip: any) => {
      items.push({
        id: `ip-${ip.id}`,
        type: 'ip',
        title: `IP 캐릭터 승인 대기`,
        titleZh: `IP角色待审批`,
        desc: `${ip.name_ko ?? ip.name_zh ?? 'IP'} · 디자이너: ${ip.designer?.name_ko ?? '-'}`,
        descZh: `${ip.name_zh ?? ip.name_ko ?? 'IP'} · 设计师: ${ip.designer?.name_ko ?? '-'}`,
        time: ip.created_at,
        link: `/admin/ip-approvals`,
        urgent: false,
      });
    });

    // 시간순 정렬
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setNotifications(items);
    setSummary({
      newOrders: (orders.data ?? []).length,
      pendingInspections: (inspections.data ?? []).length,
      pendingPayments: (payments.data ?? []).length,
      pendingResearch: (research.data ?? []).length,
      pendingIp: (ipApprovals.data ?? []).length,
    });
    setLastRefresh(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: me } = await supabase.from('internal_users').select('role, name_ko').eq('user_id', user.id).single() as { data: any; error: any };
      if (!me || !['admin', 'md'].includes(me.role)) { router.push('/admin'); return; }
      if (me.name_ko) setUserName(me.name_ko);
      load();
    })();
  }, []);

  const totalUnread = summary.newOrders + summary.pendingInspections + summary.pendingPayments + summary.pendingResearch + summary.pendingIp;
  const filtered = tab === 'all' ? notifications : notifications.filter(n => n.type === tab);
  const counts: Record<string, number> = { all: notifications.length };
  NOTIF_TABS.slice(1).forEach(t => { counts[t.id] = notifications.filter(n => n.type === t.id).length; });

  return (
    <div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
            🔔 <LangText ko="알림 센터" zh="通知中心" />
            {totalUnread > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            <LangText ko={`마지막 갱신: ${lastRefresh.toLocaleTimeString('ko')}`} zh={`最后更新: ${lastRefresh.toLocaleTimeString('zh')}`} />
          </p>
        </div>
        <button onClick={load} className="active:scale-95 transition-all px-3.5 py-2 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-[var(--bg-base)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer">
          🔄 <LangText ko="새로고침" zh="刷新" />
        </button>
      </div>


      <div className="grid grid-cols-5 gap-2 mb-5">
        {[
          { label: '신규주문', labelZh: '新订单', count: summary.newOrders, color: '#f97316', link: '/admin/inspections' },
          { label: '검수검토', labelZh: '检验审核', count: summary.pendingInspections, color: '#4f46e5', link: '/admin/inspections' },
          { label: '결제대기', labelZh: '待付款', count: summary.pendingPayments, color: '#10b981', link: '/admin/payments' },
          { label: '조사승인', labelZh: '调研审批', count: summary.pendingResearch, color: '#0ea5e9', link: '/admin/research' },
          { label: 'IP승인', labelZh: 'IP审批', count: summary.pendingIp, color: '#ec4899', link: '/admin/ip-approvals' },
        ].map(card => (
          <Link key={card.label} href={card.link} className="no-underline">
            <div className="rounded-[var(--radius-lg)] p-2.5 text-center transition-all duration-200 hover:shadow-md"
              style={{ background: card.count > 0 ? `${card.color}10` : 'var(--bg-base)', border: `1.5px solid ${card.count > 0 ? card.color : 'var(--border-light)'}` }}>
              <div className="text-xl font-extrabold"
                style={{ color: card.count > 0 ? card.color : 'var(--text-tertiary)' }}>{card.count}
              </div>
              <div className="text-[9px] font-semibold mt-0.5 leading-tight"
                style={{ color: card.count > 0 ? card.color : 'var(--text-tertiary)' }}>
                <LangText ko={card.label} zh={card.labelZh} />
              </div>
            </div>
          </Link>
        ))}
      </div>


      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {NOTIF_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs cursor-pointer flex items-center gap-1"
            style={{
              border: `1.5px solid ${tab === t.id ? t.color : 'var(--border-light)'}`,
              background: tab === t.id ? `${t.color}15` : 'var(--bg-base)',
              color: tab === t.id ? t.color : 'var(--text-secondary)',
              fontWeight: tab === t.id ? 700 : 500,
            }}>
            {t.icon} <LangText ko={t.ko} zh={t.zh} />
            {counts[t.id] > 0 && (
              <span className="rounded-full text-[10px] font-bold px-1.5 py-0.5"
                style={{ background: tab === t.id ? t.color : 'var(--border-light)', color: tab === t.id ? '#fff' : 'var(--text-tertiary)' }}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>


      {loading ? (
        <div className="text-center py-15 px-6 text-[var(--text-tertiary)]">
          <div className="text-3xl mb-3">⏳</div>
          <LangText ko="로딩 중..." zh="加载中..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-6 bg-[var(--bg-base)] rounded-[var(--radius-lg)] border border-[var(--border-light)]">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-sm text-[var(--text-secondary)]">
            <LangText ko="처리할 알림이 없습니다" zh="没有待处理的通知" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(n => {
            const tabInfo = NOTIF_TABS.find(t => t.id === n.type) ?? NOTIF_TABS[0];
            return (
              <Link key={n.id} href={n.link} className="no-underline">
                <div className="bg-[var(--bg-base)] rounded-[var(--radius-lg)] px-3.5 py-3 shadow-xs transition-shadow duration-150 hover:shadow-md"
                  style={{
                    border: `1px solid ${n.urgent ? '#fca5a5' : 'var(--border-light)'}`,
                    borderLeft: `4px solid ${n.urgent ? '#ef4444' : tabInfo.color}`,
                  }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{tabInfo.icon}</span>
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">
                          <LangText ko={n.title} zh={n.titleZh} />
                        </span>
                        {n.urgent && (
                          <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            🚨 긴급
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                        <LangText ko={n.desc} zh={n.descZh} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">{timeAgo(n.time)}
                      </div>
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color: tabInfo.color }}>→</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
