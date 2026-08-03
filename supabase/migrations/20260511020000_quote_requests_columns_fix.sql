-- quote_requests 테이블 누락 컬럼 추가
-- 폼에서 INSERT하는 컬럼 중 테이블에 없는 컬럼들을 추가합니다.

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS reference_image_url  text,
  ADD COLUMN IF NOT EXISTS desired_qty          text,
  ADD COLUMN IF NOT EXISTS desired_deadline      text,
  ADD COLUMN IF NOT EXISTS sales_country         text,
  ADD COLUMN IF NOT EXISTS cert_needed           text,
  ADD COLUMN IF NOT EXISTS budget_range          text,
  ADD COLUMN IF NOT EXISTS has_sample            text,
  ADD COLUMN IF NOT EXISTS contact_method        text;
