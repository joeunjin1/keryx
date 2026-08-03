import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 관리자 권한 확인 (@supabase/ssr 기반 - 미들웨어와 동일 방식으로 세션 공유)
    const authClient = createClient() as any;
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await authClient
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();
    // admin, md, inspector 모두 서비스신청 목록 조회 가능
    if (!profile || !['admin', 'md', 'inspector'].includes(profile.kind)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. service_role_key로 전체 데이터 조회 (RLS 우회)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .select('*, replies:service_request_replies(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] service_requests list error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[API] service_requests list exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
