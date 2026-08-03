-- chat-files Supabase Storage 버킷 생성 및 RLS 정책
-- 기존 버킷이 있으면 무시 (IF NOT EXISTS 패턴)

-- 1. chat-files 버킷 생성 (공개 버킷: 인증된 사용자만 업로드, 누구나 읽기)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760, -- 10MB 제한
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 인증된 사용자만 업로드 가능
CREATE POLICY "chat_files_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- 3. 공개 읽기 (URL로 접근 가능)
CREATE POLICY "chat_files_read_policy"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

-- 4. 본인 파일만 삭제 가능
CREATE POLICY "chat_files_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
