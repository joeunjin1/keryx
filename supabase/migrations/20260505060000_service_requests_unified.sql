-- ============================================================
-- 서비스 신청 통합 테이블 (시장조사 / 공장매칭 / 샘플개발)
-- 기존 market_research_requests, matching_requests 와 별도로
-- 랜딩 페이지 신규 신청 플로우 전용 테이블
-- ============================================================

-- 1. 통합 서비스 신청 테이블
CREATE TABLE IF NOT EXISTS service_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no      text UNIQUE NOT NULL DEFAULT ('SR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),

  -- 서비스 유형
  service_type    text NOT NULL CHECK (service_type IN ('market-research', 'factory-matching', 'sample-development')),

  -- 상태
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- 배정 MD (내부 사용자)
  assigned_md_id  uuid REFERENCES internal_users(id) ON DELETE SET NULL,

  -- ── 공통 상품 정보 ──────────────────────────────────────
  product_name    text,
  product_desc    text,
  product_images  text[] DEFAULT '{}',   -- Supabase Storage URL 배열

  -- ── 시장조사 전용 필드 ───────────────────────────────────
  md_request_note   text,                -- MD에게 시장조사 시 해주었으면 하는 내용
  wants_long_term   boolean,             -- 장기 거래 공장 원하는지
  has_sales_exp     boolean,             -- 판매 경험 유무
  priority          text CHECK (priority IN ('price', 'quality', 'delivery')),  -- 가격/품질/납기
  product_purpose   text CHECK (product_purpose IN ('sale', 'gift')),           -- 판매용/증정용
  wants_package     boolean,             -- 패키지 포장 여부
  wants_sample      boolean,             -- 샘플 필요 여부

  -- ── 공장매칭 전용 필드 ───────────────────────────────────
  business_purpose  text,                -- 원하는 사업 설명 (판촉물/1회성/장기 대리점)
  print_package     boolean,             -- 인쇄/패키지 필요 여부
  print_desc        text,                -- 인쇄/패키지 상세 설명
  factory_region    text,                -- 희망 공장 지역
  moq               text,                -- 희망 최소 주문 수량
  target_price      text,                -- 희망 단가

  -- ── 샘플개발 전용 필드 ───────────────────────────────────
  sample_qty        text,                -- 샘플 수량
  delivery_address  text,                -- 수령 주소
  design_notes      text,                -- 참고 디자인/색상 요청사항

  -- ── 바이어 정보 (2페이지) ────────────────────────────────
  company_name      text,
  contact_name      text NOT NULL,
  main_business     text,                -- 주요 사업
  phone             text NOT NULL,
  wechat_id         text,
  kakao_id          text,
  email             text NOT NULL,

  -- ── 연결 정보 ────────────────────────────────────────────
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- 로그인한 경우
  seller_id         uuid REFERENCES sellers(id) ON DELETE SET NULL,      -- 기존 셀러인 경우

  -- ── 메타 ─────────────────────────────────────────────────
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. 서비스 신청 답변 테이블 (MD/관리자 답변)
CREATE TABLE IF NOT EXISTS service_request_replies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,

  -- 작성자 (MD 또는 관리자)
  author_id       uuid REFERENCES internal_users(id) ON DELETE SET NULL,
  author_name     text,                  -- 스냅샷 (삭제 대비)

  -- 답변 내용
  content         text NOT NULL,
  attachments     text[] DEFAULT '{}',   -- 첨부 파일 URL

  -- 답변 유형
  reply_type      text NOT NULL DEFAULT 'md_reply'
                  CHECK (reply_type IN ('md_reply', 'admin_reply', 'system')),

  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_service_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON service_requests;
CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_service_requests_updated_at();

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_service_requests_status       ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_service_type ON service_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id      ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_seller_id    ON service_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_md  ON service_requests(assigned_md_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at   ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_request_replies_req   ON service_request_replies(request_id);

-- 5. RLS 활성화
ALTER TABLE service_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_replies  ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 - service_requests
-- 6-1. 누구나 INSERT 가능 (비회원 신청 허용)
DROP POLICY IF EXISTS "service_requests_insert_public" ON service_requests;
CREATE POLICY "service_requests_insert_public"
  ON service_requests FOR INSERT
  WITH CHECK (true);

-- 6-2. 본인 신청 조회 (로그인 사용자)
DROP POLICY IF EXISTS "service_requests_select_own" ON service_requests;
CREATE POLICY "service_requests_select_own"
  ON service_requests FOR SELECT
  USING (user_id = auth.uid());

-- 6-3. 관리자/MD 전체 조회
DROP POLICY IF EXISTS "service_requests_select_admin_md" ON service_requests;
CREATE POLICY "service_requests_select_admin_md"
  ON service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md')
    )
  );

-- 6-4. 신청번호로 공개 조회 허용 (비로그인 사용자도 신청번호 알면 조회 가능)
DROP POLICY IF EXISTS sr_select_by_request_no ON service_requests;
CREATE POLICY sr_select_by_request_no
  ON service_requests FOR SELECT
  USING (request_no IS NOT NULL);

-- 6-5. 관리자/MD 상태 업데이트
DROP POLICY IF EXISTS "service_requests_update_admin_md" ON service_requests;
CREATE POLICY "service_requests_update_admin_md"
  ON service_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md')
    )
  );

-- 7. RLS 정책 - service_request_replies
-- 7-1. 관리자/MD 답변 작성
DROP POLICY IF EXISTS "service_request_replies_insert_admin_md" ON service_request_replies;
CREATE POLICY "service_request_replies_insert_admin_md"
  ON service_request_replies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md')
    )
  );

-- 7-2. 본인 신청의 답변 조회 (바이어)
DROP POLICY IF EXISTS "service_request_replies_select_buyer" ON service_request_replies;
CREATE POLICY "service_request_replies_select_buyer"
  ON service_request_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = request_id
        AND sr.user_id = auth.uid()
    )
  );

-- 7-3. 관리자/MD 전체 답변 조회
DROP POLICY IF EXISTS "service_request_replies_select_admin_md" ON service_request_replies;
CREATE POLICY "service_request_replies_select_admin_md"
  ON service_request_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND kind IN ('admin', 'md')
    )
  );

-- 8. Storage 버킷 생성 (신청 이미지)
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-request-images', 'service-request-images', true)
ON CONFLICT (id) DO NOTHING;

-- 8-1. Storage 정책 - 누구나 업로드 가능
DROP POLICY IF EXISTS "service_request_images_upload" ON storage.objects;
CREATE POLICY "service_request_images_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'service-request-images');

-- 8-2. Storage 정책 - 누구나 조회 가능 (public)
DROP POLICY IF EXISTS "service_request_images_select" ON storage.objects;
CREATE POLICY "service_request_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-request-images');
