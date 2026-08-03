'use client';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Zap, AlertCircle, ImagePlus, Link2, X, Info, Send
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const CATEGORIES = [
  { value: 'toys_goods', label: '완구/굿즈', zh: '玩具/周边' },
  { value: 'bags_accessories', label: '가방/잡화', zh: '包包/杂货' },
  { value: 'fashion_apparel', label: '의류/패션', zh: '服装/时尚' },
  { value: 'homeware', label: '생활용품/인테리어', zh: '生活用品/家居' },
  { value: 'stationery', label: '문구/팬시', zh: '文具/精品' },
  { value: 'beauty_health', label: '뷰티/건강', zh: '美妆/健康' },
  { value: 'electronics', label: '전자/IT', zh: '电子/IT' },
  { value: 'food_beverage', label: '식품/음료', zh: '食品/饮料' },
  { value: 'sports_outdoor', label: '스포츠/아웃도어', zh: '运动/户外' },
  { value: 'other', label: '기타', zh: '其他' },
];
const SHIPPING_METHODS = [
  { value: 'air', label: '빠른 항공', zh: '空运' },
  { value: 'sea_fcl', label: '해상 FCL', zh: '整柜' },
  { value: 'sea_lcl', label: '해상 LCL', zh: '拼柜' },
  { value: 'undecided', label: '미정', zh: '未定' },
];
const DELIVERY_REGIONS = ['서울', '부산', '인천', '대구', '광주', '대전', '직접 입력'];
const QTY_UNITS = ['개', '세트', '박스', 'kg', 'm', '롤'];

interface ResearchItem {
  description: string;
  reference_image_urls: string[];
  desired_unit_price_hint: string;
  desired_qty_hint: string;
  desired_timing: string;
  wants_sample: boolean;
  category: string;
  category_detail: string;
  product_name_hint: string;
  material_spec: string;
  certification_req: string;
  delivery_region: string;
  delivery_region_custom: string;
  shipping_method: string;
  unit_price_min: string;
  unit_price_max: string;
  qty_unit: string;
  sample_qty: number;
  additional_notes: string;
}

const EMPTY_ITEM: ResearchItem = {
  description: '', reference_image_urls: [],
  desired_unit_price_hint: '', desired_qty_hint: '',
  desired_timing: '', wants_sample: false,
  category: '', category_detail: '', product_name_hint: '',
  material_spec: '', certification_req: '',
  delivery_region: '서울', delivery_region_custom: '',
  shipping_method: 'undecided',
  unit_price_min: '', unit_price_max: '',
  qty_unit: '개', sample_qty: 1, additional_notes: '',
};

