import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(
  _req: Request,
  { params }: { params: { characterId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role, approval_authority')
    .eq('user_id', user.id)
    .single();
  if (!me || me.role !== 'admin') {
    return NextResponse.json({ error: 'admin required' }, { status: 403 });
  }

  const { error } = await supabase.rpc('approve_ip_character', {
    p_character_id: params.characterId,
    p_approved_by: me.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
