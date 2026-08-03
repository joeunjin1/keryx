import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  seller_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { data, error } = await (supabase.rpc as any)('get_or_create_conversation', {
    p_seller_id: parsed.data.seller_id,
  });

  if (error) {
    console.error('conversation rpc failed', error);
    return NextResponse.json({ error: 'rpc failed' }, { status: 500 });
  }

  return NextResponse.json({ conversation_id: data });
}
