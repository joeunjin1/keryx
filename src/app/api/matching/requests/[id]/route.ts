export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 개별 매칭 신청 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('factory_matching_requests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  // 매칭된 공장 목록도 함께 조회
  const { data: factories } = await sb
    .from('factory_matching_factories')
    .select('*')
    .eq('request_id', params.id)
    .order('ai_score', { ascending: false })

  // 상태 변경 로그 조회
  const { data: logs } = await sb
    .from('factory_matching_logs')
    .select('*')
    .eq('request_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ data, factories: factories || [], logs: logs || [] })
}

// PATCH: 매칭 신청 수정 (관리자/MD용)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const { assigned_md_id, is_urgent, is_standby, admin_note, md_note, actor_name } = body

    const updateData: Record<string, unknown> = {}
    if (assigned_md_id !== undefined) updateData.assigned_md_id = assigned_md_id
    if (is_urgent !== undefined) updateData.is_urgent = is_urgent
    if (is_standby !== undefined) updateData.is_standby = is_standby
    if (admin_note !== undefined) updateData.admin_note = admin_note
    if (md_note !== undefined) updateData.md_note = md_note

    const { data, error } = await sb
      .from('factory_matching_requests')
      .update(updateData)
      .eq('id', params.id)
      .select('id, status, assigned_md_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
