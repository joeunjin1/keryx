-- ═══════════════════════════════════════════════════════════════
-- B2B 구독 시스템 (무료 주간 정보 발송)
-- ═══════════════════════════════════════════════════════════════

-- 1. b2b_subscribers 테이블
CREATE TABLE IF NOT EXISTS b2b_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT,
  business_number TEXT,             -- 사업자등록번호
  business_license_url TEXT,        -- 사업자등록증 파일 URL
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'unsubscribed')),
  rejection_reason TEXT,
  notes TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ            -- soft delete
);

-- 유니크 인덱스 (삭제되지 않은 이메일만)
CREATE UNIQUE INDEX IF NOT EXISTS idx_b2b_subscribers_email_active
  ON b2b_subscribers (email) WHERE deleted_at IS NULL;

-- 상태별 인덱스
CREATE INDEX IF NOT EXISTS idx_b2b_subscribers_status ON b2b_subscribers (status);

-- 2. b2b_weekly_reports 테이블 (발송 이력)
CREATE TABLE IF NOT EXISTS b2b_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  content_html TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. b2b_report_recipients 테이블 (개별 발송 기록)
CREATE TABLE IF NOT EXISTS b2b_report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES b2b_weekly_reports(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES b2b_subscribers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_report_recipients_report ON b2b_report_recipients (report_id);

-- 4. RLS 정책
ALTER TABLE b2b_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_report_recipients ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "admin_full_access_b2b_subscribers" ON b2b_subscribers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'marketing')
    )
  );

CREATE POLICY "admin_full_access_b2b_weekly_reports" ON b2b_weekly_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'marketing')
    )
  );

CREATE POLICY "admin_full_access_b2b_report_recipients" ON b2b_report_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'marketing')
    )
  );

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_b2b_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_b2b_subscribers_updated_at
  BEFORE UPDATE ON b2b_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_b2b_subscribers_updated_at();
