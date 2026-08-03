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
    const { business_name, contact_name, email, phone, country } = body;

    if (!business_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: '상호명과 이메일은 필수입니다.' }, { status: 400 });
    }

    // 이메일로 Auth 사용자 생성 (임시 비밀번호)
    const tempPassword = Math.random().toString(36).slice(-10) + 'Kx1!';
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
      kind: 'seller',
      display_name: contact_name?.trim() || business_name.trim(),
      email: email.trim(),
    });

    // sellers 테이블에 등록
    const { error: sellerError } = await adminSupabase.from('sellers').insert({
      shared_login_user_id: newUserId,
      business_name: business_name.trim(),
      contact_name: contact_name?.trim() || '',
      email: email.trim(),
      phone: phone?.trim() || '',
      country: country || 'KR',
      approval_status: 'approved',
      tier: 'standard',
    });

    if (sellerError) {
      return NextResponse.json({ error: sellerError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, temp_password: tempPassword });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
