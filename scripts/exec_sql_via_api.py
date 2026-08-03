#!/usr/bin/env python3
"""
Supabase REST API를 통해 SQL을 직접 실행합니다.
Supabase의 /rest/v1/rpc/exec_sql 또는 pg_meta API를 사용합니다.
"""
import requests
import json

PROJECT_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmNmcGt6dG95dXpiZXFvZGJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUyMzQ0MiwiZXhwIjoyMDkzMDk5NDQyfQ.kNQG7cJZNX-MOITF2lEw2mrBVn7UgwYbF2ZvGk1471Y"

HEADERS = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "apikey": SERVICE_KEY,
    "Content-Type": "application/json",
}

# 각 SQL을 개별적으로 실행
SQL_STATEMENTS = [
    # 1. 테이블 생성
    """CREATE TABLE IF NOT EXISTS staff_email_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  display_name_zh TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)""",
    # 2. 인덱스
    "CREATE INDEX IF NOT EXISTS idx_staff_email_user ON staff_email_addresses(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_staff_email_addr ON staff_email_addresses(email_address)",
    # 3. inbound_emails 컬럼 추가
    "ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL",
    "CREATE INDEX IF NOT EXISTS idx_inbound_assigned ON inbound_emails(assigned_user_id)",
    # 4. RLS 활성화
    "ALTER TABLE staff_email_addresses ENABLE ROW LEVEL SECURITY",
]

def try_pg_meta_api(sql):
    """Supabase pg_meta API를 통해 SQL 실행"""
    resp = requests.post(
        f"{PROJECT_URL}/pg/query",
        headers=HEADERS,
        json={"query": sql},
        timeout=30
    )
    return resp

def try_rpc_exec(sql):
    """RPC exec_sql 함수를 통해 SQL 실행"""
    resp = requests.post(
        f"{PROJECT_URL}/rest/v1/rpc/exec_sql",
        headers=HEADERS,
        json={"sql": sql},
        timeout=30
    )
    return resp

def try_management_api(sql):
    """Supabase Management API를 통해 SQL 실행"""
    # 프로젝트 ref 추출
    project_ref = "iqfcfpkztoyuzbeqodbq"
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=30
    )
    return resp

print("=== Supabase SQL 실행 시도 ===\n")

for i, sql in enumerate(SQL_STATEMENTS, 1):
    print(f"[{i}/{len(SQL_STATEMENTS)}] 실행 중: {sql[:60]}...")
    
    # pg_meta API 시도
    resp = try_pg_meta_api(sql)
    if resp.status_code in (200, 201):
        print(f"  ✅ pg_meta API 성공: {resp.text[:100]}")
        continue
    
    # RPC 시도
    resp2 = try_rpc_exec(sql)
    if resp2.status_code in (200, 201):
        print(f"  ✅ RPC 성공: {resp2.text[:100]}")
        continue
    
    # Management API 시도
    resp3 = try_management_api(sql)
    if resp3.status_code in (200, 201):
        print(f"  ✅ Management API 성공: {resp3.text[:100]}")
        continue
    
    print(f"  ❌ 모든 방법 실패:")
    print(f"     pg_meta: {resp.status_code} {resp.text[:100]}")
    print(f"     RPC: {resp2.status_code} {resp2.text[:100]}")
    print(f"     Management: {resp3.status_code} {resp3.text[:100]}")

print("\n=== 완료 ===")
