# 2026-05-12 작업 로그: 주문 API 500 오류 디버깅 및 환경변수 수정

## 작업 배경
주문 접수 버튼 클릭 시 403 → 500 빈 응답 오류 발생. 원인 추적 및 수정.

---

## 발견된 문제들 (순서대로)

### 1. sellers 레코드 없음 (403 오류)
- **원인**: 관리자 계정(jo@keryx.kr)에 sellers 레코드가 없어서 주문 API가 403 반환
- **해결**: Supabase SQL Editor에서 직접 INSERT
  ```sql
  INSERT INTO sellers (user_id, business_name, country, contact_name)
  SELECT id, '조은진 (관리자)', 'KR', '조은진'
  FROM auth.users WHERE email = 'jo@keryx.kr'
  ON CONFLICT (user_id) DO NOTHING;
  ```

### 2. orders 테이블 DB 마이그레이션 미적용 (500 오류)
- **원인**: `buyer_pending` ENUM 값, `buyer_order_note` 등 컬럼이 DB에 없음
- **해결**: Supabase SQL Editor에서 마이그레이션 수동 실행
  - `ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'buyer_pending'` 등
  - `ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_order_note TEXT` 등

### 3. order_items.factory_id NOT NULL 제약 (500 오류)
- **원인**: order_items 테이블의 factory_id가 NOT NULL인데 값을 넣지 않음
- **해결**: `ALTER TABLE order_items ALTER COLUMN factory_id DROP NOT NULL;`

### 4. sellers 자동 생성 코드에서 잘못된 컬럼명 사용
- **원인**: 코드에서 `current_grade`, `contact_email` 컬럼 사용 → 실제 DB에 없는 컬럼
- **실제 sellers 테이블 컬럼**: id, user_id, business_name, business_registration_no, legal_representative, primary_channel, channel_url, country(NOT NULL), contact_name, ...
- **해결**: `country: 'KR'`, `contact_name` 으로 수정

### 5. Supabase API Keys 형식 변경 (핵심 원인)
- **원인**: Supabase가 새로운 API Key 형식(`sb_` prefix)으로 업데이트됨
  - 구형: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT 형식)
  - 신형: `sb_publishable_...` / `sb_secret_...`
- **Vercel에 설정된 값이 구형 JWT였음** → `createAdminClient()`가 실제 service_role 권한 없이 동작
- **해결**: Vercel 환경변수 업데이트
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `sb_publishable_1e7d4eHR7LsN21qiS8VNmw_zrAg3tga`
  - `SUPABASE_SERVICE_ROLE_KEY` → `sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn`
- **Vercel Redeploy 실행** (환경변수 변경 후 반드시 필요)

---

## 코드 변경 커밋 목록

| 커밋 | 내용 |
|------|------|
| b05f81e | sellers insert use approval_status+tier, orders use pending status |
| 3cd88b0 | remove desired_delivery_date from orders insert (column not in DB) |
| 3b59c33 | order status buyer_pending, remove invalid columns from sellers auto-create |
| df76995 | orders INSERT에 order_no 자동 생성 추가 (NOT NULL 오류 해결) |
| cdf07b2 | buyer/orders API 전체 try-catch 추가, 상세 오류 메시지 반환 |
| 783d231 | buyer/orders API - createAdminClient 사용으로 RLS 우회 |
| 최신 | sellers 자동 생성 시 실제 DB 컬럼명으로 수정 (country, contact_name) |

---

## Supabase DB 직접 변경 사항 (마이그레이션 파일에 없음 - 수동 적용)

```sql
-- 1. order_status ENUM 값 추가
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'buyer_pending';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_production';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'qc_pending';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'qc_passed';

-- 2. orders 테이블 컬럼 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_order_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packaging_request TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_info TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_info_sent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'md';

-- 3. seller_notifications 업데이트
ALTER TABLE seller_notifications DROP CONSTRAINT IF EXISTS seller_notifications_type_check;
ALTER TABLE seller_notifications ADD CONSTRAINT seller_notifications_type_check
  CHECK (type IN ('report_received', 'reply_received', 'order_update', 'general', 'payment_info'));
ALTER TABLE seller_notifications ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- 4. order_items factory_id NULL 허용
ALTER TABLE order_items ALTER COLUMN factory_id DROP NOT NULL;

-- 5. sellers 레코드 (관리자)
INSERT INTO sellers (user_id, business_name, country, contact_name)
SELECT id, '조은진 (관리자)', 'KR', '조은진'
FROM auth.users WHERE email = 'jo@keryx.kr'
ON CONFLICT (user_id) DO NOTHING;
```

---

## 환경변수 현황 (2026-05-12 기준)

| 변수명 | 값 | 비고 |
|--------|-----|------|
| NEXT_PUBLIC_SUPABASE_URL | https://iqfcfpkztoyuzbeqodbq.supabase.co | 변경 없음 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | sb_publishable_1e7d4eHR7LsN21qiS8VNmw_zrAg3tga | 신형으로 업데이트 |
| SUPABASE_SERVICE_ROLE_KEY | sb_secret_QEVLddg_Rat6HTXBcMjWpw_UsUQEvTn | 신형으로 업데이트 |
| NEXT_PUBLIC_APP_URL | https://keryx.vercel.app | 변경 없음 |

---

## 중요 교훈

1. **500 빈 응답 ≠ RLS 오류**: RLS 오류는 403 또는 오류 메시지가 있는 500. 빈 응답은 코드 자체 예외.
2. **Supabase API Key 형식 변경**: 2025년 이후 Supabase는 `sb_publishable_` / `sb_secret_` 형식 사용. 구형 JWT 키가 Vercel에 남아있으면 createAdminClient()가 실제 권한 없이 동작.
3. **환경변수 변경 후 Redeploy 필수**: Vercel 환경변수 변경은 즉시 반영되지 않음. 반드시 Redeploy 필요.
4. **DB 마이그레이션 수동 적용 추적**: 코드의 마이그레이션 파일이 Supabase에 자동 적용되지 않음. 수동으로 실행한 SQL은 이 문서에 기록.

---

## 다음 단계
- [ ] Redeploy 완료 후 주문 접수 최종 테스트
- [ ] 매칭 버튼 및 나의 매칭 공장 페이지 테스트
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY도 신형으로 업데이트 확인
