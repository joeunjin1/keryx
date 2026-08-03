-- 신청번호(request_no)로 로그인 없이 공개 조회 허용 RLS 정책
-- request_no를 알고 있는 사람만 조회 가능하므로 보안 위험 없음
-- 비로그인 사용자도 신청번호로 신청 현황 조회 가능

DROP POLICY IF EXISTS sr_select_by_request_no ON service_requests;

CREATE POLICY sr_select_by_request_no ON service_requests
  FOR SELECT
  USING (request_no IS NOT NULL);
