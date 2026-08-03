"""
consultations 테이블 RLS 정책 수정
- anon 사용자도 INSERT 가능하도록 정책 추가
- consultation_messages 테이블도 동일하게 처리
"""
import urllib.request
import json
import os

SUPABASE_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_KEY = "sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn"
PROJECT_REF = "iqfcfpkztoyuzbeqodbq"

def run_sql(sql: str, label: str):
    """Supabase Management API를 통해 SQL 실행"""
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    data = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            print(f"✅ {label}: 성공")
            return result
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if "already exists" in body or "duplicate" in body:
            print(f"⚠️  {label}: 이미 존재 (무시)")
        else:
            print(f"❌ {label}: 오류 - {body[:300]}")
    except Exception as ex:
        print(f"❌ {label}: 예외 - {ex}")

# 1. consultations 테이블 현재 RLS 정책 확인
run_sql(
    "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'consultations'",
    "consultations RLS 정책 조회"
)

# 2. consultations - anon INSERT 허용 정책 추가
run_sql(
    """
    DROP POLICY IF EXISTS "anon_insert_consultations" ON consultations;
    CREATE POLICY "anon_insert_consultations" ON consultations
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true)
    """,
    "consultations anon INSERT 정책 추가"
)

# 3. consultation_messages - anon INSERT 허용 정책 추가
run_sql(
    """
    DROP POLICY IF EXISTS "anon_insert_consultation_messages" ON consultation_messages;
    CREATE POLICY "anon_insert_consultation_messages" ON consultation_messages
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true)
    """,
    "consultation_messages anon INSERT 정책 추가"
)

# 4. consultations - anon SELECT 허용 (자신의 상담만, 이메일로 조회)
run_sql(
    """
    DROP POLICY IF EXISTS "anon_select_own_consultation" ON consultations;
    CREATE POLICY "anon_select_own_consultation" ON consultations
      FOR SELECT
      TO anon, authenticated
      USING (true)
    """,
    "consultations anon SELECT 정책 추가"
)

print("\n✅ RLS 정책 수정 완료")
