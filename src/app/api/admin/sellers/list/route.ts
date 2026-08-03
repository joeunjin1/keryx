import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient() as any;

    // 관리자 권한 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin', 'md'].includes(profile.role)) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    }

    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('id, business_name, contact_name, contact_email, approval_status, current_membership, current_grade, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sellers: sellers ?? [] });
  } catch (err) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
