-- ============================================================
-- KERYX Factory Matching Advanced Schema
-- 바이어-공장-MD-관리자 완전한 데이터 기반 매칭 워크플로우
-- ============================================================

-- 1. factory_matching_requests 테이블 확장
--    (바이어의 상세 요구사항 + 다차원 가중치)
ALTER TABLE factory_matching_requests
  ADD COLUMN IF NOT EXISTS product_category    TEXT,
  ADD COLUMN IF NOT EXISTS target_qty          TEXT,
  ADD COLUMN IF NOT EXISTS target_price        TEXT,
  ADD COLUMN IF NOT EXISTS desired_delivery    TEXT,
  ADD COLUMN IF NOT EXISTS sales_country       TEXT,
  ADD COLUMN IF NOT EXISTS budget_range        TEXT,
  ADD COLUMN IF NOT EXISTS has_sample          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_method      TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS kakao_id            TEXT,
  -- 다차원 가중치 (1~5점, 합산 후 % 변환)
  ADD COLUMN IF NOT EXISTS weight_price        INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS weight_quality      INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS weight_delivery     INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS weight_stability    INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS weight_communication INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS weight_certification INTEGER DEFAULT 3,
  -- 품질 기준
  ADD COLUMN IF NOT EXISTS quality_standard    TEXT,       -- 저가형/중급/프리미엄
  ADD COLUMN IF NOT EXISTS defect_tolerance    TEXT,       -- 불량 허용 기준
  ADD COLUMN IF NOT EXISTS key_quality_points  TEXT[],     -- 핵심 품질 체크포인트
  -- 리스크 요인
  ADD COLUMN IF NOT EXISTS risk_factors        JSONB DEFAULT '[]',
  -- 사진 분류 (7개 카테고리)
  ADD COLUMN IF NOT EXISTS ref_images_product  TEXT[],     -- 제품 참고 사진
  ADD COLUMN IF NOT EXISTS ref_images_quality  TEXT[],     -- 품질 기준 사진
  ADD COLUMN IF NOT EXISTS ref_images_package  TEXT[],     -- 포장 참고 사진
  ADD COLUMN IF NOT EXISTS ref_images_sample   TEXT[],     -- 샘플 사진
  ADD COLUMN IF NOT EXISTS ref_images_competitor TEXT[],   -- 경쟁 제품 사진
  ADD COLUMN IF NOT EXISTS ref_images_factory  TEXT[],     -- 공장 참고 사진
  ADD COLUMN IF NOT EXISTS ref_images_other    TEXT[],     -- 기타 사진
  -- 최종 매칭 결론 (MD/관리자)
  ADD COLUMN IF NOT EXISTS final_factory_id    UUID REFERENCES factories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_factory_name  TEXT,
  ADD COLUMN IF NOT EXISTS final_conclusion    TEXT,       -- 최종 매칭 결론 텍스트
  ADD COLUMN IF NOT EXISTS final_action_plan   JSONB DEFAULT '[]',  -- 액션 플랜
  ADD COLUMN IF NOT EXISTS report_sent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_approved      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_approved_at   TIMESTAMPTZ;

