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

    // 관리자/MD/검수원 여부 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single()

    const isInternal = profile && ['admin', 'md', 'inspector'].includes(profile.kind)

    // 셀러 계정인 경우 본인 seller_id 확인
    let sellerCheck = true
    if (!isInternal) {
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!seller) return NextResponse.json({ data: null, error: 'No seller account' }, { status: 403 })

      // 해당 검수가 본인 셀러 것인지 확인
      const { data: check } = await supabase
        .from('inspections')
        .select('id, seller_id, status')
        .eq('id', params.inspectionId)
        .eq('seller_id', seller.id)
        .in('status', ['published', 'approved'])
        .single()

      if (!check) sellerCheck = false
    }

    if (!sellerCheck) {
      return NextResponse.json({ data: null, error: 'Not found or not authorized' }, { status: 404 })
    }

    const { data: inspection, error } = await supabase
      .from('inspections')
      .select(`
        *,
        factories(company_name, company_name_ko, city),
        sellers(business_name)
      `)
      .eq('id', params.inspectionId)
      .single()

    if (error || !inspection) {
      return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
    }

    const { data: defects } = await supabase
      .from('inspection_defects')
      .select('*')
      .eq('inspection_id', params.inspectionId)
      .order('seq_no')

    // 검수 항목 (체크리스트)
    const { data: items } = await supabase
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', params.inspectionId)
      .order('display_order')

    // 검수 사진 전체 (카테고리별로 분류)
    const { data: allPhotos } = await supabase
      .from('inspection_photos')
      .select('id, url, photo_category, photo_title, is_sample_ref, photo_kind, inspection_item_id')
      .eq('inspection_id', params.inspectionId)
      .order('created_at')

    // 카테고리별 분류
    const inspectionPhotos = (allPhotos ?? []).filter((p: any) => p.photo_category === 'inspection')
    const sampleComparePhotos = (allPhotos ?? []).filter((p: any) => p.photo_category === 'sample_compare')
    const inspectorSitePhotos = (allPhotos ?? []).filter((p: any) => p.photo_category === 'inspector_site')
    const checklistPhotos = (allPhotos ?? []).filter((p: any) => p.photo_category === 'checklist')

    // 검수 사진 그룹핑 (제목별)
    const inspectionPhotoGroups: Record<string, { title: string; photos: any[] }> = {}
    for (const p of inspectionPhotos) {
      const key = p.photo_title || '검수 사진'
      if (!inspectionPhotoGroups[key]) inspectionPhotoGroups[key] = { title: key, photos: [] }
      inspectionPhotoGroups[key].photos.push(p)
    }

    // 샘플 비교 그룹핑 (항목명별)
    const sampleCompareGroups: Record<string, { itemName: string; samplePhotos: any[]; currentPhotos: any[] }> = {}
    for (const p of sampleComparePhotos) {
      const key = p.photo_title || '비교 항목'
      if (!sampleCompareGroups[key]) sampleCompareGroups[key] = { itemName: key, samplePhotos: [], currentPhotos: [] }
      if (p.is_sample_ref) sampleCompareGroups[key].samplePhotos.push(p)
      else sampleCompareGroups[key].currentPhotos.push(p)
    }

    return NextResponse.json({
      data: inspection,
      defects: defects ?? [],
      items: items ?? [],
      inspectionPhotoGroups: Object.values(inspectionPhotoGroups),
      sampleCompareGroups: Object.values(sampleCompareGroups),
      inspectorSitePhotos: inspectorSitePhotos,
      checklistPhotos: checklistPhotos,
    })
  } catch (err) {
    console.error('seller inspection detail API error:', err)
    return NextResponse.json({ data: null, error: 'Internal error' })
  }
}
