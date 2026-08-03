import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 상담 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'md'].includes(profile.kind)) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  // 상담 상세 조회
  const { data: consultation, error } = await supabase
    .from('consultations')
    .select(`
      *,
      assigned_md:user_profiles!assigned_md_id(id, display_name, email)
    `)
    .eq('id', params.id)
    .single()

  if (error || !consultation) {
    return NextResponse.json({ error: '상담을 찾을 수 없습니다' }, { status: 404 })
  }

  // MD는 자신에게 배정된 상담만 조회 가능
  if (profile.kind === 'md' && consultation.assigned_md_id !== profile.id) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  // 메시지 목록 조회
  const { data: messages } = await supabase
    .from('consultation_messages')
    .select('*')
    .eq('consultation_id', params.id)
    .order('created_at', { ascending: true })

  // 읽지 않은 메시지 읽음 처리
  await supabase
    .from('consultation_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('consultation_id', params.id)
    .eq('is_read', false)
    .neq('sender_type', 'md')
    .neq('sender_type', 'admin')

  return NextResponse.json({ consultation, messages: messages || [] })
}

// 상담 상태 변경 및 MD 배정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, id, display_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'md'].includes(profile.kind)) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  const body = await request.json()
  const updateData: Record<string, unknown> = {}

  if (body.status) updateData.status = body.status
  if (body.priority) updateData.priority = body.priority
  if (body.assigned_md_id !== undefined) {
    updateData.assigned_md_id = body.assigned_md_id
    updateData.assigned_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('consultations')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '업데이트 실패', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, consultation: data })
}
