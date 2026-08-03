-- factories 테이블 누락 컬럼 추가
-- shared_login_user_id: 공장 로그인 계정 연결
-- primary_categories: 주요 카테고리
-- approval_status: 승인 상태
-- company_name_ko: 한국어 회사명
-- contact_wechat: 위챗 ID
-- province: 성/지역

ALTER TABLE public.factories
  ADD COLUMN IF NOT EXISTS shared_login_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_categories    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approval_status       TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS company_name_ko       TEXT,
  ADD COLUMN IF NOT EXISTS contact_wechat        TEXT,
  ADD COLUMN IF NOT EXISTS province              TEXT,
  ADD COLUMN IF NOT EXISTS approved_at           TIMESTAMPTZ;

-- 인덱스 추가 (로그인 시 공장 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_factories_shared_login_user_id 
  ON public.factories(shared_login_user_id) 
  WHERE shared_login_user_id IS NOT NULL;

-- RLS: 공장 계정이 자신의 공장 정보를 볼 수 있도록
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'factories' AND policyname = 'factory_user_select_own'
  ) THEN
    CREATE POLICY "factory_user_select_own" ON public.factories
      FOR SELECT USING (
        shared_login_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND kind IN ('admin', 'md')
        )
      );
  END IF;
END $$;
