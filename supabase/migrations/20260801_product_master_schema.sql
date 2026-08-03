-- ============================================================
-- KERYX 상품 마스터 DB 스키마 확장 마이그레이션
-- 날짜: 2026-08-01
-- 목적: B2B 카탈로그 및 IP 쇼룸 지원을 위한 상품 마스터 강화
-- 원칙: 기존 컬럼/테이블 절대 삭제하지 않음 (ADD COLUMN IF NOT EXISTS 사용)
-- ============================================================

-- ============================================================
-- 1. IP 캐릭터 마스터 테이블 (신규)
-- ============================================================
CREATE TABLE IF NOT EXISTS ip_characters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko         text NOT NULL,          -- 뿌찌프랜즈, 덕클, 디노몬 등
  name_zh         text NOT NULL DEFAULT '',
  name_en         text NOT NULL DEFAULT '',
  slug            text UNIQUE NOT NULL,   -- URL용 슬러그 (ppuchi-friends, duckle 등)
  description_ko  text DEFAULT '',
  description_zh  text DEFAULT '',
  description_en  text DEFAULT '',
  logo_url        text DEFAULT '',        -- 캐릭터 로고 이미지
  banner_url      text DEFAULT '',        -- 쇼룸 배너 이미지
  profile_image_url text DEFAULT '',      -- 캐릭터 프로필 이미지
  color_primary   text DEFAULT '#4f46e5', -- 브랜드 메인 컬러 (hex)
  color_secondary text DEFAULT '#818cf8', -- 브랜드 서브 컬러 (hex)
  is_active       boolean DEFAULT true,
  sort_order      int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- IP 캐릭터 기본 데이터 삽입
