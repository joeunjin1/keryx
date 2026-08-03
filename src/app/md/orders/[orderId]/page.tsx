'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, AlertCircle, Calendar, FileText, Ship, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

export default function MdOrderDetailPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    production_start_date: '',
    production_end_date: '',
    inspection_scheduled_date: '',
    inspection_notes: '',
    production_memo_zh: '',
  });
  const [inspectionData, setInspectionData] = useState({
    total_qty: '',
    passed_qty: '',
    failed_qty: '',
    inspection_notes: '',
  });
  const [shipmentData, setShipmentData] = useState({
    shipping_method: 'sea_freight',
    tracking_no: '',
    tracking_url: '',
    shipping_cost_cny: '',
    notes_zh: '',
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);

  async function loadOrder() {
    const res = await fetch(`/api/orders/${params.orderId}`);
    if (!res.ok) { router.push('/md'); return; }
    const { order } = await res.json();
    setOrder(order);
    if (order.production_start_date) {
      setScheduleData({
        production_start_date: order.production_start_date?.slice(0, 10) ?? '',
        production_end_date: order.production_end_date?.slice(0, 10) ?? '',
        inspection_scheduled_date: order.inspection_scheduled_date?.slice(0, 10) ?? '',
        inspection_notes: order.inspection_notes ?? '',
        production_memo_zh: order.production_memo_zh ?? '',
      });
    }
    setLoading(false);
  }

  useEffect(() => { loadOrder(); }, [params.orderId]);

  async function handleSubmit() {
    if (!confirm('운영자에게 승인 요청하시겠습니까?')) return;
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/orders/${params.orderId}/submit`, { method: 'POST' });
    setSubmitting(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? '제출 실패'); return; }
    await loadOrder();
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    const { error: dbErr } = await supabase.from('orders').update({
      production_start_date: scheduleData.production_start_date || null,
      production_end_date: scheduleData.production_end_date || null,
      inspection_scheduled_date: scheduleData.inspection_scheduled_date || null,
      inspection_notes: scheduleData.inspection_notes || null,
      production_memo_zh: scheduleData.production_memo_zh || null,
    }).eq('id', params.orderId);
    setSavingSchedule(false);
    if (dbErr) { alert('저장 실패: ' + dbErr.message); return; }
    setShowScheduleForm(false);
    await loadOrder();
  }

  async function handleSaveInspection() {
    if (!inspectionData.total_qty || !inspectionData.passed_qty) {
      alert('총 수량과 합격 수량을 입력해주세요.'); return;
    }
    setSavingInspection(true);
    const res = await fetch(`/api/orders/${params.orderId}/complete-inspection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_qty: Number(inspectionData.total_qty),
        passed_qty: Number(inspectionData.passed_qty),
        failed_qty: Number(inspectionData.failed_qty) || 0,
        notes: inspectionData.inspection_notes,
      }),
    });
    setSavingInspection(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert('저장 실패: ' + (j.error ?? '알 수 없는 오류')); return; }
    setShowInspectionForm(false);
    await loadOrder();
    alert('검수 완료 처리되었습니다. 청구서가 자동 생성되었습니다.');
  }

  async function handleSaveShipment() {
    if (!shipmentData.shipping_method) { alert('운송 방법을 입력해주세요.'); return; }
    setSavingShipment(true);
    const res = await fetch(`/api/orders/${params.orderId}/create-shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipmentData),
    });
    setSavingShipment(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert('저장 실패: ' + (j.error ?? '알 수 없는 오류')); return; }
    setShowShipmentForm(false);
    await loadOrder();
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!order) return <div className="p-8 text-center text-stone-500"><LangText ko="주문을 찾을 수 없습니다." zh="找不到订单。" /></div>;

  const isDraft = order.status === 'draft';
  const isPending = order.status === 'pending_admin_approval';
  const isInProduction = order.status === 'in_production';
  const isInspecting = order.status === 'inspecting' || order.status === 'arrived_warehouse';
  const isAwaitingBalance = order.status === 'awaiting_balance';
  const isShipping = order.status === 'shipping_to_korea';

  return (
    <main className="min-h-dvh bg-stone-50">
      <header className="sticky top-0 z-10 bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/md/orders" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="text-base font-medium">{order.order_no}</div>
            <div className="text-[11px] text-stone-500">{order.seller?.business_name_zh ?? order.seller?.business_name}</div>
          </div>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* 주문 항목 */}
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
                      <Image src={it.product.images[0].url} alt="" width={200} height={200} style={{ objectFit: 'cover' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium">{it.product?.name_ko ?? it.product?.name_zh}</div>
                    <div className="text-[10px] text-stone-500">{it.product?.factory?.factory_code}</div>
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

        {/* 생산 일정 관리 */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowScheduleForm(!showScheduleForm)}>
              <div className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> 생산 일정 관리
              </div>
              {showScheduleForm ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
            {(order.production_start_date || order.production_end_date || order.inspection_scheduled_date) && !showScheduleForm && (
              <div className="mt-3 space-y-1.5 text-xs">
                {order.production_start_date && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">생산 시작</span>
                    <span>{new Date(order.production_start_date).toLocaleDateString('ko')}</span>
                  </div>
                )}
                {order.production_end_date && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">생산 완료 예정</span>
                    <span>{new Date(order.production_end_date).toLocaleDateString('ko')}</span>
                  </div>
                )}
                {order.inspection_scheduled_date && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">검수 예정일</span>
                    <span>{new Date(order.inspection_scheduled_date).toLocaleDateString('ko')}</span>
                  </div>
                )}
                {order.inspection_notes && (
                  <div className="mt-2 pt-2 border-t border-stone-100">
                    <div className="text-stone-500 text-[10px] mb-1">검수 계획</div>
                    <div className="text-stone-700 text-[11px]">{order.inspection_notes}</div>
                  </div>
                )}
              </div>
            )}
            {showScheduleForm && (
              <div className="mt-4 space-y-3">
                {([
                  ['production_start_date', '생산 시작일'],
                  ['production_end_date', '생산 완료 예정일'],
                  ['inspection_scheduled_date', '검수 예정일'],
                ] as [string, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[11px] text-stone-500 block mb-1">{label}</label>
                    <input
                      type="date"
                      value={(scheduleData as any)[key]}
                      onChange={e => setScheduleData(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] text-stone-500 block mb-1">검수 계획 (바이어에게 표시)</label>
                  <textarea
                    value={scheduleData.inspection_notes}
                    onChange={e => setScheduleData(p => ({ ...p, inspection_notes: e.target.value }))}
                    rows={3}
                    placeholder="검수 방법, 기준, 주의사항 등"
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-stone-500 block mb-1">생산 메모 (중국어, 바이어 표시)</label>
                  <textarea
                    value={scheduleData.production_memo_zh}
                    onChange={e => setScheduleData(p => ({ ...p, production_memo_zh: e.target.value }))}
                    rows={2}
                    placeholder="生产备注..."
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowScheduleForm(false)} className="flex-1 py-2 text-xs border border-stone-200 rounded-md bg-white">취소</button>
                  <button onClick={handleSaveSchedule} disabled={savingSchedule} className="flex-1 py-2 text-xs bg-brand-600 text-white rounded-md font-medium disabled:opacity-50">
                    {savingSchedule ? '저장 중…' : '일정 저장'}
                  </button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 검수 완료 처리 */}
        {(isInspecting || isInProduction) && (
          <Card className="border-amber-200 bg-amber-50">
            <CardBody>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowInspectionForm(!showInspectionForm)}>
                <div className="text-sm font-medium text-amber-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> 검수 완료 처리
                </div>
                {showInspectionForm ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[11px] text-amber-700 mt-1">검수 완료 시 합격 수량 기준 잔금 청구서가 자동 발행됩니다.</p>
              {showInspectionForm && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['total_qty', '총 검수 수량'],
                      ['passed_qty', '합격 수량'],
                      ['failed_qty', '불합격 수량'],
                    ] as [string, string][]).map(([key, label]) => (
                      <div key={key}>
                        <label className="text-[11px] text-stone-500 block mb-1">{label}</label>
                        <input
                          type="number"
                          value={(inspectionData as any)[key]}
                          onChange={e => setInspectionData(p => ({ ...p, [key]: e.target.value }))}
                          placeholder="0"
                          className="w-full border border-stone-200 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block mb-1">검수 결과 메모</label>
                    <textarea
                      value={inspectionData.inspection_notes}
                      onChange={e => setInspectionData(p => ({ ...p, inspection_notes: e.target.value }))}
                      rows={3}
                      placeholder="검수 결과, 특이사항 등"
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowInspectionForm(false)} className="flex-1 py-2 text-xs border border-stone-200 rounded-md bg-white">취소</button>
                    <button onClick={handleSaveInspection} disabled={savingInspection} className="flex-1 py-2 text-xs bg-amber-600 text-white rounded-md font-medium disabled:opacity-50">
                      {savingInspection ? '처리 중…' : '검수 완료 + 청구서 발행'}
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* 운송 등록 */}
        {(isAwaitingBalance || isShipping) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardBody>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowShipmentForm(!showShipmentForm)}>
                <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                  <Ship className="w-4 h-4" /> 운송 등록
                </div>
                {showShipmentForm ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-[11px] text-blue-700 mt-1">운송 정보 등록 시 바이어에게 실시간 표시됩니다.</p>
              {showShipmentForm && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[11px] text-stone-500 block mb-1">운송 방법</label>
                    <select
                      value={shipmentData.shipping_method}
                      onChange={e => setShipmentData(p => ({ ...p, shipping_method: e.target.value }))}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="sea_freight">해상 운송</option>
                      <option value="air_freight">항공 운송</option>
                      <option value="express">특급 배송</option>
                      <option value="land">육상 운송</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block mb-1">트래킹 번호</label>
                    <input
                      type="text"
                      value={shipmentData.tracking_no}
                      onChange={e => setShipmentData(p => ({ ...p, tracking_no: e.target.value }))}
                      placeholder="운송장 번호"
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block mb-1">트래킹 URL (선택)</label>
                    <input
                      type="url"
                      value={shipmentData.tracking_url}
                      onChange={e => setShipmentData(p => ({ ...p, tracking_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block mb-1">운송비 (CNY)</label>
                    <input
                      type="number"
                      value={shipmentData.shipping_cost_cny}
                      onChange={e => setShipmentData(p => ({ ...p, shipping_cost_cny: e.target.value }))}
                      placeholder="0"
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-500 block mb-1">운송 메모 (중국어)</label>
                    <textarea
                      value={shipmentData.notes_zh}
                      onChange={e => setShipmentData(p => ({ ...p, notes_zh: e.target.value }))}
                      rows={2}
                      placeholder="运输备注..."
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowShipmentForm(false)} className="flex-1 py-2 text-xs border border-stone-200 rounded-md bg-white">취소</button>
                    <button onClick={handleSaveShipment} disabled={savingShipment} className="flex-1 py-2 text-xs bg-blue-600 text-white rounded-md font-medium disabled:opacity-50">
                      {savingShipment ? '등록 중…' : '운송 등록'}
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* 결제 요약 */}
        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">결제 요약</div>
            <div className="space-y-1.5 text-xs">
              <Row label="제품 소계" value={`¥${Number(order.subtotal_cny ?? 0).toLocaleString()}`} />
              <Row label="검수비 예상" value={`¥${Number(order.inspection_cost_cny ?? 0).toLocaleString()}`} muted />
              {Number(order.vip_discount_cny) > 0 && (
                <Row label="VIP 할인" value={`-¥${Number(order.vip_discount_cny).toLocaleString()}`} positive />
              )}
              <div className="pt-2 border-t border-stone-200">
                <Row label="총액 (CNY)" value={`¥${Number(order.total_cny ?? 0).toLocaleString()}`} bold />
              </div>
              <Row label={`선금 ${order.deposit_pct}%`} value={`¥${Math.round((order.total_cny ?? 0) * (order.deposit_pct ?? 30) / 100).toLocaleString()}`} muted />
              <Row label={`잔금 ${order.balance_pct ?? 70}% (검수 후)`} value={`¥${Math.round((order.total_cny ?? 0) * (order.balance_pct ?? 70) / 100).toLocaleString()}`} muted />
            </div>
          </CardBody>
        </Card>

        {/* 결제 내역 */}
        {order.payments?.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">결제 내역</div>
              <div className="space-y-2">
                {order.payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between p-2.5 bg-stone-50 rounded-md">
                    <div>
                      <div className="text-xs font-medium">{p.payment_no} · {paymentKindLabel(p.kind)}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        {p.payment_currency} {Number(p.amount_charged).toLocaleString()}
                        {p.paid_at && ` · 결제 완료 ${new Date(p.paid_at).toLocaleDateString('ko')}`}
                      </div>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* 발행된 청구서 */}
        {order.invoices?.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> 발행된 청구서
              </div>
              <div className="space-y-2">
                {order.invoices.map((inv: any) => (
                  <div key={inv.id} className="p-2.5 bg-stone-50 rounded-md border border-stone-200">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-medium">{inv.invoice_no}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status === 'paid' ? '결제 완료' : inv.status === 'overdue' ? '기한 초과' : '결제 대기'}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                      {inv.type === 'inspection_balance' ? '검수 후 잔금' : inv.type === 'shipping' ? '운송비' : inv.type}
                      {' · '}합격 {inv.passed_qty}개 · ¥{Number(inv.total_cny).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* 액션 버튼 */}
        {isDraft && (
          <div className="sticky bottom-0 bg-stone-50 pt-3 pb-2 flex gap-2">
            <Link href={`/md/orders/new?sellerId=${order.seller_id}`} className="px-4 py-2.5 text-xs bg-white border border-stone-200 rounded-md">
              새로 만들기
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-xs bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-md font-medium transition"
            >
              {submitting ? '전송 중…' : '운영자 승인 요청'}
            </button>
          </div>
        )}
        {isPending && (
          <Card className="bg-vip-50 border-vip-200">
            <CardBody>
              <div className="text-sm text-vip-900">⏳ 운영자 승인 대기 중</div>
              <p className="text-[11px] text-vip-800 mt-1">강 사장님 승인 시 선금 청구서가 자동 발행됩니다.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, muted, bold, positive }: {
  label: string; value: string; muted?: boolean; bold?: boolean; positive?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? 'font-medium' : ''}`}>
      <span className={muted ? 'text-stone-500' : ''}>{label}</span>
      <span className={positive ? 'text-green-700' : ''}>{value}</span>
    </div>
  );
}

function paymentKindLabel(k: string): string {
  const m: Record<string, string> = {
    deposit: '선금 30%', balance: '잔금 70%', inspection_fee: '검수비',
    sample: '샘플비', membership: '멤버십', refund: '환불',
    adjustment: '조정', shipping: '운송비',
  };
  return m[k] ?? k;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const m: Record<string, { label: string; variant: string }> = {
    pending_admin_approval: { label: '승인 대기', variant: 'warning' },
    invoiced: { label: '청구됨', variant: 'brand' },
    paid: { label: '결제 완료', variant: 'success' },
    failed: { label: '실패', variant: 'danger' },
    refunded: { label: '환불됨', variant: 'default' },
    cancelled: { label: '취소', variant: 'default' },
  };
  const v = m[status] ?? { label: status, variant: 'default' };
  return <Badge variant={v.variant as any} size="xs">{v.label}</Badge>;
}
