'use server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 직원 목록 조회 (md, inspector, admin, super_admin)
export async function GET() {
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

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, kind, email')
    .in('kind', ['md', 'inspector', 'admin', 'super_admin'])
    .order('display_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [] })
}
