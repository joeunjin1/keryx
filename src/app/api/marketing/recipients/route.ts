import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/check-role';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const user = await getAuthUser(['admin', 'marketing']);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  // user_profiles에서 발송 대상 목록 조회 (seller, factory, md)
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, display_name, phone, kind, created_at')
    .in('kind', ['seller', 'factory', 'md'])
    .order('display_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipients: data ?? [] });
}
