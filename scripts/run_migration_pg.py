#!/usr/bin/env python3
"""
Supabase PostgreSQL에 직접 연결하여 마이그레이션 실행
"""
import psycopg2
import sys

PROJECT_REF = "iqfcfpkztoyuzbeqodbq"
DB_PASSWORD = "sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn"

# Supabase Transaction Pooler (포트 6543) - 일반 쿼리에 적합
# Session Pooler (포트 5432) - DDL에 적합
connection_strings = [
    # Session pooler - DDL 실행에 필요
    f"postgresql://postgres.{PROJECT_REF}:{DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres",
    # Transaction pooler
    f"postgresql://postgres.{PROJECT_REF}:{DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
    # Direct connection (IPv4)
    f"postgresql://postgres:{DB_PASSWORD}@db.{PROJECT_REF}.supabase.co:5432/postgres",
]

migrations = [
    {
        "name": "1_create_staff_email_addresses",
        "sql": """CREATE TABLE IF NOT EXISTS staff_email_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  display_name_zh TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)"""
    },
    {
        "name": "2_idx_staff_email_user_id",
        "sql": "CREATE INDEX IF NOT EXISTS idx_staff_email_user_id ON staff_email_addresses(user_id)"
    },
    {
        "name": "3_idx_staff_email_address",
        "sql": "CREATE INDEX IF NOT EXISTS idx_staff_email_address ON staff_email_addresses(email_address)"
    },
    {
        "name": "4_add_assigned_user_id",
        "sql": "ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL"
    },
    {
        "name": "5_idx_inbound_assigned_user",
        "sql": "CREATE INDEX IF NOT EXISTS idx_inbound_emails_assigned_user ON inbound_emails(assigned_user_id)"
    },
    {
        "name": "6_enable_rls",
        "sql": "ALTER TABLE staff_email_addresses ENABLE ROW LEVEL SECURITY"
    },
    {
        "name": "7_policy_admin_manage",
        "sql": """DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_email_addresses' AND policyname='admin_manage_staff_emails') THEN
    CREATE POLICY "admin_manage_staff_emails" ON staff_email_addresses FOR ALL
      USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')));
  END IF;
END $$"""
    },
    {
        "name": "8_policy_staff_read_own",
        "sql": """DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_email_addresses' AND policyname='staff_read_own_email') THEN
    CREATE POLICY "staff_read_own_email" ON staff_email_addresses FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$"""
    },
    {
        "name": "9_policy_inbound_staff_access",
        "sql": """DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inbound_emails' AND policyname='staff_read_own_inbound_emails') THEN
    CREATE POLICY "staff_read_own_inbound_emails" ON inbound_emails FOR SELECT
      USING (assigned_user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')));
  END IF;
END $$"""
    },
    {
        "name": "10_route_inbound_email_function",
        "sql": """CREATE OR REPLACE FUNCTION route_inbound_email()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.assigned_user_id
  FROM staff_email_addresses
  WHERE email_address = LOWER(NEW.to_email)
    AND is_active = true
  LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER"""
    },
    {
        "name": "11_route_inbound_email_trigger",
        "sql": """DROP TRIGGER IF EXISTS trigger_route_inbound_email ON inbound_emails;
CREATE TRIGGER trigger_route_inbound_email
  BEFORE INSERT ON inbound_emails
  FOR EACH ROW
  EXECUTE FUNCTION route_inbound_email()"""
    },
    {
        "name": "12_updated_at_function",
        "sql": """CREATE OR REPLACE FUNCTION update_staff_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql"""
    },
    {
        "name": "13_updated_at_trigger",
        "sql": """DROP TRIGGER IF EXISTS trigger_staff_email_updated_at ON staff_email_addresses;
CREATE TRIGGER trigger_staff_email_updated_at
  BEFORE UPDATE ON staff_email_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_email_updated_at()"""
    },
]

conn = None
for conn_str in connection_strings:
    try:
        print(f"연결 시도: {conn_str[:60]}...")
        conn = psycopg2.connect(conn_str, connect_timeout=10)
        conn.autocommit = True
        print("연결 성공!\n")
        break
    except Exception as e:
        print(f"  실패: {e}\n")

if not conn:
    print("모든 연결 방법 실패. Supabase 대시보드에서 직접 SQL을 실행해야 합니다.")
    sys.exit(1)

print("=== 마이그레이션 실행 ===\n")
cur = conn.cursor()
success_count = 0
fail_count = 0

for m in migrations:
    try:
        cur.execute(m["sql"])
        print(f"  ✓ {m['name']}")
        success_count += 1
    except Exception as e:
        err_msg = str(e).strip()
        # 이미 존재하는 경우는 성공으로 처리
        if "already exists" in err_msg or "duplicate" in err_msg.lower():
            print(f"  ✓ {m['name']} (이미 존재)")
            success_count += 1
        else:
            print(f"  ✗ {m['name']}: {err_msg[:100]}")
            fail_count += 1

conn.close()
print(f"\n=== 완료: 성공 {success_count}, 실패 {fail_count} ===")
