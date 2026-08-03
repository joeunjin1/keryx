import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { generateIpCharacter } from '@/lib/ai-ip-character';

export const maxDuration = 60;

const Schema = z.object({
  ip_id: z.string().uuid(),
  user_concept: z.string().min(10).max(2000),
  target_audience: z.string().nullable().optional(),
  desired_categories: z.array(z.string()).optional(),
  inspiration_keywords: z.array(z.string()).optional(),
  parent_character_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single();
  if (!me || !['md', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'MD or admin role required' }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  // IP 정보 가져오기 (자체 IP만 허용)
  const { data: ip } = await supabase
    .from('ips')
    .select('id, code, name_ko, is_own_ip')
    .eq('id', parsed.data.ip_id)
    .single();

  if (!ip) return NextResponse.json({ error: 'IP not found' }, { status: 404 });
  if (!ip.is_own_ip) {
    return NextResponse.json({ error: '자체 IP에만 캐릭터 생성 가능' }, { status: 400 });
  }

  // 부모 캐릭터 정보 (변형 생성 시)
  let parentSummary: string | undefined;
  if (parsed.data.parent_character_id) {
    const { data: parent } = await supabase
      .from('ip_characters')
      .select('name_ko, one_liner, personality, signature_features, color_palette')
      .eq('id', parsed.data.parent_character_id)
      .single();
    if (parent) {
      parentSummary = `이름: ${parent.name_ko}, 한 줄 소개: ${parent.one_liner}, 성격: ${parent.personality}, 시그니처: ${parent.signature_features?.join(', ')}`;
    }
  }

  let result: Awaited<ReturnType<typeof generateIpCharacter>>;
  try {
    result = await generateIpCharacter({
      ip_brand_name: ip.name_ko,
      user_concept: parsed.data.user_concept,
      target_audience: parsed.data.target_audience ?? undefined,
      desired_categories: parsed.data.desired_categories,
      inspiration_keywords: parsed.data.inspiration_keywords,
      parent_character_summary: parentSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `AI 생성 실패: ${err.message}` }, { status: 500 });
  }

  // 코드 충돌 체크 — 이미 같은 code 있으면 -02, -03 자동 부여
  let finalCode = result.result.code;
  let counter = 2;
  while (true) {
    const { count } = await supabase
      .from('ip_characters')
      .select('*', { count: 'exact', head: true })
      .eq('ip_id', parsed.data.ip_id)
      .eq('code', finalCode);
    if ((count ?? 0) === 0) break;
    finalCode = `${result.result.code.split('-')[0]}-${String(counter).padStart(2, '0')}`;
    counter++;
    if (counter > 99) break;
  }

  // 저장
  const { data: characterId, error } = await supabase.rpc('save_ip_character', {
    p_ip_id: parsed.data.ip_id,
    p_created_by: me.id,
    p_code: finalCode,
    p_name_ko: result.result.name_ko,
    p_name_zh: result.result.name_zh,
    p_name_ja: result.result.name_ja,
    p_name_en: result.result.name_en,
    p_one_liner: result.result.one_liner,
    p_personality: result.result.personality,
    p_backstory: result.result.backstory,
    p_age_range: result.result.age_range,
    p_gender: result.result.gender,
    p_visual_style: result.result.visual_style,
    p_color_palette: result.result.color_palette as any,
    p_signature_features: result.result.signature_features,
    p_art_direction: result.result.art_direction,
    p_target_audience: result.result.target_audience,
    p_recommended_categories: result.result.recommended_categories,
    p_raw_response: result.raw,
    p_cost_usd: result.cost_usd,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 변형이면 parent 연결
  if (parsed.data.parent_character_id) {
    await supabase
      .from('ip_characters')
      .update({ parent_character_id: parsed.data.parent_character_id })
      .eq('id', characterId as string);
  }

  return NextResponse.json({
    ok: true,
    character_id: characterId,
    character: result.result,
    cost_usd: result.cost_usd,
  });
}
