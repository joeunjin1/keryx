'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';

const brandColor = '#e11d48';

function statusLabel(s: string): [string, string] {
  const m: Record<string, [string, string]> = {
    pending_review: ['검토 대기', '待审核'],
    under_review: ['검토 중', '审核中'],
    approved: ['승인됨', '已通过'],
    rejected: ['반려됨', '已拒绝'],
    discontinued: ['단종', '已停产'],
  };
  return m[s] ?? [s, s];
}

function statusColor(s: string): string {
  const m: Record<string, string> = {
    approved: '#10b981',
    pending_review: '#f59e0b',
    under_review: '#4f46e5',
    rejected: '#ef4444',
    discontinued: '#9ca3af',
  };
  return m[s] ?? '#9ca3af';
}

export default function FactoryProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const supabase = createClient() as any;

  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userKind, setUserKind] = useState<string>('');

  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?role=factory'); return; }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('kind')
          .eq('id', user.id)
          .single() as { data: any; error: any };

        if (!profile || !['factory', 'admin', 'md'].includes(profile.kind)) {
          router.push('/login?role=factory');
          return;
        }
        setUserKind(profile.kind);

        // 상품 상세 조회
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .select(`
            id, product_code, sku, name_ko, name_zh, name_en,
            category, supply_price_cny, sell_price_cny, moq,
            approval_status, created_at, updated_at,
            factory_id, is_active, stock_qty, pricing_tiers,
            description_ko, description_zh, size_mm, weight_g,
            package_type, package_qty_per_box, lead_time_days,
            sample_cost_cny, has_ip, review_notes, rejected_reason,
            brand_name, origin_country, hs_code, barcode,
            product_tags, key_features, caution_ko,
            is_orderable, is_featured, is_new, is_hot,
            inquiry_count, order_count, rating_avg, rating_count,
            image_url, image_urls
          `)
          .eq('id', productId)
          .single() as { data: any; error: any };

        if (prodErr || !prod) {
          setError('상품을 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        // 공장 계정이면 자신의 상품만 볼 수 있음
        if (profile.kind === 'factory') {
          const { data: factory } = await supabase
            .from('factories')
            .select('id')
            .eq('shared_login_user_id', user.id)
            .single() as { data: any; error: any };
          if (!factory || factory.id !== prod.factory_id) {
            setError('접근 권한이 없습니다.');
            setLoading(false);
            return;
          }
        }

        setProduct(prod);

        // 이미지 조회 - products.image_urls 컬럼에서 직접 읽기 (product_images 테이블 fallback 포함)
        const rawUrls: string[] = prod.image_urls ?? (prod.image_url ? [prod.image_url] : []);
        if (rawUrls.length > 0) {
          // Public URL로 변환 (Signed URL이 저장된 경우 Public URL로 교체)
          const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
          const publicUrls = rawUrls.map((u: string) => {
            // 이미 public URL 형태인 경우 그대로 사용
            if (u.includes('/storage/v1/object/public/')) return u;
            // Signed URL인 경우 path 추출 후 public URL로 변환
            const signedMatch = u.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
            if (signedMatch) {
              return `${SUPABASE_URL}/storage/v1/object/public/${signedMatch[1]}`;
            }
            return u;
          });
          const imgObjs = publicUrls.map((url: string, i: number) => ({ id: i, url, is_primary: i === 0 }));
          setImages(imgObjs);
          setSelectedImg(imgObjs[0]?.url ?? null);
        } else {
          // product_images 테이블 fallback
          const { data: imgs } = await supabase
            .from('product_images')
            .select('id, url, display_order, is_primary')
            .eq('product_id', productId)
            .order('display_order', { ascending: true }) as { data: any[]; error: any };
          if (imgs && imgs.length > 0) {
            setImages(imgs);
            const primary = imgs.find((i: any) => i.is_primary) ?? imgs[0];
            setSelectedImg(primary?.url ?? null);
          }
        }

        setLoading(false);
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [productId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <LangText ko="상품 정보를 불러오는 중..." zh="正在加载产品信息..." />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{error ?? '상품을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.back()}
            style={{ padding: '10px 24px', background: brandColor, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            <LangText ko="← 돌아가기" zh="← 返回" />
          </button>
        </div>
      </div>
    );
  }

  const [koLabel, zhLabel] = statusLabel(product.approval_status ?? 'pending_review');
  const statusClr = statusColor(product.approval_status ?? 'pending_review');
  const price = product.supply_price_cny ?? product.sell_price_cny ?? 0;
  const mainImg = selectedImg ?? (images[0]?.url ?? null);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{ padding: '8px 16px', background: 'var(--bg-muted)', border: '1px solid var(--border-light)', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}
        >
          ← <LangText ko="목록으로" zh="返回列表" />
        </button>
        <span style={{ background: `${statusClr}18`, color: statusClr, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, border: `1px solid ${statusClr}30` }}>
          <LangText ko={koLabel} zh={zhLabel} />
        </span>
        {product.is_featured && (
          <span style={{ background: '#f59e0b18', color: '#f59e0b', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
            ⭐ <LangText ko="추천" zh="推荐" />
          </span>
        )}
        {product.is_new && (
          <span style={{ background: '#10b98118', color: '#10b981', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
            🆕 <LangText ko="신상품" zh="新品" />
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 이미지 섹션 */}
        <div>
          <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-muted)', borderRadius: 16, overflow: 'hidden', position: 'relative', border: '1px solid var(--border-light)', marginBottom: 12 }}>
            {mainImg
              ? <Image src={mainImg} alt="" fill style={{ objectFit: 'contain' }} />
              : <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 64, opacity: 0.3 }}>📦</div>
            }
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {images.map((img: any) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedImg(img.url)}
                  style={{
                    width: 60, height: 60, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                    border: `2px solid ${selectedImg === img.url ? brandColor : 'var(--border-light)'}`,
                    position: 'relative', background: 'var(--bg-muted)'
                  }}
                >
                  <Image src={img.url} alt="" fill style={{ objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상품 정보 섹션 */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            {product.product_code ?? product.sku ?? '-'}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
            <LangText ko={product.name_ko ?? product.name_zh ?? '-'} zh={product.name_zh ?? product.name_ko ?? '-'} />
          </h1>
          {product.name_en && (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>{product.name_en}</div>
          )}

          <div style={{ fontSize: 28, fontWeight: 900, color: brandColor, marginBottom: 16 }}>
            ¥{Number(price).toLocaleString()}
          </div>

          {/* 핵심 정보 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { ko: 'MOQ', zh: 'MOQ', val: product.moq ? `${product.moq}개` : '-' },
              { ko: '재고', zh: '库存', val: product.stock_qty != null ? `${product.stock_qty}개` : '-' },
              { ko: '리드타임', zh: '交货期', val: product.lead_time_days ? `${product.lead_time_days}일` : '-' },
              { ko: '샘플비', zh: '样品费', val: product.sample_cost_cny ? `¥${product.sample_cost_cny}` : '-' },
              { ko: '카테고리', zh: '类别', val: product.category ?? '-' },
              { ko: '브랜드', zh: '品牌', val: product.brand_name ?? '-' },
              { ko: '원산지', zh: '产地', val: product.origin_country ?? '-' },
              { ko: 'HS코드', zh: 'HS编码', val: product.hs_code ?? '-' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>
                  <LangText ko={item.ko} zh={item.zh} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* 포장 정보 */}
          {(product.package_type || product.package_qty_per_box || product.size_mm || product.weight_g) && (
            <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                📦 <LangText ko="포장 정보" zh="包装信息" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {product.package_type && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <LangText ko="포장 유형" zh="包装类型" />: {product.package_type}
                  </div>
                )}
                {product.package_qty_per_box && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <LangText ko="박스당 수량" zh="每箱数量" />: {product.package_qty_per_box}개
                  </div>
                )}
                {product.size_mm && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <LangText ko="사이즈" zh="尺寸" />: {product.size_mm}
                  </div>
                )}
                {product.weight_g && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <LangText ko="무게" zh="重量" />: {product.weight_g}g
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 반려 사유 */}
          {product.approval_status === 'rejected' && product.rejected_reason && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                ❌ <LangText ko="반려 사유" zh="拒绝原因" />
              </div>
              <div style={{ fontSize: 13, color: '#b91c1c' }}>{product.rejected_reason}</div>
            </div>
          )}

          {/* 검토 메모 */}
          {product.review_notes && product.approval_status !== 'rejected' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>
                📝 <LangText ko="검토 메모" zh="审核备注" />
              </div>
              <div style={{ fontSize: 13, color: '#92400e' }}>{product.review_notes}</div>
            </div>
          )}

          {/* 수정 버튼 (공장 계정이고 승인 전 상태일 때만) */}
          {(userKind === 'factory' && ['pending_review', 'rejected'].includes(product.approval_status)) && (
            <button
              onClick={() => router.push(`/factory/products/new?edit=${product.id}`)}
              style={{ width: '100%', padding: '12px', background: brandColor, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700, marginTop: 8 }}
            >
              ✏️ <LangText ko="상품 수정" zh="修改产品" />
            </button>
          )}
        </div>
      </div>

      {/* 상품 설명 */}
      {(product.description_ko || product.description_zh) && (
        <div style={{ marginTop: 24, background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '16px 20px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            📋 <LangText ko="상품 설명" zh="产品描述" />
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            <LangText ko={product.description_ko ?? ''} zh={product.description_zh ?? ''} />
          </p>
        </div>
      )}

      {/* 통계 정보 */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { icon: '👁️', ko: '조회수', zh: '浏览量', val: product.views ?? 0 },
          { icon: '💬', ko: '문의수', zh: '咨询数', val: product.inquiry_count ?? 0 },
          { icon: '🛒', ko: '주문수', zh: '订单数', val: product.order_count ?? 0 },
          { icon: '⭐', ko: '평점', zh: '评分', val: product.rating_avg ? `${Number(product.rating_avg).toFixed(1)}` : '-' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{stat.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              <LangText ko={stat.ko} zh={stat.zh} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
