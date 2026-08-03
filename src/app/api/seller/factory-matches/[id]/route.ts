import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 셀러 본인의 공장 매칭 보고서 상세 조회 (조회 시 viewed 상태로 업데이트)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reportId = params.id;

  // 셀러 정보 조회
  const { data: sellerProfile } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  // 보고서 조회 (sent, viewed, archived 상태만)
  const { data: report, error } = await supabase
    .from('factory_match_reports')
    .select(`
      *,
      factory_match_report_items(*)
    `)
    .eq('id', reportId)
    .in('status', ['sent', 'viewed', 'archived'])
    .single();

  if (error || !report) {
    return NextResponse.json({ error: '보고서를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 접근 권한 확인: seller_id 또는 buyer_email 일치 여부
  let hasAccess = false;
  if (sellerProfile?.id && report.seller_id === sellerProfile.id) {
    hasAccess = true;
  } else {
    // 이메일로 fallback 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    if (profile?.email && report.buyer_email === profile.email) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
  }

  // 처음 조회 시 viewed 상태로 업데이트
  if (report.status === 'sent') {
    await supabase
      .from('factory_match_reports')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);
    report.status = 'viewed';
    report.viewed_at = new Date().toISOString();
  }

  // 아이템 정렬
  if (report.factory_match_report_items) {
    report.factory_match_report_items.sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    );
  }

  return NextResponse.json({ data: report });
}
