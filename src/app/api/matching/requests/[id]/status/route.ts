export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_STATUSES = ['pending', 'reviewing', 'matching', 'sample', 'completed', 'cancelled']

// PATCH: 상태 변경 + 로그 기록
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const { to_status, note, actor_id, actor_name } = body

    if (!VALID_STATUSES.includes(to_status)) {
      return NextResponse.json({ error: '유효하지 않은 상태값입니다' }, { status: 400 })
    }

    // 현재 상태 조회
    const { data: current, error: fetchError } = await sb
      .from('factory_matching_requests')
      .select('status')
      .eq('id', params.id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: '신청을 찾을 수 없습니다' }, { status: 404 })
    }

    // 상태 업데이트
    const { data, error } = await sb
      .from('factory_matching_requests')
      .update({ status: to_status })
      .eq('id', params.id)
      .select('id, status')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 로그 기록
    await sb
      .from('factory_matching_logs')
      .insert({
        request_id: params.id,
        actor_id: actor_id || null,
        actor_name: actor_name || '시스템',
        from_status: current.status,
        to_status,
        note: note || null,
      })

    return NextResponse.json({ ok: true, data })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
