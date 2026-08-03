/**
 * 공개 신청 현황 조회 API
 * 신청번호(request_no)로 로그인 없이 신청 현황 조회
 * 민감 정보(phone, email 등)는 마스킹하여 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const no = searchParams.get('no')?.trim();

    if (!no) {
      return NextResponse.json({ error: '신청번호를 입력해 주세요.' }, { status: 400 });
    }

    // service_role_key로 RLS 우회 (공개 조회이므로 민감 정보 마스킹 필요)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        id,
        request_no,
        service_type,
        status,
        product_name,
        contact_name,
        company_name,
        phone,
        created_at,
        replies:service_request_replies(
          id,
          author_name,
          reply_type,
          content,
          created_at
        )
      `)
      .ilike('request_no', no)
      .single();

    if (error || !data) {
      console.error('[api/apply/status] query error:', error?.message, 'no:', no);
      return NextResponse.json(
        { error: '해당 신청번호의 내역을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 민감 정보 마스킹 (전화번호 뒤 4자리만 표시)
    const masked = {
      ...data,
      phone: data.phone ? data.phone.replace(/(\d{3,4})(\d{4})$/, '****$2') : null,
      // 시스템 메시지는 제외, md_reply와 admin_reply만 표시
      replies: (data.replies || []).filter((r: { reply_type: string }) => r.reply_type !== 'system'),
    };

    return NextResponse.json({ data: masked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/apply/status] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
