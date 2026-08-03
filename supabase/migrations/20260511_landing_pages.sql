-- ============================================================
-- 랜딩 페이지 관리 테이블
-- 각 광고 랜딩 페이지의 설정 및 공장 매칭 정보 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS landing_pages (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            text NOT NULL UNIQUE,          -- URL 슬러그 (예: storage, travel)
  title_ko        text NOT NULL,                 -- 한국어 제목
  title_zh        text,                          -- 중국어 제목
  description_ko  text,                          -- 한국어 설명
  description_zh  text,                          -- 중국어 설명
  category        text,                          -- 카테고리 (수납용품, 여행캠핑 등)
  factory_ids     uuid[] DEFAULT '{}',           -- 매칭된 공장 ID 배열
  banner_image_url text,                         -- 배너 이미지 URL
  banner_title_ko text,                          -- 배너 타이틀 (한국어)
  banner_title_zh text,                          -- 배너 타이틀 (중국어)
  banner_subtitle_ko text,                       -- 배너 서브타이틀 (한국어)
  banner_subtitle_zh text,                       -- 배너 서브타이틀 (중국어)
  seo_title_ko    text,                          -- SEO 타이틀
  seo_desc_ko     text,                          -- SEO 설명
  keywords        text[],                        -- 검색 키워드 배열
  is_active       boolean NOT NULL DEFAULT true, -- 활성 여부
  view_count      integer DEFAULT 0,             -- 조회수
  inquiry_count   integer DEFAULT 0,             -- 문의수
  created_by      uuid REFERENCES auth.users(id),
  updated_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 랜딩 페이지 문의 테이블 (비회원 포함)
CREATE TABLE IF NOT EXISTS landing_page_inquiries (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id uuid REFERENCES landing_pages(id) ON DELETE SET NULL,
  landing_slug    text,                          -- 슬러그 스냅샷
  inquiry_type    text NOT NULL DEFAULT 'general', -- general | sample_request | quote
  -- 문의자 정보
  requester_name  text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  requester_company text,
  requester_country text DEFAULT '한국',
  -- 문의 내용
  subject         text,
  message         text NOT NULL,
  -- 샘플 요청 전용 필드
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot text,                   -- 상품명 스냅샷
  product_image_snapshot text,                  -- 상품 이미지 스냅샷
  reference_image_url text,                     -- 참고 이미지 (업로드)
  sample_quantity integer DEFAULT 1,
  target_price_cny numeric,                     -- 목표 가격
  target_moq      integer,                      -- 목표 MOQ
  -- 처리 정보
  status          text NOT NULL DEFAULT 'pending', -- pending | in_progress | replied | closed
  assigned_md_id  uuid REFERENCES auth.users(id),
  reply_message   text,                         -- 답변 내용
  reply_report_url text,                        -- 답변 보고서 URL
  replied_at      timestamptz,
  replied_by      uuid REFERENCES auth.users(id),
  -- 메타
  source_url      text,                         -- 유입 URL
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_active ON landing_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_landing_page_inquiries_landing_id ON landing_page_inquiries(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_inquiries_status ON landing_page_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_landing_page_inquiries_email ON landing_page_inquiries(requester_email);
CREATE INDEX IF NOT EXISTS idx_landing_page_inquiries_type ON landing_page_inquiries(inquiry_type);

-- RLS 정책
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_inquiries ENABLE ROW LEVEL SECURITY;

-- 랜딩 페이지: 공개 읽기 (활성 페이지만)
CREATE POLICY "landing_pages_public_read" ON landing_pages
  FOR SELECT USING (is_active = true);

-- 랜딩 페이지: 관리자/MD만 쓰기
CREATE POLICY "landing_pages_admin_write" ON landing_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'super_admin', 'md')
    )
  );

-- 문의: 누구나 INSERT (비회원 포함)
CREATE POLICY "landing_inquiries_public_insert" ON landing_page_inquiries
  FOR INSERT WITH CHECK (true);

-- 문의: 관리자/MD만 SELECT, UPDATE
CREATE POLICY "landing_inquiries_admin_read" ON landing_page_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'super_admin', 'md')
    )
  );

CREATE POLICY "landing_inquiries_admin_update" ON landing_page_inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'super_admin', 'md')
    )
  );

-- 기본 랜딩 페이지 데이터 삽입
INSERT INTO landing_pages (slug, title_ko, title_zh, description_ko, description_zh, category, banner_title_ko, banner_title_zh, banner_subtitle_ko, banner_subtitle_zh, keywords, is_active)
VALUES
  (
    'storage',
    '수납용품 전문 공장 직거래',
    '收纳用品专业工厂直销',
    '중국 최고의 수납용품 공장과 직접 연결하세요. 최소 주문량 협의 가능.',
    '直接与中国顶级收纳用品工厂对接，最小订购量可协商。',
    '수납용품',
    '수납용품 공장 직거래',
    '收纳用品工厂直销',
    '최고 품질 · 최저 가격 · 직접 연결',
    '最高品质 · 最低价格 · 直接对接',
    ARRAY['수납용품', '수납제품', '수납공장', '수납용품 생산', '수납용품 OEM', '收纳用品', '收纳盒'],
    true
  ),
  (
    'travel',
    '여행·캠핑 소품 공장 직거래',
    '旅行露营用品工厂直销',
    '여행, 캠핑, 아웃도어 소품 전문 중국 공장과 직접 연결하세요.',
    '直接与旅行、露营、户外用品专业中国工厂对接。',
    '여행캠핑',
    '여행·캠핑 소품 공장 직거래',
    '旅行露营用品工厂直销',
    '여행 · 캠핑 · 아웃도어 전문',
    '旅行 · 露营 · 户外专业',
    ARRAY['여행용품', '캠핑용품', '아웃도어', '여행소품', '캠핑소품', '旅行用品', '露营用品'],
    true
  )
ON CONFLICT (slug) DO NOTHING;
