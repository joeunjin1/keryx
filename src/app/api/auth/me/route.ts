import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient() as any;
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ user: null, role: null });
    }

    // user_profiles 테이블에서 역할(kind) 조회
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind, display_name')
      .eq('id', user.id)
      .single();

    const role = profile?.kind || null;

    return NextResponse.json({
      user: { id: user.id, email: user.email, displayName: profile?.display_name },
      role,
    });
  } catch {
    return NextResponse.json({ user: null, role: null });
  }
}
