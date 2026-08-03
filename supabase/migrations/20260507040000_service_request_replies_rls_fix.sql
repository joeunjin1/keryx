-- ================================================================
-- service_request_replies RLS 정책 수정
-- 변경 이유: inspector 역할 추가 + 답변 조회 정책 보강
-- 작성일: 2026-05-07
-- ================================================================

-- 기존 INSERT 정책 교체 (admin, md, inspector 모두 허용)
DROP POLICY IF EXISTS "service_request_replies_insert_admin_md" ON service_request_replies;
CREATE POLICY "service_request_replies_insert_admin_md"
  ON service_request_replies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md', 'inspector')
    )
  );

-- SELECT 정책: 관리자/MD/inspector 전체 조회
DROP POLICY IF EXISTS "service_request_replies_select_admin_md" ON service_request_replies;
CREATE POLICY "service_request_replies_select_admin_md"
  ON service_request_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md', 'inspector')
    )
  );

-- SELECT 정책: 바이어 본인 신청 답변 조회 (system 타입 제외)
DROP POLICY IF EXISTS "service_request_replies_select_buyer" ON service_request_replies;
CREATE POLICY "service_request_replies_select_buyer"
  ON service_request_replies FOR SELECT
  USING (
    reply_type != 'system'
    AND EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = request_id
        AND (
          sr.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM sellers s
            WHERE s.id = sr.seller_id
              AND s.user_id = auth.uid()
          )
        )
    )
  );
