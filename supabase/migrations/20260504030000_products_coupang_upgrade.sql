-- ============================================================
-- KERYX products 테이블 쿠팡 수준 상품 정보 확장
-- 2026-05-04
-- ============================================================

-- ── 1. 기본 정보 확장 ──────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_name         TEXT,
  ADD COLUMN IF NOT EXISTS origin_country     TEXT DEFAULT '중국',
  ADD COLUMN IF NOT EXISTS hs_code            TEXT,
  ADD COLUMN IF NOT EXISTS barcode            TEXT,
  ADD COLUMN IF NOT EXISTS product_code       TEXT,
  ADD COLUMN IF NOT EXISTS product_tags       TEXT[] DEFAULT '{}';

-- ── 2. 상세 설명 (다국어) ──────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS detail_html_ko     TEXT,
  ADD COLUMN IF NOT EXISTS detail_html_zh     TEXT,
  ADD COLUMN IF NOT EXISTS key_features       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS caution_ko         TEXT,
  ADD COLUMN IF NOT EXISTS caution_zh         TEXT;

-- ── 3. 소재/스펙 ───────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS material_detail    TEXT,
  ADD COLUMN IF NOT EXISTS material_zh        TEXT,
  ADD COLUMN IF NOT EXISTS colors             TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sizes              TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS print_methods      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS packaging_detail   TEXT,
  ADD COLUMN IF NOT EXISTS surface_treatment  TEXT,
  ADD COLUMN IF NOT EXISTS product_size_cm    TEXT;

-- ── 4. 박스/물류 정보 ─────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS inner_box_pcs      INTEGER,
  ADD COLUMN IF NOT EXISTS outer_box_pcs      INTEGER,
  ADD COLUMN IF NOT EXISTS box_length_cm      NUMERIC,
  ADD COLUMN IF NOT EXISTS box_width_cm       NUMERIC,
  ADD COLUMN IF NOT EXISTS box_height_cm      NUMERIC,
  ADD COLUMN IF NOT EXISTS cbm_per_box        NUMERIC,
  ADD COLUMN IF NOT EXISTS pcs_per_box        INTEGER,
  ADD COLUMN IF NOT EXISTS gross_weight_kg    NUMERIC;

-- ── 5. 인증/안전 ──────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS certifications     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS safety_warnings    TEXT,
  ADD COLUMN IF NOT EXISTS age_restriction    TEXT,
  ADD COLUMN IF NOT EXISTS shelf_life_days    INTEGER;

-- ── 6. 공급 유형 ──────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_type      TEXT DEFAULT 'PB기타',
  ADD COLUMN IF NOT EXISTS customizable       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nda_available      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS oem_available      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS odm_available      BOOLEAN DEFAULT false;

-- ── 7. 이미지/미디어 ──────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url          TEXT,
  ADD COLUMN IF NOT EXISTS image_urls         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url          TEXT,
  ADD COLUMN IF NOT EXISTS detail_images      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certificate_images TEXT[] DEFAULT '{}';

-- ── 8. 가격/재고 ──────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_cny          NUMERIC,
  ADD COLUMN IF NOT EXISTS price_usd          NUMERIC,
  ADD COLUMN IF NOT EXISTS price_krw          INTEGER,
  ADD COLUMN IF NOT EXISTS stock_qty          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_in_stock        BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS bulk_discount_json JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pricing_tiers      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS variants           JSONB DEFAULT '[]';

-- ── 9. SEO/검색 ───────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_keywords    TEXT,
  ADD COLUMN IF NOT EXISTS seo_title_ko       TEXT,
  ADD COLUMN IF NOT EXISTS seo_desc_ko        TEXT;

-- ── 10. 상태/통계 ─────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new             BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_hot             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS inquiry_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg         NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category           TEXT;

-- ── 11. 리뷰/문의 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  reviewer_name   TEXT,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  content         TEXT,
  images          TEXT[] DEFAULT '{}',
  is_verified     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_inquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  buyer_name      TEXT,
  company_name    TEXT,
  email           TEXT,
  phone           TEXT,
  inquiry_type    TEXT DEFAULT 'general',
  content         TEXT NOT NULL,
  answer          TEXT,
  answered_at     TIMESTAMPTZ,
  is_public       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 12. 인덱스 ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN(product_tags);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING GIN(
  to_tsvector('simple', COALESCE(name_ko,'') || ' ' || COALESCE(name_zh,'') || ' ' || COALESCE(search_keywords,''))
);

-- ── 13. RLS ───────────────────────────────────────────────────
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inquiries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_reviews' AND policyname='product_reviews_select') THEN
    CREATE POLICY "product_reviews_select" ON public.product_reviews FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_inquiries' AND policyname='product_inquiries_select') THEN
    CREATE POLICY "product_inquiries_select" ON public.product_inquiries FOR SELECT USING (true);
  END IF;
END $$;
