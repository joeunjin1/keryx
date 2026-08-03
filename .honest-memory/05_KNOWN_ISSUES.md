# 05_KNOWN_ISSUES.md — 함정/실패 기록

## #1 Supabase RLS 정책 누락 (2026-05-11)

- **문제**: quote_requests 테이블에 anon INSERT 권한 없음
- **오류**: "42501: new row violates row-level security policy"
- **원인**: 마이그레이션에 RLS 정책 누락
- **해결**: 클라이언트 직접 INSERT → 서버 API 라우트(/api/quote/submit)로 변경, service_role 키 사용
- **다시는**: 공개 폼에서 클라이언트 직접 Supabase INSERT 금지. 반드시 서버 API 라우트 경유

## #2 Storage 버킷 미생성 (2026-05-11)

- **문제**: service-request-images 버킷이 없어 이미지 업로드 실패
- **해결**: /api/quote/upload-image API 라우트에서 버킷 자동 생성 로직 추가
- **다시는**: 이미지 업로드 API는 항상 버킷 존재 여부 확인 후 없으면 자동 생성

## #3 Supabase 로그인 CAPTCHA 차단 (2026-05-11)

- **문제**: Supabase 대시보드 로그인 시 hCaptcha 자동화 불가
- **해결**: 코드 레벨에서 처리 (service_role 키 활용)
- **다시는**: Supabase 대시보드 직접 접근 필요 시 보스님 직접 로그인 요청

## #4 Supabase 로그인 이메일 형식 오류 (2026-05-11)

- **문제**: Supabase 계정 이메일이 gjtrade@naver.com (KERYX 사이트 계정과 다름)
- **KERYX 사이트 관리자**: jo@keryx.kr / Keryx1234!
- **Supabase 대시보드**: gjtrade@naver.com / 15448932jo@@$$
- **다시는**: 두 계정 혼동 금지

## #5 quote/page.tsx 폼 제출 - 없는 컬럼 INSERT 시도 (2026-05-11)

- **문제**: DB에 없는 컬럼(desired_qty 등 8개)을 직접 INSERT 시도
- **해결**: 서버 API 라우트(/api/quote/submit)에서 처리, 없는 컬럼은 memo JSON에 병합
- **다시는**: 폼 필드 추가 시 반드시 마이그레이션 파일 동시 작성

## #6 KERYX 사이트 로그인 실패 (2026-05-11)

- **문제**: jo@keryx.kr / Keryx1234! 로 브라우저 로그인 시 "이메일 또는 비밀번호를 확인해 주세요" 오류
- **원인**: [추측] Supabase Auth에 해당 계정이 없거나 비밀번호 불일치
- **상태**: 미해결 - 보스님 확인 필요
- **다시는**: 테스트 전 관리자 계정 유효성 먼저 확인
