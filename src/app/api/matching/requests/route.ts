export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: 매칭 신청 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const md_id = searchParams.get('md_id')
  const my = searchParams.get('my') === 'true'
  const limit = parseInt(searchParams.get('limit') || '100')

  const sb = getSupabase()
  let query = sb
    .from('factory_matching_requests')
    .select(`
      id, company_name, contact_name, phone, email,
      product_desc, product_category, moq, target_price,
      business_type, target_markets, has_ip_license, ip_license_name,
      priority_price, priority_quality, priority_delivery, priority_stability,
      quality_grade, required_certs, need_ip_audit,
      selected_tier, status, assigned_md_id, is_urgent, is_standby,
      admin_note, md_note, matched_factories,
      created_at, updated_at,
      user_id, final_factory_id, final_factory_name, final_conclusion, report_sent_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  // my=true: 현재 로그인한 사용자의 요청만 조회
  if (my) {
    try {
      const serverSb = createServerClient() as any
      const { data: { user } } = await serverSb.auth.getUser()
      if (!user) {
        return NextResponse.json({ data: [] })
      }
      query = query.eq('user_id', user.id)
    } catch {
      return NextResponse.json({ data: [] })
    }
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (md_id && md_id !== 'all') {
    query = query.eq('assigned_md_id', md_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST: 새 매칭 신청 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      // Step 1
      product_desc, product_category, moq, target_price, need_package,
      // Step 2
      business_type, monthly_order_scale, target_markets, has_ip_license, ip_license_name,
      // Step 3
      priority_price, priority_quality, priority_delivery, priority_stability,
      quality_grade, required_certs, need_ip_audit,
      // Step 4
      company_name, contact_name, phone, email, wechat_id, selected_tier,
      // 선택
      user_id,
      // 공장 랜딩 페이지에서 직접 매칭 신청 시
      factory_id, factory_name, direct_match,
    } = body

    if (!product_desc || !company_name || !contact_name) {
      return NextResponse.json(
        { error: '필수 항목을 입력해주세요 (제품 설명, 회사명, 담당자명)' },
        { status: 400 }
      )
    }

    const sb = getSupabase()

    // direct_match: 공장 랜딩 페이지에서 바로 매칭 신청 시 즉시 completed 처리
    const initialStatus = direct_match && factory_id ? 'completed' : 'pending'
    const matchedFactoriesInit = direct_match && factory_id
      ? JSON.stringify([{
          factory_id,
          factory_name: factory_name || '매칭 공장',
          factory_name_zh: null,
          status: 'matched',
          match_score: null,
          note: '직접 매칭 신청',
          recommended_at: new Date().toISOString(),
        }])
      : '[]'

    const insertData: Record<string, unknown> = {
      user_id: user_id || null,
      product_desc,
      product_category: product_category || null,
      moq: moq || null,
      target_price: target_price || null,
      need_package: need_package || false,
      business_type: business_type || null,
      monthly_order_scale: monthly_order_scale || null,
      target_markets: target_markets || [],
      has_ip_license: has_ip_license || false,
      ip_license_name: ip_license_name || null,
      priority_price: priority_price || 25,
      priority_quality: priority_quality || 25,
      priority_delivery: priority_delivery || 25,
      priority_stability: priority_stability || 25,
      quality_grade: quality_grade || null,
      required_certs: required_certs || [],
      need_ip_audit: need_ip_audit || false,
      company_name,
      contact_name,
      phone: phone || null,
      email: email || null,
      wechat_id: wechat_id || null,
      selected_tier: selected_tier || null,
      status: initialStatus,
      matched_factories: matchedFactoriesInit,
    }

    if (direct_match && factory_id) {
      insertData.final_factory_id = factory_id
      insertData.final_factory_name = factory_name || '매칭 공장'
      insertData.final_conclusion = '직접 매칭 신청으로 즉시 매칭 완료'
      insertData.report_sent_at = new Date().toISOString()
    }

    const { data, error } = await sb
      .from('factory_matching_requests')
      .insert(insertData)
      .select('id, company_name, status, created_at')
      .single()

    if (error) {
      console.error('Matching request insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data, direct_match: !!direct_match })
  } catch (err) {
    console.error('Matching request error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

