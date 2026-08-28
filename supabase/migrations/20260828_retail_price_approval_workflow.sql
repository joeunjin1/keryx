BEGIN;

CREATE TABLE IF NOT EXISTS public.retail_price_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  requester_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  reviewer_user_id uuid REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  current_price_krw numeric(14,0),
  requested_price_krw numeric(14,0) NOT NULL CHECK (requested_price_krw >= 0),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_note text NOT NULL DEFAULT '' CHECK (char_length(reviewer_note) <= 500),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT retail_price_request_reviewer_check CHECK (
    reviewer_user_id IS NULL OR reviewer_user_id <> requester_user_id
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS retail_price_change_one_pending_per_product_idx
  ON public.retail_price_change_requests(product_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS retail_price_change_requests_status_requested_idx
  ON public.retail_price_change_requests(status, requested_at DESC);

ALTER TABLE public.retail_price_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_price_change_requests_no_client_access" ON public.retail_price_change_requests;
CREATE POLICY "retail_price_change_requests_no_client_access"
  ON public.retail_price_change_requests
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.request_retail_price_change(
  p_actor_user_id uuid,
  p_product_id uuid,
  p_requested_price_krw numeric,
  p_reason text DEFAULT ''
)
RETURNS public.retail_price_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_request public.retail_price_change_requests%ROWTYPE;
  v_actor_kind text;
BEGIN
  SELECT kind::text INTO v_actor_kind
  FROM public.user_profiles
  WHERE id = p_actor_user_id;

  IF v_actor_kind IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ADMIN_ROLE_REQUIRED';
  END IF;

  IF p_requested_price_krw IS NULL OR p_requested_price_krw < 0 THEN
    RAISE EXCEPTION 'INVALID_RETAIL_PRICE';
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  IF v_product.retail_price_krw IS NULL THEN
    RAISE EXCEPTION 'INITIAL_PRICE_CAN_BE_SET_DIRECTLY';
  END IF;

  IF v_product.retail_price_krw = p_requested_price_krw THEN
    RAISE EXCEPTION 'PRICE_IS_UNCHANGED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.retail_price_change_requests
    WHERE product_id = p_product_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'PENDING_PRICE_CHANGE_EXISTS';
  END IF;

  INSERT INTO public.retail_price_change_requests (
    product_id,
    requester_user_id,
    current_price_krw,
    requested_price_krw,
    reason
  ) VALUES (
    p_product_id,
    p_actor_user_id,
    v_product.retail_price_krw,
    p_requested_price_krw,
    COALESCE(trim(p_reason), '')
  )
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_retail_price_change(
  p_actor_user_id uuid,
  p_request_id uuid,
  p_decision text,
  p_reviewer_note text DEFAULT ''
)
RETURNS public.retail_price_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.retail_price_change_requests%ROWTYPE;
  v_actor_kind text;
BEGIN
  SELECT kind::text INTO v_actor_kind
  FROM public.user_profiles
  WHERE id = p_actor_user_id;

  IF v_actor_kind IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ADMIN_ROLE_REQUIRED';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_REVIEW_DECISION';
  END IF;

  SELECT * INTO v_request
  FROM public.retail_price_change_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRICE_CHANGE_REQUEST_NOT_FOUND';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'PRICE_CHANGE_REQUEST_NOT_PENDING';
  END IF;

  IF v_request.requester_user_id = p_actor_user_id THEN
    RAISE EXCEPTION 'SELF_APPROVAL_NOT_ALLOWED';
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.products
    SET retail_price_krw = v_request.requested_price_krw,
        updated_at = now()
    WHERE id = v_request.product_id
      AND deleted_at IS NULL;
  END IF;

  UPDATE public.retail_price_change_requests
  SET status = p_decision,
      reviewer_user_id = p_actor_user_id,
      reviewer_note = COALESCE(trim(p_reviewer_note), ''),
      reviewed_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.request_retail_price_change(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_retail_price_change(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_retail_price_change(uuid, uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_retail_price_change(uuid, uuid, text, text) TO service_role;

COMMIT;
