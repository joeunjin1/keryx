-- ============================================================
-- KERYX 전체 시나리오 실행을 위한 추가 스키마
-- 2026-05-06 - 바이어→서비스신청→MD배정→공장→상품→주문 전체 흐름
-- ============================================================

-- 1. service_requests 테이블에 누락 컬럼 추가
-- 바이어 입장에서 필요한 추가 필드들
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS budget_range        text,           -- 예산 범위 (예: 1000만원~3000만원)
  ADD COLUMN IF NOT EXISTS quantity_needed     text,           -- 필요 수량
  ADD COLUMN IF NOT EXISTS target_market       text,           -- 목표 시장 (국내/해외/온라인)
  ADD COLUMN IF NOT EXISTS desired_timeline    text,           -- 희망 일정
  ADD COLUMN IF NOT EXISTS reference_urls      text[],         -- 참고 URL 배열
  ADD COLUMN IF NOT EXISTS special_requirements text,          -- 특별 요구사항
  ADD COLUMN IF NOT EXISTS existing_supplier   boolean DEFAULT false, -- 기존 공급처 있는지
  ADD COLUMN IF NOT EXISTS annual_order_volume text,           -- 연간 발주 규모
  ADD COLUMN IF NOT EXISTS product_category    text,           -- 상품 카테고리
  ADD COLUMN IF NOT EXISTS material_preference text,           -- 소재 선호도
  ADD COLUMN IF NOT EXISTS eco_friendly        boolean DEFAULT false, -- 친환경 여부
  ADD COLUMN IF NOT EXISTS certification_needed text[],        -- 필요 인증 (KC, CE 등)
  ADD COLUMN IF NOT EXISTS md_note             text,           -- MD 내부 메모
  ADD COLUMN IF NOT EXISTS admin_note          text,           -- 관리자 메모
  ADD COLUMN IF NOT EXISTS completed_at        timestamptz;    -- 완료 일시

-- 2. MD 보고서 테이블 (신규)
CREATE TABLE IF NOT EXISTS md_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no       text UNIQUE NOT NULL DEFAULT ('RPT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  -- 연결 정보
  service_request_id  uuid REFERENCES service_requests(id) ON DELETE SET NULL,
  md_id               uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  seller_id           uuid REFERENCES sellers(id) ON DELETE SET NULL,
  factory_id          uuid,   -- factories 테이블 참조 (FK 없이)
  -- 보고서 기본 정보
  report_type     text NOT NULL CHECK (report_type IN ('market-research', 'factory-matching', 'sample-development', 'combined')),
  title           text NOT NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  -- 시장조사 내용
  market_overview     text,   -- 시장 현황
  competitor_analysis text,   -- 경쟁사 분석
  price_analysis      text,   -- 가격 분석
  trend_analysis      text,   -- 트렌드 분석
  market_recommendation text, -- 시장 진입 추천 의견
  -- 공장매칭 내용
  factory_name        text,   -- 매칭된 공장명
  factory_location    text,   -- 공장 위치
  factory_capacity    text,   -- 생산 능력
  factory_strength    text,   -- 공장 강점
  factory_weakness    text,   -- 공장 약점
  factory_moq         text,   -- 공장 최소 주문량
  factory_lead_time   text,   -- 납기
  factory_price_range text,   -- 가격대
  -- 샘플개발 내용
  sample_schedule     jsonb DEFAULT '[]',  -- 샘플 개발 일정 (단계별)
  sample_cost         text,   -- 샘플 비용
  sample_delivery_date date,  -- 샘플 납기일
  development_notes   text,   -- 개발 특이사항
  -- 첨부 파일
  images              text[] DEFAULT '{}',
  documents           text[] DEFAULT '{}',
  -- 메타
  submitted_at    timestamptz,
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. 바이어-상품 연결 테이블 (MD가 상품을 바이어에게 연결)
CREATE TABLE IF NOT EXISTS buyer_product_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid REFERENCES sellers(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL,  -- products 테이블 참조
  factory_id      uuid,           -- 공장 참조
  linked_by_md_id uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  service_request_id uuid REFERENCES service_requests(id) ON DELETE SET NULL,
  -- 연결 정보
  note            text,           -- MD 메모
  is_recommended  boolean DEFAULT false,  -- MD 추천 여부
  is_visible      boolean DEFAULT true,   -- 바이어에게 노출 여부
  -- 메타
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, product_id)
);

-- 4. orders 테이블에 누락 컬럼 추가 (buyer_product_links 연동)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS buyer_product_link_id uuid REFERENCES buyer_product_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_note            text,   -- 주문 메모
  ADD COLUMN IF NOT EXISTS shipping_address      text,   -- 배송 주소
  ADD COLUMN IF NOT EXISTS contact_phone         text,   -- 연락처
  ADD COLUMN IF NOT EXISTS desired_delivery_date date;   -- 희망 납기일

-- 5. RLS 정책 설정
ALTER TABLE md_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_product_links ENABLE ROW LEVEL SECURITY;

-- md_reports: MD/관리자는 전체 조회, 셀러는 자신의 것만 조회
DROP POLICY IF EXISTS "md_reports_select_admin_md" ON md_reports;
CREATE POLICY "md_reports_select_admin_md"
  ON md_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'md')
    )
  );

DROP POLICY IF EXISTS "md_reports_select_seller" ON md_reports;
CREATE POLICY "md_reports_select_seller"
  ON md_reports FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE shared_login_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "md_reports_insert_md" ON md_reports;
CREATE POLICY "md_reports_insert_md"
  ON md_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'md')
    )
  );

DROP POLICY IF EXISTS "md_reports_update_md" ON md_reports;
CREATE POLICY "md_reports_update_md"
  ON md_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'md')
    )
  );

-- buyer_product_links: MD/관리자 전체, 셀러는 자신의 것만
DROP POLICY IF EXISTS "buyer_product_links_select_admin_md" ON buyer_product_links;
CREATE POLICY "buyer_product_links_select_admin_md"
  ON buyer_product_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'md')
    )
  );

DROP POLICY IF EXISTS "buyer_product_links_select_seller" ON buyer_product_links;
CREATE POLICY "buyer_product_links_select_seller"
  ON buyer_product_links FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE shared_login_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "buyer_product_links_insert_md" ON buyer_product_links;
CREATE POLICY "buyer_product_links_insert_md"
  ON buyer_product_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'md')
    )
  );

DROP POLICY IF EXISTS "buyer_product_links_update_md" ON buyer_product_links;
CREATE POLICY "buyer_product_links_update_md"
  ON buyer_product_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'md')
    )
  );

-- 6. 트리거 - md_reports updated_at
CREATE OR REPLACE FUNCTION update_md_reports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_md_reports_updated_at ON md_reports;
CREATE TRIGGER trg_md_reports_updated_at
  BEFORE UPDATE ON md_reports
  FOR EACH ROW EXECUTE FUNCTION update_md_reports_updated_at();

-- 7. 인덱스
CREATE INDEX IF NOT EXISTS idx_md_reports_service_request ON md_reports(service_request_id);
CREATE INDEX IF NOT EXISTS idx_md_reports_md_id ON md_reports(md_id);
CREATE INDEX IF NOT EXISTS idx_md_reports_seller_id ON md_reports(seller_id);
CREATE INDEX IF NOT EXISTS idx_buyer_product_links_seller ON buyer_product_links(seller_id);
CREATE INDEX IF NOT EXISTS idx_buyer_product_links_product ON buyer_product_links(product_id);
