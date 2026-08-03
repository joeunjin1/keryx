import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const ApproveSchema = z.object({ notes: z.string().max(1000).optional() });
const RejectSchema = z.object({ reason: z.string().min(1).max(1000) });

export async function POST(
  req: Request,
  { params }: { params: { productId: string; action: string } }
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
    return NextResponse.json({ error: 'MD or admin required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => ({}));

  if (params.action === 'approve') {
    const parsed = ApproveSchema.safeParse(raw);
    const { error } = await supabase.rpc('md_approve_factory_product', {
      p_product_id: params.productId,
      p_md_internal_user_id: me.id,
      p_review_notes: parsed.success ? parsed.data.notes : undefined,
    } as any);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (params.action === 'reject') {
    const parsed = RejectSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'reason required' }, { status: 400 });
    }
    const { error } = await supabase.rpc('md_reject_factory_product', {
      p_product_id: params.productId,
      p_md_internal_user_id: me.id,
      p_rejected_reason: parsed.data.reason,
    } as any);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
