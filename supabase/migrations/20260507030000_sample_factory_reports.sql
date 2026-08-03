-- ─────────────────────────────────────────────────────────────
-- 샘플제작 보고서 테이블
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no       TEXT UNIQUE NOT NULL DEFAULT ('SR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  request_id      UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','sent')),

  -- 기본 정보
  report_title    TEXT NOT NULL DEFAULT '',
  buyer_name      TEXT NOT NULL DEFAULT '',
  buyer_company   TEXT NOT NULL DEFAULT '',
  product_name    TEXT NOT NULL DEFAULT '',
  issued_at       DATE,
  cover_image     TEXT DEFAULT '',

  -- 샘플 사양
  spec            JSONB NOT NULL DEFAULT '{
    "item_name":"","material":"","size":"","color":"",
    "printing_method":"","packaging":"","special_notes":""
  }',

  -- 참고 이미지
  reference_photos JSONB NOT NULL DEFAULT '[]',

  -- 공장 견적 (최대 3곳)
  quotes          JSONB NOT NULL DEFAULT '[]',

  -- 품질 검수
  quality_check   JSONB NOT NULL DEFAULT '{
    "appearance":"","material_feel":"","printing":"","durability":"","overall":""
  }',

  -- 납기 일정 및 리스크
  delivery_timeline TEXT DEFAULT '',
  risk_notes      TEXT DEFAULT '',

  -- 추천 공장 인덱스 (0,1,2)
  recommended_quote_idx INTEGER DEFAULT 0,

  -- 내부 메모 (바이어 비공개)
  internal_memo   TEXT DEFAULT '',

  -- 발송 정보
  sent_at         TIMESTAMPTZ,
  sent_to_email   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_sample_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sample_reports_updated_at ON sample_reports;
CREATE TRIGGER trg_sample_reports_updated_at
  BEFORE UPDATE ON sample_reports
  FOR EACH ROW EXECUTE FUNCTION update_sample_reports_updated_at();

-- RLS
ALTER TABLE sample_reports ENABLE ROW LEVEL SECURITY;

-- MD/관리자: 전체 접근
CREATE POLICY "md_full_access_sample_reports" ON sample_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin','md','super_admin')
    )
  );

-- 바이어: published/sent 보고서만 열람
CREATE POLICY "buyer_view_sample_reports" ON sample_reports
  FOR SELECT USING (status IN ('published','sent'));

-- ─────────────────────────────────────────────────────────────
-- 공장매칭 보고서 테이블
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_match_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no       TEXT UNIQUE NOT NULL DEFAULT ('FM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  request_id      UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','sent')),

  -- 기본 정보
  report_title    TEXT NOT NULL DEFAULT '',
  buyer_name      TEXT NOT NULL DEFAULT '',
  buyer_company   TEXT NOT NULL DEFAULT '',
  product_name    TEXT NOT NULL DEFAULT '',
  issued_at       DATE,
  cover_image     TEXT DEFAULT '',

  -- 바이어 요구사항
  buyer_requirements JSONB NOT NULL DEFAULT '{
    "product_desc":"","target_price":"","target_moq":"",
    "required_certs":"","delivery_region":"","special_requirements":""
  }',

  -- 매칭 공장 (최대 3곳)
  factories       JSONB NOT NULL DEFAULT '[]',

  -- 비교 분석 및 다음 단계
  comparison_notes TEXT DEFAULT '',
  next_steps      TEXT DEFAULT '',
  risk_notes      TEXT DEFAULT '',

  -- 내부 메모 (바이어 비공개)
  internal_memo   TEXT DEFAULT '',

  -- 발송 정보
  sent_at         TIMESTAMPTZ,
  sent_to_email   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_factory_match_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_factory_match_reports_updated_at ON factory_match_reports;
CREATE TRIGGER trg_factory_match_reports_updated_at
  BEFORE UPDATE ON factory_match_reports
  FOR EACH ROW EXECUTE FUNCTION update_factory_match_reports_updated_at();

-- RLS
ALTER TABLE factory_match_reports ENABLE ROW LEVEL SECURITY;

-- MD/관리자: 전체 접근
CREATE POLICY "md_full_access_factory_match_reports" ON factory_match_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin','md','super_admin')
    )
  );

-- 바이어: published/sent 보고서만 열람
CREATE POLICY "buyer_view_factory_match_reports" ON factory_match_reports
  FOR SELECT USING (status IN ('published','sent'));
