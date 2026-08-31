# 제조 프로젝트 핵심 스키마 — Production 적용 대장

**적용일:** 2026-08-31 GMT+9
**환경:** KERYX Production Supabase
**적용 방식:** 대표이사가 Supabase SQL Editor에서 전체 SQL을 직접 실행하고 성공 메시지를 확인함
**상태:** 적용 완료, 원문 SQL 재구성 전까지 이 문서는 권한·객체 기준 대장으로 사용

## 1. 적용 범위

본 스키마는 기존 `sellers`, `service_requests`, `sample_reports`, `b2b_subscribers`, IP·스토어·주문 테이블을 변경하거나 삭제하지 않는다. 제조 프로젝트의 신규 업무 흐름을 별도 데이터 영역으로 추가하고, 기존 서비스 요청 또는 승인 바이어 신상품의 참조 연결만 허용한다.

| 객체 | 역할 | 데이터 보존·격리 원칙 |
|---|---|---|
| `manufacturing_projects` | 바이어 제품 요청의 프로젝트 마스터 | 바이어·담당 운영자·배정 공장 외 접근 금지 |
| `manufacturing_project_briefs` | 제품 기획·수량·사양·요구사항 버전 | 접수 후 원본 보존, 보완은 새 버전·이력으로 관리 |
| `manufacturing_project_stages` | 접수부터 출하까지의 단계 | DB 상태 전이 함수만 변경 가능 |
| `manufacturing_sample_rounds` | 개발·수정·골든샘플 회차 | 바이어 공개 안내와 내부 작업 자료 분리 |
| `manufacturing_project_approvals` | 샘플·견적·골든샘플·양산·QC·출하 승인 | 바이어 결정은 불변 이력으로 기록 |
| `manufacturing_quote_snapshots` | 바이어 공개 견적 버전 | 공개 총액·항목만 저장, 공장원가·내부마진 제외 |
| `manufacturing_project_files` | 기획·샘플·QC·출하 파일 메타데이터 | 파일은 비공개 버킷, 서명 URL만 제공 |
| `manufacturing_project_events` | 프로젝트 상태·작업 이력 | 주요 이벤트를 추가 전용으로 기록 |

## 2. 권한·상태 전이 기준

`keryx_transition_manufacturing_project`는 프로젝트 상태를 단일 상태 머신으로 전환한다. 바이어는 자기 프로젝트의 `draft → submitted` 접수만 가능하며, 이후 기획·매칭·샘플·양산·QC·출하 전환은 관리자 또는 배정된 내부 담당자만 실행할 수 있다.

`keryx_decide_manufacturing_buyer_approval`은 바이어가 자기 프로젝트의 대기 중 승인 요청만 승인·보완 요청·반려할 수 있게 한다. 골든샘플, 양산 시작, QC 출하, 출하 확인 등 핵심 단계는 승인 레코드가 없는 상태에서 다음 단계로 진행할 수 없다.

`manufacturing-project-private` Storage 버킷은 기획·샘플·QC·출하 증빙 파일을 보관한다. 버킷은 공개 URL을 사용하지 않으며, 권한 검증을 통과한 서버 API가 단기 서명 URL만 발행한다.

## 3. 원문 SQL 복구 상태

수동 실행된 전체 SQL은 Production에서 성공 적용됐지만, 당시 로컬 작업 환경 초기화 과정에서 원문 마이그레이션 파일이 Git에 커밋되기 전에 손실됐다. Production 데이터나 권한은 손상되지 않았다. 이 대장은 실제 적용 객체와 서버 API 참조를 기준으로 작성했다.

원문 SQL은 향후 Production의 `pg_catalog` 및 `information_schema` 읽기 전용 추출이 정상화되면 `supabase/migrations/20260901_manufacturing_project_core.sql`로 복원한다. **복원 파일은 이미 존재하는 객체를 다시 만들거나 권한을 바꾸지 않는 이력 문서용 처리로만 커밋하며, Production 재실행 대상이 아니다.**

## 4. 연결 코드 기준

Production 코드에서 위 스키마를 사용하는 보호 API는 다음과 같다.

| 경로 | 사용 목적 | 권한 게이트 |
|---|---|---|
| `/api/buyer/projects` | 바이어 프로젝트 생성·목록 | 승인 바이어 확인 |
| `/api/buyer/projects/[projectId]` | 프로젝트룸 데이터 | 본인 프로젝트 |
| `/api/buyer/projects/[projectId]/submit` | 초안 접수 | 본인 초안 + 상태 함수 |
| `/api/buyer/projects/[projectId]/approvals/[approvalId]` | 바이어 승인 결정 | 본인 승인 요청 + 승인 함수 |
| `/api/buyer/projects/[projectId]/files` | 비공개 참고파일 | 본인 프로젝트 + 서명 URL |
| `/api/admin/manufacturing-projects` | 프로젝트 운영 대기열 | 관리자 인증 |
| `/api/admin/manufacturing-projects/[projectId]` | 담당자 배정·상태 전환 | 관리자 인증 + 상태 함수 |
| `/api/admin/manufacturing-projects/[projectId]/samples` | 샘플 회차 등록 | 관리자 인증 |
| `/api/admin/manufacturing-projects/[projectId]/approvals` | 바이어 승인 요청 | 관리자 인증 |
| `/api/admin/manufacturing-projects/[projectId]/quotes` | 바이어 공개 견적 스냅샷 | 관리자 인증, 원가·마진 차단 |

## 5. 운영 주의사항

이후 제조 기능 마이그레이션은 반드시 Git에 먼저 저장하고, Preview 검증·변경 영향 보고를 완료한 뒤 Production SQL Editor에서 실행한다. 파일·정책·함수·Cron·외부 API 또는 사이트맵의 변경은 이 대장과 운영 변경 보고서에 함께 기록한다.
