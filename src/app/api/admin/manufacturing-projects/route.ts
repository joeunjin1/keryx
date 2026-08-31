import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const context = await requireAdmin();
  if ('error' in context) return context.error;

  const { data, error } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no, project_name, product_category, current_status, seller_id, created_at, updated_at, submitted_at, sellers(business_name)')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[admin manufacturing projects] list failed', error.message);
    return NextResponse.json({ error: '제조 프로젝트 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}
