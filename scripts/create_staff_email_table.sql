-- ============================================================
-- 직원용 @keryx.kr 메일 주소 관리 테이블
-- ============================================================

-- 1. staff_email_addresses 테이블 생성
-- 각 직원(user_profiles)에게 @keryx.kr 메일 주소를 할당하는 테이블
CREATE TABLE IF NOT EXISTS staff_email_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,  -- 예: jo@keryx.kr, md1@keryx.kr
  display_name TEXT,                   -- 표시 이름 (한국어)
  display_name_zh TEXT,                -- 표시 이름 (중국어)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_staff_email_addresses_user_id ON staff_email_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_email_addresses_email ON staff_email_addresses(email_address);

-- 3. inbound_emails 테이블에 assigned_user_id 컬럼 추가
-- 수신된 이메일이 어느 직원에게 배달되었는지 추적
ALTER TABLE inbound_emails 
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_emails_assigned_user ON inbound_emails(assigned_user_id);

-- 4. RLS 활성화
ALTER TABLE staff_email_addresses ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 설정
-- 관리자는 모든 직원 메일 주소 조회/수정 가능
DROP POLICY IF EXISTS "admin_manage_staff_emails" ON staff_email_addresses;
CREATE POLICY "admin_manage_staff_emails"
  ON staff_email_addresses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'super_admin')
    )
  );

-- 직원 본인은 자신의 메일 주소 조회 가능
DROP POLICY IF EXISTS "staff_read_own_email" ON staff_email_addresses;
CREATE POLICY "staff_read_own_email"
  ON staff_email_addresses FOR SELECT
  USING (user_id = auth.uid());

-- 6. inbound_emails RLS: 직원은 자신에게 할당된 메일만 조회 가능
DROP POLICY IF EXISTS "staff_read_own_inbound_emails" ON inbound_emails;
CREATE POLICY "staff_read_own_inbound_emails"
  ON inbound_emails FOR SELECT
  USING (
    assigned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.kind IN ('admin', 'super_admin')
    )
  );

-- 7. 수신 이메일 자동 라우팅 함수
-- inbound_emails에 새 레코드 삽입 시 to_email 기준으로 assigned_user_id 자동 설정
CREATE OR REPLACE FUNCTION route_inbound_email()
RETURNS TRIGGER AS $$
BEGIN
  -- to_email과 일치하는 staff_email_addresses 찾기
  SELECT user_id INTO NEW.assigned_user_id
  FROM staff_email_addresses
  WHERE email_address = LOWER(NEW.to_email)
    AND is_active = true
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 트리거 생성
DROP TRIGGER IF EXISTS trigger_route_inbound_email ON inbound_emails;
CREATE TRIGGER trigger_route_inbound_email
  BEFORE INSERT ON inbound_emails
  FOR EACH ROW
  EXECUTE FUNCTION route_inbound_email();

-- 9. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_staff_email_updated_at ON staff_email_addresses;
CREATE TRIGGER trigger_staff_email_updated_at
  BEFORE UPDATE ON staff_email_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 완료 메시지
SELECT 'staff_email_addresses 테이블 및 라우팅 시스템 생성 완료' AS result;
