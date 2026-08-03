export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: [], error: 'Unauthorized' }, { status: 401 })

    // 관리자/MD/검수원 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'md', 'inspector'].includes(profile.kind)) {
      return NextResponse.json({ data: [], error: 'Forbidden' }, { status: 403 })
    }

    const { data: inspections, error } = await supabase
      .from('inspections')
      .select(`
        id, inspection_no, status, final_verdict, pass_rate,
        inspection_date, published_at, product_name_ko, product_name_cn,
        seller_id, factory_id, inspector_id,
        factories(company_name),
        sellers(business_name)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('admin inspections query error:', error)
      return NextResponse.json({ data: [], error: error.message })
    }

    return NextResponse.json({ data: inspections ?? [] })
  } catch (err) {
    console.error('admin inspections API error:', err)
    return NextResponse.json({ data: [], error: 'Internal error' })
  }
}
