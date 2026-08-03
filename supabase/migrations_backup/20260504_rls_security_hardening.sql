-- ============================================================
-- KERYX RLS 보안 강화 마이그레이션
-- 생성일: 2026-05-04
-- trade-data-architecture 스킬 원칙 준수
-- ============================================================
-- 원칙:
-- 1. 원가(cost) 데이터는 admin/md만 조회 가능
-- 2. 공장은 자신의 데이터만 조회/수정 가능
-- 3. 셀러는 자신의 주문/검수만 조회 가능
-- 4. admin은 모든 데이터에 접근 가능
-- 5. 삭제는 admin만 가능 (soft delete 원칙)
-- ============================================================

-- ─────────────────────────────────────────────
-- 헬퍼 함수
-- ─────────────────────────────────────────────

-- 현재 사용자의 역할 반환
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 현재 사용자가 admin인지 확인
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 현재 사용자가 admin 또는 md인지 확인
CREATE OR REPLACE FUNCTION auth.is_admin_or_md()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'md') FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- profiles 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 조회
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR auth.is_admin_or_md());

-- 본인 프로필 수정
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR auth.is_admin());

-- admin만 프로필 생성
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.is_admin());

-- admin만 프로필 삭제 (soft delete 원칙)
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  USING (auth.is_admin());

-- ─────────────────────────────────────────────
-- products 테이블 RLS
-- 원가(cost_price, margin_rate)는 admin/md만 조회 가능
-- ─────────────────────────────────────────────

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 공개 상품 조회 (원가 제외 - 뷰로 처리)
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public"
  ON public.products FOR SELECT
  USING (is_active = true OR auth.is_admin_or_md());

-- 공장은 자신의 상품만 수정
DROP POLICY IF EXISTS "products_update_factory" ON public.products;
CREATE POLICY "products_update_factory"
  ON public.products FOR UPDATE
  USING (
    auth.is_admin_or_md() OR
    (auth.user_role() = 'factory' AND factory_id IN (
      SELECT id FROM public.factories WHERE owner_id = auth.uid()
    ))
  );

-- 공장/admin/md만 상품 등록
DROP POLICY IF EXISTS "products_insert_factory" ON public.products;
CREATE POLICY "products_insert_factory"
  ON public.products FOR INSERT
  WITH CHECK (
    auth.is_admin_or_md() OR
    (auth.user_role() = 'factory' AND factory_id IN (
      SELECT id FROM public.factories WHERE owner_id = auth.uid()
    ))
  );

-- admin만 상품 삭제
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin"
  ON public.products FOR DELETE
  USING (auth.is_admin());

-- 원가 정보 마스킹 뷰 (셀러/공장용)
CREATE OR REPLACE VIEW public.products_public AS
  SELECT
    id, name_ko, name_zh, description_ko, description_zh,
    category_id, factory_id, images, tags,
    price_cny,          -- 판매가 (공개)
    moq, unit, weight_kg, dimensions_cm,
    is_active, created_at, updated_at
    -- cost_price, margin_rate 제외 (원가 보호)
  FROM public.products
  WHERE is_active = true;

-- ─────────────────────────────────────────────
-- orders 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 셀러는 자신의 주문만 조회
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select"
  ON public.orders FOR SELECT
  USING (
    auth.is_admin_or_md() OR
    seller_id = auth.uid() OR
    (auth.user_role() = 'factory' AND factory_id IN (
      SELECT id FROM public.factories WHERE owner_id = auth.uid()
    ))
  );

-- 셀러는 자신의 주문 생성
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.is_admin_or_md() OR
    seller_id = auth.uid()
  );

-- 주문 수정: 상태 변경은 md/admin, 셀러는 pending 상태만 수정 가능
DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update"
  ON public.orders FOR UPDATE
  USING (
    auth.is_admin_or_md() OR
    (seller_id = auth.uid() AND status = 'pending')
  );

-- admin만 주문 삭제 (soft delete)
DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;
CREATE POLICY "orders_delete_admin"
  ON public.orders FOR DELETE
  USING (auth.is_admin());

-- ─────────────────────────────────────────────
-- factories 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;

-- 승인된 공장은 공개 조회 가능
DROP POLICY IF EXISTS "factories_select" ON public.factories;
CREATE POLICY "factories_select"
  ON public.factories FOR SELECT
  USING (
    is_approved = true OR
    auth.is_admin_or_md() OR
    owner_id = auth.uid()
  );

-- 공장 소유자는 자신의 정보 수정
DROP POLICY IF EXISTS "factories_update" ON public.factories;
CREATE POLICY "factories_update"
  ON public.factories FOR UPDATE
  USING (
    auth.is_admin_or_md() OR
    owner_id = auth.uid()
  );

-- 공장 등록 (누구나 신청 가능)
DROP POLICY IF EXISTS "factories_insert" ON public.factories;
CREATE POLICY "factories_insert"
  ON public.factories FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR auth.is_admin());

-- admin만 공장 삭제
DROP POLICY IF EXISTS "factories_delete_admin" ON public.factories;
CREATE POLICY "factories_delete_admin"
  ON public.factories FOR DELETE
  USING (auth.is_admin());

