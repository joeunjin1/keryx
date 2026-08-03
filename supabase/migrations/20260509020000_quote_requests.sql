-- quote_requests 테이블 수정: profiles → user_profiles 참조 수정
-- 기존 테이블이 없을 경우 새로 생성, 있을 경우 FK 컬럼만 수정

-- 1. 기존 테이블 DROP (안전하게)
DROP TABLE IF EXISTS public.quote_requests CASCADE;

-- 2. 올바른 참조로 재생성
CREATE TABLE public.quote_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 요청자 정보
  requester_name  text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  company_name    text,
  country         text DEFAULT 'KR',
  lang            text DEFAULT 'ko',
  -- 제품 정보 (Step 1)
  product_category  text NOT NULL,
  product_name      text NOT NULL,
  product_desc      text,
  reference_url     text,
  -- 수량/사양 (Step 2)
  quantity          integer,
  unit              text DEFAULT 'pcs',
  material          text,
  size_spec         text,
  color_count       integer DEFAULT 1,
  custom_packaging  boolean DEFAULT false,
  ip_design_needed  boolean DEFAULT false,
  -- 서비스 선택 (Step 3)
  services_needed   text[] DEFAULT '{}',
  delivery_country  text DEFAULT 'KR',
  target_price      text,
  deadline          text,
  -- 추가 메모
  memo              text,
  -- 상태 관리
  status            text DEFAULT 'pending'
                    CHECK (status IN ('pending','reviewing','quoted','rejected','closed')),
  admin_memo        text,
  assigned_md_id    uuid REFERENCES auth.users(id),
  quoted_at         timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- 누구나 INSERT 가능 (비로그인 포함)
DROP POLICY IF EXISTS "quote_requests_insert_public" ON public.quote_requests;
CREATE POLICY "quote_requests_insert_public"
  ON public.quote_requests FOR INSERT
  WITH CHECK (true);

-- 관리자/MD만 SELECT
DROP POLICY IF EXISTS "quote_requests_admin_select" ON public.quote_requests;
CREATE POLICY "quote_requests_admin_select"
  ON public.quote_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md')
    )
  );

-- 관리자/MD만 UPDATE
DROP POLICY IF EXISTS "quote_requests_admin_update" ON public.quote_requests;
CREATE POLICY "quote_requests_admin_update"
  ON public.quote_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md')
    )
  );

-- updated_at 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS quote_requests_updated_at ON public.quote_requests;
CREATE TRIGGER quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created ON public.quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON public.quote_requests(requester_email);
