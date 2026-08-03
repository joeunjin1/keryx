/**
 * 서비스 신청 제출 API
 * 서버 측에서 service_role_key로 처리하여 RLS 우회 + 상세 에러 로깅
 * 자동 번역: 한국어 → 중국어, 중국어 → 한국어 양방향 번역본 함께 저장
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { translateBidirectional } from '@/lib/translation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.service_type || !body.contact_name) {
      return NextResponse.json(
        { error: '필수 항목 누락: service_type, contact_name' },
        { status: 400 }
      );
    }

    const validTypes = ['market-research', 'factory-matching', 'sample-development'];
    if (!validTypes.includes(body.service_type)) {
      return NextResponse.json(
        { error: `잘못된 service_type: ${body.service_type}` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

    // null/빈 값 제거
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== null && v !== undefined && v !== '') {
        payload[k] = v;
      }
    }
    if (!payload.status) payload.status = 'pending';

    // 자동 번역: product_name, description, requirements 필드 번역 (한국어↔중국어)
    const fieldsToTranslate = [
      { src: 'product_name', zhKey: 'product_name_zh' },
      { src: 'description', zhKey: 'description_zh' },
      { src: 'requirements', zhKey: 'requirements_zh' },
    ];
    for (const { src, zhKey } of fieldsToTranslate) {
      const text = payload[src] as string | undefined;
      if (text && text.trim()) {
        try {
          const isChinese = /[\u4e00-\u9fff]/.test(text);
          const sourceLang = isChinese ? 'zh' : 'ko';
          const translated = await translateBidirectional(text.trim(), sourceLang);
          if (!isChinese && translated.zh) {
            payload[zhKey] = translated.zh;
          } else if (isChinese && translated.ko) {
            payload[src] = translated.ko; // 한국어를 기본 컬럼에 저장
            payload[zhKey] = text.trim(); // 원본 중국어를 zh 컬럼에 저장
          }
        } catch (transErr) {
          console.warn(`[apply/submit] translation skipped for ${src}:`, transErr);
        }
      }
    }

    console.log('[apply/submit] payload keys:', Object.keys(payload));

    const { data, error } = await supabase
      .from('service_requests')
      .insert(payload)
      .select('id, request_no')
      .single();

    if (error) {
      // 번역 컬럼이 없어서 오류가 난 경우 번역 컬럼 제외하고 재시도
      if (error.code === 'PGRST204' || error.message?.includes('column')) {
        console.warn('[apply/submit] translation columns not found, retrying without translation cols');
        const translationCols = ['product_name_zh', 'description_zh', 'requirements_zh'];
        const fallbackPayload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(payload)) {
          if (!translationCols.includes(k)) fallbackPayload[k] = v;
        }
        const { data: retryData, error: retryError } = await supabase
          .from('service_requests')
          .insert(fallbackPayload)
          .select('id, request_no')
          .single();
        if (retryError) {
          console.error('[apply/submit] retry error:', retryError.message);
          return NextResponse.json(
            { error: retryError.message, code: retryError.code },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true, id: retryData?.id, request_no: retryData?.request_no });
      }
      console.error('[apply/submit] error:', error.message, error.code, error.details);
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details, hint: error.hint },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id, request_no: data?.request_no });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[apply/submit] unexpected:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
