/**
 * POST /api/admin/factories/create-account
 * 관리자가 공장 계정(이메일+비밀번호)을 직접 생성하는 API
 * - Supabase Auth에 계정 생성 (auth.admin.createUser)
 * - 비밀번호 명시적 재설정 (updateUserById) - 로그인 보장
 * - user_profiles 테이블에 kind='factory' 레코드 UPSERT (중복 방지)
 * - factories 테이블에 공장 정보 INSERT (factory_code 자동 생성)
 * - createAdminClient() 사용 (service_role, RLS 우회)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. 요청자 인증 및 권한 확인 (admin만 허용)
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
      return NextResponse.json({ error: '관리자만 공장 계정을 생성할 수 있습니다.' }, { status: 403 });
    }

    // 2. 요청 바디 파싱
    const body = await req.json();
    const {
      email,
      password,
      company_name,       // 중국어 회사명 (필수)
      company_name_ko,    // 한국어 회사명 (선택)
      contact_name,       // 담당자명
      contact_phone,      // 연락처
      contact_wechat,     // 위챗 ID
      city,               // 도시
      province,           // 성/지역
      primary_categories, // 주요 카테고리 (배열)
    } = body;

    if (!email || !password || !company_name) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 회사명(중국어)은 필수입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 최소 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 3. Admin 클라이언트로 작업 수행
    const adminClient = createAdminClient() as any;

    // 4. 이메일 중복 확인 (user_profiles + Auth 양쪽 체크)
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .single();
    if (existingProfile) {
      return NextResponse.json(
        { error: `이미 등록된 이메일입니다: ${email}` },
        { status: 409 }
      );
    }

    // Auth에서도 이메일 중복 확인 (고아 계정 체크)
    const { data: authListData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = authListData?.users?.find((u: any) => u.email === email);
    if (existingAuthUser) {
      // 고아 Auth 계정 삭제 후 재생성
      await adminClient.auth.admin.deleteUser(existingAuthUser.id);
    }

    // 5. factory_code 자동 생성 (F001, F002, ...)
    const { data: lastFactory } = await adminClient
      .from('factories')
      .select('factory_code')
      .like('factory_code', 'F%')
      .order('factory_code', { ascending: false })
      .limit(1)
      .single();
    let nextCode = 'F001';
    if (lastFactory?.factory_code) {
      const match = lastFactory.factory_code.match(/^F(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        nextCode = `F${String(num + 1).padStart(3, '0')}`;
      }
    }

    // 6. Supabase Auth에 계정 생성
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 없이 바로 활성화
    });
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: `Auth 계정 생성 실패: ${authError?.message ?? '알 수 없는 오류'}` },
        { status: 400 }
      );
    }
    const newUserId = authData.user.id;

    // 7. 비밀번호 명시적 재설정 (createUser 후 updateUserById로 재설정하여 로그인 보장)
    const { error: pwError } = await adminClient.auth.admin.updateUserById(newUserId, {
      password,
      email_confirm: true,
    });
    if (pwError) {
      console.warn(`[create-account] 비밀번호 재설정 경고 (계속 진행): ${pwError.message}`);
    }

    // 8. user_profiles 테이블에 UPSERT (중복 키 오류 방지)
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .upsert({
        id: newUserId,
        email,
        kind: 'factory',
        display_name: company_name_ko || company_name,
        is_active: true,
      }, { onConflict: 'id' });
    if (profileError) {
      // Auth 계정 롤백
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `프로필 생성 실패: ${profileError.message}` },
        { status: 400 }
      );
    }

    // 9. factories 테이블에 INSERT
    const { data: factoryData, error: factoryError } = await adminClient
      .from('factories')
      .insert({
        factory_code: nextCode,
        company_name,
        company_name_ko: company_name_ko || null,
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        contact_wechat: contact_wechat || null,
        contact_email: email,
        city: city || null,
        province: province || null,
        primary_categories: primary_categories || [],
        shared_login_user_id: newUserId,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .select('id, factory_code, company_name')
      .single();
    if (factoryError) {
      // Auth 계정 및 프로필 롤백
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `공장 정보 생성 실패: ${factoryError.message}` },
        { status: 400 }
      );
    }

    // 10. 성공 응답 (생성된 계정 정보 반환)
    return NextResponse.json({
      ok: true,
      message: '공장 계정이 성공적으로 생성되었습니다.',
      account: {
        user_id: newUserId,
        email,
        password, // 초기 비밀번호 (화면에 표시 후 안전하게 전달)
        factory_id: factoryData.id,
        factory_code: factoryData.factory_code,
        company_name: factoryData.company_name,
      },
    });
  } catch (e: any) {
    console.error('[create-account] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
