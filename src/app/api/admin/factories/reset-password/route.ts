/**
 * POST /api/admin/factories/reset-password
 * 관리자가 공장 계정 비밀번호를 재설정하는 API
 * - 기존 공장 계정의 로그인 불가 문제 해결용
 * - createAdminClient() 사용 (service_role, RLS 우회)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. 요청자 admin 권한 확인
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();
    if (!profile || profile.kind !== 'admin') {
      return NextResponse.json({ error: '관리자만 비밀번호를 재설정할 수 있습니다.' }, { status: 403 });
    }

    // 2. 요청 바디 파싱
    const body = await req.json();
    const { factory_user_id, new_password } = body;

    if (!factory_user_id || !new_password) {
      return NextResponse.json({ error: 'factory_user_id와 new_password는 필수입니다.' }, { status: 400 });
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    // 3. 해당 user_id가 factory 계정인지 확인
    const adminClient = createAdminClient() as any;
    const { data: targetProfile } = await adminClient
      .from('user_profiles')
      .select('id, email, kind')
      .eq('id', factory_user_id)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: '해당 사용자를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (targetProfile.kind !== 'factory') {
      return NextResponse.json({ error: '공장 계정만 이 API로 비밀번호를 재설정할 수 있습니다.' }, { status: 400 });
    }

    // 4. 비밀번호 재설정 (updateUserById)
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      factory_user_id,
      {
        password: new_password,
        email_confirm: true,
      }
    );

    if (updateError) {
      return NextResponse.json(
        { error: `비밀번호 재설정 실패: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `${targetProfile.email} 계정의 비밀번호가 재설정되었습니다.`,
      email: targetProfile.email,
    });
  } catch (e: any) {
    console.error('[reset-password] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
