'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Send } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface CandidateFactory {
  anon_label: string;
  city: string;
  unit_price_cny: number;
  moq: number;
  lead_time_days: number;
  sample_cost_cny: number;
  rating: number;
  notes: string;
  factory_id: string;
}

const EMPTY_CANDIDATE: CandidateFactory = {
  anon_label: '',
  city: '',
  unit_price_cny: 0,
  moq: 1000,
  lead_time_days: 25,
  sample_cost_cny: 30,
  rating: 4.5,
  notes: '',
  factory_id: '',
};

export default function MdResearchEditPage({
  params,
}: {
  params: { requestId: string };
}) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [request, setRequest] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For each item, MD's draft report
  const [reports, setReports] = useState<Record<string, {
    candidate_factories: CandidateFactory[];
    md_recommendation: string;
    market_price_reference: Record<string, number>;
    saved: boolean;
  }>>({});

  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data: req } = await supabase
      .from('market_research_requests')
      .select(
        `*,
         seller:sellers(business_name, current_grade),
         items:market_research_items(*)`
      )
      .eq('id', params.requestId)
      .single();

    if (!req) {
      router.push('/md');
      return;
    }
    setRequest(req);
    setItems(req.items ?? []);

    // Existing reports
    const { data: existing } = await supabase
      .from('market_research_reports')
      .select('*')
      .eq('request_id', params.requestId);

    const map: any = {};
    for (const it of req.items ?? []) {
      const found = existing?.find((r: any) => r.item_id === it.id);
      map[it.id] = found
        ? {
            candidate_factories: (found.candidate_factories as any) || [],
            md_recommendation: found.md_recommendation || '',
            market_price_reference: (found.market_price_reference as any) || {},
            saved: true,
          }
        : {
            candidate_factories: [{ ...EMPTY_CANDIDATE, anon_label: '공장 A' }],
            md_recommendation: '',
            market_price_reference: {},
            saved: false,
          };
    }
    setReports(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.requestId]);

  async function saveReport(itemId: string) {
    const r = reports[itemId];
    if (!r) return;

    setSubmitting(true);
    const res = await fetch(`/api/research/${params.requestId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        candidate_factories: r.candidate_factories,
        md_recommendation: r.md_recommendation,
        market_price_reference: r.market_price_reference,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? '저장 실패');
      return;
    }
    setReports((cur) => ({ ...cur, [itemId]: { ...cur[itemId], saved: true } }));
  }

  async function submitAll() {
    if (!confirm('모든 항목을 저장하고 운영자 승인 요청하시겠습니까?')) return;

    // Save unsaved
    for (const itemId of Object.keys(reports)) {
      if (!reports[itemId].saved) {
        await saveReport(itemId);
      }
    }

    // Mark MD complete
    setSubmitting(true);
    const res = await fetch(`/api/research/${params.requestId}/report`, { method: 'PATCH' });
    setSubmitting(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? '제출 실패');
      return;
    }

    alert('운영자 승인 요청 완료. 승인되면 바이어에게 자동 발송됩니다.');
    router.push('/md');
  }

  function patchReport(itemId: string, patch: any) {
    setReports((cur) => ({
      ...cur,
      [itemId]: { ...cur[itemId], ...patch, saved: false },
    }));
  }

  function patchCandidate(itemId: string, idx: number, patch: Partial<CandidateFactory>) {
    setReports((cur) => {
      const r = cur[itemId];
      const updated = r.candidate_factories.map((c, i) => (i === idx ? { ...c, ...patch } : c));
      return { ...cur, [itemId]: { ...r, candidate_factories: updated, saved: false } };
    });
  }

  function addCandidate(itemId: string) {
    setReports((cur) => {
      const r = cur[itemId];
      if (r.candidate_factories.length >= 5) return cur;
      const next = String.fromCharCode(65 + r.candidate_factories.length);
      return {
        ...cur,
        [itemId]: {
          ...r,
          candidate_factories: [...r.candidate_factories, { ...EMPTY_CANDIDATE, anon_label: `공장 ${next}` }],
          saved: false,
        },
      };
    });
  }

  function removeCandidate(itemId: string, idx: number) {
    setReports((cur) => {
      const r = cur[itemId];
      if (r.candidate_factories.length <= 1) return cur;
      return {
        ...cur,
        [itemId]: {
          ...r,
          candidate_factories: r.candidate_factories.filter((_, i) => i !== idx),
          saved: false,
        },
      };
    });
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!request) return null;

  const isLocked = ['md_completed', 'admin_approved', 'delivered'].includes(request.status);

  return (
    <main className="min-h-screen bg-stone-50">

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        {items.map((item) => {
          const rep = reports[item.id];
          if (!rep) return null;

          return (
            <Card key={item.id}>
              <CardBody>
                {/* Original request */}
                <div className="bg-stone-50 rounded p-3 mb-4">
                  <div className="text-[11px] text-stone-500 mb-1">바이어 요청 — 상품 {item.position}</div>
                  {item.reference_image_urls?.length > 0 && (
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      {item.reference_image_urls.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="aspect-square w-full rounded object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="text-xs">{item.description}</div>
                  <div className="text-[11px] text-stone-500 flex gap-3 mt-1">
                    {item.desired_unit_price_hint && <span>희망 {item.desired_unit_price_hint}</span>}
                    {item.desired_qty_hint && <span>수량 {item.desired_qty_hint}</span>}
                    {item.desired_timing && <span>{item.desired_timing}</span>}
                    {item.wants_sample && <Badge variant="brand" size="xs">샘플 희망</Badge>}
                  </div>
                </div>

                {/* Candidate factories */}
                <div className="text-sm font-medium mb-2">제조 가능 공장 (최대 5곳)</div>
                <div className="space-y-2 mb-4">
                  {rep.candidate_factories.map((c, idx) => (
                    <div key={idx} className="bg-stone-50 rounded p-3 relative">
                      {rep.candidate_factories.length > 1 && !isLocked && (
                        <button
                          onClick={() => removeCandidate(item.id, idx)}
                          className="absolute top-2 right-2 text-stone-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Field
                          label="공장 라벨 (바이어에게 보임)"
                          value={c.anon_label}
                          onChange={(v) => patchCandidate(item.id, idx, { anon_label: v })}
                          disabled={isLocked}
                        />
                        <Field
                          label="도시"
                          value={c.city}
                          onChange={(v) => patchCandidate(item.id, idx, { city: v })}
                          disabled={isLocked}
                          placeholder="광저우"
                        />
                        <Field
                          label="단가 (¥)"
                          type="number"
                          value={c.unit_price_cny}
                          onChange={(v) => patchCandidate(item.id, idx, { unit_price_cny: parseFloat(v) || 0 })}
                          disabled={isLocked}
                        />
                        <Field
                          label="MOQ"
                          type="number"
                          value={c.moq}
                          onChange={(v) => patchCandidate(item.id, idx, { moq: parseInt(v) || 0 })}
                          disabled={isLocked}
                        />
                        <Field
                          label="리드타임 (일)"
                          type="number"
                          value={c.lead_time_days}
                          onChange={(v) => patchCandidate(item.id, idx, { lead_time_days: parseInt(v) || 0 })}
                          disabled={isLocked}
                        />
                        <Field
                          label="샘플비 (¥)"
                          type="number"
                          value={c.sample_cost_cny}
                          onChange={(v) => patchCandidate(item.id, idx, { sample_cost_cny: parseFloat(v) || 0 })}
                          disabled={isLocked}
                        />
                        <Field
                          label="평점"
                          type="number"
                          value={c.rating}
                          onChange={(v) => patchCandidate(item.id, idx, { rating: parseFloat(v) || 0 })}
                          disabled={isLocked}
                        />
                        <Field
                          label="공장 ID (바이어(고객)에 안 보임)"
                          value={c.factory_id}
                          onChange={(v) => patchCandidate(item.id, idx, { factory_id: v })}
                          disabled={isLocked}
                          placeholder="F012"
                        />
                      </div>
                      <div className="mt-2">
                        <label className="block text-[11px] text-stone-600 mb-1">메모 (바이어(고객)에 보임)</label>
                        <input
                          type="text"
                          value={c.notes}
                          onChange={(e) => patchCandidate(item.id, idx, { notes: e.target.value })}
                          disabled={isLocked}
                          placeholder="예: 색상 매칭 강함, 소량 가능"
                          className="w-full h-7 px-2 text-xs border border-stone-200 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {!isLocked && rep.candidate_factories.length < 5 && (
                  <button
                    onClick={() => addCandidate(item.id)}
                    className="w-full py-1.5 text-xs border border-dashed border-stone-300 hover:border-brand-400 rounded text-stone-500 hover:text-brand-600 mb-4"
                  >
                    <Plus className="w-3 h-3 inline mr-1" /> 공장 추가
                  </button>
                )}

                {/* MD recommendation */}
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1">MD 추천 의견 (바이어(고객)에 보임)</label>
                  <textarea
                    value={rep.md_recommendation}
                    onChange={(e) => patchReport(item.id, { md_recommendation: e.target.value })}
                    disabled={isLocked}
                    rows={4}
                    placeholder="예: 박지영님의 일반 발주 사이즈(2,000개)와 빠른 시기를 고려할 때 공장 A를 추천드립니다. 단가는 중간이지만 평판 좋고 리드타임 22일로 9월 출시 충분..."
                    className="w-full text-xs border border-stone-200 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>

                {/* Market price reference */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Field
                    label="알리바바 최저가 (¥)"
                    type="number"
                    value={rep.market_price_reference.alibaba_min ?? ''}
                    onChange={(v) =>
                      patchReport(item.id, {
                        market_price_reference: { ...rep.market_price_reference, alibaba_min: parseFloat(v) || undefined },
                      })
                    }
                    disabled={isLocked}
                  />
                  <Field
                    label="알리바바 최고가 (¥)"
                    type="number"
                    value={rep.market_price_reference.alibaba_max ?? ''}
                    onChange={(v) =>
                      patchReport(item.id, {
                        market_price_reference: { ...rep.market_price_reference, alibaba_max: parseFloat(v) || undefined },
                      })
                    }
                    disabled={isLocked}
                  />
                  <Field
                    label="1688 최저가 (¥)"
                    type="number"
                    value={rep.market_price_reference.market_1688_min ?? ''}
                    onChange={(v) =>
                      patchReport(item.id, {
                        market_price_reference: { ...rep.market_price_reference, market_1688_min: parseFloat(v) || undefined },
                      })
                    }
                    disabled={isLocked}
                  />
                </div>

                {!isLocked && (
                  <button
                    onClick={() => saveReport(item.id)}
                    disabled={submitting}
                    className={cn(
                      'mt-3 px-3 py-1.5 text-xs rounded-md transition',
                      rep.saved ? 'bg-green-50 text-green-800' : 'bg-brand-600 hover:bg-brand-800 text-white'
                    )}
                  >
                    {rep.saved ? '저장됨 ✓' : '이 항목 저장'}
                  </button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-stone-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full h-7 px-2 text-xs border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-600/30 disabled:bg-stone-100"
      />
    </div>
  );
}
