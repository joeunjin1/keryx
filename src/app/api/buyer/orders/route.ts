import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const OrderSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.number().int().min(1),
  unit_price_cny: z.number().positive(),
  buyer_order_note: z.string().max(1000).optional(),
  packaging_request: z.string().max(500).optional(),
  desired_delivery_date: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 인증 확인은 anon client로, DB 작업은 admin client로 (RLS 우회)
    const authClient = createClient() as any;
    const supabase = createAdminClient() as any;
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // user_profiles에서 사용자 정보 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, full_name, kind')
      .eq('id', user.id)
      .single();

    // seller 확인 (없으면 자동 생성)
    let { data: seller } = await supabase
      .from('sellers')
      .select('id, business_name')
      .eq('user_id', user.id)
      .single();

    if (!seller) {
      const displayName = profile?.full_name || user.email?.split('@')[0] || 'Buyer';
      const { data: newSeller, error: sellerErr } = await supabase
        .from('sellers')
        .insert({
          user_id: user.id,
          business_name: displayName,
          country: 'KR',
          contact_name: profile?.full_name || displayName,
        })
        .select('id, business_name')
        .single();

      if (sellerErr || !newSeller) {
        console.error('[buyer/orders] seller auto-create error:', JSON.stringify(sellerErr));
        return NextResponse.json({ error: 'seller registration required', detail: sellerErr?.message }, { status: 403 });
      }
      seller = newSeller;
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = OrderSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
    }
    const { product_id, qty, unit_price_cny, buyer_order_note, packaging_request, desired_delivery_date } = parsed.data;

    // desired_delivery_date는 orders 테이블에 없으므로 buyer_order_note에 포함
    const finalNote = desired_delivery_date
      ? `${buyer_order_note || ''}\n[희망납기일: ${desired_delivery_date}]`.trim()
      : buyer_order_note ?? null;

    // 상품 정보 확인
    const { data: product, error: productErr } = await supabase
      .from('products')
      .select('id, name_ko, name_zh, sku, factory_id')
      .eq('id', product_id)
      .single();

    if (productErr || !product) {
      console.error('[buyer/orders] product not found:', product_id, JSON.stringify(productErr));
      return NextResponse.json({ error: 'product not found' }, { status: 404 });
    }

    const subtotal = qty * unit_price_cny;

    // order_no 자동 생성: BO-YYYYMMDD-XXXX 형식
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `BO-${dateStr}-${rand}`;

    // 주문 생성 (buyer_pending 상태)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_no: orderNo,
        seller_id: seller.id,
        status: 'buyer_pending',
        source: 'buyer',
        total_cny: subtotal,
        buyer_order_note: finalNote,
        packaging_request: packaging_request ?? null,
      })
      .select('id')
      .single();

    if (orderErr || !order) {
      console.error('[buyer/orders] order insert error:', JSON.stringify(orderErr));
      return NextResponse.json({ error: orderErr?.message ?? 'order creation failed', code: orderErr?.code }, { status: 500 });
    }

    // order_items 생성
    const { error: itemErr } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id,
        qty,
        unit_price_cny,
        subtotal_cny: subtotal,
      });

    if (itemErr) {
      // 롤백: 주문 삭제
      await supabase.from('orders').delete().eq('id', order.id);
      console.error('[buyer/orders] order_items insert error:', JSON.stringify(itemErr));
      return NextResponse.json({ error: itemErr.message, code: itemErr.code }, { status: 500 });
    }

    // 관리자/MD에게 알림 생성 (실패해도 주문 성공에 영향 없음)
    try {
      await supabase.from('notifications').insert({
        type: 'order_placed',
        title: `새 주문 접수: ${product.name_ko || product.name_zh}`,
        body: `${seller.business_name}이(가) ${product.name_ko || product.name_zh} ${qty}개를 주문했습니다.`,
        related_id: order.id,
        related_type: 'order',
        target_role: 'admin',
      });
    } catch (notifErr) {
      console.warn('[buyer/orders] notification insert failed (non-critical):', notifErr);
    }

    return NextResponse.json({ ok: true, order_id: order.id, order_no: orderNo });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[buyer/orders] unexpected error:', msg);
    return NextResponse.json({ error: 'internal server error', detail: msg }, { status: 500 });
  }
}

// GET: 내 주문 목록
export async function GET(req: Request) {
  try {
    const authClient = createClient() as any;
    const supabase = createAdminClient() as any;
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!seller) return NextResponse.json({ orders: [] });

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, order_no, status, total_cny, source, buyer_order_note,
        packaging_request, created_at,
        order_items (
          id, qty, unit_price_cny, subtotal_cny,
          products ( id, name_ko, name_zh, sku, image_url )
        )
      `)
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: orders ?? [] });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
