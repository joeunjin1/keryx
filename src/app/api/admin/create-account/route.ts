/**
 * POST /api/admin/create-account
 * 관리자가 모든 역할(md, inspector, seller, factory)의 계정을 직접 생성하는 통합 API
 * - Supabase Auth admin.createUser()로 계정 즉시 생성 (이메일 인증 불필요)
 * - user_profiles 테이블 INSERT
 * - 역할별 추가 테이블 (sellers, factories) INSERT
 * - 실패 시 Auth 계정 롤백
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. 요청자 권한 확인 (admin만 허용)
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
      return NextResponse.json({ error: '관리자만 계정을 생성할 수 있습니다.' }, { status: 403 });
    }

    // 2. 요청 바디 파싱
    const body = await req.json();
    const {
      role,           // 'md' | 'inspector' | 'seller' | 'factory'
      email,
      password,
      display_name,   // 이름/회사명 (한국어)
      display_name_zh, // 이름/회사명 (중국어, 공장용)
      contact_name,
      contact_phone,
      contact_wechat,
      city,
      province,
      business_name,  // 바이어 상호명
      country,        // 바이어 국가
    } = body;

    if (!role || !email || !password) {
      return NextResponse.json({ error: '역할, 이메일, 비밀번호는 필수입니다.' }, { status: 400 });
    }
    if (!['md', 'inspector', 'seller', 'factory'].includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 역할입니다. (md/inspector/seller/factory)' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '비밀번호는 최소 8자 이상이어야 합니다.' }, { status: 400 });
    }

    const adminClient = createAdminClient() as any;

    // 3. 이메일 중복 확인
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id, email')
      .eq('email', email)
      .single();
    if (existingProfile) {
      return NextResponse.json({ error: `이미 등록된 이메일입니다: ${email}` }, { status: 409 });
    }

    // 4. Supabase Auth 계정 생성
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: `Auth 계정 생성 실패: ${authError?.message ?? '알 수 없는 오류'}` },
        { status: 400 }
      );
    }
    const newUserId = authData.user.id;

    // 5. user_profiles INSERT
    const profileDisplayName = display_name || display_name_zh || contact_name || email.split('@')[0];
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: newUserId,
        email,
        kind: role,
        display_name: profileDisplayName,
        is_active: true,
      });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: `프로필 생성 실패: ${profileError.message}` }, { status: 400 });
    }

    // 6. 역할별 추가 테이블 처리
    let extraData: Record<string, unknown> = {};

    if (role === 'factory') {
      // factory_code 자동 생성
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
          nextCode = `F${String(parseInt(match[1], 10) + 1).padStart(3, '0')}`;
        }
      }
      const { data: factoryData, error: factoryError } = await adminClient
        .from('factories')
        .insert({
          factory_code: nextCode,
          company_name: display_name_zh || display_name || profileDisplayName,
          company_name_ko: display_name || null,
          contact_name: contact_name || null,
          contact_phone: contact_phone || null,
          contact_wechat: contact_wechat || null,
          contact_email: email,
          city: city || null,
          province: province || null,
          shared_login_user_id: newUserId,
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .select('id, factory_code')
        .single();
      if (factoryError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return NextResponse.json({ error: `공장 정보 생성 실패: ${factoryError.message}` }, { status: 400 });
      }
      extraData = { factory_id: factoryData.id, factory_code: factoryData.factory_code };

    } else if (role === 'seller') {
      // sellers 테이블 INSERT
      const { error: sellerError } = await adminClient
        .from('sellers')
        .insert({
          user_id: newUserId,
          business_name: business_name || display_name || profileDisplayName,
          contact_name: contact_name || null,
          contact_email: email,
          contact_phone: contact_phone || null,
          country: country || 'KR',
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        });
      if (sellerError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return NextResponse.json({ error: `바이어 정보 생성 실패: ${sellerError.message}` }, { status: 400 });
      }
    }
    // md, inspector는 user_profiles만으로 충분

    return NextResponse.json({
      ok: true,
      message: `${roleLabel(role)} 계정이 성공적으로 생성되었습니다.`,
      account: {
        user_id: newUserId,
        role,
        email,
        password,
        display_name: profileDisplayName,
        ...extraData,
      },
    });
  } catch (e: any) {
    console.error('[create-account] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    md: 'MD',
    inspector: '검수원',
    seller: '바이어',
    factory: '공장',
  };
  return labels[role] ?? role;
}
