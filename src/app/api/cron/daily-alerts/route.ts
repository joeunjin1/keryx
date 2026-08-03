import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: count, error } = await supabase.rpc('generate_daily_alerts' as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    alerts_created: count ?? 0,
    timestamp: new Date().toISOString(),
  });
}