INSERT INTO ip_characters (name_ko, name_zh, name_en, slug, description_ko, description_zh, color_primary, sort_order)
VALUES
  ('뿌찌프랜즈', '噗奇朋友', 'Ppuchi Friends', 'ppuchi-friends', '귀여운 캐릭터들의 우정 이야기', '可爱角色们的友情故事', '#FF6B9D', 1),
  ('덕클', '鸭克', 'Duckle', 'duckle', '사랑스러운 오리 캐릭터', '可爱的鸭子角色', '#FFD93D', 2),
  ('디노몬', '迪诺蒙', 'Dinomon', 'dinomon', '공룡 세계의 귀여운 몬스터', '恐龙世界的可爱怪兽', '#6BCB77', 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. 상품 카테고리 마스터 테이블 (신규)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko     text NOT NULL,
  name_zh     text NOT NULL DEFAULT '',
  name_en     text NOT NULL DEFAULT '',
  parent_id   uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  icon_url    text DEFAULT '',
  sort_order  int DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 기본 카테고리 데이터 삽입
INSERT INTO product_categories (name_ko, name_zh, name_en, sort_order)
VALUES
  ('인형/봉제', '毛绒玩具', 'Plush Toys', 1),
  ('뽑기 굿즈', '扭蛋商品', 'Gashapon Goods', 2),
  ('가방고리/키링', '包挂件/钥匙扣', 'Bag Charms/Keyrings', 3),
  ('피규어', '手办', 'Figures', 4),
  ('문구/팬시', '文具/精品', 'Stationery/Fancy', 5),
  ('의류/패션', '服装/时尚', 'Apparel/Fashion', 6),
  ('생활용품', '生活用品', 'Daily Goods', 7),
  ('보냉백/가방', '保冷袋/包', 'Cooler Bags', 8)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. 기존 products 테이블 컬럼 추가 (기존 컬럼 보호)
-- ============================================================

-- 다국어 지원
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en text DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_ko text DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_zh text DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en text DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_ko text DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_zh text DEFAULT '';

-- IP 캐릭터 연결
ALTER TABLE products ADD COLUMN IF NOT EXISTS ip_character_id uuid REFERENCES ip_characters(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'general' CHECK (product_type IN ('ip', 'pb', 'general'));

-- 사이즈 정보
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_cm text DEFAULT '';         -- 예: "15cm", "20x10cm"
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_category text DEFAULT '';   -- 소형/중형/중대형/대형/초대형

-- 박스 사이즈 (CBM 자동계산용)
ALTER TABLE products ADD COLUMN IF NOT EXISTS box_length_cm numeric(8,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS box_width_cm  numeric(8,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS box_height_cm numeric(8,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pcs_per_carton int DEFAULT 0;    -- 카톤당 수량
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg numeric(8,3) DEFAULT 0;

-- 카탈로그 / 쇼룸 공개 설정
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_visible boolean DEFAULT false;  -- 바이어 카탈로그 공개
ALTER TABLE products ADD COLUMN IF NOT EXISTS showroom_visible boolean DEFAULT false; -- IP 쇼룸 공개
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;

-- 카테고리 연결 (기존 category 텍스트 컬럼 유지, 신규 FK 추가)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL;

-- 추가 이미지 (JSONB 배열)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb;  -- 추가 이미지 URL 배열
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;        -- 검색 태그

-- Soft delete
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ============================================================
-- 4. CBM 자동계산 함수 (박스 사이즈 → CBM/박스)
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_cbm_per_box()
RETURNS TRIGGER AS $$
BEGIN
  -- 박스 사이즈가 모두 입력된 경우 cbm_per_box 자동 계산
  IF NEW.box_length_cm > 0 AND NEW.box_width_cm > 0 AND NEW.box_height_cm > 0 THEN
    NEW.cbm_per_box := ROUND(
      (NEW.box_length_cm / 100.0) * (NEW.box_width_cm / 100.0) * (NEW.box_height_cm / 100.0),
      6
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_cbm ON products;
CREATE TRIGGER trg_calculate_cbm
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION calculate_cbm_per_box();

-- ============================================================
-- 5. 상품 코드 중복 방지 (product_code UNIQUE 제약 추가)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_product_code_unique'
    AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_product_code_unique UNIQUE (product_code);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- 이미 중복 데이터가 있으면 무시
END $$;

-- ============================================================
-- 6. 카탈로그 공개 상품 뷰 (바이어용 - 민감 정보 제외)
-- ============================================================
CREATE OR REPLACE VIEW v_catalog_products AS
SELECT
  p.id,
  p.product_code,
  p.name_ko,
  p.name_zh,
  p.name_en,
  p.category,
  p.category_id,
  pc.name_ko AS category_name_ko,
  pc.name_zh AS category_name_zh,
  p.supplier_type,
  p.product_type,
  p.sell_price_cny,   -- 판매가만 노출 (공급가 제외)
  p.moq,
  p.lead_time_days,
  p.stock_qty,
  p.image_url,
  p.image_urls,
  p.is_featured,
  p.is_new,
  p.is_hot,
  p.size_cm,
  p.size_category,
  p.cbm_per_box,
  p.pcs_per_box,
  p.pcs_per_carton,
  p.weight_kg,
  p.material_ko,
  p.material_zh,
  p.description_ko,
  p.description_zh,
  p.oem_available,
  p.odm_available,
  p.customizable,
  p.tags,
  p.ip_character_id,
  ip.name_ko AS ip_character_name_ko,
  ip.name_zh AS ip_character_name_zh,
  ip.slug AS ip_character_slug,
  ip.color_primary AS ip_color_primary,
  p.sort_order,
  p.created_at
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN ip_characters ip ON p.ip_character_id = ip.id
WHERE
  p.catalog_visible = true
  AND p.is_active = true
  AND p.approval_status = 'approved'
  AND p.deleted_at IS NULL;

-- ============================================================
-- 7. IP 쇼룸 뷰 (캐릭터별 상품 목록)
-- ============================================================
CREATE OR REPLACE VIEW v_showroom_products AS
SELECT
  p.id,
  p.product_code,
  p.name_ko,
  p.name_zh,
  p.name_en,
  p.sell_price_cny,
  p.moq,
  p.lead_time_days,
  p.image_url,
  p.image_urls,
  p.is_featured,
  p.is_new,
  p.is_hot,
  p.size_cm,
  p.description_ko,
  p.description_zh,
  p.tags,
  p.ip_character_id,
  ip.name_ko AS ip_character_name_ko,
  ip.name_zh AS ip_character_name_zh,
  ip.name_en AS ip_character_name_en,
  ip.slug AS ip_character_slug,
  ip.color_primary,
  ip.color_secondary,
  ip.logo_url AS ip_logo_url,
  ip.banner_url AS ip_banner_url,
  p.sort_order,
  p.created_at
FROM products p
JOIN ip_characters ip ON p.ip_character_id = ip.id
WHERE
  p.showroom_visible = true
  AND p.is_active = true
  AND p.approval_status = 'approved'
  AND p.deleted_at IS NULL;

-- ============================================================
-- 8. RLS 정책 (ip_characters, product_categories)
-- ============================================================
ALTER TABLE ip_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 허용
DROP POLICY IF EXISTS "ip_characters_public_read" ON ip_characters;
CREATE POLICY "ip_characters_public_read" ON ip_characters
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "product_categories_public_read" ON product_categories;
CREATE POLICY "product_categories_public_read" ON product_categories
  FOR SELECT USING (is_active = true);

-- 관리자만 수정 가능
DROP POLICY IF EXISTS "ip_characters_admin_all" ON ip_characters;
CREATE POLICY "ip_characters_admin_all" ON ip_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "product_categories_admin_all" ON product_categories;
CREATE POLICY "product_categories_admin_all" ON product_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 9. 인덱스 추가 (성능 최적화)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_ip_character_id ON products(ip_character_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_catalog_visible ON products(catalog_visible) WHERE catalog_visible = true;
CREATE INDEX IF NOT EXISTS idx_products_showroom_visible ON products(showroom_visible) WHERE showroom_visible = true;
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ip_characters_slug ON ip_characters(slug);

-- ============================================================
-- 완료 확인
-- ============================================================
SELECT 'Migration 20260801_product_master_schema completed successfully' AS status;
