'use client';
/**
 * 샘플 발송 내역서 작성 페이지
 * - 바이어 검색 + 문의(service_requests) 연결
 * - 여러 공장 샘플 정보 등록 (공장명, 사진, 중량, 가격, MOQ)
 * - 바이어에게 발송
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

// ── 타입 ─────────────────────────────────────────────────────────
interface FactorySample {
  factory_name: string;
  factory_name_zh: string;
  location: string;
  cover_image: string;
  sample_photos: string[];
  weight_g: string;
  price_cny: string;
  moq: string;
  lead_time_days: string;
  note: string;
}

const DEFAULT_FACTORY: FactorySample = {
  factory_name: '', factory_name_zh: '', location: '',
  cover_image: '', sample_photos: [],
  weight_g: '', price_cny: '', moq: '', lead_time_days: '', note: '',
};

interface DispatchForm {
  title: string;
  buyer_name: string;
  buyer_company: string;
  buyer_email: string;
  request_id: string | null;
  product_name: string;
  product_desc: string;
  factories: FactorySample[];
  memo: string;
}

const DEFAULT_FORM: DispatchForm = {
  title: '', buyer_name: '', buyer_company: '', buyer_email: '',
  request_id: null, product_name: '', product_desc: '',
  factories: [{ ...DEFAULT_FACTORY }, { ...DEFAULT_FACTORY }],
  memo: '',
};

// ── 컴포넌트 ──────────────────────────────────────────────────────
export default function SampleDispatchPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as any;

  const [form, setForm] = useState<DispatchForm>({ ...DEFAULT_FORM });
  const [buyers, setBuyers] = useState<any[]>([]);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);
  const coverRefs = useRef<(HTMLInputElement | null)[]>([]);
  const photoRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── 바이어 목록 로드 ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, display_name, company_name, email')
        .eq('kind', 'seller')
        .order('display_name');
      setBuyers(data || []);
    })();
  }, []);

  // ── 바이어 선택 시 문의 목록 로드 ────────────────────────────
  const loadRequests = async (buyerId: string) => {
    const { data } = await supabase
      .from('service_requests')
      .select('id, service_type, title, created_at, status')
      .eq('user_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(20);
    setRequests(data || []);
  };

  const selectBuyer = (buyer: any) => {
    setForm(prev => ({
      ...prev,
      buyer_name: buyer.display_name || '',
      buyer_company: buyer.company_name || '',
      buyer_email: buyer.email || '',
    }));
    setSendEmail(buyer.email || '');
    setBuyerSearch(buyer.display_name || '');
    setShowBuyerDropdown(false);
    loadRequests(buyer.id);
  };

  // ── 이미지 업로드 ─────────────────────────────────────────────
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `sample-dispatch/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      return publicUrl;
    } catch { return null; }
  };

  const handleCoverUpload = async (factoryIdx: number, file: File) => {
    setUploading(`cover-${factoryIdx}`);
    const url = await uploadImage(file);
    if (url) {
      setForm(prev => {
        const factories = [...prev.factories];
        factories[factoryIdx] = { ...factories[factoryIdx], cover_image: url };
        return { ...prev, factories };
      });
    }
    setUploading(null);
  };

  const handlePhotosUpload = async (factoryIdx: number, files: FileList) => {
    setUploading(`photos-${factoryIdx}`);
    const current = form.factories[factoryIdx].sample_photos;
    const remaining = 8 - current.length;
    const toUpload = Array.from(files).slice(0, remaining);
    const urls: string[] = [];
    for (const file of toUpload) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }
    if (urls.length > 0) {
      setForm(prev => {
        const factories = [...prev.factories];
        factories[factoryIdx] = { ...factories[factoryIdx], sample_photos: [...current, ...urls] };
        return { ...prev, factories };
      });
    }
    setUploading(null);
  };

  const removePhoto = (factoryIdx: number, photoIdx: number) => {
    setForm(prev => {
      const factories = [...prev.factories];
      const photos = [...factories[factoryIdx].sample_photos];
      photos.splice(photoIdx, 1);
      factories[factoryIdx] = { ...factories[factoryIdx], sample_photos: photos };
      return { ...prev, factories };
    });
  };

  const updateFactory = (idx: number, field: keyof FactorySample, value: any) => {
    setForm(prev => {
      const factories = [...prev.factories];
      factories[idx] = { ...factories[idx], [field]: value };
      return { ...prev, factories };
    });
  };

  const addFactory = () => {
    setForm(prev => ({ ...prev, factories: [...prev.factories, { ...DEFAULT_FACTORY }] }));
  };

  const removeFactory = (idx: number) => {
    if (form.factories.length <= 1) return;
    setForm(prev => ({ ...prev, factories: prev.factories.filter((_, i) => i !== idx) }));
  };

  // ── 저장 ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        report_title: form.title || `${form.buyer_name} 샘플 발송 내역서`,
        buyer_name: form.buyer_name,
        buyer_company: form.buyer_company,
        request_id: form.request_id || null,
        spec: { product_name: form.product_name, product_desc: form.product_desc },
        quotes: form.factories.map(f => ({
          factory_name: f.factory_name,
          factory_name_zh: f.factory_name_zh,
          location: f.location,
          factory_cover: f.cover_image,
          sample_photos: f.sample_photos,
          weight_g: f.weight_g,
          sample_price_cny: f.price_cny,
          bulk_moq: f.moq,
          lead_time_days: f.lead_time_days,
          note: f.note,
        })),
        internal_memo: form.memo,
        status: 'draft',
        created_by: user?.id,
      };

      if (savedId) {
        await supabase.from('sample_reports').update(payload).eq('id', savedId);
      } else {
        const { data } = await supabase.from('sample_reports').insert(payload).select('id').single();
        if (data?.id) setSavedId(data.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── 발송 ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!savedId) {
      await handleSave();
    }
    setSending(true);
    try {
      await supabase.from('sample_reports').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to_email: sendEmail,
      }).eq('id', savedId);
      setSendResult('success');
    } catch {
      setSendResult('error');
    } finally {
      setSending(false);
    }
  };

  const filteredBuyers = buyers.filter(b =>
    !buyerSearch || (b.display_name || '').toLowerCase().includes(buyerSearch.toLowerCase()) ||
    (b.company_name || '').toLowerCase().includes(buyerSearch.toLowerCase())
  );

  // ── 스타일 상수 ───────────────────────────────────────────────
  const inp = 'w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white';
  const label = 'block text-xs font-bold text-neutral-600 mb-1.5';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>

      {/* 헤더 */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => router.back()}
          style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← {t('목록으로', '返回列表')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
              📦 {t('샘플 발송 내역서 작성', '样品发送明细书制作')}
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              {t('바이어에게 발송할 샘플 내역서를 작성합니다. 여러 공장의 샘플 정보를 한 번에 정리할 수 있습니다.', '制作发送给买家的样品明细书。可以一次整理多个工厂的样品信息。')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#374151' }}
            >
              {saving ? t('저장 중...', '保存中...') : t('💾 임시저장', '💾 暂存')}
            </button>
            <button
              onClick={() => { if (!form.buyer_email && !sendEmail) { alert(t('바이어 이메일을 입력해주세요', '请输入买家邮箱')); return; } setShowSendModal(true); }}
              style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              ✉️ {t('바이어에게 발송', '发送给买家')}
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: 기본 정보 ── */}
      <section style={{ background: '#fff', borderRadius: 20, padding: '28px', border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, background: '#667eea', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>1</span>
          {t('기본 정보', '基本信息')}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* 내역서 제목 */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className={label}>{t('내역서 제목', '明细书标题')}</label>
            <input
              className={inp}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder={t('예: 2026년 5월 샘플 발송 내역서', '例: 2026年5月样品发送明细书')}
            />
          </div>

          {/* 바이어 검색 */}
          <div style={{ position: 'relative' }}>
            <label className={label}>🔍 {t('바이어 검색', '搜索买家')}</label>
            <input
              className={inp}
              value={buyerSearch}
              onChange={e => { setBuyerSearch(e.target.value); setShowBuyerDropdown(true); }}
              onFocus={() => setShowBuyerDropdown(true)}
              placeholder={t('바이어 이름 또는 회사명 검색...', '搜索买家姓名或公司名...')}
            />
            {showBuyerDropdown && filteredBuyers.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {filteredBuyers.slice(0, 10).map(b => (
                  <div
                    key={b.id}
                    onClick={() => selectBuyer(b)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ fontWeight: 700, color: '#111827' }}>{b.display_name}</div>
                    {b.company_name && <div style={{ fontSize: 11, color: '#6b7280' }}>{b.company_name}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 바이어 이메일 */}
          <div>
            <label className={label}>{t('발송 이메일', '发送邮箱')}</label>
            <input
              className={inp}
              type="email"
              value={sendEmail}
              onChange={e => setSendEmail(e.target.value)}
              placeholder="buyer@example.com"
            />
          </div>

          {/* 바이어 이름 */}
          <div>
            <label className={label}>{t('바이어 이름', '买家姓名')}</label>
            <input
              className={inp}
              value={form.buyer_name}
              onChange={e => setForm(p => ({ ...p, buyer_name: e.target.value }))}
              placeholder={t('예: 김철수', '例: 金哲洙')}
            />
          </div>

          {/* 회사명 */}
          <div>
            <label className={label}>{t('회사명', '公司名称')}</label>
            <input
              className={inp}
              value={form.buyer_company}
              onChange={e => setForm(p => ({ ...p, buyer_company: e.target.value }))}
              placeholder={t('예: (주)ABC무역', '例: ABC贸易(株)')}
            />
          </div>
        </div>

        {/* 문의 연결 */}
        {requests.length > 0 && (
          <div>
            <label className={label}>📋 {t('문의 연결 (선택)', '关联问询（可选）')}</label>
            <select
              className={inp}
              value={form.request_id || ''}
              onChange={e => setForm(p => ({ ...p, request_id: e.target.value || null }))}
            >
              <option value="">{t('문의 선택 안 함', '不关联问询')}</option>
              {requests.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.service_type}] {r.title || r.id.slice(0, 8)} — {new Date(r.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 상품 정보 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div>
            <label className={label}>{t('상품명', '商品名称')}</label>
            <input
              className={inp}
              value={form.product_name}
              onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))}
              placeholder={t('예: LED 화장품 파우치', '例: LED化妆包')}
            />
          </div>
          <div>
            <label className={label}>{t('상품 설명 (간략)', '商品简介')}</label>
            <input
              className={inp}
              value={form.product_desc}
              onChange={e => setForm(p => ({ ...p, product_desc: e.target.value }))}
              placeholder={t('예: 크로스 PU 소재, 3가지 조명 모드', '例: 十字纹PU皮，3种灯光模式')}
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: 공장별 샘플 정보 ── */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 28, height: 28, background: '#667eea', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>2</span>
            {t('공장별 샘플 정보', '各工厂样品信息')}
            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>({form.factories.length}{t('개 공장', '个工厂')})</span>
          </h2>
          <button
            onClick={addFactory}
            style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            + {t('공장 추가', '添加工厂')}
          </button>
        </div>

        {form.factories.map((factory, idx) => (
          <div key={idx} style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', marginBottom: 20, overflow: 'hidden' }}>
            {/* 공장 헤더 */}
            <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {factory.cover_image ? (
                  <img src={factory.cover_image} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', border: '2px solid #c4b5fd' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏭</div>
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#5b21b6' }}>
                    {t('공장', '工厂')} {idx + 1}
                    {factory.factory_name && <span style={{ marginLeft: 8, color: '#374151' }}>— {factory.factory_name}</span>}
                  </div>
                  {factory.location && <div style={{ fontSize: 12, color: '#7c3aed' }}>📍 {factory.location}</div>}
                </div>
              </div>
              {form.factories.length > 1 && (
                <button
                  onClick={() => removeFactory(idx)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {t('삭제', '删除')}
                </button>
              )}
            </div>

            <div style={{ padding: '24px' }}>
              {/* 공장 기본 정보 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label className={label}>{t('공장명 (한국어)', '工厂名称（韩文）')}</label>
                  <input className={inp} value={factory.factory_name} onChange={e => updateFactory(idx, 'factory_name', e.target.value)} placeholder={t('예: 이우 봉제 공장', '例: 义乌缝制工厂')} />
                </div>
                <div>
                  <label className={label}>{t('공장명 (중국어)', '工厂名称（中文）')}</label>
                  <input className={inp} value={factory.factory_name_zh} onChange={e => updateFactory(idx, 'factory_name_zh', e.target.value)} placeholder="例: 义乌缝制工厂" />
                </div>
                <div>
                  <label className={label}>{t('위치', '位置')}</label>
                  <input className={inp} value={factory.location} onChange={e => updateFactory(idx, 'location', e.target.value)} placeholder={t('예: 저장성 이우시', '例: 浙江省义乌市')} />
                </div>
              </div>

              {/* 샘플 스펙 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                <div>
                  <label className={label}>⚖️ {t('중량 (g)', '重量 (g)')}</label>
                  <input className={inp} type="number" value={factory.weight_g} onChange={e => updateFactory(idx, 'weight_g', e.target.value)} placeholder="예: 350" />
                </div>
                <div>
                  <label className={label}>💰 {t('샘플 가격 (¥)', '样品价格 (¥)')}</label>
                  <input className={inp} type="number" value={factory.price_cny} onChange={e => updateFactory(idx, 'price_cny', e.target.value)} placeholder="예: 49" />
                </div>
                <div>
                  <label className={label}>📦 MOQ</label>
                  <input className={inp} type="number" value={factory.moq} onChange={e => updateFactory(idx, 'moq', e.target.value)} placeholder="예: 1000" />
                </div>
                <div>
                  <label className={label}>🚚 {t('리드타임 (일)', '交货期 (天)')}</label>
                  <input className={inp} type="number" value={factory.lead_time_days} onChange={e => updateFactory(idx, 'lead_time_days', e.target.value)} placeholder="예: 25" />
                </div>
              </div>

              {/* 사진 섹션 */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 20 }}>
                {/* 대표 사진 */}
                <div>
                  <label className={label}>📷 {t('대표 사진', '代表照片')}</label>
                  {factory.cover_image ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={factory.cover_image} alt="" style={{ width: 180, height: 180, borderRadius: 16, objectFit: 'cover', border: '2px solid #c4b5fd' }} />
                      <button
                        onClick={() => updateFactory(idx, 'cover_image', '')}
                        style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => coverRefs.current[idx]?.click()}
                      style={{ width: 180, height: 180, borderRadius: 16, border: '2px dashed #c4b5fd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#faf5ff', gap: 8 }}
                    >
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
                        {uploading === `cover-${idx}` ? t('업로드 중...', '上传中...') : t('대표 사진 업로드', '上传代表照片')}
                      </span>
                    </div>
                  )}
                  <input ref={el => { coverRefs.current[idx] = el; }} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(idx, f); e.target.value = ''; }} />
                </div>

                {/* 추가 사진 */}
                <div>
                  <label className={label}>🖼️ {t(`샘플 사진 (${factory.sample_photos.length}/8)`, `样品照片 (${factory.sample_photos.length}/8)`)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {factory.sample_photos.map((photo, pIdx) => (
                      <div key={pIdx} style={{ position: 'relative' }}>
                        <img src={photo} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                        <button
                          onClick={() => removePhoto(idx, pIdx)}
                          style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>
                      </div>
                    ))}
                    {factory.sample_photos.length < 8 && (
                      <div
                        onClick={() => photoRefs.current[idx]?.click()}
                        style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f9fafb', gap: 4 }}
                      >
                        <span style={{ fontSize: 20, color: '#9ca3af' }}>+</span>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>
                          {uploading === `photos-${idx}` ? '...' : t('추가', '添加')}
                        </span>
                      </div>
                    )}
                    <input ref={el => { photoRefs.current[idx] = el; }} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files) handlePhotosUpload(idx, e.target.files); e.target.value = ''; }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    {t('최대 8장까지 등록 가능합니다', '最多可上传8张照片')}
                  </p>
                </div>
              </div>

              {/* 메모 */}
              <div>
                <label className={label}>📝 {t('공장 메모', '工厂备注')}</label>
                <textarea
                  className={inp}
                  value={factory.note}
                  onChange={e => updateFactory(idx, 'note', e.target.value)}
                  placeholder={t('예: 샘플 품질 양호, 납기 준수 우수, 가격 협의 가능', '例: 样品质量良好，交期准时，价格可协商')}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* 공장 추가 버튼 (하단) */}
        <button
          onClick={addFactory}
          style={{ width: '100%', padding: '16px', borderRadius: 16, border: '2px dashed #c4b5fd', background: '#faf5ff', color: '#7c3aed', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          + {t('공장 추가', '添加工厂')}
        </button>
      </section>

      {/* ── SECTION 3: 내부 메모 ── */}
      <section style={{ background: '#fff', borderRadius: 20, padding: '28px', border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, background: '#667eea', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>3</span>
          {t('내부 메모 (바이어에게 미표시)', '内部备注（不向买家显示）')}
        </h2>
        <textarea
          className={inp}
          value={form.memo}
          onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
          placeholder={t('내부 참고사항을 입력하세요...', '请输入内部参考事项...')}
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </section>

      {/* ── 하단 액션 버튼 ── */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '12px 24px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#374151' }}
        >
          {saving ? t('저장 중...', '保存中...') : t('💾 임시저장', '💾 暂存')}
        </button>
        {savedId && (
          <button
            onClick={() => router.push(`/md/mvp/sample/report/${savedId}`)}
            style={{ padding: '12px 24px', borderRadius: 12, border: '1.5px solid #667eea', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#667eea' }}
          >
            {t('📄 상세 편집', '📄 详细编辑')}
          </button>
        )}
        <button
          onClick={() => {
            if (!sendEmail) { alert(t('발송 이메일을 입력해주세요', '请输入发送邮箱')); return; }
            setShowSendModal(true);
          }}
          style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          ✉️ {t('바이어에게 발송', '发送给买家')}
        </button>
      </div>

      {/* ── 발송 확인 모달 ── */}
      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '36px', maxWidth: 440, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            {sendResult === 'success' ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                  {t('발송 완료!', '发送成功！')}
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                  {sendEmail} {t('으로 샘플 발송 내역서가 발송되었습니다.', '已发送样品明细书。')}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button
                    onClick={() => { setShowSendModal(false); setSendResult(null); router.push('/md/samples'); }}
                    style={{ padding: '10px 24px', borderRadius: 10, background: '#667eea', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {t('목록으로', '返回列表')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                  ✉️ {t('발송 확인', '确认发送')}
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                  {t('아래 이메일로 샘플 발송 내역서를 발송합니다.', '将向以下邮箱发送样品明细书。')}
                </p>
                <div style={{ background: '#f5f3ff', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>{t('수신자', '收件人')}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{form.buyer_name || t('바이어', '买家')}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{sendEmail}</div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                    {t('이메일 주소 확인/수정', '确认/修改邮箱地址')}
                  </label>
                  <input
                    type="email"
                    value={sendEmail}
                    onChange={e => setSendEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {sendResult === 'error' && (
                  <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠️ {t('발송 중 오류가 발생했습니다.', '发送时出现错误。')}</p>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowSendModal(false); setSendResult(null); }}
                    style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                  >
                    {t('취소', '取消')}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: sending ? 0.7 : 1 }}
                  >
                    {sending ? t('발송 중...', '发送中...') : t('✉️ 발송하기', '✉️ 发送')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
