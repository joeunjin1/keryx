-- ================================================================
-- 보고서 발송 내역 테이블 (report_send_logs)
-- 목적: 모든 보고서 발송 기록을 추적하고 발송 관리 페이지에서 조회
-- ================================================================

CREATE TABLE IF NOT EXISTS report_send_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 발송 대상 보고서 (market_research_reports, sample_reports, factory_match_reports 등)
  report_type     text NOT NULL CHECK (report_type IN ('market_research', 'sample', 'factory_match', 'inspection')),
  report_id       uuid NOT NULL,
  -- 발송 관련 정보
  sent_by         uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  sent_by_name    text NOT NULL DEFAULT '',
  sent_to_email   text NOT NULL DEFAULT '',
  sent_to_name    text NOT NULL DEFAULT '',
  -- 바이어/셀러 연결
  seller_id       uuid REFERENCES sellers(id) ON DELETE SET NULL,
  service_request_id uuid REFERENCES service_requests(id) ON DELETE SET NULL,
  -- 발송 내용 요약
  report_title    text NOT NULL DEFAULT '',
  report_url      text NOT NULL DEFAULT '',  -- 바이어 열람 링크
  -- 발송 상태
  status          text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'failed')),
  opened_at       timestamptz,
  -- 메모
  memo            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE report_send_logs ENABLE ROW LEVEL SECURITY;

-- admin/md/inspector는 모두 조회 가능
CREATE POLICY "internal_can_read_send_logs" ON report_send_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND kind IN ('admin', 'md', 'inspector')
    )
  );

-- admin/md만 INSERT 가능
CREATE POLICY "internal_can_insert_send_logs" ON report_send_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND kind IN ('admin', 'md')
    )
  );

-- ================================================================
-- seller_notifications 테이블 (바이어 알림)
-- 목적: 바이어 포털에서 새 보고서 수신 알림 표시
-- ================================================================

CREATE TABLE IF NOT EXISTS seller_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  -- 알림 유형
  type            text NOT NULL CHECK (type IN ('report_received', 'reply_received', 'order_update', 'general')),
  title           text NOT NULL DEFAULT '',
  title_zh        text NOT NULL DEFAULT '',
  body            text NOT NULL DEFAULT '',
  body_zh         text NOT NULL DEFAULT '',
  -- 연결 링크
  link_url        text,
  -- 읽음 여부
  is_read         boolean NOT NULL DEFAULT false,
  read_at         timestamptz,
  -- 발신자
  sent_by_name    text NOT NULL DEFAULT 'KERYX',
  -- 관련 리소스
  related_id      uuid,
  related_type    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE seller_notifications ENABLE ROW LEVEL SECURITY;

-- 바이어 본인 알림만 조회
CREATE POLICY "seller_can_read_own_notifications" ON seller_notifications
  FOR SELECT USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- 바이어 본인 알림 읽음 처리
CREATE POLICY "seller_can_update_own_notifications" ON seller_notifications
  FOR UPDATE USING (
    seller_id IN (
      SELECT id FROM sellers WHERE user_id = auth.uid()
    )
  );

-- admin/md는 INSERT 가능 (service_role로 처리)
-- service_role은 RLS 우회하므로 별도 정책 불필요

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_report_send_logs_report_id ON report_send_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_send_logs_seller_id ON report_send_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_report_send_logs_created_at ON report_send_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller_id ON seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_is_read ON seller_notifications(seller_id, is_read);
