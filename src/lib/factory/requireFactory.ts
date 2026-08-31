import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * Requires an authenticated factory account with an explicitly linked factory.
 * Every factory-scoped API must call this before looking up project data.
 */
export async function requireFactory() {
  const sessionClient = createClient();
  const { data: { user }, error: userError } = await sessionClient.auth.getUser();
  if (userError || !user) {
    return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) } as const;
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.kind !== 'factory') {
    return { error: NextResponse.json({ error: '공장 계정으로 로그인해 주세요.' }, { status: 403 }) } as const;
  }

  const { data: factory, error: factoryError } = await admin
    .from('factories')
    .select('id, name, company_name_ko')
    .eq('shared_login_user_id', user.id)
    .maybeSingle();

  if (factoryError || !factory) {
    return {
      error: NextResponse.json({ error: '연결된 공장 프로필을 찾지 못했습니다. 운영자에게 문의해 주세요.' }, { status: 403 }),
    } as const;
  }

  return { admin, user, factory } as const;
}
