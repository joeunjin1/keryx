'use server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 특정 이메일 상세 조회 (읽음 처리 포함)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('inbound_emails')
    .select('*')
    .eq('id', id)
    .eq('assigned_user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 자동 읽음 처리
  if (!data.is_read) {
    await supabase
      .from('inbound_emails')
      .update({ is_read: true })
      .eq('id', id)
      .eq('assigned_user_id', user.id)
  }

  return NextResponse.json({ data: { ...data, is_read: true } })
}

// PATCH: 이메일 상태 변경 (읽음/별표/보관)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { is_read, is_starred, is_archived } = body

  const updateData: Record<string, unknown> = {}
  if (is_read !== undefined) updateData.is_read = is_read
  if (is_starred !== undefined) updateData.is_starred = is_starred
  if (is_archived !== undefined) updateData.is_archived = is_archived

  const { data, error } = await supabase
    .from('inbound_emails')
    .update(updateData)
    .eq('id', id)
    .eq('assigned_user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
