#!/usr/bin/env python3
"""Supabase SQL 실행 스크립트"""
import os
import sys
import requests

SUPABASE_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_KEY = "sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn"

def run_sql(sql: str) -> dict:
    """Supabase REST API를 통해 SQL 실행"""
    # Supabase Management API 사용
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SERVICE_KEY}",
        "apikey": SERVICE_KEY,
    }
    
    # RPC를 통한 SQL 실행
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"sql": sql},
        timeout=30
    )
    return resp

if __name__ == "__main__":
    sql_file = sys.argv[1] if len(sys.argv) > 1 else None
    if not sql_file:
        print("Usage: python run_sql.py <sql_file>")
        sys.exit(1)
    
    with open(sql_file, "r") as f:
        sql = f.read()
    
    print(f"SQL 파일 읽기 완료: {sql_file}")
    print(f"SQL 길이: {len(sql)} 문자")
    
    resp = run_sql(sql)
    print(f"응답 상태: {resp.status_code}")
    print(f"응답 내용: {resp.text[:500]}")
