-- ============================================================
-- 공장 매칭 보고서 (factory_match_reports)
-- 관리자/MD가 바이어에게 발송하는 공장 매칭 보고서 템플릿
-- ============================================================

-- 공장 매칭 보고서 메인 테이블
CREATE TABLE IF NOT EXISTS factory_match_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 작성자 정보
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_role TEXT DEFAULT 'admin', -- 'admin' | 'md'
  
  -- 바이어(셀러) 정보
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  
  -- 보고서 기본 정보
  title TEXT NOT NULL,                    -- 보고서 제목
  inquiry_summary TEXT,                   -- 문의 내용 요약
  service_request_id UUID,               -- 연결된 서비스 요청 ID (선택)
  
  -- 보고서 상태
  status TEXT DEFAULT 'draft'            -- 'draft' | 'sent' | 'viewed'
    CHECK (status IN ('draft', 'sent', 'viewed')),
  
  -- 발송 정보
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  
  -- 바이어 열람 정보
  viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  
  -- 메모
  internal_memo TEXT,                    -- 내부 메모 (바이어에게 미표시)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공장 매칭 보고서 내 공장 항목 (1:N)
CREATE TABLE IF NOT EXISTS factory_match_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES factory_match_reports(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  
  -- 공장 기본 정보
  factory_id UUID REFERENCES factories(id) ON DELETE SET NULL,  -- 기존 공장 연결 (선택)
  factory_name_ko TEXT NOT NULL,          -- 공장명 (한국어)
  factory_name_zh TEXT,                   -- 공장명 (중국어)
  factory_location TEXT,                  -- 공장 위치 (예: 광저우, 이우)
  factory_established_year INTEGER,       -- 설립연도
  factory_employees INTEGER,              -- 직원 수
  factory_area_sqm INTEGER,              -- 공장 면적 (㎡)
  factory_certifications TEXT[],          -- 인증 목록 (ISO, BSCI 등)
  
  -- 생산 능력
  production_capacity TEXT,              -- 생산 능력 (예: 월 50만개)
  lead_time_days INTEGER,                -- 리드타임 (일)
  min_order_qty INTEGER,                 -- 최소 주문 수량 (MOQ)
  
  -- 개발 능력
  development_capability TEXT,           -- 개발 능력 설명
  oem_odm TEXT,                         -- OEM/ODM 가능 여부 및 설명
  
  -- 품질 관리
  quality_control TEXT,                  -- 품질 관리 방법
  defect_rate TEXT,                      -- 불량률
  
  -- 공장 소개 (자유 입력)
  factory_intro TEXT,                    -- 공장 소개 (자유 작성)
  
  -- 공장 사진 (JSONB 배열)
  -- [{ "url": "...", "title": "공장 전경", "category": "factory" }]
  factory_photos JSONB DEFAULT '[]'::jsonb,
  
  -- 설비 사진
  equipment_photos JSONB DEFAULT '[]'::jsonb,
  
  -- 제품 목록 (JSONB 배열)
  -- [{ "name_ko": "...", "name_zh": "...", "price": 10.5, "moq": 500,
  --    "lead_time": 25, "weight": "200g", "size": "10x10cm",
  --    "options": "색상: 5종, 포장: OPP/선물박스",
  --    "photos": [{"url": "...", "title": "..."}],
  --    "memo": "..." }]
  products JSONB DEFAULT '[]'::jsonb,
  
  -- 추천 여부
  is_recommended BOOLEAN DEFAULT false,
  recommendation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 이메일/문자 발송 로그
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 발송 대상
  target_type TEXT NOT NULL,             -- 'factory_match_report' | 'inspection_report' | 'sample_report' | 'general'
  target_id UUID,                        -- 관련 보고서 ID
  
  -- 수신자 정보
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- 발송 정보
  channel TEXT NOT NULL                  -- 'email' | 'sms'
    CHECK (channel IN ('email', 'sms')),
  subject TEXT,                          -- 이메일 제목
  message_preview TEXT,                  -- 메시지 미리보기 (앞 100자)
  
  -- 발송 결과
  status TEXT DEFAULT 'pending'          -- 'pending' | 'sent' | 'failed'
    CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  
  -- 발송자
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE factory_match_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_match_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 관리자/MD: 전체 접근
CREATE POLICY "admin_md_full_access_factory_match_reports"
  ON factory_match_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'md', 'staff')
    )
  );

-- 바이어: 자신에게 발송된 보고서만 조회
CREATE POLICY "seller_view_own_factory_match_reports"
  ON factory_match_reports FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
    AND status IN ('sent', 'viewed')
  );

-- 보고서 항목: 관리자/MD 전체 접근
CREATE POLICY "admin_md_full_access_factory_match_report_items"
  ON factory_match_report_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'md', 'staff')
    )
  );

-- 바이어: 자신의 보고서 항목 조회
CREATE POLICY "seller_view_own_factory_match_report_items"
  ON factory_match_report_items FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM factory_match_reports
      WHERE seller_id IN (
        SELECT id FROM sellers WHERE user_id = auth.uid()
      )
      AND status IN ('sent', 'viewed')
    )
  );

-- 알림 로그: 관리자/MD만 접근
CREATE POLICY "admin_md_full_access_notification_logs"
  ON notification_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'md', 'staff')
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_factory_match_reports_seller_id ON factory_match_reports(seller_id);
CREATE INDEX IF NOT EXISTS idx_factory_match_reports_status ON factory_match_reports(status);
CREATE INDEX IF NOT EXISTS idx_factory_match_reports_created_by ON factory_match_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_factory_match_report_items_report_id ON factory_match_report_items(report_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_target ON notification_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_by ON notification_logs(sent_by);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_factory_match_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_factory_match_reports_updated_at
  BEFORE UPDATE ON factory_match_reports
  FOR EACH ROW EXECUTE FUNCTION update_factory_match_reports_updated_at();

CREATE TRIGGER trigger_factory_match_report_items_updated_at
  BEFORE UPDATE ON factory_match_report_items
  FOR EACH ROW EXECUTE FUNCTION update_factory_match_reports_updated_at();
