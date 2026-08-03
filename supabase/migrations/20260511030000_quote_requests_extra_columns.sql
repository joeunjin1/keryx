-- quote_requests 테이블 누락 컬럼 추가
-- 폼에서 수집하는 추가 정보 컬럼들
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS reference_image_url  text,
  ADD COLUMN IF NOT EXISTS desired_qty          text,
  ADD COLUMN IF NOT EXISTS desired_deadline     text,
  ADD COLUMN IF NOT EXISTS sales_country        text,
  ADD COLUMN IF NOT EXISTS cert_needed          text,
  ADD COLUMN IF NOT EXISTS budget_range         text,
  ADD COLUMN IF NOT EXISTS has_sample           text,
  ADD COLUMN IF NOT EXISTS contact_method       text;

-- 인덱스 추가 (검색 성능)
CREATE INDEX IF NOT EXISTS idx_quote_requests_sales_country ON public.quote_requests(sales_country);
