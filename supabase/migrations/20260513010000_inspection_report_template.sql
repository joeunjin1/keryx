-- ============================================================
-- 검수 보고서 템플릿 기능 강화 마이그레이션
-- 2026-05-13
-- 목적:
--   1. 불량 처리 방법 (추가제작 / 쇼티지) 선택 컬럼 추가
--   2. 검수 완료 수량 컬럼 추가
--   3. 사진 카테고리 (검수사진/샘플확인비교/검수원현장) 구분 추가
--   4. 사진 제목 컬럼 추가
--   5. 바이어 발송 이력 테이블 (기존 inspection_publish_history 활용)
-- ============================================================

-- 1. inspections 테이블 - 불량 처리 방법 및 수량 컬럼 추가
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS defect_action        TEXT,
  -- 'remanufacture': 공장 추가제작
  -- 'shortage': 반품 금액에서 빼기 (쇼티지)
  ADD COLUMN IF NOT EXISTS defect_action_days   INTEGER,
  -- 추가제작 시 완료 예정 일수
  ADD COLUMN IF NOT EXISTS defect_action_notes  TEXT,
  -- 불량 처리 메모
  ADD COLUMN IF NOT EXISTS qty_completed        INTEGER,
  -- 검수 완료 후 최종 출하 수량
  ADD COLUMN IF NOT EXISTS qty_passed           INTEGER,
  -- 합격 수량
  ADD COLUMN IF NOT EXISTS qty_failed           INTEGER,
  -- 불량 수량
  ADD COLUMN IF NOT EXISTS pass_rate            NUMERIC(5,2),
  -- 합격률 (%)
  ADD COLUMN IF NOT EXISTS inspector_comment    TEXT,
  -- 검수원 코멘트
  ADD COLUMN IF NOT EXISTS inspector_name       TEXT,
  -- 검수원 이름
  ADD COLUMN IF NOT EXISTS inspection_location  TEXT;
  -- 검수 장소 (공장명)

-- 2. inspection_photos 테이블 - 사진 카테고리 및 제목 컬럼 추가
ALTER TABLE public.inspection_photos
  ADD COLUMN IF NOT EXISTS photo_category  TEXT DEFAULT 'inspection',
  -- 'inspection': 검수 사진 (제목+사진)
  -- 'sample_compare': 샘플 vs 현재 비교 사진
  -- 'inspector_site': 검수원 현장 사진
  ADD COLUMN IF NOT EXISTS photo_title     TEXT,
  -- 사진 제목 (검수 사진 섹션에서 사용)
  ADD COLUMN IF NOT EXISTS is_sample_ref   BOOLEAN DEFAULT FALSE,
  -- TRUE: 오더 확정 시 샘플 사진 (비교 기준)
  -- FALSE: 현재 검수 사진
  ADD COLUMN IF NOT EXISTS display_order   INTEGER DEFAULT 0;

-- 3. 검수 보고서 발송 이력 - 바이어 발송 전용 컬럼 추가
ALTER TABLE public.inspection_publish_history
  ADD COLUMN IF NOT EXISTS sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sent_by_name    TEXT,
  ADD COLUMN IF NOT EXISTS message_to_buyer TEXT;
  -- 바이어에게 보내는 메시지

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_inspection_photos_category
  ON public.inspection_photos(inspection_id, photo_category);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_sample_ref
  ON public.inspection_photos(inspection_id, is_sample_ref);

-- 5. 코멘트
COMMENT ON COLUMN public.inspections.defect_action IS '불량 처리 방법: remanufacture(추가제작) | shortage(쇼티지)';
COMMENT ON COLUMN public.inspections.defect_action_days IS '추가제작 시 완료 예정 일수';
COMMENT ON COLUMN public.inspections.qty_completed IS '검수 완료 후 최종 출하 수량';
COMMENT ON COLUMN public.inspection_photos.photo_category IS '사진 카테고리: inspection(검수사진) | sample_compare(샘플비교) | inspector_site(검수원현장)';
COMMENT ON COLUMN public.inspection_photos.photo_title IS '사진 제목 (검수 사진 섹션에서 사용)';
COMMENT ON COLUMN public.inspection_photos.is_sample_ref IS 'TRUE: 오더 확정 시 샘플 기준 사진, FALSE: 현재 검수 사진';
