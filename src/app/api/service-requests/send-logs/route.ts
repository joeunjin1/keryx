/**
 * 발송 내역 조회 API
 * GET /api/service-requests/send-logs
 * admin, md만 접근 가능
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authClient = createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'md'].includes(profile.kind)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const offset = (page - 1) * limit;

    const { data: logs, error, count } = await serviceClient
      .from('report_send_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // 테이블이 없는 경우 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json({ logs: [], total: 0, page, limit });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs ?? [], total: count ?? 0, page, limit });

  } catch (err: any) {
    console.error('[send-logs/route] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
