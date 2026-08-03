-- ============================================================
-- 시장조사 보고서 테이블 (MVP)
-- MD가 작성하여 바이어에게 발송하는 보고서 데이터
-- ============================================================

-- 1. 보고서 메인 테이블
CREATE TABLE IF NOT EXISTS market_research_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no       text UNIQUE NOT NULL DEFAULT ('RPT-' || to_char(now(), 'YYYY-MM') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  request_id      uuid REFERENCES service_requests(id) ON DELETE SET NULL,
  assigned_md_id  uuid REFERENCES internal_users(id) ON DELETE SET NULL,

  -- 보고서 상태
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'sent')),

  -- 표지 정보
  report_title    text NOT NULL DEFAULT '',
  buyer_name      text NOT NULL DEFAULT '',
  buyer_company   text NOT NULL DEFAULT '',
  product_name    text NOT NULL DEFAULT '',
  issued_at       date,

  -- 섹션 1: 시장 현황 요약 (JSON)
  market_summary  jsonb DEFAULT '{
    "one_liner": "",
    "import_trend": "",
    "market_size": "",
    "gacha_ratio": "",
    "growth_rate": ""
  }'::jsonb,

  -- 섹션 2: 중국 산지 분포 (JSON 배열)
  regions         jsonb DEFAULT '[]'::jsonb,
  -- 예: [{"name":"이우(义乌)","share":45,"desc":"소형 완구 세계 최대 집산지"}]

  -- 섹션 3: 추천 공장 3곳 (JSON 배열)
  factories       jsonb DEFAULT '[]'::jsonb,
  -- 예: [{
  --   "rank":1, "name":"이우 소프트토이 공장", "name_zh":"义乌软玩具厂",
  --   "location":"저장성 이우시", "founded_year":2008,
  --   "employee_count":280, "monthly_capacity":"50만개/월", "years_in_business":15,
  --   "main_products":"소형 봉제인형, 캐릭터 굿즈",
  --   "certifications":["KC","CE","ISO 9001"],
  --   "kc_status":"보유",  -- 보유/신청중/없음
  --   "custom_ip":true,
  --   "moq":"300개", "price_300":"$2.5", "price_1000":"$2.1",
  --   "lead_time":"15일", "payment_terms":"T/T 30% 선금, 70% 선적 전",
  --   "verified":true, "photos":[]
  -- }]

  -- 섹션 4: 샘플 안내 (JSON 배열 - 공장별)
  sample_info     jsonb DEFAULT '[]'::jsonb,
  -- 예: [{"factory_rank":1,"production_days":7,"factory_cost":"","shipping_cost":"","total_cost":"","bulk_deduction":"50% 공제"}]

  -- 섹션 5: 리스크 체크 (JSON)
  risk_assessment jsonb DEFAULT '{
    "ip_risk": "",
    "customs_risk": "",
    "quality_risk": "",
    "delivery_risk": ""
  }'::jsonb,

  -- 섹션 6: 추천 상품 (JSON 배열)
  recommended_products jsonb DEFAULT '[]'::jsonb,
  -- 예: [{"name":"미니 봉제 키링","category":"봉제 소품","price_range":"$0.8~$1.2","moq":"500개","features":"5~8cm","reason":"물류비 절감","photo_url":""}]

  -- MD 내부 메모 (바이어에게 비공개)
  internal_memo   text DEFAULT '',

  -- 발송 이력
  sent_at         timestamptz,
  sent_to_email   text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_market_research_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_market_research_reports_updated_at ON market_research_reports;
CREATE TRIGGER trg_market_research_reports_updated_at
  BEFORE UPDATE ON market_research_reports
  FOR EACH ROW EXECUTE FUNCTION update_market_research_reports_updated_at();

-- 3. RLS 정책
ALTER TABLE market_research_reports ENABLE ROW LEVEL SECURITY;

-- MD/관리자: 전체 CRUD
CREATE POLICY "md_admin_full_access_reports"
  ON market_research_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md')
    )
  );

-- 바이어: published/sent 상태의 자신 보고서만 조회
CREATE POLICY "buyer_read_own_reports"
  ON market_research_reports
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'sent')
    AND EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = market_research_reports.request_id
        AND sr.user_id = auth.uid()
    )
  );

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_mrr_request_id ON market_research_reports(request_id);
CREATE INDEX IF NOT EXISTS idx_mrr_assigned_md ON market_research_reports(assigned_md_id);
CREATE INDEX IF NOT EXISTS idx_mrr_status ON market_research_reports(status);
CREATE INDEX IF NOT EXISTS idx_mrr_created_at ON market_research_reports(created_at DESC);
