#!/usr/bin/env python3
"""
staff_email_addresses 테이블 및 관련 DB 마이그레이션 실행 스크립트
Supabase Management API를 사용하여 직접 SQL 실행
"""
import os
import requests
import json

SUPABASE_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_ROLE_KEY = "sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn"
PROJECT_REF = "iqfcfpkztoyuzbeqodbq"

# Supabase Management API를 통한 SQL 실행
# https://supabase.com/docs/reference/api/introduction
MGMT_API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
}

# SQL을 REST API로 실행하는 대안: rpc 함수 사용
# Supabase의 PostgREST를 통해 SQL 실행
REST_URL = f"{SUPABASE_URL}/rest/v1/rpc"

def exec_sql_via_rpc(sql: str, name: str) -> dict:
    """Supabase REST API를 통해 SQL 실행"""
    # exec_sql RPC 함수 호출 시도
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        },
        json={"sql": sql},
        timeout=30
    )
    return {"name": name, "status": response.status_code, "body": response.text[:200]}

def exec_sql_via_pg(sql: str, name: str) -> dict:
    """PostgreSQL 직접 연결로 SQL 실행"""
    try:
        import psycopg2
        # Supabase DB 연결 문자열 구성
        conn_str = f"postgresql://postgres.{PROJECT_REF}:{SERVICE_ROLE_KEY}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        conn.close()
        return {"name": name, "success": True}
    except Exception as e:
        return {"name": name, "success": False, "error": str(e)}

# SQL 마이그레이션 목록
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
        "sql": """DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_route_inbound_email ON inbound_emails;
  CREATE TRIGGER trigger_route_inbound_email
    BEFORE INSERT ON inbound_emails
    FOR EACH ROW
    EXECUTE FUNCTION route_inbound_email();
END $$"""
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
        "sql": """DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_staff_email_updated_at ON staff_email_addresses;
  CREATE TRIGGER trigger_staff_email_updated_at
    BEFORE UPDATE ON staff_email_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_email_updated_at();
END $$"""
    },
]

print("=== Supabase 마이그레이션 시작 ===\n")
print("방법 1: exec_sql RPC 함수 호출 시도...\n")

results = []
for m in migrations:
    result = exec_sql_via_rpc(m["sql"], m["name"])
    results.append(result)
    status_icon = "✓" if result["status"] in [200, 204] else "✗"
    print(f"  {status_icon} {result['name']}: HTTP {result['status']}")
    if result["status"] not in [200, 204]:
        print(f"    응답: {result['body'][:100]}")

print("\n결과 요약:")
success = sum(1 for r in results if r.get("status") in [200, 204])
print(f"  성공: {success}/{len(results)}")

# RPC 실패 시 psycopg2 직접 연결 시도
if success < len(migrations):
    print("\n방법 2: PostgreSQL 직접 연결 시도...")
    try:
        import subprocess
        subprocess.run(["pip3", "install", "psycopg2-binary", "-q"], check=True)
        
        for m in migrations:
            result = exec_sql_via_pg(m["sql"], m["name"])
            status_icon = "✓" if result.get("success") else "✗"
            print(f"  {status_icon} {result['name']}: {result.get('error', 'OK')}")
    except Exception as e:
        print(f"  직접 연결 실패: {e}")
