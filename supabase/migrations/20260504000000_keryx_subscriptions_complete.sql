-- ============================================================
-- KERYX 구독 시스템 완전 통합 마이그레이션 (2026-05-04)
-- 이전 마이그레이션 파일들을 올바른 순서로 통합
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. subscription_plans 테이블 생성
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT PRIMARY KEY,
  name_ko       TEXT NOT NULL,
  name_zh       TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly  INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'CNY',
  description_ko TEXT,
  description_zh TEXT,
  features_ko   JSONB DEFAULT '[]',
  features_zh   JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  -- 추가 컬럼 (subscription_plans_full에서)
  tagline_ko    TEXT,
  tagline_zh    TEXT,
  color_class   TEXT DEFAULT 'from-slate-500 to-slate-600',
  recommended   BOOLEAN DEFAULT FALSE,
  trial_days    INTEGER DEFAULT 0,
  badge_ko      TEXT,
  badge_zh      TEXT,
  -- 쿼터 컬럼 (usage_counter에서)
  quota_factory_match   INTEGER NOT NULL DEFAULT 1,
  quota_market_research INTEGER NOT NULL DEFAULT 3,
  quota_catalog_view    INTEGER NOT NULL DEFAULT 50,
  quota_unlimited       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. subscriptions 테이블 생성
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id         TEXT NOT NULL REFERENCES subscription_plans(id),
  billing_cycle   TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'trial', 'active', 'cancelled', 'expired', 'payment_failed')),
  trial_start_at  TIMESTAMPTZ,
  trial_end_at    TIMESTAMPTZ,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  amount_cny      INTEGER,
  payment_method  TEXT,
  payment_ref     TEXT,
  payment_note    TEXT,
  admin_id        UUID,
  admin_note      TEXT,
  approved_at     TIMESTAMPTZ,
  renewal_count   INTEGER DEFAULT 0,
  last_renewed_at TIMESTAMPTZ,
  next_renewal_at TIMESTAMPTZ,
  renewal_notified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. subscription_payments 테이블 생성
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES auth.users(id),
  plan_id         TEXT NOT NULL,
  billing_cycle   TEXT NOT NULL,
  amount_cny      INTEGER NOT NULL,
  payment_method  TEXT,
  payment_ref     TEXT,
  payment_note    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  period_start    TIMESTAMPTZ,
  period_end      TIMESTAMPTZ,
  confirmed_by    UUID,
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. sellers 테이블에 사용량 카운터 컬럼 추가
-- ─────────────────────────────────────────────
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS usage_factory_match  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_market_research INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_catalog_view    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────
-- 5. 인덱스 생성
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_seller_id ON subscriptions(seller_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ends_at ON subscriptions(ends_at);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_seller_id ON subscription_payments(seller_id);

-- ─────────────────────────────────────────────
-- 6. updated_at 자동 갱신 트리거
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();

-- ─────────────────────────────────────────────
-- 7. RLS 활성화
-- ─────────────────────────────────────────────
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- 플랜은 누구나 읽기 가능
DROP POLICY IF EXISTS "subscription_plans_public_read" ON subscription_plans;
CREATE POLICY "subscription_plans_public_read" ON subscription_plans
  FOR SELECT USING (true);

-- 구독: 본인 것만 읽기
DROP POLICY IF EXISTS "subscriptions_owner_read" ON subscriptions;
CREATE POLICY "subscriptions_owner_read" ON subscriptions
  FOR SELECT USING (auth.uid() = seller_id);

-- 구독: 본인이 생성
DROP POLICY IF EXISTS "subscriptions_owner_insert" ON subscriptions;
CREATE POLICY "subscriptions_owner_insert" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- 구독 결제: 본인 것만 읽기
DROP POLICY IF EXISTS "subscription_payments_owner_read" ON subscription_payments;
CREATE POLICY "subscription_payments_owner_read" ON subscription_payments
  FOR SELECT USING (auth.uid() = seller_id);

-- 구독 결제: 본인이 생성
DROP POLICY IF EXISTS "subscription_payments_owner_insert" ON subscription_payments;
CREATE POLICY "subscription_payments_owner_insert" ON subscription_payments
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- ─────────────────────────────────────────────
-- 8. 5단계 구독 플랜 데이터 삽입
-- ─────────────────────────────────────────────
INSERT INTO subscription_plans (
  id, name_ko, name_zh, tagline_ko, tagline_zh,
  price_monthly, price_yearly, currency,
  description_ko, description_zh,
  features_ko, features_zh,
  color_class, recommended, trial_days,
  badge_ko, badge_zh,
  quota_factory_match, quota_market_research, quota_catalog_view, quota_unlimited,
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
  1, 3, 50, FALSE,
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
  2, 10, 999999, FALSE,
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
  4, 999999, 999999, FALSE,
  TRUE, 2
),
(
  'vip_pro', 'VIP PRO', 'VIP专业版', '최고의 파트너십', '顶级合作',
  800, 7680, 'CNY',
  '최고 수준의 소싱 파트너십이 필요한 파워 셀러를 위한 플랜',
  '为需要顶级采购合作的强力卖家提供的方案',
  '["프리미엄 전체 포함", "공장 매칭 무제한", "시장조사 무제한", "전담 MD 1:1 배정", "12h 최우선 처리", "신제품 공동개발 참여", "연 2회 중국 공장 투어", "카카오톡/위챗 실시간 지원"]',
  '["包含高级版全部", "工厂匹配无限次", "市场调研无限次", "专属MD 1对1分配", "12h最优先处理", "新品共同开发参与", "每年2次工厂参观", "KakaoTalk/微信实时支持"]',
  'from-amber-500 to-orange-600', FALSE, 30,
  'VIP', 'VIP',
  999999, 999999, 999999, TRUE,
  TRUE, 3
),
(
  'enterprise', '엔터프라이즈', '企业版', '맞춤형 파트너십', '定制合作',
  0, 0, 'CNY',
  '대형 바이어를 위한 완전 맞춤형 서비스',
  '为大型买家提供的完全定制化服务',
  '["VIP PRO 전체 포함", "전용 소싱팀 배정", "맞춤형 가격 협상", "독점 공장 계약 지원", "월간 성과 리포트", "전용 연락 채널"]',
  '["包含VIP PRO全部", "专属采购团队", "定制价格谈判", "独家工厂合同支持", "月度绩效报告", "专属联系渠道"]',
  'from-rose-500 to-red-700', FALSE, 0,
  '문의', '咨询',
  999999, 999999, 999999, TRUE,
  TRUE, 4
)
ON CONFLICT (id) DO UPDATE SET
  name_ko = EXCLUDED.name_ko,
  name_zh = EXCLUDED.name_zh,
  tagline_ko = EXCLUDED.tagline_ko,
  tagline_zh = EXCLUDED.tagline_zh,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features_ko = EXCLUDED.features_ko,
  features_zh = EXCLUDED.features_zh,
  color_class = EXCLUDED.color_class,
  recommended = EXCLUDED.recommended,
  badge_ko = EXCLUDED.badge_ko,
  badge_zh = EXCLUDED.badge_zh,
  quota_factory_match = EXCLUDED.quota_factory_match,
  quota_market_research = EXCLUDED.quota_market_research,
  quota_catalog_view = EXCLUDED.quota_catalog_view,
  quota_unlimited = EXCLUDED.quota_unlimited,
  updated_at = NOW();

-- ─────────────────────────────────────────────
-- 9. 월간 사용량 리셋 함수
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE sellers
  SET
    usage_factory_match   = 0,
    usage_market_research = 0,
    usage_catalog_view    = 0,
    usage_reset_at        = NOW()
  WHERE
    EXTRACT(MONTH FROM usage_reset_at) != EXTRACT(MONTH FROM NOW())
    OR EXTRACT(YEAR FROM usage_reset_at) != EXTRACT(YEAR FROM NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 10. RLS 헬퍼 함수 (public 스키마 사용)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT kind FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT kind = 'admin' FROM public.user_profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

SELECT 'KERYX 구독 시스템 마이그레이션 완료' as result;
