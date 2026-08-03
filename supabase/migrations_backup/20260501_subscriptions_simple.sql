-- KERYX 구독 관리 테이블 생성 (2026-05-01)

-- 1. 구독 플랜 테이블
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
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 구독 신청/관리 테이블
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

-- 3. 구독 결제 내역 테이블
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

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_seller_id ON subscriptions(seller_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ends_at ON subscriptions(ends_at);
CREATE INDEX IF NOT EXISTS idx_sub_payments_sub_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_seller_id ON subscription_payments(seller_id);

-- 5. 기본 플랜 데이터
INSERT INTO subscription_plans (id, name_ko, name_zh, price_monthly, price_yearly, description_ko, description_zh, features_ko, features_zh, sort_order)
VALUES
(
  'basic', '베이직', '基础版', 300, 2520,
  '중국 공장 소싱을 시작하는 셀러를 위한 기본 플랜',
  '适合开始中国工厂采购的卖家的基础方案',
  '["제품 카탈로그 전체 열람", "공장 매칭 신청 월 2회", "시장조사 요청 월 10건", "검수 보고서 열람", "이메일 지원"]',
  '["完整产品目录浏览", "工厂匹配申请每月2次", "市场调研请求每月10次", "检验报告查阅", "邮件支持"]',
  1
),
(
  'premium', '프리미엄', '专业版', 500, 4200,
  '성장하는 셀러를 위한 전문 소싱 파트너십',
  '为成长型卖家提供的专业采购合作',
  '["제품 카탈로그 전체 열람", "공장 매칭 신청 월 4회", "시장조사 요청 무제한", "검수 보고서 열람", "전담 MD 배정", "우선 처리 (24h 이내)", "VIP 전용 신제품 알림", "카카오톡 실시간 지원"]',
  '["完整产品目录浏览", "工厂匹配申请每月4次", "市场调研请求无限次", "检验报告查阅", "专属MD分配", "优先处理(24小时内)", "VIP新品专属通知", "微信实时支持"]',
  2
),
(
  'vip_pro', 'VIP PRO', 'VIP专业版', 800, 6720,
  '최고 수준의 소싱 파트너십이 필요한 파워 셀러를 위한 플랜',
  '为需要顶级采购合作的强力卖家提供的方案',
  '["제품 카탈로그 전체 열람", "공장 매칭 신청 무제한", "시장조사 요청 무제한", "검수 보고서 열람", "전담 MD 1:1 배정", "최우선 처리 (12h 이내)", "VIP 전용 신제품 알림", "신제품 공동개발 참여", "연 2회 중국 공장 투어", "카카오톡/위챗 실시간 지원"]',
  '["完整产品目录浏览", "工厂匹配申请无限次", "市场调研请求无限次", "检验报告查阅", "专属MD 1对1分配", "最优先处理(12小时内)", "VIP新品专属通知", "新品共同开发参与", "每年2次中国工厂参观", "KakaoTalk/微信实时支持"]',
  3
)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS 활성화
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책
CREATE POLICY IF NOT EXISTS "plans_public_read" ON subscription_plans FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "subs_owner_read" ON subscriptions FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY IF NOT EXISTS "subs_owner_insert" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY IF NOT EXISTS "sub_pay_owner_read" ON subscription_payments FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY IF NOT EXISTS "sub_pay_owner_insert" ON subscription_payments FOR INSERT WITH CHECK (auth.uid() = seller_id);
