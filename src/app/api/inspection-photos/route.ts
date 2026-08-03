import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  inspection_id: z.string().uuid(),
  inspection_item_id: z.string().uuid().optional(),
  url: z.string().url(),
  photo_kind: z.enum(['normal', 'defect', 'package', 'overall']),
  caption: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('role')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!me || !['inspector', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('inspection_photos')
    .insert(parsed.data)
    .select()
    .single() as { data: any; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photo: data });
}
