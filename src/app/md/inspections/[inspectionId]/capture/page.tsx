'use client';

import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, X, ChevronRight, ChevronLeft } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

interface InspectionItem {
  id: string;
  is_seller_request: boolean;
  label_zh: string;
  label_ko: string | null;
  result: string | null;
  qty_passed: number | null;
  qty_failed: number | null;
  notes: string | null;
  photos: Array<{ id: string; url: string; photo_kind: string }>;
}

export default function InspectorCapturePage({
  params,
}: {
  params: { inspectionId: string };
}) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [outcome, setOutcome] = useState<'pass' | 'partial_pass' | 'fail'>('pass');
  const [inspectorComment, setInspectorComment] = useState('');
  const [totalMinutes, setTotalMinutes] = useState(60);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<'normal' | 'defect'>('normal');

  async function load() {
    const { data: insp } = await supabase
      .from('inspections')
      .select('*, order:orders(order_no, items:order_items(qty))')
      .eq('id', params.inspectionId)
      .single() as { data: any; error: any };
    setInspection(insp);

    const { data: it } = await supabase
      .from('inspection_items')
      .select('*, photos:inspection_photos(id, url, photo_kind)')
      .eq('inspection_id', params.inspectionId)
      .order('display_order') as { data: any[]; error: any };
    setItems((it ?? []) as any);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.inspectionId]);

  const current = items[currentIdx];

  async function updateCurrent(patch: Partial<InspectionItem>) {
    if (!current) return;
    const updated = { ...current, ...patch };

    // Optimistic UI
    setItems((cur) => cur.map((it, i) => (i === currentIdx ? updated : it)));

    setSaving(true);
    await fetch(`/api/inspection-items/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setSaving(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!current) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setSaving(true);
    for (const file of files) {
      const path = `${params.inspectionId}/${current.id}/${Date.now()}-${file.name}`;
      const { data: uploaded, error } = await supabase.storage
        .from('inspection-photos')
        .upload(path, file);

      if (error || !uploaded) {
        console.error('upload failed', error);
        continue;
      }

      const { data: signed } = await supabase.storage
        .from('inspection-photos')
        .createSignedUrl(uploaded.path, 60 * 60 * 24 * 365);

      if (!signed) continue;

      const res = await fetch('/api/inspection-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: params.inspectionId,
          inspection_item_id: current.id,
          url: signed.signedUrl,
          photo_kind: uploadKind,
        }),
      });

      if (res.ok) {
        const { photo } = await res.json();
        setItems((cur) =>
          cur.map((it, i) =>
            i === currentIdx ? { ...it, photos: [...it.photos, photo] } : it
          )
        );
      }
    }
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function pickPhoto(kind: 'normal' | 'defect') {
    setUploadKind(kind);
    fileInputRef.current?.click();
  }

  async function finalize() {
    setSaving(true);
    const res = await fetch(`/api/inspections/${params.inspectionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        inspector_comment: inspectorComment || null,
        total_minutes: totalMinutes,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      alert('완료 실패');
      return;
    }

    alert('검수 완료. 운영자 승인 대기로 이동합니다.');
    router.push('/admin/inspections');
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!inspection || items.length === 0) {
    return <div className="p-8 text-center text-stone-500">검수 항목이 없습니다.</div>;
  }

  if (showFinalize) {
    return (
      <main className="min-h-dvh bg-stone-100 flex justify-center py-4">
        <div className="w-full max-w-sm bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200">
            <button onClick={() => setShowFinalize(false)} className="text-xs text-stone-500 mb-2">
              ← 항목으로 돌아가기
            </button>
            <div className="text-base font-medium"><LangText ko="검수 완료" zh="检验完成" /></div>
          </div>
          <div className="p-4 space-y-3">
            <AiInspectionAnalysis
              inspectionId={params.inspectionId}
              onSuggestion={(o) => setOutcome(o)}
            />
            <div>
              <label className="block text-xs text-stone-600 mb-1.5">종합 판정</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {(['pass', 'partial_pass', 'fail'] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setOutcome(o)}
                    className={cn(
                      'py-2 text-xs rounded',
                      outcome === o
                        ? o === 'pass' ? 'bg-green-600 text-white' :
                          o === 'partial_pass' ? 'bg-vip-600 text-white' :
                          'bg-red-600 text-white'
                        : 'bg-stone-100 text-stone-700'
                    )}
                  >
                    {o === 'pass' ? '합격' : o === 'partial_pass' ? '조건부' : '부적합'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-600 mb-1.5">총 검수 시간 (분)</label>
              <input
                type="number"
                value={totalMinutes}
                onChange={(e) => setTotalMinutes(parseInt(e.target.value) || 0)}
                className="w-full h-9 px-3 text-sm border border-stone-200 rounded-md"
              />
              <div className="text-[10px] text-stone-500 mt-1">
                검수비 ¥{((totalMinutes / 60) * 30).toFixed(0)} (시간당 ¥30)
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-600 mb-1.5">운영자에게 보고 (선택)</label>
              <textarea
                value={inspectorComment}
                onChange={(e) => setInspectorComment(e.target.value)}
                rows={3}
                placeholder="특이사항 — 색상 매칭 까다로웠음 / 인쇄 흐림 가장자리 위주 등"
                className="w-full text-xs border border-stone-200 rounded-md p-2 resize-none"
              />
            </div>
            <button
              onClick={finalize}
              disabled={saving}
              className="w-full py-3 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium rounded-md"
            >
              {saving ? '저장 중…' : '운영자 승인 요청'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-stone-100 flex justify-center py-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col">
        <header className="p-3 border-b border-stone-200 flex justify-between items-center">
          <Link href="/admin/inspections" className="text-stone-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 ml-2">
            <div className="text-[10px] text-stone-500">
              {inspection.order?.order_no} · {inspection.qty_received}개
            </div>
            <div className="text-sm font-medium">항목별 검수</div>
          </div>
          <Badge variant="warning" size="xs">
            {currentIdx + 1}/{items.length}
          </Badge>
        </header>

        <div className="flex-1 p-4 overflow-y-auto">

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-base font-medium">{current.label_ko ?? current.label_zh}</div>
              {current.is_seller_request && (
                <Badge variant="brand" size="xs">바이어 요청</Badge>
              )}
            </div>
            <div className="text-[11px] text-stone-500">{current.label_zh}</div>
          </div>


          <div className="mb-4">
            <div className="text-xs font-medium mb-1">정상 표본 사진</div>
            <div className="text-[10px] text-stone-500 mb-2">합격 제품 1~2장 권장</div>
            <PhotoGrid
              photos={current.photos.filter((p) => p.photo_kind === 'normal')}
              onAdd={() => pickPhoto('normal')}
              kind="normal"
            />
          </div>


          <div className="mb-4">
            <div className="text-xs font-medium mb-1 text-red-700">불량 사진</div>
            <div className="text-[10px] text-stone-500 mb-2">발견된 불량 모두 촬영</div>
            <PhotoGrid
              photos={current.photos.filter((p) => p.photo_kind === 'defect')}
              onAdd={() => pickPhoto('defect')}
              kind="defect"
            />
          </div>


          <Card className="bg-stone-50 border-0 mb-3">
            <CardBody className="py-3">
              <div className="text-xs font-medium mb-2">수량 입력</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-stone-500">합격</label>
                  <input
                    type="number"
                    min={0}
                    value={current.qty_passed ?? ''}
                    onChange={(e) =>
                      updateCurrent({
                        qty_passed: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full h-8 px-2 text-sm text-right border border-stone-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500">불량</label>
                  <input
                    type="number"
                    min={0}
                    value={current.qty_failed ?? ''}
                    onChange={(e) =>
                      updateCurrent({
                        qty_failed: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full h-8 px-2 text-sm text-right border border-stone-200 rounded"
                  />
                </div>
              </div>
              {current.qty_passed != null && current.qty_failed != null && (
                <div className="text-[11px] text-green-700 mt-2">
                  합격률{' '}
                  {((current.qty_passed / Math.max(1, current.qty_passed + current.qty_failed)) * 100).toFixed(0)}%
                  · 불량률{' '}
                  {((current.qty_failed / Math.max(1, current.qty_passed + current.qty_failed)) * 100).toFixed(0)}%
                </div>
              )}
            </CardBody>
          </Card>


          <div className="mb-3">
            <label className="block text-xs text-stone-600 mb-1.5">판정</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {(['pass', 'partial', 'fail'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => updateCurrent({ result: r })}
                  className={cn(
                    'py-1.5 text-xs rounded transition',
                    current.result === r
                      ? r === 'pass' ? 'bg-green-600 text-white' :
                        r === 'partial' ? 'bg-vip-600 text-white' :
                        'bg-red-600 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  {r === 'pass' ? '합격' : r === 'partial' ? '조건부' : '부적합'}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="이 항목 메모 (선택) — 예: 인쇄 흐림은 가장자리 위주"
            value={current.notes ?? ''}
            onChange={(e) => updateCurrent({ notes: e.target.value || null })}
            rows={2}
            className="w-full text-xs border border-stone-200 rounded-md p-2 resize-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {saving && (
            <div className="text-[10px] text-stone-500 text-center mt-2">저장 중…</div>
          )}
        </div>


        <footer className="p-3 border-t border-stone-200 flex gap-2">
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="flex-1 py-2.5 text-xs bg-stone-100 hover:bg-stone-200 disabled:opacity-30 rounded flex items-center justify-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" /> 이전
          </button>
          {currentIdx < items.length - 1 ? (
            <button
              onClick={() => setCurrentIdx(currentIdx + 1)}
              className="flex-1 py-2.5 text-xs bg-brand-600 hover:bg-brand-800 text-white rounded font-medium flex items-center justify-center gap-1"
            >
              다음 항목 <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={() => setShowFinalize(true)}
              className="flex-1 py-2.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium"
            >
              검수 완료 →
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}


function AiInspectionAnalysis({
  inspectionId,
  onSuggestion,
}: {
  inspectionId: string;
  onSuggestion: (outcome: 'pass' | 'partial_pass' | 'fail') => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const supabase = createClient();

  async function analyze() {
    setAnalyzing(true);
    const { data: photos } = await supabase
      .from('inspection_photos')
      .select('url')
      .eq('inspection_id', inspectionId)
      .order('uploaded_at', { ascending: false })
      .limit(6);
    const imageUrls = (photos ?? []).map((p: any) => p.url);
    if (imageUrls.length === 0) {
      alert('업로드된 검수 사진이 없습니다.');
      setAnalyzing(false);
      return;
    }
    const res = await fetch('/api/images/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context_type: 'inspection_qc',
        inspection_id: inspectionId,
        image_urls: imageUrls,
      }),
    });
    setAnalyzing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? 'AI 분석 실패');
      return;
    }
    const d = await res.json();
    setResult(d.result);
    const score = d.overall_score ?? 0;
    if (score >= 90) onSuggestion('pass');
    else if (score >= 60) onSuggestion('partial_pass');
    else onSuggestion('fail');
  }

  return (
    <div className="bg-gradient-to-br from-vip-50 to-brand-50 border border-vip-200 rounded p-2.5">
      {!result ? (
        <button
          onClick={analyze}
          disabled={analyzing}
          className="w-full py-2 bg-vip-600 hover:bg-vip-700 disabled:opacity-50 text-white text-xs rounded flex items-center justify-center gap-1.5"
        >
          ✨ {analyzing ? 'Claude Vision 분석 중…' : 'AI 결함 자동 탐지'}
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs font-medium text-vip-900">✨ AI Vision 분석</div>
            <span className={cn(
              'text-base font-medium',
              result.overall_score >= 90 ? 'text-green-700' :
              result.overall_score >= 60 ? 'text-vip-700' : 'text-red-700'
            )}>
              {result.overall_score}점
            </span>
          </div>
          <div className="text-[11px] text-stone-700 mb-2 italic">"{result.reasoning}"</div>
          {result.defects?.length > 0 ? (
            <div className="space-y-1">
              {result.defects.slice(0, 5).map((d: any, i: number) => (
                <div key={i} className="text-[10px] bg-white rounded p-1.5">
                  <span className={cn(
                    'inline-block px-1.5 py-0.5 rounded text-[9px] mr-1',
                    d.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    d.severity === 'moderate' ? 'bg-vip-100 text-vip-800' :
                    'bg-stone-100 text-stone-700'
                  )}>{d.severity}</span>
                  <span className="font-medium">{d.type}</span> · {d.description}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-green-700">✓ 결함 없음</div>
          )}
          <div className="text-[10px] text-stone-500 mt-1.5">
            추천 판정: {result.pass_recommendation ? '합격' : '재검토'} · 자동 적용됨 (수정 가능)
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoGrid({
  photos,
  onAdd,
  kind,
}: {
  photos: Array<{ id: string; url: string; photo_kind: string }>;
  onAdd: () => void;
  kind: 'normal' | 'defect';
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
      {photos.map((p) => (
        <div
          key={p.id}
          className={cn(
            'aspect-square rounded relative overflow-hidden',
            kind === 'normal' ? 'ring-1 ring-green-500' : 'ring-1.5 ring-red-500'
          )}
        >
          <Image src={p.url} alt="" width={200} height={200} className="object-cover" />
          <span
            className={cn(
              'absolute bottom-0.5 left-1 text-[9px] font-medium px-1 rounded',
              kind === 'normal' ? 'bg-white/90 text-green-700' : 'bg-white/90 text-red-700'
            )}
          >
            {kind === 'normal' ? '정상' : '불량'}
          </span>
        </div>
      ))}
      <button
        onClick={onAdd}
        className={cn(
          'aspect-square rounded border-2 border-dashed flex flex-col items-center justify-center text-stone-400 hover:text-stone-600 transition',
          kind === 'normal' ? 'border-green-200 hover:border-green-400' : 'border-red-200 hover:border-red-400'
        )}
      >
        <Camera className="w-5 h-5" />
        <span className="text-[9px] mt-0.5">+</span>
      </button>
    </div>
  );
}
