-- ============================================================
-- KERYX 구독 플랜 DB 단일 소스 강화 마이그레이션 (2026-05-04)
-- 스킬 원칙: 가격/혜택/설정은 DB에서만 관리, 코드 하드코딩 금지
-- ============================================================

-- 1. subscription_plans 테이블 컬럼 추가 (없는 경우만)
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS tagline_ko    TEXT,
  ADD COLUMN IF NOT EXISTS tagline_zh    TEXT,
  ADD COLUMN IF NOT EXISTS color_class   TEXT DEFAULT 'from-slate-500 to-slate-600',
  ADD COLUMN IF NOT EXISTS recommended   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_days    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge_ko      TEXT,
  ADD COLUMN IF NOT EXISTS badge_zh      TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- 2. 5단계 플랜 완전 데이터 (스킬 원칙: 단일 config 파일 역할)
-- 기존 데이터 업데이트 + 누락 플랜 추가
INSERT INTO subscription_plans (
  id, name_ko, name_zh, tagline_ko, tagline_zh,
  price_monthly, price_yearly, currency,
  description_ko, description_zh,
  features_ko, features_zh,
  color_class, recommended, trial_days,
  badge_ko, badge_zh,
  is_active, sort_order
) VALUES
(
  'free', '무료', 'FREE', '지금 바로 시작', '立即开始',
  0, 0, 'CNY',
  '무료로 KERYX 소싱 플랫폼을 체험하세요',
  '免费体验KERYX采购平台',
  '["카탈로그 열람 (월 50개)", "공장 매칭 신청 월 1회", "시장조사 요청 월 3회", "이메일 지원", "신상품 뉴스레터 (월 1회)"]',
  '["目录浏览（每月50个）", "工厂匹配申请每月1次", "市场调研每月3次", "邮件支持", "新品通讯（每月1次）"]',
  'from-slate-500 to-slate-600', FALSE, 0,
  '무료 시작', '免费开始',
  TRUE, 0
),
(
  'basic', '베이직', 'BASIC', '소싱 시작하기', '开始采购',
  300, 2880, 'CNY',
  '중국 공장 소싱을 시작하는 셀러를 위한 기본 플랜',
  '适合开始中国工厂采购的卖家的基础方案',
  '["전체 카탈로그 접근", "공장 매칭 월 2회", "시장조사 월 10회", "이메일 지원", "상품 제안 서비스", "신상품 뉴스레터 (주 1회)"]',
  '["完整目录访问", "工厂匹配每月2次", "市场调研每月10次", "邮件支持", "商品提案服务", "新品通讯（每周1次）"]',
  'from-blue-500 to-blue-600', FALSE, 30,
  NULL, NULL,
  TRUE, 1
),
(
  'premium', '프리미엄', '高级版', '가장 인기 있는 플랜', '最受欢迎',
  500, 4800, 'CNY',
  '성장하는 셀러를 위한 전문 소싱 파트너십',
  '为成长型卖家提供的专业采购合作',
  '["베이직 전체 포함", "공장 매칭 월 4회", "시장조사 무제한", "전담 MD 배정", "24h 우선 처리", "AI 매칭 서비스", "신상품 뉴스레터 (실시간)"]',
  '["包含BASIC全部", "工厂匹配每月4次", "市场调研无限次", "专属MD分配", "24h优先处理", "AI匹配服务", "新品通讯（实时）"]',
  'from-purple-500 to-purple-700', TRUE, 30,
  '가장 인기', '最受欢迎',
  TRUE, 2
),
(
  'vip_pro', 'VIP PRO', 'VIP专业版', '최우선 처리 + 공장 방문', '最优先处理+工厂参观',
  800, 7680, 'CNY',
  '최고 수준의 소싱 파트너십이 필요한 파워 셀러를 위한 플랜',
  '为需要顶级采购合作的强力卖家提供的方案',
  '["프리미엄 전체 포함", "공장 매칭 무제한", "전담 MD 1:1 배정", "12h 최우선 처리", "VIP 신상품 알림 (즉시)", "연 2회 공장 방문 지원", "샘플 배송 지원"]',
  '["包含高级版全部", "工厂匹配无限次", "专属MD 1对1分配", "12h最优先处理", "VIP新品通知（即时）", "每年2次工厂参观支持", "样品配送支持"]',
  'from-amber-500 to-orange-500', FALSE, 30,
  NULL, NULL,
  TRUE, 3
),
(
  'dedicated', '전담 서비스', '专属服务', '나만의 중국 무역팀', '专属中国贸易团队',
  1500, 14400, 'CNY',
  '전담 MD와 QC팀이 배정되는 최고급 서비스',
  '配备专属MD和QC团队的顶级服务',
  '["VIP PRO 전체 포함", "전담 MD 전일 배정", "전담 QC 검수팀", "무제한 공장 방문", "맞춤형 소싱 전략 수립", "월간 사업 리포트", "24/7 긴급 대응"]',
  '["包含VIP PRO全部", "专属MD全天候分配", "专属QC检验团队", "无限次工厂参观", "定制化采购策略", "月度业务报告", "24/7紧急响应"]',
  'from-rose-600 to-pink-700', FALSE, 30,
  '나만의 팀', '专属团队',
  TRUE, 4
)
ON CONFLICT (id) DO UPDATE SET
  name_ko       = EXCLUDED.name_ko,
  name_zh       = EXCLUDED.name_zh,
  tagline_ko    = EXCLUDED.tagline_ko,
  tagline_zh    = EXCLUDED.tagline_zh,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly  = EXCLUDED.price_yearly,
  features_ko   = EXCLUDED.features_ko,
  features_zh   = EXCLUDED.features_zh,
  color_class   = EXCLUDED.color_class,
  recommended   = EXCLUDED.recommended,
  trial_days    = EXCLUDED.trial_days,
  badge_ko      = EXCLUDED.badge_ko,
  badge_zh      = EXCLUDED.badge_zh,
  sort_order    = EXCLUDED.sort_order,
  updated_at    = NOW();

