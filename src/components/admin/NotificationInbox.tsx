'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function NotificationInbox({ internalUserId }: { internalUserId: string }) {
  const supabase = createClient() as any;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('operator_notifications')
      .select('*')
      .or(`recipient_internal_user_id.is.null,recipient_internal_user_id.eq.${internalUserId}`)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel('operator-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'operator_notifications' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [internalUserId]);

  async function markRead(id: string) {
    await supabase.rpc('mark_notification_read' as any, { p_notification_id: id });
    setNotifications((cur) => cur.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read' as any, { p_internal_user_id: internalUserId });
    await load();
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const visible = expanded ? notifications : notifications.filter((n) => !n.read_at).slice(0, 3);

  if (loading) return null;

  if (notifications.length === 0) {
    return (
      <Card className="bg-stone-50 border-stone-200">
        <CardBody className="py-3">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Bell className="w-4 h-4" />
            <span>알림 없음 — 모든 운영 항목이 정상</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-0">
        <div className="flex items-center justify-between p-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-stone-700" />
            <span className="text-sm font-medium">운영자 알림</span>
            {unreadCount > 0 && (
              <Badge variant="brand" size="sm">{unreadCount} 신규</Badge>
            )}
          </div>
          <div className="flex gap-2 text-xs">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-stone-500 hover:text-stone-800">
                모두 읽음
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-stone-500 hover:text-stone-800"
            >
              {expanded ? '접기' : `전체 ${notifications.length}건 보기`}
            </button>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {visible.map((n: any) => {
            const isUnread = !n.read_at;
            const Icon = n.severity === 'critical' ? AlertCircle :
                         n.severity === 'warning' ? AlertTriangle : Info;
            const iconColor = n.severity === 'critical' ? 'text-red-500' :
                              n.severity === 'warning' ? 'text-vip-600' : 'text-blue-500';

            return (
              <div
                key={n.id}
                className={`p-3 flex items-start gap-3 ${isUnread ? 'bg-brand-50/30' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{n.title}</div>
                    {isUnread && <Badge variant="brand" size="xs">신규</Badge>}
                  </div>
                  {n.body && (
                    <div className="text-xs text-stone-600 mt-0.5">{n.body}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-stone-400">
                      {new Date(n.created_at).toLocaleString('ko')}
                    </span>
                    {n.related_url && (
                      <Link
                        href={n.related_url}
                        onClick={() => isUnread && markRead(n.id)}
                        className="text-[11px] text-brand-600 hover:underline"
                      >
                        이동 →
                      </Link>
                    )}
                  </div>
                </div>
                {isUnread && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-stone-400 hover:text-stone-700 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!expanded && notifications.length > visible.length && (
          <div className="px-3 py-2 text-center text-[11px] text-stone-500 border-t border-stone-100">
            +{notifications.length - visible.length}건 추가
          </div>
        )}
      </CardBody>
    </Card>
  );
}
