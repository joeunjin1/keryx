#!/usr/bin/env python3
"""
Supabase REST API를 통해 staff_email_addresses 테이블 마이그레이션 실행
Legacy JWT service_role key 사용
"""
import requests
import json

PROJECT_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmNmcGt6dG95dXpiZXFvZGJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUyMzQ0MiwiZXhwIjoyMDkzMDk5NDQyfQ.kNQG7cJZNX-MOITF2lEw2mrBVn7UgwYbF2ZvGk1471Y"

HEADERS = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def test_connection():
    """연결 테스트"""
    resp = requests.get(
        f"{PROJECT_URL}/rest/v1/user_profiles?limit=1",
        headers=HEADERS
    )
    print(f"연결 테스트: {resp.status_code}")
    if resp.status_code == 200:
        print("  연결 성공!")
        return True
    else:
        print(f"  오류: {resp.text[:200]}")
        return False

def check_table_exists():
    """staff_email_addresses 테이블 존재 여부 확인"""
    resp = requests.get(
        f"{PROJECT_URL}/rest/v1/staff_email_addresses?limit=1",
        headers=HEADERS
    )
    if resp.status_code == 200:
        print("  staff_email_addresses 테이블이 이미 존재합니다.")
        return True
    elif resp.status_code == 404 or "does not exist" in resp.text or "PGRST205" in resp.text:
        print("  staff_email_addresses 테이블이 없습니다. 생성이 필요합니다.")
        return False
    else:
        print(f"  확인 불가: {resp.status_code} - {resp.text[:200]}")
        return False

def run_sql_via_rpc(sql: str, description: str):
    """RPC를 통해 SQL 실행"""
    resp = requests.post(
        f"{PROJECT_URL}/rest/v1/rpc/exec_sql",
        headers=HEADERS,
        json={"sql": sql}
    )
    if resp.status_code in [200, 201, 204]:
        print(f"  ✓ {description}")
        return True
    else:
        print(f"  ✗ {description}: {resp.status_code} - {resp.text[:200]}")
        return False

def check_inbound_emails_column():
    """inbound_emails 테이블에 assigned_user_id 컬럼 존재 여부 확인"""
    resp = requests.get(
        f"{PROJECT_URL}/rest/v1/inbound_emails?select=assigned_user_id&limit=1",
        headers=HEADERS
    )
    if resp.status_code == 200:
        print("  inbound_emails.assigned_user_id 컬럼 이미 존재")
        return True
    else:
        print("  inbound_emails.assigned_user_id 컬럼 없음 - 추가 필요")
        return False

if __name__ == "__main__":
    print("=== staff_email_addresses 마이그레이션 시작 ===\n")
    
    # 1. 연결 테스트
    print("1. 연결 테스트...")
    if not test_connection():
        print("연결 실패. 종료합니다.")
        exit(1)
    
    # 2. 테이블 존재 여부 확인
    print("\n2. 테이블 존재 여부 확인...")
    table_exists = check_table_exists()
    
    # 3. inbound_emails 컬럼 확인
    print("\n3. inbound_emails.assigned_user_id 컬럼 확인...")
    col_exists = check_inbound_emails_column()
    
    print("\n=== 마이그레이션 상태 ===")
    print(f"  staff_email_addresses 테이블: {'존재' if table_exists else '없음 (생성 필요)'}")
    print(f"  inbound_emails.assigned_user_id: {'존재' if col_exists else '없음 (추가 필요)'}")
    
    if not table_exists:
        print("\n⚠️  테이블 생성은 SQL Editor에서 직접 실행해야 합니다.")
        print("   아래 SQL을 Supabase SQL Editor에 복사하여 실행하세요:\n")
        
        sql = """-- staff_email_addresses 마이그레이션
CREATE TABLE IF NOT EXISTS staff_email_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  display_name_zh TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_email_user ON staff_email_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email_addr ON staff_email_addresses(email_address);
ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_assigned ON inbound_emails(assigned_user_id);
ALTER TABLE staff_email_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_staff_emails" ON staff_email_addresses;
CREATE POLICY "admin_manage_staff_emails" ON staff_email_addresses FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')));
DROP POLICY IF EXISTS "staff_read_own_email" ON staff_email_addresses;
CREATE POLICY "staff_read_own_email" ON staff_email_addresses FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "staff_read_own_inbound" ON inbound_emails;
CREATE POLICY "staff_read_own_inbound" ON inbound_emails FOR SELECT USING (assigned_user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.kind IN ('admin','super_admin')));
SELECT 'migration complete' AS result;"""
        print(sql)
    else:
        print("\n✓ 마이그레이션 완료 상태입니다.")
