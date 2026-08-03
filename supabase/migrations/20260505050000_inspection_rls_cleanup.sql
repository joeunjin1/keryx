-- ============================================================
-- inspections 테이블 RLS 정책 정리
-- 기존 구식 정책 제거 + 새 정책으로 통합
-- ============================================================

-- 1. 기존 구식 정책 제거 (order_id 기반 간접 조회 방식)
DROP POLICY IF EXISTS "seller sees published inspections" ON public.inspections;
DROP POLICY IF EXISTS "internal manages inspections" ON public.inspections;

-- 2. 새 통합 정책 확인 (이미 20260505040000 마이그레이션에서 생성됨)
-- inspections_internal_all : admin/md/inspector 전체 접근
-- inspections_seller_read  : 셀러 본인 + published 이상 상태만 읽기
-- inspections_factory_read : 공장 본인 + published 이상 상태만 읽기
-- inspections_seller_approve : 셀러 UPDATE 권한
-- inspections_factory_approve : 공장 UPDATE 권한

-- 3. factory_id 직접 연결 정책이 없는 경우 보완
-- (이미 생성된 경우 DROP IF EXISTS로 안전하게 재생성)
DROP POLICY IF EXISTS "inspections_factory_read" ON public.inspections;
CREATE POLICY "inspections_factory_read" ON public.inspections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.factories f
      WHERE f.id = inspections.factory_id
        AND f.shared_login_user_id = auth.uid()
    )
    AND inspections.status IN (
      'published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved'
    )
  );

-- 4. seller_id 직접 연결 정책 재확인
DROP POLICY IF EXISTS "inspections_seller_read" ON public.inspections;
CREATE POLICY "inspections_seller_read" ON public.inspections
  FOR SELECT
  USING (
    (
      -- seller_id 직접 연결
      EXISTS (
        SELECT 1 FROM public.sellers s
        WHERE s.id = inspections.seller_id
          AND s.user_id = auth.uid()
      )
      OR
      -- order_id 통한 간접 연결 (하위 호환)
      (
        inspections.order_id IS NOT NULL
        AND inspections.order_id IN (
          SELECT o.id FROM public.orders o
          WHERE o.seller_id IN (
            SELECT s2.id FROM public.sellers s2
            WHERE s2.user_id = auth.uid()
          )
        )
      )
    )
    AND inspections.status IN (
      'published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved'
    )
  );

-- 5. RLS 활성화 확인
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- 6. inspection_items 테이블도 RLS 확인
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspection_items_internal_all" ON public.inspection_items;
CREATE POLICY "inspection_items_internal_all" ON public.inspection_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.kind IN ('admin', 'md', 'inspector')
    )
  );

DROP POLICY IF EXISTS "inspection_items_seller_read" ON public.inspection_items;
CREATE POLICY "inspection_items_seller_read" ON public.inspection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.sellers s ON s.id = i.seller_id
      WHERE i.id = inspection_items.inspection_id
        AND s.user_id = auth.uid()
        AND i.status IN ('published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved')
    )
  );

DROP POLICY IF EXISTS "inspection_items_factory_read" ON public.inspection_items;
CREATE POLICY "inspection_items_factory_read" ON public.inspection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.factories f ON f.id = i.factory_id
      WHERE i.id = inspection_items.inspection_id
        AND f.shared_login_user_id = auth.uid()
        AND i.status IN ('published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved')
    )
  );
