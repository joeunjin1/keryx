/**
 * POST /api/admin/fix-factories
 * factories 테이블에 누락된 컬럼을 추가하는 일회성 마이그레이션 API
 * - shared_login_user_id, primary_categories, approval_status, company_name_ko, contact_wechat, province, approved_at
 * - service_role 클라이언트 사용 (RLS 우회)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.secret !== 'KERYX_INIT_2026') {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    const adminClient = createAdminClient() as any;
    const results: string[] = [];

    // 각 컬럼을 개별적으로 추가 시도 (이미 있으면 무시)
    const columns = [
      { name: 'shared_login_user_id', type: 'UUID' },
      { name: 'primary_categories', type: "TEXT[] DEFAULT '{}'" },
      { name: 'approval_status', type: "TEXT DEFAULT 'approved'" },
      { name: 'company_name_ko', type: 'TEXT' },
      { name: 'contact_wechat', type: 'TEXT' },
      { name: 'province', type: 'TEXT' },
      { name: 'approved_at', type: 'TIMESTAMPTZ' },
    ];

    for (const col of columns) {
      // Supabase JS 클라이언트로는 DDL 직접 실행 불가 → 컬럼 존재 여부 체크
      const { data, error } = await adminClient
        .from('factories')
        .select(col.name)
        .limit(1);
      
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        results.push(`${col.name}: 컬럼 없음 (수동 추가 필요)`);
      } else if (error) {
        results.push(`${col.name}: 오류 - ${error.message}`);
      } else {
        results.push(`${col.name}: 이미 존재`);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'factories 테이블 컬럼 상태 확인 완료',
      results,
      sql_to_run: `
ALTER TABLE public.factories
  ADD COLUMN IF NOT EXISTS shared_login_user_id  UUID,
  ADD COLUMN IF NOT EXISTS primary_categories    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approval_status       TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS company_name_ko       TEXT,
  ADD COLUMN IF NOT EXISTS contact_wechat        TEXT,
  ADD COLUMN IF NOT EXISTS province              TEXT,
  ADD COLUMN IF NOT EXISTS approved_at           TIMESTAMPTZ;
      `.trim()
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
