"use client";
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useLangContext } from '@/components/layout/LangContext';

interface Props {
  factory: any;
  isAdmin: boolean;
  productCount: number;
  openBriefs: any[];
  respondedBriefs: any[];
  unreadMessages: number;
  activeOrders: number;
  recentProducts: any[];
}

export default function FactoryHomeClient({
  factory, isAdmin, productCount, openBriefs, respondedBriefs,
  unreadMessages, activeOrders, recentProducts,
}: Props) {
  const { lang } = useLangContext();
  const [showProductModal, setShowProductModal] = useState(false);
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const companyName = factory?.company_name ?? (isAdmin ? 'SENKANG ADMIN' : '공장');
  const factoryCode = factory?.factory_code ?? '';
  const rating = factory?.avg_rating ?? factory?.rating ?? 0;
  const totalOrders = factory?.total_orders ?? 0;

  return (
    <div className="kx-animate-in">




        <div style={{
          borderRadius: '20px', overflow: 'hidden', marginBottom: 24, position: 'relative',
          background: 'linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 40%, #7f1d1d 100%)',
          padding: '32px 24px', color: '#fff', minHeight: 200,
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(225,29,72,0.3) 0%, transparent 70%)', pointerEvents: 'none' }}
              />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }}
              />
          <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 80, opacity: 0.06, pointerEvents: 'none' }}>🏭</div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-block', background: 'rgba(225,29,72,0.3)', border: '1px solid rgba(225,29,72,0.5)', borderRadius: '99px', padding: '4px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 12, textTransform: 'uppercase' }}>
              {t('마켓 입점 공급사 포털', '市场入驻供应商门户')}
            </div>
            <div style={{ fontSize: 'clamp(1.3rem, 5vw, 1.8rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
              {companyName}
            </div>
            {factoryCode && (
              <div style={{ display: 'inline-block', background: 'rgba(225,29,72,0.25)', border: '1px solid rgba(225,29,72,0.4)', borderRadius: '99px', padding: '3px 10px', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                🏭 {factoryCode}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {rating > 0 && (
                <div style={{ fontSize: 15, opacity: 0.85 }}>
                  ⭐ {t(`평점 ${rating.toFixed(1)}점`, `评分 ${rating.toFixed(1)}分`)}
                </div>
              )}
              <div style={{ fontSize: 15, opacity: 0.85 }}>
                📦 {t(`총 주문 ${totalOrders}건`, `总订单 ${totalOrders}件`)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/factory/products/new" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px',
                borderRadius: '12px', background: '#e11d48', color: '#fff',
                textDecoration: 'none', fontSize: 14, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(225,29,72,0.5)',
              }}>
                ➕ {t('신제품 등록', '新品登记')}
              </Link>
              {openBriefs.length > 0 && (
                <Link href="/factory/briefs" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px',
                  borderRadius: '12px', background: 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>
                  📋 {t(`${openBriefs.length}건 응답 필요`, `${openBriefs.length}件待响应`)}
                </Link>
              )}
            </div>
          </div>
        </div>


        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: t('미응답 Brief', '待响应需求单'), value: openBriefs.length, icon: '📋', href: '/factory/briefs', color: openBriefs.length > 0 ? '#e11d48' : '#94a3b8', urgent: openBriefs.length > 0 },
            { label: t('등록 제품', '已登记产品'), value: productCount, icon: '📦', href: '/factory/products', color: '#f59e0b', urgent: false },
            { label: t('진행 중 주문', '进行中订单'), value: activeOrders, icon: '🚀', href: '/factory/orders', color: '#667eea', urgent: false },
            { label: t('미읽은 메시지', '未读消息'), value: unreadMessages, icon: '💬', href: '/factory/messages', color: unreadMessages > 0 ? '#10b981' : '#94a3b8', urgent: unreadMessages > 0 },
          ].map((stat) => (
            <Link key={stat.href} href={stat.href} style={{
              display: 'block', padding: '18px', borderRadius: '16px',
              background: stat.urgent ? `${stat.color}10` : 'var(--bg-base)',
              border: `1.5px solid ${stat.urgent ? `${stat.color}30` : 'var(--border-light)'}`,
              textDecoration: 'none', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{stat.label}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: stat.color, fontWeight: 500, marginTop: 6 }}>{t('바로가기 →', '前往 →')}</div>
            </Link>
          ))}
        </div>


        {openBriefs.length > 0 && (
          <div style={{ background: 'var(--bg-base)', borderRadius: '16px', border: '1.5px solid #fecaca', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff5f5' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#e11d48' }}>
                🔴 {t(`미응답 Brief ${openBriefs.length}건`, `待响应需求单 ${openBriefs.length}件`)}
              </span>
              <Link href="/factory/briefs" style={{ fontSize: 14, color: '#e11d48', textDecoration: 'none', fontWeight: 600 }}>{t('전체 보기', '查看全部')}</Link>
            </div>
            {openBriefs.slice(0, 3).map((r: any, i: number) => (
              <Link key={r.id} href={`/factory/briefs/${r.brief?.id ?? ''}`} style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i < Math.min(openBriefs.length, 3) - 1 ? '1px solid var(--border-light)' : 'none',
                textDecoration: 'none',
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.brief?.is_vip_priority && <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 99, border: '1px solid #fde68a', fontWeight: 700 }}>VIP</span>}
                    {lang === 'zh' && r.brief?.title_zh ? r.brief.title_zh : (r.brief?.title_ko ?? r.brief?.brief_no ?? '-')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {lang === 'zh' ? (r.brief?.category?.name_zh ?? r.brief?.category?.name_ko ?? '-') : (r.brief?.category?.name_ko ?? '-')}
                    {r.brief?.target_unit_price_max_cny && ` · ¥${r.brief.target_unit_price_max_cny} 이하`}
                  </div>
                </div>
                <span style={{ fontSize: 14, color: '#e11d48', fontWeight: 700, background: '#fff5f5', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  {t('응답 →', '响应 →')}
                </span>
              </Link>
            ))}
          </div>
        )}


        {recentProducts.length > 0 && (
          <div style={{ background: 'var(--bg-base)', borderRadius: '16px', border: '1px solid var(--border-light)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-[16px] font-bold">{t('등록 제품', '已登记产品')}</span>
              <Link href="/factory/products" style={{ fontSize: 14, color: '#e11d48', textDecoration: 'none', fontWeight: 600 }}>{t('전체 보기', '查看全部')}</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--border-light)' }}>
              {recentProducts.map((p: any) => (
                <Link key={p.id} href={`/factory/products/${p.id}`} style={{
                  padding: '14px', background: 'var(--bg-base)', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                    {p.image_url ? <Image src={p.image_url} alt="" fill sizes="44px" style={{objectFit:"cover"}} /> : '📦'}
                  </div>
                  <div className="min-w-[0px]">
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lang === 'zh' && p.name_zh ? p.name_zh : p.name_ko}
                    </div>
                    <div style={{ fontSize: 13, color: '#e11d48', fontWeight: 700, marginTop: 2 }}>
                      ¥{(p.sell_price_cny ?? p.unit_price_cny ?? 0).toLocaleString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}


        <div style={{
          background: 'linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 100%)',
          borderRadius: '20px', padding: '28px 24px', marginBottom: 24, color: '#fff',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(225,29,72,0.15)', pointerEvents: 'none' }}
              />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', opacity: 0.6, marginBottom: 10, textTransform: 'uppercase' }}>
              {t('KERYX 공장 서비스', 'KERYX 工厂服务')}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>
              {t('🏭 마켓 입점 & 글로벌 수출', '🏭 市场入驻 & 全球出口')}
            </div>
            <div style={{ fontSize: 15, opacity: 0.75, marginBottom: 20, lineHeight: 1.7 }}>
              {t('KERYX를 통해 한국 바이어에게 제품을 공급하고 글로벌 마켓에 진출하세요. MD가 직접 품질을 검증하고 최적의 바이어(고객)와 매칭해 드립니다.', '通过KERYX向韩国买家(客户)供应产品，进军全球市场。MD将直接验证质量并为您匹配最优质的买家(客户)。')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {[
                { icon: '🇰🇷', ko: '한국 수출', zh: '出口韩国' },
                { icon: '🔍', ko: 'MD 검수', zh: 'MD验货' },
                { icon: '💰', ko: '안전 결제', zh: '安全付款' },
              ].map((item) => (
                <div key={item.ko} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{lang === 'zh' ? item.zh : item.ko}</div>
                </div>
              ))}
            </div>
            <Link href="/factory/products/new" style={{
              display: 'block', textAlign: 'center', padding: '14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(225,29,72,0.5)',
            }}>
              {t('지금 제품 등록하기 →', '立即登记产品 →')}
            </Link>
          </div>
        </div>


        <div style={{ background: 'var(--bg-base)', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '18px', boxShadow: 'var(--shadow-sm)', marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            {t('빠른 이동', '快速导航')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { href: '/factory/products', label: t('제품 관리', '产品管理'), icon: '📦', color: '#f59e0b' },
              { href: '/factory/briefs', label: t('Brief', '需求单'), icon: '📋', color: '#e11d48' },
              { href: '/factory/messages', label: t('메시지', '消息'), icon: '💬', color: '#667eea' },
              { href: '/factory/inspections', label: t('검수', '检验'), icon: '🔍', color: '#10b981' },
              { href: '/factory/ratings', label: t('평가', '评价'), icon: '⭐', color: '#d97706' },
              { href: '/factory/products/new', label: t('제품 등록', '登记产品'), icon: '➕', color: '#e11d48' },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 8px', borderRadius: '12px',
                background: 'var(--bg-subtle)', textDecoration: 'none',
                border: '1px solid var(--border-light)',
              }}>
                <span className="text-2xl">{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{item.label}
              </span>
              </Link>
            ))}
          </div>
        </div>

    </div>
  );
}
