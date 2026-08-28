import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(); if ('error' in auth) return auth.error;
  const limitValue = Number(request.nextUrl.searchParams.get('limit') || '100');
  const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 200) : 100;
  const { data, error } = await auth.admin
    .from('operator_activity_log')
    .select('id,actor_id,action,target_table,target_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: '운영 이력을 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
