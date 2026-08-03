import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Package, Truck, CheckCircle, Calendar, FileText, Ship, AlertCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OrderStatusBadge, getOrderStatusLabel } from '@/components/order/OrderStatusBadge';
import LangText from '@/components/layout/LangText';

export default async function SellerOrderDetail({
  params,
}: {
  params: { orderId: string };
}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=seller');

  const { data: order } = await supabase
    .from('orders')
    .select(
      `*,
       md:internal_users(name_ko, name_zh, staff_code),
       items:order_items(
         id, qty, unit_price_cny, subtotal_cny,
         product:products(name_ko, name_zh, images:product_images(url))
       ),
       payments(id, payment_no, kind, status, amount_cny, amount_charged, payment_currency, paid_at, admin_approved_at),
       invoices(id, invoice_no, type, total_qty, passed_qty, unit_price_cny, subtotal_cny, shipping_cost_cny, total_cny, status, due_date, paid_at, notes_zh),
       shipments(id, shipment_no, shipping_method, tracking_no, tracking_url, status, shipped_at, arrived_at, delivered_at, shipping_cost_cny, notes_zh)`
    )
    .eq('id', params.orderId)
    .single();

  if (!order) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-stone-50">
        <div className="text-center text-stone-500">주문을 찾을 수 없습니다.</div>
      </main>
    );
  }

  const progressSteps = getProgressSteps(order.status);

  return (
    <main className="min-h-dvh bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/seller/orders" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="text-base font-medium">{order.order_no}</div>
            <div className="text-[11px] text-stone-500">담당 {(order.md as any)?.name_ko}</div>
          </div>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-4">

        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">진행 상황</div>
            <div className="space-y-2.5">
              {progressSteps.map((step, idx) => (
                <div key={step.key} className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    step.status === 'done' ? 'bg-green-600 text-white' :
                    step.status === 'current' ? 'bg-brand-600 text-white' :
                    'bg-stone-200 text-stone-400'
                  }`}>
                    {step.status === 'done' ? <CheckCircle className="w-3 h-3" /> : <span className="text-[10px]">{idx + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs ${step.status === 'pending' ? 'text-stone-400' : 'text-stone-900'}`}>
                      {step.label}
                    </div>
                    {step.status === 'current' && (
                      <div className="text-[10px] text-brand-600 mt-0.5">진행 중</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {order.status === 'in_production' && order.production_progress_pct != null && (
              <div className="mt-4 pt-3 border-t border-stone-200">
                <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                  <span>생산 진행률</span>
                  <span>{order.production_progress_pct}%</span>
                </div>
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all"
                    style={{ width: `${order.production_progress_pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  현재 환불 가능 비율: {order.refund_eligibility_pct}%
                </div>
              </div>
            )}
          </CardBody>
        </Card>


        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> 주문 항목
            </div>
            <div className="space-y-2">
              {order.items?.map((it: any) => (
                <div key={it.id} className="flex gap-3 p-2.5 bg-stone-50 rounded-md">
                  <div className="w-12 h-12 bg-stone-200 rounded shrink-0 overflow-hidden">
                    {it.product?.images?.[0]?.url && (
                      <Image src={it.product.images[0].url} alt="" width={200} height={200} style={{objectFit:"cover"}} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium">{it.product?.name_ko ?? it.product?.name_zh}</div>
                    <div className="text-[11px] text-stone-700 mt-1">
                      {it.qty.toLocaleString()}개 × ¥{it.unit_price_cny}
                      <span className="float-right font-medium">¥{Number(it.subtotal_cny).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>


        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">결제 정보</div>
            <div className="space-y-1.5 text-xs">
              <Row label="총액 (CNY 기준)" value={`¥${Number(order.total_cny).toLocaleString()}`} bold />
              <Row label="결제 통화" value={paymentRouteLabel(order.payment_route)} muted />
            </div>

            {/* 관리자가 전송한 결제 정보 */}
            {order.payment_info && (
              <div className="mt-4 pt-3 border-t border-stone-200">
                <div className="text-xs font-semibold text-stone-700 mb-2 flex items-center gap-1">
                  💳 결제 정보 (관리자 발송)
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                  {order.payment_info}
                </div>
                {order.payment_info_sent_at && (
                  <div className="text-[10px] text-stone-400 mt-1">
                    발송: {new Date(order.payment_info_sent_at).toLocaleString('ko-KR')}
                  </div>
                )}
              </div>
            )}
            {order.payments?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-200 space-y-2">
                {order.payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs">
                    <div>
                      <span>{paymentKindLabel(p.kind)}</span>
                      <span className="text-stone-500 ml-2">{p.payment_no}</span>
                    </div>
                    <div className="text-right">
                      <div>
                        {p.payment_currency} {Number(p.amount_charged).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-500">{paymentStatusLabel(p.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* 생산 일정 카드 */}
        {(order.production_start_date || order.production_end_date || order.inspection_scheduled_date) && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <LangText ko="생산 일정" zh="生产计划" />
              </div>
              <div className="space-y-2 text-xs">
                {order.production_start_date && (
                  <div className="flex justify-between">
                    <span className="text-stone-500"><LangText ko="생산 시작" zh="生产开始" /></span>
                    <span>{new Date(order.production_start_date).toLocaleDateString('ko')}</span>
                  </div>
                )}
                {order.production_end_date && (
                  <div className="flex justify-between">
                    <span className="text-stone-500"><LangText ko="생산 완료 예정" zh="预计完成" /></span>
                    <span>{new Date(order.production_end_date).toLocaleDateString('ko')}</span>
                  </div>
                )}
                {order.inspection_scheduled_date && (
                  <div className="flex justify-between">
                    <span className="text-stone-500"><LangText ko="검수 예정일" zh="预计检验日" /></span>
                    <span>{new Date(order.inspection_scheduled_date).toLocaleDateString('ko')}</span>
                  </div>
                )}
                {order.inspection_notes && (
                  <div className="mt-2 pt-2 border-t border-stone-100">
                    <div className="text-stone-500 mb-1"><LangText ko="검수 계획" zh="检验计划" /></div>
                    <div className="text-stone-700 leading-relaxed">{order.inspection_notes}</div>
                  </div>
                )}
                {order.production_memo_zh && (
                  <div className="mt-2 pt-2 border-t border-stone-100">
                    <div className="text-stone-500 mb-1"><LangText ko="생산 메모" zh="生产备注" /></div>
                    <div className="text-stone-700 leading-relaxed">{order.production_memo_zh}</div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* 청구서 카드 */}
        {order.invoices?.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <LangText ko="청구서" zh="发票" />
              </div>
              <div className="space-y-3">
                {order.invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 bg-stone-50 rounded-md border border-stone-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs font-medium">{inv.invoice_no}</div>
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          {inv.type === 'inspection_balance' ? <LangText ko="검수 후 잔금 청구서" zh="检验后尾款发票" /> :
                           inv.type === 'shipping' ? <LangText ko="운송비 청구서" zh="运费发票" /> :
                           inv.type === 'deposit' ? <LangText ko="선금 청구서" zh="定金发票" /> :
                           inv.type}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status === 'paid' ? <LangText ko="결제 완료" zh="已付款" /> :
                         inv.status === 'overdue' ? <LangText ko="기한 초과" zh="逾期" /> :
                         <LangText ko="결제 대기" zh="待付款" />}
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      {inv.passed_qty && (
                        <div className="flex justify-between">
                          <span className="text-stone-500"><LangText ko="합격 수량" zh="合格数量" /></span>
                          <span>{inv.passed_qty.toLocaleString()}<LangText ko="개" zh="件" /></span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-1 border-t border-stone-200">
                        <span><LangText ko="청구 금액" zh="应付金额" /></span>
                        <span>¥{Number(inv.total_cny).toLocaleString()}</span>
                      </div>
                      {inv.due_date && (
                        <div className="flex justify-between text-stone-500">
                          <span><LangText ko="납기일" zh="付款截止日" /></span>
                          <span>{new Date(inv.due_date).toLocaleDateString('ko')}</span>
                        </div>
                      )}
                      {inv.notes_zh && (
                        <div className="mt-1 text-stone-500 text-[10px]">{inv.notes_zh}</div>
                      )}
                    </div>
                    {inv.status !== 'paid' && (
                      <div className="mt-3 p-2 bg-amber-50 rounded text-[10px] text-amber-800 flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <LangText ko="결제 완료 후 MD에게 알려주세요. 입금 확인 후 다음 단계가 진행됩니다." zh="付款后请通知MD。确认收款后将进入下一阶段。" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* 운송 카드 */}
        {order.shipments?.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <Ship className="w-4 h-4" />
                <LangText ko="운송 현황" zh="运输状态" />
              </div>
              {order.shipments.map((sh: any) => (
                <div key={sh.id} className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500"><LangText ko="운송번호" zh="运单号" /></span>
                    <span className="font-medium">{sh.shipment_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500"><LangText ko="운송 방법" zh="运输方式" /></span>
                    <span>{sh.shipping_method}</span>
                  </div>
                  {sh.tracking_no && (
                    <div className="flex justify-between">
                      <span className="text-stone-500"><LangText ko="트래킹 번호" zh="追踪号" /></span>
                      {sh.tracking_url ? (
                        <a href={sh.tracking_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">{sh.tracking_no}</a>
                      ) : (
                        <span>{sh.tracking_no}</span>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500"><LangText ko="상태" zh="状态" /></span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      sh.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      sh.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {sh.status === 'delivered' ? <LangText ko="배송 완료" zh="已送达" /> :
                       sh.status === 'in_transit' ? <LangText ko="운송 중" zh="运输中" /> :
                       sh.status === 'customs_cleared' ? <LangText ko="통관 완료" zh="清关完成" /> :
                       sh.status === 'arrived' ? <LangText ko="도착" zh="已到达" /> :
                       sh.status}
                    </span>
                  </div>
                  {sh.shipped_at && (
                    <div className="flex justify-between">
                      <span className="text-stone-500"><LangText ko="출발일" zh="发货日期" /></span>
                      <span>{new Date(sh.shipped_at).toLocaleDateString('ko')}</span>
                    </div>
                  )}
                  {sh.shipping_cost_cny && (
                    <div className="flex justify-between font-medium pt-1 border-t border-stone-200">
                      <span><LangText ko="운송비" zh="运费" /></span>
                      <span>¥{Number(sh.shipping_cost_cny).toLocaleString()}</span>
                    </div>
                  )}
                  {sh.notes_zh && (
                    <div className="mt-1 text-stone-500 text-[10px]">{sh.notes_zh}</div>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        <Link
          href="/seller/messages"
          className="block text-center py-2.5 text-xs bg-white border border-stone-200 rounded-md hover:bg-stone-50 transition"
        >
          MD에게 문의 →
        </Link>
      </div>
    </main>
  );
}

function getProgressSteps(currentStatus: string) {
  const sequence = [
    { key: 'draft', label: '주문서 작성' },
    { key: 'pending_admin_approval', label: '운영자 승인' },
    { key: 'awaiting_deposit', label: '선금 결제' },
    { key: 'in_production', label: '공장 생산' },
    { key: 'arrived_warehouse', label: '이우 창고 입고' },
    { key: 'inspecting', label: '검수' },
    { key: 'awaiting_balance', label: '잔금 결제' },
    { key: 'shipping_to_korea', label: '한국 운송' },
    { key: 'delivered', label: '인도 완료' },
  ];

  const currentIdx = sequence.findIndex((s) => s.key === currentStatus);
  return sequence.map((s, idx) => ({
    ...s,
    status: idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'pending',
  }));
}

function Row({ label, value, muted, bold }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-medium' : ''}`}>
      <span className={muted ? 'text-stone-500' : ''}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function paymentRouteLabel(r: string): string {
  return ({
    gaza_krw: '가자트레이드 KRW',
    direct_usd: 'USD 직접',
    direct_cny: 'CNY 직접',
  } as Record<string, string>)[r] ?? r;
}

function paymentKindLabel(k: string): string {
  return ({
    deposit: '선금 30%',
    balance: '잔금 70%',
    inspection_fee: '검수비',
  } as Record<string, string>)[k] ?? k;
}

function paymentStatusLabel(s: string): string {
  return ({
    pending_admin_approval: '운영자 승인 대기',
    invoiced: '청구됨 · 송금 대기',
    paid: '결제 완료',
    failed: '실패',
    refunded: '환불',
  } as Record<string, string>)[s] ?? s;
}
