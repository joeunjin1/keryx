import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  response_id: z.string().uuid(),
});

export async function POST(
  req: Request,
  { params }: { params: { briefId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single() as { data: any, error: any };

  if (!me || !['md', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'MD or admin role required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  // Verify response belongs to this brief
  const { data: response } = await supabase
    .from('brief_responses')
    .select('id, brief_id')
    .eq('id', parsed.data.response_id)
    .single() as { data: any, error: any };

  if (!response || response.brief_id !== params.briefId) {
    return NextResponse.json({ error: 'response not in this brief' }, { status: 404 });
  }

  const { data: recId, error } = await supabase.rpc('md_select_proposal', {
    p_response_id: parsed.data.response_id,
    p_md_internal_user_id: me.id,
  } as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, recommendation_id: recId });
}
