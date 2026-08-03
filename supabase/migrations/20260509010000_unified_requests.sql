-- 통합 의뢰서 시스템 테이블 생성
-- 공장 매칭 & 시장조사 통합 의뢰서

CREATE TABLE IF NOT EXISTS unified_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no TEXT UNIQUE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  -- 1단계: 의뢰인 정보
  company_name TEXT,
  representative TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  kakao_id TEXT,
  -- 2단계: 사업 정보
  business_stage TEXT,
  revenue_scale TEXT,
  main_channels TEXT[],
  current_challenges TEXT,
  -- 3단계: 의뢰 일반 사항
  product_category TEXT,
  expected_order_qty TEXT,
  priority_research TEXT,
  -- 5단계: 추가 사항
  factory_requirements TEXT,
  preferred_factory TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4단계: 파일럿 품목 등록
CREATE TABLE IF NOT EXISTS unified_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES unified_requests(id) ON DELETE CASCADE,
  product_name TEXT,
  category TEXT,
  description TEXT,
  reference_url TEXT,
  target_price TEXT,
  target_qty TEXT,
  photo_urls TEXT[],
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보고서 (MD가 작성)
CREATE TABLE IF NOT EXISTS unified_request_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES unified_requests(id) ON DELETE CASCADE,
  md_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT,
  recommendation TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보고서 내 공장 데이터 (여러 공장 비교)
CREATE TABLE IF NOT EXISTS unified_request_report_factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES unified_request_reports(id) ON DELETE CASCADE,
  factory_id UUID,
  factory_name TEXT,
  factory_name_ko TEXT,
  location TEXT,
  unit_price TEXT,
  moq TEXT,
  lead_time TEXT,
  certifications TEXT[],
  strengths TEXT,
  weaknesses TEXT,
  sample_available BOOLEAN DEFAULT false,
  photo_urls TEXT[],
  rating INT CHECK (rating >= 1 AND rating <= 5),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE unified_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_request_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_request_report_factories ENABLE ROW LEVEL SECURITY;

-- RLS 정책: service_role은 모든 접근 허용 (API route에서 사용)
-- 바이어는 자신의 의뢰만 조회
CREATE POLICY "sellers_read_own_requests" ON unified_requests
  FOR SELECT USING (seller_id = auth.uid());

-- 보고서는 해당 의뢰의 바이어가 조회 가능
CREATE POLICY "sellers_read_own_reports" ON unified_request_reports
  FOR SELECT USING (
    request_id IN (SELECT id FROM unified_requests WHERE seller_id = auth.uid())
  );

CREATE POLICY "sellers_read_own_report_factories" ON unified_request_report_factories
  FOR SELECT USING (
    report_id IN (
      SELECT r.id FROM unified_request_reports r
      JOIN unified_requests req ON req.id = r.request_id
      WHERE req.seller_id = auth.uid()
    )
  );

CREATE POLICY "sellers_read_own_items" ON unified_request_items
  FOR SELECT USING (
    request_id IN (SELECT id FROM unified_requests WHERE seller_id = auth.uid())
  );
