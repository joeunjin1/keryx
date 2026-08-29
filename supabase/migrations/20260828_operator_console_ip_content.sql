-- ============================================================================
-- KERYX 운영자 콘솔: IP·콘텐츠·미디어·상품 옵션·주문 전 발주 데이터 기반
-- 작성일: 2026-08-28
-- 원칙: 기존 테이블·주문·상품·구독 데이터는 삭제하거나 변경하지 않는다.
-- 적용 범위: ip_characters 확장, 콘텐츠·미디어·상품 옵션·주문 전 발주·감사 이력 추가
-- 권한: public.is_admin()이 true인 운영자만 등록·수정·공개 상태 변경을 수행한다.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. 기존 IP 마스터 확장: IP 소개와 세계관을 동일 마스터에서 관리
-- ---------------------------------------------------------------------------
ALTER TABLE public.ip_characters
  ADD COLUMN IF NOT EXISTS description_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS world_name_ko text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS world_name_zh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS world_summary_ko text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS world_summary_zh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS development_status text NOT NULL DEFAULT 'draft'
    CHECK (development_status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ip_characters_public
  ON public.ip_characters (development_status, is_active, sort_order)
  WHERE deleted_at IS NULL;

-- 기존 IP·카테고리 RLS에는 이전 user_id/role 컬럼 참조가 남아 있다.
-- 현 user_profiles.kind='admin' 기반 public.is_admin()으로 통일한다.
-- IP 초안은 공개 API에서 읽을 수 없고, published 상태만 공개한다.
DROP POLICY IF EXISTS "ip_characters_public_read" ON public.ip_characters;
CREATE POLICY "ip_characters_public_read" ON public.ip_characters
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND development_status = 'published'
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "ip_characters_admin_all" ON public.ip_characters;
CREATE POLICY "ip_characters_admin_all" ON public.ip_characters
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "product_categories_admin_all" ON public.product_categories;
CREATE POLICY "product_categories_admin_all" ON public.product_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. IP별 개별 캐릭터 등록
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ip_cast_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_character_id uuid NOT NULL REFERENCES public.ip_characters(id) ON DELETE RESTRICT,
  name_ko text NOT NULL,
  name_zh text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  slug text NOT NULL,
  role_ko text NOT NULL DEFAULT '',
  role_zh text NOT NULL DEFAULT '',
  profile_ko text NOT NULL DEFAULT '',
  profile_zh text NOT NULL DEFAULT '',
  personality_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (ip_character_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_ip_cast_members_public
  ON public.ip_cast_members (ip_character_id, publication_status, sort_order)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. 직접 첨부 이미지·영상·문서 메타데이터
-- 공용 공개용 파일은 keryx-public-media 버킷에서 관리한다.
-- 파일 업로드는 운영자 서버 API만 사용하며, 클라이언트의 직접 업로드를 허용하지 않는다.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'keryx-public-media',
  'keryx-public-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "KERYX public media read" ON storage.objects;
CREATE POLICY "KERYX public media read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'keryx-public-media');

CREATE TABLE IF NOT EXISTS public.content_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL DEFAULT 'keryx-public-media'
    CHECK (bucket_id = 'keryx-public-media'),
  object_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  public_url text NOT NULL DEFAULT '',
  alt_text_ko text NOT NULL DEFAULT '',
  alt_text_zh text NOT NULL DEFAULT '',
  purpose text NOT NULL DEFAULT 'gallery'
    CHECK (purpose IN ('ip_cover', 'character_profile', 'story_cover', 'story_page', 'product_image', 'gallery', 'document')),
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (bucket_id, object_path)
);

CREATE INDEX IF NOT EXISTS idx_content_media_assets_public
  ON public.content_media_assets (publication_status, purpose, created_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4. IP 연재·동화·웹툰·소설 등록
-- body_ko/body_zh에는 서식 없는 본문 또는 Markdown 본문만 저장한다.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ip_content_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_character_id uuid NOT NULL REFERENCES public.ip_characters(id) ON DELETE RESTRICT,
  content_type text NOT NULL
    CHECK (content_type IN ('storybook', 'webtoon', 'novel', 'shortform', 'news')),
  episode_no integer CHECK (episode_no IS NULL OR episode_no > 0),
  slug text NOT NULL,
  title_ko text NOT NULL,
  title_zh text NOT NULL DEFAULT '',
  excerpt_ko text NOT NULL DEFAULT '',
  excerpt_zh text NOT NULL DEFAULT '',
  body_ko text NOT NULL DEFAULT '',
  body_zh text NOT NULL DEFAULT '',
  cover_asset_id uuid REFERENCES public.content_media_assets(id) ON DELETE SET NULL,
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (ip_character_id, content_type, slug)
);

CREATE INDEX IF NOT EXISTS idx_ip_content_entries_public
  ON public.ip_content_entries (ip_character_id, publication_status, published_at DESC, sort_order)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ip_content_asset_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_entry_id uuid NOT NULL REFERENCES public.ip_content_entries(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL REFERENCES public.content_media_assets(id) ON DELETE RESTRICT,
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  caption_ko text NOT NULL DEFAULT '',
  caption_zh text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_entry_id, media_asset_id)
);

