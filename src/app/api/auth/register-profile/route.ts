/**
 * 회원가입 후 user_profiles 자동 생성 API
 * Supabase Auth signUp은 이메일 인증 전에는 user_profiles를 생성하지 않으므로
 * 이 API를 통해 user_profiles를 미리 생성합니다.
 * service_role_key를 사용하여 RLS 우회
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, email, kind, display_name, business_name, contact_name } = body;

    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id와 email은 필수입니다.' }, { status: 400 });
    }

    const validKinds = ['seller', 'factory', 'admin', 'md', 'designer'];
    const userKind = validKinds.includes(kind) ? kind : 'seller';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // service_role 키로 RLS 우회
    const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

    // user_profiles 생성 (이미 있으면 무시)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user_id,
        kind: userKind,
        display_name: display_name || contact_name || email.split('@')[0],
        email: email,
      }, { onConflict: 'id', ignoreDuplicates: true });

    if (profileError) {
      console.warn('[register-profile] user_profiles upsert warning:', profileError.message);
      // 이미 존재하는 경우 무시
    }

    // seller인 경우 sellers 테이블에도 레코드 생성 (없는 경우만)
    if (userKind === 'seller') {
      const { data: existingSeller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user_id)
        .single();

      if (!existingSeller) {
        const { error: sellerError } = await supabase.from('sellers').insert({
          user_id: user_id,
          business_name: business_name || display_name || email.split('@')[0],
          contact_name: contact_name || display_name || email.split('@')[0],
          email: email,
          phone: '',
          country: 'KR',
          approval_status: 'pending', // 관리자 승인 대기
          tier: 'standard',
        });

        if (sellerError) {
          console.warn('[register-profile] sellers insert warning:', sellerError.message);
          // sellers 테이블 구조 불일치 시 무시 (user_profiles만 생성됨)
        }
      }
    }

    return NextResponse.json({ ok: true, kind: userKind });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[register-profile] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
