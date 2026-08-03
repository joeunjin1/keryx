'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Star, Sparkles, TrendingUp } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

export default function MdBriefDetailPage({
  params,
}: {
  params: { briefId: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [brief, setBrief] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  async function loadLatestAnalysis() {
    const { data } = await supabase
      .from('ai_price_analyses')
      .select('*')
      .eq('brief_id', params.briefId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setAnalysis(data);
  }

  async function runAiAnalysis() {
    setAnalyzing(true);
    const res = await fetch(`/api/briefs/${params.briefId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    setAnalyzing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`AI 분석 실패: ${j.error ?? '알 수 없는 오류'}`);
      return;
    }
    await loadLatestAnalysis();
  }

  async function load() {
    const { data: b } = await supabase
      .from('briefs')
      .select(
        `*,
         seller:sellers(business_name, current_grade),
         category:categories(name_ko, name_zh)`
      )
      .eq('id', params.briefId)
      .single();
    setBrief(b);

    const { data: r } = await supabase
      .from('brief_responses')
      .select(
        `*,
         factory:factories(factory_code, company_name, rating),
         product:products(id, sku, name_ko, name_zh, size_mm, moq, lead_time_days, sample_cost_cny,
           images:product_images(url, is_primary),
           pricing:product_pricing_tiers(min_qty, unit_price_cny))`
      )
      .eq('brief_id', params.briefId)
      .order('created_at', { ascending: false });
    setResponses(r ?? []);

    const { data: rec } = await supabase
      .from('brief_recipients')
      .select('*, factory:factories(factory_code, company_name)')
      .eq('brief_id', params.briefId);
    setRecipients(rec ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
    loadLatestAnalysis();
  }, [params.briefId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`brief-${params.briefId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'brief_responses', filter: `brief_id=eq.${params.briefId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [params.briefId]);

  async function handleSelect(responseId: string) {
    if (!confirm('이 제안을 채택하시겠습니까?\n\n바이어 추천 큐에 등록되고 product가 approved 상태가 됩니다.')) return;
    setSelecting(responseId);
    const res = await fetch(`/api/briefs/${params.briefId}/select-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_id: responseId }),
    });
    setSelecting(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? '채택 실패');
      return;
    }
    alert('채택 완료. 바이어 추천 큐에 등록되었습니다.');
    await load();
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!brief) return <div className="p-8 text-center text-stone-500">Brief를 찾을 수 없습니다.</div>;

  const respondedCount = recipients.filter((r) => r.responded_at).length;
  const noResponseFactories = recipients.filter((r) => !r.responded_at);

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-5xl mx-auto px-5 py-6 grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">

          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-2">{brief.title_ko ?? brief.title_zh}</div>
              <p className="text-xs text-stone-700 leading-relaxed mb-3">{brief.concept}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-stone-50 rounded p-2">
                  <div className="text-[10px] text-stone-500">목표 단가</div>
                  <div className="font-medium">¥{brief.target_unit_price_min_cny}~{brief.target_unit_price_max_cny}</div>
                </div>
                <div className="bg-stone-50 rounded p-2">
                  <div className="text-[10px] text-stone-500">MOQ</div>
                  <div className="font-medium">{brief.moq_min?.toLocaleString()}~{brief.moq_max?.toLocaleString()}</div>
                </div>
                <div className="bg-stone-50 rounded p-2">
                  <div className="text-[10px] text-stone-500">납기</div>
                  <div className="font-medium">{brief.delivery_target}</div>
                </div>
                <div className="bg-stone-50 rounded p-2">
                  <div className="text-[10px] text-stone-500">발송</div>
                  <div className="font-medium">{recipients.length}곳 공장</div>
                </div>
              </div>
            </CardBody>
          </Card>


          {responses.length > 0 && (
            <Card className={analysis ? 'bg-gradient-to-br from-brand-50 to-vip-50 border-brand-200' : ''}>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-700" />
                    <div className="text-sm font-medium text-brand-900">AI 가격 분석</div>
                    {analysis && (
                      <span className="text-[10px] text-stone-500">
                        {new Date(analysis.created_at).toLocaleString('ko')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={runAiAnalysis}
                    disabled={analyzing || responses.length === 0}
                    className="px-3 py-1.5 text-[11px] bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-md flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {analyzing ? '분석 중...' : analysis ? '재분석' : 'Claude 분석 시작'}
                  </button>
                </div>

                {!analysis && !analyzing && (
                  <p className="text-xs text-stone-600">
                    공장 {responses.length}곳 제안서를 Claude Opus 4.7이 비교 분석합니다 — 시장가·최선 제안·협상 포인트·권장 마진을 자동 산정합니다.
                  </p>
                )}

                {analyzing && (
                  <div className="text-xs text-brand-700 italic">
                    Claude가 분석 중입니다... (보통 10~20초)
                  </div>
                )}

                {analysis && (
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <div className="bg-white/70 rounded p-2.5">
                        <div className="text-[10px] text-stone-500">추정 시장가</div>
                        <div className="text-base font-medium text-brand-800">
                          ¥{Number(analysis.market_estimate_cny).toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-white/70 rounded p-2.5">
                        <div className="text-[10px] text-stone-500">권장 마진</div>
                        <div className="text-base font-medium text-vip-700">
                          {Number(analysis.recommended_margin_pct).toFixed(0)}%
                        </div>
                      </div>
                      <div className="bg-white/70 rounded p-2.5">
                        <div className="text-[10px] text-stone-500">바이어 적용단가 추천</div>
                        <div className="text-base font-medium text-green-700">
                          ¥{Number(analysis.recommended_seller_price_cny).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 rounded p-2.5">
                      <div className="text-[10px] text-stone-500 mb-1">시장가 분석</div>
                      <div className="text-xs text-stone-700">{analysis.market_estimate_reasoning}</div>
                    </div>

                    {analysis.best_proposal_id && (() => {
                      const best = responses.find((r) => r.id === analysis.best_proposal_id);
                      return best ? (
                        <div className="bg-green-50 border border-green-200 rounded p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-3 h-3 text-green-700" />
                            <div className="text-[11px] text-green-800 font-medium">
                              AI 추천 채택: {best.factory?.factory_code} · {best.factory?.company_name}
                            </div>
                          </div>
                          <div className="text-xs text-green-700">{analysis.best_proposal_reason}</div>
                        </div>
                      ) : null;
                    })()}

                    {Array.isArray(analysis.negotiation_points) && analysis.negotiation_points.length > 0 && (
                      <div>
                        <div className="text-[11px] text-stone-700 font-medium mb-1.5">협상 포인트</div>
                        <div className="space-y-1.5">
                          {analysis.negotiation_points.map((np: any, idx: number) => {
                            const r = responses.find((x) => x.id === np.response_id);
                            if (!r || !Array.isArray(np.points)) return null;
                            return (
                              <div key={idx} className="bg-white/70 rounded p-2 text-[11px]">
                                <div className="font-medium text-stone-800 mb-0.5">
                                  {r.factory?.factory_code} · {r.factory?.company_name}
                                </div>
                                <ul className="space-y-0.5 text-stone-700 ml-3">
                                  {np.points.map((p: string, i: number) => (
                                    <li key={i} className="list-disc">{p}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-stone-500 italic">
                        Claude Opus 4.7 · 분석 비용 ${Number(analysis.cost_usd ?? 0).toFixed(4)}
                      </div>
                      <Link
                        href={`/md/orders/margin-builder?briefId=${params.briefId}&analysisId=${analysis.id}`}
                        className="px-3 py-1.5 text-[11px] bg-vip-600 hover:bg-vip-700 text-white rounded-md flex items-center gap-1"
                      >
                        <TrendingUp className="w-3 h-3" />
                        이 분석으로 주문서 작성
                      </Link>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}


          <div className="text-sm font-medium">공장 제안 ({responses.length}건)</div>

          {responses.length === 0 && (
            <Card>
              <CardBody className="text-center py-6 text-sm text-stone-500">
                아직 응답이 없습니다.
              </CardBody>
            </Card>
          )}

          {responses.map((r: any) => {
            const tier = r.product?.pricing?.[0];
            const primaryImg = r.product?.images?.find((i: any) => i.is_primary) ?? r.product?.images?.[0];
            const isSelected = r.selected_for_seller;
            const isAiRecommended = analysis?.best_proposal_id === r.id;
            return (
              <Card
                key={r.id}
                className={
                  isSelected ? 'border-green-400 bg-green-50/30' :
                  isAiRecommended ? 'border-brand-400 bg-brand-50/30 ring-1 ring-brand-200' : ''
                }
              >
                <CardBody>
                  <div className="flex gap-3">
                    {primaryImg && (
                      <a href={primaryImg.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Image src={primaryImg.url} alt="" width={200} height={200} className="object-cover" />
                      </a>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium">
                          {r.product?.name_ko ?? r.product?.name_zh}
                        </div>
                        {isAiRecommended && (
                          <Badge variant="brand" size="xs">
                            <Sparkles className="w-3 h-3 inline -mt-0.5" /> AI 추천
                          </Badge>
                        )}
                        {r.factory?.rating && (
                          <Badge variant="default" size="xs">
                            <Star className="w-3 h-3 inline -mt-0.5" /> {r.factory.rating}
                          </Badge>
                        )}
                        <span className="text-[10px] text-stone-400 ml-auto">
                          제안 #{r.proposal_no}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {r.factory?.factory_code} · {r.factory?.company_name}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-xs">
                        <Stat label="단가" value={`¥${tier?.unit_price_cny ?? '-'}`} highlight />
                        <Stat label="MOQ" value={r.product?.moq?.toLocaleString() ?? '-'} />
                        <Stat label="리드타임" value={`${r.product?.lead_time_days ?? '-'}일`} />
                        <Stat label="샘플비" value={`¥${r.product?.sample_cost_cny ?? 0}`} />
                      </div>
                      {r.product?.size_mm && (
                        <div className="text-[10px] text-stone-500 mt-1">사이즈: {r.product.size_mm}</div>
                      )}
                      {r.notes && (
                        <div className="bg-vip-50 rounded p-2 mt-2 text-[11px] text-vip-900">
                          공장 메모: {r.notes}
                        </div>
                      )}
                      <div className="mt-3 flex justify-end gap-2">
                        {r.product?.id && (
                          <Link
                            href={`#`}
                            className="px-3 py-1.5 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-md"
                          >
                            제품 상세
                          </Link>
                        )}
                        <Link
                          href={`/md/factory/${r.factory_id}`}
                          className="px-3 py-1.5 text-[11px] bg-stone-100 hover:bg-stone-200 rounded-md"
                        >
                          공장과 채팅
                        </Link>
                        {isSelected ? (
                          <Badge variant="success" size="sm">
                            ✓ 채택됨 · 추천 큐 등록 완료
                          </Badge>
                        ) : (
                          <button
                            onClick={() => handleSelect(r.id)}
                            disabled={!!selecting}
                            className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-md flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {selecting === r.id ? '처리 중…' : '이 제안 채택'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>


        <div className="space-y-3">
          <Card>
            <CardBody>
              <div className="text-xs font-medium mb-2">발송 공장 ({recipients.length}곳)</div>
              <div className="space-y-1">
                {recipients.map((r: any) => (
                  <div
                    key={r.id}
                    className={cn(
                      'text-[11px] p-1.5 rounded',
                      r.responded_at ? 'bg-green-50 text-green-800' : 'bg-stone-50 text-stone-500'
                    )}
                  >
                    {r.factory?.factory_code} · {r.factory?.company_name}
                    <span className="ml-1 text-[10px]">
                      {r.responded_at ? '✓' : r.viewed_at ? '읽음' : '미열람'}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {brief.md_notes_to_factory && (
            <Card className="bg-vip-50 border-vip-200">
              <CardBody>
                <div className="text-[10px] text-vip-700 mb-1">공장에게 보낸 MD 메모</div>
                <div className="text-xs text-vip-900">{brief.md_notes_to_factory}</div>
              </CardBody>
            </Card>
          )}

          {brief.reference_image_urls?.length > 0 && (
            <Card>
              <CardBody>
                <div className="text-[10px] text-stone-500 mb-1.5">참고 이미지</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                  {brief.reference_image_urls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <Image src={url} alt="" width={200} height={200} className="object-cover" />
                    </a>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-stone-500">{label}</div>
      <div className={cn('font-medium', highlight && 'text-brand-700')}>{value}</div>
    </div>
  );
}
