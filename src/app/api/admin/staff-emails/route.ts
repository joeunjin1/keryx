'use server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 전체 직원 메일 주소 목록 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 관리자 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // staff_email_addresses + user_profiles JOIN
  const { data, error } = await supabase
    .from('staff_email_addresses')
    .select(`
      id,
      user_id,
      email_address,
      display_name,
      display_name_zh,
      is_active,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // user_profiles에서 직원 이름 가져오기
  const userIds = (data || []).map(d => d.user_id)
  let profileMap: Record<string, { display_name: string | null; kind: string; email: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, kind, email')
      .in('id', userIds)
    if (profiles) {
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
    }
  }

  const enriched = (data || []).map(d => ({
    ...d,
    staff_name: profileMap[d.user_id]?.display_name ?? null,
    staff_kind: profileMap[d.user_id]?.kind ?? null,
    staff_auth_email: profileMap[d.user_id]?.email ?? null,
  }))

  return NextResponse.json({ data: enriched })
}

// POST: 직원 메일 주소 등록
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.kind)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { user_id, email_address, display_name, display_name_zh } = body

  if (!user_id || !email_address) {
    return NextResponse.json({ error: '직원 ID와 이메일 주소는 필수입니다.' }, { status: 400 })
  }

  // 이메일 형식 검증
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email_address)) {
    return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('staff_email_addresses')
    .insert({
      user_id,
      email_address: email_address.toLowerCase().trim(),
      display_name: display_name || null,
      display_name_zh: display_name_zh || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 이메일 주소입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
