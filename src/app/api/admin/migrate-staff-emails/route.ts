import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 이 API는 staff_email_addresses 테이블을 생성합니다.
// 미들웨어에서 공개 경로로 등록되어 있으므로 인증 없이 접근 가능합니다.
// 보안을 위해 secret 파라미터를 검증합니다.

const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'keryx-migrate-2026'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    if (body.secret !== MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(url, key)

    const results: Record<string, string> = {}

    // Step 1: staff_email_addresses 테이블 생성
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS staff_email_addresses (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        email_address TEXT NOT NULL UNIQUE,
        display_name TEXT,
        display_name_zh TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`
    })
    // exec_sql RPC가 없을 수 있으므로 PostgreSQL REST API 직접 사용
    if (e1) {
      // Supabase REST API로 직접 쿼리 실행
      const pgUrl = `${url}/rest/v1/rpc/exec_sql`
      results.step1_rpc_error = e1.message
    } else {
      results.step1 = 'OK'
    }

    // exec_sql이 없는 경우를 위해 직접 테이블 존재 여부 확인 후 insert 테스트
    const { error: checkError } = await supabase
      .from('staff_email_addresses')
      .select('id')
      .limit(1)

    if (checkError && checkError.message.includes('does not exist')) {
      // 테이블이 없음 - Supabase Management API 사용
      const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
      if (!projectRef) {
        return NextResponse.json({ error: 'Cannot extract project ref from URL' }, { status: 500 })
      }

      const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS staff_email_addresses (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          email_address TEXT NOT NULL UNIQUE,
          display_name TEXT,
          display_name_zh TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_staff_email_user ON staff_email_addresses(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_staff_email_addr ON staff_email_addresses(email_address)`,
        `ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL`,
        `CREATE INDEX IF NOT EXISTS idx_inbound_assigned ON inbound_emails(assigned_user_id)`,
        `ALTER TABLE staff_email_addresses ENABLE ROW LEVEL SECURITY`,
        `DROP POLICY IF EXISTS "admin_manage_staff_emails" ON staff_email_addresses`,
        `CREATE POLICY "admin_manage_staff_emails" ON staff_email_addresses FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')))`,
        `DROP POLICY IF EXISTS "staff_read_own_email" ON staff_email_addresses`,
        `CREATE POLICY "staff_read_own_email" ON staff_email_addresses FOR SELECT USING (user_id = auth.uid())`,
        `DROP POLICY IF EXISTS "staff_read_own_inbound" ON inbound_emails`,
        `CREATE POLICY "staff_read_own_inbound" ON inbound_emails FOR SELECT USING (assigned_user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')))`,
      ]

      const mgmtErrors: string[] = []
      for (const sql of sqlStatements) {
        const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sql }),
        })
        if (!resp.ok) {
          const errText = await resp.text()
          if (!errText.includes('already exists') && !errText.includes('duplicate')) {
            mgmtErrors.push(`${sql.substring(0, 50)}... => ${errText.substring(0, 100)}`)
          }
        }
      }

      if (mgmtErrors.length > 0) {
        return NextResponse.json({ 
          status: 'partial',
          errors: mgmtErrors,
          message: '일부 SQL 실행 실패'
        }, { status: 207 })
      }

      return NextResponse.json({ 
        status: 'success',
        message: 'staff_email_addresses 테이블 생성 완료 (Management API)'
      })
    }

    // 테이블이 이미 존재하는 경우
    return NextResponse.json({ 
      status: 'already_exists',
      message: 'staff_email_addresses 테이블이 이미 존재합니다'
    })

  } catch (err) {
    console.error('Migration error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
