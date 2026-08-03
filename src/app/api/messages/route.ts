import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { translateBidirectional, type Lang } from '@/lib/translation';

const RequestSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
  sender: z.enum(['seller', 'md', 'factory']),
  source_lang: z.enum(['ko', 'zh', 'ja', 'en']),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        type: z.string(),
        caption: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  quick_reply: z.string().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const adminSupabase = createAdminClient() as any;

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Parse
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid input', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { conversation_id, body, sender, source_lang, attachments, quick_reply } = parsed.data;

  // Verify the user has access to this conversation
  const { data: convo, error: convoError } = await (supabase as any).from('conversations')
    .select(
      `
      id, seller_id, md_id,
      seller:sellers(user_id),
      md:internal_users(user_id)
    `
    )
    .eq('id', conversation_id)
    .single() as { data: any; error: any };

  if (convoError || !convo) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }

  // Authorization
  const sellerUserId = (convo.seller as any)?.user_id;
  const mdUserId = (convo.md as any)?.user_id;

  if (sender === 'seller' && sellerUserId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (sender === 'md' && mdUserId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Translate (only translate text; attachments-only messages skip)
  let body_ko = '';
  let body_zh = '';

  if (body.trim().length > 0) {
    try {
      const translated = await translateBidirectional(body, source_lang as Lang);
      body_ko = translated.ko;
      body_zh = translated.zh;
    } catch (err) {
      console.error('translation failed, saving original only', err);
      // Fallback — save original in source lang slot
      if (source_lang === 'ko') body_ko = body;
      else body_zh = body;
    }
  }

  // Insert message
  const { data: inserted, error: insertError } = await (supabase as any).from('messages').insert({
      conversation_id,
      sender,
      sender_user_id: user.id,
      body_original: body,
      source_lang,
      body_ko,
      body_zh,
      attachments,
      quick_reply,
    })
    .select()
    .single() as { data: any; error: any };

  if (insertError) {
    console.error('message insert failed', insertError);
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }

  return NextResponse.json({ message: inserted });
}
