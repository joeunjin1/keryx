import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * [web-performance-resilience 스킬 준수]
 * 자동 에러 보고 API - ErrorBoundary 및 error.tsx에서 호출
 * 관리자에게 silent 알림 전송
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, stack, digest, componentStack, url, timestamp } = body;

    // 에러 내용 로깅 (서버 로그)
    console.error('[ERROR_REPORT]', {
      type,
      message,
      digest,
      url,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Supabase에 에러 로그 저장 (선택적 - 테이블이 있는 경우)
    try {
      const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;
      await adminSupabase.from('error_logs').insert({
        error_type: type || 'unknown',
        message: message?.substring(0, 1000) || 'Unknown error',
        stack_trace: (stack || componentStack || '')?.substring(0, 5000),
        page_url: url?.substring(0, 500),
        error_digest: digest,
        created_at: timestamp || new Date().toISOString(),
      });
    } catch {
      // error_logs 테이블이 없어도 무시
    }

    return NextResponse.json({ ok: true });
  } catch {
    // 에러 보고 자체가 실패해도 200 반환 (사용자 경험 영향 없음)
    return NextResponse.json({ ok: true });
  }
}