-- 2. factory_matching_factories 테이블 확장
--    (공장의 구체적인 답변 + 다차원 평가)
ALTER TABLE factory_matching_factories
  ADD COLUMN IF NOT EXISTS factory_location    TEXT,       -- 도시/지역
  ADD COLUMN IF NOT EXISTS established_year    INTEGER,
  ADD COLUMN IF NOT EXISTS employee_count      INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_capacity    TEXT,       -- 월 생산량
  ADD COLUMN IF NOT EXISTS main_clients        TEXT,       -- 주요 거래처
  -- 견적 데이터 (수량별)
  ADD COLUMN IF NOT EXISTS quote_data          JSONB DEFAULT '[]',  -- [{qty, unit_price}]
  ADD COLUMN IF NOT EXISTS sample_cost         TEXT,
  ADD COLUMN IF NOT EXISTS sample_days         INTEGER,
  ADD COLUMN IF NOT EXISTS production_lead_days INTEGER,
  -- 품질 8축 점수 (MD 평가)
  ADD COLUMN IF NOT EXISTS quality_material    INTEGER,    -- 소재 품질 (1~10)
  ADD COLUMN IF NOT EXISTS quality_sewing      INTEGER,    -- 봉제/가공 품질
  ADD COLUMN IF NOT EXISTS quality_printing    INTEGER,    -- 인쇄/색상 품질
  ADD COLUMN IF NOT EXISTS quality_packaging   INTEGER,    -- 포장 품질
  ADD COLUMN IF NOT EXISTS quality_consistency INTEGER,    -- 품질 일관성
  ADD COLUMN IF NOT EXISTS quality_defect_rate INTEGER,    -- 불량률 관리
  ADD COLUMN IF NOT EXISTS quality_sample_match INTEGER,   -- 샘플 일치도
  ADD COLUMN IF NOT EXISTS quality_improvement INTEGER,    -- 개선 대응력
  -- 인증 데이터
  ADD COLUMN IF NOT EXISTS cert_business_reg   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_export_license BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_kc             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_ce             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_fda            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_en71           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_astm           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cert_material_sheet BOOLEAN DEFAULT false,
  -- 커뮤니케이션 평가 (MD 평가)
  ADD COLUMN IF NOT EXISTS comm_response_hours INTEGER,    -- 최초 응답 시간(시간)
  ADD COLUMN IF NOT EXISTS comm_quote_days     INTEGER,    -- 견적 제출 소요일
  ADD COLUMN IF NOT EXISTS comm_accuracy       INTEGER,    -- 답변 정확도 (1~10)
  ADD COLUMN IF NOT EXISTS comm_understanding  INTEGER,    -- 수정 이해도 (1~10)
  ADD COLUMN IF NOT EXISTS comm_photo_proactive INTEGER,   -- 사진 적극성 (1~10)
  ADD COLUMN IF NOT EXISTS comm_negotiation    INTEGER,    -- 협상 태도 (1~10)
  -- 리스크 평가 (MD 평가)
  ADD COLUMN IF NOT EXISTS risk_ip_protection  INTEGER,    -- IP 보호 수준 (1~10)
  ADD COLUMN IF NOT EXISTS risk_financial      INTEGER,    -- 재무 안정성 (1~10)
  ADD COLUMN IF NOT EXISTS risk_delivery       INTEGER,    -- 납기 준수율 (1~10)
  ADD COLUMN IF NOT EXISTS risk_quality_control INTEGER,   -- 품질 관리 체계 (1~10)
  ADD COLUMN IF NOT EXISTS risk_notes          TEXT,       -- 리스크 특이사항
  -- 종합 점수 (자동 계산)
  ADD COLUMN IF NOT EXISTS total_score         NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS score_breakdown     JSONB DEFAULT '{}',
  -- 공장 답변 상태
  ADD COLUMN IF NOT EXISTS factory_reply_status TEXT DEFAULT 'pending',  -- pending/replied/confirmed
  ADD COLUMN IF NOT EXISTS factory_reply_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS factory_images      TEXT[],     -- 공장 제출 사진
  ADD COLUMN IF NOT EXISTS factory_notes       TEXT;       -- 공장 특이사항

-- 3. factory_matching_factory_responses 테이블 신설
--    (공장이 직접 제출하는 답변 데이터)
CREATE TABLE IF NOT EXISTS factory_matching_factory_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES factory_matching_requests(id) ON DELETE CASCADE,
  factory_id      UUID REFERENCES factories(id) ON DELETE SET NULL,
  factory_name    TEXT NOT NULL,
  -- 공장 기본 정보
  location        TEXT,
  established_year INTEGER,
  employee_count  INTEGER,
  monthly_capacity TEXT,
  -- 견적 답변
  quote_500       TEXT,
  quote_1000      TEXT,
  quote_3000      TEXT,
  moq             INTEGER,
  sample_cost     TEXT,
  sample_days     INTEGER,
  lead_time_days  INTEGER,
  -- 인증 보유 여부
  has_kc          BOOLEAN DEFAULT false,
  has_ce          BOOLEAN DEFAULT false,
  has_fda         BOOLEAN DEFAULT false,
  has_en71        BOOLEAN DEFAULT false,
  has_ip_audit    BOOLEAN DEFAULT false,
  -- 공장 제출 사진
  factory_images  TEXT[],
  product_samples TEXT[],
  -- 공장 메모
  notes           TEXT,
  -- 상태
  status          TEXT DEFAULT 'submitted',
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. factory_matching_md_evaluations 테이블 신설
--    (MD의 공장별 다차원 평가 데이터)
CREATE TABLE IF NOT EXISTS factory_matching_md_evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES factory_matching_requests(id) ON DELETE CASCADE,
  factory_ref_id  UUID REFERENCES factory_matching_factories(id) ON DELETE CASCADE,
  md_id           UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  md_name         TEXT,
  -- 품질 8축 평가
  q_material      INTEGER CHECK (q_material BETWEEN 1 AND 10),
  q_sewing        INTEGER CHECK (q_sewing BETWEEN 1 AND 10),
  q_printing      INTEGER CHECK (q_printing BETWEEN 1 AND 10),
  q_packaging     INTEGER CHECK (q_packaging BETWEEN 1 AND 10),
  q_consistency   INTEGER CHECK (q_consistency BETWEEN 1 AND 10),
  q_defect_rate   INTEGER CHECK (q_defect_rate BETWEEN 1 AND 10),
  q_sample_match  INTEGER CHECK (q_sample_match BETWEEN 1 AND 10),
  q_improvement   INTEGER CHECK (q_improvement BETWEEN 1 AND 10),
  -- 커뮤니케이션 평가
  c_response_hours INTEGER,
  c_quote_days    INTEGER,
  c_accuracy      INTEGER CHECK (c_accuracy BETWEEN 1 AND 10),
  c_understanding INTEGER CHECK (c_understanding BETWEEN 1 AND 10),
  c_photo         INTEGER CHECK (c_photo BETWEEN 1 AND 10),
  c_negotiation   INTEGER CHECK (c_negotiation BETWEEN 1 AND 10),
  -- 리스크 평가
  r_ip_protection INTEGER CHECK (r_ip_protection BETWEEN 1 AND 10),
  r_financial     INTEGER CHECK (r_financial BETWEEN 1 AND 10),
  r_delivery      INTEGER CHECK (r_delivery BETWEEN 1 AND 10),
  r_quality_ctrl  INTEGER CHECK (r_quality_ctrl BETWEEN 1 AND 10),
  r_notes         TEXT,
  -- 종합 의견
  md_comment      TEXT,
  is_recommended  BOOLEAN DEFAULT false,
  recommendation_rank INTEGER,  -- 1=최우선, 2=차선, 3=대안
  -- 자동 계산 점수
  total_score     NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. factory_matching_final_reports 테이블 신설
