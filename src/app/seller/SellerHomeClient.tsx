"use client";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLangContext } from '@/components/layout/LangContext';

interface Props {
  displayName: string;
  isAdmin: boolean;
  isVip: boolean;
  assignedMd: string | null;
  products: any[];
  categories: any[];
  unreadCount: number;
  activeOrders: number;
  recentOrders: any[];
  membershipPlan?: string;
  membershipExpires?: string | null;
  membershipStatus?: string;
  serviceRequests?: any[];
  unreadNotifications?: any[];
  pendingReplies?: number;
  hasMatchedFactory?: boolean;
  discountRate?: number;
}

const STATUS_LABELS: Record<string, [string, string, string]> = {
  draft:              ['초안',       '草稿',    '#94a3b8'],
  submitted:          ['제출됨',     '已提交',  '#667eea'],
  confirmed:          ['확인됨',     '已确认',  '#667eea'],
  deposit_pending:    ['계약금 대기','等待定金','#f59e0b'],
  deposit_paid:       ['계약금 납부','定金已付','#10b981'],
  in_production:      ['생산중',     '生产中',  '#f59e0b'],
  qc_pending:         ['검수대기',   '待检验',  '#e11d48'],
  awaiting_balance:   ['잔금 대기',  '等待尾款','#f59e0b'],
  balance_paid:       ['잔금 납부',  '尾款已付','#10b981'],
  shipping_to_korea:  ['운송중',     '运输中',  '#10b981'],
  arrived:            ['도착',       '已到达',  '#22c55e'],
  shipped:            ['배송중',     '运输中',  '#10b981'],
  pending:            ['대기중',     '待处理',  '#94a3b8'],
  completed:          ['완료',       '已完成',  '#22c55e'],
  cancelled:          ['취소',       '已取消',  '#ef4444'],
};

const PIPELINE_STEPS: Array<{ key: string; ko: string; zh: string }> = [
  { key: 'submitted',       ko: '주문접수',   zh: '下单' },
  { key: 'deposit_paid',    ko: '계약금납부', zh: '定金' },
  { key: 'in_production',   ko: '생산중',     zh: '生产' },
  { key: 'qc_pending',      ko: '검수',       zh: '检验' },
  { key: 'balance_paid',    ko: '잔금납부',   zh: '尾款' },
  { key: 'shipping_to_korea', ko: '운송중',   zh: '运输' },
  { key: 'completed',       ko: '완료',       zh: '完成' },
];

function getPipelineStep(status: string): number {
  const order = ['submitted','confirmed','deposit_pending','deposit_paid','in_production','qc_pending','awaiting_balance','balance_paid','shipping_to_korea','arrived','completed'];
  const idx = order.indexOf(status);
  if (idx < 0) return 0;
  if (idx <= 1) return 0;
  if (idx <= 3) return 1;
  if (idx <= 4) return 2;
  if (idx <= 5) return 3;
  if (idx <= 7) return 4;
  if (idx <= 9) return 5;
  return 6;
}

