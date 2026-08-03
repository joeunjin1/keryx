'use client';
import { Suspense } from 'react';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Send } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

function MdAiBriefPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const sellerIdParam = params.get('sellerId');
  const interestIdParam = params.get('interestId');

  const [me, setMe] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [interest, setInterest] = useState<any>(null);
  const [factories, setFactories] = useState<any[]>([]);

  // Step 1 — 의향 입력
  const [sourceText, setSourceText] = useState('');
  const [budgetHint, setBudgetHint] = useState('');
  const [moqHint, setMoqHint] = useState('');

  // Step 2 — 생성된 초안 (편집 가능)
  const [draft, setDraft] = useState<any>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [editTitleKo, setEditTitleKo] = useState('');
  const [editTitleZh, setEditTitleZh] = useState('');
  const [editConcept, setEditConcept] = useState('');
  const [editPriceMin, setEditPriceMin] = useState('');
  const [editPriceMax, setEditPriceMax] = useState('');
  const [editMoqMin, setEditMoqMin] = useState('');
  const [editMoqMax, setEditMoqMax] = useState('');
  const [editDeliveryDays, setEditDeliveryDays] = useState('30');
  const [editMdNotes, setEditMdNotes] = useState('');

  // Step 3 — AI 공장 매칭
  const [factoryMatches, setFactoryMatches] = useState<any[]>([]);
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);

  const [step, setStep] = useState<'input' | 'draft' | 'send'>('input');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = 'AI Brief 생성 | KERYX';
  }, []);

    if (!sellerIdParam) {
      router.push('/md');
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }

      const { data: m } = await supabase
        .from('internal_users')
        .select('id, role, name_ko')
        .eq('user_id', user.id)
        .single() as { data: any, error: any };
      if (!m || !['md', 'admin'].includes(m.role)) { router.push('/admin'); return; }
      setMe(m);

      const { data: s } = await supabase
        .from('sellers')
        .select('id, business_name, current_grade, country')
        .eq('id', sellerIdParam)
        .single() as { data: any, error: any };
      setSeller(s);

      if (interestIdParam) {
        const { data: i } = await supabase
          .from('seller_interests')
          .select('*')
          .eq('id', interestIdParam)
          .single() as { data: any, error: any };
        if (i) {
          setInterest(i);
          setSourceText(i.description ?? '');
          setBudgetHint(i.budget_hint_cny ?? '');
          setMoqHint(i.moq_hint ?? '');
        }
      }

      const { data: facs } = await supabase
        .from('factories')
        .select('id, factory_code, company_name, rating, total_orders')
        .eq('approval_status', 'approved')
        .order('rating') as { data: any, error: any };
      setFactories(facs ?? []);
    })();
  }, [sellerIdParam, interestIdParam, router, supabase]);

  async function generateDraft() {
    setError(null);
    if (sourceText.trim().length < 5) {
      setError('의향 텍스트가 너무 짧습니다.');
      return;
    }
    setGenerating(true);
    const res = await fetch('/api/ai/brief-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: sellerIdParam,
        seller_interest_id: interestIdParam || null,
        source_text: sourceText.trim(),
        budget_hint: budgetHint.trim() || null,
        moq_hint: moqHint.trim() || null,
      }),
    });
    setGenerating(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'AI 생성 실패');
      return;
    }

    const { draft_id, draft: d } = await res.json();
    setDraftId(draft_id);
    setDraft(d);

    // 편집 가능 상태로 복사
    setEditTitleKo(d.title_ko ?? '');
    setEditTitleZh(d.title_zh ?? '');
    setEditConcept(d.concept ?? '');
    setEditPriceMin(String(d.target_price_min_cny ?? ''));
    setEditPriceMax(String(d.target_price_max_cny ?? ''));
    setEditMoqMin(String(d.moq_min ?? ''));
    setEditMoqMax(String(d.moq_max ?? ''));
    setEditDeliveryDays(String(d.delivery_target_days ?? 30));
    setEditMdNotes(d.md_notes_to_factory ?? '');

    setStep('draft');
  }

  async function moveToFactorySelection() {
    setStep('send');
    // 실제 Brief를 만들고 AI 공장 매칭 호출 — 여기서는 후보 공장 표시만
    // (Brief 매칭은 Brief 발송 후 별도 호출)
  }

  async function sendBrief() {
    setError(null);
    if (selectedFactories.length === 0) {
      setError('공장 1곳 이상 선택');
      return;
    }
    setSending(true);

    const deliveryDate = new Date(Date.now() + parseInt(editDeliveryDays) * 86400000)
      .toISOString().slice(0, 10);

    const res = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: sellerIdParam,
        title_zh: editTitleZh.trim(),
        title_ko: editTitleKo.trim() || editTitleZh.trim(),
        concept: editConcept.trim(),
        category_id: draft?.category_id,
        target_price_min: parseFloat(editPriceMin),
        target_price_max: parseFloat(editPriceMax),
        moq_min: parseInt(editMoqMin),
        moq_max: parseInt(editMoqMax),
        delivery_target: deliveryDate,
        reference_image_urls: [],
        md_notes_to_factory: editMdNotes.trim() || undefined,
        factory_ids: selectedFactories,
        is_vip_priority: seller?.current_grade === 'vip',
      }),
    });
    setSending(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? '발송 실패');
      return;
    }

    const { brief_id } = await res.json();
    router.push(`/md/briefs/${brief_id}`);
  }

  function toggleFactory(id: string) {
    setSelectedFactories((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  if (!seller) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-3">

        <div className="flex items-center gap-2 text-[11px] text-stone-500">
          <span className={step === 'input' ? 'text-brand-700 font-medium' : ''}>1. 의향 입력</span>
          <span>→</span>
          <span className={step === 'draft' ? 'text-brand-700 font-medium' : ''}>2. AI 초안 검토·편집</span>
          <span>→</span>
          <span className={step === 'send' ? 'text-brand-700 font-medium' : ''}>3. 공장 선택·발송</span>
        </div>


        {step === 'input' && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">바이어 의향</div>

              <div className="mb-3">
                <label className="block text-[11px] text-stone-600 mb-1">의향 텍스트 *</label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={5}
                  placeholder="예: 여름용 핑크·민트 톤 PVC 키링, 산리오 풍 캐릭터, 5천개~1만개, 5월 말까지 납품 희망"
                  className="w-full text-sm border border-stone-200 rounded p-2.5 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">예산 힌트</label>
                  <input
                    value={budgetHint}
                    onChange={(e) => setBudgetHint(e.target.value)}
                    placeholder="¥3~5"
                    className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">MOQ 힌트</label>
                  <input
                    value={moqHint}
                    onChange={(e) => setMoqHint(e.target.value)}
                    placeholder="5,000~10,000개"
                    className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                  />
                </div>
              </div>

              {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{error}</div>}

              <button
                onClick={generateDraft}
                disabled={generating || sourceText.trim().length < 5}
                className="w-full py-3 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? 'Claude 분석 중...' : 'AI Brief 초안 생성'}
              </button>

              <p className="text-[10px] text-stone-500 mt-2 text-center">
                Claude Opus 4.7이 의향을 분석해 제목·컨셉·타겟 단가·MOQ·납기를 자동 산출합니다 (~10초).
              </p>
            </CardBody>
          </Card>
        )}


        {step === 'draft' && draft && (
          <>
            <Card className="bg-gradient-to-br from-brand-50 to-vip-50 border-brand-200">
              <CardBody>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-brand-700" />
                  <div className="text-sm font-medium text-brand-900">AI 생성 초안</div>
                  <span className="text-[10px] text-stone-500 ml-auto">편집 가능</span>
                </div>
                <p className="text-[11px] text-stone-700">
                  의향 원문: <span className="italic">"{sourceText.slice(0, 100)}{sourceText.length > 100 ? '...' : ''}"</span>
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">제목 (中文)</label>
                      <input
                        value={editTitleZh}
                        onChange={(e) => setEditTitleZh(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">제목 (한국어)</label>
                      <input
                        value={editTitleKo}
                        onChange={(e) => setEditTitleKo(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">컨셉</label>
                    <textarea
                      value={editConcept}
                      onChange={(e) => setEditConcept(e.target.value)}
                      rows={4}
                      className="w-full text-xs border border-stone-200 rounded p-2 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">단가 최저 ¥</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPriceMin}
                        onChange={(e) => setEditPriceMin(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">단가 최고 ¥</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPriceMax}
                        onChange={(e) => setEditPriceMax(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">MOQ 최저</label>
                      <input
                        type="number"
                        value={editMoqMin}
                        onChange={(e) => setEditMoqMin(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">MOQ 최고</label>
                      <input
                        type="number"
                        value={editMoqMax}
                        onChange={(e) => setEditMoqMax(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">납기 (일)</label>
                      <input
                        type="number"
                        value={editDeliveryDays}
                        onChange={(e) => setEditDeliveryDays(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">공장에게 보낼 메모</label>
                    <textarea
                      value={editMdNotes}
                      onChange={(e) => setEditMdNotes(e.target.value)}
                      rows={2}
                      className="w-full text-xs border border-stone-200 rounded p-2 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setStep('input')}
                    className="px-4 py-2 text-xs bg-stone-100 hover:bg-stone-200 rounded-md"
                  >
                    ← 의향 다시 입력
                  </button>
                  <button
                    onClick={moveToFactorySelection}
                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-800 text-white text-sm rounded-md"
                  >
                    공장 선택으로 이동 →
                  </button>
                </div>
              </CardBody>
            </Card>
          </>
        )}


        {step === 'send' && draft && (
          <>
            <Card>
              <CardBody>
                <div className="text-sm font-medium mb-2">최종 검토</div>
                <div className="space-y-1 text-xs">
                  <div className="font-medium">{editTitleKo} / {editTitleZh}</div>
                  <div className="text-stone-700 whitespace-pre-wrap text-[11px]">{editConcept}</div>
                  <div className="text-stone-500 mt-2">
                    ¥{editPriceMin}~{editPriceMax} · {editMoqMin}~{editMoqMax}개 · {editDeliveryDays}일 후 납기
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">발송 공장 ({selectedFactories.length}곳)</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
                  {factories.map((f) => (
                    <label
                      key={f.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${
                        selectedFactories.includes(f.id)
                          ? 'bg-brand-50 border border-brand-200'
                          : 'bg-stone-50 hover:bg-stone-100 border border-stone-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFactories.includes(f.id)}
                        onChange={() => toggleFactory(f.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{f.factory_code} · {f.company_name}</div>
                        <div className="text-[10px] text-stone-500">
                          {f.rating ? `★ ${f.rating}` : '신규'} · 주문 {f.total_orders ?? 0}건
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardBody>
            </Card>

            {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded">{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('draft')}
                className="px-4 py-3 text-xs bg-stone-100 hover:bg-stone-200 rounded-md"
              >
                ← 초안으로
              </button>
              <button
                onClick={sendBrief}
                disabled={sending || selectedFactories.length === 0}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium rounded-md flex items-center justify-center gap-1"
              >
                <Send className="w-4 h-4" />
                {sending ? '발송 중…' : `${selectedFactories.length}곳 공장에게 Brief 발송`}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function MdAiBriefPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <MdAiBriefPageInner />
    </Suspense>
  );
}
