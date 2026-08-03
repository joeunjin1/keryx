import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function generateRequestNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `UR-${date}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const adminClient = getAdminClient();
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { items, ...requestData } = body;

    const { data: newRequest, error: reqError } = await adminClient
      .from('unified_requests')
      .insert({
        ...requestData,
        seller_id: user?.id ?? null,
        request_no: generateRequestNo(),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select('id, request_no')
      .single();

    if (reqError) {
      console.error('unified_requests insert error:', reqError);
      return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    if (items && items.length > 0) {
      const itemRows = items.map((item: Record<string, unknown>, idx: number) => ({
        ...item,
        request_id: newRequest.id,
        sort_order: idx,
      }));

      const { error: itemError } = await adminClient
        .from('unified_request_items')
        .insert(itemRows);

      if (itemError) {
        console.error('unified_request_items insert error:', itemError);
        return NextResponse.json({
          success: true,
          requestId: newRequest.id,
          requestNo: newRequest.request_no,
          warning: '품목 저장 중 오류가 발생했습니다.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      requestNo: newRequest.request_no,
    });
  } catch (err) {
    console.error('unified-request POST error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminClient = getAdminClient();
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('id');

    if (requestId) {
      const { data, error } = await adminClient
        .from('unified_requests')
        .select(`*, unified_request_items(*), unified_request_reports(*, unified_request_report_factories(*))`)
        .eq('id', requestId)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();

    let query = adminClient
      .from('unified_requests')
      .select(`*, unified_request_items(id, product_name, category)`)
      .order('created_at', { ascending: false });

    if (profile?.kind !== 'admin' && profile?.kind !== 'md') {
      query = query.eq('seller_id', user.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('unified-request GET error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminClient = getAdminClient();
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const body = await req.json();
    const { id, ...updateData } = body;

    const { error } = await adminClient
      .from('unified_requests')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('unified-request PATCH error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