--    (최종 매칭 보고서 - 바이어에게 전달)
CREATE TABLE IF NOT EXISTS factory_matching_final_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES factory_matching_requests(id) ON DELETE CASCADE,
  report_no       TEXT UNIQUE,                     -- KX-FM-2026-XXXX
  -- 보고서 내용 (12개 섹션)
  section_summary JSONB DEFAULT '{}',              -- 프로젝트 요약
  section_weights JSONB DEFAULT '{}',              -- 고객 요구사항 분석
  section_photos  JSONB DEFAULT '{}',              -- 사진 자료
  section_basics  JSONB DEFAULT '[]',              -- 후보 공장 기본 정보
  section_quotes  JSONB DEFAULT '[]',              -- 견적 비교표
  section_quality JSONB DEFAULT '[]',              -- 품질 비교 8축
  section_certs   JSONB DEFAULT '[]',              -- 인증 및 서류 검증
  section_comm    JSONB DEFAULT '[]',              -- 커뮤니케이션 평가
  section_risk    JSONB DEFAULT '[]',              -- 리스크 평가
  section_scores  JSONB DEFAULT '[]',              -- 종합 점수표
  section_final   JSONB DEFAULT '{}',              -- 최종 추천
  section_action  JSONB DEFAULT '[]',              -- 액션 플랜
  -- 메타
  created_by_md   UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  md_name         TEXT,
  version         TEXT DEFAULT 'Ver. 1.0',
  status          TEXT DEFAULT 'draft',            -- draft/sent/approved/rejected
  sent_at         TIMESTAMPTZ,
  buyer_viewed_at TIMESTAMPTZ,
  buyer_approved  BOOLEAN,
  buyer_comment   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS 정책 추가
ALTER TABLE factory_matching_factory_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_matching_md_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_matching_final_reports ENABLE ROW LEVEL SECURITY;

-- 관리자/MD: 모든 접근
CREATE POLICY "admin_md_factory_responses" ON factory_matching_factory_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin','md'))
  );

CREATE POLICY "admin_md_md_evaluations" ON factory_matching_md_evaluations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin','md'))
  );

CREATE POLICY "admin_md_final_reports" ON factory_matching_final_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin','md'))
  );

-- 바이어: 자신의 보고서만 조회 (sent 상태만)
CREATE POLICY "buyer_view_own_report" ON factory_matching_final_reports
  FOR SELECT USING (
    status IN ('sent','approved','rejected') AND
    EXISTS (
      SELECT 1 FROM factory_matching_requests
      WHERE id = factory_matching_final_reports.request_id
      AND user_id = auth.uid()
    )
  );

-- 바이어: 보고서 승인/거절 업데이트
CREATE POLICY "buyer_update_approval" ON factory_matching_final_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM factory_matching_requests
      WHERE id = factory_matching_final_reports.request_id
      AND user_id = auth.uid()
    )
  );

-- 7. 인덱스
CREATE INDEX IF NOT EXISTS idx_fmfr_request_id ON factory_matching_factory_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_fmme_request_id ON factory_matching_md_evaluations(request_id);
CREATE INDEX IF NOT EXISTS idx_fmfr2_request_id ON factory_matching_final_reports(request_id);
CREATE INDEX IF NOT EXISTS idx_fmfr2_status ON factory_matching_final_reports(status);

-- 8. updated_at 트리거
CREATE OR REPLACE TRIGGER update_fmme_updated_at
  BEFORE UPDATE ON factory_matching_md_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_fmfr_updated_at
  BEFORE UPDATE ON factory_matching_final_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
