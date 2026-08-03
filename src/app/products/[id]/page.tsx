'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import FactoryMatchingModal from '@/components/matching/FactoryMatchingModal';

/* ── 다국어 ── */
const T = {
  ko: {
    back: '← 제품 목록으로',
    loading: '제품 정보를 불러오는 중...',
    not_found: '제품을 찾을 수 없습니다',
    not_found_sub: '삭제되었거나 존재하지 않는 제품입니다.',
    go_shop: '쇼핑몰로 돌아가기',
    moq: '최소 주문 수량',
    lead: '리드타임',
    days: '일',
    material: '소재',
    size: '사이즈',
    weight: '무게',
    color: '색상',
    print: '인쇄 방식',
    package: '포장',
    tiered_title: '수량별 단가표',
    tiered_sub: '대량 주문 시 단가가 낮아집니다',
    qty: '수량',
    unit_price: '단위 단가',
    total_est: '예상 합계',
    discount: '할인',
    inquiry_title: '이 제품에 관심 있으신가요?',
    inquiry_sub: '이 제품을 지금 바로 주문하거나 공장 매칭을 신청하세요',
    login_order: '로그인하고 주문하기',
    signup_free: '무료로 회원가입',
    matching_cta: '공장 매칭 신청 (비회원)',
    order_now: '주문하기',
    factory_match: '공장 매칭하기',
    order_form_title: '주문서 작성',
    order_qty: '주문 수량',
    order_note: '요청사항 (선택)',
    order_note_ph: '포장, 색상, 기타 요청사항을 입력해주세요',
    order_packaging: '포장 요청',
    order_packaging_ph: '포장 방식, 라벨, 박스 등 요청사항',
    order_delivery: '희망 납기일 (선택)',
    order_submit: '주문 접수하기',
    order_submitting: '접수 중...',
    order_success: '주문이 접수되었습니다! 관리자 검토 후 연락드리겠습니다.',
    order_error: '주문 접수에 실패했습니다. 다시 시도해주세요.',
    order_login_required: '주문하려면 로그인이 필요합니다.',
    order_cancel: '취소',
    order_total: '예상 금액',
    order_unit: '단가',
    view_orders: '내 주문 확인하기',
    share: '공유',
    copy_link: '링크 복사됨!',
    spec_title: '상세 스펙',
    factory_badge: '검증된 공장',
    nda_badge: 'NDA 체결',
    ip_badge: 'IP 보호',
    oem_badge: 'OEM 가능',
    odm_badge: 'ODM 가능',
    custom_badge: '커스텀 가능',
    lang: '中文',
    related_title: '관련 제품',
    factory_info: '공장 정보',
    factory_city: '위치',
    factory_rating: '평점',
    factory_capacity: '생산능력',
    cbm_info: 'CBM 정보',
    box_size: '박스 사이즈',
    pcs_per_box: '박스당 수량',
    cbm_per_box: '박스당 CBM',
    sample_cost: '샘플 비용',
    certifications: '인증',
    caution: '주의사항',
    in_stock: '재고 있음',
    out_of_stock: '주문제작 가능',
    made_to_order: '주문제작 가능',
    lead_time_label: '제작기간',
    days_unit: '일',
    moq_label: 'MOQ',
    pcs_unit: '개',
  },
  zh: {
    back: '← 返回产品列表',
    loading: '正在加载产品信息...',
    not_found: '找不到该产品',
    not_found_sub: '该产品已删除或不存在。',
    go_shop: '返回商城',
    moq: '最小订购量',
    lead: '交货期',
    days: '天',
    material: '材质',
    size: '尺寸',
    weight: '重量',
    color: '颜色',
    print: '印刷方式',
    package: '包装',
    tiered_title: '阶梯价格表',
    tiered_sub: '批量订购享受更低单价',
    qty: '数量',
    unit_price: '单价',
    total_est: '预计总价',
    discount: '折扣',
    inquiry_title: '对这个产品感兴趣？',
    inquiry_sub: '立即下单或申请工厂匹配',
    login_order: '登录并下单',
    signup_free: '免费注册',
    matching_cta: '申请工厂匹配（非会员）',
    order_now: '立即下单',
    factory_match: '申请工厂匹配',
    order_form_title: '填写订单',
    order_qty: '订购数量',
    order_note: '备注（选填）',
    order_note_ph: '请输入包装、颜色等特殊要求',
    order_packaging: '包装要求',
    order_packaging_ph: '包装方式、标签、纸箱等要求',
    order_delivery: '期望交货日期（选填）',
    order_submit: '提交订单',
    order_submitting: '提交中...',
    order_success: '订单已提交！管理员审核后将与您联系。',
    order_error: '订单提交失败，请重试。',
    order_login_required: '请先登录后再下单。',
    order_cancel: '取消',
    order_total: '预计金额',
    order_unit: '单价',
    view_orders: '查看我的订单',
    share: '分享',
    copy_link: '链接已复制！',
    spec_title: '详细规格',
    factory_badge: '认证工厂',
    nda_badge: 'NDA签署',
    ip_badge: 'IP保护',
    oem_badge: 'OEM可定制',
    odm_badge: 'ODM可定制',
    custom_badge: '可定制',
    lang: '한국어',
    related_title: '相关产品',
    factory_info: '工厂信息',
    factory_city: '位置',
    factory_rating: '评分',
    factory_capacity: '产能',
    cbm_info: 'CBM信息',
    box_size: '箱子尺寸',
    pcs_per_box: '每箱数量',
    cbm_per_box: '每箱CBM',
    sample_cost: '样品费用',
    certifications: '认证',
    caution: '注意事项',
    in_stock: '有库存',
    out_of_stock: '可定制生产',
    made_to_order: '可定制生产',
    lead_time_label: '交货期',
    days_unit: '天',
    moq_label: 'MOQ',
    pcs_unit: '件',
  },
};

