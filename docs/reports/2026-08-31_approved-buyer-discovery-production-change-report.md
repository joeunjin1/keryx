# KERYX 승인 바이어 신상품·샘플 구독 Phase 0 Production 변경 보고서

- 작성일: 2026-08-31 (KST)
- 대상 브랜치: `feat/approved-buyer-discovery`
- 코드 기준 커밋: `5cbed4f`
- 변경 유형: **무파괴 스키마 추가, 전용 비공개 파일 저장소 추가, 승인형 구독 UI·API 추가**
- Production 적용 상태: **대표 사전 승인 완료, SQL 실행 및 실계정 검증 대기**

## 1. 결론 및 적용 범위

이번 Phase 0은 기존 KERYX 스토어, IP, 기존 B2B 주문, `sellers`, `b2b_subscribers`, 기존 샘플 구독 이력과 상품 데이터를 삭제하거나 덮어쓰지 않는다. 신규 기능은 승인 바이어의 회사 인증 이력, 구독 접근 상태, 신상품·샘플 게시 상태, 검토 이력, 바이어의 열람·저장 이력을 **독립 테이블**로 추가한다.

공개 `/sample-subscription`은 더 이상 이메일만으로 구독을 생성하지 않는다. 바이어 계정으로 로그인한 뒤 회사 정보와 사업자등록증을 제출하고, 운영자의 승인으로 구독 접근이 활성화되어야 `/buyer/discover`에서 최근 14일 이내 게시된 신상품·샘플을 볼 수 있다. 노출 기간이 지난 항목은 삭제되지 않으며 DB 조회 조건과 매일 실행되는 종료 작업으로 피드에서만 제외된다.

| 구분 | 추가·변경 항목 | 기존 데이터 영향 |
|---|---|---|
| 바이어 인증 | `buyer_company_verifications`, `buyer_company_verification_reviews` | 기존 `sellers` 행을 수정하지 않음 |
| 구독 접근 | `buyer_discovery_access` | 기존 `b2b_subscribers`의 이력은 참조만 하며 상태를 변경하지 않음 |
| 신상품 피드 | `new_product_offerings`, `new_product_offering_assets`, `new_product_offering_reviews`, `buyer_discovery_events` | 기존 상품·소매 상품·공장 상품은 수정하지 않음 |
| 파일 보관 | `buyer-verification-documents`, `approved-buyer-discovery-media` 비공개 버킷 | 기존 공개 이미지와 기존 문서 버킷을 변경하지 않음 |
| 일정 작업 | `/api/cron/expire-new-product-offerings` 및 Vercel 일일 실행 설정 | 기존 Cron 경로를 변경하지 않음 |

## 2. Production 적용 SQL

적용할 파일은 [`20260831_approved_buyer_new_product_discovery.sql`](../../supabase/migrations/20260831_approved_buyer_new_product_discovery.sql)이다. 이 파일은 트랜잭션으로 실행되며, 새로운 객체 생성 중 오류가 발생하면 전체 DDL 적용이 커밋되지 않는다. 단, 실제 Storage 버킷 객체는 Supabase 내부 메타데이터에 추가되므로 실행 결과 화면의 성공·오류 메시지를 반드시 확인한다.

| 보호 대상 | 구현 방식 | 확인 기준 |
|---|---|---|
| 바이어 인증 서류 | 신규 비공개 버킷, 판매자 본인 폴더 제한, 운영자 RLS | 공개 URL을 저장하거나 반환하지 않음 |
| 인증 승인 | 원자적 DB 함수와 불변 검토 이력 | 승인·보완·반려가 접근 상태와 함께 기록됨 |
| 신상품 노출 | `published_at`부터 정확히 14일 `expires_at` 고정 | API와 보안 뷰가 모두 만료 항목을 제외함 |
| 공장 신상품 | `shared_login_user_id`에 연결된 자기 공장만 제출 | 공장에는 승인·게시 권한 없음 |
| 가격·공장 정보 | 승인 바이어 피드의 SELECT 목록에서 제외 | 공장 ID, 원가, 마진, 연락처가 API 응답에 없음 |
| 개인정보 | 관리자 목록 기본 마스킹, 사유 기반 단기 원문 열람 | 원문 열람마다 `operator_activity_log`에 기록 |

> **운영 주의:** `CRON_SECRET`은 기존 공개 환경변수 템플릿에 이미 항목이 있으나, Production 환경에 실제 값이 설정되어 있어야 일일 만료 작업이 인증된다. 값 자체는 코드·문서·보고서에 기록하지 않는다. 설정 상태는 Production 배포 후 응답 코드와 Vercel Cron 실행 이력으로 검증한다.

## 3. Preview 검증 결과

Vercel Preview는 최신 공장 신상품 제출 커밋 `6bbe0aa` 기준으로 Ready 상태를 확인했다. 공개 `/sample-subscription`은 한국어 안내, 바이어 회사 인증 시작 경로, 기존 공개 메뉴를 정상 표시했다. HTTP 검증에서는 공개 안내와 인증 신청 경로가 `200`, 바이어 피드·공장 제출·관리자 인증·운영자 신상품 관리 경로가 미로그인 상태에서 로그인 경로로 `307`, 기존 공개 구독 생성 API가 `410`을 반환했다.

