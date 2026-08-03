export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'md', 'inspector'].includes(profile.kind)) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
    }

    const { data: inspection, error } = await supabase
      .from('inspections')
      .select(`
        *,
        factories(company_name, name_cn, city),
        sellers(business_name)
      `)
      .eq('id', params.inspectionId)
      .single()

    if (error || !inspection) {
      return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
    }

    // 불량 목록도 함께 조회
    const { data: defects } = await supabase
      .from('inspection_defects')
      .select('*')
      .eq('inspection_id', params.inspectionId)
      .order('seq_no')

    return NextResponse.json({ data: inspection, defects: defects ?? [] })
  } catch (err) {
    console.error('admin inspection detail API error:', err)
    return NextResponse.json({ data: null, error: 'Internal error' })
  }
}
