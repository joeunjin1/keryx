-- ============================================================================
-- KERYX 소매 쇼핑몰 무결성 보강
-- 작성일: 2026-08-28
-- 선행 조건: 20260828_retail_commerce_toss_samples.sql 적용 완료
-- 목적: 재고 예약 만료, 관리자 판매 설정, 출고 상태 변경을 원자적으로 처리한다.
-- ============================================================================

BEGIN;

ALTER TABLE public.retail_orders
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_retail_orders_reservation_expiry
  ON public.retail_orders (reservation_expires_at)
  WHERE status = 'payment_pending' AND reservation_expires_at IS NOT NULL;

-- 새 결제 대기 주문은 일정 시간 뒤 예약 해제 대상으로 표시한다.
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
    subtotal_krw, shipping_fee_krw, total_amount_krw, toss_order_id, reservation_expires_at
  ) VALUES (
    v_order_no, p_buyer_user_id, trim(p_customer->>'name'), lower(trim(p_customer->>'email')), trim(p_customer->>'phone'),
    trim(p_shipping->>'recipient_name'), trim(p_shipping->>'recipient_phone'), trim(p_shipping->>'postcode'),
    trim(p_shipping->>'address1'), coalesce(trim(p_shipping->>'address2'), ''), coalesce(trim(p_shipping->>'message'), ''),
    v_subtotal, v_shipping_fee, v_total, v_order_no, now() + interval '20 minutes'
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

    UPDATE public.products SET retail_reserved_qty = retail_reserved_qty + v_qty WHERE id = v_product.id;
    INSERT INTO public.retail_inventory_movements (product_id, retail_order_id, movement_type, quantity, reason, actor_user_id)
    VALUES (v_product.id, v_order_id, 'reserve', v_qty, '결제 승인 전 재고 예약', p_buyer_user_id);
  END LOOP;

  INSERT INTO public.retail_order_status_history (retail_order_id, previous_status, next_status, note, actor_user_id)
  VALUES (v_order_id, NULL, 'payment_pending', '결제 요청용 주문 생성', p_buyer_user_id);

  RETURN QUERY SELECT v_order_id, v_order_no, v_access_token, v_total;
END;
$$;

-- 승인 전에 예약 만료 여부를 확인해 만료된 주문의 지연 승인으로 인한 재고 불일치를 방지한다.
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
  SELECT * INTO v_order FROM public.retail_orders WHERE order_no = p_order_no FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.payment_status = 'done' AND v_order.toss_payment_key = p_payment_key THEN RETURN v_order; END IF;
  IF v_order.payment_status <> 'ready' THEN RAISE EXCEPTION 'ORDER_NOT_PAYABLE'; END IF;
  IF v_order.reservation_expires_at IS NOT NULL AND v_order.reservation_expires_at < now() THEN
    RAISE EXCEPTION 'ORDER_RESERVATION_EXPIRED';
  END IF;
  IF p_approved_amount <> v_order.total_amount_krw THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH'; END IF;

  FOR v_item IN SELECT product_id, quantity FROM public.retail_order_items WHERE retail_order_id = v_order.id
  LOOP
    UPDATE public.products
    SET retail_stock_qty = retail_stock_qty - v_item.quantity,
        retail_reserved_qty = retail_reserved_qty - v_item.quantity
    WHERE id = v_item.product_id
      AND retail_stock_qty >= v_item.quantity
      AND retail_reserved_qty >= v_item.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'STOCK_RESERVATION_MISMATCH'; END IF;
    INSERT INTO public.retail_inventory_movements (product_id, retail_order_id, movement_type, quantity, reason)
    VALUES (v_item.product_id, v_order.id, 'sale', -v_item.quantity, '토스페이먼츠 결제 승인');
  END LOOP;

  UPDATE public.retail_orders
  SET status = 'paid', payment_status = 'done', toss_payment_key = p_payment_key,
      payment_method = p_payment_method, paid_at = now(), approved_at = now(), reservation_expires_at = NULL
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  INSERT INTO public.retail_payment_events (provider, event_key, retail_order_id, toss_order_id, toss_payment_key, event_type, payment_status, payload, processed_at)
  VALUES ('toss', p_event_key, v_order.id, v_order.toss_order_id, p_payment_key, 'PAYMENT_CONFIRMED', 'DONE', coalesce(p_payload, '{}'::jsonb), now())
  ON CONFLICT (event_key) DO NOTHING;
  INSERT INTO public.retail_order_status_history (retail_order_id, previous_status, next_status, note)
  VALUES (v_order.id, 'payment_pending', 'paid', '토스페이먼츠 결제 승인');
  RETURN v_order;
END;
$$;

-- 주기 작업이 호출한다. 결제 대기 상태이고 만료된 예약만 해제하며, 이미 처리된 주문은 건드리지 않는다.
CREATE OR REPLACE FUNCTION public.release_expired_retail_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_count integer := 0;
BEGIN
  FOR v_order IN
    SELECT order_no FROM public.retail_orders
    WHERE status = 'payment_pending'
      AND payment_status = 'ready'
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_retail_order_reservation(v_order.order_no, 'payment_failed', '결제 대기 시간 만료로 재고 예약 해제');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE TABLE IF NOT EXISTS public.retail_product_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (action IN ('retail_settings_updated'))
);

CREATE INDEX IF NOT EXISTS idx_retail_product_change_history_product_created
  ON public.retail_product_change_history (product_id, created_at DESC);

ALTER TABLE public.retail_product_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retail_product_change_history_admin_all ON public.retail_product_change_history;
CREATE POLICY retail_product_change_history_admin_all ON public.retail_product_change_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid() AND u.kind::text = 'admin'
    )
  );

