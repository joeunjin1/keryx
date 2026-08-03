'use client';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';
import dynamic from 'next/dynamic';
import type { PricingTier } from '@/components/product/PricingTiersEditor';
import type { ProductVariant } from '@/components/product/VariantsEditor';

const PricingTiersEditor = dynamic(() => import('@/components/product/PricingTiersEditor'), {
  ssr: false,
  loading: () => <div className="h-20 bg-stone-100 animate-pulse rounded" />,
});
const VariantsEditor = dynamic(() => import('@/components/product/VariantsEditor'), {
  ssr: false,
  loading: () => <div className="h-20 bg-stone-100 animate-pulse rounded" />,
});

const BRAND = '#e11d48';
const STEPS = ['기본정보', '상세스펙', '물류/포장', '이미지', '가격/SEO'];
const STEPS_ZH = ['基本信息', '详细规格', '物流/包装', '图片', '价格/SEO'];

const SUPPLIER_TYPES = [
  { value: 'IP독점상품개발가능', label: 'IP 독점 상품 개발 가능', zh: 'IP独家商品开发可能' },
  { value: 'IP일부독점개발가능', label: 'IP 일부 독점 개발 가능', zh: 'IP部分独家开发可能' },
  { value: 'IP디자인요청가능', label: 'IP 디자인 요청 가능', zh: 'IP设计定制可能' },
  { value: 'IP단순구매만가능', label: 'IP 단순 구매만 가능', zh: '仅可普通采购' },
  { value: 'PB봉제중대형', label: 'PB 봉제 중·대형', zh: 'PB缝制中大型' },
  { value: 'PB봉제중소형', label: 'PB 봉제 중·소형', zh: 'PB缝制中小型' },
  { value: 'PB기타', label: 'PB 기타', zh: 'PB其他' },
];

const CERT_OPTIONS = ['KC인증', 'CE인증', 'ROHS', 'REACH', 'FDA', '식품안전인증', '어린이제품안전인증', '기타'];
const PRINT_OPTIONS = ['실크스크린', '열전사', '레이저각인', 'UV인쇄', '디지털인쇄', '자수', '오프셋인쇄', '패드인쇄'];

