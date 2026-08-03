import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  mockup_urls: z.array(z.string().url()).min(1),
  designer_notes: z.string().max(1000).optional(),
  design_fee_cny: z.number().nonnegative().default(500),
});

export async function POST(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 본인 작업인지 확인
  const { data: task } = await supabase
    .from('design_tasks')
    .select('designer_id')
    .eq('id', params.taskId)
    .single() as { data: any; error: any };

  if (!task || task.designer_id !== user.id) {
    return NextResponse.json({ error: 'not your task' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { error } = await supabase.rpc('designer_submit_mockup', {
    p_design_task_id: params.taskId,
    p_mockup_urls: parsed.data.mockup_urls,
    p_designer_notes: parsed.data.designer_notes,
    p_design_fee_cny: parsed.data.design_fee_cny,
  }) as { data: any; error: any };

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
