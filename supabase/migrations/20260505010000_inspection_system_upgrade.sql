-- ============================================================
-- KERYX 검수 시스템 전면 업그레이드 마이그레이션
-- 첨부 설계안 (admin.html, report-inspector.html, report-buyer.html,
--              report-factory.html) 기반 완전 구현
-- ============================================================

-- 1. inspections 테이블 확장 (기존 컬럼 유지 + 신규 컬럼 추가)
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS inspection_stage   TEXT DEFAULT 'PSI',  -- PSI/DUPRO/PPI/CLC
  ADD COLUMN IF NOT EXISTS product_id         UUID REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS factory_id         UUID REFERENCES public.factories(id),
  ADD COLUMN IF NOT EXISTS seller_id          UUID REFERENCES public.sellers(id),
  ADD COLUMN IF NOT EXISTS licensor_id        UUID,
  ADD COLUMN IF NOT EXISTS po_number          TEXT,
  ADD COLUMN IF NOT EXISTS sku                TEXT,
  ADD COLUMN IF NOT EXISTS product_name_ko    TEXT,
  ADD COLUMN IF NOT EXISTS product_name_cn    TEXT,
  ADD COLUMN IF NOT EXISTS unit_price_cny     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS qty_ordered        INTEGER,
  ADD COLUMN IF NOT EXISTS qty_produced       INTEGER,
  ADD COLUMN IF NOT EXISTS qty_inspected      INTEGER,
  ADD COLUMN IF NOT EXISTS qty_approved       INTEGER,
  ADD COLUMN IF NOT EXISTS shipment_unit      TEXT DEFAULT 'EA',   -- EA/SET/BOX/PCS
  ADD COLUMN IF NOT EXISTS cbm_estimated      NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS container_type     TEXT,                -- 20GP/40GP/40HQ/LCL
  ADD COLUMN IF NOT EXISTS port_of_loading    TEXT,
  ADD COLUMN IF NOT EXISTS port_of_discharge  TEXT,
  ADD COLUMN IF NOT EXISTS ship_date          DATE,
  ADD COLUMN IF NOT EXISTS inspection_date    DATE,
  ADD COLUMN IF NOT EXISTS inspection_end_date DATE,
  ADD COLUMN IF NOT EXISTS status             TEXT DEFAULT 'draft', -- draft/in_progress/review/published
  ADD COLUMN IF NOT EXISTS final_verdict      TEXT,                -- PASS/CONDITIONAL/HOLD/FAIL
  ADD COLUMN IF NOT EXISTS visibility         TEXT DEFAULT 'internal', -- public/buyer_only/internal
  ADD COLUMN IF NOT EXISTS summary_ko         TEXT,
  ADD COLUMN IF NOT EXISTS summary_cn         TEXT,
  ADD COLUMN IF NOT EXISTS inspector_quote    TEXT,
  ADD COLUMN IF NOT EXISTS key_findings       JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS completion_pct     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at       TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS published_by       UUID REFERENCES public.internal_users(id),
  ADD COLUMN IF NOT EXISTS factory_response_due DATE,
  ADD COLUMN IF NOT EXISTS factory_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS factory_qc_signature TEXT,
  ADD COLUMN IF NOT EXISTS report_version     INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS box_qty_per_carton INTEGER,
  ADD COLUMN IF NOT EXISTS total_cartons      INTEGER,
  ADD COLUMN IF NOT EXISTS gross_weight_kg    NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS net_weight_kg      NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS box_length_cm      NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS box_width_cm       NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS box_height_cm      NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS aql_major          NUMERIC(4,1) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS aql_minor          NUMERIC(4,1) DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS has_ip_license     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ip_license_no      TEXT,
  ADD COLUMN IF NOT EXISTS ip_license_valid_until DATE,
  ADD COLUMN IF NOT EXISTS ip_verified        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ip_verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 결함 유형 마스터 테이블
CREATE TABLE IF NOT EXISTS public.defect_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  name_ko     TEXT NOT NULL,
  name_cn     TEXT NOT NULL,
  grade       TEXT NOT NULL CHECK (grade IN ('critical','major','minor')),
  description_ko TEXT,
  description_cn TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 검수 결함 로그 테이블 (핵심)
CREATE TABLE IF NOT EXISTS public.inspection_defects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  defect_type_id  UUID REFERENCES public.defect_types(id),
  seq_no          INTEGER NOT NULL DEFAULT 1,
  grade           TEXT NOT NULL CHECK (grade IN ('critical','major','minor')),
  title_ko        TEXT NOT NULL,
  title_cn        TEXT,
  description_ko  TEXT,
  description_cn  TEXT,
  affected_qty    INTEGER DEFAULT 0,
  photo_url       TEXT,
  action_required TEXT,   -- rework/clean/replace/discard
  action_cn       TEXT,
  root_cause      TEXT,
  detection_stage TEXT,
  detected_by     TEXT,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','reworked','cleaned','replaced','discarded')),
  resolved_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 안전 시험 항목 테이블
