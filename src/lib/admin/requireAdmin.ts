import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export type AdminContext = {
  user: { id: string; email?: string | null };
  admin: ReturnType<typeof createAdminClient>;
};

/**
 * 운영자 등록·수정 API의 단일 권한 관문입니다.
 * user_profiles.kind='admin'인 세션만 통과시키며, service role은 통과 후에만 생성합니다.
 */
export async function requireAdmin(): Promise<AdminContext | { error: NextResponse }> {
  const sessionClient = createClient();
  const { data: { user }, error: userError } = await sessionClient.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.kind !== 'admin') {
    return { error: NextResponse.json({ error: '운영자 권한이 필요합니다.' }, { status: 403 }) };
  }

  return { user: { id: user.id, email: user.email }, admin };
}

export async function writeOperatorLog(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await admin.from('operator_activity_log').insert({
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata,
  });

  if (error) {
    console.error('[operator audit]', action, error.message);
  }
}