-- 3. sellers 테이블에 사용량 카운터 컬럼 추가 (스킬 원칙: 사용량은 DB로)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS usage_factory_match_month  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_research_month       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_catalog_view_month   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at             TIMESTAMPTZ DEFAULT date_trunc('month', NOW());

-- 4. 사용량 한도 조회 함수 (플랜별 한도 반환)
CREATE OR REPLACE FUNCTION get_plan_limits(p_plan_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN CASE p_plan_id
    WHEN 'free'      THEN '{"factory_match": 1, "research": 3, "catalog_view": 50}'::JSONB
    WHEN 'basic'     THEN '{"factory_match": 2, "research": 10, "catalog_view": -1}'::JSONB
    WHEN 'premium'   THEN '{"factory_match": 4, "research": -1, "catalog_view": -1}'::JSONB
    WHEN 'vip_pro'   THEN '{"factory_match": -1, "research": -1, "catalog_view": -1}'::JSONB
    WHEN 'dedicated' THEN '{"factory_match": -1, "research": -1, "catalog_view": -1}'::JSONB
    ELSE                  '{"factory_match": 1, "research": 3, "catalog_view": 50}'::JSONB
  END;
END;
$$;

-- 5. 시장조사 쿼터 체크 함수 (스킬 원칙: 사용량 한도는 서버에서 검사)
CREATE OR REPLACE FUNCTION market_research_check_quota(p_seller_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id     TEXT;
  v_usage       INTEGER;
  v_limit       INTEGER;
  v_reset_at    TIMESTAMPTZ;
BEGIN
  -- 현재 활성 구독 플랜 조회
  SELECT s.plan_id INTO v_plan_id
  FROM subscriptions s
  WHERE s.seller_id = p_seller_id
    AND s.status IN ('active', 'trial')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- 구독 없으면 free 플랜 적용
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;

  -- 무제한 플랜 (-1)은 항상 통과
  v_limit := ((get_plan_limits(v_plan_id))->>'research')::INTEGER;
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- 이번 달 사용량 조회
  SELECT COALESCE(usage_research_month, 0), COALESCE(usage_reset_at, date_trunc('month', NOW()))
  INTO v_usage, v_reset_at
  FROM sellers
  WHERE id = p_seller_id;

  -- 월 리셋 여부 확인 (이번 달 1일 이전에 리셋됐으면 0으로 초기화)
  IF v_reset_at < date_trunc('month', NOW()) THEN
    UPDATE sellers
    SET usage_research_month = 0,
        usage_factory_match_month = 0,
        usage_catalog_view_month = 0,
        usage_reset_at = date_trunc('month', NOW())
    WHERE id = p_seller_id;
    v_usage := 0;
  END IF;

  RETURN v_usage < v_limit;
END;
$$;

-- 6. 월간 사용량 리셋 함수 (pg_cron 또는 API cron에서 호출)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE sellers
  SET usage_factory_match_month = 0,
      usage_research_month      = 0,
      usage_catalog_view_month  = 0,
      usage_reset_at            = date_trunc('month', NOW())
  WHERE usage_reset_at < date_trunc('month', NOW());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 7. tier_audit_log 테이블 (스킬 원칙: 변경 이력 영구 보관, DELETE 차단)
CREATE TABLE IF NOT EXISTS tier_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       TEXT NOT NULL,
  changed_by    UUID NOT NULL,
  change_reason TEXT NOT NULL CHECK (length(change_reason) >= 10),
  old_values    JSONB NOT NULL,
  new_values    JSONB NOT NULL,
  affected_subs INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- DELETE 차단 정책 (스킬 원칙: 변경 이력은 영구 보관)
ALTER TABLE tier_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tier_audit_no_delete" ON tier_audit_log
  FOR DELETE USING (FALSE);
CREATE POLICY IF NOT EXISTS "tier_audit_admin_read" ON tier_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'super_admin')
    )
  );
CREATE POLICY IF NOT EXISTS "tier_audit_admin_insert" ON tier_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'super_admin')
    )
  );

-- 8. subscription_plans RLS 강화 (관리자만 수정 가능)
DROP POLICY IF EXISTS "plans_public_read" ON subscription_plans;
CREATE POLICY "plans_public_read" ON subscription_plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY IF NOT EXISTS "plans_admin_all" ON subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND kind IN ('admin', 'super_admin')
    )
  );
