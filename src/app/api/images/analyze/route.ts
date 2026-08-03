import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import {
  analyzeInspectionPhotos,
  tagProductImages,
  matchProductToCharacter,
} from '@/lib/ai-image-analysis';

export const maxDuration = 90;  // Vision API는 더 느림

const Schema = z.discriminatedUnion('context_type', [
  z.object({
    context_type: z.literal('inspection_qc'),
    inspection_id: z.string().uuid(),
    image_urls: z.array(z.string().url()).min(1).max(6),
  }),
  z.object({
    context_type: z.literal('product_tag'),
    product_id: z.string().uuid(),
    image_urls: z.array(z.string().url()).min(1).max(6),
  }),
  z.object({
    context_type: z.literal('character_match'),
    ip_character_id: z.string().uuid(),
    image_urls: z.array(z.string().url()).min(1).max(6),
    product_id: z.string().uuid().nullable().optional(),
    design_task_id: z.string().uuid().nullable().optional(),
  }),
]);

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single();
  if (!me || !['md', 'admin', 'inspector'].includes(me.role)) {
    return NextResponse.json({ error: 'internal staff required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  let resultPayload: any;
  let overallScore: number | null = null;
  let passRecommendation: boolean | null = null;
  let defectCount = 0;
  let raw_response: any;
  let cost_usd: number = 0;

  try {
    if (parsed.data.context_type === 'inspection_qc') {
      // 검수 컨텍스트
      const { data: insp } = await supabase
        .from('inspections')
        .select(`order_id, order:orders(order_no,
          items:order_items(product:products(name_ko, name_zh)))`)
        .eq('id', parsed.data.inspection_id)
        .single();

      const productName = (insp as any)?.order?.items?.[0]?.product?.name_ko 
        ?? (insp as any)?.order?.items?.[0]?.product?.name_zh ?? '제품';

      const a = await analyzeInspectionPhotos(parsed.data.image_urls, {
        name: productName,
      });
      resultPayload = a.result;
      overallScore = a.result.overall_score;
      passRecommendation = a.result.pass_recommendation;
      defectCount = a.result.defect_count;
      raw_response = a.raw;
      cost_usd = a.cost_usd;
    }
    else if (parsed.data.context_type === 'product_tag') {
      const { data: p } = await supabase
        .from('products')
        .select(`name_ko, name_zh, category:categories(name_ko, name_zh)`)
        .eq('id', parsed.data.product_id)
        .single();

      const a = await tagProductImages(parsed.data.image_urls, {
        name: p?.name_ko ?? p?.name_zh,
        category: (p as any)?.category?.name_ko ?? (p as any)?.category?.name_zh,
      });
      resultPayload = a.result;
      raw_response = a.raw;
      cost_usd = a.cost_usd;
    }
    else if (parsed.data.context_type === 'character_match') {
      const { data: c } = await supabase
        .from('ip_characters')
        .select('name_ko, visual_style, color_palette, signature_features, art_direction')
        .eq('id', parsed.data.ip_character_id)
        .single();
      if (!c) return NextResponse.json({ error: 'character not found' }, { status: 404 });

      const a = await matchProductToCharacter(parsed.data.image_urls, {
        name: c.name_ko,
        visual_style: c.visual_style ?? '',
        color_palette: (c.color_palette as any) ?? [],
        signature_features: c.signature_features ?? [],
        art_direction: c.art_direction ?? '',
      });
      resultPayload = a.result;
      overallScore = a.result.match_score;
      passRecommendation = a.result.pass_recommendation;
      raw_response = a.raw;
      cost_usd = a.cost_usd;
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Vision 분석 실패: ${err.message}` }, { status: 500 });
  }

  // 저장
  const { data: analysisId, error } = await supabase.rpc('save_ai_image_analysis', {
    p_md_internal_user_id: me.id,
    p_inspection_id: parsed.data.context_type === 'inspection_qc' ? parsed.data.inspection_id : null,
    p_product_id:
      parsed.data.context_type === 'product_tag' ? parsed.data.product_id :
      parsed.data.context_type === 'character_match' ? (parsed.data.product_id ?? null) :
      null,
    p_design_task_id: parsed.data.context_type === 'character_match' ? (parsed.data.design_task_id ?? null) : null,
    p_ip_character_id: parsed.data.context_type === 'character_match' ? parsed.data.ip_character_id : null,
    p_image_urls: parsed.data.image_urls,
    p_context_type: parsed.data.context_type,
    p_result: resultPayload,
    p_overall_score: overallScore,
    p_pass_recommendation: passRecommendation,
    p_defect_count: defectCount,
    p_raw_response: raw_response,
    p_cost_usd: cost_usd,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    analysis_id: analysisId,
    result: resultPayload,
    overall_score: overallScore,
    pass_recommendation: passRecommendation,
    defect_count: defectCount,
    cost_usd,
  });
}
