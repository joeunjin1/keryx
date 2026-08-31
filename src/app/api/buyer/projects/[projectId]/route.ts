import { NextRequest, NextResponse } from 'next/server';
import { requireSeller } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireSeller();
  if ('error' in context) return context.error;

  const { projectId } = await params;
  if (!looksLikeUuid(projectId)) {
    return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await (context.admin as any)
    .from('manufacturing_projects')
    .select('id, project_no, project_name, product_category, product_summary, preferred_language, current_status, created_at, updated_at, submitted_at, completed_at, cancelled_at, cancellation_reason, source_service_request_id, source_discovery_offering_id')
    .eq('id', projectId)
    .eq('seller_id', context.seller.id)
    .maybeSingle();

  if (projectError) {
    console.error('[manufacturing project] project lookup failed', projectError.message);
    return NextResponse.json({ error: '제조 프로젝트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
  if (!project) {
    return NextResponse.json({ error: '본인 회사의 제조 프로젝트만 확인할 수 있습니다.' }, { status: 404 });
  }

  const [briefResult, stageResult, sampleResult, approvalResult, eventResult, quoteResult, fileResult] = await Promise.all([
    (context.admin as any)
      .from('manufacturing_project_briefs')
      .select('id, version_no, status, product_name, product_description, target_customer, target_quantity, target_market, required_by_date, material_preferences, dimensions_text, packaging_requirements, compliance_requirements, buyer_notes, created_at, updated_at')
      .eq('project_id', project.id)
      .order('version_no', { ascending: false }),
    (context.admin as any)
      .from('manufacturing_project_stages')
      .select('id, stage_key, stage_order, stage_status, planned_start_on, planned_end_on, actual_start_at, actual_end_at, buyer_visible_note, updated_at')
      .eq('project_id', project.id)
      .order('stage_order', { ascending: true }),
    (context.admin as any)
      .from('manufacturing_sample_rounds')
      .select('id, round_no, sample_type, status, buyer_visible_note, dispatched_at, received_at, approved_at, created_at, updated_at')
      .eq('project_id', project.id)
      .order('round_no', { ascending: false }),
    (context.admin as any)
      .from('manufacturing_project_approvals')
      .select('id, sample_round_id, approval_type, status, title, buyer_visible_snapshot, decision_note, requested_at, decided_at, created_at, updated_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
    (context.admin as any)
      .from('manufacturing_project_events')
      .select('id, event_type, detail, created_at')
      .eq('project_id', project.id)
      .eq('visibility', 'buyer')
      .order('created_at', { ascending: false })
      .limit(100),
    (context.admin as any)
      .from('manufacturing_quote_snapshots')
      .select('id, version_no, status, currency, buyer_visible_items, buyer_visible_total, issued_at, accepted_at, created_at, updated_at')
      .eq('project_id', project.id)
      .in('status', ['pending_buyer', 'accepted', 'rejected'])
      .order('version_no', { ascending: false }),
    (context.admin as any)
      .from('manufacturing_project_files')
      .select('id, sample_round_id, file_kind, storage_path, original_filename, mime_type, byte_size, created_at')
      .eq('project_id', project.id)
      .eq('visibility', 'buyer')
      .order('created_at', { ascending: false }),
  ]);

  const errors = [briefResult.error, stageResult.error, sampleResult.error, approvalResult.error, eventResult.error, quoteResult.error, fileResult.error].filter(Boolean);
  if (errors.length > 0) {
    console.error('[manufacturing project] dependent lookup failed', errors.map((error: any) => error.message));
    return NextResponse.json({ error: '프로젝트 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }

  const files = await Promise.all((fileResult.data ?? []).map(async (file: any) => {
    const { data: signed, error: signedError } = await (context.admin as any)
      .storage
      .from('manufacturing-project-private')
      .createSignedUrl(file.storage_path, 60 * 10);
    if (signedError || !signed?.signedUrl) {
      console.error('[manufacturing project] file signing failed', signedError?.message);
      return null;
    }
    return {
      id: file.id,
      sampleRoundId: file.sample_round_id,
      kind: file.file_kind,
      filename: file.original_filename,
      mimeType: file.mime_type,
      byteSize: file.byte_size,
      createdAt: file.created_at,
      signedUrl: signed.signedUrl,
    };
  }));

  return NextResponse.json({
    project,
    briefs: briefResult.data ?? [],
    stages: stageResult.data ?? [],
    samples: sampleResult.data ?? [],
    approvals: approvalResult.data ?? [],
    events: eventResult.data ?? [],
    quotes: quoteResult.data ?? [],
    files: files.filter(Boolean),
  });
}