const STEPS = [
  { label: '상품 정보', zh: '商品信息', icon: '📦' },
  { label: '요청 옵션', zh: '请求选项', icon: '⚙️' },
  { label: '제출 완료', zh: '提交完成', icon: '✅' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
  background: '#f8fafc', outline: 'none', minHeight: 44,
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const selectStyle: React.CSSProperties = { ...inputStyle };
const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', lineHeight: 1.6,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(102,126,234,0.08)',
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 14,
  paddingBottom: 12, borderBottom: '2px solid #f1f5f9',
  display: 'flex', alignItems: 'center', gap: 8,
};
const accentBarStyle: React.CSSProperties = {
  width: 4, height: 18, borderRadius: 2,
  background: 'linear-gradient(135deg,#667eea,#764ba2)',
  display: 'inline-block', flexShrink: 0,
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '13px 24px', borderRadius: 12,
  background: 'linear-gradient(135deg,#667eea,#764ba2)',
  color: '#fff', fontSize: 14, fontWeight: 700, border: 'none',
  cursor: 'pointer', boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: '13px 20px', borderRadius: 12,
  border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
};
const stickyBarStyle: React.CSSProperties = {
  position: 'sticky', bottom: 16, background: '#fff', borderRadius: 16,
  padding: '16px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
  display: 'flex', gap: 10, zIndex: 10,
};

export default function NewResearchPage() {
  const { lang, setLang } = useLangContext();
  const router = useRouter();
  const supabase = createClient();
  const [seller, setSeller] = useState<any>(null);
  const [items, setItems] = useState<ResearchItem[]>([{ ...EMPTY_ITEM }]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);

  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }
      const { data: s } = await supabase.from('sellers')
        .select('id,business_name,current_grade,current_membership,assigned_md_id')
        .eq('user_id', user.id).single();
      setSeller(s);
    })();
  }, [router, supabase]);

  function patchItem(idx: number, patch: Partial<ResearchItem>) {
    setItems(cur => cur.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function addItem() {
    if (items.length < 10) {
      setItems(cur => [...cur, { ...EMPTY_ITEM }]);
      setActiveItemIdx(items.length);
    }
  }
  function removeItem(idx: number) {
    if (items.length > 1) {
      setItems(cur => cur.filter((_, i) => i !== idx));
      setActiveItemIdx(Math.max(0, idx - 1));
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (uploadingFor === null) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const idx = uploadingFor;
    const newUrls: string[] = [];
    for (const file of files) {
      if (!seller?.id) continue;
      const path = `${seller.id}/${Date.now()}-${file.name}`;
      const { data: uploaded, error: upErr } = await supabase.storage
        .from('research-references').upload(path, file);
      if (upErr || !uploaded) continue;
      const { data: signed } = await supabase.storage
        .from('research-references').createSignedUrl(uploaded.path, 60 * 60 * 24 * 90);
      if (signed) newUrls.push(signed.signedUrl);
    }
    if (newUrls.length) {
      patchItem(idx, { reference_image_urls: [...items[idx].reference_image_urls, ...newUrls].slice(0, 5) });
    }
    setUploadingFor(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function validateStep1() {
    for (const it of items) {
      if (!it.category) { setError(t('카테고리를 선택해 주세요.', '请选择商品类别。')); return false; }
      if (!it.product_name_hint.trim()) { setError(t('상품명/키워드를 입력해 주세요.', '请输入商品名称/关键词。')); return false; }
      if (it.description.trim().length < 10) { setError(t('상품 설명을 10자 이상 입력해 주세요.', '请输入至少10个字的商品说明。')); return false; }
    }
    setError(null); return true;
  }

  async function submit() {
    setError(null); setSubmitting(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(it => ({
            description: it.description.trim(),
            reference_image_urls: it.reference_image_urls,
            desired_unit_price_hint: it.unit_price_min && it.unit_price_max
              ? `¥${it.unit_price_min}~${it.unit_price_max}`
              : it.desired_unit_price_hint || undefined,
            desired_qty_hint: it.desired_qty_hint ? `${it.desired_qty_hint}${it.qty_unit}` : undefined,
            desired_timing: it.desired_timing || undefined,
            wants_sample: it.wants_sample,
            additional_notes: [
              it.category ? `카테고리: ${CATEGORIES.find(c => c.value === it.category)?.label}` : '',
              it.category_detail ? `세부: ${it.category_detail}` : '',
              it.product_name_hint ? `키워드: ${it.product_name_hint}` : '',
              it.material_spec ? `소재: ${it.material_spec}` : '',
              it.certification_req ? `인증: ${it.certification_req}` : '',
              it.delivery_region ? `납품지: ${it.delivery_region === '직접 입력' ? it.delivery_region_custom : it.delivery_region}` : '',
              it.shipping_method !== 'undecided' ? `배송: ${SHIPPING_METHODS.find(s => s.value === it.shipping_method)?.label}` : '',
              it.additional_notes ? `메모: ${it.additional_notes}` : '',
            ].filter(Boolean).join(' | ') || undefined,
          })),
          is_urgent: isUrgent,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? t('제출에 실패했습니다.', '提交失败。'));
        return;
      }
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isVip = seller?.current_membership && seller.current_membership !== 'free';

  return (
    <main style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#f8f9ff 0%,#f0f0ff 50%,#f8f9ff 100%)', paddingBottom: 80 }}>
      {/* 언어 전환 */}
      <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 100 }}>
        <button onClick={() => setLang(lang === 'ko' ? 'zh' : 'ko')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: '#667eea', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(102,126,234,0.4)' }}>
          🌐 {lang === 'ko' ? '中文' : '한국어'}
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 0' }}>
        {/* 히어로 헤더 */}
        <div style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', borderRadius: 20, padding: '28px 24px', marginBottom: 20, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <Link href="/seller/research" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 14, position: 'relative', zIndex: 1 }}>
            <ArrowLeft size={15} /> {t('시장조사 목록', '市场调研列表')}
          </Link>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
              🔍 {t('시장조사 신청', '市场调研申请')}
            </div>
            <div style={{ fontSize: 'clamp(1.3rem,4vw,1.7rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
              {t('시장조사 & 공장 매칭 요청', '市场调研 & 工厂匹配申请')}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
              {t('원하는 상품 정보를 입력하면 전담 MD가 중국 현지 조사를 진행합니다', '输入所需商品信息，专属MD将进行中国本地调研')}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { icon: '⏱️', ko: '2~7일 내 보고서', zh: '2-7天内报告' },
                { icon: '🏭', ko: '공급업체 비교 견적', zh: '供应商比较报价' },
                { icon: '📦', ko: '샘플 연결 원스톱', zh: '样品一站式连接' },
              ].map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  <span>{v.icon}</span><span>{t(v.ko, v.zh)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setInfoOpen(!infoOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Info size={13} /> {t('이용 안내', '使用说明')} {infoOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {infoOpen && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, lineHeight: 1.8, opacity: 0.9 }}>
                <p>• {t('상품 1개 = 1건 차감 · 응답 2~7일 · 보고서는 운영자 승인 후 발송', '商品1个 = 扣除1次 · 响应2-7天 · 报告经运营商审批后发送')}</p>
                <p>• {t('샘플 신청 시 제작비 + 국내 배송비 실비 청구', '申请样品时按实际收取制作费+国内运费')}</p>
                <p>• {t('긴급 요청 시 +1건 추가 차감 (2~3일 이내 처리)', '紧急请求额外扣除+1次（2-3天内处理）')}</p>
                <p>• {t('VIP/무제한 멤버십은 차감 없이 이용 가능', 'VIP/无限会员无需扣除即可使用')}</p>
              </div>
            )}
          </div>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: 16, padding: 6, boxShadow: '0 2px 12px rgba(102,126,234,0.1)', marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {STEPS.map((s, i) => {
            const isActive = i + 1 === step;
            const isDone = i + 1 < step;
            return (
              <div key={i} style={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', borderRadius: 12, background: isActive ? 'linear-gradient(135deg,#667eea,#764ba2)' : isDone ? '#f0fdf4' : 'transparent', transition: 'all 0.2s' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: isActive ? 'rgba(255,255,255,0.25)' : isDone ? '#16a34a' : 'rgba(0,0,0,0.08)', color: isActive ? '#fff' : isDone ? '#fff' : '#94a3b8' }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#fff' : isDone ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>{s.icon} {t(s.label, s.zh)}</span>
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: 상품 정보 ── */}
        {step === 1 && (
          <div>
            {/* 상품 탭 */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
              {items.map((_, i) => (
                <button key={i} onClick={() => setActiveItemIdx(i)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 10, border: activeItemIdx === i ? 'none' : '1.5px solid #e2e8f0', background: activeItemIdx === i ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#fff', color: activeItemIdx === i ? '#fff' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {t(`상품 ${i + 1}`, `商品 ${i + 1}`)}
                </button>
              ))}
              {items.length < 10 && (
                <button onClick={addItem} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 10, border: '1.5px dashed #c4c4fd', background: '#f8f9ff', color: '#667eea', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={13} /> {t('상품 추가', '添加商品')}
                </button>
              )}
            </div>

            {items.map((it, idx) => (
              <div key={idx} style={{ display: items.length > 1 && idx !== activeItemIdx ? 'none' : 'block' }}>
                <div style={{ background: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(102,126,234,0.12)' }}>
                  {/* 카드 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'linear-gradient(135deg,#f8f9ff,#f0f0ff)', borderBottom: '1px solid rgba(102,126,234,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{idx + 1}</div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{t(`상품 ${idx + 1} 정보`, `商品 ${idx + 1} 信息`)}</span>
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ padding: 20 }}>
                    {/* 카테고리 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>{t('상품 카테고리', '商品类别')} <span style={{ color: '#e11d48' }}>*</span></label>
                        <select value={it.category} onChange={e => patchItem(idx, { category: e.target.value })} style={selectStyle}>
                          <option value="">{t('카테고리 선택', '选择类别')}</option>
                          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{lang === 'zh' ? c.zh : c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t('세부 카테고리', '细分类别')}</label>
                        <input type="text" value={it.category_detail} onChange={e => patchItem(idx, { category_detail: e.target.value })} placeholder={t('예: 뽑기용 피규어', '例：扭蛋用手办')} style={inputStyle} />
                      </div>
                    </div>

                    {/* 상품명 */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{t('상품명 / 키워드', '商品名称/关键词')} <span style={{ color: '#e11d48' }}>*</span></label>
                      <input type="text" value={it.product_name_hint} onChange={e => patchItem(idx, { product_name_hint: e.target.value })} placeholder={t('예: 방풍 자켓, 3레이어, 남성용', '例：防风夹克，三层，男款')} style={inputStyle} />
                    </div>

                    {/* 상세 설명 */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{t('상세 설명', '详细说明')} <span style={{ color: '#e11d48' }}>*</span></label>
                      <textarea value={it.description} onChange={e => patchItem(idx, { description: e.target.value })} placeholder={t('원하는 상품의 특징, 용도, 타겟 고객, 경쟁 제품 등을 자세히 설명해 주세요.', '请详细描述所需商品的特点、用途、目标客户、竞品等信息。')} rows={4} style={textareaStyle} />
                    </div>

                    {/* 소재/스펙 & 인증/라벨 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>{t('소재 / 스펙 요건', '材质/规格要求')}</label>
                        <textarea value={it.material_spec} onChange={e => patchItem(idx, { material_spec: e.target.value })} placeholder={t('예: 폴리에스터 100%, 방수 처리', '例：100%涤纶，防水处理')} rows={3} style={textareaStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t('인증 / 라벨 요건', '认证/标签要求')}</label>
                        <textarea value={it.certification_req} onChange={e => patchItem(idx, { certification_req: e.target.value })} placeholder={t('예: KC인증 필요, 한국어 라벨', '例：需KC认证，韩语标签')} rows={3} style={textareaStyle} />
                      </div>
                    </div>

                    {/* 희망 단가 */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{t('희망 단가 (FOB 기준, ¥위안)', '期望单价（FOB基准，¥人民币）')}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 120, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', minHeight: 44 }}>
                          <span style={{ padding: '0 10px', fontSize: 13, color: '#667eea', fontWeight: 700, borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>¥ {t('최소', '最低')}</span>
                          <input type="number" value={it.unit_price_min} onChange={e => patchItem(idx, { unit_price_min: e.target.value })} placeholder="0.00" style={{ flex: 1, padding: '10px 10px', border: 'none', background: 'transparent', fontSize: 14, outline: 'none', minWidth: 0 }} />
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: 16, flexShrink: 0 }}>~</span>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 120, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', minHeight: 44 }}>
                          <span style={{ padding: '0 10px', fontSize: 13, color: '#667eea', fontWeight: 700, borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>¥ {t('최대', '最高')}</span>
                          <input type="number" value={it.unit_price_max} onChange={e => patchItem(idx, { unit_price_max: e.target.value })} placeholder="0.00" style={{ flex: 1, padding: '10px 10px', border: 'none', background: 'transparent', fontSize: 14, outline: 'none', minWidth: 0 }} />
                        </div>
                      </div>
                    </div>

                    {/* 수량 & 시기 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>{t('예상 주문 수량', '预计订购数量')}</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input type="number" value={it.desired_qty_hint} onChange={e => patchItem(idx, { desired_qty_hint: e.target.value })} placeholder="1000" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
                          <select value={it.qty_unit} onChange={e => patchItem(idx, { qty_unit: e.target.value })} style={{ width: 70, padding: '10px 8px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#f8fafc', outline: 'none', minHeight: 44 }}>
                            {QTY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>{t('필요 시기', '需要时间')}</label>
                        <input type="text" value={it.desired_timing} onChange={e => patchItem(idx, { desired_timing: e.target.value })} placeholder={t('예: 2026년 3월, 2개월 내', '例：2026年3月，2个月内')} style={inputStyle} />
                      </div>
                    </div>

                    {/* 납품 지역 & 배송 방식 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>{t('납품 지역', '交货地区')}</label>
                        <select value={it.delivery_region} onChange={e => patchItem(idx, { delivery_region: e.target.value })} style={selectStyle}>
                          {DELIVERY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t('배송 방식', '运输方式')}</label>
                        <select value={it.shipping_method} onChange={e => patchItem(idx, { shipping_method: e.target.value })} style={selectStyle}>
                          {SHIPPING_METHODS.map(m => <option key={m.value} value={m.value}>{lang === 'zh' ? m.zh : m.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* 참고 사진 */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{t('참고 사진 (최대 5장)', '参考图片（最多5张）')}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 8 }}>
                        {Array(5).fill(null).map((_, i) => (
                          <div key={i} style={{ aspectRatio: '1', position: 'relative' }}>
                            {it.reference_image_urls[i] ? (
                              <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <Image src={it.reference_image_urls[i]} alt={`참고사진 ${i + 1}`} fill style={{ objectFit: 'cover' }} />
                                <button onClick={() => patchItem(idx, { reference_image_urls: it.reference_image_urls.filter((_, j) => j !== i) })} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <X size={10} color="#fff" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => { setUploadingFor(idx); setTimeout(() => fileRef.current?.click(), 0); }} style={{ width: '100%', height: '100%', borderRadius: 10, border: `2px dashed ${i === 0 ? '#c4c4fd' : '#e2e8f0'}`, background: i === 0 ? '#f8f9ff' : '#fafafa', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <ImagePlus size={16} color={i === 0 ? '#667eea' : '#cbd5e1'} />
                                <span style={{ fontSize: 9, color: i === 0 ? '#667eea' : '#cbd5e1', fontWeight: 600 }}>{i === 0 ? t('필수', '必须') : `${i + 1}`}</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 11, color: '#94a3b8' }}>JPG, PNG, WEBP · {t('최대 10MB · 최대 5장', '最大10MB · 最多5张')}</p>
                    </div>

                    {/* 참고 링크 */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{t('참고 링크 (타오바오, 1688, 아마존 등)', '参考链接（淘宝、1688、亚马逊等）')}</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', minHeight: 44 }}>
                        <span style={{ padding: '0 12px', borderRight: '1px solid #e2e8f0' }}><Link2 size={15} color="#94a3b8" /></span>
                        <input type="url" value={it.additional_notes} onChange={e => patchItem(idx, { additional_notes: e.target.value })} placeholder="https://..." style={{ flex: 1, padding: '10px 12px', border: 'none', background: 'transparent', fontSize: 14, outline: 'none', minWidth: 0 }} />
                      </div>
                    </div>

                    {/* 샘플 신청 */}
                    <div style={{ background: 'linear-gradient(135deg,#f0f0ff,#faf5ff)', border: '1px solid #c4c4fd', borderRadius: 12, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: it.wants_sample ? 12 : 0 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#4338ca', marginBottom: 2 }}>📦 {t('샘플 신청', '申请样品')}</div>
                          <div style={{ fontSize: 12, color: '#6366f1' }}>{t('제작비 + 국내 배송비 실비 청구', '按实际收取制作费+国内运费')}</div>
                        </div>
                        <button onClick={() => patchItem(idx, { wants_sample: !it.wants_sample })} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', background: it.wants_sample ? '#667eea' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: it.wants_sample ? 25 : 3, transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                        </button>
                      </div>
                      {it.wants_sample && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 13, color: '#4338ca', fontWeight: 600 }}>{t('샘플 수량:', '样品数量:')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => patchItem(idx, { sample_qty: Math.max(1, it.sample_qty - 1) })} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #c4c4fd', background: '#fff', cursor: 'pointer', fontSize: 16, color: '#667eea', fontWeight: 700 }}>−</button>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#4338ca', minWidth: 32, textAlign: 'center' }}>{it.sample_qty}</span>
                            <button onClick={() => patchItem(idx, { sample_qty: Math.min(10, it.sample_qty + 1) })} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #c4c4fd', background: '#fff', cursor: 'pointer', fontSize: 16, color: '#667eea', fontWeight: 700 }}>+</button>
                          </div>
                          <span style={{ fontSize: 12, color: '#6366f1' }}>{t('개', '个')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, color: '#be123c', fontSize: 13, marginBottom: 16 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div style={stickyBarStyle}>
              <Link href="/seller/research" style={{ ...secondaryBtnStyle, flex: 1, textDecoration: 'none' }}>
                <ArrowLeft size={15} /> {t('취소', '取消')}
              </Link>
              <button onClick={() => { if (validateStep1()) setStep(2); }} style={{ ...primaryBtnStyle, flex: 2 }}>
                {t('다음 단계', '下一步')} →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 요청 옵션 ── */}
        {step === 2 && (
          <div>
            {/* 요청 요약 */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}><span style={accentBarStyle} />{t('요청 요약', '请求摘要')}</div>
              {items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{it.product_name_hint || t('(상품명 미입력)', '（未输入商品名）')}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {CATEGORIES.find(c => c.value === it.category)?.[lang === 'zh' ? 'zh' : 'label'] ?? t('카테고리 미선택', '未选择类别')}
                      {it.desired_qty_hint && ` · ${it.desired_qty_hint}${it.qty_unit}`}
                      {(it.unit_price_min || it.unit_price_max) && ` · ¥${it.unit_price_min || '?'}~¥${it.unit_price_max || '?'}`}
                    </div>
                    {it.wants_sample && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', borderRadius: 99, background: '#f0f0ff', color: '#667eea', fontSize: 11, fontWeight: 600, border: '1px solid #c4c4fd' }}>
                        📦 {t(`샘플 ${it.sample_qty}개`, `样品${it.sample_qty}个`)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 처리 우선순위 */}
            <div style={cardStyle}>
              <div style={sectionTitleStyle}><span style={accentBarStyle} />{t('처리 우선순위', '处理优先级')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                <button onClick={() => setIsUrgent(false)} style={{ padding: 16, borderRadius: 14, border: `2px solid ${!isUrgent ? '#667eea' : '#e2e8f0'}`, background: !isUrgent ? 'linear-gradient(135deg,#f0f0ff,#faf5ff)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Clock size={20} color={!isUrgent ? '#667eea' : '#94a3b8'} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: !isUrgent ? '#4338ca' : '#64748b' }}>{t('표준', '标准')}</span>
                    {!isUrgent && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#667eea', background: '#e0e7ff', padding: '2px 8px', borderRadius: 99 }}>✓ {t('선택됨', '已选择')}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: !isUrgent ? '#667eea' : '#94a3b8', marginBottom: 4 }}>{t('7일 이내 처리', '7天以内处理')}</div>
                  <div style={{ fontSize: 12, color: !isUrgent ? '#6366f1' : '#94a3b8' }}>{t('기본 포함 · 추가 차감 없음', '基本包含 · 无额外扣除')}</div>
                  {isVip && <div style={{ marginTop: 8, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>👑 {t('VIP 무제한', 'VIP无限制')}</div>}
                </button>
                <button onClick={() => setIsUrgent(true)} style={{ padding: 16, borderRadius: 14, border: `2px solid ${isUrgent ? '#f59e0b' : '#e2e8f0'}`, background: isUrgent ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Zap size={20} color={isUrgent ? '#f59e0b' : '#94a3b8'} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: isUrgent ? '#92400e' : '#64748b' }}>{t('긴급', '紧急')}</span>
                    {isUrgent && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 99 }}>⚡ {t('선택됨', '已选择')}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: isUrgent ? '#d97706' : '#94a3b8', marginBottom: 4 }}>{t('2~3일 이내 처리', '2-3天以内处理')}</div>
                  <div style={{ fontSize: 12, color: isUrgent ? '#b45309' : '#94a3b8' }}>{t('우선 MD 배정 · +1건 추가 차감', '优先MD分配 · +1额外扣除')}</div>
                </button>
              </div>
            </div>

            {/* 진행 흐름 */}
            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>{t('📋 제출 후 진행 흐름', '📋 提交后处理流程')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
                {[
                  { label: t('요청 접수', '请求接收'), icon: '✅', color: '#10b981' },
                  { label: t('MD 배정', 'MD分配'), icon: '👤', color: '#667eea' },
                  { label: t('현지 조사', '本地调查'), icon: '🔍', color: '#f59e0b' },
                  { label: t('보고서 발송', '报告发送'), icon: '📄', color: '#8b5cf6' },
                ].map((s, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 60 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${s.color}15`, border: `2px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 6 }}>{s.icon}</div>
                      <span style={{ fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ width: 20, height: 2, background: '#e2e8f0', flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>{t('당일 접수 → MD 배정 → 2~7일 내 보고서 수령', '当天接收 → MD分配 → 2-7天内收到报告')}</p>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, color: '#be123c', fontSize: 13, marginBottom: 16 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div style={stickyBarStyle}>
              <button onClick={() => setStep(1)} style={{ ...secondaryBtnStyle, flex: 1 }}>← {t('이전', '上一步')}</button>
              <button onClick={submit} disabled={submitting} style={{ ...primaryBtnStyle, flex: 2, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> {t('전송 중…', '发送中…')}</>
                ) : (
                  <><Send size={16} /> {t('MD에게 시장조사 요청 보내기', '向MD发送市场调研请求')}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: 완료 ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: '48px 32px', boxShadow: '0 8px 32px rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.12)', maxWidth: 480, margin: '0 auto' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', marginBottom: 8, letterSpacing: '-0.03em' }}>{t('시장조사 요청 완료!', '市场调研申请完成！')}</div>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.7 }}>{t('전담 MD가 배정되어 2~7일 내 보고서를 발송해 드립니다.', '专属MD将在2-7天内发送调研报告。')}</div>
              <div style={{ background: 'linear-gradient(135deg,#f0f0ff,#faf5ff)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
                {[
                  { step: '1', label: t('요청 접수 완료', '请求接收完成'), done: true },
                  { step: '2', label: t('MD 배정 중 (1~2시간)', 'MD分配中（1-2小时）'), done: false },
                  { step: '3', label: t('현지 조사 진행 (2~7일)', '本地调查进行中（2-7天）'), done: false },
                  { step: '4', label: t('보고서 발송', '报告发送'), done: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(102,126,234,0.1)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.done ? '#16a34a' : '#e2e8f0', color: s.done ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.done ? '✓' : s.step}</div>
                    <span style={{ fontSize: 13, color: s.done ? '#16a34a' : '#64748b', fontWeight: s.done ? 700 : 500 }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/seller/research" style={{ padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(102,126,234,0.4)' }}>
                  {t('시장조사 목록 보기', '查看市场调研列表')} →
                </Link>
                <Link href="/seller" style={{ padding: '13px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('대시보드로 이동', '返回仪表板')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
