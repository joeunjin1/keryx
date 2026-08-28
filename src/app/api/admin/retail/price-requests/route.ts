import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET() {
  const session = createClient() as any;
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const admin = createAdminClient() as any;
  const { data: profile } = await admin.from('user_profiles').select('kind').eq('id', user.id).maybeSingle();
  if (profile?.kind !== 'admin') return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { data, error } = await admin
    .from('retail_price_change_requests')
    .select('id, product_id, requester_user_id, reviewer_user_id, current_price_krw, requested_price_krw, reason, status, reviewer_note, requested_at, reviewed_at, product:products(id, product_code, name_ko, name_zh)')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('[retail price request admin] list failed', error.message);
    return NextResponse.json({ error: '가격 변경 요청을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [], currentUserId: user.id });
}