-- 관리자만 호출할 수 있으며, 공개 조건을 DB에서 재검증하고 변경 전후를 영구 기록한다.
CREATE OR REPLACE FUNCTION public.update_retail_product_settings(
  p_actor_user_id uuid,
  p_product_id uuid,
  p_retail_visible boolean,
  p_retail_price_krw numeric,
  p_retail_stock_qty integer,
  p_retail_shipping_policy text,
  p_retail_shipping_fee_krw numeric,
  p_retail_sale_status text,
  p_retail_description_ko text,
  p_retail_description_zh text
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_updated public.products%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.id = p_actor_user_id AND u.kind::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'ADMIN_ROLE_REQUIRED';
  END IF;
  IF p_retail_price_krw IS NOT NULL AND p_retail_price_krw < 0 THEN RAISE EXCEPTION 'INVALID_RETAIL_PRICE'; END IF;
  IF p_retail_stock_qty < 0 THEN RAISE EXCEPTION 'INVALID_RETAIL_STOCK'; END IF;
  IF p_retail_shipping_policy NOT IN ('included', 'fixed', 'collect') THEN RAISE EXCEPTION 'INVALID_SHIPPING_POLICY'; END IF;
  IF p_retail_sale_status NOT IN ('draft', 'active', 'sold_out', 'paused', 'archived') THEN RAISE EXCEPTION 'INVALID_SALE_STATUS'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF p_retail_stock_qty < v_product.retail_reserved_qty THEN RAISE EXCEPTION 'STOCK_BELOW_RESERVED'; END IF;

  IF p_retail_visible AND (
    v_product.approval_status <> 'approved' OR v_product.is_active <> true OR p_retail_price_krw IS NULL
    OR p_retail_sale_status <> 'active'
    OR (p_retail_shipping_policy = 'fixed' AND coalesce(p_retail_shipping_fee_krw, -1) < 0)
    OR p_retail_shipping_policy = 'collect'
  ) THEN
    RAISE EXCEPTION 'RETAIL_PUBLISH_REQUIREMENTS_NOT_MET';
  END IF;

  v_before := jsonb_build_object(
    'retail_visible', v_product.retail_visible,
    'retail_price_krw', v_product.retail_price_krw,
    'retail_stock_qty', v_product.retail_stock_qty,
    'retail_shipping_policy', v_product.retail_shipping_policy,
    'retail_shipping_fee_krw', v_product.retail_shipping_fee_krw,
    'retail_sale_status', v_product.retail_sale_status
  );

  UPDATE public.products
  SET retail_visible = p_retail_visible,
      retail_price_krw = p_retail_price_krw,
      retail_stock_qty = p_retail_stock_qty,
      retail_shipping_policy = p_retail_shipping_policy,
      retail_shipping_fee_krw = CASE WHEN p_retail_shipping_policy = 'fixed' THEN p_retail_shipping_fee_krw ELSE NULL END,
      retail_sale_status = p_retail_sale_status,
      retail_description_ko = coalesce(p_retail_description_ko, ''),
      retail_description_zh = coalesce(p_retail_description_zh, '')
  WHERE id = p_product_id
  RETURNING * INTO v_updated;

  v_after := jsonb_build_object(
    'retail_visible', v_updated.retail_visible,
    'retail_price_krw', v_updated.retail_price_krw,
    'retail_stock_qty', v_updated.retail_stock_qty,
    'retail_shipping_policy', v_updated.retail_shipping_policy,
    'retail_shipping_fee_krw', v_updated.retail_shipping_fee_krw,
    'retail_sale_status', v_updated.retail_sale_status
  );
  INSERT INTO public.retail_product_change_history (product_id, actor_user_id, action, before_state, after_state)
  VALUES (p_product_id, p_actor_user_id, 'retail_settings_updated', v_before, v_after);
  RETURN v_updated;
END;
$$;

-- 결제 완료 주문만 순차적으로 출고 단계로 바꾸고, 상태 변경과 이력을 하나의 트랜잭션으로 처리한다.
CREATE OR REPLACE FUNCTION public.advance_retail_order_status(
  p_actor_user_id uuid,
  p_order_id uuid,
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
  v_updated public.retail_orders%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.id = p_actor_user_id AND u.kind::text = 'admin'
  ) THEN RAISE EXCEPTION 'ADMIN_ROLE_REQUIRED'; END IF;
  IF p_next_status NOT IN ('fulfillment_ready', 'shipped', 'delivered') THEN RAISE EXCEPTION 'INVALID_NEXT_STATUS'; END IF;

  SELECT * INTO v_order FROM public.retail_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF NOT (
    (v_order.status = 'paid' AND p_next_status = 'fulfillment_ready')
    OR (v_order.status = 'fulfillment_ready' AND p_next_status = 'shipped')
    OR (v_order.status = 'shipped' AND p_next_status = 'delivered')
  ) THEN RAISE EXCEPTION 'INVALID_STATUS_TRANSITION'; END IF;

  UPDATE public.retail_orders
  SET status = p_next_status,
      shipped_at = CASE WHEN p_next_status = 'shipped' THEN now() ELSE shipped_at END,
      delivered_at = CASE WHEN p_next_status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = v_order.id
  RETURNING * INTO v_updated;

  INSERT INTO public.retail_order_status_history (retail_order_id, previous_status, next_status, note, actor_user_id)
  VALUES (v_order.id, v_order.status, p_next_status, coalesce(p_note, ''), p_actor_user_id);
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_retail_reservations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_retail_product_settings(uuid, uuid, boolean, numeric, integer, text, numeric, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_retail_order_status(uuid, uuid, text, text) FROM PUBLIC;

COMMIT;
