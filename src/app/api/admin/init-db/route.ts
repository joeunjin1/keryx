import { NextResponse } from 'next/server';

// 임시 DB 초기화 라우트 - 테이블 생성 후 삭제 예정
// Supabase service_role key로 직접 SQL 실행
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { secret } = body;
  
  if (secret !== 'KERYX_INIT_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  // Supabase REST API를 통해 테이블 존재 여부 확인
  const checks = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/sample_reports?limit=1`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/factory_match_reports?limit=1`, { headers }),
  ]);

  const results = {
    sample_reports: checks[0].status === 200 ? 'exists' : `missing (${checks[0].status})`,
    factory_match_reports: checks[1].status === 200 ? 'exists' : `missing (${checks[1].status})`,
  };

  // 테이블이 없으면 Supabase의 pg endpoint로 생성 시도
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS sample_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_no TEXT UNIQUE NOT NULL DEFAULT ('SR-'||to_char(now(),'YYYYMMDD')||'-'||substr(gen_random_uuid()::text,1,6)),
      request_id UUID,
      status TEXT NOT NULL DEFAULT 'draft',
      report_title TEXT NOT NULL DEFAULT '',
      buyer_name TEXT NOT NULL DEFAULT '',
      buyer_company TEXT NOT NULL DEFAULT '',
      product_name TEXT NOT NULL DEFAULT '',
      issued_at DATE,
      cover_image TEXT DEFAULT '',
      spec JSONB NOT NULL DEFAULT '{}',
      reference_photos JSONB NOT NULL DEFAULT '[]',
      quotes JSONB NOT NULL DEFAULT '[]',
      quality_check JSONB NOT NULL DEFAULT '{}',
      delivery_timeline TEXT DEFAULT '',
      risk_notes TEXT DEFAULT '',
      recommended_quote_idx INTEGER DEFAULT 0,
      internal_memo TEXT DEFAULT '',
      sent_at TIMESTAMPTZ,
      sent_to_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS factory_match_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_no TEXT UNIQUE NOT NULL DEFAULT ('FM-'||to_char(now(),'YYYYMMDD')||'-'||substr(gen_random_uuid()::text,1,6)),
      request_id UUID,
      status TEXT NOT NULL DEFAULT 'draft',
      report_title TEXT NOT NULL DEFAULT '',
      buyer_name TEXT NOT NULL DEFAULT '',
      buyer_company TEXT NOT NULL DEFAULT '',
      product_name TEXT NOT NULL DEFAULT '',
      issued_at DATE,
      cover_image TEXT DEFAULT '',
      buyer_requirements JSONB NOT NULL DEFAULT '{}',
      factories JSONB NOT NULL DEFAULT '[]',
      comparison_notes TEXT DEFAULT '',
      next_steps TEXT DEFAULT '',
      risk_notes TEXT DEFAULT '',
      internal_memo TEXT DEFAULT '',
      sent_at TIMESTAMPTZ,
      sent_to_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `ALTER TABLE sample_reports ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE factory_match_reports ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "service_role_all_sample_reports" ON sample_reports FOR ALL TO service_role USING (true)`,
    `CREATE POLICY IF NOT EXISTS "service_role_all_factory_match_reports" ON factory_match_reports FOR ALL TO service_role USING (true)`,
  ];

  // Supabase의 /pg/query 엔드포인트 시도 (있는 경우)
  const pgResults: { sql: string; status: string; error?: string }[] = [];
  
  for (const sql of sqlStatements) {
    try {
      // 방법 1: /rest/v1/rpc/exec_sql (커스텀 함수)
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ sql }),
      });
      
      if (r.ok) {
        pgResults.push({ sql: sql.substring(0, 60), status: 'ok' });
      } else {
        const err = await r.text();
        pgResults.push({ sql: sql.substring(0, 60), status: `error ${r.status}`, error: err.substring(0, 200) });
      }
    } catch (e) {
      pgResults.push({ sql: sql.substring(0, 60), status: 'exception', error: String(e) });
    }
  }

  return NextResponse.json({ 
    tableChecks: results,
    sqlResults: pgResults,
    message: 'Use Supabase SQL Editor to run the migration manually if needed',
    sql: sqlStatements.join(';\n\n')
  });
}
