import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const { data, error } = await (context.admin as any)
    .from('user_profiles')
    .select('id, full_name, kind')
    .in('kind', ['admin', 'md'])
    .order('full_name', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[admin manufacturing projects] assignable members failed', error.message);
    return NextResponse.json({ error: '배정 가능한 담당자 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
}
