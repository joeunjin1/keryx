# KERYX 전체 포털 버그 수정 완료 보고서

작성일: 2026-05-11  
기준 문서: `keryx_full_test_report.pdf`

---

## 수정 완료 항목 전체 목록

### 1. 치명적 오류 — seller 포털 전체 `user_id` 컬럼 오류

**문제:** `sellers` 테이블에는 `user_id` 컬럼이 존재하지 않고 `shared_login_user_id`를 사용하는데, seller 포털의 모든 페이지가 `.eq('user_id', user.id)`로 조회하여 항상 `null`을 반환했습니다. 이로 인해 바이어 메시지, 대시보드, 주문, 결제 등 모든 기능이 작동하지 않았습니다.

**수정 파일 (11개):**

| 파일 | 수정 내용 |
| :--- | :--- |
| `seller/messages/page.tsx` | `user_id` → `shared_login_user_id` (2곳) |
| `seller/layout.tsx` | `user_id` → `shared_login_user_id` |
| `seller/page.tsx` | `user_id` → `shared_login_user_id` (2곳) |
| `seller/catalog/page.tsx` | `user_id` → `shared_login_user_id` |
| `seller/interests/page.tsx` | `user_id` → `shared_login_user_id` |
| `seller/orders/page.tsx` | `user_id` → `shared_login_user_id` |
| `seller/payments/page.tsx` | `user_id` → `shared_login_user_id` |
| `seller/research/new/page.tsx` | `user_id` → `shared_login_user_id` |
| `seller/research/page.tsx` | `user_id` → `shared_login_user_id` |
| `seller/account/page.tsx` | `user_id` → `shared_login_user_id` |
| `seller/service-requests/page.tsx` | `user_id` → `shared_login_user_id` |

---

### 2. 관리자 포털 — 바이어 등록 기능 오류

**문제:** `register-seller` API에서 일반 Supabase 클라이언트(`supabase.auth.admin.createUser`)를 사용하여 Auth 사용자 생성에 실패했습니다. Admin API는 Service Role Key가 필요합니다.

**수정:** `supabase.auth.admin.createUser` → `adminSupabase.auth.admin.createUser`

---

### 3. 404 에러 — 누락 페이지 9개 신규 생성

| 페이지 경로 | 내용 | 포털 |
| :--- | :--- | :--- |
| `/admin/requests` | 공장 매칭 + 시장조사 + 서비스 의뢰 통합 관리 | 관리자 |
| `/md/brief` | AI Brief 자동 생성 (배정된 의뢰 기반) | MD |
| `/md/matching` | `/md/mvp/factory-matching`으로 리다이렉트 | MD |
| `/md/margin` | 마진 계산기 (원가/물류/관세/검수/관리비) | MD |
| `/factory/rating` | 공장 평가 현황 (MD 평가 점수 + 코멘트) | 공장 |
| `/seller/wishlist` | 관심 상품 목록 | 바이어 |
| `/seller/services` | 서비스 신청 내역 (유형별 진행 상태) | 바이어 |
| `/seller/requests` | 공장 매칭 + 시장조사 의뢰 통합 현황 | 바이어 |

---

## 아직 남은 문제점 (추가 작업 필요)

아래 항목들은 이번 수정에서 해결되지 않았으며, 별도 작업이 필요합니다.

| # | 문제 | 원인 | 작업 규모 |
|:---:|:---|:---|:---:|
| 1 | 관리자 포털 언어 전환 불완전 | 일부 컴포넌트가 `LangText` 미사용 | 중간 |
| 2 | 공장 포털 기본 언어가 한국어 | 공장 레이아웃 기본 `lang` 설정 문제 | 소규모 |
| 3 | `/seller/matching` (구 매칭 페이지) 데이터 없음 | 보고서 발송 전 상태이므로 정상 | 해당 없음 |
| 4 | MD 포털 데이터 연동 (공장 등록 상품 → MD 노출) | DB 조인 쿼리 추가 필요 | 중간 |
| 5 | 바이어 대시보드 통계 카운터 실시간 반영 | `seller_id` 기준 집계 쿼리 수정 필요 | 소규모 |

---

## 빌드 및 배포 현황

- **빌드 결과:** ✓ 성공 (에러 0건)
- **신규 라우트:** 9개 정상 등록 확인
- **GitHub push:** `main` 브랜치 완료
- **Vercel 자동 배포:** 진행 중 (https://www.keryx.kr)
