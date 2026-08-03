import { NextResponse } from 'next/server'

// 이 API는 DB 마이그레이션 전용 - 실행 후 삭제 예정
export async function POST(request: Request) {
  const { secret } = await request.json()
  
  if (secret !== 'keryx-migrate-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  // Project ref 추출 (https://xxx.supabase.co → xxx)
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

  const migrations = [
    {
      name: '1_create_staff_email_addresses',
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
    },
    {
      name: '2_idx_staff_email_user_id',
      sql: `CREATE INDEX IF NOT EXISTS idx_staff_email_user_id ON staff_email_addresses(user_id)`
    },
    {
      name: '3_idx_staff_email_address',
      sql: `CREATE INDEX IF NOT EXISTS idx_staff_email_address ON staff_email_addresses(email_address)`
    },
    {
      name: '4_add_assigned_user_id',
      sql: `ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL`
    },
    {
      name: '5_idx_inbound_assigned_user',
      sql: `CREATE INDEX IF NOT EXISTS idx_inbound_emails_assigned_user ON inbound_emails(assigned_user_id)`
    },
    {
      name: '6_enable_rls',
      sql: `ALTER TABLE staff_email_addresses ENABLE ROW LEVEL SECURITY`
    },
    {
      name: '7_policy_admin_manage',
      sql: `DROP POLICY IF EXISTS "admin_manage_staff_emails" ON staff_email_addresses;
      CREATE POLICY "admin_manage_staff_emails" ON staff_email_addresses FOR ALL
        USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')))`
    },
    {
      name: '8_policy_staff_read_own',
      sql: `DROP POLICY IF EXISTS "staff_read_own_email" ON staff_email_addresses;
      CREATE POLICY "staff_read_own_email" ON staff_email_addresses FOR SELECT USING (user_id = auth.uid())`
    },
    {
      name: '9_policy_inbound_staff_access',
      sql: `DROP POLICY IF EXISTS "staff_read_own_inbound_emails" ON inbound_emails;
      CREATE POLICY "staff_read_own_inbound_emails" ON inbound_emails FOR SELECT
        USING (assigned_user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')))`
    },
    {
      name: '10_route_inbound_email_function',
      sql: `CREATE OR REPLACE FUNCTION route_inbound_email()
      RETURNS TRIGGER AS $func$
      BEGIN
        SELECT user_id INTO NEW.assigned_user_id
        FROM staff_email_addresses
        WHERE email_address = LOWER(NEW.to_email)
          AND is_active = true
        LIMIT 1;
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql SECURITY DEFINER`
    },
    {
      name: '11_route_inbound_email_trigger',
      sql: `DROP TRIGGER IF EXISTS trigger_route_inbound_email ON inbound_emails;
      CREATE TRIGGER trigger_route_inbound_email
        BEFORE INSERT ON inbound_emails
        FOR EACH ROW
        EXECUTE FUNCTION route_inbound_email()`
    },
    {
      name: '12_updated_at_function',
      sql: `CREATE OR REPLACE FUNCTION update_staff_email_updated_at()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql`
    },
    {
      name: '13_updated_at_trigger',
      sql: `DROP TRIGGER IF EXISTS trigger_staff_email_updated_at ON staff_email_addresses;
      CREATE TRIGGER trigger_staff_email_updated_at
        BEFORE UPDATE ON staff_email_addresses
        FOR EACH ROW
        EXECUTE FUNCTION update_staff_email_updated_at()`
    }
  ]

  const results = []

  for (const migration of migrations) {
    try {
      // Supabase Management API를 통해 SQL 실행
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: migration.sql })
      })
      
      if (!response.ok) {
        const error = await response.text()
        // "already exists" 오류는 성공으로 처리
        if (error.includes('already exists') || error.includes('duplicate')) {
          results.push({ name: migration.name, success: true, note: 'already exists' })
        } else {
          results.push({ name: migration.name, success: false, error: error.substring(0, 200) })
        }
      } else {
        results.push({ name: migration.name, success: true })
      }
    } catch (e: unknown) {
      results.push({ name: migration.name, success: false, error: String(e) })
    }
  }

  const successCount = results.filter(r => r.success).length
  return NextResponse.json({ 
    results,
    summary: `${successCount}/${results.length} migrations succeeded`
  })
}
