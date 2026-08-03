-- ============================================================
-- KERYX 구독 관리 시스템 DB 스키마
-- 생성일: 2026-05-01
-- ============================================================

-- 1. 구독 플랜 정의 테이블
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT PRIMARY KEY,          -- 'basic', 'premium', 'vip_pro'
  name_ko       TEXT NOT NULL,             -- '베이직'
  name_zh       TEXT NOT NULL,             -- '基础版'
  price_monthly INTEGER NOT NULL DEFAULT 0, -- 월간 가격 (위안)
  price_yearly  INTEGER NOT NULL DEFAULT 0, -- 연간 가격 (위안, 30% 할인)
  currency      TEXT NOT NULL DEFAULT 'CNY',
  description_ko TEXT,
  description_zh TEXT,
  features_ko   JSONB DEFAULT '[]',        -- 혜택 목록 (한국어)
  features_zh   JSONB DEFAULT '[]',        -- 혜택 목록 (중국어)
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
  
  -- 기간
  trial_start_at  TIMESTAMPTZ,             -- 무료 체험 시작
  trial_end_at    TIMESTAMPTZ,             -- 무료 체험 종료 (보통 30일)
  starts_at       TIMESTAMPTZ,             -- 유료 구독 시작
  ends_at         TIMESTAMPTZ,             -- 구독 만료
  cancelled_at    TIMESTAMPTZ,             -- 취소 시각
  
  -- 결제 정보
  amount_cny      INTEGER,                 -- 결제 금액 (위안)
  payment_method  TEXT,                    -- 'wechat', 'alipay', 'bank_transfer', 'card'
  payment_ref     TEXT,                    -- 결제 참조번호 (영수증 번호 등)
  payment_note    TEXT,                    -- 결제 메모
  
  -- 관리자 처리
  admin_id        UUID,                    -- 승인한 관리자 ID
  admin_note      TEXT,                    -- 관리자 메모
  approved_at     TIMESTAMPTZ,             -- 승인 시각
  
  -- 갱신 추적
  renewal_count   INTEGER DEFAULT 0,       -- 갱신 횟수
  last_renewed_at TIMESTAMPTZ,             -- 마지막 갱신
  next_renewal_at TIMESTAMPTZ,             -- 다음 갱신 예정
  
  -- 알림
  renewal_notified_at TIMESTAMPTZ,         -- 갱신 알림 발송 시각
  
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
  confirmed_by    UUID,                    -- 확인한 관리자
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_seller_id ON subscriptions(seller_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ends_at ON subscriptions(ends_at);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_seller_id ON subscription_payments(seller_id);

-- 5. updated_at 자동 갱신 트리거
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

-- 6. 기본 플랜 데이터 삽입
INSERT INTO subscription_plans (id, name_ko, name_zh, price_monthly, price_yearly, description_ko, description_zh, features_ko, features_zh, sort_order)
VALUES
(
  'basic',
  '베이직',
  '基础版',
  300,
  2520,  -- 300 * 12 * 0.7 = 2520 (30% 할인)
  '중국 공장 소싱을 시작하는 셀러를 위한 기본 플랜',
  '适合开始中国工厂采购的卖家的基础方案',
  '["제품 카탈로그 전체 열람", "공장 매칭 신청 월 2회", "시장조사 요청 월 10건", "검수 보고서 열람", "이메일 지원"]',
  '["完整产品目录浏览", "工厂匹配申请每月2次", "市场调研请求每月10次", "检验报告查阅", "邮件支持"]',
  1
),
(
  'premium',
  '프리미엄',
  '专业版',
  500,
  4200,  -- 500 * 12 * 0.7 = 4200 (30% 할인)
  '성장하는 셀러를 위한 전문 소싱 파트너십',
  '为成长型卖家提供的专业采购合作',
  '["제품 카탈로그 전체 열람", "공장 매칭 신청 월 4회", "시장조사 요청 무제한", "검수 보고서 열람", "전담 MD 배정", "우선 처리 (24h 이내)", "VIP 전용 신제품 알림", "카카오톡 실시간 지원"]',
  '["完整产品目录浏览", "工厂匹配申请每月4次", "市场调研请求无限次", "检验报告查阅", "专属MD分配", "优先处理(24小时内)", "VIP新品专属通知", "微信实时支持"]',
  2
),
(
  'vip_pro',
  'VIP PRO',
  'VIP专业版',
  800,
  6720,  -- 800 * 12 * 0.7 = 6720 (30% 할인)
  '최고 수준의 소싱 파트너십이 필요한 파워 셀러를 위한 플랜',
  '为需要顶级采购合作的强力卖家提供的方案',
  '["제품 카탈로그 전체 열람", "공장 매칭 신청 무제한", "시장조사 요청 무제한", "검수 보고서 열람", "전담 MD 1:1 배정", "최우선 처리 (12h 이내)", "VIP 전용 신제품 알림", "신제품 공동개발 참여", "연 2회 중국 공장 투어", "카카오톡/위챗 실시간 지원"]',
  '["完整产品目录浏览", "工厂匹配申请无限次", "市场调研请求无限次", "检验报告查阅", "专属MD 1对1分配", "最优先处理(12小时内)", "VIP新品专属通知", "新品共同开发参与", "每年2次中国工厂参观", "KakaoTalk/微信实时支持"]',
  3
)
ON CONFLICT (id) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features_ko = EXCLUDED.features_ko,
  features_zh = EXCLUDED.features_zh,
  updated_at = NOW() -- subscription_plans에는 updated_at 없으므로 무시됨
;

-- 7. RLS 정책
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 플랜은 누구나 읽기 가능
CREATE POLICY "subscription_plans_public_read" ON subscription_plans
  FOR SELECT USING (true);

-- 구독: 본인 것만 읽기
CREATE POLICY "subscriptions_owner_read" ON subscriptions
  FOR SELECT USING (auth.uid() = seller_id);

-- 구독: 본인이 생성
CREATE POLICY "subscriptions_owner_insert" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- 구독 결제: 본인 것만 읽기
CREATE POLICY "subscription_payments_owner_read" ON subscription_payments
  FOR SELECT USING (auth.uid() = seller_id);

-- 구독 결제: 본인이 생성
CREATE POLICY "subscription_payments_owner_insert" ON subscription_payments
  FOR INSERT WITH CHECK (auth.uid() = seller_id);
