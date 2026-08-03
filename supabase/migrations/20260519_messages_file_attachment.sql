-- messages 테이블에 파일 첨부 기능 컬럼 추가
-- 기존 데이터를 건드리지 않는 안전한 ALTER TABLE
DO $$
BEGIN
  -- file_url: Supabase Storage 업로드 후 공개 URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN file_url text;
  END IF;

  -- file_name: 원본 파일명
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN file_name text;
  END IF;

  -- file_type: MIME 타입 (image/jpeg, application/pdf 등)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN file_type text;
  END IF;
END $$;
