import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient, createAdminClient } from '@/lib/supabase/server';

const CreateSchema = z.object({
  priority: z.number().int().min(1).max(5),
  description: z.string().min(1).max(500),
  budget_hint_cny: z.string().max(100).optional(),
  moq_hint: z.string().max(100).optional(),
});

const UpdateSchema = CreateSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['active', 'addressed', 'archived']).optional(),
});

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

async function getSellerId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single() as { data: any };

  return seller?.id ?? null;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const adminSupabase = createAdminClient() as any;
  const sellerId = await getSellerId(supabase);
  if (!sellerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const { data, error } = await (supabase as any).from('seller_interests').insert({
      seller_id: sellerId,
      ...parsed.data,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('interest insert failed', error);
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }

  return NextResponse.json({ interest: data });
}

export async function PUT(req: Request) {
  const supabase = createClient();
  const adminSupabase = createAdminClient() as any;
  const sellerId = await getSellerId(supabase);
  if (!sellerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.format() }, { status: 400 });
  }

  const { id, ...patch } = parsed.data;

  const { data, error } = await (supabase as any).from('seller_interests').update(patch)
    .eq('id', id)
    .eq('seller_id', sellerId)  // RLS double-check
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }

  return NextResponse.json({ interest: data });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const adminSupabase = createAdminClient() as any;
  const sellerId = await getSellerId(supabase);
  if (!sellerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from('seller_interests')
    .delete()
    .eq('id', parsed.data.id)
    .eq('seller_id', sellerId);

  if (error) {
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
