-- ============================================================
-- KERYX 상품 DB 스키마 업그레이드 (쿠팡 수준 상품 정보)
-- 2026-05-04 작성
-- ============================================================

-- ── 1. factory_products 테이블 컬럼 추가 ──────────────────────

-- 기본 정보 확장
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS name_en            TEXT,
  ADD COLUMN IF NOT EXISTS brand_name         TEXT,
  ADD COLUMN IF NOT EXISTS origin_country     TEXT DEFAULT '중국',
  ADD COLUMN IF NOT EXISTS hs_code            TEXT,
  ADD COLUMN IF NOT EXISTS barcode            TEXT,
  ADD COLUMN IF NOT EXISTS product_tags       TEXT[] DEFAULT '{}';

-- 상세 설명 (한/중/영 다국어)
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS description_ko     TEXT,
  ADD COLUMN IF NOT EXISTS description_en     TEXT,
  ADD COLUMN IF NOT EXISTS detail_html_ko     TEXT,  -- 상세페이지 HTML (에디터)
  ADD COLUMN IF NOT EXISTS detail_html_zh     TEXT,
  ADD COLUMN IF NOT EXISTS key_features       JSONB DEFAULT '[]',  -- [{ko, zh}] 핵심 특징
  ADD COLUMN IF NOT EXISTS caution_ko         TEXT,  -- 주의사항
  ADD COLUMN IF NOT EXISTS caution_zh         TEXT;

-- 스펙 정보 확장
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS material_detail    TEXT,  -- 소재 상세 (예: ABS+PC 혼합)
  ADD COLUMN IF NOT EXISTS material_zh        TEXT,
  ADD COLUMN IF NOT EXISTS colors             TEXT[] DEFAULT '{}',  -- 가능 색상 목록
  ADD COLUMN IF NOT EXISTS sizes              TEXT[] DEFAULT '{}',  -- 가능 사이즈 목록
  ADD COLUMN IF NOT EXISTS print_methods      TEXT[] DEFAULT '{}',  -- 인쇄방식 (실크, UV, 레이저 등)
  ADD COLUMN IF NOT EXISTS packaging_type     TEXT,  -- 포장방식 (OPP봉투, 컬러박스 등)
  ADD COLUMN IF NOT EXISTS packaging_detail   TEXT,
  ADD COLUMN IF NOT EXISTS surface_treatment  TEXT,  -- 표면처리 (도금, 코팅 등)
  ADD COLUMN IF NOT EXISTS product_weight_g   NUMERIC,  -- 단품 무게 (g)
  ADD COLUMN IF NOT EXISTS product_size_cm    TEXT,  -- 단품 크기 (가로x세로x높이 cm)
  ADD COLUMN IF NOT EXISTS inner_box_pcs      INTEGER,  -- 내박스 입수
  ADD COLUMN IF NOT EXISTS outer_box_pcs      INTEGER;  -- 외박스 입수

-- 박스/물류 정보 (CBM 자동계산)
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS box_length_cm      NUMERIC,
  ADD COLUMN IF NOT EXISTS box_width_cm       NUMERIC,
  ADD COLUMN IF NOT EXISTS box_height_cm      NUMERIC;