CREATE TABLE IF NOT EXISTS public.inspection_safety_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  test_name_ko    TEXT NOT NULL,
  test_name_cn    TEXT,
  standard        TEXT,       -- ISO, EN71, KC 등
  measured_value  TEXT,
  result          TEXT CHECK (result IN ('pass','fail','na')),
  notes           TEXT,
  display_order   INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 검수 사진 테이블 확장 (기존 inspection_photos에 카테고리 추가)
ALTER TABLE public.inspection_photos
  ADD COLUMN IF NOT EXISTS category     TEXT DEFAULT 'gallery', -- hero/defect/gallery/packing/compare
  ADD COLUMN IF NOT EXISTS defect_id    UUID REFERENCES public.inspection_defects(id),
  ADD COLUMN IF NOT EXISTS file_size    INTEGER,
  ADD COLUMN IF NOT EXISTS mime_type    TEXT,
  ADD COLUMN IF NOT EXISTS cloud_id     TEXT,
  ADD COLUMN IF NOT EXISTS is_video     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. 리포트 발행 이력 테이블
CREATE TABLE IF NOT EXISTS public.inspection_publish_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  version_type    TEXT NOT NULL CHECK (version_type IN ('buyer','factory','inspector','licensor')),
  published_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_by    UUID REFERENCES public.internal_users(id),
  recipient_type  TEXT,     -- buyer/factory/licensor/internal
  recipient_id    UUID,
  share_url       TEXT,
  share_token     TEXT UNIQUE,
  expires_at      TIMESTAMP WITH TIME ZONE,
  view_count      INTEGER DEFAULT 0,
  last_viewed_at  TIMESTAMP WITH TIME ZONE,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  notes           TEXT
);

-- 7. 공장 마스터 확장 (검수 통계용)
ALTER TABLE public.factories
  ADD COLUMN IF NOT EXISTS audit_score    NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS total_inspections INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recent_pass_rate  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS qc_manager     TEXT,
  ADD COLUMN IF NOT EXISTS factory_portal_url TEXT;

-- 8. 검수 활동 로그 테이블
CREATE TABLE IF NOT EXISTS public.inspection_activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  user_id         UUID,
  user_type       TEXT,   -- admin/inspector/seller/factory/md
  user_name       TEXT,
  action          TEXT NOT NULL,
  description_ko  TEXT,
  description_cn  TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. IP 라이센서 테이블
CREATE TABLE IF NOT EXISTS public.ip_licensors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias           TEXT NOT NULL,
  full_name       TEXT,
  brand           TEXT,
  region          TEXT,
  license_no      TEXT,
  valid_until     DATE,
  territory       TEXT,
  status          TEXT DEFAULT 'active',
  contact_email   TEXT,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 검수 통계 뷰 (관리자/MD 대시보드용)
CREATE OR REPLACE VIEW public.v_inspection_stats AS
SELECT
  i.id,
  i.inspection_no,
  i.status,
  i.final_verdict,
  i.inspection_date,
  i.product_name_ko,
  i.product_name_cn,
  i.sku,
  i.po_number,
  i.qty_ordered,
  i.qty_inspected,
  i.qty_approved,
  i.pass_rate,
  i.factory_id,
  f.company_name AS factory_alias,
  f.province AS factory_region,
  f.rating AS factory_grade,
  i.seller_id,
  s.business_name AS seller_name,
  i.inspector_id,
  iu.name_ko AS inspector_name,
  -- 결함 집계
  COALESCE(dc.critical_count, 0) AS defects_critical,
  COALESCE(dc.major_count, 0) AS defects_major,
  COALESCE(dc.minor_count, 0) AS defects_minor,
  COALESCE(dc.total_count, 0) AS defects_total,
  -- 사진 수
  COALESCE(pc.photo_count, 0) AS photo_count,
  i.published_at,
  i.created_at,
  i.updated_at
FROM public.inspections i
LEFT JOIN public.factories f ON i.factory_id = f.id
LEFT JOIN public.sellers s ON i.seller_id = s.id
LEFT JOIN public.internal_users iu ON i.inspector_id = iu.id
LEFT JOIN (
  SELECT
    inspection_id,
    COUNT(*) FILTER (WHERE grade = 'critical') AS critical_count,
    COUNT(*) FILTER (WHERE grade = 'major') AS major_count,
    COUNT(*) FILTER (WHERE grade = 'minor') AS minor_count,
    COUNT(*) AS total_count
  FROM public.inspection_defects
  GROUP BY inspection_id
) dc ON dc.inspection_id = i.id
LEFT JOIN (
  SELECT inspection_id, COUNT(*) AS photo_count
  FROM public.inspection_photos
  GROUP BY inspection_id
) pc ON pc.inspection_id = i.id;

