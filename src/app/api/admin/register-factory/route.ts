import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient() as any;
  const adminSupabase = createAdminClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'md'].includes(profile.kind)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { company_name, company_name_ko, contact_name, email, phone, city, skip_approval } = body;

    if (!company_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: '공장명과 이메일은 필수입니다.' }, { status: 400 });
    }

    // Auth 사용자 생성 - adminSupabase(service_role_key)로 호출해야 함
    const tempPassword = Math.random().toString(36).slice(-10) + 'Fx1!';
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // user_profiles 생성
    await adminSupabase.from('user_profiles').insert({
      id: newUserId,
      kind: 'factory',
      display_name: company_name_ko?.trim() || company_name.trim(),
      email: email.trim(),
    });

    // [TDA-1 스킬 준수] 공장 등록 시 approval_status를 'pending'으로 설정
    // 관리자가 직접 등록하는 경우 skip_approval=true 파라미터로 즉시 승인 가능
    const approvalStatus = (profile.kind === 'admin' && skip_approval === true) ? 'approved' : 'pending';

    // factories 테이블에 등록
    const { error: factoryError } = await adminSupabase.from('factories').insert({
      shared_login_user_id: newUserId,
      company_name: company_name.trim(),
      company_name_ko: company_name_ko?.trim() || '',
      contact_name: contact_name?.trim() || '',
      contact_email: email.trim(),
      contact_phone: phone?.trim() || '',
      city: city?.trim() || '',
      approval_status: approvalStatus,
    });

    if (factoryError) {
      return NextResponse.json({ error: factoryError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      temp_password: tempPassword,
      approval_status: approvalStatus,
      message: approvalStatus === 'pending'
        ? '공장이 등록되었습니다. 관리자 승인 후 활성화됩니다.'
        : '공장이 즉시 승인되어 활성화되었습니다.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
