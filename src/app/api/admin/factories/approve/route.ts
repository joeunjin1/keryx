import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient() as any;
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
    const { factory_id, action, reject_reason } = body;
    // action: 'approve' | 'reject'

    if (!factory_id || !action) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
    }

    if (action === 'approve') {
      // 현재 최대 factory_code 조회 후 다음 코드 생성
      const { data: lastFactory } = await supabase
        .from('factories')
        .select('factory_code')
        .like('factory_code', 'F%')
        .order('factory_code', { ascending: false })
        .limit(1)
        .single();

      let nextCode = 'F001';
      if (lastFactory?.factory_code) {
        const num = parseInt(lastFactory.factory_code.replace('F', ''), 10);
        nextCode = `F${String(num + 1).padStart(3, '0')}`;
      }

      const { error: updateError } = await supabase
        .from('factories')
        .update({
          approval_status: 'approved',
          factory_code: nextCode,
          approved_at: new Date().toISOString(),
        })
        .eq('id', factory_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, factory_code: nextCode, message: `공장 승인 완료 (코드: ${nextCode})` });

    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('factories')
        .update({
          approval_status: 'rejected',
          internal_notes: reject_reason || '관리자 반려',
        })
        .eq('id', factory_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, message: '공장 가입 반려 처리 완료' });

    } else {
      return NextResponse.json({ error: '잘못된 action 값' }, { status: 400 });
    }

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
