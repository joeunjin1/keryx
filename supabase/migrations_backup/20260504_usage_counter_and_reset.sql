-- ============================================================
-- KERYX 구독 사용량 카운터 및 월간 리셋 함수
-- 스킬 원칙: 사용량 카운터 자동 리셋 (매월 1일)
-- ============================================================

-- 1. sellers 테이블에 사용량 카운터 컬럼 추가 (없으면)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS usage_factory_match  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_market_research INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_catalog_view    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. subscription_plans 테이블에 쿼터 컬럼 추가 (없으면)
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS quota_factory_match   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quota_market_research INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS quota_catalog_view    INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS quota_unlimited       BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. 쿼터 값 업데이트 (스킬 원칙: 5단계 티어 정의는 단일 config에서)
UPDATE subscription_plans SET
  quota_factory_match   = 1,
  quota_market_research = 3,
  quota_catalog_view    = 50,
  quota_unlimited       = FALSE
WHERE id = 'free';

UPDATE subscription_plans SET
  quota_factory_match   = 2,
  quota_market_research = 10,
  quota_catalog_view    = -1,  -- -1 = 무제한
  quota_unlimited       = FALSE
WHERE id = 'basic';

UPDATE subscription_plans SET
  quota_factory_match   = 4,
  quota_market_research = -1,
  quota_catalog_view    = -1,
  quota_unlimited       = FALSE
WHERE id = 'premium';

UPDATE subscription_plans SET
  quota_factory_match   = -1,
  quota_market_research = -1,
  quota_catalog_view    = -1,
  quota_unlimited       = FALSE
WHERE id = 'vip_pro';

UPDATE subscription_plans SET
  quota_factory_match   = -1,
  quota_market_research = -1,
  quota_catalog_view    = -1,
  quota_unlimited       = TRUE
WHERE id = 'dedicated';

-- 4. 월간 사용량 리셋 RPC 함수
-- GitHub Actions cron이 매월 1일 00:00 KST에 호출
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE sellers
  SET
    usage_factory_match   = 0,
    usage_market_research = 0,
    usage_catalog_view    = 0,
    usage_reset_at        = NOW()
  WHERE
    -- 활성 구독이 있는 셀러만 리셋
    id IN (
      SELECT DISTINCT seller_id
      FROM subscriptions
      WHERE status IN ('active', 'trial')
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. 사용량 체크 함수 (서비스 요청 전 쿼터 확인용)
CREATE OR REPLACE FUNCTION check_usage_quota(
  p_seller_id UUID,
  p_usage_type TEXT  -- 'factory_match' | 'market_research' | 'catalog_view'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller RECORD;
  v_plan   RECORD;
  v_current_usage INTEGER;
  v_quota INTEGER;
BEGIN
  -- 셀러 현재 플랜 조회
  SELECT s.*, sub.plan_id
  INTO v_seller
  FROM sellers s
  LEFT JOIN subscriptions sub ON sub.seller_id = s.id
    AND sub.status IN ('active', 'trial')
  WHERE s.id = p_seller_id
  ORDER BY sub.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'seller_not_found');
  END IF;

  -- 플랜 쿼터 조회
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = COALESCE(v_seller.plan_id, 'free');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'plan_not_found');
  END IF;

  -- 무제한 플랜
  IF v_plan.quota_unlimited THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true);
  END IF;

  -- 사용량 및 쿼터 선택
  IF p_usage_type = 'factory_match' THEN
    v_current_usage := v_seller.usage_factory_match;
    v_quota := v_plan.quota_factory_match;
  ELSIF p_usage_type = 'market_research' THEN
    v_current_usage := v_seller.usage_market_research;
    v_quota := v_plan.quota_market_research;
  ELSIF p_usage_type = 'catalog_view' THEN
    v_current_usage := v_seller.usage_catalog_view;
    v_quota := v_plan.quota_catalog_view;
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_usage_type');
  END IF;

  -- -1은 무제한
  IF v_quota = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true);
  END IF;

  RETURN jsonb_build_object(
    'allowed',        v_current_usage < v_quota,
    'current_usage',  v_current_usage,
    'quota',          v_quota,
    'remaining',      GREATEST(0, v_quota - v_current_usage),
    'plan_id',        COALESCE(v_seller.plan_id, 'free')
  );
END;
$$;

-- 6. 인덱스 추가 (성능)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_seller
  ON subscriptions(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry
  ON subscriptions(current_period_end)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_expiry
  ON subscriptions(trial_end_at)
  WHERE status = 'trial';
