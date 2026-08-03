import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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
  const { message, message_type = 'text', quote_data, attachment_urls } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: '메시지 내용이 필요합니다' }, { status: 400 })
  }

  // 메시지 저장
  const { data: newMessage, error: msgError } = await supabase
    .from('consultation_messages')
    .insert({
      consultation_id: params.id,
      sender_type: profile.kind,
      sender_id: profile.id,
      sender_name: profile.display_name || (profile.kind === 'admin' ? '관리자' : 'MD'),
      message: message.trim(),
      message_type,
      quote_data: quote_data || null,
      attachment_urls: attachment_urls || [],
    })
    .select()
    .single()

  if (msgError) {
    return NextResponse.json({ error: '메시지 저장 실패', detail: msgError.message }, { status: 500 })
  }

  // 상담 상태를 'replied'로 변경 및 last_replied_at 업데이트
  await supabase
    .from('consultations')
    .update({
      status: 'replied',
      last_replied_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  return NextResponse.json({ success: true, message: newMessage })
}
