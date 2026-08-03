-- service_requests 테이블 email 컬럼 NOT NULL 제약 해제
-- 이유: 신청 폼에서 이메일은 선택 입력 항목이나 DB에서 NOT NULL로 정의되어 INSERT 오류 발생
ALTER TABLE service_requests ALTER COLUMN email DROP NOT NULL;

-- phone 컬럼도 비로그인 사용자가 입력 안 할 수 있으므로 NULL 허용
ALTER TABLE service_requests ALTER COLUMN phone DROP NOT NULL;

-- contact_name 은 필수 유지 (프론트에서도 required)
