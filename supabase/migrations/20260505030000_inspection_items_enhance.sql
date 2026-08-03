-- ============================================================
-- 검수 체크리스트 항목 강화 마이그레이션
-- 2026-05-05
-- 목적: 항목별 검수수량/합격수량/불량수량/해당없음 + 사진 연결
-- ============================================================

-- 1. inspection_items 테이블 컬럼 추가
ALTER TABLE inspection_items
  ADD COLUMN IF NOT EXISTS qty_inspected  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_na          boolean DEFAULT false,  -- 해당없음
  ADD COLUMN IF NOT EXISTS na_reason      text,                   -- 해당없음 사유
  ADD COLUMN IF NOT EXISTS defect_grade   text,                   -- critical/major/minor
  ADD COLUMN IF NOT EXISTS defect_desc_ko text,                   -- 불량 설명 (한국어)
  ADD COLUMN IF NOT EXISTS defect_desc_cn text,                   -- 불량 설명 (중국어)
  ADD COLUMN IF NOT EXISTS action_ko      text,                   -- 조치사항 (한국어)
  ADD COLUMN IF NOT EXISTS action_cn      text;                   -- 조치사항 (중국어)

-- 2. inspection_photos 테이블에 photo_type 구분 추가 (합격/불량/전체)
-- photo_kind 컬럼이 이미 있으므로 CHECK 제약만 추가
-- photo_kind: 'pass' | 'fail' | 'overview' | 'defect' | 'label' | 'packaging' | 'other'
ALTER TABLE inspection_photos
  ADD COLUMN IF NOT EXISTS item_photo_type text DEFAULT 'overview';
  -- 'pass_sample': 합격 샘플 사진
  -- 'fail_sample': 불량 샘플 사진
  -- 'overview': 전체 현장 사진

-- 3. 검수 보고서 승인 흐름 컬럼 추가 (inspections 테이블)
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS factory_approved_at   timestamptz,
  ADD COLUMN IF NOT EXISTS factory_approved_by   text,
  ADD COLUMN IF NOT EXISTS factory_approval_note text,
  ADD COLUMN IF NOT EXISTS buyer_approved_at     timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_approved_by     uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS buyer_approval_note   text,
  ADD COLUMN IF NOT EXISTS payment_released_at   timestamptz,  -- 정산 처리 시각
  ADD COLUMN IF NOT EXISTS payment_amount_cny    numeric(12,2); -- 정산 금액

-- 4. 검수 보고서 서술식 내용 컬럼 추가
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS report_intro_ko    text,  -- 보고서 서론 (한국어)
  ADD COLUMN IF NOT EXISTS report_intro_cn    text,  -- 보고서 서론 (중국어)
  ADD COLUMN IF NOT EXISTS report_process_ko  text,  -- 검수 과정 설명 (한국어)
  ADD COLUMN IF NOT EXISTS report_process_cn  text,  -- 검수 과정 설명 (중국어)
  ADD COLUMN IF NOT EXISTS report_conclusion_ko text, -- 결론 및 권고사항 (한국어)
  ADD COLUMN IF NOT EXISTS report_conclusion_cn text; -- 결론 및 권고사항 (중국어)

-- 5. 전체 통계 계산 함수 (중복불량 제거 후 실합격수량)
CREATE OR REPLACE FUNCTION calc_inspection_stats(p_inspection_id uuid)
RETURNS TABLE(
  total_inspected   integer,
  total_passed      integer,
  total_failed_raw  integer,
  total_failed_dedup integer,  -- 중복 제거된 불량수량
  pass_rate         numeric,
  fail_rate         numeric
) LANGUAGE plpgsql AS $$
DECLARE
  v_total_inspected integer;
  v_total_passed    integer;
  v_total_failed    integer;
BEGIN
  -- 해당없음(is_na=true) 항목 제외하고 집계
  SELECT
    COALESCE(SUM(qty_inspected), 0),
    COALESCE(SUM(qty_passed), 0),
    COALESCE(SUM(qty_failed), 0)
  INTO v_total_inspected, v_total_passed, v_total_failed
  FROM inspection_items
  WHERE inspection_id = p_inspection_id
    AND is_na = false;

  RETURN QUERY SELECT
    v_total_inspected,
    v_total_passed,
    v_total_failed,
    -- 중복불량: 동일 제품에 여러 불량이 있을 수 있으므로
    -- 실제 불량 제품 수 = total_inspected - total_passed
    GREATEST(0, v_total_inspected - v_total_passed),
    CASE WHEN v_total_inspected > 0
      THEN ROUND((v_total_passed::numeric / v_total_inspected) * 100, 2)
      ELSE 0
    END,
    CASE WHEN v_total_inspected > 0
      THEN ROUND(((v_total_inspected - v_total_passed)::numeric / v_total_inspected) * 100, 2)
      ELSE 0
    END;
END;
$$;

-- 6. RLS 정책 추가 (inspection_items 기존 정책 확인 후 추가)
DO $$
BEGIN
  -- inspection_items RLS 활성화
  ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;

  -- 기존 정책 삭제 후 재생성
  DROP POLICY IF EXISTS "inspection_items_internal_all" ON inspection_items;
  DROP POLICY IF EXISTS "inspection_items_seller_read" ON inspection_items;
  DROP POLICY IF EXISTS "inspection_items_factory_read" ON inspection_items;

  -- 내부 사용자: 전체 접근
  CREATE POLICY "inspection_items_internal_all" ON inspection_items
    FOR ALL TO authenticated
    USING (is_internal())
    WITH CHECK (is_internal());

  -- 셀러: 자신의 검수 항목만 읽기
  CREATE POLICY "inspection_items_seller_read" ON inspection_items
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM inspections i
        JOIN orders o ON o.id = i.order_id
        JOIN sellers s ON s.id = o.seller_id
        WHERE i.id = inspection_items.inspection_id
          AND s.user_id = auth.uid()
          AND i.status = 'published'
      )
    );

  -- 공장: 자신의 검수 항목만 읽기
  CREATE POLICY "inspection_items_factory_read" ON inspection_items
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM inspections i
        JOIN factories f ON f.id = i.factory_id
        WHERE i.id = inspection_items.inspection_id
          AND f.shared_login_user_id = auth.uid()
          AND i.status = 'published'
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS policy error: %', SQLERRM;
END;
$$;

COMMENT ON COLUMN inspection_items.qty_inspected IS '해당 항목 검수 수량';
COMMENT ON COLUMN inspection_items.is_na IS '해당없음 여부 (상품 특성상 검수 불필요한 항목)';
COMMENT ON COLUMN inspection_items.defect_grade IS '불량 등급: critical/major/minor';
COMMENT ON COLUMN inspection_photos.item_photo_type IS '사진 유형: pass_sample(합격샘플)/fail_sample(불량샘플)/overview(전체현장)';
