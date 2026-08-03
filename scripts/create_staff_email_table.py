#!/usr/bin/env python3
"""Supabase service role key를 사용하여 직원 메일 주소 테이블 생성"""

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

# SQL 문들을 개별적으로 실행
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
]

# Supabase REST API의 /rest/v1/rpc 또는 직접 쿼리 실행
# service role key로 직접 postgres 쿼리 실행 - pg REST API 사용
for i, sql in enumerate(sqls):
    sql = sql.strip()
    print(f"\n[{i+1}/{len(sqls)}] 실행 중: {sql[:60]}...")
    
    # Supabase의 /rest/v1/ 엔드포인트는 DDL을 지원하지 않음
    # 대신 Edge Function이나 직접 postgres 연결 필요
    # 여기서는 Supabase의 Management API를 사용
    
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"sql": sql}
    )
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text[:200]}")

print("\n완료!")
