# 01_PROJECT.md — KERYX 프로젝트 정보

## 기본 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | KERYX (케릭스) |
| 사이트 URL | https://www.keryx.kr |
| GitHub | https://github.com/DesignToGoods/keryx (private) |
| Vercel 프로젝트 | keryx |
| Supabase 프로젝트 ID | iqfcfpkztoyuzbeqodbq |
| Supabase URL | https://iqfcfpkztoyuzbeqodbq.supabase.co |

## 기술 스택

| 항목 | 기술 |
|------|------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (서버리스) |
| DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| 호스팅 | Vercel (자동 배포) |
| Storage | Supabase Storage |

## 주요 포털 URL

| 포털 | URL |
|------|-----|
| 공개 홈 | https://www.keryx.kr |
| 견적 폼 | https://www.keryx.kr/quote |
| 관리자 | https://www.keryx.kr/admin |
| MD 포털 | https://www.keryx.kr/md |
| 셀러 포털 | https://www.keryx.kr/seller |
| 공장 포털 | https://www.keryx.kr/factory |
| Shop | https://www.keryx.kr/shop |
| 로그인 | https://www.keryx.kr/login |

## 관리자 계정

| 항목 | 내용 |
|------|------|
| 이메일 | jo@keryx.kr |
| 비밀번호 | Keryx1234! |

## Supabase 인증 정보

| 항목 | 내용 |
|------|------|
| Anon Key | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZmNmcGt6dG95dXpiZXFvZGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MjM0NDIsImV4cCI6MjA5MzA5OTQ0Mn0.oaNauIfwNOSQTIwHDWbQ3afSxbxTqS59s0oERfQbVec |
| Auth API | https://iqfcfpkztoyuzbeqodbq.supabase.co/auth/v1 |

## 마이그레이션 파일 목록 (최신순)

| 파일명 | 내용 |
|--------|------|
| 20260511040000_product_approval_workflow.sql | 상품 승인 워크플로우 컬럼/RPC/RLS |
| 20260511030000_quote_requests_extra_columns.sql | quote_requests 누락 컬럼 추가 |
| 20260511020000_quote_requests_columns_fix.sql | quote_requests 컬럼 수정 |
