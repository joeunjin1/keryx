import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const orderId = url.searchParams.get('order_id');
  const sellerId = url.searchParams.get('seller_id');

  let query = supabase.from('invoices').select(`
    *,
    order:orders(order_no, seller_id,
      seller:sellers(business_name, business_name_zh)
    )
  `).order('created_at', { ascending: false });

  if (orderId) query = query.eq('order_id', orderId);
  if (sellerId) query = query.eq('order.seller_id', sellerId);

  const { data, error } = await query as { data: any; error: any };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };
  if (!profile || !['md', 'admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.order_id || !body.type || !body.total_cny) {
    return NextResponse.json({ error: 'order_id, type, total_cny are required' }, { status: 400 });
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const invoiceNo = `INV-${dateStr}-${rand}`;

  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...body, invoice_no: invoiceNo })
    .select()
    .single() as { data: any; error: any };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invoice: data }, { status: 201 });
}
