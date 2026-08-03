import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/check-role';

export async function POST(req: NextRequest) {
  // 관리자만 허용
  const user = await getAuthUser(['admin']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { user_id, new_password } = body;

  if (!user_id || !new_password) {
    return NextResponse.json({ error: 'user_id와 new_password가 필요합니다.' }, { status: 400 });
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
  }

  // 관리자 자신의 비밀번호는 이 API로 변경 불가 (보안)
  if (user_id === user.id) {
    return NextResponse.json({ error: '관리자 본인 비밀번호는 이 페이지에서 변경할 수 없습니다.' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ password: new_password }),
    });

    if (!res.ok) {
      const errData = await res.json();
      return NextResponse.json({ error: errData.message || '비밀번호 변경 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error('비밀번호 재설정 오류:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
