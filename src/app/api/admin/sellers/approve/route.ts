import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient() as any;

    // 관리자 권한 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'md'].includes(profile.kind)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const body = await req.json();
    const { seller_id, action, reject_reason } = body;

    if (!seller_id || !action) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
    }

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', seller_id);

      if (updateError) {
        // approved_at, approved_by 컬럼이 없을 수 있으므로 fallback
        const { error: fallbackError } = await supabase
          .from('sellers')
          .update({ approval_status: 'approved' })
          .eq('id', seller_id);
        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 400 });
        }
      }

      return NextResponse.json({ ok: true, message: '회원 승인이 완료되었습니다' });

    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          approval_status: 'rejected',
        })
        .eq('id', seller_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, message: '회원 가입이 반려 처리되었습니다' });

    } else {
      return NextResponse.json({ error: '잘못된 action 값 (approve 또는 reject)' }, { status: 400 });
    }

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
