import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.secret !== 'KERYX_INIT_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  const results: Record<string, string> = {};
  const allAlters = [
    `ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS topic_type text DEFAULT 'general'`,
    `ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS topic_id uuid`,
    `ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS title text`,
    `ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS status text DEFAULT 'open'`,
    `ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`,
    `ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS md_note text`,
    `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text'`,
    `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`,
  ];
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  for (const sql of allAlters) {
    try {
      const resp = await fetch(mgmtUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      const key = sql.includes('ADD COLUMN IF NOT EXISTS') ? sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0] : sql.slice(0, 40);
      results[key] = resp.ok ? 'ok' : `error: ${await resp.text()}`;
    } catch (e: any) {
      results[sql.slice(0, 40)] = `exception: ${e.message}`;
    }
  }
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: convErr } = await (adminClient as any).from('conversations').select('id').limit(1);
  const { error: msgErr } = await (adminClient as any).from('messages').select('id').limit(1);
  return NextResponse.json({ success: true, results, project_ref: projectRef, conversations_accessible: !convErr, messages_accessible: !msgErr });
}
