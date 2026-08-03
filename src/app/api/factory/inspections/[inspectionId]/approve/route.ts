export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 공장 계정 확인 (shared_login_user_id로 공장 찾기)
    const { data: factory } = await supabase
      .from('factories')
      .select('id, company_name, company_name_ko')
      .eq('shared_login_user_id', user.id)
      .single();

    // 내부 사용자(admin/md)도 승인 가능하도록
    let isInternal = false;
    if (!factory) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('kind')
        .eq('id', user.id)
        .single();
      if (profile && ['admin', 'md'].includes(profile.kind)) {
        isInternal = true;
      } else {
        return NextResponse.json({ error: 'No factory account' }, { status: 403 });
      }
    }

    // 해당 검수 조회 (공장 소유 확인) - 체이닝 버그 수정
    let inspectionQuery = supabase
      .from('inspections')
      .select('id, factory_id, status, factory_approved_at, factories(company_name, company_name_ko)')
      .eq('id', params.inspectionId)
      .in('status', ['published', 'approved', 'buyer_approved', 'factory_approved', 'both_approved']);

    if (!isInternal && factory) {
      inspectionQuery = inspectionQuery.eq('factory_id', factory.id);
    }

    const { data: inspection, error: fetchError } = await inspectionQuery.single();

    if (fetchError || !inspection) {
      return NextResponse.json({ error: '검수 보고서를 찾을 수 없거나 접근 권한이 없습니다.' }, { status: 404 });
    }

    // 이미 승인된 경우
    if (inspection.factory_approved_at) {
      return NextResponse.json({ error: '이미 승인된 검수 보고서입니다.' }, { status: 400 });
    }

    // 요청 본문에서 승인 메모 가져오기
    let approvalNote = '';
    try {
      const body = await request.json();
      approvalNote = body.note || '';
    } catch {
      // 본문 없어도 OK
    }

    // 공장명 결정
    const factoryName = factory
      ? (factory.company_name || factory.company_name_ko || '공장')
      : '관리자';

    // factory_approved_at, factory_approved_by, factory_approval_note 업데이트
    const { error: updateError } = await supabase
      .from('inspections')
      .update({
        factory_approved_at: new Date().toISOString(),
        factory_approved_by: factoryName,
        factory_approval_note: approvalNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.inspectionId);

    if (updateError) {
      console.error('Factory approve update error:', updateError);
      return NextResponse.json({ error: '승인 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 공장 + 바이어 모두 승인 시 payment_released_at 업데이트
    const { data: updatedInspection } = await supabase
      .from('inspections')
      .select('factory_approved_at, buyer_approved_at, payment_released_at')
      .eq('id', params.inspectionId)
      .single();

    if (
      updatedInspection?.factory_approved_at &&
      updatedInspection?.buyer_approved_at &&
      !updatedInspection?.payment_released_at
    ) {
      await supabase
        .from('inspections')
        .update({
          payment_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.inspectionId);
    }

    return NextResponse.json({
      success: true,
      message: '검수 보고서가 성공적으로 승인되었습니다.',
      factory_approved_at: new Date().toISOString(),
      factory_approved_by: factoryName,
    });
  } catch (err) {
    console.error('Factory approve API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
