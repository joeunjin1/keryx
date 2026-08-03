import { NextResponse } from 'next/server';

/**
 * quote_requests 테이블 누락 컬럼 추가 API
 * Supabase Management API (v1) 사용 — service_role key 불필요
 * POST /api/admin/fix-quote-requests
 * Body: { secret: "KERYX_INIT_2026", access_token: "<supabase-personal-access-token>" }
 *   OR
 * Body: { secret: "KERYX_INIT_2026" }  → SUPABASE_SERVICE_ROLE_KEY 환경변수 사용
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { secret } = body;

  if (secret !== 'KERYX_INIT_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
  }

  // project ref 추출 (https://xxxxxx.supabase.co → xxxxxx)
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

  if (!serviceRoleKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars',
      project_ref: projectRef,
      manual_sql: `ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS reference_image_url  text,
  ADD COLUMN IF NOT EXISTS desired_qty          text,
  ADD COLUMN IF NOT EXISTS desired_deadline     text,
  ADD COLUMN IF NOT EXISTS sales_country        text,
  ADD COLUMN IF NOT EXISTS cert_needed          text,
  ADD COLUMN IF NOT EXISTS budget_range         text,
  ADD COLUMN IF NOT EXISTS has_sample           text,
  ADD COLUMN IF NOT EXISTS contact_method       text;`,
      dashboard_url: `https://supabase.com/dashboard/project/${projectRef}/editor`,
    }, { status: 500 });
  }

  // Supabase Management API v1 — SQL 직접 실행
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const sql = `
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS reference_image_url  text,
  ADD COLUMN IF NOT EXISTS desired_qty          text,
  ADD COLUMN IF NOT EXISTS desired_deadline     text,
  ADD COLUMN IF NOT EXISTS sales_country        text,
  ADD COLUMN IF NOT EXISTS cert_needed          text,
  ADD COLUMN IF NOT EXISTS budget_range         text,
  ADD COLUMN IF NOT EXISTS has_sample           text,
  ADD COLUMN IF NOT EXISTS contact_method       text;
  `;

  const mgmtRes = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const mgmtText = await mgmtRes.text();

  if (!mgmtRes.ok) {
    return NextResponse.json({
      error: 'Management API 실패',
      status: mgmtRes.status,
      response: mgmtText,
      manual_sql: sql.trim(),
      dashboard_url: `https://supabase.com/dashboard/project/${projectRef}/editor`,
    }, { status: 200 });
  }

  return NextResponse.json({
    success: true,
    message: 'quote_requests 테이블 컬럼 추가 완료',
    response: mgmtText,
  });
}
