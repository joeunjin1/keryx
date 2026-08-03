'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

function NewBriefPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient() as any;
  const fileRef = useRef<HTMLInputElement>(null);

  const [me, setMe] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [sellerId, setSellerId] = useState(searchParams.get('seller') ?? '');
  const [titleKo, setTitleKo] = useState('');
  const [titleZh, setTitleZh] = useState('');
  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [moqMin, setMoqMin] = useState('1000');
  const [moqMax, setMoqMax] = useState('10000');
  const [deliveryTarget, setDeliveryTarget] = useState(
    new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10)
  );
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [mdNotes, setMdNotes] = useState('');
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);
  const [isVipPriority, setIsVipPriority] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '새 Brief 작성 | KERYX';
  }, []);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?role=internal');
        return;
      }
      const { data: m } = await supabase
        .from('internal_users')
        .select('id, role, name_ko')
        .eq('user_id', user.id)
        .single() as { data: any; error: any };
      if (!m || !['md', 'admin'].includes(m.role)) {
        router.push('/admin');
        return;
      }
      setMe(m);

      const [sellerRes, catRes, facRes] = await Promise.all([
        supabase
          .from('sellers')
          .select('id, business_name, current_grade')
          .eq('approval_status', 'approved')
          .eq('assigned_md_id', m.id)
          .order('business_name'),
        supabase
          .from('categories')
          .select('id, code, name_ko, name_zh')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('factories')
          .select('id, factory_code, company_name, rating, total_orders')
          .eq('approval_status', 'approved')
          .order('factory_code'),
      ]);

      setSellers(sellerRes.data ?? []);
      setCategories(catRes.data ?? []);
      setFactories(facRes.data ?? []);

      // VIP auto-flag
      const seller = sellerRes.data?.find((s: any) => s.id === searchParams.get('seller'));
      if (seller?.current_grade === 'vip') setIsVipPriority(true);

      setLoading(false);
    })();
  }, [router, supabase]);

  function toggleFactory(id: string) {
    setSelectedFactories((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!me) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const uploaded: string[] = [];
    for (const file of files) {
      const path = `briefs/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('brief-references').upload(path, file);
      if (error) continue;
      const { data: signed } = await supabase.storage
        .from('brief-references')
        .createSignedUrl(data.path, 60 * 60 * 24 * 90);
      if (signed) uploaded.push(signed.signedUrl);
    }
    setReferenceImages((cur) => [...cur, ...uploaded].slice(0, 8));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit() {
    setError(null);
    if (!sellerId || !titleZh.trim() || !concept.trim() || !categoryId) {
      setError('바이어·제목·컨셉·카테고리는 필수입니다.');
      return;
    }
    if (selectedFactories.length === 0) {
      setError('최소 1개 공장을 선택해주세요.');
      return;
    }
    if (!priceMin || !priceMax || parseFloat(priceMin) > parseFloat(priceMax)) {
      setError('단가 범위를 올바르게 입력해주세요.');
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: sellerId,
        title_zh: titleZh.trim(),
        title_ko: titleKo.trim() || titleZh.trim(),
        concept: concept.trim(),
        category_id: categoryId,
        target_price_min: parseFloat(priceMin),
        target_price_max: parseFloat(priceMax),
        moq_min: parseInt(moqMin),
        moq_max: parseInt(moqMax),
        delivery_target: deliveryTarget,
        reference_image_urls: referenceImages,
        md_notes_to_factory: mdNotes.trim() || undefined,
        factory_ids: selectedFactories,
        is_vip_priority: isVipPriority,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? '제출 실패');
      return;
    }
    const { brief_id } = await res.json();
    router.push(`/md/briefs/${brief_id}`);
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-3">
        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">기본 정보</div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-stone-600 mb-1">바이어(고객) *</label>
                <select
                  value={sellerId}
                  onChange={(e) => {
                    setSellerId(e.target.value);
                    const s = sellers.find((x) => x.id === e.target.value);
                    if (s?.current_grade === 'vip') setIsVipPriority(true);
                  }}
                  className="w-full h-9 px-2 text-xs border border-stone-200 rounded"
                >
                  <option value="">선택…</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_name} {s.current_grade === 'vip' && '(VIP)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">제목 (中文) *</label>
                  <input
                    value={titleZh}
                    onChange={(e) => setTitleZh(e.target.value)}
                    placeholder="粉色三丽鸥风格PVC钥匙扣"
                    className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">제목 (한국어)</label>
                  <input
                    value={titleKo}
                    onChange={(e) => setTitleKo(e.target.value)}
                    placeholder="핑크 산리오 톤 PVC 키링"
                    className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-stone-600 mb-1">카테고리 *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 px-2 text-xs border border-stone-200 rounded"
                >
                  <option value="">선택…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name_ko ?? c.name_zh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-stone-600 mb-1">컨셉 (공장에게 전달) *</label>
                <textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  rows={3}
                  placeholder="파스텔 핑크·민트 컬러팔레트, 산리오 마이멜로디 풍의 큐트 캐릭터, 5cm 키링"
                  className="w-full text-xs border border-stone-200 rounded p-2 resize-none"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">목표 사양</div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <Field label="단가 최저 ¥ *" type="number" value={priceMin} onChange={setPriceMin} placeholder="3.5" />
              <Field label="단가 최고 ¥ *" type="number" value={priceMax} onChange={setPriceMax} placeholder="5.0" />
              <Field label="MOQ 최저" type="number" value={moqMin} onChange={setMoqMin} />
              <Field label="MOQ 최고" type="number" value={moqMax} onChange={setMoqMax} />
            </div>
            <Field label="납기 목표일" type="date" value={deliveryTarget} onChange={setDeliveryTarget} />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">참고 이미지</div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {referenceImages.map((url, i) => (
                <div key={i} className="relative aspect-square rounded overflow-hidden">
                  <Image src={url} alt="" width={200} height={200} className="object-cover" />
                  <button
                    onClick={() => setReferenceImages((cur) => cur.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full"
                  >
                    ×
                  </button>
                </div>
              ))}
              {referenceImages.length < 8 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-stone-200 hover:border-brand-400 rounded flex items-center justify-center text-stone-400"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-medium">공장 선택 ({selectedFactories.length}곳)</div>
              {isVipPriority && <Badge variant="vip" size="xs">VIP 우선 발송</Badge>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
              {factories.map((f) => (
                <label
                  key={f.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded cursor-pointer text-xs',
                    selectedFactories.includes(f.id)
                      ? 'bg-brand-50 border border-brand-200'
                      : 'bg-stone-50 hover:bg-stone-100'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedFactories.includes(f.id)}
                    onChange={() => toggleFactory(f.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{f.factory_code} · {f.company_name}</div>
                    <div className="text-[10px] text-stone-500">
                      {f.rating ? `★ ${f.rating}` : ''} {f.total_orders ? ` · 주문 ${f.total_orders}건` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <label className="block text-[11px] text-stone-600 mb-1">공장에게 메모 (선택)</label>
            <textarea
              value={mdNotes}
              onChange={(e) => setMdNotes(e.target.value)}
              rows={2}
              placeholder="실리콘 마감 깨끗하게, 색상 매칭 까다로움"
              className="w-full text-xs border border-stone-200 rounded p-2 resize-none"
            />
          </CardBody>
        </Card>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-3 rounded">{error}</div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-3 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium rounded-md"
        >
          {submitting ? '발송 중…' : `${selectedFactories.length}개 공장에게 Brief 발송`}
        </button>
      </div>
    </main>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-stone-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 px-2 text-xs border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-600/30"
      />
    </div>
  );
}

export default function NewBriefPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh"><div className="text-stone-400">로딩 중...</div></div>}>
      <NewBriefPageInner />
    </Suspense>
  );
}
