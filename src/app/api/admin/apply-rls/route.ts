import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    // Service Role 클라이언트 생성 (RLS 우회)
    const supabase = createClient(url, key, {
      auth: { persistSession: false }
    })

    const sqlStatements = [
      // inbound_emails RLS 활성화
      `ALTER TABLE IF EXISTS inbound_emails ENABLE ROW LEVEL SECURITY`,
      
      // 관리자: 모든 이메일 읽기/쓰기
      `DROP POLICY IF EXISTS "admin_all_inbound" ON inbound_emails`,
      `CREATE POLICY "admin_all_inbound" ON inbound_emails
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.kind IN ('admin', 'super_admin')
          )
        )`,
      
      // 직원: 자신에게 배정된 이메일만 읽기
      `DROP POLICY IF EXISTS "staff_read_own_inbound" ON inbound_emails`,
      `CREATE POLICY "staff_read_own_inbound" ON inbound_emails
        FOR SELECT
        USING (assigned_user_id = auth.uid())`,
      
      // 직원: 자신에게 배정된 이메일 업데이트 (읽음 처리 등)
      `DROP POLICY IF EXISTS "staff_update_own_inbound" ON inbound_emails`,
      `CREATE POLICY "staff_update_own_inbound" ON inbound_emails
        FOR UPDATE
        USING (assigned_user_id = auth.uid())
        WITH CHECK (assigned_user_id = auth.uid())`,
      
      // consultations 테이블 RLS 확인 및 anon INSERT 허용
      `ALTER TABLE IF EXISTS consultations ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS "anon_insert_consultation" ON consultations`,
      `CREATE POLICY "anon_insert_consultation" ON consultations
        FOR INSERT
        WITH CHECK (true)`,
      `DROP POLICY IF EXISTS "admin_all_consultations" ON consultations`,
      `CREATE POLICY "admin_all_consultations" ON consultations
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.kind IN ('admin', 'super_admin')
          )
        )`,
      
      // staff_email_addresses RLS 활성화
      `ALTER TABLE IF EXISTS staff_email_addresses ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS "admin_all_staff_emails" ON staff_email_addresses`,
      `CREATE POLICY "admin_all_staff_emails" ON staff_email_addresses
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.kind IN ('admin', 'super_admin')
          )
        )`,
      `DROP POLICY IF EXISTS "staff_read_own_email_addr" ON staff_email_addresses`,
      `CREATE POLICY "staff_read_own_email_addr" ON staff_email_addresses
        FOR SELECT
        USING (user_id = auth.uid())`,
    ]

    const results: { sql: string; status: string; error?: string }[] = []

    for (const sql of sqlStatements) {
      const shortSql = sql.trim().substring(0, 70).replace(/\s+/g, ' ')
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
        
        if (error) {
          // already exists 오류는 무시
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            results.push({ sql: shortSql, status: 'already_exists' })
          } else {
            results.push({ sql: shortSql, status: 'error', error: error.message?.substring(0, 200) })
          }
        } else {
          results.push({ sql: shortSql, status: 'ok' })
        }
      } catch (e) {
        results.push({ sql: shortSql, status: 'error', error: String(e).substring(0, 200) })
      }
    }

    const errors = results.filter(r => r.status === 'error')
    
    return NextResponse.json({
      status: errors.length === 0 ? 'success' : 'partial',
      message: errors.length === 0 
        ? 'RLS 정책 적용 완료' 
        : `${errors.length}개 오류 발생`,
      results,
    })
  } catch (err) {
    console.error('RLS apply error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
