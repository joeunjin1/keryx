-- 통합 소통 시스템을 위한 conversations 및 messages 테이블 확장

-- 1. conversations 테이블 확장 (기존 테이블이 있으면 ALTER, 없으면 CREATE)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'topic_type') THEN
    ALTER TABLE public.conversations ADD COLUMN topic_type text DEFAULT 'general'; -- 'general', 'market_research', 'factory_matching', 'sample_development', 'order_inquiry', 'product_inquiry'
    ALTER TABLE public.conversations ADD COLUMN topic_id uuid; -- 연관된 엔티티 ID (예: unified_requests.id, orders.id 등)
    ALTER TABLE public.conversations ADD COLUMN title text; -- 대화방 제목
    ALTER TABLE public.conversations ADD COLUMN status text DEFAULT 'open'; -- 'open', 'closed', 'archived'
    ALTER TABLE public.conversations ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb; -- 바이어 입력 정보 등 추가 데이터
  END IF;
END $$;

-- 2. messages 테이블 확장
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
    ALTER TABLE public.messages ADD COLUMN message_type text DEFAULT 'text'; -- 'text', 'system', 'form_submission', 'report', 'quote'
    ALTER TABLE public.messages ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb; -- 폼 데이터, 견적 데이터 등
  END IF;
END $$;

-- 3. 기존 분산된 데이터 마이그레이션 뷰/함수 (선택적)
-- 추후 기존 데이터를 conversations/messages로 마이그레이션하기 위한 준비
