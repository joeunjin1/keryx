-- ============================================================
-- KERYX 상품 승인 워크플로우 마이그레이션
-- 공장 등록 → MD 검토(수정) → 관리자 최종 승인 → /shop 자동 노출
-- 2026-05-11
-- ============================================================

-- ── 1. products 테이블에 approval_status 및 워크플로우 컬럼 추가 ──
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS approval_status    TEXT    NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS md_reviewed_by     UUID    REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS md_reviewed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS md_review_notes    TEXT,
  ADD COLUMN IF NOT EXISTS admin_approved_by  UUID    REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason    TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at        TIMESTAMPTZ;

-- approval_status 값: pending_review | under_review | md_approved | approved | rejected | discontinued

-- ── 2. 인덱스 추가 ──
CREATE INDEX IF NOT EXISTS idx_products_approval_status
  ON public.products(approval_status);

CREATE INDEX IF NOT EXISTS idx_products_active_approved
  ON public.products(is_active, approval_status)
  WHERE is_active = true AND approval_status = 'approved';

-- ── 3. MD 상품 검토 + 수정 + 승인 RPC ──
-- MD가 제품명/카테고리/가격을 수정하고 승인 처리
CREATE OR REPLACE FUNCTION public.md_review_approve_product(
  p_product_id        UUID,
  p_md_user_id        UUID,
  p_name_ko           TEXT    DEFAULT NULL,
  p_name_zh           TEXT    DEFAULT NULL,
  p_category          TEXT    DEFAULT NULL,
  p_category_id       UUID    DEFAULT NULL,
  p_sell_price_cny    NUMERIC DEFAULT NULL,
  p_supply_price_cny  NUMERIC DEFAULT NULL,
  p_moq               INTEGER DEFAULT NULL,
  p_review_notes      TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_update JSONB := '{}';
BEGIN
  -- 수정 필드 동적 구성 (NULL이 아닌 필드만 업데이트)
  UPDATE public.products
  SET
    name_ko           = COALESCE(p_name_ko, name_ko),
    name_zh           = COALESCE(p_name_zh, name_zh),
    category          = COALESCE(p_category, category),
    category_id       = COALESCE(p_category_id, category_id),
    sell_price_cny    = COALESCE(p_sell_price_cny, sell_price_cny),
    price_cny         = COALESCE(p_sell_price_cny, price_cny),
    supply_price_cny  = COALESCE(p_supply_price_cny, supply_price_cny),
    moq               = COALESCE(p_moq, moq),
    approval_status   = 'md_approved',
    md_reviewed_by    = p_md_user_id,
    md_reviewed_at    = NOW(),
    md_review_notes   = p_review_notes,
    updated_at        = NOW()
  WHERE id = p_product_id
    AND approval_status IN ('pending_review', 'under_review');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or not in reviewable state';
  END IF;
END;
$$;

-- ── 4. MD 상품 반려 RPC ──
CREATE OR REPLACE FUNCTION public.md_reject_product(
  p_product_id    UUID,
  p_md_user_id    UUID,
  p_reason        TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET
    approval_status   = 'rejected',
    md_reviewed_by    = p_md_user_id,
    md_reviewed_at    = NOW(),
    rejected_reason   = p_reason,
    rejected_at       = NOW(),
    is_active         = false,
    updated_at        = NOW()
  WHERE id = p_product_id
    AND approval_status IN ('pending_review', 'under_review');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or not in reviewable state';
  END IF;
END;
$$;

-- ── 5. 관리자 최종 승인 RPC (승인 시 is_active=true → /shop 자동 노출) ──
CREATE OR REPLACE FUNCTION public.admin_approve_product(
  p_product_id        UUID,
  p_admin_user_id     UUID,
  p_name_ko           TEXT    DEFAULT NULL,
  p_name_zh           TEXT    DEFAULT NULL,
  p_category          TEXT    DEFAULT NULL,
  p_category_id       UUID    DEFAULT NULL,
  p_sell_price_cny    NUMERIC DEFAULT NULL,
  p_supply_price_cny  NUMERIC DEFAULT NULL,
  p_moq               INTEGER DEFAULT NULL,
  p_notes             TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET
    name_ko             = COALESCE(p_name_ko, name_ko),
    name_zh             = COALESCE(p_name_zh, name_zh),
    category            = COALESCE(p_category, category),
    category_id         = COALESCE(p_category_id, category_id),
    sell_price_cny      = COALESCE(p_sell_price_cny, sell_price_cny),
    price_cny           = COALESCE(p_sell_price_cny, price_cny),
    supply_price_cny    = COALESCE(p_supply_price_cny, supply_price_cny),
    moq                 = COALESCE(p_moq, moq),
    approval_status     = 'approved',
    admin_approved_by   = p_admin_user_id,
    admin_approved_at   = NOW(),
    md_review_notes     = COALESCE(p_notes, md_review_notes),
    is_active           = true,   -- ✅ 승인 시 /shop 자동 노출
    updated_at          = NOW()
  WHERE id = p_product_id
    AND approval_status IN ('pending_review', 'under_review', 'md_approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or not in approvable state';
  END IF;
END;
$$;

-- ── 6. 관리자 최종 반려 RPC ──
CREATE OR REPLACE FUNCTION public.admin_reject_product(
  p_product_id    UUID,
  p_admin_user_id UUID,
  p_reason        TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET
    approval_status     = 'rejected',
    admin_approved_by   = p_admin_user_id,
    admin_approved_at   = NOW(),
    rejected_reason     = p_reason,
    rejected_at         = NOW(),
    is_active           = false,
    updated_at          = NOW()
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
END;
$$;

-- ── 7. RLS 정책 추가 ──
-- products 테이블 RLS 활성화 (이미 활성화된 경우 무시)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 공개 조회: approved + is_active 상품만
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND approval_status = 'approved');

-- 공장: 자신의 상품 조회/등록
DROP POLICY IF EXISTS "products_factory_read" ON public.products;
CREATE POLICY "products_factory_read"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    factory_id IN (
      SELECT id FROM public.factories
      WHERE user_id = auth.uid() OR shared_login_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "products_factory_insert" ON public.products;
CREATE POLICY "products_factory_insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    factory_id IN (
      SELECT id FROM public.factories
      WHERE user_id = auth.uid() OR shared_login_user_id = auth.uid()
    )
  );

-- 내부 사용자(MD/관리자): 모든 상품 조회/수정
DROP POLICY IF EXISTS "products_internal_all" ON public.products;
CREATE POLICY "products_internal_all"
  ON public.products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.internal_users
      WHERE user_id = auth.uid()
        AND role IN ('md', 'admin', 'super_admin')
    )
  );

-- service_role: 모든 접근 허용 (API 라우트용)
DROP POLICY IF EXISTS "products_service_role" ON public.products;
CREATE POLICY "products_service_role"
  ON public.products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 8. 기존 approved 상품 is_active 동기화 ──
-- approval_status가 없던 기존 상품들: is_active=true인 것은 approved로 설정
UPDATE public.products
SET approval_status = 'approved'
WHERE is_active = true
  AND approval_status = 'pending_review'
  AND created_at < '2026-05-11 00:00:00+00';
