-- =====================================================
-- 2026-05-12: 바이어 직접 주문 시스템 + 결제 정보 전송
-- =====================================================

-- 1. orders 테이블에 바이어 주문 관련 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS buyer_order_note      TEXT,
  ADD COLUMN IF NOT EXISTS packaging_request     TEXT,
  ADD COLUMN IF NOT EXISTS payment_info          TEXT,
  ADD COLUMN IF NOT EXISTS payment_info_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_info_sent_by  UUID REFERENCES internal_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source                TEXT DEFAULT 'md';

-- 2. orders status CHECK 제약 업데이트
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'draft',
    'buyer_pending',
    'pending',
    'confirmed',
    'in_production',
    'qc_pending',
    'qc_passed',
    'shipped',
    'delivered',
    'cancelled'
  ));

-- 3. seller_notifications type 제약 업데이트 (payment_info 추가)
ALTER TABLE seller_notifications DROP CONSTRAINT IF EXISTS seller_notifications_type_check;
ALTER TABLE seller_notifications ADD CONSTRAINT seller_notifications_type_check
  CHECK (type IN ('report_received', 'reply_received', 'order_update', 'general', 'payment_info'));

-- 4. seller_notifications에 order_id 컬럼 추가
ALTER TABLE seller_notifications
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- 5. orders RLS 정책
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_select_own_orders" ON orders;
CREATE POLICY "seller_select_own_orders" ON orders
  FOR SELECT USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin', 'md'))
  );

DROP POLICY IF EXISTS "seller_insert_own_orders" ON orders;
CREATE POLICY "seller_insert_own_orders" ON orders
  FOR INSERT WITH CHECK (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin', 'md'))
  );

DROP POLICY IF EXISTS "seller_update_own_orders" ON orders;
CREATE POLICY "seller_update_own_orders" ON orders
  FOR UPDATE USING (
    (seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) AND status = 'buyer_pending')
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin', 'md'))
  );

-- 6. order_items RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_select_own_order_items" ON order_items;
CREATE POLICY "seller_select_own_order_items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o JOIN sellers s ON s.id = o.seller_id WHERE s.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin', 'md'))
  );

DROP POLICY IF EXISTS "seller_insert_own_order_items" ON order_items;
CREATE POLICY "seller_insert_own_order_items" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT o.id FROM orders o JOIN sellers s ON s.id = o.seller_id WHERE s.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND kind IN ('admin', 'md'))
  );

-- 7. 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
