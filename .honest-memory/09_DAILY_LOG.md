# 09_DAILY_LOG.md — 일일 작업 로그

## 2026-05-11

### 오전

파이프라인 API 라우트 3개 생성 (검수완료, 운송생성, 청구서). 셀러 카탈로그 주문하기 버튼 추가. 대시보드 파이프라인 상태 표시 추가. TypeScript 빌드 오류 수정 후 GitHub push.

### 오후

견적 폼 제출 오류(提交时发生错误) 원인 파악: RLS 정책 누락 + Storage 버킷 미생성. 서버 API 라우트(/api/quote/submit, /api/quote/upload-image) 생성으로 해결. 실제 테스트에서 성공 확인.

### 저녁

상품 승인 워크플로우 구현: MD 검토 페이지 엑셀 스타일 리빌드, 관리자 승인 페이지 md_approved 탭 추가, /shop approval_status 필터 추가. DB 마이그레이션 파일 작성. GitHub push 완료.

관리자/MD 포털 공장 계정 생성 기능 테스트 시작. 관리자 계정 로그인 실패 (KNOWN_ISSUES #6). Supabase anon key 확인: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

honest-work-memory 메모리 파일 초기화 완료.
