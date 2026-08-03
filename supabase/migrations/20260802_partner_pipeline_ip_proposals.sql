-- ============================================================
-- KERYX 관리자 포털 확장: 파트너 파이프라인 + IP 제안 + 사업플랜
-- 작성일: 2026-08-02
-- ============================================================

-- ─── 1. partner_pipeline: 파트너 라이프사이클 관리 ───────────────
CREATE TABLE IF NOT EXISTS partner_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  -- seller_id가 null이면 아직 sellers 테이블에 없는 잠재 파트너
  business_name_override TEXT, -- seller_id 없을 때 사용
  contact_name_override TEXT,
  current_stage TEXT NOT NULL DEFAULT 'new_inquiry',
  -- 단계: new_inquiry, ip_proposal_prep, ip_proposal_sent, 
  --       plan_discussion, sample_dev, production, inspection_delivery, long_term
  assigned_md_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_md_name TEXT, -- 빠른 조회용 비정규화
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_order_amount_cny NUMERIC(12,2),
  ip_name TEXT, -- 제안된 IP 이름 (빠른 조회용)
  next_action TEXT,
  next_action_due DATE,
  notes TEXT,
  source TEXT DEFAULT 'manual', -- manual, landing, referral, exhibition
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_partner_pipeline_stage ON partner_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_partner_pipeline_seller ON partner_pipeline(seller_id);
CREATE INDEX IF NOT EXISTS idx_partner_pipeline_md ON partner_pipeline(assigned_md_id);

-- RLS 정책
ALTER TABLE partner_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to partner_pipeline"
  ON partner_pipeline FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'md')
    )
  );

-- ─── 2. ip_proposals: IP 제안 관리 ───────────────────────────────
CREATE TABLE IF NOT EXISTS ip_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  business_name_override TEXT, -- seller_id 없을 때 사용
  ip_character TEXT NOT NULL DEFAULT 'custom',
  -- IP 종류: puzzi (뿌찌프랜즈), duckle (덕클), dinomon (디노몬), custom
  ip_name TEXT NOT NULL,
  ip_character_id UUID, -- ip_characters 테이블 참조 (있는 경우)
  status TEXT NOT NULL DEFAULT 'preparing',
  -- 상태: preparing, sent, reviewing, accepted, rejected
  proposed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  proposed_by_name TEXT,
  proposal_document_url TEXT,
  proposed_products JSONB DEFAULT '[]'::jsonb,
  -- 예: ["인형", "가방고리", "키링"]
  seller_feedback TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ip_proposals_seller ON ip_proposals(seller_id);
CREATE INDEX IF NOT EXISTS idx_ip_proposals_status ON ip_proposals(status);
CREATE INDEX IF NOT EXISTS idx_ip_proposals_character ON ip_proposals(ip_character);

-- RLS 정책
ALTER TABLE ip_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/MD full access to ip_proposals"
  ON ip_proposals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'md')
    )
  );

-- 파트너(seller)는 자신에게 온 제안만 읽기 가능
CREATE POLICY "Seller can view own ip_proposals"
  ON ip_proposals FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- ─── 3. business_plans: 파트너별 장기 사업플랜 ───────────────────
CREATE TABLE IF NOT EXISTS business_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  pipeline_id UUID REFERENCES partner_pipeline(id) ON DELETE SET NULL,
  plan_title TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 6,
  start_date DATE,
  roadmap JSONB DEFAULT '[]'::jsonb,
  -- 예: [{"month": 1, "products": ["인형 A"], "qty": 1000, "amount_cny": 50000}, ...]
  total_estimated_cny NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'draft',
  -- 상태: draft, proposed, agreed, in_progress, completed, cancelled
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_business_plans_seller ON business_plans(seller_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_status ON business_plans(status);

-- RLS 정책
ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/MD full access to business_plans"
  ON business_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'md')
    )
  );

CREATE POLICY "Seller can view own business_plans"
  ON business_plans FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- ─── 4. updated_at 자동 갱신 트리거 ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- partner_pipeline
DROP TRIGGER IF EXISTS trg_partner_pipeline_updated_at ON partner_pipeline;
CREATE TRIGGER trg_partner_pipeline_updated_at
  BEFORE UPDATE ON partner_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ip_proposals
DROP TRIGGER IF EXISTS trg_ip_proposals_updated_at ON ip_proposals;
CREATE TRIGGER trg_ip_proposals_updated_at
  BEFORE UPDATE ON ip_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- business_plans
DROP TRIGGER IF EXISTS trg_business_plans_updated_at ON business_plans;
CREATE TRIGGER trg_business_plans_updated_at
  BEFORE UPDATE ON business_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
