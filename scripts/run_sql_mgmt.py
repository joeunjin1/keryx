#!/usr/bin/env python3
"""Supabase Management API를 통한 SQL 실행"""
import sys
import requests
import json

PROJECT_REF = "iqfcfpkztoyuzbeqodbq"
# Management API는 service_role key가 아닌 access token 필요
# 대신 pg_net extension이나 direct connection 사용

# Supabase REST API로 개별 SQL 구문 실행
SUPABASE_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_KEY = "sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn"

def run_statements(sql_file: str):
    """SQL 파일을 읽어 각 구문을 실행"""
    with open(sql_file, "r") as f:
        content = f.read()
    
    # 주석 제거 및 구문 분리
    lines = []
    for line in content.split('\n'):
        stripped = line.strip()
        if not stripped.startswith('--') and stripped:
            lines.append(line)
    
    clean_sql = '\n'.join(lines)
    
    # 세미콜론으로 구문 분리
    statements = [s.strip() for s in clean_sql.split(';') if s.strip()]
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SERVICE_KEY}",
        "apikey": SERVICE_KEY,
        "Prefer": "return=minimal"
    }
    
    success = 0
    errors = 0
    
    for i, stmt in enumerate(statements):
        if not stmt or len(stmt) < 5:
            continue
        
        # RPC를 통해 실행 (PostgreSQL 함수 호출 방식)
        # 실제로는 Supabase의 pg_net을 사용하거나 직접 연결 필요
        print(f"\n[{i+1}/{len(statements)}] 실행 중...")
        print(f"  SQL: {stmt[:80]}...")
        
        # Supabase는 REST API로 DDL을 직접 실행할 수 없으므로
        # 브라우저 SQL Editor를 통해 실행해야 함
        print("  → Supabase REST API로는 DDL 직접 실행 불가")
    
    print("\n\n=== SQL 구문 목록 (Supabase SQL Editor에 붙여넣기) ===")
    print(clean_sql)

if __name__ == "__main__":
    sql_file = sys.argv[1] if len(sys.argv) > 1 else "scripts/create_staff_email_table.sql"
    run_statements(sql_file)
