import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

type SlaTarget = {
  id: string;
  project_id: string;
  current_action_key: string;
  due_at: string;
  owner_user_id: string | null;
  owner_role: 'admin' | 'md' | 'factory' | 'seller';
  buyer_notice_enabled: boolean;
  manufacturing_projects: { project_no: string; project_name: string; seller_id: string } | null;
};

function thresholdFor(dueAt: string, now: Date) {
  const days = Math.ceil((new Date(dueAt).getTime() - now.getTime()) / DAY_MS);
  if (days === 3) return { key: 'due_soon_3d' as const, labelKo: '3일 전', labelZh: '提前 3 天' };
  if (days === 1) return { key: 'due_soon_1d' as const, labelKo: '1일 전', labelZh: '提前 1 天' };
  if (days <= 0) return { key: 'overdue_daily' as const, labelKo: '기한 경과', labelZh: '已逾期' };
  return null;
}

async function reserveLog(admin: ReturnType<typeof createAdminClient>, targetId: string, recipientScope: 'owner' | 'buyer' | 'admin', thresholdKey: 'due_soon_3d' | 'due_soon_1d' | 'overdue_daily', scheduledFor: string) {
  const { data, error } = await (admin as any).from('manufacturing_project_sla_alert_log')
    .insert({ sla_target_id: targetId, recipient_scope: recipientScope, threshold_key: thresholdKey, scheduled_for: scheduledFor })
    .select('id').single();
  if (error?.code === '23505') return null;
  if (error || !data) throw new Error(error?.message || '알림 이력을 만들지 못했습니다.');
  return data.id as string;
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const scheduledFor = now.toISOString().slice(0, 10);
  const upper = new Date(now.getTime() + 3 * DAY_MS).toISOString();
  const { data, error } = await (admin as any)
    .from('manufacturing_project_sla_targets')
    .select('id, project_id, current_action_key, due_at, owner_user_id, owner_role, buyer_notice_enabled, manufacturing_projects!inner(project_no, project_name, seller_id)')
    .eq('status', 'active')
    .lte('due_at', upper);
  if (error) return NextResponse.json({ error: 'SLA 대상을 불러오지 못했습니다.' }, { status: 500 });

  let created = 0;
  let skipped = 0;
  const failures: string[] = [];
  for (const target of (data ?? []) as SlaTarget[]) {
    const threshold = thresholdFor(target.due_at, now);
    const project = target.manufacturing_projects;
    if (!threshold || !project) continue;
    const due = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(target.due_at));
    const titleKo = `[제조 기한 ${threshold.labelKo}] ${project.project_no}`;
    const titleZh = `[制造期限${threshold.labelZh}] ${project.project_no}`;
    const bodyKo = `${project.project_name} · 다음 작업: ${target.current_action_key} · 기한: ${due}`;
    const bodyZh = `${project.project_name} · 下一工作：${target.current_action_key} · 截止日期：${due}`;

    if (target.owner_user_id && target.owner_role !== 'seller') {
      try {
        const logId = await reserveLog(admin, target.id, 'owner', threshold.key, scheduledFor);
        if (!logId) { skipped += 1; } else {
          const { data: notification, error: notificationError } = await (admin as any).from('notifications').insert({
            recipient_user_id: target.owner_user_id, recipient_role: target.owner_role,
            type: 'status_updated', title: titleKo, title_zh: titleZh, body: bodyKo, body_zh: bodyZh,
            related_id: target.project_id, related_type: 'manufacturing_project', action_url: `/admin/manufacturing-projects/${target.project_id}/execution`,
          }).select('id').single();
          if (notificationError || !notification) { await (admin as any).from('manufacturing_project_sla_alert_log').delete().eq('id', logId); throw new Error(notificationError?.message || '내부 알림 생성 실패'); }
          await (admin as any).from('manufacturing_project_sla_alert_log').update({ notification_id: notification.id }).eq('id', logId);
          created += 1;
        }
      } catch (cause) { failures.push(`owner:${target.project_id}:${cause instanceof Error ? cause.message : 'unknown'}`); }
    }

    if (target.buyer_notice_enabled && project.seller_id && threshold.key !== 'due_soon_3d') {
      try {
        const logId = await reserveLog(admin, target.id, 'buyer', threshold.key, scheduledFor);
        if (!logId) { skipped += 1; } else {
          const { data: notification, error: notificationError } = await (admin as any).from('seller_notifications').insert({
            seller_id: project.seller_id, type: 'general', title: titleKo, title_zh: titleZh, body: bodyKo, body_zh: bodyZh,
            link_url: `/buyer/projects/${target.project_id}`, sent_by_name: 'KERYX', related_id: target.project_id, related_type: 'manufacturing_project',
          }).select('id').single();
          if (notificationError || !notification) { await (admin as any).from('manufacturing_project_sla_alert_log').delete().eq('id', logId); throw new Error(notificationError?.message || '바이어 알림 생성 실패'); }
          await (admin as any).from('manufacturing_project_sla_alert_log').update({ seller_notification_id: notification.id }).eq('id', logId);
          created += 1;
        }
      } catch (cause) { failures.push(`buyer:${target.project_id}:${cause instanceof Error ? cause.message : 'unknown'}`); }
    }
  }
  return NextResponse.json({ ok: failures.length === 0, created, skipped, failed: failures.length, executed_at: now.toISOString(), failures });
}
