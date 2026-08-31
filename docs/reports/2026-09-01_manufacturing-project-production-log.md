# 제조 프로젝트 Production 배포 기록

- 기준 시각: 2026-08-31 GMT+9
- Pull Request #4: `feat/manufacturing-project-core` → `main`
- 병합 커밋: `7ff58384cdc4a3107e0589eb34563cdde83c9f49`
- 병합 결과: GitHub REST API에서 `merged: true` 확인.
- Vercel Production: `keryx-hlqqmj6jq-joeunjin1s-projects.vercel.app` 배포가 생성되어 빌드 진행 상태를 확인함.
- 다음 검증: Vercel Ready 전환 후 `www.keryx.kr`의 공개·바이어·관리자 경로, 로그인 보호, 역할 분리를 재점검.

## 검증 원칙

- 기존 IP, 스토어, 소매 주문, B2B 주문, 서비스 요청, 신상품 구독 데이터는 삭제·덮어쓰기하지 않는다.
- 실제 계정이나 실제 사업자·상품·견적·샘플 데이터를 임의로 생성하지 않는다.
- 바이어 프로젝트, 내부 비용·마진, 공장 제안, 승인·QC·출하 파일은 역할별 RLS와 비공개 파일 경로로만 검증한다.

## 역할별 UI 개선 Preview

2026-08-31 GMT+9에 기능 브랜치 `feat/manufacturing-role-ui`의 커밋 `6379657`에 대한 Vercel Preview가 **Ready** 상태로 완료된 것을 확인했다. Preview 주소는 `https://keryx-dkapyy1t8-joeunjin1s-projects.vercel.app`이며, 이 변경은 바이어 프로젝트룸의 공용 제조 단계 진행선과 역할별 UI 명세를 포함한다. Pull Request #5는 `main` 병합 전 검토용으로 생성했다.

## 2026-09-01 Phase 2 — 공장·QC·출하 실행 구조 적용

- **Production SQL 적용:** 대표이사가 `20260901_manufacturing_factory_qc_shipment_execution.sql` 수정본을 Supabase SQL Editor에서 직접 실행했고, `Success. No rows returned` 결과를 확인했다.
- **수정 이력:** 첫 실행은 `manufacturing_project_factory_assignments` 테이블 생성 전 해당 테이블을 참조하는 함수가 선언되어 실패했다. 전체 SQL이 트랜잭션으로 롤백된 것을 확인하고, 테이블 생성 후 함수 선언 순서로 수정한 뒤 재실행해 성공했다.
- **추가된 범위:** 공장 활성 배정, 공장 실행 업데이트, QC 보고·증빙, 선적·선적 서류 테이블과 RLS·제어 함수가 추가됐다. 기존 바이어, 공장, 서비스 요청, 주문, 상품, IP, 구독 데이터는 변경 또는 삭제하지 않았다.
- **다음 구현:** 기능 브랜치에서 공장 제조 프로젝트 실행 화면·진행 업데이트 API, 운영자 공장 배정·QC 증빙·선적 관리 API/UI, 바이어 프로젝트룸의 승인된 QC·선적 공개를 구현·검증한다.
- **비밀·외부 연동:** 새 외부 API, 결제 키, 알림 키 또는 환경변수 변경은 없다.


## 2026-08-31 Preview 후속 검증 — 역할별 제조실행 UI

- 브랜치: `feat/manufacturing-role-ui`
- 최신 커밋: `bdce6d7` (`feat: add manufacturing execution workspace and alerts`)
- Vercel Preview: `https://keryx-mdn60utis-joeunjin1s-projects.vercel.app`
- 관찰 시각: 2026-08-31 GMT+9
- 상태: Vercel Preview 목록에서 **Error**로 표시됨. 로컬 `npx tsc --noEmit` 및 `npm run build`는 통과했으므로 Vercel Build Log의 실제 실패 지점을 우선 확인해야 함.
- 비교 기준: 직전 `6379657` Preview는 Ready였음.

다음 조치: Build Log를 확인한 뒤 로그 근거가 있는 최소 수정만 수행한다. 추정에 의한 수정·Production 병합은 금지한다.

### 상태 정정

Vercel 배포 목록의 필터 화면은 최신 `bdce6d7` 배포를 Error로 표시했으나, 해당 배포의 상세 URL(`98mxdcjiissWPjXLM7vft8MHCaet`)에서 최종 상태는 **Ready / Latest / Preview**로 확인됐다. Build Duration은 2분 4초였고, 오류에 근거한 코드 수정은 수행하지 않았다. 이후 검증은 이 상세 배포를 기준으로 진행한다.
