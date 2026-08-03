'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

export default function AdminInspectionDetailPage({
  params,
}: {
  params: { inspectionId: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  async function load() {
    const { data: insp } = await supabase
      .from('inspections')
      .select(
        `*,
         inspector:internal_users!inspections_inspector_id_fkey(name_ko, staff_code),
         order:orders(order_no, total_cny, seller:sellers(business_name, current_grade))`
      )
      .eq('id', params.inspectionId)
      .single();
    setInspection(insp);

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

  async function handleApprove() {
    if (!confirm('검수 보고서를 승인하시겠습니까?\n\n바이어에게 발송되고 잔금 청구서가 자동 생성됩니다.')) return;
    setApproving(true);
    const res = await fetch(`/api/inspections/${params.inspectionId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setApproving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? '승인 실패');
      return;
    }
    alert('승인 완료. 잔금 청구서가 발행되었습니다.');
    router.push('/admin/inspections');
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!inspection) return <div className="p-8">보고서를 찾을 수 없습니다.</div>;

  const basicItems = items.filter((i) => !i.is_seller_request);
  const sellerItems = items.filter((i) => i.is_seller_request);
  const normalPhotos = photos.filter((p) => p.photo_kind === 'normal');
  const defectPhotos = photos.filter((p) => p.photo_kind === 'defect');

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-4xl mx-auto px-5 py-6 grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <div className="md:col-span-2 space-y-4">

          <Card>
            <CardBody>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] text-stone-500">종합 판정</div>
                  <div className={`text-lg font-medium mt-1 ${
                    inspection.outcome === 'pass' ? 'text-green-700' :
                    inspection.outcome === 'partial_pass' ? 'text-vip-800' :
                    'text-red-700'
                  }`}>
                    {outcomeLabel(inspection.outcome)}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    합격 {inspection.qty_passed} · 불량 {inspection.qty_failed} ·
                    합격률 {inspection.pass_rate}%
                  </div>
                </div>
                <div className="text-right text-[11px] text-stone-500">
                  검수원 {inspection.inspector?.name_ko}
                </div>
              </div>
              {inspection.inspector_comment && (
                <div className="mt-3 p-2.5 bg-stone-50 rounded text-xs text-stone-700 italic">
                  검수원 의견: {inspection.inspector_comment}
                </div>
              )}
            </CardBody>
          </Card>


          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">기본 검수 항목</div>
              <div className="space-y-1.5">
                {basicItems.length === 0 && (
                  <div className="text-xs text-stone-400 text-center py-3">기본 검수 항목 없음</div>
                )}
                {basicItems.map((it) => (
                  <ItemRow key={it.id} item={it} />
                ))}
              </div>
            </CardBody>
          </Card>

          {sellerItems.length > 0 && (
            <Card>
              <CardBody>
                <div className="text-sm font-medium mb-3 text-brand-800">바이어 요청 검수</div>
                <div className="space-y-1.5">
                  {sellerItems.map((it) => (
                    <ItemRow key={it.id} item={it} />
                  ))}
                </div>
              </CardBody>
            </Card>
          )}


          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">증빙 사진 (정상 · 불량 분리)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-green-700 font-medium mb-1.5">정상 ({normalPhotos.length})</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    {normalPhotos.slice(0, 9).map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <Image src={p.url} alt="" width={200} height={200} style={{objectFit:"cover"}} />
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-red-700 font-medium mb-1.5">불량 ({defectPhotos.length})</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    {defectPhotos.slice(0, 9).map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <Image src={p.url} alt="" width={200} height={200} style={{objectFit:"cover"}} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-stone-500 mt-2">
                전체 사진 {photos.length}장 (정상 {normalPhotos.length} + 불량 {defectPhotos.length})
              </div>
            </CardBody>
          </Card>
        </div>


        <div className="space-y-3">
          <Card className="bg-stone-50 border-0">
            <CardBody>
              <div className="text-[11px] text-stone-500 mb-2"><LangText ko="검수 비용" zh="检验费用" /></div>
              <div className="space-y-1 text-xs">
                <Row label="기본 검수" value={`${inspection.basic_minutes ?? 0}분`} />
                <Row label="바이어 요청" value={`${inspection.seller_request_minutes ?? 0}분`} />
                <div className="pt-1 border-t border-stone-200">
                  <Row label="합계 시간" value={`${inspection.total_minutes ?? 0}분`} />
                  <Row
                    label="검수비"
                    value={`¥${inspection.inspection_fee_cny ?? 0} (시간당 ¥30)`}
                    bold
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {inspection.admin_approved_at ? (
            <Card className="bg-green-50 border-green-200">
              <CardBody>
                <div className="text-xs text-green-800 font-medium">✓ 승인 완료</div>
                <p className="text-[11px] text-green-700 mt-1">
                  잔금 청구서 발행됨 · 바이어에게 발송됨
                </p>
              </CardBody>
            </Card>
          ) : (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full py-3 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {approving ? '처리 중…' : '보고서 승인 + 잔금 발행'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function ItemRow({ item }: { item: any }) {
  const bg = item.result === 'pass' ? 'bg-green-50' :
    item.result === 'partial' ? 'bg-vip-50' :
    item.result === 'fail' ? 'bg-red-50' :
    'bg-stone-50';

  const txt = item.result === 'pass' ? 'text-green-700' :
    item.result === 'partial' ? 'text-vip-800' :
    item.result === 'fail' ? 'text-red-700' :
    'text-stone-500';

  return (
    <div className={`flex justify-between p-2 rounded ${bg}`}>
      <div className="text-xs">{item.label_ko ?? item.label_zh}</div>
      <div className={`text-xs ${txt}`}>
        {item.result === 'pass' ? '합격' :
         item.result === 'partial' ? `조건부 (${item.pass_rate}%)` :
         item.result === 'fail' ? '부적합' : '검사 안 됨'}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-medium' : ''}`}>
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function outcomeLabel(o: string | null): string {
  return ({
    pass: '합격',
    partial_pass: '조건부 합격',
    fail: '부적합',
  } as Record<string, string>)[o ?? ''] ?? '대기';
}
