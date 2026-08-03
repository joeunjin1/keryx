'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

export default function SellerInspectionReportPage({
  params,
}: {
  params: { inspectionId: string };
}) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [decision, setDecision] = useState<string>('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: insp } = await supabase
      .from('inspections')
      .select(`*, order:orders(order_no, total_cny, balance_pct)`)
      .eq('id', params.inspectionId)
      .single();

    // RLS will block if not admin-approved
    if (!insp || !insp.admin_approved_at) {
      router.push('/seller/orders');
      return;
    }

    setInspection(insp);
    setDecision(insp.seller_decision ?? '');
    setDecisionNotes(insp.seller_decision_notes ?? '');

    const { data: it } = await supabase
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', params.inspectionId)
      .order('display_order');
    setItems(it ?? []);

    const { data: ph } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', params.inspectionId);
    setPhotos(ph ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.inspectionId]);

  async function submitDecision() {
    if (!decision) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('seller_decide_inspection', {
      p_inspection_id: params.inspectionId,
      p_decision: decision as any,
      p_notes: decisionNotes || null,
    });
    setSubmitting(false);
    if (error) {
      alert(error.message);
      return;
    }
    alert('의견이 전달되었습니다. 잔금 결제 안내를 곧 받으십니다.');
    await load();
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!inspection) return <div className="p-8">보고서를 찾을 수 없습니다.</div>;

  const basicItems = items.filter((i) => !i.is_seller_request);
  const sellerItems = items.filter((i) => i.is_seller_request);
  const normalPhotos = photos.filter((p) => p.photo_kind === 'normal');
  const defectPhotos = photos.filter((p) => p.photo_kind === 'defect');
  const balanceCny = Math.round(
    inspection.order.total_cny * (inspection.order.balance_pct / 100) *
    (inspection.qty_received > 0 ? inspection.qty_passed / inspection.qty_received : 1)
  );

  const alreadyDecided = !!inspection.seller_decision;

  return (
    <main className="min-h-dvh bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/seller/orders" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="text-base font-medium">{inspection.inspection_no}</div>
            <div className="text-[11px] text-stone-500">{inspection.order?.order_no}</div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-4">

        <Card>
          <CardBody>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[11px] text-stone-500">종합 판정</div>
                <div className={cn(
                  'text-xl font-medium mt-1',
                  inspection.outcome === 'pass' ? 'text-green-700' :
                  inspection.outcome === 'partial_pass' ? 'text-vip-800' :
                  'text-red-700'
                )}>
                  {outcomeLabel(inspection.outcome)}
                </div>
                <div className="text-xs text-stone-600 mt-1">
                  합격 {inspection.qty_passed?.toLocaleString()}개 ·
                  불량 {inspection.qty_failed?.toLocaleString()}개 ·
                  합격률 {inspection.pass_rate}%
                </div>
              </div>
              <Badge variant="success" size="sm">운영자 승인 ✓</Badge>
            </div>
          </CardBody>
        </Card>


        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">기본 검수 항목 · 표준 가이드</div>
            <div className="space-y-1.5">
              {basicItems.map((it) => (
                <ItemRow key={it.id} item={it} />
              ))}
            </div>
          </CardBody>
        </Card>


        {sellerItems.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3 text-brand-800">바이어 요청 검수 항목</div>
              <div className="space-y-1.5">
                {sellerItems.map((it) => (
                  <ItemRow key={it.id} item={it} />
                ))}
              </div>
            </CardBody>
          </Card>
        )}


        {photos.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">증빙 사진 (정상 · 불량 분리)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-green-700 font-medium mb-1.5">
                    정상 ({normalPhotos.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    {normalPhotos.slice(0, 6).map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <Image src={p.url} alt="" width={200} height={200} className="object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-red-700 font-medium mb-1.5">
                    불량 ({defectPhotos.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    {defectPhotos.slice(0, 6).map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <Image src={p.url} alt="" width={200} height={200} className="object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}


        {(inspection.qty_failed ?? 0) > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">
                불량 {inspection.qty_failed}개 처리 결정
              </div>
              {alreadyDecided ? (
                <div className="text-xs text-stone-600">
                  결정 완료: <span className="font-medium">{decisionLabel(inspection.seller_decision)}</span>
                  {inspection.seller_decision_notes && (
                    <div className="mt-1 text-stone-500 italic">
                      {inspection.seller_decision_notes}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-xs">
                    {[
                      { v: 'return', label: '공장 반품 (회수비 공장 부담)' },
                      { v: 'rework', label: '재작업 요청 (재검수 후 결정)' },
                      { v: 'discount', label: '30% 할인 인수' },
                      { v: 'discard', label: '폐기 (공장 부담)' },
                    ].map((o) => (
                      <label key={o.v} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="decision"
                          checked={decision === o.v}
                          onChange={() => setDecision(o.v)}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="추가 의견 (선택)"
                    rows={2}
                    className="w-full text-xs border border-stone-200 rounded-md p-2 mt-3 resize-none"
                  />
                  <button
                    onClick={submitDecision}
                    disabled={!decision || submitting}
                    className="w-full mt-3 py-2.5 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-xs rounded-md font-medium"
                  >
                    {submitting ? '저장 중…' : '결정 보내기'}
                  </button>
                </>
              )}
            </CardBody>
          </Card>
        )}


        <Card className="bg-brand-50 border-brand-200">
          <CardBody>
            <div className="text-[11px] text-brand-700 mb-2">잔금 청구</div>
            <div className="space-y-1 text-xs">
              <Row label={`잔금 ${inspection.order?.balance_pct}%`} value={`¥${balanceCny.toLocaleString()}`} />
              <Row label="검수비" value={`¥${(inspection.inspection_fee_cny ?? 0).toLocaleString()}`} muted />
              <div className="pt-1.5 border-t border-brand-200">
                <Row
                  label="총 잔금"
                  value={`¥${(balanceCny + Number(inspection.inspection_fee_cny ?? 0)).toLocaleString()}`}
                  bold
                />
              </div>
            </div>
            <p className="text-[10px] text-brand-700 mt-2">
              잔금 결제 후 한국으로 출하됩니다.
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

function ItemRow({ item }: { item: any }) {
  const isPass = item.result === 'pass';
  const isPartial = item.result === 'partial';
  const isFail = item.result === 'fail';
  return (
    <div className={cn(
      'flex justify-between p-2 rounded text-xs',
      isPass ? 'bg-green-50' : isPartial ? 'bg-vip-50' : isFail ? 'bg-red-50' : 'bg-stone-50'
    )}>
      <span>{item.label_ko ?? item.label_zh}</span>
      <span className={cn(
        isPass ? 'text-green-700' : isPartial ? 'text-vip-800' : isFail ? 'text-red-700' : 'text-stone-500'
      )}>
        {isPass ? '합격' : isPartial ? `${item.pass_rate}%` : isFail ? '부적합' : '검사 안 됨'}
      </span>
    </div>
  );
}

function Row({ label, value, muted, bold }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-medium' : ''}`}>
      <span className={muted ? 'text-stone-500' : ''}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function outcomeLabel(o: string): string {
  return ({ pass: '합격', partial_pass: '조건부 합격', fail: '부적합' } as Record<string, string>)[o] ?? '검토 필요';
}

function decisionLabel(d: string): string {
  return ({
    return: '공장 반품',
    rework: '재작업',
    discount: '할인 인수',
    discard: '폐기',
  } as Record<string, string>)[d] ?? d;
}
