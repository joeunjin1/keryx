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