export default function NewFactoryProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit') ?? null; // ?edit=UUID 수정 모드
  const supabase = createClient() as any;
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const [step, setStep] = useState(0);
  const [factory, setFactory] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(!!editId); // 수정 모드일 때 로딩 상태
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [ips, setIps] = useState<any[]>([]);

  // ── STEP 0: 기본 정보 ─────────────────────────────────────────
  const [nameZh, setNameZh] = useState('');
  const [nameKo, setNameKo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [brandName, setBrandName] = useState('');
  const [originCountry, setOriginCountry] = useState('중국');
  const [categoryId, setCategoryId] = useState('');
  const [supplierType, setSupplierType] = useState('PB기타');
  const [ipId, setIpId] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productTags, setProductTags] = useState('');
  const [descriptionZh, setDescriptionZh] = useState('');
  const [descriptionKo, setDescriptionKo] = useState('');
  const [cautionKo, setCautionKo] = useState('');
  const [cautionZh, setCautionZh] = useState('');

  // ── STEP 1: 상세 스펙 ─────────────────────────────────────────
  const [sizeMm, setSizeMm] = useState('');
  const [productSizeCm, setProductSizeCm] = useState('');
  const [weightG, setWeightG] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [materialDetail, setMaterialDetail] = useState('');
  const [materialZh, setMaterialZh] = useState('');
  const [colors, setColors] = useState('');
  const [sizes, setSizes] = useState('');
  const [printMethods, setPrintMethods] = useState<string[]>([]);
  const [packagingDetail, setPackagingDetail] = useState('');
  const [surfaceTreatment, setSurfaceTreatment] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [safetyWarnings, setSafetyWarnings] = useState('');
  const [ageRestriction, setAgeRestriction] = useState('');
  const [customizable, setCustomizable] = useState(false);
  const [oemAvailable, setOemAvailable] = useState(false);
  const [odmAvailable, setOdmAvailable] = useState(false);
  const [ndaAvailable, setNdaAvailable] = useState(false);

  // ── STEP 2: 물류/포장 ─────────────────────────────────────────
  const [boxL, setBoxL] = useState('');
  const [boxW, setBoxW] = useState('');
  const [boxH, setBoxH] = useState('');
  const [cbmPerBox, setCbmPerBox] = useState('');
  const [pcsPerBox, setPcsPerBox] = useState('');
  const [innerBoxPcs, setInnerBoxPcs] = useState('');
  const [outerBoxPcs, setOuterBoxPcs] = useState('');
  const [grossWeightKg, setGrossWeightKg] = useState('');
  const [leadTime, setLeadTime] = useState('25');
  const [moq, setMoq] = useState('1000');
  const [sampleCost, setSampleCost] = useState('30');

  // CBM 자동 계산
  const autoCbm = boxL && boxW && boxH
    ? (parseFloat(boxL) * parseFloat(boxW) * parseFloat(boxH) / 1000000).toFixed(5)
    : '';

  // ── STEP 3: 이미지 ────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // ── STEP 4: 가격/SEO ──────────────────────────────────────────
  const [unitPrice, setUnitPrice] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [priceKrw, setPriceKrw] = useState('');
  const [stockQty, setStockQty] = useState('0');
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([{ min_qty: 100, unit_price_cny: 0 }]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [searchKeywords, setSearchKeywords] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=factory'); return; }

      const { data: profile } = await supabase.from('user_profiles').select('kind, display_name').eq('id', user.id).single();
      const isAdmin = profile?.kind === 'admin' || profile?.kind === 'md';

      let f: any = null;
      if (!isAdmin) {
        const { data } = await supabase.from('factories').select('id, factory_code, company_name, company_name_ko').eq('shared_login_user_id', user.id).single();
        if (!data) { router.push('/factory'); return; }
        f = data;
      } else {
        const { data } = await supabase.from('factories').select('id, factory_code, company_name, company_name_ko').limit(1).single();
        f = data;
      }
      setFactory(f);

      const [catRes, matRes, ipRes] = await Promise.all([
        supabase.from('categories').select('id, code, name_ko, name_zh').eq('is_active', true).order('display_order'),
        supabase.from('materials').select('id, name_ko, name_zh').eq('is_active', true),
        supabase.from('ips').select('id, code, name_ko, is_own_ip').eq('is_active', true),
      ]);
      setCategories(catRes.data ?? []);
      setMaterials(matRes.data ?? []);
      setIps(ipRes.data ?? []);

      // ── 수정 모드: 기존 상품 데이터 로딩 ──────────────────────────
      if (editId) {
        const { data: prod } = await supabase
          .from('products')
          .select('*')
          .eq('id', editId)
          .single();
        if (prod) {
          // STEP 0: 기본 정보
          setNameZh(prod.name_zh ?? '');
          setNameKo(prod.name_ko ?? '');
          setNameEn(prod.name_en ?? '');
          setBrandName(prod.brand_name ?? '');
          setOriginCountry(prod.origin_country ?? '중국');
          setCategoryId(prod.category_id ?? '');
          setSupplierType(prod.supplier_type ?? 'PB기타');
          setIpId(prod.ip_id ?? '');
          setHsCode(prod.hs_code ?? '');
          setBarcode(prod.barcode ?? '');
          setProductCode(prod.product_code ?? '');
          setProductTags(Array.isArray(prod.product_tags) ? prod.product_tags.join(', ') : (prod.product_tags ?? ''));
          setDescriptionZh(prod.description_zh ?? '');
          setDescriptionKo(prod.description_ko ?? '');
          setCautionKo(prod.caution_ko ?? '');
          setCautionZh(prod.caution_zh ?? '');
          // STEP 1: 상세 스펙
          setSizeMm(prod.size_mm ?? '');
          setProductSizeCm(prod.product_size_cm ?? '');
          setWeightG(prod.weight_g ? String(prod.weight_g) : '');
          setMaterialId(prod.primary_material_id ?? '');
          setMaterialDetail(prod.material_detail ?? '');
          setMaterialZh(prod.material_zh ?? '');
          setColors(Array.isArray(prod.colors) ? prod.colors.join(', ') : '');
          setSizes(Array.isArray(prod.sizes) ? prod.sizes.join(', ') : '');
          setPrintMethods(Array.isArray(prod.print_methods) ? prod.print_methods : []);
          setPackagingDetail(prod.packaging_detail ?? '');
          setSurfaceTreatment(prod.surface_treatment ?? '');
          setCertifications(Array.isArray(prod.certifications) ? prod.certifications : []);
          setSafetyWarnings(prod.safety_warnings ?? '');
          setAgeRestriction(prod.age_restriction ?? '');
          setCustomizable(prod.customizable ?? false);
          setOemAvailable(prod.oem_available ?? false);
          setOdmAvailable(prod.odm_available ?? false);
          setNdaAvailable(prod.nda_available ?? false);
          // STEP 2: 물류/포장
          setBoxL(prod.box_length_cm ? String(prod.box_length_cm) : '');
          setBoxW(prod.box_width_cm ? String(prod.box_width_cm) : '');
          setBoxH(prod.box_height_cm ? String(prod.box_height_cm) : '');
          setCbmPerBox(prod.cbm_per_box ? String(prod.cbm_per_box) : '');
          setPcsPerBox(prod.pcs_per_box ? String(prod.pcs_per_box) : '');
          setInnerBoxPcs(prod.inner_box_pcs ? String(prod.inner_box_pcs) : '');
          setOuterBoxPcs(prod.outer_box_pcs ? String(prod.outer_box_pcs) : '');
          setGrossWeightKg(prod.gross_weight_kg ? String(prod.gross_weight_kg) : '');
          setLeadTime(prod.lead_time_days ? String(prod.lead_time_days) : '25');
          setMoq(prod.moq ? String(prod.moq) : '1000');
          setSampleCost(prod.sample_cost_cny ? String(prod.sample_cost_cny) : '30');
          // STEP 3: 이미지 - Public URL로 변환
          const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
          const rawUrls: string[] = prod.image_urls ?? (prod.image_url ? [prod.image_url] : []);
          const publicUrls = rawUrls.map((u: string) => {
            if (u.includes('/storage/v1/object/public/')) return u;
            const signedMatch = u.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
            if (signedMatch) return `${SUPABASE_URL}/storage/v1/object/public/${signedMatch[1]}`;
            return u;
          });
          setImageUrls(publicUrls);
          setDetailImages(Array.isArray(prod.detail_images) ? prod.detail_images : []);
          setVideoUrl(prod.video_url ?? '');
          // STEP 4: 가격/SEO
          setUnitPrice(prod.sell_price_cny ? String(prod.sell_price_cny) : (prod.supply_price_cny ? String(prod.supply_price_cny) : ''));
          setPriceUsd(prod.price_usd ? String(prod.price_usd) : '');
          setPriceKrw(prod.price_krw ? String(prod.price_krw) : '');
          setStockQty(prod.stock_qty ? String(prod.stock_qty) : '0');
          setPricingTiers(Array.isArray(prod.pricing_tiers) && prod.pricing_tiers.length > 0 ? prod.pricing_tiers : [{ min_qty: 100, unit_price_cny: 0 }]);
          setVariants(Array.isArray(prod.variants) ? prod.variants : []);
          setSearchKeywords(prod.search_keywords ?? '');
          setSeoTitle(prod.seo_title_ko ?? '');
          setSeoDesc(prod.seo_desc_ko ?? '');
        }
        setEditLoading(false);
      }
    })();
  }, [editId]);

  async function uploadImages(files: File[], bucket = 'product-images', prefix = 'products') {
    if (!factory) return [];
    const uploaded: string[] = [];
    const errors: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) { errors.push(`${file.name}: 15MB 초과`); continue; }
      if (!file.type.startsWith('image/')) { errors.push(`${file.name}: 이미지만 가능`); continue; }
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${factory.factory_code ?? 'factory'}/${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (uploadErr) { errors.push(`${file.name}: ${uploadErr.message}`); continue; }
      // Public 버킷이므로 만료 없는 Public URL 사용 (Signed URL은 만료 시 이미지 깨짐)
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      if (publicData?.publicUrl) uploaded.push(publicData.publicUrl);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setUploadErrors(errors);
    return uploaded;
  }

  async function handleMainImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setUploadProgress(0);
    const urls = await uploadImages(files, 'product-images', 'products');
    setImageUrls(cur => [...cur, ...urls].slice(0, 20));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDetailImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setUploadProgress(0);
    const urls = await uploadImages(files, 'product-images', 'detail');
    setDetailImages(cur => [...cur, ...urls].slice(0, 30));
    setUploading(false);
    if (detailFileRef.current) detailFileRef.current.value = '';
  }

  function toggleArray(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  async function submit() {
    setError(null);
    if (!nameZh.trim() || !unitPrice || !moq) {
      setError(t('제품명(중문)·단가·MOQ는 필수입니다.', '产品名(中文)·单价·MOQ为必填项。'));
      return;
    }
    if (imageUrls.length === 0) {
      setError(t('제품 이미지 1장 이상 첨부 필요.', '请至少上传1张产品图片。'));
      return;
    }
    setSubmitting(true);
    const body: any = {
      category_id: categoryId || null,
      name_zh: nameZh.trim(),
      name_ko: nameKo.trim() || nameZh.trim(),
      name_en: nameEn.trim() || null,
      brand_name: brandName.trim() || null,
      origin_country: originCountry,
      hs_code: hsCode.trim() || null,
      barcode: barcode.trim() || null,
      product_code: productCode.trim() || null,
      product_tags: productTags.split(',').map(s => s.trim()).filter(Boolean),
      supplier_type: supplierType,
      description_zh: descriptionZh.trim(),
      description_ko: descriptionKo.trim(),
      caution_ko: cautionKo.trim() || null,
      caution_zh: cautionZh.trim() || null,
      size_mm: sizeMm.trim() || null,
      product_size_cm: productSizeCm.trim() || null,
      weight_g: weightG ? parseInt(weightG) : null,
      primary_material_id: materialId || null,
      material_detail: materialDetail.trim() || null,
      material_zh: materialZh.trim() || null,
      colors: colors.split(',').map(s => s.trim()).filter(Boolean),
      sizes: sizes.split(',').map(s => s.trim()).filter(Boolean),
      print_methods: printMethods,
      packaging_detail: packagingDetail.trim() || null,
      surface_treatment: surfaceTreatment.trim() || null,
      certifications,
      safety_warnings: safetyWarnings.trim() || null,
      age_restriction: ageRestriction.trim() || null,
      customizable,
      oem_available: oemAvailable,
      odm_available: odmAvailable,
      nda_available: ndaAvailable,
      box_length_cm: boxL ? parseFloat(boxL) : null,
      box_width_cm: boxW ? parseFloat(boxW) : null,
      box_height_cm: boxH ? parseFloat(boxH) : null,
      cbm_per_box: cbmPerBox ? parseFloat(cbmPerBox) : (autoCbm ? parseFloat(autoCbm) : null),
      pcs_per_box: pcsPerBox ? parseInt(pcsPerBox) : null,
      inner_box_pcs: innerBoxPcs ? parseInt(innerBoxPcs) : null,
      outer_box_pcs: outerBoxPcs ? parseInt(outerBoxPcs) : null,
      gross_weight_kg: grossWeightKg ? parseFloat(grossWeightKg) : null,
      lead_time_days: parseInt(leadTime) || 25,
      moq: parseInt(moq),
      sample_cost_cny: parseFloat(sampleCost) || 0,
      image_urls: imageUrls,
      detail_images: detailImages,
      video_url: videoUrl.trim() || null,
      unit_price_cny: parseFloat(unitPrice),
      price_usd: priceUsd ? parseFloat(priceUsd) : null,
      price_krw: priceKrw ? parseInt(priceKrw) : null,
      stock_qty: parseInt(stockQty) || 0,
      is_in_stock: true,
      pricing_tiers: pricingTiers.filter(t => (t.min_qty ?? 0) > 0 && (t.unit_price_cny ?? 0) > 0),
      variants: variants.filter(v => (v.variant_sku ?? '').trim()),
      search_keywords: searchKeywords.trim() || null,
      seo_title_ko: seoTitle.trim() || null,
      seo_desc_ko: seoDesc.trim() || null,
      ip_id: ipId || null,
    };

    // 수정 모드일 때 PATCH, 신규등록일 때 POST
    const url = editId ? `/api/factory/products/${editId}` : '/api/factory/products';
    const method = editId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? t('제출 실패. 다시 시도해 주세요.', '提交失败，请重试。'));
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push(editId ? `/factory/products/${editId}` : '/factory/products'), 2500);
  }

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition';
  const lbl = 'block text-xs font-semibold text-stone-500 mb-1.5';
  const sec = 'bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-4';
  const secTitle = 'text-sm font-bold text-stone-800 mb-4 pb-3 border-b border-stone-100';

  if (!factory || editLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center text-stone-400">
        <div className="text-4xl mb-3">⏳</div>
        <div className="text-sm">{editLoading ? t('상품 정보 불러오는 중…', '加载中…') : t('불러오는 중…', '加载中…')}</div>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center bg-white rounded-3xl p-12 max-w-sm shadow-xl">
        <div className="text-6xl mb-4">✅</div>
        <div className="text-xl font-black text-emerald-600 mb-2">{t('등록 완료!', '登记成功！')}</div>
        <div className="text-sm text-stone-400">{t('MD 검토 후 카탈로그에 노출됩니다.', 'MD审核后将展示在目录中。')}</div>
      </div>
    </div>
  );

  const steps = lang === 'zh' ? STEPS_ZH : STEPS;

  return (
    <div className="kx-animate-in max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/factory/products" className="flex items-center justify-center w-9 h-9 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition text-lg no-underline">←</Link>
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">{editId ? t('상품 수정', '修改产品') : t('신제품 등록', '新产品登记')}</h1>
          <p className="text-xs text-stone-400 mt-0.5">{editId ? t('수정 후 저장하면 즐시 반영됩니다', '修改后即时生效') : t('MD 검토 후 카탈로그에 노출됩니다', 'MD审核后展示在目录中')}</p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              i === step
                ? 'text-white shadow-sm'
                : i < step
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-stone-100 text-stone-400'
            }`}
            style={i === step ? { background: BRAND } : {}}
          >
            {i < step ? '✓ ' : `${i + 1}. `}{s}
          </button>
        ))}
      </div>

      {/* ── STEP 0: 기본 정보 ───────────────────────────────────── */}
      {step === 0 && (
        <>
          <div className={sec}>
            <div className={secTitle}>📝 {t('기본 정보', '基本信息')}</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('제품명 (中文) *', '产品名 (中文) *')}</label>
                <input className={inp} value={nameZh} onChange={e => setNameZh(e.target.value)} placeholder="粉色玛丽猫钥匙扣" />
              </div>
              <div>
                <label className={lbl}>{t('제품명 (한국어)', '产品名 (韩文)')}</label>
                <input className={inp} value={nameKo} onChange={e => setNameKo(e.target.value)} placeholder="핑크 마리캣 키링" />
              </div>
              <div>
                <label className={lbl}>{t('제품명 (English)', '产品名 (英文)')}</label>
                <input className={inp} value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Pink Mary Cat Keyring" />
              </div>
              <div>
                <label className={lbl}>{t('브랜드명', '品牌名')}</label>
                <input className={inp} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="KERYX" />
              </div>
              <div>
                <label className={lbl}>{t('원산지', '原产地')}</label>
                <input className={inp} value={originCountry} onChange={e => setOriginCountry(e.target.value)} placeholder="중국" />
              </div>
              <div>
                <label className={lbl}>{t('제품 코드 (SKU)', '产品编号 (SKU)')}</label>
                <input className={inp} value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="자동생성 (비워두면 자동)" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('HS 코드', 'HS编码')}</label>
                <input className={inp} value={hsCode} onChange={e => setHsCode(e.target.value)} placeholder="9503.00" />
              </div>
              <div>
                <label className={lbl}>{t('바코드 (EAN/UPC)', '条形码 (EAN/UPC)')}</label>
                <input className={inp} value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="8801234567890" />
              </div>
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('카테고리', '类别')}</label>
              <select className={inp} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">{t('선택…', '请选择…')}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.code} · {lang === 'zh' ? (c.name_zh ?? c.name_ko) : (c.name_ko ?? c.name_zh)}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('공급상 구분', '供应商类型')}</label>
              <select className={inp} value={supplierType} onChange={e => setSupplierType(e.target.value)}>
                {SUPPLIER_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{lang === 'zh' ? s.zh : s.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('IP 연결', 'IP关联')}</label>
              <select className={inp} value={ipId} onChange={e => setIpId(e.target.value)}>
                <option value="">{t('없음', '无')}</option>
                {ips.map(i => <option key={i.id} value={i.id}>{i.code} · {i.name_ko}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('태그 (쉼표 구분)', '标签 (逗号分隔)')}</label>
              <input className={inp} value={productTags} onChange={e => setProductTags(e.target.value)} placeholder="뽑기, 굿즈, 키링, 귀여운" />
            </div>
          </div>

          <div className={sec}>
            <div className={secTitle}>📄 {t('제품 설명', '产品描述')}</div>
            <div className="mb-3">
              <label className={lbl}>{t('제품 설명 (中文)', '产品描述 (中文)')}</label>
              <textarea className={`${inp} min-h-[80px] resize-y`} value={descriptionZh} onChange={e => setDescriptionZh(e.target.value)} placeholder="材质、特性、卖点…" />
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('제품 설명 (한국어)', '产品描述 (韩文)')}</label>
              <textarea className={`${inp} min-h-[80px] resize-y`} value={descriptionKo} onChange={e => setDescriptionKo(e.target.value)} placeholder="소재, 특징, 셀링포인트…" />
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('주의사항 (한국어)', '注意事项 (韩文)')}</label>
              <textarea className={`${inp} min-h-[60px] resize-y`} value={cautionKo} onChange={e => setCautionKo(e.target.value)} placeholder="어린이 손에 닿지 않는 곳에 보관…" />
            </div>
            <div>
              <label className={lbl}>{t('주의사항 (中文)', '注意事项 (中文)')}</label>
              <textarea className={`${inp} min-h-[60px] resize-y`} value={cautionZh} onChange={e => setCautionZh(e.target.value)} placeholder="请放在儿童不易触及的地方…" />
            </div>
          </div>
        </>
      )}

      {/* ── STEP 1: 상세 스펙 ───────────────────────────────────── */}
      {step === 1 && (
        <>
          <div className={sec}>
            <div className={secTitle}>📐 {t('사이즈 & 소재', '尺寸 & 材质')}</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('제품 사이즈 (mm)', '产品尺寸 (mm)')}</label>
                <input className={inp} value={sizeMm} onChange={e => setSizeMm(e.target.value)} placeholder="50x50mm" />
              </div>
              <div>
                <label className={lbl}>{t('제품 사이즈 (cm)', '产品尺寸 (cm)')}</label>
                <input className={inp} value={productSizeCm} onChange={e => setProductSizeCm(e.target.value)} placeholder="5x5cm" />
              </div>
              <div>
                <label className={lbl}>{t('무게 (g)', '重量 (g)')}</label>
                <input className={inp} type="number" value={weightG} onChange={e => setWeightG(e.target.value)} placeholder="25" />
              </div>
              <div>
                <label className={lbl}>{t('소재 (선택)', '材质 (选择)')}</label>
                <select className={inp} value={materialId} onChange={e => setMaterialId(e.target.value)}>
                  <option value="">{t('선택…', '请选择…')}</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{lang === 'zh' ? (m.name_zh ?? m.name_ko) : (m.name_ko ?? m.name_zh)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('소재 상세 (한국어)', '材质详细 (韩文)')}</label>
                <input className={inp} value={materialDetail} onChange={e => setMaterialDetail(e.target.value)} placeholder="ABS+PC 혼합, 친환경 소재" />
              </div>
              <div>
                <label className={lbl}>{t('소재 상세 (中文)', '材质详细 (中文)')}</label>
                <input className={inp} value={materialZh} onChange={e => setMaterialZh(e.target.value)} placeholder="ABS+PC混合，环保材料" />
              </div>
              <div>
                <label className={lbl}>{t('색상 (쉼표 구분)', '颜色 (逗号分隔)')}</label>
                <input className={inp} value={colors} onChange={e => setColors(e.target.value)} placeholder="핑크, 블루, 화이트" />
              </div>
              <div>
                <label className={lbl}>{t('사이즈 옵션 (쉼표 구분)', '尺寸选项 (逗号分隔)')}</label>
                <input className={inp} value={sizes} onChange={e => setSizes(e.target.value)} placeholder="S, M, L" />
              </div>
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('표면처리', '表面处理')}</label>
              <input className={inp} value={surfaceTreatment} onChange={e => setSurfaceTreatment(e.target.value)} placeholder="UV코팅, 무광, 유광" />
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('포장 방식', '包装方式')}</label>
              <input className={inp} value={packagingDetail} onChange={e => setPackagingDetail(e.target.value)} placeholder="OPP봉투 개별 포장, 컬러박스" />
            </div>
          </div>

          <div className={sec}>
            <div className={secTitle}>🖨️ {t('인쇄 방식', '印刷方式')}</div>
            <div className="flex flex-wrap gap-2">
              {PRINT_OPTIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleArray(printMethods, setPrintMethods, p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    printMethods.includes(p)
                      ? 'text-white border-transparent'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-rose-300'
                  }`}
                  style={printMethods.includes(p) ? { background: BRAND, borderColor: BRAND } : {}}
                >{p}</button>
              ))}
            </div>
          </div>

          <div className={sec}>
            <div className={secTitle}>🏅 {t('인증 & 안전', '认证 & 安全')}</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {CERT_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleArray(certifications, setCertifications, c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    certifications.includes(c)
                      ? 'text-white border-transparent'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-rose-300'
                  }`}
                  style={certifications.includes(c) ? { background: BRAND, borderColor: BRAND } : {}}
                >{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('안전 경고', '安全警告')}</label>
                <input className={inp} value={safetyWarnings} onChange={e => setSafetyWarnings(e.target.value)} placeholder="질식 위험, 소형 부품 포함" />
              </div>
              <div>
                <label className={lbl}>{t('연령 제한', '年龄限制')}</label>
                <input className={inp} value={ageRestriction} onChange={e => setAgeRestriction(e.target.value)} placeholder="3세 이상" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {[
                { label: t('커스터마이징 가능', '可定制'), val: customizable, set: setCustomizable },
                { label: t('OEM 가능', 'OEM可能'), val: oemAvailable, set: setOemAvailable },
                { label: t('ODM 가능', 'ODM可能'), val: odmAvailable, set: setOdmAvailable },
                { label: t('NDA 체결 가능', 'NDA可签'), val: ndaAvailable, set: setNdaAvailable },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-4 h-4 accent-rose-600" />
                  <span className="text-sm text-stone-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2: 물류/포장 ───────────────────────────────────── */}
      {step === 2 && (
        <>
          <div className={sec}>
            <div className={secTitle}>📦 {t('박스 사이즈 & CBM 자동계산', '箱子尺寸 & CBM自动计算')}</div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('가로 (cm)', '长 (cm)')}</label>
                <input className={inp} type="number" value={boxL} onChange={e => setBoxL(e.target.value)} placeholder="60" step="0.1" />
              </div>
              <div>
                <label className={lbl}>{t('세로 (cm)', '宽 (cm)')}</label>
                <input className={inp} type="number" value={boxW} onChange={e => setBoxW(e.target.value)} placeholder="40" step="0.1" />
              </div>
              <div>
                <label className={lbl}>{t('높이 (cm)', '高 (cm)')}</label>
                <input className={inp} type="number" value={boxH} onChange={e => setBoxH(e.target.value)} placeholder="30" step="0.1" />
              </div>
            </div>
            {autoCbm && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-sm">📐 {t('자동 계산 CBM', '自动计算CBM')}: {autoCbm} m³</span>
                <span className="text-xs text-emerald-500">({t('수동 입력 시 아래 값 우선', '手动输入时以下方值为准')})</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('CBM/박스 (직접 입력)', 'CBM/箱 (手动输入)')}</label>
                <input className={inp} type="number" value={cbmPerBox} onChange={e => setCbmPerBox(e.target.value)} placeholder={autoCbm || '0.072'} step="0.00001" />
              </div>
              <div>
                <label className={lbl}>{t('박스당 수량 (pcs)', '每箱数量 (pcs)')}</label>
                <input className={inp} type="number" value={pcsPerBox} onChange={e => setPcsPerBox(e.target.value)} placeholder="120" />
              </div>
              <div>
                <label className={lbl}>{t('내박스 수량 (pcs)', '内箱数量 (pcs)')}</label>
                <input className={inp} type="number" value={innerBoxPcs} onChange={e => setInnerBoxPcs(e.target.value)} placeholder="12" />
              </div>
              <div>
                <label className={lbl}>{t('외박스 수량 (pcs)', '外箱数量 (pcs)')}</label>
                <input className={inp} type="number" value={outerBoxPcs} onChange={e => setOuterBoxPcs(e.target.value)} placeholder="120" />
              </div>
              <div>
                <label className={lbl}>{t('총중량 (kg)', '毛重 (kg)')}</label>
                <input className={inp} type="number" value={grossWeightKg} onChange={e => setGrossWeightKg(e.target.value)} placeholder="8.5" step="0.1" />
              </div>
            </div>
          </div>

          <div className={sec}>
            <div className={secTitle}>🚚 {t('납기 & MOQ', '交货期 & MOQ')}</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>{t('리드타임 (일) *', '交货期 (天) *')}</label>
                <input className={inp} type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>{t('MOQ (최소수량) *', 'MOQ (最小订量) *')}</label>
                <input className={inp} type="number" value={moq} onChange={e => setMoq(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>{t('샘플비 (¥)', '样品费 (¥)')}</label>
                <input className={inp} type="number" value={sampleCost} onChange={e => setSampleCost(e.target.value)} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 3: 이미지 ──────────────────────────────────────── */}
      {step === 3 && (
        <>
          <div className={sec}>
            <div className={secTitle}>
              📸 {t('대표 이미지', '主图')}
              <span className="text-xs font-normal text-stone-400 ml-2">({t('최대 20장, 첫 번째가 대표', '最多20张，第一张为主图')})</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-stone-200">
                  <Image src={url} alt="" fill style={{ objectFit: 'cover' }} />
                  {i === 0 && (
                    <div className="absolute top-1 left-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: BRAND }}>
                      {t('대표', '主图')}
                    </div>
                  )}
                  <button
                    onClick={() => setImageUrls(cur => cur.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white border-none rounded-full text-xs cursor-pointer flex items-center justify-center"
                  >×</button>
                </div>
              ))}
              {imageUrls.length < 20 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-1 cursor-pointer text-stone-400 text-xs hover:border-rose-400 hover:text-rose-400 transition"
                >
                  <span className="text-2xl">{uploading ? '⏳' : '📷'}</span>
                  <span>{uploading ? `${uploadProgress}%` : t('추가', '添加')}</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleMainImages} className="hidden" />
          </div>

          <div className={sec}>
            <div className={secTitle}>
              🖼️ {t('상세 이미지', '详情图')}<span className="text-xs font-normal text-stone-400 ml-2">({t('최대 30장', '最多30张')})</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {detailImages.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-stone-200">
                  <Image src={url} alt="" fill style={{ objectFit: 'cover' }} />
                  <button
                    onClick={() => setDetailImages(cur => cur.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white border-none rounded-full text-xs cursor-pointer flex items-center justify-center"
                  >×</button>
                </div>
              ))}
              {detailImages.length < 30 && (
                <button
                  onClick={() => detailFileRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-1 cursor-pointer text-stone-400 text-xs hover:border-rose-400 hover:text-rose-400 transition"
                >
                  <span className="text-2xl">🖼️</span>
                  <span>{t('상세 추가', '添加详情图')}</span>
                </button>
              )}
            </div>
            <input ref={detailFileRef} type="file" accept="image/*" multiple onChange={handleDetailImages} className="hidden" />
          </div>

          <div className={sec}>
            <div className={secTitle}>🎬 {t('동영상 URL', '视频链接')}</div>
            <input className={inp} value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>

          {uploadErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <div className="text-xs font-bold text-red-600 mb-1">⚠️ {t('업로드 오류', '上传错误')}</div>
              {uploadErrors.map((e, i) => <div key={i} className="text-xs text-red-500">{e}</div>)}
            </div>
          )}
        </>
      )}

      {/* ── STEP 4: 가격/SEO ────────────────────────────────────── */}
      {step === 4 && (
        <>
          <div className={sec}>
            <div className={secTitle}>💰 {t('가격 설정', '价格设置')}</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>{t('단가 (¥ CNY) *', '单价 (¥ CNY) *')}</label>
                <input className={inp} type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="4.20" step="0.01" />
              </div>
              <div>
                <label className={lbl}>{t('단가 ($ USD)', '单价 ($ USD)')}</label>
                <input className={inp} type="number" value={priceUsd} onChange={e => setPriceUsd(e.target.value)} placeholder="0.60" step="0.01" />
              </div>
              <div>
                <label className={lbl}>{t('단가 (₩ KRW)', '单价 (₩ KRW)')}</label>
                <input className={inp} type="number" value={priceKrw} onChange={e => setPriceKrw(e.target.value)} placeholder="800" />
              </div>
              <div>
                <label className={lbl}>{t('재고 수량', '库存数量')}</label>
                <input className={inp} type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <div className={sec}>
            <div className={secTitle}>📊 {t('계단식 가격', '阶梯价格')}</div>
            <PricingTiersEditor
              tiers={pricingTiers}
              onChange={setPricingTiers}
              accentColor={BRAND}
              lang={lang as 'ko' | 'zh'}
            />
          </div>

          <div className={sec}>
            <div className={secTitle}>🎨 {t('SKU 옵션 (색상/사이즈)', 'SKU选项（颜色/尺寸）')}</div>
            <VariantsEditor
              variants={variants}
              onChange={setVariants}
              productSku={nameZh.slice(0, 4) || 'PRD'}
              accentColor={BRAND}
              lang={lang as 'ko' | 'zh'}
            />
          </div>

          <div className={sec}>
            <div className={secTitle}>🔍 {t('검색 & SEO', '搜索 & SEO')}</div>
            <div className="mb-3">
              <label className={lbl}>{t('검색 키워드 (쉼표 구분)', '搜索关键词 (逗号分隔)')}</label>
              <input className={inp} value={searchKeywords} onChange={e => setSearchKeywords(e.target.value)} placeholder="키링, 뽑기, 굿즈, 인형, 귀여운" />
            </div>
            <div className="mb-3">
              <label className={lbl}>{t('SEO 제목', 'SEO标题')}</label>
              <input className={inp} value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="핑크 마리캣 키링 | KERYX B2B" />
            </div>
            <div>
              <label className={lbl}>{t('SEO 설명', 'SEO描述')}</label>
              <textarea className={`${inp} min-h-[60px] resize-y`} value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="귀여운 캐릭터 키링 B2B 도매…" />
            </div>
          </div>
        </>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-600 m-0">⚠️ {error}</p>
        </div>
      )}

      {/* 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
        <p className="text-xs text-amber-800 leading-relaxed m-0">
          ⓘ {t(
            '등록된 제품은 KERYX MD가 검토 후 승인됩니다 (보통 1~2일). 승인되면 모든 바이어(고객)의 추천 큐 후보로 활용됩니다.',
            '登记的产品将由KERYX MD审核后批准（通常1~2天）。'
          )}
        </p>
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex gap-3 mb-8">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-4 rounded-2xl bg-stone-100 text-stone-700 font-bold text-base transition hover:bg-stone-200"
          >
            ← {t('이전', '上一步')}
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-base transition active:scale-95"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #be123c)`, boxShadow: `0 6px 20px ${BRAND}40` }}
          >
            {t('다음', '下一步')} →
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-4 rounded-2xl text-white font-bold text-base transition active:scale-95"
            style={{
              background: submitting ? '#9ca3af' : `linear-gradient(135deg, ${BRAND}, #be123c)`,
              boxShadow: submitting ? 'none' : `0 6px 20px ${BRAND}40`,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting ? t('등록 중…', '登记中…') : t('MD에게 검토 요청 →', '提交给MD审核 →')}
          </button>
        )}
      </div>
    </div>
  );
}
