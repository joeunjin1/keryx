import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const QuoteSchema = z.object({
  currency: z.literal('CNY').default('CNY'),
  buyerVisibleItems: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    specification: z.string().trim().max(500).optional().default(''),
    quantity: z.number().positive().max(10_000_000),
    unitPrice: z.number().nonnegative().max(1_000_000_000),
    subtotal: z.number().nonnegative().max(10_000_000_000),
  })).min(1).max(100),
  buyerVisibleTotal: z.number().nonnegative().max(10_000_000_000),
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });
  const parsed = QuoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: '바이어 공개 견적 항목과 합계를 확인해 주세요.' }, { status: 400 });

  const expectedTotal = parsed.data.buyerVisibleItems.reduce((sum, item) => sum + item.subtotal, 0);
  if (Math.abs(expectedTotal - parsed.data.buyerVisibleTotal) > 0.01) {
    return NextResponse.json({ error: '바이어 공개 견적 합계가 항목 합계와 일치하지 않습니다.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const { data: latestQuote } = await (context.admin as any)
    .from('manufacturing_quote_snapshots')
    .select('version_no')
    .eq('project_id', project.id)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: quote, error: insertError } = await (context.admin as any)
    .from('manufacturing_quote_snapshots')
    .insert({
      project_id: project.id,
      version_no: (latestQuote?.version_no ?? 0) + 1,
      status: 'pending_buyer',
      currency: parsed.data.currency,
      buyer_visible_items: parsed.data.buyerVisibleItems,
      buyer_visible_total: parsed.data.buyerVisibleTotal,
      issued_by: context.user.id,
      issued_at: new Date().toISOString(),
    })
    .select('id, version_no, status, currency, issued_at')
    .single();
  if (insertError || !quote) {
    console.error('[admin manufacturing quote] insert failed', insertError?.message);
    return NextResponse.json({ error: '바이어 공개 견적을 발행하지 못했습니다.' }, { status: 500 });
  }

  await (context.admin as any).from('manufacturing_project_events').insert({
    project_id: project.id,
    event_type: 'buyer_quote_issued',
    visibility: 'buyer',
    actor_user_id: context.user.id,
    detail: { quote_snapshot_id: quote.id, version_no: quote.version_no, currency: quote.currency },
  });
  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_quote_issued', 'manufacturing_quote_snapshots', quote.id, { project_id: project.id, project_no: project.project_no, version_no: quote.version_no, currency: quote.currency });

  return NextResponse.json({ quote }, { status: 201 });
}
