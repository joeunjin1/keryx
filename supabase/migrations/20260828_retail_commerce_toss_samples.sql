-- ============================================================================
-- KERYX 소매 쇼핑몰 · 토스페이먼츠 · 샘플 구독 기반
-- 작성일: 2026-08-28
-- 원칙: 기존 B2B 상품·주문·구독 테이블의 컬럼과 데이터를 삭제·변경하지 않는다.
--       소매 판매는 retail_* 테이블 및 products의 retail_* 확장 컬럼으로 분리한다.
--       결제수단 정보·토스 시크릿 키·카드 정보는 어떤 테이블에도 저장하지 않는다.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. 기존 상품 마스터: 소매 판매용 필드만 추가
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS retail_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retail_price_krw numeric(12, 0),
  ADD COLUMN IF NOT EXISTS retail_stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retail_reserved_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retail_shipping_policy text NOT NULL DEFAULT 'collect',
  ADD COLUMN IF NOT EXISTS retail_shipping_fee_krw numeric(12, 0),
  ADD COLUMN IF NOT EXISTS retail_sale_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS retail_description_ko text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS retail_description_zh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS retail_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_retail_price_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_retail_price_nonnegative
      CHECK (retail_price_krw IS NULL OR retail_price_krw >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_retail_stock_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_retail_stock_nonnegative
      CHECK (retail_stock_qty >= 0 AND retail_reserved_qty >= 0 AND retail_reserved_qty <= retail_stock_qty);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_retail_shipping_policy_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_retail_shipping_policy_check
      CHECK (retail_shipping_policy IN ('included', 'fixed', 'collect'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_retail_sale_status_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_retail_sale_status_check
      CHECK (retail_sale_status IN ('draft', 'active', 'sold_out', 'paused', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_retail_public
  ON public.products (retail_sale_status, created_at DESC)
  WHERE retail_visible = true AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_products_retail_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.retail_updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_retail_updated_at ON public.products;
CREATE TRIGGER trg_products_retail_updated_at
  BEFORE UPDATE OF retail_visible, retail_price_krw, retail_stock_qty, retail_reserved_qty,
                   retail_shipping_policy, retail_shipping_fee_krw, retail_sale_status,
                   retail_description_ko, retail_description_zh
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_products_retail_updated_at();

-- 원가·공장 연락처·B2B 협상 정보는 절대 포함하지 않는 소비자용 읽기 전용 뷰.
CREATE OR REPLACE VIEW public.v_retail_products
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.product_code,
  p.sku,
  p.name_ko,
  p.name_zh,
  p.name_en,
  p.category,
  p.category_id,
  p.ip_character_id,
  p.product_type,
  p.retail_price_krw,
  p.retail_stock_qty - p.retail_reserved_qty AS available_stock_qty,
  p.retail_shipping_policy,
  p.retail_shipping_fee_krw,
  p.retail_description_ko,
  p.retail_description_zh,
  p.image_url,
  p.image_urls,
  p.detail_images,
  p.variants,
  p.tags,
  p.is_featured,
  p.is_new,
  p.is_hot,
  p.created_at,
  p.retail_updated_at
FROM public.products p
WHERE p.retail_visible = true
  AND p.retail_sale_status = 'active'
  AND p.is_active = true
  AND p.approval_status = 'approved'
  AND p.deleted_at IS NULL
  AND p.retail_price_krw IS NOT NULL
  AND (
    p.retail_shipping_policy = 'included'
    OR (p.retail_shipping_policy = 'fixed' AND p.retail_shipping_fee_krw IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- 2. 소비자용 주문·상품 스냅샷·결제·재고 이력
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.retail_order_number_seq;

CREATE OR REPLACE FUNCTION public.generate_retail_order_no()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'KRYR-' || to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') || '-' ||
         lpad(nextval('public.retail_order_number_seq')::text, 6, '0');
$$;

CREATE TABLE IF NOT EXISTS public.retail_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE DEFAULT public.generate_retail_order_no(),
  access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'payment_pending',
  payment_status text NOT NULL DEFAULT 'ready',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  shipping_postcode text NOT NULL,
  shipping_address1 text NOT NULL,
  shipping_address2 text NOT NULL DEFAULT '',
  shipping_message text NOT NULL DEFAULT '',
  subtotal_krw numeric(12, 0) NOT NULL DEFAULT 0,
  shipping_fee_krw numeric(12, 0) NOT NULL DEFAULT 0,
  discount_krw numeric(12, 0) NOT NULL DEFAULT 0,
  total_amount_krw numeric(12, 0) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'KRW',
  toss_order_id text NOT NULL UNIQUE,
  toss_payment_key text UNIQUE,
  payment_method text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  cancelled_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('payment_pending', 'paid', 'fulfillment_ready', 'shipped', 'delivered', 'cancel_requested', 'cancelled', 'payment_failed', 'refunded', 'partially_refunded')),
  CHECK (payment_status IN ('ready', 'in_progress', 'done', 'failed', 'cancelled', 'partial_cancelled')),
  CHECK (subtotal_krw >= 0 AND shipping_fee_krw >= 0 AND discount_krw >= 0 AND total_amount_krw >= 0),
  CHECK (currency = 'KRW')
);

CREATE TABLE IF NOT EXISTS public.retail_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retail_order_id uuid NOT NULL REFERENCES public.retail_orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_code_snapshot text,
  product_name_ko_snapshot text NOT NULL,
  product_name_zh_snapshot text NOT NULL DEFAULT '',
  product_image_url_snapshot text NOT NULL DEFAULT '',
  variant_label_snapshot text NOT NULL DEFAULT '',
  quantity integer NOT NULL,
  unit_price_krw numeric(12, 0) NOT NULL,
  line_total_krw numeric(12, 0) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (quantity > 0),
  CHECK (unit_price_krw >= 0 AND line_total_krw >= 0),
  UNIQUE (retail_order_id, product_id, variant_label_snapshot)
);

CREATE TABLE IF NOT EXISTS public.retail_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  retail_order_id uuid REFERENCES public.retail_orders(id) ON DELETE RESTRICT,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (movement_type IN ('reserve', 'release', 'sale', 'restock', 'refund', 'adjustment')),
  CHECK (quantity <> 0)
);

CREATE TABLE IF NOT EXISTS public.retail_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'toss',
  event_key text NOT NULL UNIQUE,
  retail_order_id uuid REFERENCES public.retail_orders(id) ON DELETE SET NULL,
  toss_order_id text,
  toss_payment_key text,
  event_type text NOT NULL,
  payment_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  CHECK (provider = 'toss')
);

CREATE TABLE IF NOT EXISTS public.retail_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retail_order_id uuid NOT NULL REFERENCES public.retail_orders(id) ON DELETE RESTRICT,
  previous_status text,
  next_status text NOT NULL,
  note text NOT NULL DEFAULT '',
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retail_orders_buyer_user_created
  ON public.retail_orders (buyer_user_id, created_at DESC)
  WHERE buyer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retail_orders_status_created
  ON public.retail_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_order_items_order
  ON public.retail_order_items (retail_order_id);
CREATE INDEX IF NOT EXISTS idx_retail_inventory_movements_product_created
  ON public.retail_inventory_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_payment_events_order_received
  ON public.retail_payment_events (retail_order_id, received_at DESC);

CREATE OR REPLACE FUNCTION public.set_retail_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_retail_orders_updated_at ON public.retail_orders;
CREATE TRIGGER trg_retail_orders_updated_at
  BEFORE UPDATE ON public.retail_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_retail_orders_updated_at();

-- 서버에서만 호출한다. 클라이언트가 보낸 가격을 사용하지 않고, 잠긴 실상품 가격·재고로 주문 스냅샷을 생성한다.
CREATE OR REPLACE FUNCTION public.create_retail_checkout(
  p_buyer_user_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_shipping jsonb
)
RETURNS TABLE(order_id uuid, order_no text, access_token uuid, total_amount_krw numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_order_id uuid;
  v_order_no text;
  v_access_token uuid;
  v_subtotal numeric(12, 0) := 0;
  v_shipping_fee numeric(12, 0) := 0;
  v_total numeric(12, 0) := 0;
  v_qty integer;
  v_product_id uuid;
  v_variant_label text;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  IF coalesce(trim(p_customer->>'name'), '') = ''
     OR coalesce(trim(p_customer->>'email'), '') = ''
     OR coalesce(trim(p_customer->>'phone'), '') = ''
     OR coalesce(trim(p_shipping->>'recipient_name'), '') = ''
     OR coalesce(trim(p_shipping->>'recipient_phone'), '') = ''
     OR coalesce(trim(p_shipping->>'postcode'), '') = ''
     OR coalesce(trim(p_shipping->>'address1'), '') = '' THEN
    RAISE EXCEPTION 'REQUIRED_CHECKOUT_FIELDS_MISSING';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_variant_label := coalesce(v_item->>'variant_label', '');

    IF v_qty IS NULL OR v_qty < 1 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_product_id
      AND retail_visible = true
      AND retail_sale_status = 'active'
      AND is_active = true
      AND approval_status = 'approved'
      AND deleted_at IS NULL
      AND retail_price_krw IS NOT NULL
      AND (retail_shipping_policy = 'included' OR (retail_shipping_policy = 'fixed' AND retail_shipping_fee_krw IS NOT NULL))
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'RETAIL_PRODUCT_NOT_AVAILABLE';
    END IF;

    IF v_product.retail_stock_qty - v_product.retail_reserved_qty < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK';
    END IF;

    v_subtotal := v_subtotal + (v_product.retail_price_krw * v_qty);
    IF v_product.retail_shipping_policy = 'fixed' THEN
      v_shipping_fee := greatest(v_shipping_fee, v_product.retail_shipping_fee_krw);
    END IF;
  END LOOP;

  v_total := v_subtotal + v_shipping_fee;
  v_order_no := public.generate_retail_order_no();

  INSERT INTO public.retail_orders (
    order_no, buyer_user_id, customer_name, customer_email, customer_phone,
    recipient_name, recipient_phone, shipping_postcode, shipping_address1, shipping_address2, shipping_message,
    subtotal_krw, shipping_fee_krw, total_amount_krw, toss_order_id
  ) VALUES (
    v_order_no, p_buyer_user_id, trim(p_customer->>'name'), lower(trim(p_customer->>'email')), trim(p_customer->>'phone'),
    trim(p_shipping->>'recipient_name'), trim(p_shipping->>'recipient_phone'), trim(p_shipping->>'postcode'),
    trim(p_shipping->>'address1'), coalesce(trim(p_shipping->>'address2'), ''), coalesce(trim(p_shipping->>'message'), ''),
    v_subtotal, v_shipping_fee, v_total, v_order_no
  ) RETURNING id, access_token INTO v_order_id, v_access_token;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_variant_label := coalesce(v_item->>'variant_label', '');

    SELECT * INTO v_product FROM public.products WHERE id = v_product_id FOR UPDATE;

    INSERT INTO public.retail_order_items (
      retail_order_id, product_id, product_code_snapshot, product_name_ko_snapshot,
      product_name_zh_snapshot, product_image_url_snapshot, variant_label_snapshot,
      quantity, unit_price_krw, line_total_krw
    ) VALUES (
      v_order_id, v_product.id, v_product.product_code, v_product.name_ko,
      coalesce(v_product.name_zh, ''), coalesce(v_product.image_url, ''), v_variant_label,
      v_qty, v_product.retail_price_krw, v_product.retail_price_krw * v_qty
    );

    UPDATE public.products
      SET retail_reserved_qty = retail_reserved_qty + v_qty
      WHERE id = v_product.id;

    INSERT INTO public.retail_inventory_movements (product_id, retail_order_id, movement_type, quantity, reason, actor_user_id)
    VALUES (v_product.id, v_order_id, 'reserve', v_qty, '결제 승인 전 재고 예약', p_buyer_user_id);
  END LOOP;

  INSERT INTO public.retail_order_status_history (retail_order_id, previous_status, next_status, note, actor_user_id)
  VALUES (v_order_id, NULL, 'payment_pending', '결제 요청용 주문 생성', p_buyer_user_id);

  RETURN QUERY SELECT v_order_id, v_order_no, v_access_token, v_total;
END;
$$;

-- 승인 금액은 생성 당시의 주문 총액과 반드시 같아야 하며, 같은 결제키 재호출은 중복 처리하지 않는다.
CREATE OR REPLACE FUNCTION public.confirm_retail_payment(
  p_order_no text,
  p_payment_key text,
  p_payment_method text,
  p_approved_amount numeric,
  p_event_key text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.retail_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.retail_orders%ROWTYPE;
  v_item record;
BEGIN
  SELECT * INTO v_order
  FROM public.retail_orders
  WHERE order_no = p_order_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.payment_status = 'done' AND v_order.toss_payment_key = p_payment_key THEN
    RETURN v_order;
  END IF;

  IF v_order.payment_status <> 'ready' THEN
    RAISE EXCEPTION 'ORDER_NOT_PAYABLE';
  END IF;

  IF p_approved_amount <> v_order.total_amount_krw THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH';
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM public.retail_order_items WHERE retail_order_id = v_order.id
  LOOP
    UPDATE public.products
      SET retail_stock_qty = retail_stock_qty - v_item.quantity,
          retail_reserved_qty = retail_reserved_qty - v_item.quantity
      WHERE id = v_item.product_id
        AND retail_stock_qty >= v_item.quantity
        AND retail_reserved_qty >= v_item.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'STOCK_RESERVATION_MISMATCH';
    END IF;

    INSERT INTO public.retail_inventory_movements (product_id, retail_order_id, movement_type, quantity, reason)
    VALUES (v_item.product_id, v_order.id, 'sale', -v_item.quantity, '토스페이먼츠 결제 승인');
  END LOOP;

  UPDATE public.retail_orders
    SET status = 'paid', payment_status = 'done', toss_payment_key = p_payment_key,
        payment_method = p_payment_method, paid_at = now(), approved_at = now()
    WHERE id = v_order.id
    RETURNING * INTO v_order;

  INSERT INTO public.retail_payment_events (
    provider, event_key, retail_order_id, toss_order_id, toss_payment_key, event_type, payment_status, payload, processed_at
  ) VALUES (
    'toss', p_event_key, v_order.id, v_order.toss_order_id, p_payment_key, 'PAYMENT_CONFIRMED', 'DONE', coalesce(p_payload, '{}'::jsonb), now()
  ) ON CONFLICT (event_key) DO NOTHING;

  INSERT INTO public.retail_order_status_history (retail_order_id, previous_status, next_status, note)
  VALUES (v_order.id, 'payment_pending', 'paid', '토스페이먼츠 결제 승인');

  RETURN v_order;
END;
$$;

-- 결제 실패·만료 시 예약 재고를 한 번만 복구한다.
CREATE OR REPLACE FUNCTION public.release_retail_order_reservation(
  p_order_no text,
  p_next_status text,
  p_note text DEFAULT ''
)
RETURNS public.retail_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.retail_orders%ROWTYPE;
  v_item record;
BEGIN
  IF p_next_status NOT IN ('payment_failed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_RELEASE_STATUS';
  END IF;

  SELECT * INTO v_order
  FROM public.retail_orders
  WHERE order_no = p_order_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status NOT IN ('payment_pending', 'cancel_requested') THEN
    RETURN v_order;
  END IF;

  FOR v_item IN
    SELECT product_id, quantity FROM public.retail_order_items WHERE retail_order_id = v_order.id
  LOOP
    UPDATE public.products
      SET retail_reserved_qty = retail_reserved_qty - v_item.quantity
      WHERE id = v_item.product_id
        AND retail_reserved_qty >= v_item.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'STOCK_RESERVATION_MISMATCH';
    END IF;

    INSERT INTO public.retail_inventory_movements (product_id, retail_order_id, movement_type, quantity, reason)
    VALUES (v_item.product_id, v_order.id, 'release', -v_item.quantity, coalesce(p_note, '결제 미완료 예약 해제'));
  END LOOP;

  UPDATE public.retail_orders
    SET status = p_next_status,
        payment_status = CASE WHEN p_next_status = 'cancelled' THEN 'cancelled' ELSE 'failed' END,
        cancelled_at = CASE WHEN p_next_status = 'cancelled' THEN now() ELSE cancelled_at END
    WHERE id = v_order.id
    RETURNING * INTO v_order;

  INSERT INTO public.retail_order_status_history (retail_order_id, previous_status, next_status, note)
  VALUES (v_order.id, 'payment_pending', p_next_status, coalesce(p_note, ''));

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_retail_checkout(uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_retail_payment(text, text, text, numeric, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_retail_order_reservation(text, text, text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 3. 기존 B2B 구독·샘플 요청 확장: 기존 이력 보존
-- ---------------------------------------------------------------------------
ALTER TABLE public.b2b_subscribers
  ADD COLUMN IF NOT EXISTS contact_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS interest_ip_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interest_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';

DO $$
BEGIN
  IF to_regclass('public.sample_requests') IS NOT NULL THEN
    ALTER TABLE public.sample_requests
      ADD COLUMN IF NOT EXISTS subscriber_id uuid REFERENCES public.b2b_subscribers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS retail_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS request_source text NOT NULL DEFAULT 'website',
      ADD COLUMN IF NOT EXISTS recipient_name text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS recipient_phone text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS shipping_postcode text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS shipping_address1 text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS shipping_address2 text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz,
      ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

    CREATE INDEX IF NOT EXISTS idx_sample_requests_subscriber_created
      ON public.sample_requests (subscriber_id, created_at DESC)
      WHERE subscriber_id IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. RLS: 소비자는 자신의 주문만 조회하고, 서버 경로 외 직접 생성·수정은 허용하지 않는다.
-- ---------------------------------------------------------------------------
ALTER TABLE public.retail_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retail_orders_owner_read ON public.retail_orders;
CREATE POLICY retail_orders_owner_read ON public.retail_orders
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS retail_order_items_owner_read ON public.retail_order_items;
CREATE POLICY retail_order_items_owner_read ON public.retail_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_orders o
      WHERE o.id = retail_order_id AND o.buyer_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS retail_orders_admin_all ON public.retail_orders;
CREATE POLICY retail_orders_admin_all ON public.retail_orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS retail_order_items_admin_all ON public.retail_order_items;
CREATE POLICY retail_order_items_admin_all ON public.retail_order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS retail_inventory_movements_admin_all ON public.retail_inventory_movements;
CREATE POLICY retail_inventory_movements_admin_all ON public.retail_inventory_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS retail_payment_events_admin_all ON public.retail_payment_events;
CREATE POLICY retail_payment_events_admin_all ON public.retail_payment_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS retail_order_status_history_admin_all ON public.retail_order_status_history;
CREATE POLICY retail_order_status_history_admin_all ON public.retail_order_status_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin')
    )
  );

-- 과거 마이그레이션의 role 참조와 현행 kind 기준이 충돌하지 않도록, 실제 관리자 정책을 kind 기준으로 정정한다.
DROP POLICY IF EXISTS admin_full_access_b2b_subscribers ON public.b2b_subscribers;
CREATE POLICY admin_full_access_b2b_subscribers ON public.b2b_subscribers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin', 'marketing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin', 'marketing')
    )
  );

DROP POLICY IF EXISTS admin_full_access_b2b_weekly_reports ON public.b2b_weekly_reports;
CREATE POLICY admin_full_access_b2b_weekly_reports ON public.b2b_weekly_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin', 'marketing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin', 'marketing')
    )
  );

DROP POLICY IF EXISTS admin_full_access_b2b_report_recipients ON public.b2b_report_recipients;
CREATE POLICY admin_full_access_b2b_report_recipients ON public.b2b_report_recipients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin', 'marketing')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text IN ('admin', 'super_admin', 'marketing')
    )
  );

COMMIT;

-- 적용 후 검증용 읽기 전용 SQL (별도 실행)
-- SELECT to_regclass('public.retail_orders'), to_regclass('public.retail_order_items'), to_regclass('public.retail_payment_events');
-- SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name LIKE 'retail_%' ORDER BY column_name;
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'retail_%' ORDER BY tablename;