/* ── 계단식 단가 계산 ── */
function calcTieredPrice(basePrice: number, qty: number): { unitPrice: number; discount: number } {
  if (qty >= 10000) return { unitPrice: basePrice * 0.62, discount: 38 };
  if (qty >= 5000)  return { unitPrice: basePrice * 0.70, discount: 30 };
  if (qty >= 3000)  return { unitPrice: basePrice * 0.75, discount: 25 };
  if (qty >= 1000)  return { unitPrice: basePrice * 0.82, discount: 18 };
  if (qty >= 500)   return { unitPrice: basePrice * 0.88, discount: 12 };
  return { unitPrice: basePrice, discount: 0 };
}

const TIERED_STEPS = [
  { qty: 200,   label_ko: '200개~',    label_zh: '200件起' },
  { qty: 500,   label_ko: '500개~',    label_zh: '500件起' },
  { qty: 1000,  label_ko: '1,000개~', label_zh: '1,000件起' },
  { qty: 3000,  label_ko: '3,000개~', label_zh: '3,000件起' },
  { qty: 5000,  label_ko: '5,000개~', label_zh: '5,000件起' },
  { qty: 10000, label_ko: '10,000개+', label_zh: '10,000件+' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [calcQty, setCalcQty] = useState(500);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  // 주문 폼 state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [orderQty, setOrderQty] = useState(500);
  const [orderNote, setOrderNote] = useState('');
  const [orderPackaging, setOrderPackaging] = useState('');
  const [orderDelivery, setOrderDelivery] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<'success' | 'error' | null>(null);

  const t = T[lang];

  useEffect(() => {
    const saved = localStorage.getItem('keryx_lang') as 'ko' | 'zh' | null;
    if (saved) setLang(saved);
    fetch('/api/auth/me').then(async r => {
      if (r.ok) {
        setIsLoggedIn(true);
        const data = await r.json().catch(() => ({}));
        setUserId(data?.user?.id ?? null);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/public/products/${productId}`)
      .then(r => r.json())
      .then(data => {
        setProduct(data.product || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  const toggleLang = () => {
    const next = lang === 'ko' ? 'zh' : 'ko';
    setLang(next);
    localStorage.setItem('keryx_lang', next);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 실제 DB 컬럼: price_cny, sell_price_cny
  const basePrice = product?.sell_price_cny || product?.price_cny || 5;
  const { unitPrice, discount } = calcTieredPrice(basePrice, calcQty);
  const totalEst = (unitPrice * calcQty).toFixed(0);

  // 실제 DB 컬럼: image_url, image_urls, detail_images
  const getImages = (p: any): string[] => {
    const all: string[] = [];
    if (p?.image_urls?.length > 0) all.push(...p.image_urls);
    else if (p?.image_url) all.push(p.image_url);
    if (p?.detail_images?.length > 0) all.push(...p.detail_images);
    if (all.length === 0) {
      all.push(`https://placehold.co/600x500/667eea/ffffff?text=${encodeURIComponent(p?.name_ko || 'KERYX')}`);
    }
    return all;
  };

  // 컬러 variants 파싱 (color_name + image_url/images 포함)
  const getColorVariants = (p: any): { color: string; image_url?: string; images?: string[] }[] => {
    if (!p?.variants || !Array.isArray(p.variants)) return [];
    const seen = new Set<string>();
    const result: { color: string; image_url?: string; images?: string[] }[] = [];
    for (const v of p.variants) {
      const colorName = v.color_name || v.color;
      if (!colorName || seen.has(colorName)) continue;
      seen.add(colorName);
      result.push({ color: colorName, image_url: v.image_url, images: v.images });
    }
    return result;
  };

  // 선택된 컬러의 이미지 목록 반환
  const getColorImages = (p: any, color: string | null): string[] | null => {
    if (!color || !p?.variants) return null;
    const variant = (p.variants as any[]).find((v: any) => (v.color_name || v.color) === color);
    if (!variant) return null;
    const imgs: string[] = [];
    if (variant.images?.length > 0) imgs.push(...variant.images);
    else if (variant.image_url) imgs.push(variant.image_url);
    return imgs.length > 0 ? imgs : null;
  };

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <style>{`@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/shop" className="no-underline">
            <Image src="/logos/logo-horizontal.png" alt="KERYX" width={160} height={40} style={{ objectFit: 'contain' }} priority />
          </Link>
        </header>
        <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <div style={{ height: 420, borderRadius: 16, background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite' }} />
          <div className="flex flex-col gap-4">
            {[80, 40, 60, 100, 200].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 10, background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── 404 ── */
  if (!product) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div className="text-[72px]">📦</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{t.not_found}</h2>
        <p className="text-[#6b7280]">{t.not_found_sub}</p>
        <Link href="/shop" style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', textDecoration: 'none', borderRadius: 12, fontWeight: 700 }}>{t.go_shop}</Link>
      </div>
    );
  }

  const colorVariants = getColorVariants(product);
  const colorImages = getColorImages(product, selectedColor);
  const images = colorImages || getImages(product);
  // 컬러 선택 시 이미지 인덱스 리셋
  // (selectedColor 변경 시 useEffect 없이 직접 처리)
  // 실제 DB 컬럼: name_ko, name_zh
  const productName = lang === 'ko' ? (product.name_ko || product.name_zh) : (product.name_zh || product.name_ko);
  // 실제 DB 컬럼: description_ko, description_zh
  const productDesc = lang === 'ko' ? (product.description_ko || product.description_zh) : (product.description_zh || product.description_ko);
  // 실제 DB 컬럼: material_detail, material_zh
  const materialText = lang === 'ko' ? (product.material_detail || product.material_zh || '–') : (product.material_zh || product.material_detail || '–');
  // 실제 DB 컬럼: product_size_cm, size_mm
  const sizeText = product.product_size_cm || product.size_mm || '–';
  // 실제 DB 컬럼: weight_g
  const weightText = product.weight_g ? `${product.weight_g}g` : '–';
  // 실제 DB 컬럼: colors (ARRAY)
  const colorsText = Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || '–');
  // 실제 DB 컬럼: print_methods (ARRAY)
  const printText = Array.isArray(product.print_methods) ? product.print_methods.join(', ') : (product.print_methods || '–');
  // 실제 DB 컬럼: packaging_detail
  const packagingText = product.packaging_detail || '–';
  // 실제 DB 컬럼: factory.company_name, factory.company_name_ko, factory.city, factory.province
  const factory = product.factory;
  const factoryName = lang === 'ko' ? (factory?.company_name_ko || factory?.company_name) : factory?.company_name;
  const factoryLocation = [factory?.city, factory?.province].filter(Boolean).join(', ') || '–';

  // CBM 계산
  const cbmText = product.cbm_per_box
    ? `${product.cbm_per_box} m³`
    : (product.box_length_cm && product.box_width_cm && product.box_height_cm
      ? `${((product.box_length_cm * product.box_width_cm * product.box_height_cm) / 1000000).toFixed(5)} m³`
      : '–');

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 64 }}>
          <Link href="/shop" className="no-underline">
            <Image src="/logos/logo-horizontal.png" alt="KERYX" width={160} height={40} style={{ objectFit: 'contain' }} priority />
          </Link>
          <div className="flex-1" />
          <button onClick={toggleLang} className="active:scale-95 transition-all" style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>{t.lang}</button>
          {isLoggedIn ? (
            <Link href="/seller" style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>내 대시보드</Link>
          ) : (
            <>
              <Link href="/login" style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #667eea', color: '#667eea', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>{lang === 'ko' ? '로그인' : '登录'}</Link>
              <Link href="/signup" style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>{lang === 'ko' ? '회원가입' : '注册'}</Link>
            </>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6b7280', textDecoration: 'none', fontSize: 14, marginBottom: 24, fontWeight: 500 }}>{t.back}</Link>

        {/* ── 메인 그리드 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 40, marginBottom: 48 }}>

          {/* 이미지 갤러리 */}
          <div>
            {/* 메인 이미지 */}
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '2px solid #e5e7eb', background: '#fff', marginBottom: 12, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img
                src={images[activeImg]}
                alt={productName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }}
                onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/600x450/667eea/ffffff?text=${encodeURIComponent(product.name_ko || 'KERYX')}`; }}
              />
              {selectedColor && (
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                  {lang === 'ko' ? '🎨 ' : '🎨 '}{selectedColor}
                </div>
              )}
            </div>

            {/* 콌러 선택 버튼 (variants에 컴러가 있을 때만 표시) */}
            {colorVariants.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>
                  {lang === 'ko' ? '🎨 컬러 선택' : '🎨 选择颜色'}
                  {selectedColor && (
                    <span style={{ marginLeft: 8, color: '#667eea' }}>— {selectedColor}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* 전체 보기 버튼 */}
                  <button
                    onClick={() => { setSelectedColor(null); setActiveImg(0); }}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: selectedColor === null ? '#667eea' : '#f3f4f6',
                      color: selectedColor === null ? '#fff' : '#374151',
                      border: selectedColor === null ? '2px solid #667eea' : '2px solid #e5e7eb',
                    }}
                  >
                    {lang === 'ko' ? '전체' : '全部'}
                  </button>
                  {colorVariants.map((cv, ci) => (
                    <button
                      key={ci}
                      onClick={() => {
                        setSelectedColor(cv.color);
                        setActiveImg(0);
                      }}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        background: selectedColor === cv.color ? '#667eea' : '#f3f4f6',
                        color: selectedColor === cv.color ? '#fff' : '#374151',
                        border: selectedColor === cv.color ? '2px solid #667eea' : '2px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {cv.image_url && (
                        <img src={cv.image_url} alt={cv.color} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.5)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      {cv.color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 썸네일 목록 */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {images.slice(0, 10).map((img, i) => (
                  <div key={i} onClick={() => setActiveImg(i)} style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: `2px solid ${activeImg === i ? '#667eea' : '#e5e7eb'}`, cursor: 'pointer', flexShrink: 0, background: '#f9fafb', transition: 'border-color 0.15s' }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div>
            {/* 뱃지 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {factory?.avg_rating && factory.avg_rating >= 4 && (
                <span style={{ padding: '4px 10px', background: '#ecfdf5', color: '#059669', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✓ {t.factory_badge}</span>
              )}
              {product.nda_available && (
                <span style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>📜 {t.nda_badge}</span>
              )}
              {product.has_ip && (
                <span style={{ padding: '4px 10px', background: '#fdf4ff', color: '#9333ea', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>🔒 {t.ip_badge}</span>
              )}
              {product.oem_available && (
                <span style={{ padding: '4px 10px', background: '#fff7ed', color: '#ea580c', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{t.oem_badge}</span>
              )}
              {product.odm_available && (
                <span style={{ padding: '4px 10px', background: '#f0fdf4', color: '#16a34a', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{t.odm_badge}</span>
              )}
              {product.customizable && (
                <span style={{ padding: '4px 10px', background: '#fefce8', color: '#ca8a04', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{t.custom_badge}</span>
              )}
              {/* 재고 상태 */}
              {product.is_in_stock ? (
                <span style={{ padding: '4px 10px', background: '#ecfdf5', color: '#059669', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  📦 {t.in_stock}
                </span>
              ) : (
                <span style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  🏭 {t.made_to_order}
                </span>
              )}
            </div>

            {/* 카테고리 */}
            {product.category && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{product.category}</div>
            )}

            {/* 상품명 */}
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1.3, marginBottom: 16 }}>
              {productName}
            </h1>

            {/* 가격 */}
            <div style={{ fontSize: 32, fontWeight: 900, color: '#667eea', marginBottom: 16 }}>
              ¥{product.sell_price_cny || product.price_cny || '–'}
              <span style={{ fontSize: 14, color: '#9ca3af', fontWeight: 500, marginLeft: 8 }}>/ 개 (MOQ {product.moq || 200}개 기준)</span>
            </div>

            {/* 핵심 스펙 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: t.moq, value: `${product.moq || 200}${lang === 'ko' ? '개' : '件'}` },
                { label: t.lead, value: `${product.lead_time_days || 15}${t.days}` },
                { label: t.material, value: materialText },
                { label: t.size, value: sizeText },
              ].map((spec, i) => (
                <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>{spec.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{spec.value}</div>
                </div>
              ))}
            </div>

            {/* 설명 */}
            {productDesc && (
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, marginBottom: 24, padding: '16px', background: '#f9fafb', borderRadius: 12 }}>
                {productDesc}
              </p>
            )}

            {/* 공장 정보 */}
            {factory && (
              <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>{t.factory_info}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{factoryName}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  📍 {factoryLocation}
                  {factory.avg_rating && <span style={{ marginLeft: 12 }}>⭐ {factory.avg_rating.toFixed(1)}</span>}
                </div>
              </div>
            )}

            {/* 샘플 비용 */}
            {product.sample_cost_cny && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                {t.sample_cost}: <strong style={{ color: '#374151' }}>¥{product.sample_cost_cny}</strong>
              </div>
            )}

            <button onClick={handleCopyLink} className="active:scale-95 transition-all" style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 600 }}>
              {copied ? t.copy_link : `🔗 ${t.share}`}
            </button>
          </div>
        </div>

        {/* ── 수량별 단가표 ── */}
        <section style={{ background: '#fff', borderRadius: 20, padding: '32px', border: '1px solid #e5e7eb', marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{t.tiered_title}</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{t.tiered_sub}</p>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr className="bg-[#f9fafb]">
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{t.qty}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{t.unit_price}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{t.discount}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{t.total_est}</th>
                </tr>
              </thead>
              <tbody>
                {TIERED_STEPS.map((step, i) => {
                  const { unitPrice: up, discount: disc } = calcTieredPrice(basePrice, step.qty);
                  const isHighlight = i === 2;
                  return (
                    <tr key={i} style={{ background: isHighlight ? '#faf5ff' : 'transparent', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: isHighlight ? 700 : 500, color: isHighlight ? '#7c3aed' : '#374151' }}>
                        {lang === 'ko' ? step.label_ko : step.label_zh}
                        {isHighlight && <span style={{ marginLeft: 8, fontSize: 11, background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>{lang === 'ko' ? '추천' : '推荐'}</span>}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>¥{up.toFixed(2)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: disc > 0 ? '#059669' : '#9ca3af', fontWeight: 600 }}>
                        {disc > 0 ? `-${disc}%` : '–'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#374151' }}>¥{(up * step.qty).toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 수량 입력 계산기 */}
          <div style={{ marginTop: 28, padding: '20px 24px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#5b21b6', marginBottom: 14 }}>
              {lang === 'ko' ? '🧮 수량 입력으로 단가 계산' : '🧮 输入数量计算单价'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="number"
                value={calcQty}
                min={product.moq || 200}
                step={100}
                onChange={e => setCalcQty(Math.max(product.moq || 200, parseInt(e.target.value) || product.moq || 200))}
                style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid #c4b5fd', fontSize: 16, fontWeight: 700, width: 140, outline: 'none' }}
              />
              <span style={{ fontSize: 14, color: '#6b7280' }}>{lang === 'ko' ? '개 주문 시' : '件时'}</span>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>{t.unit_price}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#5b21b6' }}>¥{unitPrice.toFixed(2)}</div>
                </div>
                {discount > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{t.discount}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>-{discount}%</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{t.total_est}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>¥{totalEst}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 20, padding: '40px 36px', color: '#fff', textAlign: 'center', marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>{t.inquiry_title}</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 28 }}>{t.inquiry_sub}</p>

          {isLoggedIn ? (
            <>
              {/* 로그인 상태: 주문하기 + 공장매칭하기 버튼 */}
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <button
                  onClick={() => { setShowOrderForm(v => !v); setOrderResult(null); }}
                  style={{ padding: '14px 36px', background: '#fff', color: '#667eea', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  🛒 {t.order_now}
                </button>
                <button
                  onClick={() => setShowMatchModal(true)}
                  style={{ padding: '14px 36px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  🏭 {t.factory_match}
                </button>
              </div>

              {/* 인라인 주문 폼 */}
              {showOrderForm && (
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '28px 24px', marginTop: 8, textAlign: 'left', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 20, textAlign: 'center' }}>📋 {t.order_form_title}</h3>

                  {orderResult === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>{t.order_success}</p>
                      <Link href="/seller/orders" style={{ padding: '12px 28px', background: '#fff', color: '#667eea', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14 }}>{t.view_orders}</Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* 수량 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: 6 }}>{t.order_qty} *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="number"
                            min={product.moq || 1}
                            value={orderQty}
                            onChange={e => setOrderQty(Math.max(1, Number(e.target.value)))}
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 15, fontWeight: 700, outline: 'none' }}
                          />
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                            {t.order_unit}: ¥{calcTieredPrice(basePrice, orderQty).unitPrice.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                          {t.order_total}: <strong style={{ color: '#fff' }}>¥{(calcTieredPrice(basePrice, orderQty).unitPrice * orderQty).toFixed(0)}</strong>
                        </div>
                      </div>
                      {/* 포장 요청 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: 6 }}>{t.order_packaging}</label>
                        <textarea
                          value={orderPackaging}
                          onChange={e => setOrderPackaging(e.target.value)}
                          placeholder={t.order_packaging_ph}
                          rows={2}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>
                      {/* 요청사항 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: 6 }}>{t.order_note}</label>
                        <textarea
                          value={orderNote}
                          onChange={e => setOrderNote(e.target.value)}
                          placeholder={t.order_note_ph}
                          rows={2}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>
                      {/* 납기일 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: 6 }}>{t.order_delivery}</label>
                        <input
                          type="date"
                          value={orderDelivery}
                          onChange={e => setOrderDelivery(e.target.value)}
                          style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }}
                        />
                      </div>
                      {orderResult === 'error' && (
                        <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>⚠️ {t.order_error}</p>
                      )}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          onClick={() => setShowOrderForm(false)}
                          style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                        >{t.order_cancel}</button>
                        <button
                          disabled={orderSubmitting}
                          onClick={async () => {
                            setOrderSubmitting(true);
                            setOrderResult(null);
                            try {
                              const res = await fetch('/api/buyer/orders', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  product_id: productId,
                                  qty: orderQty,
                                  unit_price_cny: calcTieredPrice(basePrice, orderQty).unitPrice,
                                  buyer_order_note: orderNote || undefined,
                                  packaging_request: orderPackaging || undefined,
                                  desired_delivery_date: orderDelivery || undefined,
                                }),
                              });
                              if (res.ok) {
                                setOrderResult('success');
                              } else {
                                setOrderResult('error');
                              }
                            } catch {
                              setOrderResult('error');
                            } finally {
                              setOrderSubmitting(false);
                            }
                          }}
                          style={{ padding: '10px 28px', borderRadius: 10, background: '#fff', color: '#667eea', border: 'none', fontWeight: 800, fontSize: 14, cursor: orderSubmitting ? 'not-allowed' : 'pointer', opacity: orderSubmitting ? 0.7 : 1 }}
                        >{orderSubmitting ? t.order_submitting : t.order_submit}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/login" style={{ padding: '14px 28px', background: '#fff', color: '#667eea', textDecoration: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15 }}>{t.login_order}</Link>
                <Link href="/signup" style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, border: '2px solid rgba(255,255,255,0.4)' }}>{t.signup_free}</Link>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>
                {lang === 'ko' ? '✓ 무료 가입 · 신용카드 불필요 · 1개월 무료 체험' : '✓ 免费注册 · 无需信用卡 · 首月免费体验'}
              </p>
            </>
          )}
        </section>

        {/* 공장 매칭 모달 */}
        {showMatchModal && (
          <FactoryMatchingModal
            isOpen={showMatchModal}
            onClose={() => setShowMatchModal(false)}
            lang={lang}
            userId={userId ?? undefined}
          />
        )}

        {/* ── 상세 스펙 ── */}
        <section style={{ background: '#fff', borderRadius: 20, padding: '32px', border: '1px solid #e5e7eb', marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 20 }}>{t.spec_title}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                { label: t.moq, value: `${product.moq || 200}${lang === 'ko' ? '개' : '件'}` },
                { label: t.lead, value: `${product.lead_time_days || 15}${t.days}` },
                { label: t.material, value: materialText },
                { label: t.size, value: sizeText },
                { label: t.weight, value: weightText },
                { label: t.color, value: colorsText },
                { label: t.print, value: printText },
                { label: t.package, value: packagingText },
                ...(product.box_length_cm ? [{ label: t.box_size, value: `${product.box_length_cm}×${product.box_width_cm}×${product.box_height_cm} cm` }] : []),
                ...(product.pcs_per_box ? [{ label: t.pcs_per_box, value: `${product.pcs_per_box}${lang === 'ko' ? '개' : '件'}` }] : []),
                ...(product.cbm_per_box ? [{ label: t.cbm_per_box, value: cbmText }] : []),
                ...(product.certifications?.length > 0 ? [{ label: t.certifications, value: product.certifications.join(', ') }] : []),
                ...(product.hs_code ? [{ label: 'HS Code', value: product.hs_code }] : []),
                ...(product.origin_country ? [{ label: lang === 'ko' ? '원산지' : '原产地', value: product.origin_country }] : []),
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontWeight: 600, width: '30%', background: '#f9fafb' }}>{row.label}</td>
                  <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500 }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── 주의사항 ── */}
        {(product.caution_ko || product.caution_zh) && (
          <section style={{ background: '#fffbeb', borderRadius: 20, padding: '24px 32px', border: '1px solid #fde68a', marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#92400e', marginBottom: 12 }}>⚠️ {t.caution}</h3>
            <p style={{ fontSize: 14, color: '#78350f', lineHeight: 1.8 }}>
              {lang === 'ko' ? (product.caution_ko || product.caution_zh) : (product.caution_zh || product.caution_ko)}
            </p>
          </section>
        )}

      </div>

      <footer style={{ background: '#111827', color: 'rgba(255,255,255,0.6)', padding: '32px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <Image src="/logos/logo-horizontal.png" alt="KERYX" width={80} height={36} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/shop" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>{lang === 'ko' ? '쇼핑몰' : '商城'}</Link>
            <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>{lang === 'ko' ? '멤버십' : '会员'}</Link>
            <Link href="/support" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>{lang === 'ko' ? '고객센터' : '客服'}</Link>
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>{lang === 'ko' ? '이용약관' : '使用条款'}</Link>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>{lang === 'ko' ? '개인정보처리방침' : '隐私政策'}</Link>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: '16px auto 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          © 2026 KERYX · 사업자등록번호: 609-81-63010 | 대표: 조은진 | support@keryx.kr
        </div>
      </footer>
    </div>
  );
}
