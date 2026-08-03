import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 인증 확인
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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('consultations')
    .select(`
      id, inquiry_type, status, priority,
      product_name_snapshot, product_image_snapshot,
      requester_name, requester_email, requester_company, requester_country,
      quantity, target_price_cny, packaging_type,
      landing_slug, created_at, updated_at, last_replied_at,
      assigned_md_id,
      assigned_md:user_profiles!assigned_md_id(id, display_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // MD는 자신에게 배정된 상담만 조회
  if (profile.kind === 'md') {
    query = query.eq('assigned_md_id', profile.id)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('상담 목록 조회 오류:', error)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다' }, { status: 500 })
  }

  return NextResponse.json({
    consultations: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
