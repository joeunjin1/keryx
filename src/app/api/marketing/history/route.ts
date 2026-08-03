import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/check-role';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const user = await getAuthUser(['admin', 'marketing']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  // 이메일 캠페인 이력
  const { data: emailCampaigns } = await supabase
    .from('email_campaigns')
    .select(`
      id,
      type,
      subject,
      body,
      total_count,
      success_count,
      failed_count,
      created_at,
      sender:user_profiles!email_campaigns_sender_id_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  // SMS 캠페인 이력
  const { data: smsCampaigns } = await supabase
    .from('sms_campaigns')
    .select(`
      id,
      type,
      message,
      total_count,
      success_count,
      failed_count,
      created_at,
      sender:user_profiles!sms_campaigns_sender_id_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  // 통합 이력 구성
  const campaigns = [
    ...(emailCampaigns ?? []).map(c => ({
      id: c.id,
      type: 'email' as const,
      subject: c.subject,
      message_preview: c.body?.substring(0, 100) ?? '',
      total_count: c.total_count,
      success_count: c.success_count,
      failed_count: c.failed_count,
      created_at: c.created_at,
      sender_name: (c.sender as { display_name?: string } | null)?.display_name ?? '알 수 없음',
    })),
    ...(smsCampaigns ?? []).map(c => ({
      id: c.id,
      type: 'sms' as const,
      subject: undefined,
      message_preview: c.message?.substring(0, 100) ?? '',
      total_count: c.total_count,
      success_count: c.success_count,
      failed_count: c.failed_count,
      created_at: c.created_at,
      sender_name: (c.sender as { display_name?: string } | null)?.display_name ?? '알 수 없음',
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ campaigns });
}
