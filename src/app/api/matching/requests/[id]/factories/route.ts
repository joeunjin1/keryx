export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 매칭된 공장 목록 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('factory_matching_factories')
    .select('*')
    .eq('request_id', params.id)
    .order('ai_score', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}

// POST: 공장 추가
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const {
      factory_id, factory_name, factory_city,
      unit_price, moq, lead_time_days, sample_cost,
      rating, specialties, certifications, has_ip_audit,
      md_note, ai_score, is_recommended, buyer_visible,
    } = body

    if (!factory_name) {
      return NextResponse.json({ error: '공장명은 필수입니다' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('factory_matching_factories')
      .insert({
        request_id: params.id,
        factory_id: factory_id || null,
        factory_name,
        factory_city: factory_city || null,
        unit_price: unit_price || null,
        moq: moq || null,
        lead_time_days: lead_time_days || null,
        sample_cost: sample_cost || null,
        rating: rating || null,
        specialties: specialties || [],
        certifications: certifications || [],
        has_ip_audit: has_ip_audit || false,
        md_note: md_note || null,
        ai_score: ai_score || null,
        is_recommended: is_recommended || false,
        buyer_visible: buyer_visible || false,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
   } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
// PATCH: 공장 정보 수정 (buyer_visible 토글 등)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabase()
    const body = await req.json()
    const { factory_id: fid, ...updates } = body

    const { data, error } = await sb
      .from('factory_matching_factories')
      .update(updates)
      .eq('id', fid)
      .eq('request_id', params.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
