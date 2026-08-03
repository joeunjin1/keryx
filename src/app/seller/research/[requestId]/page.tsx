export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';

export default async function SellerResearchDetailPage({
  params,
}: {
  params: { requestId: string };
}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=seller');

  const { data: request } = await supabase
    .from('market_research_requests')
    .select(
      `*,
       md:internal_users(name_ko, name_zh, staff_code),
       items:market_research_items(*)`
    )
    .eq('id', params.requestId)
    .single();

  if (!request) {
    return <div className="p-8 text-center text-stone-500">요청을 찾을 수 없습니다.</div>;
  }

  // Reports — RLS will only return admin-approved
  const { data: reports } = await supabase
    .from('market_research_reports')
    .select('*')
    .eq('request_id', params.requestId)
    .not('approved_at', 'is', null);

  const isReady = ['admin_approved', 'delivered'].includes(request.status);

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/seller/research" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="text-base font-medium">{request.request_no}</div>
            <div className="text-[11px] text-stone-500">
              {(request.md as any)?.name_ko ?? '담당'} MD · 상품 {request.product_count}건
            </div>
          </div>
          <Badge
            variant={isReady ? 'success' : 'warning'}
            size="sm"
          >
            {statusLabel(request.status)}
          </Badge>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-4">
        {!isReady && (
          <Card className="bg-vip-50 border-vip-200">
            <CardBody>
              <div className="text-sm text-vip-900 font-medium">⏳ 조사 진행 중</div>
              <p className="text-xs text-vip-800 mt-1 leading-relaxed">
                {request.status === 'requested' && '요청이 접수되었습니다. MD가 곧 조사를 시작합니다.'}
                {request.status === 'in_progress' && 'MD가 공장 풀과 시장 가격을 조사하고 있습니다.'}
                {request.status === 'md_completed' && 'MD 조사가 완료되어 운영자 승인 대기 중입니다.'}
              </p>
              <p className="text-[11px] text-vip-700 mt-2">
                예상 마감: {request.expected_deadline}
              </p>
            </CardBody>
          </Card>
        )}

        {/* Original requests */}
        {(request.items ?? []).map((item: any) => {
          const itemReports = (reports ?? []).filter(
            (r: any) => r.item_id === item.id || (!r.item_id && reports?.length === 1)
          );

          return (
            <Card key={item.id}>
              <CardBody>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-[11px] text-stone-500">바이어 요청</div>
                    <div className="text-sm font-medium mt-0.5">상품 {item.position}</div>
                  </div>
                </div>

                {/* Photos + description */}
                {item.reference_image_urls?.length > 0 && (
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {item.reference_image_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="aspect-square w-full rounded object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="text-xs text-stone-700 mb-2">{item.description}</div>
                <div className="text-[11px] text-stone-500 flex gap-3 mb-3">
                  {item.desired_unit_price_hint && <span>희망 {item.desired_unit_price_hint}</span>}
                  {item.desired_qty_hint && <span>수량 {item.desired_qty_hint}</span>}
                  {item.desired_timing && <span>시기 {item.desired_timing}</span>}
                </div>

                {/* Reports */}
                {isReady && itemReports.length > 0 && (
                  <div className="border-t border-stone-200 pt-3 mt-3 space-y-3">
                    <div className="text-sm font-medium text-brand-800">MD의 조사 결과</div>

                    {itemReports.map((rep: any) => (
                      <div key={rep.id}>
                        {/* Candidate factories */}
                        <div className="text-[11px] text-stone-600 mb-1.5">제조 가능 공장 {rep.candidate_factories?.length ?? 0}곳</div>
                        <div className="space-y-1.5 mb-3">
                          {(rep.candidate_factories as any[] ?? []).map((c, i) => (
                            <div key={i} className="bg-stone-50 rounded p-2.5">
                              <div className="flex justify-between items-center">
                                <div className="text-xs font-medium">
                                  {c.anon_label}
                                  {c.city && <span className="text-stone-500 ml-1">· {c.city}</span>}
                                </div>
                                {c.rating && (
                                  <Badge variant="default" size="xs">★ {c.rating}</Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-600 mt-1">
                                단가 ¥{c.unit_price_cny} ({c.moq?.toLocaleString()}개 기준) · 리드타임 {c.lead_time_days}일
                                {c.sample_cost_cny != null && ` · 샘플 ¥${c.sample_cost_cny}`}
                              </div>
                              {c.notes && (
                                <div className="text-[11px] text-stone-500 mt-1 italic">{c.notes}</div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* MD recommendation */}
                        <div className="bg-brand-50 rounded p-2.5 mb-3">
                          <div className="text-[11px] text-brand-700 mb-1">MD의 추천 의견</div>
                          <div className="text-xs text-brand-900 leading-relaxed whitespace-pre-wrap">
                            {rep.md_recommendation}
                          </div>
                        </div>

                        {/* Market price reference */}
                        {rep.market_price_reference && Object.keys(rep.market_price_reference).length > 0 && (
                          <div className="bg-stone-50 rounded p-2.5">
                            <div className="text-[11px] text-stone-500 mb-1">시장 가격 참고</div>
                            <div className="text-xs space-y-0.5">
                              {(rep.market_price_reference as any).alibaba_min != null && (
                                <div className="flex justify-between">
                                  <span>알리바바</span>
                                  <span>¥{(rep.market_price_reference as any).alibaba_min}~{(rep.market_price_reference as any).alibaba_max}</span>
                                </div>
                              )}
                              {(rep.market_price_reference as any).market_1688_min != null && (
                                <div className="flex justify-between">
                                  <span>1688</span>
                                  <span>¥{(rep.market_price_reference as any).market_1688_min}~{(rep.market_price_reference as any).market_1688_max}</span>
                                </div>
                              )}
                              {(rep.market_price_reference as any).korea_wholesale_min != null && (
                                <div className="flex justify-between">
                                  <span>한국 도매</span>
                                  <span>₩{((rep.market_price_reference as any).korea_wholesale_min as number).toLocaleString()}~{((rep.market_price_reference as any).korea_wholesale_max as number).toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}

        {isReady && (
          <Card>
            <CardBody>
              <div className="text-xs text-stone-600 mb-3">다음 단계</div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/seller/messages`}
                  className="px-3 py-2.5 text-xs bg-stone-100 hover:bg-stone-200 rounded-md text-center transition"
                >
                  MD에게 견적 요청
                </Link>
                <Link
                  href={`/seller/messages`}
                  className="px-3 py-2.5 text-xs bg-brand-600 hover:bg-brand-800 text-white rounded-md text-center transition"
                >
                  샘플 신청
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

function statusLabel(s: string): string {
  return ({
    requested: '요청 접수',
    in_progress: '조사 중',
    md_completed: '운영자 승인 대기',
    admin_approved: '결과 도착',
    delivered: '결과 도착',
    cancelled: '취소',
  } as Record<string, string>)[s] ?? s;
}
