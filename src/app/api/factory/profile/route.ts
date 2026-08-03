/**
 * GET  /api/factory/profile  - 공장 프로필 조회
 * PATCH /api/factory/profile - 공장 프로필 저장 (service_role로 RLS 우회)
 *
 * 문제: 프론트엔드에서 anon_key로 직접 UPDATE 시 RLS 정책에 의해 차단됨
 * 해결: 서버 API 라우트에서 service_role(createAdminClient)로 UPDATE
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient() as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const adminClient = createAdminClient() as any;
    const { data: factory, error } = await adminClient
      .from('factories')
      .select('*')
      .eq('shared_login_user_id', user.id)
      .single();

    if (error || !factory) {
      return NextResponse.json({ error: '공장 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(factory);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // 1. 인증 확인 (factory 또는 admin)
    const supabase = createClient() as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 2. 역할 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('kind')
      .eq('id', user.id)
      .single();

    if (!profile || !['factory', 'admin', 'md'].includes(profile.kind)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 3. 요청 바디 파싱
    const body = await req.json();
    const {
      company_name,
      company_name_ko,
      city,
      province,
      founded_year,
      factory_area_sqm,
      employee_count,
      production_capacity,
      avg_lead_time_days,
      contact_name,
      contact_phone,
      contact_wechat,
      contact_email,
      website_url,
      intro_text_zh,
      intro_text_ko,
      certifications,
      main_products,
      cover_image_url,
      gallery_images,
    } = body;

    // 4. 해당 사용자의 공장 ID 조회
    const adminClient = createAdminClient() as any;

    let factoryQuery = adminClient.from('factories').select('id');
    if (profile.kind === 'factory') {
      // 공장 계정: 자신의 공장만 수정 가능
      factoryQuery = factoryQuery.eq('shared_login_user_id', user.id);
    } else {
      // admin/md: factory_id를 body에서 받거나 shared_login_user_id로 조회
      if (body.factory_id) {
        factoryQuery = factoryQuery.eq('id', body.factory_id);
      } else {
        factoryQuery = factoryQuery.eq('shared_login_user_id', user.id);
      }
    }

    const { data: factoryData, error: findError } = await factoryQuery.single();
    if (findError || !factoryData) {
      return NextResponse.json({ error: '공장 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 5. service_role로 UPDATE (RLS 우회)
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // 제공된 필드만 업데이트
    if (company_name !== undefined) payload.company_name = company_name;
    if (company_name_ko !== undefined) payload.company_name_ko = company_name_ko;
    if (city !== undefined) payload.city = city;
    if (province !== undefined) payload.province = province;
    if (founded_year !== undefined) payload.founded_year = founded_year ? parseInt(String(founded_year)) : null;
    if (factory_area_sqm !== undefined) payload.factory_area_sqm = factory_area_sqm ? parseInt(String(factory_area_sqm)) : null;
    if (employee_count !== undefined) payload.employee_count = employee_count ? parseInt(String(employee_count)) : null;
    if (production_capacity !== undefined) payload.production_capacity = production_capacity;
    if (avg_lead_time_days !== undefined) payload.avg_lead_time_days = avg_lead_time_days ? parseInt(String(avg_lead_time_days)) : null;
    if (contact_name !== undefined) payload.contact_name = contact_name;
    if (contact_phone !== undefined) payload.contact_phone = contact_phone;
    if (contact_wechat !== undefined) payload.contact_wechat = contact_wechat;
    if (contact_email !== undefined) payload.contact_email = contact_email;
    if (website_url !== undefined) payload.website_url = website_url;
    if (intro_text_zh !== undefined) payload.intro_text_zh = intro_text_zh;
    if (intro_text_ko !== undefined) payload.intro_text_ko = intro_text_ko;
    if (certifications !== undefined) payload.certifications = certifications;
    if (main_products !== undefined) payload.main_products = main_products;
    if (cover_image_url !== undefined) payload.cover_image_url = cover_image_url;
    if (gallery_images !== undefined) payload.gallery_images = gallery_images;

    const { error: updateError } = await adminClient
      .from('factories')
      .update(payload)
      .eq('id', factoryData.id);

    if (updateError) {
      console.error('[factory/profile PATCH] 업데이트 오류:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: '프로필이 저장되었습니다.' });
  } catch (e: any) {
    console.error('[factory/profile PATCH] 오류:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
