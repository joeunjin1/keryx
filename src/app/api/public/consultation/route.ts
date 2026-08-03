import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  sendSms,
  buildConsultationAdminEmail,
  buildConsultationAdminSms,
} from '@/lib/notifications'

// service role 클라이언트 (RLS 우회 - 비로그인 INSERT 허용)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Supabase 환경변수 누락')
  return createServiceClient(url, key)
}

// 관리자 알림 수신 이메일 (환경변수 또는 기본값)
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'jo@keryx.kr'
// 관리자 알림 수신 전화번호 (환경변수 설정 시 SMS 발송)
const ADMIN_NOTIFY_PHONE = process.env.ADMIN_NOTIFY_PHONE || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 필수 필드 검증
    const { inquiry_type, requester_name, requester_email } = body
    if (!inquiry_type || !requester_name || !requester_email) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다' }, { status: 400 })
    }

    // service role 클라이언트 사용 (RLS 우회 - 비로그인 INSERT 허용)
    const supabase = getServiceClient()

    const insertData = {
      inquiry_type,
      product_id: body.product_id || null,
      product_name_snapshot: body.product_name_snapshot || null,
      product_image_snapshot: body.product_image_snapshot || null,
      product_code_snapshot: body.product_code_snapshot || null,
      product_price_snapshot: body.product_price_snapshot || null,
      reference_image_urls: body.reference_image_urls || [],
      requirements: body.requirements || null,
      target_use: body.target_use || null,
      quantity: body.quantity || null,
      target_price_cny: body.target_price_cny || null,
      packaging_type: body.packaging_type || null,
      packaging_detail: body.packaging_detail || null,
      custom_label: body.custom_label || false,
      custom_box: body.custom_box || false,
      oem_available: body.oem_available || false,
      print_method: body.print_method || null,
      color_options: body.color_options || null,
      size_options: body.size_options || null,
      extra_options: body.extra_options || {},
      requester_name,
      requester_email,
      requester_phone: body.requester_phone || null,
      requester_company: body.requester_company || null,
      requester_country: body.requester_country || 'KR',
      preferred_contact: body.preferred_contact || 'email',
      landing_slug: body.landing_slug || null,
      source_url: body.source_url || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      status: 'new',
      priority: 'normal',
    }

    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert(insertData)
      .select('id, created_at')
      .single()

    if (error) {
      console.error('상담 저장 오류:', error)
      return NextResponse.json({ error: '저장 중 오류가 발생했습니다', detail: error.message }, { status: 500 })
    }

    // 시스템 메시지 자동 생성 (상담 접수 확인)
    await supabase.from('consultation_messages').insert({
      consultation_id: consultation.id,
      sender_type: 'system',
      sender_name: 'KERYX 시스템',
      message: `상담이 접수되었습니다. 전담 MD가 24시간 내에 ${body.preferred_contact === 'email' ? '이메일' : body.preferred_contact === 'phone' ? '전화' : '메시지'}로 연락드립니다.`,
      message_type: 'system',
    })

    // ── 관리자 알림 발송 (비동기, 실패해도 응답에 영향 없음) ──
    const adminUrl = `https://www.keryx.kr/admin/consultations`
    const submittedAt = new Date(consultation.created_at).toLocaleString('ko-KR', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

    const notifyParams = {
      consultationId: consultation.id,
      inquiryType: inquiry_type,
      contactName: requester_name,
      contactEmail: requester_email,
      contactPhone: body.requester_phone || undefined,
      companyName: body.requester_company || undefined,
      preferredContact: body.preferred_contact || 'email',
      requirements: body.requirements || undefined,
      wantSample: body.want_sample || false,
      wantQuote: body.want_quote || false,
      productNames: body.product_name_snapshot ? [body.product_name_snapshot] : undefined,
      submittedAt,
      adminUrl,
    }

    // 이메일 알림 (백그라운드)
    sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      ...buildConsultationAdminEmail(notifyParams),
    }).then(result => {
      if (!result.success) {
        console.error('[ADMIN EMAIL NOTIFY ERROR]', result.error)
      } else {
        console.log('[ADMIN EMAIL NOTIFY]', result.simulated ? '시뮬레이션' : '발송 완료', result.messageId)
      }
    }).catch(err => console.error('[ADMIN EMAIL NOTIFY EXCEPTION]', err))

    // SMS 알림 (전화번호가 설정된 경우에만)
    if (ADMIN_NOTIFY_PHONE) {
      sendSms({
        to: ADMIN_NOTIFY_PHONE,
        message: buildConsultationAdminSms(notifyParams),
        subject: '새 상담 신청 알림',
      }).then(result => {
        if (!result.success) {
          console.error('[ADMIN SMS NOTIFY ERROR]', result.error)
        } else {
          console.log('[ADMIN SMS NOTIFY]', result.simulated ? '시뮬레이션' : '발송 완료', result.messageId)
        }
      }).catch(err => console.error('[ADMIN SMS NOTIFY EXCEPTION]', err))
    }

    return NextResponse.json({
      success: true,
      consultation_id: consultation.id,
      created_at: consultation.created_at,
    })
  } catch (err) {
    console.error('상담 API 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // 상담 ID로 상태 조회 (고객용)
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const email = searchParams.get('email')

  if (!id || !email) {
    return NextResponse.json({ error: '상담 ID와 이메일이 필요합니다' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, status, created_at, last_replied_at')
    .eq('id', id)
    .eq('requester_email', email)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '상담을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json(data)
}
