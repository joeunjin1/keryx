export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, MessageCircle, FileText, Plus } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { ChatThread } from '@/components/chat/ChatThread';
import LangText from '@/components/layout/LangText';

export default async function MdSellerWorkroomPage({
  params,
}: {
  params: { sellerId: string };
}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  // Verify MD permission
  const { data: me } = await supabase
    .from('internal_users')
    .select('id, name_ko, name_zh, staff_code, role')
    .eq('user_id', user.id)
    .single();

  if (!me || !['md', 'admin'].includes(me.role)) {
    redirect('/admin');
  }

  // Load seller with all related data
  const { data: seller } = await supabase
    .from('sellers')
    .select(
      `*,
       interests:seller_interests(id, priority, description, budget_hint_cny, status, updated_at)`
    )
    .eq('id', params.sellerId)
    .single();

  if (!seller) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-stone-50">
        <Card className="max-w-sm">
          <CardBody className="text-center">
            <div className="text-sm">바이어를 찾을 수 없습니다.</div>
            <Link href="/md" className="text-xs text-brand-600 mt-3 inline-block">목록으로</Link>
          </CardBody>
        </Card>
      </main>
    );
  }

  // Get/create conversation
  const { data: convId } = await supabase.rpc('get_or_create_conversation', {
    p_seller_id: seller.id,
  });

  // Recent messages for chat
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(50);

  // Recommendations queue (visible/clicked products in seller dashboard)
  const { data: recommendations } = await supabase
    .from('recommendations')
    .select(
      `id, status, click_count, created_at,
       product:products(id, sku, name_ko, name_zh, moq, factory:factories(factory_code),
         images:product_images(url, is_primary))`
    )
    .eq('seller_id', seller.id)
    .in('status', ['pending', 'visible', 'clicked'])
    .order('display_order')
    .limit(10);

  // Briefs sent for this seller, with response counts
  const { data: briefs } = await supabase
    .from('briefs')
    .select(
      `id, brief_no, title_zh, title_ko, status, deadline,
       recipients:brief_recipients(id),
       responses:brief_responses(id)`
    )
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Active orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_no, status, production_progress_pct, expected_warehouse_arrival, total_cny')
    .eq('seller_id', seller.id)
    .in('status', [
      'pending_admin_approval',
      'awaiting_deposit',
      'in_production',
      'production_completed',
      'arrived_warehouse',
      'inspecting',
      'inspection_admin_review',
      'inspection_seller_review',
      'awaiting_balance',
      'shipping_to_korea',
    ])
    .order('updated_at', { ascending: false })
    .limit(8);

  // Active market research
  const { data: research } = await supabase
    .from('market_research_requests')
    .select('id, request_no, status, created_at, expected_deadline, product_count')
    .eq('seller_id', seller.id)
    .in('status', ['requested', 'in_progress', 'md_completed'])
    .order('created_at', { ascending: false })
    .limit(3);

  const interests = (seller.interests ?? []).sort(
    (a: any, b: any) => (a.priority ?? 99) - (b.priority ?? 99)
  );

  return (
    <main className="h-dvh flex flex-col bg-stone-50">



      <div className="bg-white border-b border-stone-200 shrink-0">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              name={seller.business_name}
              size="md"
              variant={seller.current_grade === 'vip' ? 'vip' : 'brand'}
            />
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">{seller.business_name}</div>
                {seller.current_grade === 'vip' && <Badge variant="vip" size="xs">VIP</Badge>}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {seller.country === 'KR' ? '한국' : seller.country} · {seller.primary_channel ?? '채널 미입력'}
                · 이번 달 잔금 ¥{Math.round(seller.current_month_balance_paid_cny ?? 0).toLocaleString()}
                · 누적 ¥{Math.round(seller.total_balance_paid_cny ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/md`}
              className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 rounded-md transition"
            >
              바이어 변경
            </Link>
            <Link
              href={`/md/seller/${seller.id}/dashboard-view`}
              className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 rounded-md transition"
            >
              바이어 대시보드 보기 →
            </Link>
            <Link
              href={`/md/briefs/new?sellerId=${seller.id}`}
              className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 rounded-md transition flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 수동 Brief
            </Link>
            <Link
              href={`/md/ai-brief?sellerId=${seller.id}`}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-brand-600 to-vip-600 hover:from-brand-700 hover:to-vip-700 text-white rounded-md transition flex items-center gap-1"
            >
              ✨ AI Brief
            </Link>
          </div>
        </div>
      </div>


      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 p-3 min-h-0">

        <aside className="col-span-3 flex flex-col gap-3 min-h-0">

          <Card className="shrink-0">
            <CardBody className="py-3">
              <div className="text-[11px] font-medium text-stone-500 mb-2">관심품목 · 실시간</div>
              <div className="space-y-1.5">
                {interests.length === 0 && (
                  <div className="text-xs text-stone-400">아직 등록된 관심품목 없음</div>
                )}
                {interests.slice(0, 4).map((it: any) => (
                  <div
                    key={it.id}
                    className={`text-[11px] p-1.5 rounded ${
                      it.priority === 1 ? 'bg-vip-50' : 'bg-stone-50'
                    }`}
                  >
                    <div className={`text-[9px] ${it.priority === 1 ? 'text-vip-800' : 'text-stone-500'}`}>
                      {it.priority}순위 · {timeAgo(it.updated_at)}
                    </div>
                    <div className="mt-0.5">{it.description}</div>
                    <div className="flex gap-1 mt-1.5">
                      <Link
                        href={`/md/ai-brief?sellerId=${seller.id}&interestId=${it.id}`}
                        className="text-[9px] px-1.5 py-0.5 bg-brand-600 hover:bg-brand-800 text-white rounded"
                      >
                        ✨ AI Brief
                      </Link>
                      <Link
                        href={`/md/ai-match?sellerId=${seller.id}&interestId=${it.id}`}
                        className="text-[9px] px-1.5 py-0.5 bg-vip-600 hover:bg-vip-700 text-white rounded"
                      >
                        ✨ 카탈로그 매칭
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>


          {research && research.length > 0 && (
            <Card className="shrink-0">
              <CardBody className="py-3">
                <div className="text-[11px] font-medium text-stone-500 mb-2">시장조사 진행</div>
                {research.map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/md/research/${r.id}`}
                    className="block text-xs hover:bg-stone-50 p-1.5 rounded -mx-1.5"
                  >
                    <div className="font-medium">{r.request_no}</div>
                    <div className="text-stone-500 text-[10px] mt-0.5">
                      {researchStatusLabel(r.status)} · 상품 {r.product_count}건
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}


          <Card className="shrink-0">
            <CardBody className="py-3">
              <div className="text-[11px] font-medium text-stone-500 mb-2">내부 메모</div>
              <div className="text-[11px] text-stone-600 italic leading-relaxed">
                {seller.internal_notes || '메모 없음. 클릭하여 작성.'}
              </div>
            </CardBody>
          </Card>


          <Card className="flex-1 min-h-0 flex flex-col">
            <div className="px-3 py-2 border-b border-stone-200 flex items-center gap-2 shrink-0">
              <MessageCircle className="w-3.5 h-3.5 text-stone-500" />
              <div className="text-[11px] font-medium text-stone-700">채팅 · 한↔中 자동번역</div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatThread
                conversationId={convId as string}
                viewerRole="md"
                sellerName={seller.business_name}
                mdName={me.name_ko ?? me.name_zh ?? 'MD'}
                initialMessages={(messages ?? []) as any}
                quickReplies={[
                  '收到',
                  '工厂在确认',
                  '价格再谈一下',
                  '建议改色',
                  '样品已发',
                ]}
              />
            </div>
          </Card>
        </aside>


        <section className="col-span-6 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">바이어 대시보드 노출 큐</div>
                <div className="flex gap-2">
                  <button className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded">
                    선택 → 주문서
                  </button>
                  <Link
                    href={`/md/seller/${seller.id}/recommendations/new`}
                    className="text-xs text-brand-600"
                  >
                    + 제품 추가
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(recommendations ?? []).length === 0 && (
                  <div className="col-span-3 text-center py-6 text-xs text-stone-400">
                    아직 추천된 제품이 없습니다. + 제품 추가로 바이어 대시보드에 노출하세요.
                  </div>
                )}
                {(recommendations ?? []).map((r: any) => (
                  <div
                    key={r.id}
                    className={`p-2 rounded-md ${
                      r.status === 'visible' ? 'bg-stone-50 border-2 border-brand-600' : 'bg-stone-50'
                    }`}
                  >
                    <div className="aspect-square bg-stone-200 rounded overflow-hidden">
                      {r.product?.images?.[0]?.url && (
                        <img
                          src={r.product.images[0].url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="text-[11px] mt-1.5 line-clamp-2">
                      {r.product?.name_ko ?? r.product?.name_zh}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {r.product?.factory?.factory_code} · MOQ {r.product?.moq}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${statusColor(r.status)}`}>
                      {recStatusLabel(r.status)}
                      {r.click_count > 0 && ` · 클릭 ${r.click_count}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">발송한 Brief 응답 현황</div>
                <Link href="/md/briefs" className="text-xs text-brand-600">
                  전체 →
                </Link>
              </div>

              <div className="space-y-2">
                {(briefs ?? []).length === 0 && (
                  <div className="text-center py-4 text-xs text-stone-400">
                    아직 발송한 Brief가 없습니다.
                  </div>
                )}
                {(briefs ?? []).map((b: any) => (
                  <Link
                    key={b.id}
                    href={`/md/briefs/${b.id}`}
                    className="block bg-stone-50 hover:bg-stone-100 rounded-md p-3 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">
                        {b.brief_no} · {b.title_ko ?? b.title_zh}
                      </div>
                      <Badge
                        variant={b.responses?.length > 0 ? 'success' : 'default'}
                        size="xs"
                      >
                        {b.responses?.length ?? 0}/{b.recipients?.length ?? 0} 응답
                      </Badge>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                      {briefStatusLabel(b.status)}
                      {b.deadline && ` · 마감 ${new Date(b.deadline).toLocaleDateString('ko')}`}
                    </div>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>


        <aside className="col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <Card>
            <CardBody className="py-3">
              <div className="text-[11px] font-medium text-stone-500 mb-2">진행 중 주문</div>
              <div className="space-y-2">
                {(orders ?? []).length === 0 && (
                  <div className="text-xs text-stone-400">진행 중 주문 없음</div>
                )}
                {(orders ?? []).map((o: any) => (
                  <Link
                    key={o.id}
                    href={`/md/orders/${o.id}`}
                    className="block hover:bg-stone-50 -mx-2 px-2 py-1.5 rounded"
                  >
                    <div className="text-xs font-medium">{o.order_no}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {orderStatusLabel(o.status)}
                      {o.production_progress_pct ? ` · ${o.production_progress_pct}%` : ''}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      ¥{Math.round(o.total_cny ?? 0).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="py-3">
              <div className="text-[11px] font-medium text-stone-500 mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" /> 빠른 액션
              </div>
              <div className="space-y-1.5">
                <Link
                  href={`/md/orders/new?sellerId=${seller.id}`}
                  className="block text-[11px] text-brand-600 hover:underline"
                >
                  → 주문서 작성
                </Link>
                <Link
                  href={`/md/research?sellerId=${seller.id}`}
                  className="block text-[11px] text-brand-600 hover:underline"
                >
                  → 시장조사 보고서 작성
                </Link>
                <Link
                  href={`/md/seller/${seller.id}/notes`}
                  className="block text-[11px] text-brand-600 hover:underline"
                >
                  → 내부 메모 수정
                </Link>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </main>
  );
}

// Helpers
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function statusColor(s: string): string {
  if (s === 'visible' || s === 'clicked' || s === 'in_cart') return 'text-green-700';
  if (s === 'pending') return 'text-stone-500';
  return 'text-stone-400';
}

function recStatusLabel(s: string): string {
  return ({
    pending: '노출 대기',
    visible: '노출중',
    clicked: '클릭됨',
    in_cart: '카트 담김',
    ordered: '주문됨',
    dismissed: '제외',
  } as Record<string, string>)[s] ?? s;
}

function briefStatusLabel(s: string): string {
  return ({
    draft: '작성 중',
    sent: '발송 · 응답 대기',
    partial_response: '일부 응답',
    all_responded: '응답 완료',
    closed: '종료',
    cancelled: '취소',
  } as Record<string, string>)[s] ?? s;
}

function orderStatusLabel(s: string): string {
  return ({
    pending_admin_approval: '운영자 승인 대기',
    awaiting_deposit: '선금 대기',
    in_production: '생산 중',
    production_completed: '생산 완료',
    arrived_warehouse: '창고 입고',
    inspecting: '검수 중',
    inspection_admin_review: '검수보고서 승인 대기',
    inspection_seller_review: '바이어 검토',
    awaiting_balance: '잔금 대기',
    shipping_to_korea: '한국 운송',
  } as Record<string, string>)[s] ?? s;
}

function researchStatusLabel(s: string): string {
  return ({
    requested: '요청 접수',
    in_progress: '조사 중',
    md_completed: '운영자 승인 대기',
    admin_approved: '발송 완료',
    delivered: '바이어 수령',
  } as Record<string, string>)[s] ?? s;
}
