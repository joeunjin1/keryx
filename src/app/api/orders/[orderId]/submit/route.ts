import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Caller must be MD or admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase.rpc('submit_order_for_approval', {
    p_order_id: params.orderId,
  }) as { data: any; error: any };

  if (error) {
    console.error('submit failed', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
