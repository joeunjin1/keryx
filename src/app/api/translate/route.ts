import { NextResponse } from 'next/server';
import { z } from 'zod';

import { translateMessage, translateBidirectional, type Lang } from '@/lib/translation';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  text: z.string().min(1).max(5000),
  from: z.enum(['ko', 'zh', 'ja', 'en']),
  to: z.enum(['ko', 'zh', 'ja', 'en']).optional(),
  bidirectional: z.boolean().optional(),
});

export async function POST(req: Request) {
  // Auth: only authenticated users may translate
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const { text, from, to, bidirectional } = parsed.data;

  try {
    if (bidirectional) {
      const result = await translateBidirectional(text, from as Lang);
      return NextResponse.json(result);
    }

    if (!to) {
      return NextResponse.json({ error: 'either "to" or "bidirectional" required' }, { status: 400 });
    }

    const result = await translateMessage(text, from as Lang, to as Lang);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('translate api', err);
    return NextResponse.json({ error: 'translation failed' }, { status: 500 });
  }
}
