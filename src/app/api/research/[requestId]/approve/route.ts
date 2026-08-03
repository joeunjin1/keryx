import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(
  _req: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role, approval_authority')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || me.role !== 'admin' || !me.approval_authority) {
    return NextResponse.json({ error: 'admin approval authority required' }, { status: 403 });
  }

  const { error } = await supabase.rpc('market_research_admin_approve', {
    p_request_id: params.requestId,
    p_admin_internal_user_id: me.id,
  }) as { data: any; error: any };

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
