#!/usr/bin/env python3
"""
Supabase REST API를 통해 RLS 정책을 적용합니다.
새로운 sb_publishable_ / sb_secret_ 키 형식을 사용합니다.
"""
import requests
import json

SUPABASE_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_KEY = "sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn"

# Supabase REST API 헤더
headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# 실행할 SQL 목록
sql_statements = [
    # inbound_emails RLS 활성화
    "ALTER TABLE IF EXISTS inbound_emails ENABLE ROW LEVEL SECURITY",
    
    # 관리자: 모든 이메일 읽기/쓰기
    "DROP POLICY IF EXISTS admin_all_inbound ON inbound_emails",
    """CREATE POLICY admin_all_inbound ON inbound_emails
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.kind IN ('admin', 'super_admin')
          )
        )""",
    
    # 직원: 자신에게 배정된 이메일만 읽기
    "DROP POLICY IF EXISTS staff_read_own_inbound ON inbound_emails",
    """CREATE POLICY staff_read_own_inbound ON inbound_emails
        FOR SELECT
        USING (assigned_user_id = auth.uid())""",
    
    # 직원: 자신에게 배정된 이메일 업데이트
    "DROP POLICY IF EXISTS staff_update_own_inbound ON inbound_emails",
    """CREATE POLICY staff_update_own_inbound ON inbound_emails
        FOR UPDATE
        USING (assigned_user_id = auth.uid())
        WITH CHECK (assigned_user_id = auth.uid())""",
    
    # consultations 테이블 RLS 활성화
    "ALTER TABLE IF EXISTS consultations ENABLE ROW LEVEL SECURITY",
    "DROP POLICY IF EXISTS anon_insert_consultation ON consultations",
    """CREATE POLICY anon_insert_consultation ON consultations
        FOR INSERT
        WITH CHECK (true)""",
    "DROP POLICY IF EXISTS admin_all_consultations ON consultations",
    """CREATE POLICY admin_all_consultations ON consultations
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.kind IN ('admin', 'super_admin')
          )
        )""",
    
    # staff_email_addresses RLS 활성화
    "ALTER TABLE IF EXISTS staff_email_addresses ENABLE ROW LEVEL SECURITY",
    "DROP POLICY IF EXISTS admin_all_staff_emails ON staff_email_addresses",
    """CREATE POLICY admin_all_staff_emails ON staff_email_addresses
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.kind IN ('admin', 'super_admin')
          )
        )""",
    "DROP POLICY IF EXISTS staff_read_own_email_addr ON staff_email_addresses",
    """CREATE POLICY staff_read_own_email_addr ON staff_email_addresses
        FOR SELECT
        USING (user_id = auth.uid())""",
]

print("RLS 정책 적용 시작...")
print("=" * 60)

success_count = 0
error_count = 0

for i, sql in enumerate(sql_statements, 1):
    short_sql = sql.strip().replace('\n', ' ').replace('  ', ' ')[:70]
    
    # Supabase REST API의 /rest/v1/rpc 또는 직접 쿼리 실행
    # 새 형식 키로 시도
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"sql_query": sql},
        timeout=15
    )
    
    if resp.status_code in (200, 204):
        print(f"[OK] {short_sql}...")
        success_count += 1
    elif "already exists" in resp.text or "duplicate" in resp.text:
        print(f"[SKIP] {short_sql}... (already exists)")
        success_count += 1
    else:
        # 직접 쿼리 실행 시도 (다른 엔드포인트)
        resp2 = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/query",
            headers=headers,
            json={"query": sql},
            timeout=15
        )
        
        if resp2.status_code in (200, 204):
            print(f"[OK] {short_sql}...")
            success_count += 1
        elif "already exists" in resp2.text:
            print(f"[SKIP] {short_sql}... (already exists)")
            success_count += 1
        else:
            print(f"[ERROR] {short_sql}...")
            print(f"  Status: {resp.status_code}, Response: {resp.text[:200]}")
            error_count += 1

print("=" * 60)
print(f"완료: 성공 {success_count}개, 오류 {error_count}개")
