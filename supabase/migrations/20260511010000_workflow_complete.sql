-- ============================================================
-- KERYX 완전한 워크플로우 마이그레이션
-- 바이어 → MD → 공장 → 보고서 → 바이어 전체 흐름
-- ============================================================

-- 1. 통합 의뢰 상태 컬럼 확장 (unified_requests)
ALTER TABLE unified_requests
  ADD COLUMN IF NOT EXISTS assigned_md_id UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS md_note TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS report_url TEXT,
  ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMPTZ;

-- status 체크 제약 업데이트
ALTER TABLE unified_requests
  DROP CONSTRAINT IF EXISTS unified_requests_status_check;
ALTER TABLE unified_requests
  ADD CONSTRAINT unified_requests_status_check
  CHECK (status IN (
    'submitted',      -- 바이어 제출
    'reviewing',      -- 관리자 검토 중
    'assigned',       -- MD 배정 완료
    'md_working',     -- MD 작업 중 (공장 연락 포함)
    'factory_replied',-- 공장 답변 완료
    'report_ready',   -- 보고서 작성 완료
    'report_sent',    -- 바이어에게 발송 완료
    'completed',      -- 최종 완료
    'cancelled'       -- 취소
  ));

-- 2. 의뢰-공장 연락 기록 테이블
CREATE TABLE IF NOT EXISTS request_factory_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES unified_requests(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  md_id UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  -- 연락 내용
  contact_type TEXT NOT NULL DEFAULT 'inquiry'
    CHECK (contact_type IN ('inquiry', 'sample_request', 'price_check', 'follow_up')),
  md_message TEXT,           -- MD가 공장에 보낸 내용
  factory_reply TEXT,        -- 공장 답변
  factory_price_cny NUMERIC, -- 공장 제시 단가 (CNY)
  factory_moq INTEGER,       -- 최소 주문 수량
  factory_lead_days INTEGER, -- 납기 일수
  factory_sample_days INTEGER,-- 샘플 제작 일수
  attachments TEXT[] DEFAULT '{}', -- 첨부 파일 URL
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'replied', 'selected', 'rejected')),
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 의뢰 보고서 테이블 (MD가 작성, 관리자 승인, 바이어 열람)
CREATE TABLE IF NOT EXISTS request_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES unified_requests(id) ON DELETE CASCADE,
  md_id UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  -- 보고서 내용
  report_type TEXT NOT NULL DEFAULT 'factory_matching'
    CHECK (report_type IN ('factory_matching', 'market_research', 'inspection', 'sample')),
  title TEXT NOT NULL,
  summary TEXT,              -- 요약 (바이어에게 먼저 보이는 내용)
  -- 추천 공장 정보
  recommended_factories JSONB DEFAULT '[]', -- [{factory_id, name, score, reason, price_cny, moq, lead_days}]
  -- 시장 조사 결과
  market_data JSONB DEFAULT '{}',
  -- 검수 결과
  inspection_data JSONB DEFAULT '{}',
  -- 최종 권고사항
  recommendation TEXT,
  next_steps TEXT,
  -- 파일
  pdf_url TEXT,              -- 생성된 PDF URL
  attachments TEXT[] DEFAULT '{}',
  -- 상태
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'sent', 'viewed')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 알림 테이블 (포털별 실시간 알림)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 수신자
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('admin', 'md', 'factory', 'seller')),
  -- 알림 내용
  type TEXT NOT NULL CHECK (type IN (
    'new_request',          -- 새 의뢰 접수
    'request_assigned',     -- MD 배정
    'factory_contacted',    -- 공장 연락 발송
    'factory_replied',      -- 공장 답변 도착
    'report_submitted',     -- 보고서 제출
    'report_approved',      -- 보고서 승인
    'report_sent',          -- 보고서 발송
    'new_message',          -- 새 메시지
    'status_updated'        -- 상태 변경
  )),
  title TEXT NOT NULL,
  title_zh TEXT,
  body TEXT,
  body_zh TEXT,
  -- 연결 데이터
  related_id UUID,           -- request_id, report_id 등
  related_type TEXT,         -- 'request', 'report', 'message'
  action_url TEXT,           -- 클릭 시 이동할 URL
  -- 상태
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_factory_contacts_request ON request_factory_contacts(request_id);
CREATE INDEX IF NOT EXISTS idx_request_reports_request ON request_reports(request_id);
CREATE INDEX IF NOT EXISTS idx_unified_requests_seller ON unified_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_unified_requests_md ON unified_requests(assigned_md_id);
CREATE INDEX IF NOT EXISTS idx_unified_requests_status ON unified_requests(status);

-- 6. RLS 정책
ALTER TABLE request_factory_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 알림: 본인 알림만 조회 가능
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (recipient_user_id = auth.uid());

-- 보고서: MD/관리자는 모두 조회, 바이어는 sent/viewed 상태만
CREATE POLICY "reports_internal_all" ON request_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM internal_users WHERE user_id = auth.uid())
  );
CREATE POLICY "reports_seller_view" ON request_reports
  FOR SELECT USING (
    status IN ('sent', 'viewed') AND
    EXISTS (
      SELECT 1 FROM unified_requests ur
      JOIN sellers s ON s.user_id = auth.uid()
      WHERE ur.id = request_reports.request_id AND ur.seller_id = s.id
    )
  );

-- 공장 연락: MD/관리자만 조회
CREATE POLICY "factory_contacts_internal" ON request_factory_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM internal_users WHERE user_id = auth.uid())
  );

-- 7. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_request_factory_contacts_updated
  BEFORE UPDATE ON request_factory_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_request_reports_updated
  BEFORE UPDATE ON request_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_unified_requests_updated
  BEFORE UPDATE ON unified_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
