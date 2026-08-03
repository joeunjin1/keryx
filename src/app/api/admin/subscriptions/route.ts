import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 전체 구독 목록 (관리자)
export async function GET(req: NextRequest) {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 관리자 권한 확인 (user_profiles.kind)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;

  let query = supabase
    .from('subscriptions')
    .select(`
      *,
      sellers(
        business_name, contact_name, email
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ subscriptions: data, total: count, page, limit });
}

// PATCH: 구독 상태 변경 (관리자 승인/취소/만료)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { subscription_id, status, admin_note } = body;

  if (!subscription_id || !status) {
    return NextResponse.json({ error: 'subscription_id and status are required' }, { status: 400 });
  }

  const validStatuses = ['trial', 'active', 'cancelled', 'expired', 'pending'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    status,
    admin_note: admin_note || null,
    updated_at: new Date().toISOString(),
  };

  // 활성화 시 시작일/종료일 설정
  if (status === 'active') {
    const now = new Date();
    updateData.current_period_start = now.toISOString();
    // 기존 구독 정보 가져와서 billing_cycle 확인
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('billing_cycle')
      .eq('id', subscription_id)
      .single();

    if (sub) {
      const end = new Date(now);
      if (sub.billing_cycle === 'yearly') {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }
      updateData.current_period_end = end.toISOString();
    }
  }

  // 취소/만료 시 종료일 설정
  if (status === 'cancelled' || status === 'expired') {
    updateData.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('id', subscription_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data });
}
