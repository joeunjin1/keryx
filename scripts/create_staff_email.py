#!/usr/bin/env python3
"""
Supabase Service Role Key를 사용하여 직원 메일 주소 테이블 생성
"""
import requests
import json

SUPABASE_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_ROLE_KEY = "sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# SQL 문장들을 개별적으로 실행
sqls = [
    # 1. staff_email_addresses 테이블 생성
    """
    CREATE TABLE IF NOT EXISTS staff_email_addresses (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      email_address TEXT NOT NULL UNIQUE,
      display_name TEXT,
      display_name_zh TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    # 2. 인덱스 생성
    "CREATE INDEX IF NOT EXISTS idx_staff_email_user_id ON staff_email_addresses(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_staff_email_address ON staff_email_addresses(email_address)",
    # 3. inbound_emails에 assigned_user_id 컬럼 추가
    "ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL",
    "CREATE INDEX IF NOT EXISTS idx_inbound_emails_assigned_user ON inbound_emails(assigned_user_id)",
    # 4. RLS 활성화
    "ALTER TABLE staff_email_addresses ENABLE ROW LEVEL SECURITY",
    # 5. RLS 정책 생성
    """
    CREATE POLICY "admin_manage_staff_emails" ON staff_email_addresses FOR ALL
      USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin', 'super_admin')))
    """,
    """
    CREATE POLICY "staff_read_own_email" ON staff_email_addresses FOR SELECT
      USING (user_id = auth.uid())
    """,
    # 6. inbound_emails RLS 정책 업데이트
    "DROP POLICY IF EXISTS \"staff_read_own_inbound_emails\" ON inbound_emails",
    """
    CREATE POLICY "staff_read_own_inbound_emails" ON inbound_emails FOR SELECT
      USING (assigned_user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin', 'super_admin')))
    """,
    # 7. 이메일 라우팅 트리거 함수 생성
    """
    CREATE OR REPLACE FUNCTION route_inbound_email()
    RETURNS TRIGGER AS $$
    BEGIN
      SELECT user_id INTO NEW.assigned_user_id
      FROM staff_email_addresses
      WHERE email_address = LOWER(NEW.to_email) AND is_active = true
      LIMIT 1;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
    """,
    # 8. 트리거 생성
    "DROP TRIGGER IF EXISTS trigger_route_inbound_email ON inbound_emails",
    """
    CREATE TRIGGER trigger_route_inbound_email
      BEFORE INSERT ON inbound_emails
      FOR EACH ROW EXECUTE FUNCTION route_inbound_email()
    """
]

# Supabase REST API로는 DDL 직접 실행 불가 - RPC 함수 사용
# exec_sql RPC 함수가 있는지 확인 후 실행
def execute_sql_via_rpc(sql):
    """Supabase RPC를 통해 SQL 실행"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    payload = {"sql": sql.strip()}
    resp = requests.post(url, headers=headers, json=payload)
    return resp.status_code, resp.text

# 먼저 exec_sql 함수 존재 여부 확인
print("exec_sql RPC 함수 확인 중...")
status, result = execute_sql_via_rpc("SELECT 1")
print(f"Status: {status}, Result: {result[:200]}")

if status == 404 or "not found" in result.lower():
    print("\nexec_sql RPC 함수가 없습니다.")
    print("Supabase Management API를 사용합니다...")
    
    # Management API 사용 - project ref 추출
    project_ref = SUPABASE_URL.split("//")[1].split(".")[0]
    print(f"Project ref: {project_ref}")
    
    # Management API 엔드포인트
    mgmt_url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
    mgmt_headers = {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    for i, sql in enumerate(sqls, 1):
        sql = sql.strip()
        if not sql:
            continue
        print(f"\n[{i}/{len(sqls)}] 실행 중: {sql[:60]}...")
        resp = requests.post(mgmt_url, headers=mgmt_headers, json={"query": sql})
        print(f"  Status: {resp.status_code}")
        if resp.status_code not in [200, 201]:
            print(f"  Error: {resp.text[:200]}")
        else:
            print(f"  Success")
else:
    print(f"\nexec_sql RPC 사용 가능. 실행 중...")
    for i, sql in enumerate(sqls, 1):
        sql = sql.strip()
        if not sql:
            continue
        print(f"\n[{i}/{len(sqls)}] 실행 중: {sql[:60]}...")
        status, result = execute_sql_via_rpc(sql)
        print(f"  Status: {status}, Result: {result[:100]}")
