import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, writeOperatorLog } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const DecisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('submit') }),
  z.object({
    action: z.literal('approve'),
    buyerVisible: z.boolean(),
    summaryKo: z.string().trim().max(3000).optional().default(''),
    summaryZh: z.string().trim().max(3000).optional().default(''),
  }),
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; qcReportId: string }> }) {
  const context = await requireAdmin();
  if ('error' in context) return context.error;
  const { projectId, qcReportId } = await params;
  if (!isUuid(projectId) || !isUuid(qcReportId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 또는 QC 보고서 주소입니다.' }, { status: 400 });

  const parsed = DecisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'QC 처리 요청을 확인해 주세요.' }, { status: 400 });

  const { data: report, error: reportError } = await (context.admin as any)
    .from('manufacturing_qc_reports')
    .select('id, project_id, status')
    .eq('id', qcReportId).eq('project_id', projectId).maybeSingle();
  if (reportError || !report) return NextResponse.json({ error: '해당 프로젝트의 QC 보고서를 찾을 수 없습니다.' }, { status: 404 });

  const sessionClient = createClient();
  if (parsed.data.action === 'submit') {
    const { data, error } = await (sessionClient as any).rpc('keryx_submit_manufacturing_qc_report', { p_qc_report_id: qcReportId });
    if (error || !data) {
      return NextResponse.json({ error: error?.message?.includes('evidence') ? 'QC 증빙 파일을 최소 한 건 연결한 뒤 제출해 주세요.' : 'QC 보고서를 제출하지 못했습니다.' }, { status: 409 });
    }
    await writeOperatorLog(context.admin, context.user.id, 'manufacturing_qc_report_submitted', 'manufacturing_qc_reports', qcReportId, { project_id: projectId });
    return NextResponse.json({ report: data });
  }

  const { data, error } = await (sessionClient as any).rpc('keryx_approve_manufacturing_qc_report', {
    p_qc_report_id: qcReportId,
    p_buyer_visible: parsed.data.buyerVisible,
    p_summary_ko: parsed.data.summaryKo || null,
    p_summary_zh: parsed.data.summaryZh || null,
  });
  if (error || !data) return NextResponse.json({ error: '제출된 QC 보고서만 승인할 수 있습니다.' }, { status: 409 });

  await writeOperatorLog(context.admin, context.user.id, 'manufacturing_qc_report_approved', 'manufacturing_qc_reports', qcReportId, {
    project_id: projectId,
    buyer_visible: parsed.data.buyerVisible,
  });
  return NextResponse.json({ report: data });
}
