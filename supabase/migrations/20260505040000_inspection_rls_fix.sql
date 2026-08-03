-- 검수 보고서 발송 후 공장/셀러가 받지 못하는 문제 수정
-- 원인: inspections 테이블에 seller/factory 읽기 RLS 정책 없음
-- 수정: inspections 테이블 RLS 활성화 + seller/factory 읽기 정책 추가

-- 1. inspections 테이블 RLS 활성화
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "inspections_internal_all" ON public.inspections;
DROP POLICY IF EXISTS "inspections_seller_read" ON public.inspections;
DROP POLICY IF EXISTS "inspections_factory_read" ON public.inspections;

-- 3. 내부 사용자(admin/md/inspector) 전체 접근
CREATE POLICY "inspections_internal_all" ON public.inspections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.kind IN ('admin', 'md', 'inspector')
    )
  );

-- 4. 셀러: 본인 seller_id + published 이상 상태만 읽기
CREATE POLICY "inspections_seller_read" ON public.inspections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = inspections.seller_id
        AND s.user_id = auth.uid()
    )
    AND inspections.status IN (
      'published', 'approved',
      'buyer_approved', 'factory_approved', 'both_approved'
    )
  );

-- 5. 공장: shared_login_user_id로 factory_id 매칭 + published 이상 상태만 읽기
CREATE POLICY "inspections_factory_read" ON public.inspections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.factories f
      WHERE f.id = inspections.factory_id
        AND f.shared_login_user_id = auth.uid()
    )
    AND inspections.status IN (
      'published', 'approved',
      'buyer_approved', 'factory_approved', 'both_approved'
    )
  );

-- 6. 공장 승인 UPDATE 정책 (factory_approved_at, factory_approval_note 업데이트 허용)
DROP POLICY IF EXISTS "inspections_factory_approve" ON public.inspections;
CREATE POLICY "inspections_factory_approve" ON public.inspections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.factories f
      WHERE f.id = inspections.factory_id
        AND f.shared_login_user_id = auth.uid()
    )
    AND inspections.status IN (
      'published', 'approved',
      'buyer_approved', 'factory_approved', 'both_approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.factories f
      WHERE f.id = inspections.factory_id
        AND f.shared_login_user_id = auth.uid()
    )
  );

-- 7. 셀러 승인 UPDATE 정책 (buyer_approved_at, buyer_approval_note 업데이트 허용)
DROP POLICY IF EXISTS "inspections_seller_approve" ON public.inspections;
CREATE POLICY "inspections_seller_approve" ON public.inspections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = inspections.seller_id
        AND s.user_id = auth.uid()
    )
    AND inspections.status IN (
      'published', 'approved',
      'buyer_approved', 'factory_approved', 'both_approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = inspections.seller_id
        AND s.user_id = auth.uid()
    )
  );