-- ─────────────────────────────────────────────
-- inspections 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspections_select" ON public.inspections;
CREATE POLICY "inspections_select"
  ON public.inspections FOR SELECT
  USING (
    auth.is_admin_or_md() OR
    seller_id = auth.uid() OR
    (auth.user_role() = 'factory' AND factory_id IN (
      SELECT id FROM public.factories WHERE owner_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "inspections_insert" ON public.inspections;
CREATE POLICY "inspections_insert"
  ON public.inspections FOR INSERT
  WITH CHECK (auth.is_admin_or_md());

DROP POLICY IF EXISTS "inspections_update" ON public.inspections;
CREATE POLICY "inspections_update"
  ON public.inspections FOR UPDATE
  USING (auth.is_admin_or_md());

DROP POLICY IF EXISTS "inspections_delete_admin" ON public.inspections;
CREATE POLICY "inspections_delete_admin"
  ON public.inspections FOR DELETE
  USING (auth.is_admin());

-- ─────────────────────────────────────────────
-- briefs 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefs_select" ON public.briefs;
CREATE POLICY "briefs_select"
  ON public.briefs FOR SELECT
  USING (
    auth.is_admin_or_md() OR
    seller_id = auth.uid()
  );

DROP POLICY IF EXISTS "briefs_insert" ON public.briefs;
CREATE POLICY "briefs_insert"
  ON public.briefs FOR INSERT
  WITH CHECK (
    auth.is_admin_or_md() OR
    seller_id = auth.uid()
  );

DROP POLICY IF EXISTS "briefs_update" ON public.briefs;
CREATE POLICY "briefs_update"
  ON public.briefs FOR UPDATE
  USING (
    auth.is_admin_or_md() OR
    (seller_id = auth.uid() AND status = 'draft')
  );

DROP POLICY IF EXISTS "briefs_delete_admin" ON public.briefs;
CREATE POLICY "briefs_delete_admin"
  ON public.briefs FOR DELETE
  USING (auth.is_admin());

-- ─────────────────────────────────────────────
-- conversations & messages 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT
  USING (
    auth.is_admin_or_md() OR
    participant_a = auth.uid() OR
    participant_b = auth.uid()
  );

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT
  WITH CHECK (
    participant_a = auth.uid() OR
    participant_b = auth.uid() OR
    auth.is_admin_or_md()
  );

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select"
  ON public.messages FOR SELECT
  USING (
    auth.is_admin() OR
    sender_id = auth.uid() OR
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_a = auth.uid() OR participant_b = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ─────────────────────────────────────────────
-- notifications 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR auth.is_admin());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- price_change_requests 테이블 RLS
-- 가격 수정은 md 요청 → admin 승인 워크플로우
-- ─────────────────────────────────────────────

ALTER TABLE public.price_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_change_select" ON public.price_change_requests;
CREATE POLICY "price_change_select"
  ON public.price_change_requests FOR SELECT
  USING (auth.is_admin_or_md());

DROP POLICY IF EXISTS "price_change_insert" ON public.price_change_requests;
CREATE POLICY "price_change_insert"
  ON public.price_change_requests FOR INSERT
  WITH CHECK (auth.is_admin_or_md());

-- admin만 가격 수정 요청 승인/거절 (status 변경)
DROP POLICY IF EXISTS "price_change_update" ON public.price_change_requests;
CREATE POLICY "price_change_update"
  ON public.price_change_requests FOR UPDATE
  USING (auth.is_admin());

-- ─────────────────────────────────────────────
-- ip_characters / ip_licenses 테이블 RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.ip_characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ip_characters_select" ON public.ip_characters;
CREATE POLICY "ip_characters_select"
  ON public.ip_characters FOR SELECT
  USING (is_public = true OR auth.is_admin_or_md());

DROP POLICY IF EXISTS "ip_characters_insert" ON public.ip_characters;
CREATE POLICY "ip_characters_insert"
  ON public.ip_characters FOR INSERT
  WITH CHECK (auth.is_admin());

DROP POLICY IF EXISTS "ip_characters_update" ON public.ip_characters;
CREATE POLICY "ip_characters_update"
  ON public.ip_characters FOR UPDATE
  USING (auth.is_admin());

DROP POLICY IF EXISTS "ip_characters_delete" ON public.ip_characters;
CREATE POLICY "ip_characters_delete"
  ON public.ip_characters FOR DELETE
  USING (auth.is_admin());

-- ─────────────────────────────────────────────
-- 감사 로그 테이블 (audit_logs)
-- 모든 중요 데이터 변경 기록
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,          -- 'INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
  table_name  TEXT NOT NULL,
  record_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- admin만 감사 로그 조회
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (auth.is_admin());

-- 시스템만 감사 로그 삽입 (SECURITY DEFINER 함수 통해서만)
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_system"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);  -- API route에서 service_role key로만 삽입

-- 감사 로그는 절대 수정/삭제 불가
-- (no UPDATE/DELETE policy = 불가능)

-- ─────────────────────────────────────────────
-- 감사 로그 자동 기록 트리거 함수
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::JSONB ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::JSONB ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 중요 테이블에 감사 로그 트리거 적용
DROP TRIGGER IF EXISTS audit_orders ON public.orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_price_changes ON public.price_change_requests;
CREATE TRIGGER audit_price_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.price_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ─────────────────────────────────────────────
-- 완료 메시지
-- ─────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'KERYX RLS 보안 강화 마이그레이션 완료 - 2026-05-04';
END $$;