-- 11. 기본 결함 유형 데이터 삽입
INSERT INTO public.defect_types (code, name_ko, name_cn, grade, description_ko, description_cn) VALUES
  ('C001', '안전 위해 결함', '安全危害缺陷', 'critical', '인체에 위해를 가할 수 있는 결함', '可能对人体造成伤害的缺陷'),
  ('C002', '날카로운 모서리', '锋利边角', 'critical', '날카로운 모서리 또는 돌출부', '锋利的边角或突出部分'),
  ('C003', '유해 물질 검출', '有害物质检出', 'critical', '납, 프탈레이트 등 유해 물질 초과', '铅、邻苯二甲酸酯等有害物质超标'),
  ('M001', '인쇄 불량', '印刷不良', 'major', '색상 오차, 번짐, 누락', '颜色偏差、模糊、缺失'),
  ('M002', '봉제 불량', '缝制不良', 'major', '실밥, 터짐, 비뚤어짐', '线头、开线、歪斜'),
  ('M003', '형태 변형', '形态变形', 'major', '찌그러짐, 뒤틀림', '变形、扭曲'),
  ('M004', '색상 불일치', '颜色不一致', 'major', '승인 샘플과 색상 차이', '与确认样品颜色差异'),
  ('M005', '기능 불량', '功能不良', 'major', '지퍼, 버튼, 자석 등 기능 이상', '拉链、按钮、磁铁等功能异常'),
  ('N001', '라벨 오류', '标签错误', 'minor', '라벨 위치, 내용 오류', '标签位置、内容错误'),
  ('N002', '포장 불량', '包装不良', 'minor', '포장 상태 불량', '包装状态不良'),
  ('N003', '표면 오염', '表面污染', 'minor', '먼지, 얼룩 등 표면 오염', '灰尘、污渍等表面污染'),
  ('N004', '치수 오차', '尺寸偏差', 'minor', '허용 범위 내 치수 오차', '允许范围内的尺寸偏差')
ON CONFLICT (code) DO NOTHING;

-- 12. RLS 정책 설정
ALTER TABLE public.inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_safety_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_publish_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_licensors ENABLE ROW LEVEL SECURITY;

-- 관리자/검수원: 전체 접근
CREATE POLICY "admin_full_access_defects" ON public.inspection_defects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.internal_users WHERE id = auth.uid() AND role IN ('admin','inspector','md'))
  );

CREATE POLICY "admin_full_access_safety" ON public.inspection_safety_tests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.internal_users WHERE id = auth.uid() AND role IN ('admin','inspector','md'))
  );

CREATE POLICY "admin_full_access_publish" ON public.inspection_publish_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.internal_users WHERE id = auth.uid() AND role IN ('admin','inspector','md'))
  );

CREATE POLICY "admin_full_access_activity" ON public.inspection_activity_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.internal_users WHERE id = auth.uid() AND role IN ('admin','inspector','md'))
  );

-- 셀러: 자신의 검수 결함 조회만 가능
CREATE POLICY "seller_read_own_defects" ON public.inspection_defects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.sellers s ON i.seller_id = s.id
      WHERE i.id = inspection_id AND s.user_id = auth.uid()
    )
  );

-- 결함 유형: 모두 읽기 가능
CREATE POLICY "defect_types_read_all" ON public.defect_types
  FOR SELECT USING (TRUE);

-- IP 라이센서: 관리자만
CREATE POLICY "admin_licensors" ON public.ip_licensors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.internal_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 13. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspections_updated_at ON public.inspections;
CREATE TRIGGER inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 14. 검수 완료 시 공장 통계 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_factory_inspection_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.factory_id IS NOT NULL AND NEW.status = 'published' THEN
    UPDATE public.factories
    SET
      total_inspections = (
        SELECT COUNT(*) FROM public.inspections
        WHERE factory_id = NEW.factory_id AND status = 'published'
      ),
      recent_pass_rate = (
        SELECT AVG(pass_rate) FROM public.inspections
        WHERE factory_id = NEW.factory_id
          AND status = 'published'
          AND inspection_date >= CURRENT_DATE - INTERVAL '90 days'
      )
    WHERE id = NEW.factory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_factory_stats ON public.inspections;
CREATE TRIGGER inspection_factory_stats
  AFTER INSERT OR UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_factory_inspection_stats();

-- 15. 공유 링크 토큰 생성 함수
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64url');
END;
$$ LANGUAGE plpgsql;
