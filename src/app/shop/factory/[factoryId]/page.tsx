import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';

interface PageProps {
  params: { factoryId: string };
}

export default async function FactoryStorefrontPage({ params }: PageProps) {
  // service_role 클라이언트 사용 (RLS 우회)
  const supabase = createAdminClient() as any;

  // 공장 정보 조회 — 실제 DB 컬럼명 사용
  const { data: factory } = await supabase
    .from('factories')
    .select(`
      id, factory_code, company_name, company_name_ko, city, province,
      founded_year, factory_area_sqm, employee_count, production_capacity,
      avg_lead_time_days, certifications, main_products, response_rate,
      avg_rating, audit_score, total_orders, cover_image_url, gallery_images,
      intro_text_zh, intro_text_ko, website_url, contact_name,
      contact_phone, contact_wechat, contact_email, approval_status,
      primary_categories
    `)
    .eq('id', params.factoryId)
    .eq('approval_status', 'approved')
    .single() as { data: any; error: any };

  if (!factory) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div className="text-center">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#374151' }}>공장을 찾을 수 없습니다</div>
          <Link href="/shop" style={{ color: '#10b981', textDecoration: 'underline', fontSize: 14, marginTop: 8, display: 'block' }}>카탈로그로 돌아가기</Link>
        </div>
      </div>
    );
  }

  // 공장 제품 목록 — 실제 DB 컬럼 사용 (product_images, product_pricing_tiers 테이블 없음)
  const { data: products } = await supabase
    .from('products')
    .select(`
      id, sku, product_code, name_zh, name_ko,
      image_url, image_urls,
      price_cny, sell_price_cny, supply_price_cny,
      pricing_tiers,
      moq, lead_time_days, views, total_sold,
      is_in_stock, stock_qty, approval_status, is_active
    `)
    .eq('factory_id', params.factoryId)
    .eq('approval_status', 'approved')
    .eq('is_active', true)
    .order('total_sold', { ascending: false })
    .limit(24) as { data: any[]; error: any };

  const brandColor = '#10b981';

  // 실제 DB 컬럼: image_url, image_urls
  const getProductImage = (product: any): string | null => {
    if (product.image_urls?.length > 0) return product.image_urls[0];
    if (product.image_url) return product.image_url;
    return null;
  };

  // 실제 DB 컬럼: pricing_tiers (JSONB), sell_price_cny, price_cny
  const getMinPrice = (product: any): number | null => {
    if (product.sell_price_cny) return parseFloat(product.sell_price_cny);
    if (product.price_cny) return parseFloat(product.price_cny);
    const tiers = product.pricing_tiers;
    if (Array.isArray(tiers) && tiers.length > 0) {
      return Math.min(...tiers.map((t: any) => parseFloat(t.unit_price_cny || t.price || 0)));
    }
    return null;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/shop" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: brandColor }}>KERYX</span>
          <span className="text-[13px] text-neutral-400">/ 공장</span>
        </Link>
        <Link href="/login" style={{ fontSize: 13, color: brandColor, textDecoration: 'none', fontWeight: 600 }}>
          로그인 →
        </Link>
      </nav>

      {/* 커버 이미지 */}
      <div style={{ height: 220, background: factory.cover_image_url ? `url(${factory.cover_image_url}) center/cover` : `linear-gradient(135deg, ${brandColor}20, ${brandColor}40)`, position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', padding: '20px 24px', color: '#fff' }}>
          {/* 실제 DB 컬럼: company_name, company_name_ko */}
          <div className="text-[22px] font-bold">{factory.company_name}</div>
          {factory.company_name_ko && <div style={{ fontSize: 14, opacity: 0.85 }}>{factory.company_name_ko}</div>}
          {/* 실제 DB 컬럼: city, province (location 컬럼 없음) */}
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
            📍 {[factory.city, factory.province].filter(Boolean).join(', ') || '중국'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '⭐', value: factory.avg_rating ? factory.avg_rating.toFixed(1) : 'N/A', label: '평균 평점', labelZh: '平均评分', color: '#f59e0b' },
            { icon: '📦', value: `${factory.total_orders || 0}건`, label: '총 주문', labelZh: '总订单', color: brandColor },
            { icon: '⚡', value: factory.response_rate ? `${factory.response_rate}%` : 'N/A', label: '응답률', labelZh: '响应率', color: '#8b5cf6' },
            { icon: '🚚', value: factory.avg_lead_time_days ? `${factory.avg_lead_time_days}일` : 'N/A', label: '평균 납기', labelZh: '平均交期', color: '#0ea5e9' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 12px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                <LangText ko={stat.label} zh={stat.labelZh} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* 좌측: 소개 + 제품 */}
          <div>
            {/* 공장 소개 — 실제 DB 컬럼: intro_text_ko, intro_text_zh */}
            {(factory.intro_text_ko || factory.intro_text_zh) && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
                  <LangText ko="🏭 공장 소개" zh="🏭 工厂介绍" />
                </div>
                <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
                  <LangText ko={factory.intro_text_ko || factory.intro_text_zh} zh={factory.intro_text_zh || factory.intro_text_ko} />
                </p>
              </div>
            )}

            {/* 인증 */}
            {factory.certifications && factory.certifications.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
                  <LangText ko="🏆 인증서" zh="🏆 认证证书" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {factory.certifications.map((cert: string) => (
                    <span key={cert} style={{ padding: '4px 12px', background: `${brandColor}15`, color: brandColor, borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${brandColor}30` }}>
                      ✓ {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 제품 목록 */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                <LangText ko={`📦 제품 목록 (${(products || []).length}개)`} zh={`📦 产品列表（${(products || []).length}个）`} />
              </div>
              {(products || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
                  <LangText ko="등록된 제품이 없습니다" zh="暂无产品" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(products || []).map((product: any) => {
                    const imgUrl = getProductImage(product);
                    const minPrice = getMinPrice(product);
                    return (
                      <Link key={product.id} href={`/products/${product.id}`} className="no-underline">
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                          <div style={{ height: 130, background: imgUrl ? `url(${imgUrl}) center/cover` : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!imgUrl && <span className="text-[32px]">📦</span>}
                          </div>
                          <div style={{ padding: '10px 10px 12px' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {product.name_ko || product.name_zh}
                            </div>
                            {minPrice && (
                              <div style={{ fontSize: 14, fontWeight: 800, color: brandColor }}>
                                ¥{minPrice.toFixed(2)}~
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                              MOQ {product.moq || 100}{' '}
                              <LangText ko="개" zh="件" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 우측: 공장 정보 사이드바 */}
          <div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
                <LangText ko="공장 정보" zh="工厂信息" />
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { icon: '📅', label: '설립 연도', labelZh: '成立年份', value: factory.founded_year ? `${factory.founded_year}년` : null },
                  { icon: '📐', label: '공장 면적', labelZh: '工厂面积', value: factory.factory_area_sqm ? `${factory.factory_area_sqm.toLocaleString()}㎡` : null },
                  { icon: '👥', label: '직원 수', labelZh: '员工人数', value: factory.employee_count ? `${factory.employee_count}명` : null },
                  { icon: '⚙️', label: '생산 능력', labelZh: '生产能力', value: factory.production_capacity },
                  { icon: '📍', label: '위치', labelZh: '位置', value: [factory.city, factory.province].filter(Boolean).join(', ') || null },
                ].filter(item => item.value).map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div className="text-[11px] text-neutral-400">
                        <LangText ko={item.label} zh={item.labelZh} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 주요 품목 */}
            {factory.main_products && factory.main_products.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
                  <LangText ko="주요 품목" zh="主要品类" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {factory.main_products.map((item: string) => (
                    <span key={item} style={{ padding: '3px 10px', background: '#f3f4f6', color: '#374151', borderRadius: 20, fontSize: 12 }}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 문의 CTA */}
            <div style={{ background: `linear-gradient(135deg, ${brandColor}, #059669)`, borderRadius: 12, padding: 20, color: '#fff' }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>
                <LangText ko="이 공장에 문의하기" zh="联系此工厂" />
              </div>
              <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.5 }}>
                <LangText ko="회원가입 후 직접 공장과 소통하세요" zh="注册后直接与工厂沟通" />
              </p>
              <Link href="/signup" style={{ display: 'block', textAlign: 'center', padding: '10px', background: '#fff', color: brandColor, borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                <LangText ko="무료 회원가입" zh="免费注册" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ background: '#111827', color: 'rgba(255,255,255,0.6)', padding: '24px 20px', marginTop: 40 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center', fontSize: 12 }}>
          © 2026 KERYX · support@keryx.kr
        </div>
      </footer>
    </div>
  );
}
