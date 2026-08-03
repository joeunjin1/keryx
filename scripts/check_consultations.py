#!/usr/bin/env python3
import requests
import json

PROJECT_URL = "https://iqfcfpkztoyuzbeqodbq.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmNmcGt6dG95dXpiZXFvZGJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUyMzQ0MiwiZXhwIjoyMDkzMDk5NDQyfQ.kNQG7cJZNX-MOITF2lEw2mrBVn7UgwYbF2ZvGk1471Y"

HEADERS = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "apikey": SERVICE_KEY,
}

print("=== consultations 테이블 확인 ===")
resp = requests.get(
    f"{PROJECT_URL}/rest/v1/consultations?select=id,inquiry_type,requester_name,requester_email,status,created_at&order=created_at.desc&limit=10",
    headers=HEADERS,
    timeout=30
)
print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print(f"총 {len(data)}건")
    for d in data:
        print(f"  - {d.get('id','')[:8]}... | {d.get('inquiry_type','')} | {d.get('requester_name','')} | {d.get('status','')} | {d.get('created_at','')[:19]}")
else:
    print(f"오류: {resp.text[:300]}")

print("\n=== sample_requests 테이블 확인 ===")
resp2 = requests.get(
    f"{PROJECT_URL}/rest/v1/sample_requests?select=id,status,created_at&order=created_at.desc&limit=5",
    headers=HEADERS,
    timeout=30
)
print(f"Status: {resp2.status_code}")
if resp2.status_code == 200:
    data2 = resp2.json()
    print(f"총 {len(data2)}건")
    for d in data2:
        print(f"  - {d.get('id','')[:8]}... | {d.get('status','')} | {d.get('created_at','')[:19]}")
else:
    print(f"오류: {resp2.text[:300]}")
