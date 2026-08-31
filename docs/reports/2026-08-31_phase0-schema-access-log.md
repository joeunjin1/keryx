# Phase 0 스키마 접근 기록

- 확인 일시: 2026-08-31 (KST)
- 대상: KERYX Production Supabase 프로젝트
- 확인 경로: `https://supabase.com/dashboard/project/irxfncfpkzdtqoyuzbeq/editor`
- 결과: 사용자의 브라우저 세션은 Supabase 조직 선택 화면으로 전환되어, 이 세션에서는 대상 프로젝트의 Table Editor·SQL Editor에 직접 진입하지 못했다.
- 현재 세션 설정: Supabase 및 Supabase API 연결은 비활성 상태로 표시되었다.
- 보안 결론: 이 시점에 Production DB 읽기·쓰기 작업은 수행하지 않았다. 실제 스키마는 기존 마이그레이션·코드만으로 추정하지 않고, 프로젝트 대시보드 또는 사용자가 실행한 읽기 전용 SQL 결과로 재대조해야 한다.
- 다음 단계: 기능 브랜치에서 무파괴 SQL 초안과 코드 작업을 준비하고, Production 적용 전에는 SQL 전체·RLS·영향 범위를 대표에게 다시 제시한다.

## Production Table Editor 확인 결과

2026-08-31에 KERYX Production Supabase Table Editor에서 `public.b2b_subscribers`의 읽기 전용 정의를 확인했다. 이 테이블은 현재 0개 레코드이며 RLS 정책 2개가 설정되어 있다. 확인된 핵심 컬럼은 `id`, `email`, `company_name`, `phone`, `business_number`, `business_license_url`, `status`, `rejection_reason`, `notes`, `subscribed_at`, `approved_at`, `rejected_at`, `unsubscribed_at`, `approved_by`, `created_at`, `updated_at`, `deleted_at`, `contact_name`, `interest_ip_slugs`, `interest_categories`, `privacy_consent_at`, `marketing_consent_at`, `source`다.

이 결과는 기존 테이블이 이미 회사명·사업자번호·사업자등록증 URL·승인 상태·반려 사유·관심 IP·관심 카테고리·동의 시각을 보존하고 있음을 보여 준다. 다만 로그인한 바이어 계정과의 명시적 연결, 회사 검증 재심사 상태, 피드 접근 상태, 게시물 열람·저장 이력, 최근 14일 신상품 보안 뷰는 별도 확장이 필요하다. 신규 스키마는 위 레거시 이력을 변경하지 않고 `b2b_subscribers.id`를 참조하는 추가 테이블과 보안 뷰로 구성한다.

같은 Production 프로젝트 개요에서 `audit_log`, `categories`, `colors` 등 일부 기존 테이블이 RLS 미활성으로 표시되는 보안 권고도 확인했다. 이 보안 이슈는 새 기능과 독립된 기존 위험이며, Phase 0 신규 테이블은 예외 없이 RLS를 활성화한다. 기존 테이블의 RLS 일괄 전환은 운영 영향이 있으므로 별도 점검·승인 없이 수행하지 않는다.

## Production sellers 테이블 확인 결과

`public.sellers`는 Production에 35개 레코드와 RLS 정책 3개가 존재한다. 읽기 전용 정의에서 `id`, `user_id`, `business_name`, `business_registration_no`, `legal_representative`, `primary_channel`, `channel_url`, `country`, `contact_name`, `contact_phone`, `contact_email`, `preferred_categories`, `preferred_ips`, `style_keywords`, `budget_min_cny`, `budget_max_cny`, `typical_moq`, `current_grade`, `vip_qualified_at`, `vip_expires_at`, `current_membership`, `membership_started_at`, `membership_expires_at`, `trial_used`, `assigned_md_id`, `total_orders`, `total_balance_paid_cny`, `current_month_balance_paid_cny`, `approval_status`가 확인되었다.

새 승인형 신상품·샘플 구독은 `sellers.id`와 `sellers.user_id`를 기준으로 연결한다. 회사명·사업자등록번호·대표자·담당자·연락처·관심 카테고리의 기본 정보는 이미 `sellers`에 있으나, 사업자등록증의 비공개 스토리지 참조, 제출 스냅샷, 보완 요청, 재검증 사유, 구독 피드 접근 상태, 승인·열람·발송 감사 이력은 현재 구조에 없으므로 신규 테이블로 추가한다.

이 확인은 기존 `sellers` 데이터를 수정하지 않는 읽기 전용 점검이다. 목록에는 테스트성으로 보이는 일부 사업자명이 존재하지만, 해당 행의 정정·삭제·통합은 이번 기능 구현 범위에서 제외하며 운영자 별도 검토 없이는 수행하지 않는다.

## Production Storage 확인 결과

Production Storage에는 `keryx-public-media`, `chat-files`, `consultation-images`, `service-request-images`, `product-images` 등 공개 버킷과, 공개 표기가 없는 `message-attachments`, `license-proofs`, `brief-references`, `inspection-photos`, `research-references`가 존재한다. 사업자등록증은 공개 이미지 버킷이나 기존 라이선스 증명 버킷에 혼합하지 않는다.

Phase 0 SQL에는 회사 검증 서류 전용의 새 비공개 버킷 `buyer-verification-documents`와 최소 권한 스토리지 정책을 추가한다. 바이어는 자기 회사의 제출 파일만 업로드·조회하고, 운영자·권한을 부여받은 검토 담당자만 검토 목적으로 접근할 수 있다. 공개 URL을 저장·반환하지 않으며, 승인된 서버 경로에서 단기 서명 URL을 생성할 때만 원문을 열람한다.

## Production user_profiles 확인 결과

`public.user_profiles`에는 29개 레코드와 RLS 정책 3개가 존재하며, 실제 역할 판정 열은 `kind`이고 값으로 `seller`, `factory`, `md`가 확인되었다. 따라서 신규 승인형 구독 API·RLS·페이지는 `user_profiles.kind = 'seller'`와 `sellers.user_id = auth.uid()`를 바이어 확인의 기준으로 사용한다. 레거시 `role` 열을 전제하지 않는다.

Production 레코드에 테스트성 표기가 일부 확인되었지만, 이는 현행 데이터 정리 범위에 포함하지 않는다. 신규 기능은 승인 바이어의 새로운 연결 레코드와 서버 측 권한 검사만 추가하며 기존 프로필·판매자 행을 일괄 수정하지 않는다.

## 2026-08-31 승인 바이어 구독 Preview UI 확인

- 브랜치 `feat/approved-buyer-discovery`, 커밋 `6bbe0aa`의 Vercel Preview가 Ready 상태로 완료됐다.
- `/sample-subscription`은 로그인 없이 정상 렌더링되며, 일반 이메일 신청 폼 대신 바이어 로그인·회사 인증·운영 승인·최근 14일 피드 열람의 순서를 명확히 보여 준다.
- 공개 상단 메뉴의 스토어·샘플 구독·IP 소개·회사 소개와 한국어/중국어 전환 버튼이 표시됐다.
- Preview URL: `https://keryx-1z3aolio5-joeunjin1s-projects.vercel.app/sample-subscription`.
- DB 마이그레이션은 Production Supabase에 아직 적용하지 않았으므로, 인증 신청·승인·피드 데이터 등록의 실DB 검증은 SQL 적용 후에만 진행한다.

> 검증 상태: **확인됨** — 공개 안내 UI·기능 브랜치 Preview 빌드.
>
> 검증 상태: **대기** — Production SQL/RLS/스토리지 적용 후 권한별 실데이터 흐름.