-- ---------------------------------------------------------------------------
-- 5. 상품 옵션·색상·규격 관리
-- 기존 products 테이블의 공급처·원가·기본 상품 정보는 보존한다.
-- 옵션 SKU는 같은 상품 안에서 중복될 수 없다.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  option_label_ko text NOT NULL,
  option_label_zh text NOT NULL DEFAULT '',
  option_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  seller_sku text NOT NULL DEFAULT '',
  retail_stock_quantity integer NOT NULL DEFAULT 0 CHECK (retail_stock_quantity >= 0),
  retail_additional_price_krw numeric(14,2) NOT NULL DEFAULT 0 CHECK (retail_additional_price_krw >= 0),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (product_id, seller_sku)
);

CREATE INDEX IF NOT EXISTS idx_product_options_product
  ON public.product_options (product_id, is_active, sort_order)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 6. 주문 전 발주 대기 목록
-- 실제 B2B 주문·소매 주문과 분리한다. 확정 전 발주 관리용이며, 전환 이력을 남긴다.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preorder_purchase_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'converted', 'cancelled')),
  supplier_name_snapshot text NOT NULL DEFAULT '',
  assigned_md_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_delivery_date date,
  memo text NOT NULL DEFAULT '',
  converted_order_id uuid,
  converted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.preorder_purchase_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES public.preorder_purchase_queue(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  ip_character_id uuid REFERENCES public.ip_characters(id) ON DELETE SET NULL,
  size_category text NOT NULL DEFAULT '',
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  target_unit_price_cny numeric(14,2) CHECK (target_unit_price_cny IS NULL OR target_unit_price_cny >= 0),
  carton_cbm numeric(12,6) CHECK (carton_cbm IS NULL OR carton_cbm >= 0),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preorder_purchase_queue_status
  ON public.preorder_purchase_queue (status, created_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 7. 운영자 활동 감사 이력
-- 이력은 운영자가 수정하거나 삭제할 수 없다.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operator_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_activity_log_target
  ON public.operator_activity_log (target_table, target_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 8. updated_at 공용 트리거
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.keryx_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ip_cast_members_updated_at ON public.ip_cast_members;
CREATE TRIGGER trg_ip_cast_members_updated_at
BEFORE UPDATE ON public.ip_cast_members
FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

DROP TRIGGER IF EXISTS trg_content_media_assets_updated_at ON public.content_media_assets;
CREATE TRIGGER trg_content_media_assets_updated_at
BEFORE UPDATE ON public.content_media_assets
FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

DROP TRIGGER IF EXISTS trg_ip_content_entries_updated_at ON public.ip_content_entries;
CREATE TRIGGER trg_ip_content_entries_updated_at
BEFORE UPDATE ON public.ip_content_entries
FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

DROP TRIGGER IF EXISTS trg_product_options_updated_at ON public.product_options;
CREATE TRIGGER trg_product_options_updated_at
BEFORE UPDATE ON public.product_options
FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

DROP TRIGGER IF EXISTS trg_preorder_purchase_queue_updated_at ON public.preorder_purchase_queue;
CREATE TRIGGER trg_preorder_purchase_queue_updated_at
BEFORE UPDATE ON public.preorder_purchase_queue
FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

DROP TRIGGER IF EXISTS trg_preorder_purchase_queue_items_updated_at ON public.preorder_purchase_queue_items;
CREATE TRIGGER trg_preorder_purchase_queue_items_updated_at
BEFORE UPDATE ON public.preorder_purchase_queue_items
FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. RLS: 공개 조회는 published 데이터만, 쓰기는 admin만 허용
-- public.is_admin()은 현재 user_profiles.kind='admin'을 기준으로 한다.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ip_cast_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_content_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_content_asset_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorder_purchase_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preorder_purchase_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads published cast members" ON public.ip_cast_members;
CREATE POLICY "public reads published cast members"
ON public.ip_cast_members FOR SELECT
TO anon, authenticated
USING (publication_status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "admin manages cast members" ON public.ip_cast_members;
CREATE POLICY "admin manages cast members"
ON public.ip_cast_members FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "public reads published media metadata" ON public.content_media_assets;
CREATE POLICY "public reads published media metadata"
ON public.content_media_assets FOR SELECT
TO anon, authenticated
USING (publication_status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "admin manages media metadata" ON public.content_media_assets;
CREATE POLICY "admin manages media metadata"
ON public.content_media_assets FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "public reads published ip content" ON public.ip_content_entries;
CREATE POLICY "public reads published ip content"
ON public.ip_content_entries FOR SELECT
TO anon, authenticated
USING (publication_status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "admin manages ip content" ON public.ip_content_entries;
CREATE POLICY "admin manages ip content"
ON public.ip_content_entries FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "public reads linked published content media" ON public.ip_content_asset_links;
CREATE POLICY "public reads linked published content media"
ON public.ip_content_asset_links FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ip_content_entries entry
    WHERE entry.id = content_entry_id
      AND entry.publication_status = 'published'
      AND entry.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "admin manages content media links" ON public.ip_content_asset_links;
CREATE POLICY "admin manages content media links"
ON public.ip_content_asset_links FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin manages product options" ON public.product_options;
CREATE POLICY "admin manages product options"
ON public.product_options FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin manages preorder queue" ON public.preorder_purchase_queue;
CREATE POLICY "admin manages preorder queue"
ON public.preorder_purchase_queue FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin manages preorder queue items" ON public.preorder_purchase_queue_items;
CREATE POLICY "admin manages preorder queue items"
ON public.preorder_purchase_queue_items FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin reads operator activity log" ON public.operator_activity_log;
CREATE POLICY "admin reads operator activity log"
ON public.operator_activity_log FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admin inserts operator activity log" ON public.operator_activity_log;
CREATE POLICY "admin inserts operator activity log"
ON public.operator_activity_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- 운영 이력은 어떤 일반 사용자도 수정·삭제할 수 없다.
REVOKE UPDATE, DELETE ON public.operator_activity_log FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. 공개 IP 허브 전용 안전 뷰
-- 공개 화면은 원가·운영 메모·작성자 정보 없이 이 뷰 또는 명시적 안전 열만 사용한다.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_public_ip_hub
WITH (security_invoker = true)
AS
SELECT
  id,
  name_ko,
  name_zh,
  name_en,
  slug,
  description_ko,
  description_zh,
  description_en,
  logo_url,
  banner_url,
  profile_image_url,
  color_primary,
  color_secondary,
  world_name_ko,
  world_name_zh,
  world_summary_ko,
  world_summary_zh,
  sort_order,
  published_at
FROM public.ip_characters
WHERE is_active = true
  AND development_status = 'published'
  AND deleted_at IS NULL;

GRANT SELECT ON public.v_public_ip_hub TO anon, authenticated;

COMMIT;

-- 적용 확인용: SQL Editor 결과에는 아래 SELECT의 행 수만 나타난다.
SELECT
  to_regclass('public.ip_cast_members') AS ip_cast_members,
  to_regclass('public.ip_content_entries') AS ip_content_entries,
  to_regclass('public.content_media_assets') AS content_media_assets,
  to_regclass('public.product_options') AS product_options,
  to_regclass('public.preorder_purchase_queue') AS preorder_purchase_queue,
  to_regclass('public.operator_activity_log') AS operator_activity_log;
