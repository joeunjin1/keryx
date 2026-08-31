-- =============================================================================
-- KERYX Phase 0: 승인 바이어 전용 최근 14일 신상품·샘플 발견 서비스
-- =============================================================================
-- 목적
--   1) 기존 sellers / b2b_subscribers / 상품 / 주문 데이터를 변경·삭제하지 않는다.
--   2) 회사 검증, 구독 접근, 신상품 게시·만료, 검토·열람 이력을 별도 테이블로 추가한다.
--   3) 승인된 seller 계정만 서버·DB 수준에서 최근 14일 이내 신상품 피드를 읽게 한다.
--   4) 사업자등록증은 새 비공개 Storage 버킷에만 보관하며 public URL을 쓰지 않는다.
--
-- 적용 전제
--   - Production 실제 스키마 확인: sellers.id / sellers.user_id / user_profiles.kind
--   - 이 파일은 새 테이블·함수·정책·뷰·버킷만 추가한다.
--   - 기존 b2b_subscribers는 legacy 이력으로 유지한다.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. 권한·연결 보조 함수: user_profiles.kind과 sellers.user_id를 단일 기준으로 사용
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.keryx_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles profile
    WHERE profile.id = auth.uid()
      AND profile.kind::text = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.keryx_current_seller_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT seller.id
  FROM public.sellers seller
  INNER JOIN public.user_profiles profile
    ON profile.id = auth.uid()
   AND profile.kind::text = 'seller'
  WHERE seller.user_id = auth.uid()
  ORDER BY seller.id ASC
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- 2. 회사 검증 이력: 기존 sellers 행을 넓히지 않고 제출 시점의 증빙을 보존
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_company_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE RESTRICT,
  submitter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  legacy_subscriber_id uuid NULL REFERENCES public.b2b_subscribers(id) ON DELETE SET NULL,
  company_name_snapshot text NOT NULL,
  business_registration_no_snapshot text NOT NULL,
  legal_representative_snapshot text NULL,
  contact_name_snapshot text NOT NULL,
  contact_email_snapshot text NOT NULL,
  contact_phone_snapshot text NOT NULL,
  business_address_snapshot text NOT NULL,
  business_type_snapshot text NOT NULL,
  license_storage_path text NOT NULL,
  privacy_consent_at timestamptz NOT NULL,
  marketing_consent_at timestamptz NULL,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'submitted',
      'under_review',
      'revision_requested',
      'approved',
      'rejected',
      'reverification_required',
      'revoked'
    )),
  reviewer_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note text NULL,
  reviewed_at timestamptz NULL,
  decision_reason text NULL,
  is_current boolean NOT NULL DEFAULT true,
  superseded_by uuid NULL REFERENCES public.buyer_company_verifications(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buyer_company_verifications_license_path_check
    CHECK (license_storage_path LIKE 'buyer-verification-documents/%'),
  CONSTRAINT buyer_company_verifications_review_check
    CHECK (
      (status IN ('approved', 'rejected', 'revision_requested', 'revoked')
        AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)
      OR status IN ('submitted', 'under_review', 'reverification_required')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyer_company_verifications_current_seller
  ON public.buyer_company_verifications (seller_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_buyer_company_verifications_status
  ON public.buyer_company_verifications (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyer_company_verifications_user
  ON public.buyer_company_verifications (submitter_user_id, created_at DESC);

-- 검토 결정은 수정하지 않는 행 추가 방식으로 보존한다.
CREATE TABLE IF NOT EXISTS public.buyer_company_verification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.buyer_company_verifications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('under_review', 'revision_requested', 'approved', 'rejected', 'revoked')),
  from_status text NOT NULL,
  to_status text NOT NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_company_verification_reviews_verification
  ON public.buyer_company_verification_reviews (verification_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. 접근 상태: 포털 열람 권한과 이메일 수신 동의를 분리
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_discovery_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE REFERENCES public.sellers(id) ON DELETE RESTRICT,
  current_verification_id uuid NULL REFERENCES public.buyer_company_verifications(id) ON DELETE SET NULL,
  legacy_subscriber_id uuid NULL REFERENCES public.b2b_subscribers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN (
      'pending_verification',
      'active',
      'unsubscribed',
      'suspended',
      'reverification_required',
      'rejected',
      'revoked'
    )),
  interest_ip_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  interest_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  email_consent_at timestamptz NULL,
  email_unsubscribed_at timestamptz NULL,
  activated_at timestamptz NULL,
  activated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at timestamptz NULL,
  suspended_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buyer_discovery_access_active_check
    CHECK (
      status <> 'active'
      OR (current_verification_id IS NOT NULL AND activated_at IS NOT NULL AND activated_by IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_buyer_discovery_access_status
  ON public.buyer_discovery_access (status, updated_at DESC);

-- 인증 상태와 구독 접근을 하나의 트랜잭션으로 결정한다. API는 사전에 requireAdmin()을 통과해야 하며,
-- 이 함수는 authenticated/anon 권한에 공개하지 않는다.
CREATE OR REPLACE FUNCTION public.decide_buyer_company_verification(
  p_verification_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (verification_id uuid, seller_id uuid, verification_status text, access_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  verification_row public.buyer_company_verifications%ROWTYPE;
  next_access_status text;
BEGIN
  IF p_decision NOT IN ('approved', 'revision_requested', 'rejected', 'revoked') THEN
    RAISE EXCEPTION 'Unsupported verification decision';
  END IF;

  SELECT * INTO verification_row
  FROM public.buyer_company_verifications
  WHERE id = p_verification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;

  IF verification_row.is_current IS NOT TRUE THEN
    RAISE EXCEPTION 'Only the current verification can be decided';
  END IF;

  IF p_decision = 'approved' THEN
    next_access_status := 'active';
  ELSIF p_decision = 'revision_requested' THEN
    next_access_status := 'reverification_required';
  ELSE
    next_access_status := p_decision;
  END IF;

  UPDATE public.buyer_company_verifications
  SET status = p_decision,
      reviewer_id = p_reviewer_id,
      reviewer_note = p_reason,
      decision_reason = p_reason,
      reviewed_at = now()
  WHERE id = verification_row.id;

  INSERT INTO public.buyer_company_verification_reviews (
    verification_id, reviewer_id, action, from_status, to_status, reason
  ) VALUES (
    verification_row.id, p_reviewer_id, p_decision, verification_row.status, p_decision, p_reason
  );

  INSERT INTO public.buyer_discovery_access (
    seller_id, current_verification_id, legacy_subscriber_id, status,
    email_consent_at, email_unsubscribed_at, activated_at, activated_by,
    suspended_at, suspended_by, status_reason
  ) VALUES (
    verification_row.seller_id,
    verification_row.id,
    verification_row.legacy_subscriber_id,
    next_access_status,
    verification_row.marketing_consent_at,
    CASE WHEN verification_row.marketing_consent_at IS NULL THEN now() ELSE NULL END,
    CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END,
    CASE WHEN p_decision = 'approved' THEN p_reviewer_id ELSE NULL END,
    CASE WHEN p_decision = 'revoked' THEN now() ELSE NULL END,
    CASE WHEN p_decision = 'revoked' THEN p_reviewer_id ELSE NULL END,
    p_reason
  )
  ON CONFLICT (seller_id) DO UPDATE
  SET current_verification_id = EXCLUDED.current_verification_id,
      legacy_subscriber_id = EXCLUDED.legacy_subscriber_id,
      status = EXCLUDED.status,
      email_consent_at = EXCLUDED.email_consent_at,
      email_unsubscribed_at = EXCLUDED.email_unsubscribed_at,
      activated_at = CASE WHEN EXCLUDED.status = 'active' THEN EXCLUDED.activated_at ELSE public.buyer_discovery_access.activated_at END,
      activated_by = CASE WHEN EXCLUDED.status = 'active' THEN EXCLUDED.activated_by ELSE public.buyer_discovery_access.activated_by END,
      suspended_at = CASE WHEN EXCLUDED.status = 'revoked' THEN EXCLUDED.suspended_at ELSE public.buyer_discovery_access.suspended_at END,
      suspended_by = CASE WHEN EXCLUDED.status = 'revoked' THEN EXCLUDED.suspended_by ELSE public.buyer_discovery_access.suspended_by END,
      status_reason = EXCLUDED.status_reason;

  RETURN QUERY
  SELECT verification_row.id, verification_row.seller_id, p_decision, next_access_status;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. 신상품·샘플 게시: 가격·공장 원가·공장 연락처를 포함하지 않는 안전한 원본
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.new_product_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'operator'
    CHECK (source_type IN ('operator', 'factory', 'ip', 'product')),
  source_factory_id uuid NULL REFERENCES public.factories(id) ON DELETE SET NULL,
  source_product_id uuid NULL REFERENCES public.products(id) ON DELETE SET NULL,
  title_ko text NOT NULL,
  title_zh text NULL,
  summary_ko text NOT NULL DEFAULT '',
  summary_zh text NULL,
  category_slug text NOT NULL,
  ip_slug text NULL,
  sample_available boolean NOT NULL DEFAULT false,
  customization_scope_ko text NULL,
  customization_scope_zh text NULL,
  visible_moq_note_ko text NULL,
  visible_moq_note_zh text NULL,
  visible_lead_time_note_ko text NULL,
  visible_lead_time_note_zh text NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'submitted',
      'revision_requested',
      'approved',
      'published',
      'expired',
      'archived',
      'rejected'
    )),
  approved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  published_at timestamptz NULL,
  expires_at timestamptz NULL,
  reissue_of uuid NULL REFERENCES public.new_product_offerings(id) ON DELETE SET NULL,
  reissue_reason text NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT new_product_offerings_published_window_check
    CHECK (
      status NOT IN ('published', 'expired', 'archived')
      OR (
        approved_by IS NOT NULL
        AND approved_at IS NOT NULL
        AND published_at IS NOT NULL
        AND expires_at = published_at + interval '14 days'
      )
    ),
  CONSTRAINT new_product_offerings_reissue_check
    CHECK (
      reissue_of IS NULL
      OR reissue_reason IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_new_product_offerings_feed
  ON public.new_product_offerings (status, published_at DESC, expires_at);

CREATE INDEX IF NOT EXISTS idx_new_product_offerings_category
  ON public.new_product_offerings (category_slug, status, published_at DESC);

CREATE TABLE IF NOT EXISTS public.new_product_offering_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES public.new_product_offerings(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_kind text NOT NULL DEFAULT 'image'
    CHECK (media_kind IN ('image', 'video', 'document')),
  rendition text NOT NULL DEFAULT 'display'
    CHECK (rendition IN ('thumbnail', 'display', 'reference')),
  alt_ko text NULL,
  alt_zh text NULL,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  buyer_visible boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT new_product_offering_assets_storage_path_check
    CHECK (storage_path LIKE 'approved-buyer-discovery-media/%'),
  UNIQUE (offering_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_new_product_offering_assets_public
  ON public.new_product_offering_assets (offering_id, buyer_visible, sort_order);

-- 검토 내역은 갱신하지 않는 행 추가 방식으로 보존한다.
CREATE TABLE IF NOT EXISTS public.new_product_offering_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES public.new_product_offerings(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL
    CHECK (action IN ('submitted', 'revision_requested', 'approved', 'published', 'rejected', 'expired', 'archived', 'reissued')),
  from_status text NULL,
  to_status text NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_new_product_offering_reviews_offering
  ON public.new_product_offering_reviews (offering_id, created_at DESC);

-- 바이어의 발견·저장·전환 이벤트는 개인별로 분리하고 원본 디자인·가격을 넣지 않는다.
CREATE TABLE IF NOT EXISTS public.buyer_discovery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL REFERENCES public.new_product_offerings(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('viewed', 'saved', 'unsaved', 'sample_requested', 'plan_requested')),
  project_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_discovery_events_seller
  ON public.buyer_discovery_events (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyer_discovery_events_offering
  ON public.buyer_discovery_events (offering_id, event_type, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. 시간·상태 무결성 트리거
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.keryx_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyer_company_verifications_updated_at ON public.buyer_company_verifications;
CREATE TRIGGER trg_buyer_company_verifications_updated_at
  BEFORE UPDATE ON public.buyer_company_verifications
  FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

DROP TRIGGER IF EXISTS trg_buyer_discovery_access_updated_at ON public.buyer_discovery_access;
CREATE TRIGGER trg_buyer_discovery_access_updated_at
  BEFORE UPDATE ON public.buyer_discovery_access
  FOR EACH ROW EXECUTE FUNCTION public.keryx_set_updated_at();

CREATE OR REPLACE FUNCTION public.keryx_guard_new_product_offering_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
        RAISE EXCEPTION 'approved_by and approved_at are required before publishing';
      END IF;
      NEW.published_at := COALESCE(NEW.published_at, now());
      NEW.expires_at := NEW.published_at + interval '14 days';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- 최초 게시 전환에서만 게시 시각과 14일 만료 시각을 부여한다.
  IF OLD.status <> 'published' AND NEW.status = 'published' THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'approved_by and approved_at are required before publishing';
    END IF;
    NEW.published_at := now();
    NEW.expires_at := NEW.published_at + interval '14 days';
  END IF;

  -- 이미 게시된 행은 재게시할 수 없다. 새 행과 reissue_reason을 써야 한다.
  IF OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'published_at cannot be changed; create a reissue record instead';
  END IF;

  IF OLD.expires_at IS NOT NULL AND NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'expires_at cannot be changed; the 14-day window is immutable';
  END IF;

  IF OLD.status IN ('published', 'expired', 'archived') AND NEW.status = 'published' THEN
    RAISE EXCEPTION 'published/expired/archived offering cannot be published again; create a reissue record';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_product_offering_window ON public.new_product_offerings;
CREATE TRIGGER trg_new_product_offering_window
  BEFORE INSERT OR UPDATE ON public.new_product_offerings
  FOR EACH ROW EXECUTE FUNCTION public.keryx_guard_new_product_offering_window();

-- 운영자 검토·승인·게시 상태를 원자적으로 전이한다. 게시 시 14일 고정 노출 기간은 트리거가 부여한다.
CREATE OR REPLACE FUNCTION public.transition_new_product_offering(
  p_offering_id uuid,
  p_actor_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS TABLE (offering_id uuid, previous_status text, current_status text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offering_row public.new_product_offerings%ROWTYPE;
  target_status text;
BEGIN
  IF p_action NOT IN ('submitted', 'revision_requested', 'approved', 'rejected', 'published', 'archived') THEN
    RAISE EXCEPTION 'Unsupported offering transition';
  END IF;

  SELECT * INTO offering_row
  FROM public.new_product_offerings
  WHERE id = p_offering_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offering not found';
  END IF;

  target_status := p_action;
  IF p_action = 'submitted' AND offering_row.status NOT IN ('draft', 'revision_requested', 'rejected') THEN
    RAISE EXCEPTION 'Only draft, revision requested, or rejected offerings may be submitted';
  ELSIF p_action = 'revision_requested' AND offering_row.status NOT IN ('submitted', 'approved') THEN
    RAISE EXCEPTION 'Only submitted or approved offerings may receive a revision request';
  ELSIF p_action = 'approved' AND offering_row.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted offerings may be approved';
  ELSIF p_action = 'rejected' AND offering_row.status NOT IN ('submitted', 'approved') THEN
    RAISE EXCEPTION 'Only submitted or approved offerings may be rejected';
  ELSIF p_action = 'published' AND offering_row.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved offerings may be published';
  ELSIF p_action = 'archived' AND offering_row.status NOT IN ('expired', 'rejected') THEN
    RAISE EXCEPTION 'Only expired or rejected offerings may be archived';
  END IF;

  UPDATE public.new_product_offerings
  SET status = target_status,
      approved_by = CASE WHEN p_action = 'approved' THEN p_actor_id ELSE approved_by END,
      approved_at = CASE WHEN p_action = 'approved' THEN now() ELSE approved_at END
  WHERE id = offering_row.id;

  INSERT INTO public.new_product_offering_reviews (
    offering_id, actor_id, action, from_status, to_status, note
  ) VALUES (
    offering_row.id, p_actor_id, p_action, offering_row.status, target_status, p_note
  );

  RETURN QUERY
  SELECT id, offering_row.status, status, expires_at
  FROM public.new_product_offerings
  WHERE id = offering_row.id;
END;
$$;

-- Scheduler·관리자 작업에서 호출한다. 삭제가 아니라 상태만 만료로 바꾼다.
CREATE OR REPLACE FUNCTION public.expire_new_product_offerings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE public.new_product_offerings
  SET status = 'expired'
  WHERE status = 'published'
    AND expires_at <= now();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. 바이어 피드 보안 게이트와 노출 전용 뷰
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.keryx_has_active_discovery_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sellers seller
    INNER JOIN public.user_profiles profile
      ON profile.id = auth.uid()
     AND profile.kind::text = 'seller'
    INNER JOIN public.buyer_discovery_access access
      ON access.seller_id = seller.id
     AND access.status = 'active'
    INNER JOIN public.buyer_company_verifications verification
      ON verification.id = access.current_verification_id
     AND verification.seller_id = seller.id
     AND verification.is_current = true
     AND verification.status = 'approved'
    WHERE seller.user_id = auth.uid()
  );
$$;

-- 안전한 피드: 공장 ID, 공장 원가, 판매가, 마진, 바이어 데이터는 선택하지 않는다.
DROP VIEW IF EXISTS public.v_approved_buyer_new_product_feed;
CREATE VIEW public.v_approved_buyer_new_product_feed
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  offering.id,
  offering.title_ko,
  offering.title_zh,
  offering.summary_ko,
  offering.summary_zh,
  offering.category_slug,
  offering.ip_slug,
  offering.sample_available,
  offering.customization_scope_ko,
  offering.customization_scope_zh,
  offering.visible_moq_note_ko,
  offering.visible_moq_note_zh,
  offering.visible_lead_time_note_ko,
  offering.visible_lead_time_note_zh,
  offering.published_at,
  offering.expires_at
FROM public.new_product_offerings offering
WHERE offering.status = 'published'
  AND offering.published_at <= now()
  AND offering.expires_at > now()
  AND public.keryx_has_active_discovery_access();

REVOKE ALL ON public.buyer_company_verifications FROM anon, authenticated;
REVOKE ALL ON public.buyer_company_verification_reviews FROM anon, authenticated;
REVOKE ALL ON public.buyer_discovery_access FROM anon, authenticated;
REVOKE ALL ON public.new_product_offerings FROM anon, authenticated;
REVOKE ALL ON public.new_product_offering_assets FROM anon, authenticated;
REVOKE ALL ON public.new_product_offering_reviews FROM anon, authenticated;
REVOKE ALL ON public.buyer_discovery_events FROM anon, authenticated;
REVOKE ALL ON public.v_approved_buyer_new_product_feed FROM anon;
GRANT SELECT ON public.v_approved_buyer_new_product_feed TO authenticated;
REVOKE ALL ON FUNCTION public.keryx_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keryx_current_seller_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.keryx_has_active_discovery_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_new_product_offerings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_new_product_offering(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_buyer_company_verification(uuid, uuid, text, text) FROM PUBLIC;
-- 아래 세 보조 함수는 RLS 정책 평가에만 쓰며, 호출자 자신의 ID/접근 여부만 반환한다.
GRANT EXECUTE ON FUNCTION public.keryx_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.keryx_current_seller_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.keryx_has_active_discovery_access() TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. RLS: 기본 거부, 바이어는 자기 검증·접근 상태만, 운영자는 전체 관리
-- -----------------------------------------------------------------------------
ALTER TABLE public.buyer_company_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_company_verification_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_discovery_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_product_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_product_offering_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_product_offering_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_discovery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buyer_company_verifications_admin_all ON public.buyer_company_verifications;
CREATE POLICY buyer_company_verifications_admin_all
  ON public.buyer_company_verifications
  FOR ALL
  USING (public.keryx_is_admin())
  WITH CHECK (public.keryx_is_admin());

DROP POLICY IF EXISTS buyer_company_verifications_buyer_read_own ON public.buyer_company_verifications;
CREATE POLICY buyer_company_verifications_buyer_read_own
  ON public.buyer_company_verifications
  FOR SELECT
  USING (seller_id = public.keryx_current_seller_id());

DROP POLICY IF EXISTS buyer_company_verification_reviews_admin_all ON public.buyer_company_verification_reviews;
CREATE POLICY buyer_company_verification_reviews_admin_all
  ON public.buyer_company_verification_reviews
  FOR ALL
  USING (public.keryx_is_admin())
  WITH CHECK (public.keryx_is_admin());

DROP POLICY IF EXISTS buyer_discovery_access_admin_all ON public.buyer_discovery_access;
CREATE POLICY buyer_discovery_access_admin_all
  ON public.buyer_discovery_access
  FOR ALL
  USING (public.keryx_is_admin())
  WITH CHECK (public.keryx_is_admin());

DROP POLICY IF EXISTS buyer_discovery_access_buyer_read_own ON public.buyer_discovery_access;
CREATE POLICY buyer_discovery_access_buyer_read_own
  ON public.buyer_discovery_access
  FOR SELECT
  USING (seller_id = public.keryx_current_seller_id());

DROP POLICY IF EXISTS new_product_offerings_admin_all ON public.new_product_offerings;
CREATE POLICY new_product_offerings_admin_all
  ON public.new_product_offerings
  FOR ALL
  USING (public.keryx_is_admin())
  WITH CHECK (public.keryx_is_admin());

DROP POLICY IF EXISTS new_product_offering_assets_admin_all ON public.new_product_offering_assets;
CREATE POLICY new_product_offering_assets_admin_all
  ON public.new_product_offering_assets
  FOR ALL
  USING (public.keryx_is_admin())
  WITH CHECK (public.keryx_is_admin());

DROP POLICY IF EXISTS new_product_offering_reviews_admin_all ON public.new_product_offering_reviews;
CREATE POLICY new_product_offering_reviews_admin_all
  ON public.new_product_offering_reviews
  FOR ALL
  USING (public.keryx_is_admin())
  WITH CHECK (public.keryx_is_admin());

DROP POLICY IF EXISTS buyer_discovery_events_admin_all ON public.buyer_discovery_events;
CREATE POLICY buyer_discovery_events_admin_all
  ON public.buyer_discovery_events
  FOR ALL
  USING (public.keryx_is_admin())
  WITH CHECK (public.keryx_is_admin());

DROP POLICY IF EXISTS buyer_discovery_events_buyer_read_own ON public.buyer_discovery_events;
CREATE POLICY buyer_discovery_events_buyer_read_own
  ON public.buyer_discovery_events
  FOR SELECT
  USING (seller_id = public.keryx_current_seller_id());

-- -----------------------------------------------------------------------------
-- 8. 비공개 Storage: 사업자등록증·승인 바이어 전용 신상품 미디어
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'buyer-verification-documents',
  'buyer-verification-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'approved-buyer-discovery-media',
  'approved-buyer-discovery-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS buyer_verification_documents_buyer_insert ON storage.objects;
CREATE POLICY buyer_verification_documents_buyer_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'buyer-verification-documents'
    AND (storage.foldername(name))[1] = public.keryx_current_seller_id()::text
  );

DROP POLICY IF EXISTS buyer_verification_documents_buyer_select ON storage.objects;
CREATE POLICY buyer_verification_documents_buyer_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'buyer-verification-documents'
    AND (storage.foldername(name))[1] = public.keryx_current_seller_id()::text
  );

DROP POLICY IF EXISTS buyer_verification_documents_buyer_delete ON storage.objects;
CREATE POLICY buyer_verification_documents_buyer_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'buyer-verification-documents'
    AND (storage.foldername(name))[1] = public.keryx_current_seller_id()::text
  );

DROP POLICY IF EXISTS buyer_verification_documents_admin_all ON storage.objects;
CREATE POLICY buyer_verification_documents_admin_all
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'buyer-verification-documents'
    AND public.keryx_is_admin()
  )
  WITH CHECK (
    bucket_id = 'buyer-verification-documents'
    AND public.keryx_is_admin()
  );

-- 신상품 미디어는 운영자만 업로드·관리하고, 바이어에게는 승인된 서버 API가 단기 서명 URL만 제공한다.
DROP POLICY IF EXISTS approved_buyer_discovery_media_admin_all ON storage.objects;
CREATE POLICY approved_buyer_discovery_media_admin_all
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'approved-buyer-discovery-media'
    AND public.keryx_is_admin()
  )
  WITH CHECK (
    bucket_id = 'approved-buyer-discovery-media'
    AND public.keryx_is_admin()
  );

COMMIT;

-- =============================================================================
-- 운영 배포 전 검증 SQL (별도 실행, 데이터 변경 없음)
-- =============================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'buyer_company_verifications', 'buyer_discovery_access',
--     'new_product_offerings', 'new_product_offering_assets',
--     'new_product_offering_reviews', 'buyer_discovery_events'
--   )
-- ORDER BY tablename;
--
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id IN ('buyer-verification-documents', 'approved-buyer-discovery-media')
-- ORDER BY id;
--
-- SELECT table_name, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'buyer_company_verifications', 'buyer_discovery_access',
--     'new_product_offerings', 'new_product_offering_assets',
--     'new_product_offering_reviews', 'buyer_discovery_events'
--   )
-- ORDER BY table_name, policyname;
-- =============================================================================
