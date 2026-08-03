-- ============================================================
-- KERYX Factory Matching System - Full Schema
-- 2026-05-04
-- ============================================================

-- 1. ENUM 타입 추가 (없는 경우에만)
DO $$ BEGIN
  CREATE TYPE matching_status AS ENUM (
    'pending',       -- 신규 신청
    'reviewing',     -- 검토 중
    'matching',      -- 매칭 진행
    'sample',        -- 미팅·샘플
    'completed',     -- 매칭 완료
    'cancelled'      -- 취소
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE matching_priority AS ENUM ('price', 'quality', 'delivery', 'stability');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. factory_matching_requests 테이블 (4단계 폼 전체 데이터)
CREATE TABLE IF NOT EXISTS factory_matching_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 신청자 정보
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name        TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  wechat_id           TEXT,
  
  -- Step 1: 제품 정보
  product_desc        TEXT NOT NULL,
  product_category    TEXT,
  moq                 INTEGER,
  target_price        TEXT,
  need_package        BOOLEAN DEFAULT false,
  
  -- Step 2: 사업 정보
  business_type       TEXT,                        -- 판촉물, 1회성, 장기판매, 인형뽑기, 온라인셀러, 도매유통
  monthly_order_scale TEXT,                        -- 월 발주 규모
  target_markets      TEXT[] DEFAULT '{}',         -- 한국, 일본, 동남아, 북미, 유럽, 기타
  has_ip_license      BOOLEAN DEFAULT false,
  ip_license_name     TEXT,
  
  -- Step 3: 매칭 조건
  priority_price      INTEGER DEFAULT 25,          -- 가격 가중치 (합계 100)
  priority_quality    INTEGER DEFAULT 25,          -- 품질 가중치
  priority_delivery   INTEGER DEFAULT 25,          -- 납기 가중치
  priority_stability  INTEGER DEFAULT 25,          -- 안정성 가중치
  quality_grade       TEXT,                        -- 저가형, 중급, 프리미엄
  required_certs      TEXT[] DEFAULT '{}',         -- KC, CE, FDA, ICTI, BSCI, ISO
  need_ip_audit       BOOLEAN DEFAULT false,       -- IP 감수 경험 공장 필수 여부
  
  -- Step 4: 멤버십
  selected_tier       TEXT,                        -- Basic, Pro, Enterprise
  
  -- 관리자/MD 처리 정보
  status              matching_status DEFAULT 'pending',
  assigned_md_id      UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  is_urgent           BOOLEAN DEFAULT false,
  is_standby          BOOLEAN DEFAULT false,       -- 대기 초과 플래그
  admin_note          TEXT,
  md_note             TEXT,
  
  -- 매칭된 공장 목록 (JSON 배열)
  matched_factories   JSONB DEFAULT '[]',
  
  -- 타임스탬프
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. factory_matching_logs 테이블 (상태 변경 이력)
CREATE TABLE IF NOT EXISTS factory_matching_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES factory_matching_requests(id) ON DELETE CASCADE,
  actor_id        UUID,                            -- 처리한 사람 (internal_users.id)
  actor_name      TEXT,
  from_status     matching_status,
  to_status       matching_status,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. factory_matching_factories 테이블 (매칭된 공장 상세)
CREATE TABLE IF NOT EXISTS factory_matching_factories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES factory_matching_requests(id) ON DELETE CASCADE,
  factory_id      UUID REFERENCES factories(id) ON DELETE SET NULL,
  factory_name    TEXT,
  factory_city    TEXT,
  unit_price      TEXT,
  moq             INTEGER,
  lead_time_days  INTEGER,
  sample_cost     TEXT,
  rating          NUMERIC(3,1),
  specialties     TEXT[] DEFAULT '{}',
  certifications  TEXT[] DEFAULT '{}',
  has_ip_audit    BOOLEAN DEFAULT false,
  md_note         TEXT,
  ai_score        INTEGER,                         -- AI 매칭 점수
  is_recommended  BOOLEAN DEFAULT false,           -- MD 추천 여부
  buyer_visible   BOOLEAN DEFAULT false,           -- 바이어에게 공개 여부
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_factory_matching_requests_updated_at ON factory_matching_requests;
CREATE TRIGGER update_factory_matching_requests_updated_at
  BEFORE UPDATE ON factory_matching_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS 정책
ALTER TABLE factory_matching_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_matching_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_matching_factories ENABLE ROW LEVEL SECURITY;

-- 바이어: 자신의 신청만 조회
CREATE POLICY "buyer_select_own_matching" ON factory_matching_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "buyer_insert_matching" ON factory_matching_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 관리자/MD: 모든 신청 조회 및 수정
CREATE POLICY "admin_md_all_matching" ON factory_matching_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'md')
    )
  );

CREATE POLICY "admin_md_all_logs" ON factory_matching_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'md')
    )
  );

CREATE POLICY "admin_md_all_factories" ON factory_matching_factories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'md')
    )
  );

-- 바이어: buyer_visible=true인 공장만 조회
CREATE POLICY "buyer_select_visible_factories" ON factory_matching_factories
  FOR SELECT USING (
    buyer_visible = true AND
    EXISTS (
      SELECT 1 FROM factory_matching_requests
      WHERE factory_matching_requests.id = factory_matching_factories.request_id
      AND factory_matching_requests.user_id = auth.uid()
    )
  );

-- 7. 인덱스
CREATE INDEX IF NOT EXISTS idx_fmr_user_id ON factory_matching_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_fmr_status ON factory_matching_requests(status);
CREATE INDEX IF NOT EXISTS idx_fmr_assigned_md ON factory_matching_requests(assigned_md_id);
CREATE INDEX IF NOT EXISTS idx_fmr_created_at ON factory_matching_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fml_request_id ON factory_matching_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_fmf_request_id ON factory_matching_factories(request_id);