| 검증 항목 | 결과 | 해석 |
|---|---|---|
| TypeScript 검사 | 통과 | 신규 페이지·API·컴포넌트 타입 오류 없음 |
| 구문·공백 검사 | 통과 | 기존 소매·운영자 파일과 신규 변경 충돌 없음 |
| Preview 빌드 | Ready | 기능 브랜치 번들 생성 성공 |
| 공개 구독 안내 | 확인됨 | 인증형 서비스 정책이 화면에 반영됨 |
| 미로그인 보호 | 확인됨 | `/buyer`, `/factory`, `/admin` 신규 경로가 로그인으로 전환됨 |
| DB/RLS 실동작 | 대기 | Production SQL 적용 전에는 신규 테이블이 존재하지 않음 |
| 승인·게시·만료 실동작 | 대기 | Production SQL 및 역할별 실계정 검증 필요 |

## 4. 배포 이후 역할별 실동작 검증

SQL 적용 후에는 운영자가 임의의 실상품·가격·재고를 만들지 않고, 운영 가능 범위의 테스트용 비공개 신상품 한 건 또는 승인된 실제 상품 자료로 다음 흐름을 검증한다. 테스트 기록은 삭제하지 않고 운영 이력에 남기며, 공개 게시 테스트를 마치면 항목은 `archived` 상태로 전환한다.

| 역할 | 입력·행동 | 성공 조건 |
|---|---|---|
| 바이어 | 회사 정보·증빙 제출, 마케팅 수신 동의 선택 | `submitted` 인증 이력과 `pending_verification` 접근 레코드 생성 |
| 운영자 | 목록에서 마스킹 정보를 검토하고, 사유를 입력해 원문·증빙 열람 | 단기 서명 URL 생성 및 `buyer_verification_sensitive_unmasked` 이력 생성 |
| 운영자 | 인증 승인 | `approved` 인증과 `active` 구독 접근이 원자적으로 생성 |
| 공장 또는 운영자 | 신상품·샘플 초안/검토 요청 등록, 미디어 첨부 | 비공개 미디어 버킷과 신상품 자산 레코드 연결 |
| 운영자 | 제출 → 승인 → 게시 | 게시 시점과 14일 후 종료 시점이 자동 결정되고 검토 이력이 추가 |
| 승인 바이어 | `/buyer/discover` 조회 | 게시 후 14일 이내 항목과 단기 서명 미디어만 표시 |
| 비승인 바이어 | `/buyer/discover` 조회 | `403`과 회사 인증 안내를 수신 |
| 일일 작업 | Cron 호출 또는 운영자 확인 | 기간이 지난 게시물은 `expired`, 피드에는 미표시 |

## 5. 병합·Production 배포 순서

코드는 현재 기능 브랜치에 있고 아직 `main`에 병합하지 않았다. SQL이 먼저 성공한 뒤 기능 브랜치 Pull Request의 최신 Preview를 재확인하고, 역할별 검증을 완료하면 Production 병합을 요청한다. Production에 병합하기 전에 토스페이먼츠 설정, 사용자 비밀번호, 사용자 계정, 기존 `sellers`·`b2b_subscribers`·주문 데이터는 변경하지 않는다.

| 순서 | 실행 주체 | 변경 | 중단 조건 |
|---|---|---|---|
| 1 | 대표 또는 승인된 운영자 | SQL Editor에서 Phase 0 SQL 실행 | 오류·롤백 메시지 발생 |
| 2 | 운영자 | SQL 검증 SELECT 결과 확인 | 테이블·버킷·RLS 누락 |
| 3 | 운영자 | 바이어·공장·관리자 역할별 흐름 검증 | 권한 우회, 개인정보 노출, 14일 조건 불일치 |
| 4 | 대표 | Pull Request 병합 승인 | Preview 오류 또는 미해결 보안 이슈 |
| 5 | 운영자 | `main` 병합 및 Production 재검증 | Production HTTP/API 보호 실패 |

## 6. 외부 연동 및 사이트맵 변경 기록

외부 결제 연동은 추가·변경하지 않았다. Vercel에는 신상품 만료 Cron 경로만 새로 추가했으며, Production `CRON_SECRET` 값의 존재 여부는 배포 후 확인한다. Supabase에는 두 개의 비공개 Storage 버킷과 Phase 0 테이블·RLS·함수·뷰를 새로 추가한다.

신규 사이트맵 항목은 공개 안내 `/sample-subscription`, 바이어 신청 `/sample-subscription/apply`, 바이어 상태 `/sample-subscription/status`, 승인 바이어 피드 `/buyer/discover`, 상세 `/buyer/discover/[offeringId]`, 운영자 인증 `/admin/buyer-verifications`, 운영자 피드 `/admin/new-product-feed`, 공장 제출 `/factory/new-product-feed`이다. 역할별 메뉴 변경과 DB·API·알림 단위는 `sitemap.yaml`에 함께 기록했다.

## References

[1]: ../../supabase/migrations/20260831_approved_buyer_new_product_discovery.sql "Phase 0 무파괴 데이터·권한 마이그레이션"
[2]: ../../sitemap.yaml "KERYX 라이빙 사이트맵"
[3]: ./2026-08-31_phase0-schema-access-log.md "Production 스키마 및 Preview 검증 기록"