-- CBM 자동계산 (박스 사이즈 입력 시 자동)
-- cbm_per_box = box_length_cm * box_width_cm * box_height_cm / 1000000
CREATE OR REPLACE FUNCTION public.calc_cbm_per_box()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.box_length_cm IS NOT NULL AND NEW.box_width_cm IS NOT NULL AND NEW.box_height_cm IS NOT NULL THEN
    NEW.cbm_per_box := ROUND((NEW.box_length_cm * NEW.box_width_cm * NEW.box_height_cm / 1000000.0)::NUMERIC, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_cbm ON public.factory_products;
CREATE TRIGGER trg_calc_cbm
  BEFORE INSERT OR UPDATE ON public.factory_products
  FOR EACH ROW EXECUTE FUNCTION public.calc_cbm_per_box();

-- 인증/안전 정보
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS certifications     TEXT[] DEFAULT '{}',  -- CE, KC, RoHS 등
  ADD COLUMN IF NOT EXISTS safety_warnings    TEXT,
  ADD COLUMN IF NOT EXISTS age_restriction    TEXT,  -- 연령제한 (예: 3세 이상)
  ADD COLUMN IF NOT EXISTS shelf_life_days    INTEGER;  -- 유통기한 (일)

-- 공급상 구분 (프로젝트 지식 기반)
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS supplier_type      TEXT DEFAULT 'PB기타',
  -- 'IP독점상품개발가능' | 'IP일부독점개발가능' | 'IP디자인요청가능' | 'IP단순구매만가능'
  -- | 'PB봉제중대형' | 'PB봉제중소형' | 'PB기타'
  ADD COLUMN IF NOT EXISTS customizable       BOOLEAN DEFAULT false,  -- 커스텀 가능 여부
  ADD COLUMN IF NOT EXISTS nda_available      BOOLEAN DEFAULT false,  -- NDA 체결 가능
  ADD COLUMN IF NOT EXISTS oem_available      BOOLEAN DEFAULT false,  -- OEM 가능
  ADD COLUMN IF NOT EXISTS odm_available      BOOLEAN DEFAULT false;  -- ODM 가능

-- 이미지/미디어 확장
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS video_url          TEXT,  -- 제품 영상 URL
  ADD COLUMN IF NOT EXISTS detail_images      TEXT[] DEFAULT '{}',  -- 상세페이지 이미지
  ADD COLUMN IF NOT EXISTS certificate_images TEXT[] DEFAULT '{}';  -- 인증서 이미지

-- 가격/재고 확장
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS price_usd          NUMERIC,  -- USD 가격 (참고용)
  ADD COLUMN IF NOT EXISTS price_krw          INTEGER,  -- KRW 가격 (참고용)
  ADD COLUMN IF NOT EXISTS stock_qty          INTEGER DEFAULT 0,  -- 현재 재고
  ADD COLUMN IF NOT EXISTS is_in_stock        BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_order_days     INTEGER DEFAULT 0,  -- 최소 주문 후 출고일
  ADD COLUMN IF NOT EXISTS bulk_discount_json JSONB DEFAULT '[]';
  -- [{min_qty: 500, discount_pct: 5}, {min_qty: 1000, discount_pct: 10}]

-- SEO/검색 최적화
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS seo_title_ko       TEXT,
  ADD COLUMN IF NOT EXISTS seo_desc_ko        TEXT,
  ADD COLUMN IF NOT EXISTS search_keywords    TEXT;  -- 검색 키워드 (쉼표 구분)

-- 통계/평점
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS view_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inquiry_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg         NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured        BOOLEAN DEFAULT false,  -- 추천 상품
  ADD COLUMN IF NOT EXISTS is_new             BOOLEAN DEFAULT true,   -- 신상품
  ADD COLUMN IF NOT EXISTS is_hot             BOOLEAN DEFAULT false;  -- 인기 상품

-- ── 2. 상품 리뷰/문의 테이블 ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.factory_products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  content         TEXT,
  images          TEXT[] DEFAULT '{}',
  is_verified     BOOLEAN DEFAULT false,  -- 실제 구매자 여부
  is_visible      BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_inquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.factory_products(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name      TEXT,
  guest_email     TEXT,
  question        TEXT NOT NULL,
  answer          TEXT,
  answered_at     TIMESTAMPTZ,
  answered_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. 상품 카테고리 테이블 업그레이드 ────────────────────────

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon_emoji         TEXT,
  ADD COLUMN IF NOT EXISTS banner_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS sort_order         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_visible         BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_count      INTEGER DEFAULT 0;

-- ── 4. 공개 상품 뷰 업데이트 ──────────────────────────────────

CREATE OR REPLACE VIEW public.products_public_v2 AS
SELECT
  fp.id,
  fp.product_code,
  fp.name_ko,
  fp.name_zh,
  fp.name_en,
  fp.brand_name,
  fp.description_ko,
  fp.description_zh,
  fp.detail_html_ko,
  fp.detail_html_zh,
  fp.key_features,
  fp.caution_ko,
  fp.caution_zh,
  fp.category,
  fp.unit_price_cny,
  fp.price_cny,
  fp.price_usd,
  fp.price_krw,
  fp.moq,
  fp.lead_time_days,
  fp.sample_cost_cny,
  fp.material_detail,
  fp.material_zh,
  fp.colors,
  fp.sizes,
  fp.print_methods,
  fp.packaging_type,
  fp.packaging_detail,
  fp.surface_treatment,
  fp.product_weight_g,
  fp.product_size_cm,
  fp.size_mm,
  fp.box_length_cm,
  fp.box_width_cm,
  fp.box_height_cm,
  fp.cbm_per_box,
  fp.pcs_per_box,
  fp.inner_box_pcs,
  fp.outer_box_pcs,
  fp.gross_weight_kg,
  fp.certifications,
  fp.safety_warnings,
  fp.age_restriction,
  fp.supplier_type,
  fp.customizable,
  fp.nda_available,
  fp.oem_available,
  fp.odm_available,
  fp.image_url,
  fp.image_urls,
  fp.video_url,
  fp.detail_images,
  fp.product_tags,
  fp.search_keywords,
  fp.is_featured,
  fp.is_new,
  fp.is_hot,
  fp.is_in_stock,
  fp.stock_qty,
  fp.view_count,
  fp.inquiry_count,
  fp.order_count,
  fp.rating_avg,
  fp.rating_count,
  fp.status,
  fp.created_at,
  fp.updated_at,
  fp.factory_id,
  f.company_name    AS factory_name_zh,
  f.company_name_ko AS factory_name_ko,
  f.factory_code,
  f.location        AS factory_location,
  f.verified        AS factory_verified
FROM public.factory_products fp
LEFT JOIN public.factories f ON f.id = fp.factory_id
WHERE fp.status = 'approved';

-- ── 5. 조회수 증가 함수 ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_product_view(p_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.factory_products
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. RLS 정책 ────────────────────────────────────────────────

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON public.product_reviews;
CREATE POLICY "reviews_select_public" ON public.product_reviews
  FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "reviews_insert_auth" ON public.product_reviews;
CREATE POLICY "reviews_insert_auth" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "inquiries_select_public" ON public.product_inquiries;
CREATE POLICY "inquiries_select_public" ON public.product_inquiries
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "inquiries_insert_auth" ON public.product_inquiries;
CREATE POLICY "inquiries_insert_auth" ON public.product_inquiries
  FOR INSERT WITH CHECK (true);

-- ── 7. 인덱스 ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fp_status_category ON public.factory_products(status, category);
CREATE INDEX IF NOT EXISTS idx_fp_featured ON public.factory_products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_fp_tags ON public.factory_products USING GIN(product_tags);
CREATE INDEX IF NOT EXISTS idx_fp_search ON public.factory_products USING GIN(to_tsvector('simple', COALESCE(name_ko,'') || ' ' || COALESCE(name_zh,'') || ' ' || COALESCE(search_keywords,'')));
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_product ON public.product_inquiries(product_id);
