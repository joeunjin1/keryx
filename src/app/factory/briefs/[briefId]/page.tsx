'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, AlertCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

export default function FactoryBriefDetailPage({
  params,
}: {
  params: { briefId: string };
}) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [brief, setBrief] = useState<any>(null);
  const [factory, setFactory] = useState<any>(null);
  const [recipient, setRecipient] = useState<any>(null);
  const [existingProposal, setExistingProposal] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [productNameKo, setProductNameKo] = useState('');
  const [productNameZh, setProductNameZh] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [moq, setMoq] = useState<string>('');
  const [leadTime, setLeadTime] = useState<string>('25');
  const [sampleCost, setSampleCost] = useState<string>('30');
  const [sizeMm, setSizeMm] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?role=factory');
        return;
      }

      const { data: f } = await supabase
        .from('factories')
        .select('id, factory_code, company_name')
        .eq('shared_login_user_id', user.id)
        .single();

      if (!f) {
        router.push('/factory');
        return;
      }
      setFactory(f);

      const { data: b } = await supabase
        .from('briefs')
        .select(
          `*, md:internal_users(name_ko, staff_code),
           category:categories(name_ko, name_zh)`
        )
        .eq('id', params.briefId)
        .single();
      setBrief(b);

      const { data: r } = await supabase
        .from('brief_recipients')
        .select('*')
        .eq('brief_id', params.briefId)
        .eq('factory_id', f.id)
        .single();
      setRecipient(r);

      // viewed_at 마킹
      if (r && !r.viewed_at) {
        await supabase
          .from('brief_recipients')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', r.id);
      }

      // 기존 제안 (재제출 가능)
      const { data: existing } = await supabase
        .from('brief_responses')
        .select('*, product:products(*, pricing:product_pricing_tiers(*))')
        .eq('brief_id', params.briefId)
        .eq('factory_id', f.id)
        .order('proposal_no', { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingProposal(existing);

      // 자재 목록
      const { data: m } = await supabase
        .from('materials')
        .select('id, name_zh, name_ko')
        .eq('is_active', true);
      setMaterials(m ?? []);

      setLoading(false);
    })();
  }, [params.briefId, router, supabase]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !factory) return;
    const uploaded: string[] = [];
    for (const file of files) {
      const path = `${factory.factory_code}/${params.briefId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('brief-references').upload(path, file);
      if (error) continue;
      const { data: signed } = await supabase.storage
        .from('brief-references')
        .createSignedUrl(data.path, 60 * 60 * 24 * 90);
      if (signed) uploaded.push(signed.signedUrl);
    }
    setImageUrls((cur) => [...cur, ...uploaded].slice(0, 6));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    setError(null);
    if (!productNameZh.trim() || !unitPrice || !moq || !leadTime) {
      setError('제품명·단가·MOQ·리드타임은 필수입니다.');
      return;
    }
    if (imageUrls.length === 0) {
      setError('제품 이미지 1장 이상 첨부 필요.');
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/factory/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief_id: params.briefId,
        product_name_zh: productNameZh.trim(),
        product_name_ko: productNameKo.trim() || productNameZh.trim(),
        unit_price_cny: parseFloat(unitPrice),
        moq: parseInt(moq),
        lead_time_days: parseInt(leadTime),
        sample_cost_cny: parseFloat(sampleCost) || 0,
        size_mm: sizeMm.trim() || null,
        primary_material_id: materialId || null,
        image_urls: imageUrls,
        notes: notes.trim() || null,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? '제출 실패');
      return;
    }

    alert('제안서 제출 완료. MD가 검토합니다. / 提案提交成功，MD将审核。');
    router.push('/factory');
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!brief) return <div className="p-8 text-center text-stone-500"><LangText ko="Brief를 찾을 수 없습니다." zh="找不到Brief。" /></div>;
  if (!recipient) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <Card className="max-w-sm">
          <CardBody className="text-center py-6">
            <div className="text-sm text-stone-700">
              
            </div>
          </CardBody>
        </Card>
      </main>
    );
  }

  const canRespond = ['sent', 'partial_response'].includes(brief.status);

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/factory" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="text-base font-medium">{brief.brief_no}</div>
            <div className="text-[11px] text-stone-500">
              MD {brief.md?.name_ko} · 마감 {brief.deadline?.slice(0, 10)}
            </div>
          </div>
          {brief.is_vip_priority && <Badge variant="vip" size="sm">VIP 우선</Badge>}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-4">
        {/* Brief 내용 */}
        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3"><LangText ko="Brief 내용" zh="Brief内容" /></div>
            <div className="space-y-2 text-xs">
              <Row label={<LangText ko="제목" zh="标题" />} value={brief.title_ko ?? brief.title_zh} />
              <Row label={<LangText ko="카테고리" zh="类别" />} value={brief.category?.name_ko ?? brief.category?.name_zh} />
              <div>
                <div className="text-stone-500 text-[11px] mb-1">컨셉</div>
                <div className="text-sm leading-relaxed">{brief.concept}</div>
              </div>
              {brief.md_notes_to_factory && (
                <div className="bg-vip-50 rounded p-2.5 mt-2">
                  <div className="text-[10px] text-vip-800 mb-0.5">MD 메모</div>
                  <div className="text-xs text-vip-900">{brief.md_notes_to_factory}</div>
                </div>
              )}
              <Row
                label={<LangText ko="목표 단가" zh="目标单价" />}
                value={`¥${brief.target_unit_price_min_cny} ~ ¥${brief.target_unit_price_max_cny}`}
                bold
              />
              <Row
                label={<LangText ko="MOQ" zh="最小起订量" />}
                value={`${brief.moq_min?.toLocaleString()} ~ ${brief.moq_max?.toLocaleString()}개`}
              />
              <Row label={<LangText ko="납기" zh="交货期" />} value={brief.delivery_target} />
            </div>

            {brief.reference_image_urls?.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] text-stone-500 mb-1"><LangText ko="참고 이미지" zh="参考图片" /></div>
                <div className="grid grid-cols-5 gap-1">
                  {brief.reference_image_urls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="aspect-square w-full rounded object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Information asymmetry banner */}
        <Card className="bg-stone-100 border-0">
          <CardBody className="py-2.5">
            <p className="text-[11px] text-stone-600 leading-relaxed">
              
            </p>
          </CardBody>
        </Card>

        {!canRespond && (
          <Card className="bg-stone-50 border-stone-200">
            <CardBody>
              <div className="text-sm text-stone-700">
                이 Brief는 더 이상 응답을 받지 않습니다 ({brief.status === 'closed' ? '종료됨' : brief.status})
              </div>
            </CardBody>
          </Card>
        )}

        {existingProposal && (
          <Card className="bg-vip-50 border-vip-200">
            <CardBody>
              <div className="text-sm text-vip-900 font-medium">
                이미 제안 #{existingProposal.proposal_no} 제출됨
              </div>
              <div className="text-[11px] text-vip-800 mt-1">
                재제출 시 제안 #{existingProposal.proposal_no + 1}로 추가됩니다 (이전 것은 유지).
              </div>
            </CardBody>
          </Card>
        )}

        {canRespond && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3"><LangText ko="제안서 작성" zh="撰写提案" /></div>

              {/* 제품 정보 */}
              <div className="mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1"><LangText ko="제품명 (中文) *" zh="产品名称 (中文) *" /></label>
                    <input
                      value={productNameZh}
                      onChange={(e) => setProductNameZh(e.target.value)}
                      placeholder="粉色玛丽猫钥匙扣"
                      className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">제품명 (한국어, 선택)</label>
                    <input
                      value={productNameKo}
                      onChange={(e) => setProductNameKo(e.target.value)}
                      placeholder="핑크 마이멜로디 키링"
                      className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* 사진 */}
              <div className="mb-3">
                <label className="block text-[11px] text-stone-600 mb-1">제품 사진 (필수, 최대 6장)</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImageUrls((cur) => cur.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {imageUrls.length < 6 && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-stone-200 hover:border-brand-400 rounded flex items-center justify-center text-stone-400"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
              </div>

              {/* 가격 / MOQ / 리드타임 / 샘플비 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <Field label="단가 (¥) *" type="number" value={unitPrice} onChange={setUnitPrice} placeholder="4.20" />
                <Field label="MOQ *" type="number" value={moq} onChange={setMoq} placeholder="3000" />
                <Field label="리드타임 (일) *" type="number" value={leadTime} onChange={setLeadTime} />
                <Field label="샘플비 (¥)" type="number" value={sampleCost} onChange={setSampleCost} />
              </div>

              {/* 사이즈, 자재 */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Field label="사이즈" value={sizeMm} onChange={setSizeMm} placeholder="50x50mm" />
                <div>
                  <label className="block text-[11px] text-stone-600 mb-1">주 자재</label>
                  <select
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-stone-200 rounded"
                  >
                    <option value="">선택…</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name_ko ?? m.name_zh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MD에게 메모 */}
              <div className="mb-3">
                <label className="block text-[11px] text-stone-600 mb-1">MD에게 메모 (선택)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="자사 강점, 특이사항, 협상 가능 여부 등"
                  className="w-full text-xs border border-stone-200 rounded-md p-2 resize-none"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded mb-3 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium rounded-md"
              >
                {submitting ? '제출 중…' : 'MD에게 제안서 제출'}
              </button>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, bold }: { label: string | React.ReactNode; value: string | null | undefined; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-medium' : ''}`}>
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </div>
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
