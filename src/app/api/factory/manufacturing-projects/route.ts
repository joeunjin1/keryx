import { NextResponse } from 'next/server';
import { requireFactory } from '@/lib/factory/requireFactory';

export const dynamic = 'force-dynamic';

/** Lists only projects assigned to the authenticated factory. */
export async function GET() {
  const context = await requireFactory();
  if ('error' in context) return context.error;

  const { data, error } = await (context.admin as any)
    .from('manufacturing_project_factory_assignments')
    .select(`
      id,
      status,
      assigned_at,
      selection_note,
      project:manufacturing_projects(
        id,
        project_no,
        project_name,
        product_category,
        product_summary,
        preferred_language,
        current_status,
        updated_at
      )
    `)
    .eq('factory_id', context.factory.id)
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[factory manufacturing projects] list failed', error.message);
    return NextResponse.json({ error: '배정된 제조 프로젝트를 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    factory: { id: context.factory.id, name: context.factory.company_name_ko || context.factory.name || '연결된 공장' },
    assignments: data ?? [],
  });
}