export default function SellerHomeClient({
  displayName, isAdmin, isVip, assignedMd,
  products, categories, unreadCount, activeOrders, recentOrders,
  membershipPlan = 'free', membershipExpires = null, membershipStatus = 'free',
  serviceRequests = [], unreadNotifications = [], pendingReplies = 0,
  hasMatchedFactory = false, discountRate = 5,
}: Props) {
  const { lang } = useLangContext();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [directMatchingProduct, setDirectMatchingProduct] = useState<any>(null);
  const [directMatchDone, setDirectMatchDone] = useState<string | null>(null);

  const handleDirectMatch = async (product: any) => {
    try {
      const res = await fetch('/api/matching/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.name_ko || product.name_zh,
          factory_id: product.factory_id,
          factory_name: product.factory?.company_name || '',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDirectMatchDone(product.id);
        setTimeout(() => setDirectMatchDone(null), 3000);
      } else {
        alert(t('매칭 신청 중 오류가 발생했습니다.', '申请匹配时发生错误。'));
      }
    } catch (e) {
      alert(t('매칭 신청 중 오류가 발생했습니다.', '申请匹配时发生错误。'));
    }
  };

  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p: any) => p.category === selectedCategory);

  // 매칭공장 없을 때 CTA 섹션
  const NoMatchedFactoryCTA = () => (
    <div style={{
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
      border: '2px dashed #c4b5fd',
      borderRadius: '20px',
      padding: '40px 24px',
      textAlign: 'center',
      margin: '24px 0',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🏭</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#4c1d95', marginBottom: 8 }}>
        {t('매칭공장 상품을 받아보세요', '获取匹配工厂商品')}
      </div>
      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, lineHeight: 1.7 }}>
        {t('공장 매칭이 완료되면 매칭공장의 상품을', '工厂匹配完成后，')}
      </div>
      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4, lineHeight: 1.7 }}>
        {t('Shop 가격보다 ', '您将以比Shop价格低')}
        <span style={{ color: '#7c3aed', fontWeight: 700 }}>{discountRate}%</span>
        {t(' 낮은 가격으로 받아보실 수 있습니다.', '的价格获得匹配工厂商品。')}
      </div>
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>
        {t('더 많은 상품을 보려면 Shop을 방문하세요.', '如需查看更多商品，请访问Shop。')}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/seller/matching')}
          style={{
            padding: '14px 28px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 8px 24px rgba(102,126,234,0.4)',
          }}
        >
          {t('🔗 공장 매칭 신청하기', '🔗 申请工厂匹配')}
        </button>
        <button
          onClick={() => router.push('/shop')}
          style={{
            padding: '14px 28px', borderRadius: '14px',
            background: '#fff', color: '#667eea',
            border: '2px solid #667eea', fontSize: 15, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('🛍️ Shop 둘러보기', '🛍️ 浏览Shop')}
        </button>
      </div>
    </div>
  );

  return (
      <div className="kx-animate-in">






        <div style={{
          borderRadius: '20px', overflow: 'hidden', marginBottom: 24, position: 'relative',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          padding: '32px 24px', color: '#fff', minHeight: 200,
        }}>

          <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }}
              />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}
              />
          <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 80, opacity: 0.08, pointerEvents: 'none' }}>🛍️</div>

          <div style={{ position: 'relative', zIndex: 1 }}>

            <div style={{ fontSize: 'clamp(1.3rem, 5vw, 1.8rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.2 }}>
              {t(`안녕하세요, ${displayName}`, `你好，${displayName}`)} 👋
            </div>
            {isVip && (
              <div style={{ display: 'inline-block', background: 'rgba(255,215,0,0.25)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: '99px', padding: '3px 10px', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                👑 VIP {t('회원', '会员')}
              </div>
            )}
            {assignedMd && (
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 18 }}>
                {t(`담당 MD: ${assignedMd}`, `负责MD: ${assignedMd}`)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href="/seller/orders/new"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px',
                  borderRadius: '12px', background: 'rgba(255,255,255,0.92)',
                  border: '1.5px solid rgba(255,255,255,0.9)',
                  color: '#667eea', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
              >
                🛒 {t('주문하기', '立即下单')}
              </Link>
              <button
                onClick={() => setShowMatchModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px',
                  borderRadius: '12px', background: 'rgba(255,255,255,0.18)',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                🔗 {t('공장 매칭', '申请匹配')}
              </button>
            </div>
          </div>
        </div>





        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          <Link href="/seller/orders" style={{
            display: 'block', padding: '18px', borderRadius: '16px',
            background: activeOrders > 0 ? 'linear-gradient(135deg, #667eea15, #764ba215)' : 'var(--bg-base)',
            border: `1.5px solid ${activeOrders > 0 ? '#667eea30' : 'var(--border-light)'}`,
            textDecoration: 'none', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{t('진행 중 주문', '进行中订单')}
              </div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', color: activeOrders > 0 ? '#667eea' : 'var(--text-primary)', lineHeight: 1 }}>
              {activeOrders}
            </div>
            <div style={{ fontSize: 11, color: '#667eea', fontWeight: 500, marginTop: 6 }}>{t('바로가기 →', '前往 →')}</div>
          </Link>
          <Link href="/seller/messages" style={{
            display: 'block', padding: '18px', borderRadius: '16px',
            background: unreadCount > 0 ? 'linear-gradient(135deg, #e11d4815, #f0938015)' : 'var(--bg-base)',
            border: `1.5px solid ${unreadCount > 0 ? '#e11d4830' : 'var(--border-light)'}`,
            textDecoration: 'none', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{t('미읽은 메시지', '未读消息')}
              </div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', color: unreadCount > 0 ? '#e11d48' : 'var(--text-primary)', lineHeight: 1 }}>
              {unreadCount}
            </div>
            <div style={{ fontSize: 11, color: '#e11d48', fontWeight: 500, marginTop: 6 }}>{t('바로가기 →', '前往 →')}</div>
          </Link>
        </div>


        {recentOrders.length > 0 && (
          <div style={{ background: 'var(--bg-base)', borderRadius: '16px', border: '1px solid var(--border-light)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('최근 주문', '最近订单')}
              </span>
              <Link href="/seller/orders" style={{ fontSize: 12, color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>{t('전체 보기', '查看全部')}</Link>
            </div>
            {recentOrders.map((o: any, i: number) => {
              const [koLabel, zhLabel, color] = STATUS_LABELS[o.status] ?? ['처리중', '处理中', '#94a3b8'];
              const pipeStep = getPipelineStep(o.status);
              return (
                <Link key={o.id} href={`/seller/orders/${o.id}`} style={{
                  padding: '14px 18px', display: 'block',
                  borderBottom: i < recentOrders.length - 1 ? '1px solid var(--border-light)' : 'none',
                  textDecoration: 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{o.order_no}</div>
                      <div style={{ fontSize: 11, marginTop: 3 }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: `${color}15`, color, fontSize: 10, fontWeight: 700, border: `1px solid ${color}30` }}>
                          {lang === 'zh' ? zhLabel : koLabel}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#667eea' }}>
                      ¥{(o.total_cny ?? 0).toLocaleString()}
                    </div>
                  </div>
                  {/* 파이프라인 진행바 */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {PIPELINE_STEPS.map((step, si) => (
                      <div key={step.key} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{
                          height: 4, borderRadius: 99,
                          background: si <= pipeStep ? '#667eea' : 'var(--border-default)',
                          marginBottom: 3,
                        }} />
                        <div style={{ fontSize: 8, color: si <= pipeStep ? '#667eea' : 'var(--text-tertiary)', fontWeight: si === pipeStep ? 700 : 400 }}>
                          {lang === 'zh' ? step.zh : step.ko}
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}


        <div className="mb-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                {hasMatchedFactory
                  ? t('🏭 매칭공장 추천 상품', '🏭 匹配工厂推荐商品')
                  : t('상품 둘러보기', '浏览商品')
                }
              </div>
              {hasMatchedFactory && discountRate > 0 && (
                <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginTop: 2 }}>
                  {t(`Shop 대비 ${discountRate}% 할인 적용`, `比Shop低${discountRate}%优惠`)}
                </div>
              )}
            </div>
            <Link href="/shop" style={{ fontSize: 12, color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
              {t('Shop 전체보기', '查看Shop全部')} →
            </Link>
          </div>


          <div className="kx-category-pills">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`kx-pill${selectedCategory === 'all' ? ' active' : ''}`}
              style={selectedCategory === 'all' ? { background: '#667eea', borderColor: '#667eea' } : {}}
            >
              {t('전체', '全部')}
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`kx-pill${selectedCategory === c.id ? ' active' : ''}`}
                style={selectedCategory === c.id ? { background: '#667eea', borderColor: '#667eea' } : {}}
              >
                {c.icon && <span className="mr-1">{c.icon}</span>}
                {lang === 'zh' && c.name_zh ? c.name_zh : c.name_ko}
              </button>
            ))}
          </div>
        </div>


        {!hasMatchedFactory ? (
          <NoMatchedFactoryCTA />
        ) : filteredProducts.length > 0 ? (
          <div className="kx-product-grid mb-7">
            {filteredProducts.map((p: any) => (
              <div key={p.id} className="kx-product-card" style={{ cursor: 'default' }}>
                <Link href={`/shop/${p.id}`} className="no-underline" style={{ display: 'block', position: 'relative' }}>
                  {p.discount_rate > 0 && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8, zIndex: 10,
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: '#fff', fontSize: 10, fontWeight: 800,
                      padding: '3px 8px', borderRadius: '99px',
                      boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                    }}>
                      -{p.discount_rate}%
                    </div>
                  )}
                  <div className="kx-product-img-placeholder min-h-[140px]">
                    {p.image_url
                      ? <Image src={p.image_url} alt={p.name_ko} fill style={{objectFit:"cover"}} />
                      : <span className="text-[40px]">📦</span>
                    }
                  </div>
                  <div className="kx-product-info">
                    <div className="kx-product-name">{lang === 'zh' && p.name_zh ? p.name_zh : p.name_ko}</div>
                    <div className="kx-product-meta">MOQ {p.moq ?? '-'}{t('개', '件')}</div>
                    {p.discounted_price_cny ? (
                      <div style={{ marginTop: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>¥{p.discounted_price_cny.toFixed(2)}</span>
                        {p.original_price_cny && p.original_price_cny !== p.discounted_price_cny && (
                          <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through', marginLeft: 4 }}>¥{p.original_price_cny.toFixed(2)}</span>
                        )}
                      </div>
                    ) : (p.sell_price_cny || p.price_cny) ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', marginTop: 2 }}>¥{(p.sell_price_cny || p.price_cny).toFixed(2)}</div>
                    ) : null}
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 6, padding: '0 10px 10px' }}>
                  <Link
                    href={`/seller/orders/new?product_id=${p.id}`}
                    style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: '10px', background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                  >
                    🛒 {t('주문', '下单')}
                  </Link>
                  <Link
                    href="/shop"
                    style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: '10px', background: '#f3f4f6', color: '#667eea', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                  >
                    🛍️ {t('Shop', 'Shop')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-base)', borderRadius: '16px', border: '1px solid var(--border-light)',
            padding: '48px 24px', textAlign: 'center', marginBottom: 28,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {t('매칭공장 상품이 아직 없습니다', '匹配工厂暂无商品')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
              {t('공장에서 상품을 등록 중입니다. 잠시 후 다시 확인해 주세요.', '工厂正在注册商品，请稍后再查看。')}
            </div>
            <Link
              href="/shop"
              style={{
                display: 'inline-block', padding: '12px 24px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(102,126,234,0.4)',
              }}
            >
              {t('🛍️ Shop 둘러보기', '🛍️ 浏览Shop')}
            </Link>
          </div>
        )}


        {/* 새 회신 알림 배너 */}
        {unreadNotifications.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea15, #764ba215)',
            border: '1.5px solid #667eea40', borderRadius: '16px',
            padding: '14px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>📨</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#667eea' }}>
                  {t(`새 답변 ${unreadNotifications.length}건이 도착했습니다`, `收到 ${unreadNotifications.length} 条新回复`)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {unreadNotifications[0]?.message ?? t('MD가 서비스 요청에 답변했습니다', 'MD已回复您的服务请求')}
                </div>
              </div>
            </div>
            <Link href="/seller/service-requests" style={{
              fontSize: 13, color: '#667eea', fontWeight: 700, textDecoration: 'none',
              background: '#667eea15', padding: '6px 14px', borderRadius: '8px',
              border: '1px solid #667eea30', whiteSpace: 'nowrap',
            }}>
              {t('확인 →', '查看 →')}
            </Link>
          </div>
        )}

        {/* 서비스 요청 현황 카드 */}
        {serviceRequests.length > 0 && (
          <div style={{
            background: 'var(--bg-base)', border: '1px solid var(--border-light)',
            borderRadius: '16px', marginBottom: 16, overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                🗂 {t('서비스 요청 현황', '服务请求状态')}
              </span>
              <Link href="/seller/service-requests" style={{ fontSize: 12, color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
                {t('전체 보기', '查看全部')}
              </Link>
            </div>
            {serviceRequests.slice(0, 3).map((req: any, i: number) => {
              const statusMap: Record<string, [string, string, string]> = {
                pending:     ['대기중', '待处理', '#94a3b8'],
                in_progress: ['진행중', '进行中', '#f59e0b'],
                replied:     ['답변완료', '已回复', '#10b981'],
                completed:   ['완료',   '已完成', '#667eea'],
              };
              const serviceTypeMap: Record<string, [string, string]> = {
                'market-research':    ['시장조사', '市场调查'],
                'factory-matching':   ['공장매칭', '工厂匹配'],
                'sample-development': ['샘플개발', '样品开发'],
                'design-development': ['디자인개발', '设计开发'],
                'package-design':     ['패키지디자인', '包装设计'],
                'logistics':          ['물류대행', '物流代理'],
                'inspection':         ['검수', '检验'],
              };
              const [koS, zhS, color] = statusMap[req.status] ?? ['처리중', '处理中', '#94a3b8'];
              const [koType, zhType] = serviceTypeMap[req.service_type] ?? [req.service_type, req.service_type];
              return (
                <Link key={req.id} href="/seller/service-requests" style={{
                  padding: '12px 18px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: i < Math.min(serviceRequests.length, 3) - 1 ? '1px solid var(--border-light)' : 'none',
                  textDecoration: 'none', background: 'transparent',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.product_name ?? t(koType, zhType)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {t(koType, zhType)}
                    </div>
                  </div>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: `${color}15`, color, fontSize: 10, fontWeight: 700, border: `1px solid ${color}30`, flexShrink: 0, marginLeft: 8 }}>
                    {t(koS, zhS)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}


        {/* 구독 서비스 섹션 - 당분간 숨김 처리 */}
        {false && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
          border: '1.5px solid #fbbf24', borderRadius: '16px', padding: '20px',
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e', marginBottom: 3 }}>
                👑 {t('정기 멤버십 구독', '定期会员订阅')}
              </div>
              <div style={{ fontSize: 12, color: '#78350f', opacity: 0.8 }}>
                {t('시장조사 · 공장 매칭 · 우선 처리 혜택', '市场调研 · 工厂匹配 · 优先处理优惠')}
              </div>
            </div>
            <a href="/seller/membership" style={{
              padding: '10px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {t('멤버십 보기', '查看会员')}
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#667eea', letterSpacing: '0.05em', marginBottom: 4 }}>BASIC</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#667eea', letterSpacing: '-0.03em' }}>¥300<span style={{ fontSize: 11, fontWeight: 500, color: '#92400e' }}>/월</span></div>
              <div style={{ fontSize: 10, color: '#92400e', marginTop: 4, lineHeight: 1.4 }}>{t('시장조사 10건/월', '市场调研10次/月')}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b20, #d9770620)', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1.5px solid #f59e0b' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', letterSpacing: '0.05em', marginBottom: 4 }}>PRO ⭐</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', letterSpacing: '-0.03em' }}>¥500<span style={{ fontSize: 11, fontWeight: 500, color: '#92400e' }}>/월</span></div>
              <div style={{ fontSize: 10, color: '#92400e', marginTop: 4, lineHeight: 1.4 }}>{t('시장조사 무제한', '市场调研无限次')}</div>
            </div>
          </div>
        </div>
        )}


        {showMatchModal && (
          <MatchingModal onClose={() => setShowMatchModal(false)} lang={lang} />
        )}
      </div>
  );
}

// ── 매칭 신청 모달 (다단계 폼) ──
function MatchingModal({ onClose, lang }: { onClose: () => void; lang: string }) {
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // step: 1=신청서, 2=멤버십 안내, 3=완료
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    // 1단계
    productDesc: '',
    refImages: [] as File[],
    businessPurpose: '' as '' | 'promotion' | 'onetime' | 'longterm',
    printPackage: '' as '' | 'yes' | 'no',
    printDesc: '',
    printImages: [] as File[],
    region: '',
    // 고객 정보
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleRefImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setForm(f => ({ ...f, refImages: [...f.refImages, ...Array.from(e.target.files!)] }));
    }
  };
  const handlePrintImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setForm(f => ({ ...f, printImages: [...f.printImages, ...Array.from(e.target.files!)] }));
    }
  };
  const removeRefImage = (idx: number) => setForm(f => ({ ...f, refImages: f.refImages.filter((_, i) => i !== idx) }));
  const removePrintImage = (idx: number) => setForm(f => ({ ...f, printImages: f.printImages.filter((_, i) => i !== idx) }));

  const validateStep1 = () => {
    if (!form.productDesc.trim()) { alert(t('원하시는 제품을 설명해 주세요', '请描述您需要的产品')); return false; }
    if (!form.businessPurpose) { alert(t('사업 목적을 선택해 주세요', '请选择业务目的')); return false; }
    if (!form.companyName.trim()) { alert(t('상호명을 입력해 주세요', '请输入公司名称')); return false; }
    if (!form.contactName.trim()) { alert(t('담당자 성함을 입력해 주세요', '请输入联系人姓名')); return false; }
    if (!form.phone.trim()) { alert(t('전화번호를 입력해 주세요', '请输入电话号码')); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // FormData로 DB 저장 (이미지 제외 텍스트 데이터만 우선 저장)
      await fetch('/api/matching/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_desc: form.productDesc,
          business_purpose: form.businessPurpose,
          print_package: form.printPackage,
          print_desc: form.printDesc,
          region: form.region,
          company_name: form.companyName,
          contact_name: form.contactName,
          phone: form.phone,
          email: form.email,
        }),
      });
    } catch (_) {}
    setSubmitting(false);
    setStep(3);
  };

  const BUSINESS_OPTIONS = [
    { v: 'promotion', ko: '판촉물', zh: '促销品' },
    { v: 'onetime', ko: '1회성 구매', zh: '一次性采购' },
    { v: 'longterm', ko: '장기 판매 (대리점)', zh: '长期销售（代理商）' },
  ];

  const PRINT_OPTIONS = [
    { v: 'yes', ko: '네, 원합니다', zh: '是的，需要' },
    { v: 'no', ko: '아니요', zh: '不需要' },
  ];

  return (
    <div className="kx-modal-backdrop" onClick={onClose}>
      <div className="kx-modal max-w-[560px]" onClick={e => e.stopPropagation()}>

        <div className="kx-modal-header">
          <div>
            <div className="kx-modal-title">
              {step === 1 ? t('🔗 공장 매칭 신청서', '🔗 工厂匹配申请表') : t('✅ 신청 완료', '✅ 申请完成')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {step === 1 ? t('원하시는 제품과 요청사항을 상세히 입력해 주세요', '请详细填写您需要的产品及需求') : ''}
            </div>
          </div>
          <button onClick={onClose} className="active:scale-95 transition-all" style={{ background: 'var(--bg-muted)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕
              </button>
        </div>




        <div className="kx-modal-body">


          {step === 1 && (
            <div className="flex flex-col gap-5">


              <div style={{ background: 'linear-gradient(135deg, #f0f4ff, #faf5ff)', border: '1px solid #e0e7ff', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🏭</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#4c1d95', marginBottom: 6 }}>{t('고객님만의 공장을 매칭해 드립니다', '为您専属匹配工厂合作伙伴')}</div>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                      {t(
                        '고객님만의 공장이 될 수 있는 소중한 생산 공급파트너를 매칭해드립니다.',
                        '为您匹配能成为您専属工厂的宝贵生产供应合作伙伴。'
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '10px', padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.8, borderLeft: '3px solid #667eea' }}>
                  {t(
                    '한번에 완벽하진 않겠지만 저희는 장단기적으로 고객님에게 꼭 필요한 공장들을 매칭시켜드릴 것입니다.',
                    '虽然一次可能不完美，但我们将长期为您匹配最适合的工厂。'
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                  {t(
                    '주요품목을 자세하게 알려주시면 적합한 공장을 찾아 매칭해드리겠습니다.',
                    '请详细告知主要产品，我们将为您匹配最合适的工厂。'
                  )}
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '10px', padding: '12px 14px', fontSize: 13, color: '#78350f', lineHeight: 1.8, border: '1px solid #fde68a' }}>
                  {t(
                    '공장매칭이 되면 공장에서는 공장의 환경, 주요제품, 기계설비 등을 보실 수 있도록 자세한 정보를 드릴 것입니다. 샘플 구매 등 테스트 오더를 해보시고 좋은 파트너로 연결되길 기원합니다.',
                    '匹配工厂后，工厂将提供工厂环境、主要产品、机器设备等详细信息。建议先进行样品订单测试，希望成为长期合作伙伴。'
                  )}
                </div>
              </div>


              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {t('1. 원하시는 제품을 알려주세요 *', '1. 请告诉我们您需要的产品 *')}
                </label>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                  {t('소재, 색상, 크기, 수량, 예산 등 최대한 자세하게 작성해 주세요. 자세할수록 더 정확한 공장을 매칭해 드립니다.', '请尽量详细描述材质、颜色、尺寸、数量、预算等。越详细，匹配越精准。')}
                </div>
                <textarea
                  style={{ width: '100%', minHeight: 120, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--border-default)', fontSize: 14, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', outline: 'none', background: 'var(--bg-base)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  placeholder={t('예) 귀여운 캐릭터 인형, 20cm 내외, 부드러운 소재, 1,000개, 개당 3,000원 이내, OEM 가능한 공장...', '例）可爱角色玩偶，约20cm，柔软材质，1000个，每个3元以内，可OEM的工厂...')}
                  value={form.productDesc}
                  onChange={e => setForm(f => ({ ...f, productDesc: e.target.value }))}
                />
              </div>


              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {t('2. 원하시는 제품의 참고사진을 올려주세요', '2. 请上传参考图片')}
                </label>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                  {t('여러 장 업로드 가능합니다. 참고사진이 있으면 매칭 정확도가 높아집니다.', '可上传多张图片。有参考图片可提高匹配准确度。')}
                </div>

                {form.refImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {form.refImages.map((file, idx) => (
                      <div key={idx} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                        <Image src={URL.createObjectURL(file)} alt="" width={80} height={80} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        <button onClick={() => removeRefImage(idx)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕
              </button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: '12px', border: '2px dashed var(--border-default)', cursor: 'pointer', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
                  <span className="text-xl">📷</span>
                  {t('사진 추가하기 (여러 장 가능)', '添加图片（可多张）')}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleRefImages} />
                </label>
              </div>


              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {t('3. 이 제품으로 원하시는 사업을 설명해주세요 *', '3. 请说明您希望用此产品开展的业务 *')}
                </label>
                <div className="flex flex-col gap-2">
                  {BUSINESS_OPTIONS.map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, businessPurpose: opt.v as any }))}
                      style={{
                        padding: '13px 16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                        border: `1.5px solid ${form.businessPurpose === opt.v ? '#667eea' : 'var(--border-default)'}`,
                        background: form.businessPurpose === opt.v ? 'linear-gradient(135deg, #667eea10, #764ba210)' : 'var(--bg-base)',
                        color: form.businessPurpose === opt.v ? '#667eea' : 'var(--text-primary)',
                        fontSize: 14, fontWeight: form.businessPurpose === opt.v ? 700 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span className="mr-2">{form.businessPurpose === opt.v ? '✅' : '⬜'}</span>
                      {lang === 'zh' ? opt.zh : opt.ko}
                    </button>
                  ))}
                </div>
              </div>


              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {t('4. 인쇄 패키지를 원하시나요?', '4. 是否需要印刷包装？')}
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {PRINT_OPTIONS.map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, printPackage: opt.v as any }))}
                      style={{
                        flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer',
                        border: `1.5px solid ${form.printPackage === opt.v ? '#667eea' : 'var(--border-default)'}`,
                        background: form.printPackage === opt.v ? '#667eea10' : 'var(--bg-base)',
                        color: form.printPackage === opt.v ? '#667eea' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: form.printPackage === opt.v ? 700 : 400,
                      }}
                    >
                      {lang === 'zh' ? opt.zh : opt.ko}
                    </button>
                  ))}
                </div>
                {form.printPackage === 'yes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <textarea
                      style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-default)', fontSize: 13, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-base)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      placeholder={t('인쇄/패키지 내용을 상세하게 설명해 주세요 (로고, 색상, 문구, 포장 형태 등)', '请详细说明印刷/包装内容（Logo、颜色、文字、包装形式等）')}
                      value={form.printDesc}
                      onChange={e => setForm(f => ({ ...f, printDesc: e.target.value }))}
                    />
                    {form.printImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.printImages.map((file, idx) => (
                          <div key={idx} style={{ position: 'relative', width: 64, height: 64 }}>
                            <Image src={URL.createObjectURL(file)} alt="" width={64} height={64} />
                            <button onClick={() => removePrintImage(idx)} style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕
              </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: '10px', border: '2px dashed var(--border-default)', cursor: 'pointer', background: 'var(--bg-base)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                      <span className="text-base">🖼️</span>
                      {t('패키지 참고사진 추가', '添加包装参考图片')}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePrintImages} />
                    </label>
                  </div>
                )}
              </div>


              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {t('5. 찾으시는 공장의 희망 지역이 있나요?', '5. 是否有希望的工厂地区？')}
                </label>
                <input
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--border-default)', fontSize: 14, background: 'var(--bg-base)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                  placeholder={t('예: 광저우, 이우, 선전, 지역 무관 등', '例如：广州、义乌、深圳、不限地区等')}
                  value={form.region}
                  onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                />
              </div>


              <div style={{ background: 'linear-gradient(135deg, #f8faff, #f3f4f6)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {t('6. 고객님의 상호와 연락처를 남겨주세요', '6. 请留下您的公司名称和联系方式')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                  {t('긴급하거나 중요한 업무가 있을 때만 문자로 연락드립니다.', '仅在紧急或重要事项时通过短信联系您。')}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--border-default)', fontSize: 14, background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                    placeholder={t('상호명 *', '公司名称 *')}
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  />
                  <input
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--border-default)', fontSize: 14, background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                    placeholder={t('담당자 성함 *', '联系人姓名 *')}
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  />
                  <input
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--border-default)', fontSize: 14, background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                    placeholder={t('전화번호 *', '电话号码 *')}
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                  <input
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--border-default)', fontSize: 14, background: '#fff', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                    placeholder={t('이메일 (선택)', '邮箱（选填）')}
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>


              <button
                type="button"
                disabled={submitting}
                onClick={() => { if (validateStep1()) handleSubmit(); }}
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff', border: 'none', fontSize: 16, fontWeight: 800,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
                  letterSpacing: '-0.02em',
                }}
              >
                {submitting ? t('신청 중...', '申请中...') : t('신청서 제출', '提交申请表')}
              </button>
            </div>
          )}


          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '1px solid #6ee7b7', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="text-2xl">✅</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>{t('신청서가 접수되었습니다!', '申请表已提交！')}</div>
                  <div style={{ fontSize: 12, color: '#047857' }}>{t('담당 MD가 24시간 내 연락드립니다.', '负责MD将在24小时内与您联系。')}</div>
                </div>
              </div>


              <button
                onClick={onClose}
                className="active:scale-95 transition-all" style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('닫기', '关闭')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
