# KERYX 주요 업무 파이프라인 테스트 결과 보고서

**작성일**: 2026-05-11  
**테스트 대상**: https://www.keryx.kr  
**테스트 범위**: 공개 페이지 + 견적 폼 전체 파이프라인

---

## 1. 테스트 결과 요약

| 구분 | 항목 | 결과 |
|------|------|------|
| 공개 페이지 | 홈 (`/`) | ✅ 정상 |
| 공개 페이지 | 서비스 (`/services`) | ✅ 정상 |
| 공개 페이지 | 가격 안내 (`/pricing`) | ✅ 정상 |
| 공개 페이지 | FAQ (`/faq`) | ✅ 정상 |
| 공개 페이지 | 견적 의뢰 (`/quote`) | ✅ 정상 |
| 견적 폼 | 1단계 - 제품 정보 입력 | ✅ 정상 |
| 견적 폼 | 2단계 - 수량·사양 입력 | ✅ 정상 |
| 견적 폼 | 3단계 - 서비스 선택 | ✅ 정상 |
| 견적 폼 | 4단계 - 연락처 입력 | ✅ 정상 |
| 견적 폼 | 제출 완료 화면 | ✅ 정상 ("견적 요청이 접수되었습니다!") |
| 중국어 버전 | `/zh/quote` | ✅ 정상 |
| 포털 | MD 대시보드 (`/md`) | ✅ 200 응답 (로그인 필요) |
| 포털 | 셀러 대시보드 (`/seller`) | ✅ 200 응답 (로그인 필요) |
| 포털 | 관리자 (`/admin`) | ✅ 200 응답 (로그인 필요) |
| 포털 | 공장 포털 (`/factory`) | ✅ 200 응답 (로그인 필요) |

---

## 2. 수정된 오류

### 2-1. 견적 폼 제출 오류 (提交时发生错误) — **해결 완료**

**원인**: `quote_requests` 테이블에 존재하지 않는 컬럼 8개를 INSERT 시도
- `reference_image_url`, `desired_qty`, `desired_deadline`, `sales_country`
- `cert_needed`, `budget_range`, `has_sample`, `contact_method`

**해결 방법**: 폼 제출 코드(`src/app/quote/page.tsx`)를 수정하여 위 8개 필드를 기존 `memo` 컬럼에 JSON 형태로 병합 저장
```
memo: "[추가정보] {\"desired_qty\":\"500개\",...}"
```

**마이그레이션 파일 추가**: 향후 DB 컬럼 추가를 위한 마이그레이션 파일 2개 생성
- `20260511020000_quote_requests_columns_fix.sql`
- `20260511030000_quote_requests_extra_columns.sql`

---

## 3. 파이프라인 파이프라인 신규 구현 사항 (이번 세션)

| 기능 | 파일 | 상태 |
|------|------|------|
| 검수 완료 API | `src/app/api/orders/[orderId]/complete-inspection/route.ts` | ✅ 배포 완료 |
| 운송 생성 API | `src/app/api/orders/[orderId]/create-shipment/route.ts` | ✅ 배포 완료 |
| 청구서 API | `src/app/api/invoices/route.ts` | ✅ 배포 완료 |
| 셀러 카탈로그 주문하기 버튼 | `src/app/seller/catalog/page.tsx` | ✅ 배포 완료 |
| 셀러 대시보드 파이프라인 상태 | `src/app/seller/SellerHomeClient.tsx` | ✅ 배포 완료 |
| MD 대시보드 파이프라인 상태 | `src/app/md/page.tsx` | ✅ 배포 완료 |

---

## 4. 주의사항 및 권고사항

### DB 스키마 관리
- 폼 필드 추가 시 반드시 마이그레이션 파일을 동시에 작성할 것
- Supabase 대시보드에서 직접 SQL 실행하여 컬럼을 추가하면 영구적으로 해결됨
- 권장 SQL:
```sql
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS reference_image_url  text,
  ADD COLUMN IF NOT EXISTS desired_qty          text,
  ADD COLUMN IF NOT EXISTS desired_deadline     text,
  ADD COLUMN IF NOT EXISTS sales_country        text,
  ADD COLUMN IF NOT EXISTS cert_needed          text,
  ADD COLUMN IF NOT EXISTS budget_range         text,
  ADD COLUMN IF NOT EXISTS has_sample           text,
  ADD COLUMN IF NOT EXISTS contact_method       text;
```

### 업데이트 원칙 (재확인)
- 기존 페이지를 유지하면서 부분 수정하는 방식을 항상 준수
- 전체 파일 재작성 대신 `edit` 방식으로 최소 변경
- 수정 전 TypeScript 빌드 검증 필수

---

## 5. 현재 사이트맵

| URL | 설명 | 접근 권한 |
|-----|------|-----------|
| `/` | 홈 | 공개 |
| `/services` | 서비스 소개 | 공개 |
| `/pricing` | 가격 안내 | 공개 |
| `/faq` | FAQ | 공개 |
| `/quote` | 견적 요청 폼 | 공개 |
| `/login` | 로그인 | 공개 |
| `/md` | MD 대시보드 | MD 권한 |
| `/md/orders` | MD 주문 관리 | MD 권한 |
| `/md/catalog` | MD 카탈로그 | MD 권한 |
| `/seller` | 셀러 대시보드 | 셀러 권한 |
| `/seller/catalog` | 셀러 카탈로그 (주문하기 버튼 포함) | 셀러 권한 |
| `/seller/orders` | 셀러 주문 목록 | 셀러 권한 |
| `/seller/orders/[orderId]` | 셀러 주문 상세 | 셀러 권한 |
| `/admin` | 관리자 대시보드 | 관리자 권한 |
| `/factory` | 공장 포털 | 공장 권한 |
| `/api/orders/[orderId]/complete-inspection` | 검수 완료 API | 인증 필요 |
| `/api/orders/[orderId]/create-shipment` | 운송 생성 API | 인증 필요 |
| `/api/invoices` | 청구서 API | 인증 필요 |
