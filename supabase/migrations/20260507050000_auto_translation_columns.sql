-- ============================================================
-- 자동 번역 컬럼 추가 마이그레이션
-- 생성일: 2026-05-07
-- 목적: 사용자 입력 데이터(서비스 신청, MD 답변 등)를 저장 시
--       자동으로 번역본(한국어↔중국어)을 함께 저장하기 위한 컬럼 추가
-- ============================================================

-- 1. service_requests 테이블에 번역 컬럼 추가
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS product_name_zh TEXT,      -- 상품명 중국어 번역
  ADD COLUMN IF NOT EXISTS description_zh TEXT,       -- 신청 내용 중국어 번역
  ADD COLUMN IF NOT EXISTS requirements_zh TEXT;      -- 요구사항 중국어 번역

-- 2. service_request_replies 테이블에 번역 컬럼 추가
ALTER TABLE service_request_replies
  ADD COLUMN IF NOT EXISTS content_zh TEXT,           -- 답변 내용 중국어 번역
  ADD COLUMN IF NOT EXISTS content_ko TEXT;           -- 답변 내용 한국어 번역 (중국어 사용자가 작성한 경우)

-- 3. products 테이블에 번역 컬럼 추가 (존재하는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS name_zh TEXT,          -- 상품명 중국어
      ADD COLUMN IF NOT EXISTS description_zh TEXT;   -- 상품 설명 중국어
  END IF;
END $$;

-- 4. 인덱스 추가 (번역 컬럼 검색 성능)
-- 번역 컬럼은 주로 읽기용이므로 인덱스 불필요

-- 5. 컬럼 추가 확인
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name IN ('service_requests', 'service_request_replies')
    AND column_name IN ('product_name_zh', 'description_zh', 'requirements_zh', 'content_zh', 'content_ko');
  
  RAISE NOTICE '번역 컬럼 추가 완료: % 개 컬럼', col_count;
END $$;
