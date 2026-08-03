# 04_PROGRESS.md — 진행 상황

## 최근 작업 (2026-05-11)

### [확인됨] 견적 폼 제출 오류 해결

견적 폼 4단계 제출 시 "提交时发生错误" 오류를 완전 해결했다. 서버 API 라우트(`/api/quote/submit`, `/api/quote/upload-image`)를 생성하여 service_role 키로 RLS를 우회하고, Storage 버킷을 자동 생성하도록 처리했다. 실제 테스트에서 "견적 요청이 접수되었습니다!" 성공 화면을 확인했다.

### [시도함] 상품 승인 워크플로우 구현

공장 상품 등록 → MD 1차 승인 → 관리자 최종 승인 → /shop 노출 워크플로우를 구현했다. 주요 변경 사항은 다음과 같다.

| 파일 | 변경 내용 |
|------|----------|
| `src/app/md/products/page.tsx` | 엑셀 스타일 인라인 편집 테이블로 전면 리빌드 |
| `src/app/admin/products/page.tsx` | md_approved 탭 추가, 최종 승인 버튼 추가 |
| `src/app/api/admin/products/review/route.ts` | 승인/반려/수정 API 라우트 생성 |
| `src/app/api/public/products/route.ts` | approval_status='approved' 필터 추가 |
| `supabase/migrations/20260511040000_product_approval_workflow.sql` | DB 마이그레이션 파일 |

GitHub push 완료. Vercel 배포 완료. 단, DB 마이그레이션은 아직 Supabase에 적용되지 않음 (KNOWN_ISSUES #3 참조).

### [시도함] 파이프라인 API 라우트 추가

검수 완료(`/api/orders/[orderId]/complete-inspection`), 운송 생성(`/api/orders/[orderId]/create-shipment`), 청구서(`/api/invoices`) API 라우트를 생성하고 배포했다.

## 다음 할 일

1. 관리자 계정 로그인 문제 해결 (KNOWN_ISSUES #6)
2. 공장 계정 생성 기능 테스트 (관리자/MD 포털)
3. DB 마이그레이션 Supabase 적용 (product_approval_workflow)
4. 공장 상품 등록 → MD 승인 → 관리자 승인 → shop 노출 전체 플로우 테스트

## 완료된 작업

| 날짜 | 작업 | 상태 |
|------|------|------|
| 2026-05-11 | 견적 폼 제출 오류 해결 | [확인됨] |
| 2026-05-11 | 상품 승인 워크플로우 코드 구현 | [시도함] |
| 2026-05-11 | 파이프라인 API 라우트 추가 | [시도함] |
| 2026-05-11 | 셀러 카탈로그 주문하기 버튼 추가 | [시도함] |
| 2026-05-11 | 대시보드 파이프라인 상태 표시 추가 | [시도함] |
