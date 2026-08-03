'use server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 현재 로그인 직원의 메일함 조회 (assigned_user_id 기준)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const filter = searchParams.get('filter') || 'inbox' // inbox | starred | archived
  const search = searchParams.get('search') || ''
  const offset = (page - 1) * limit

  let query = supabase
    .from('inbound_emails')
    .select('*', { count: 'exact' })
    .eq('assigned_user_id', user.id)

  // 필터 적용
  if (filter === 'starred') {
    query = query.eq('is_starred', true)
  } else if (filter === 'archived') {
    query = query.eq('is_archived', true)
  } else {
    // inbox: 보관되지 않은 것
    query = query.eq('is_archived', false)
  }

  // 검색
  if (search) {
    query = query.or(`from_email.ilike.%${search}%,from_name.ilike.%${search}%,subject.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 읽지 않은 메일 수
  const { count: unreadCount } = await supabase
    .from('inbound_emails')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_user_id', user.id)
    .eq('is_read', false)
    .eq('is_archived', false)

  return NextResponse.json({
    emails: data || [],
    total: count || 0,
    page,
    limit,
    unread_count: unreadCount || 0,
  })
}
