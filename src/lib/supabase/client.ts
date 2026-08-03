/**
 * Supabase 클라이언트 사이드 클라이언트
 * keryx-platform-dev 스킬 §2 준수 - 데이터 관리 원칙
 * 
 * 사용처: 'use client' 컴포넌트에서 직접 Supabase 접근이 필요한 경우
 * 주의: 서버 컴포넌트에서는 @/lib/supabase/server 사용
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  return createBrowserClient(url, key);
}
