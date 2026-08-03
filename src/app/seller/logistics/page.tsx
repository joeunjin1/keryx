'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

const SHIPMENT_STATUS_MAP: Record<string, { ko: string; zh: string; color: string; icon: string; step: number }> = {
  in_transit:       { ko: '운송 중',     zh: '运输中',   color: '#4f46e5', icon: '🚢', step: 1 },
  customs_clearing: { ko: '통관 진행 중', zh: '清关中',   color: '#f59e0b', icon: '🏛️', step: 2 },
  arrived:          { ko: '입항 완료',   zh: '已到港',   color: '#10b981', icon: '⚓', step: 3 },
  delivering:       { ko: '배송 중',     zh: '配送中',   color: '#0891b2', icon: '🚚', step: 4 },
  delivered:        { ko: '배송 완료',   zh: '已送达',   color: '#6b7280', icon: '✅', step: 5 },
};

const STEPS = [
  { ko: '출발', zh: '出发' },
  { ko: '운송 중', zh: '运输中' },
  { ko: '통관', zh: '清关' },
  { ko: '입항', zh: '到港' },
  { ko: '배송', zh: '配送' },
  { ko: '완료', zh: '完成' },
];

type ShipmentItem = {
  id: string;
  shipment_no: string;
  shipping_method: string;
  tracking_no: string | null;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  shipping_cost_cny: number | null;
  notes_zh: string | null;
  order: {
    id: string;
    order_no: string;
    total_cny: number;
    total_qty: number;
    total_cbm: number | null;
    status: string;
    order_items: Array<{
      id: string;
      product_name: string;
      product_name_zh: string | null;
      quantity: number;
      unit_price_cny: number;
      cbm_per_unit: number | null;
      image_url: string | null;
    }>;
  };
};

export default function SellerLogisticsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login?role=seller'); return; }

    // 검수 승인 + 결제 완료된 주문의 shipments 조회
    const { data, error } = await supabase
      .from('shipments')
      .select(`
        id, shipment_no, shipping_method, tracking_no, tracking_url,
        status, shipped_at, arrived_at, delivered_at, shipping_cost_cny, notes_zh,
        order:orders(
          id, order_no, total_cny, total_qty, status,
          order_items(
            id, product_name, product_name_zh, quantity, unit_price_cny, cbm_per_unit, image_url
          )
        )
      `)
      .eq('seller_id', user.id)
      .order('shipped_at', { ascending: false });

    if (!error && data) {
      setShipments(data as ShipmentItem[]);
    }
    setLoading(false);
  }

  const filtered = shipments.filter(s => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchSearch = !searchText ||
      s.shipment_no.toLowerCase().includes(searchText.toLowerCase()) ||
      s.order?.order_no?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.order?.order_items?.some(i =>
        i.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        i.product_name_zh?.toLowerCase().includes(searchText.toLowerCase())
      );
    return matchStatus && matchSearch;
  });

  const totalCBM = filtered.reduce((sum, s) => {
    const cbm = s.order?.order_items?.reduce((c, i) => c + ((i.cbm_per_unit || 0) * i.quantity), 0) || 0;
    return sum + cbm;
  }, 0);

  const totalShippingCost = filtered.reduce((sum, s) => sum + (s.shipping_cost_cny || 0), 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚢</div>
        <div style={{ color: 'var(--text-secondary)' }}>{t('로딩 중...', '加载中...')}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }}>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg,#0c4a6e 0%,#075985 50%,#0369a1 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>{t('통관·운송', '通关·运输')}</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{t('통관·운송 현황', '通关·运输状态')}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 20 }}>{t('검수 승인 및 결제 완료된 상품의 운송·통관 진행 현황을 확인하세요', '查看已通过检验并完成付款的商品的运输·通关进度')}</div>
          {/* 요약 통계 */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '10px 18px', backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{t('진행 중 건수', '进行中件数')}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{shipments.filter(s => !['delivered'].includes(s.status)).length}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '10px 18px', backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{t('총 CBM', '总CBM')}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{totalCBM.toFixed(3)} m³</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '10px 18px', backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{t('총 운송비', '总运费')}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>¥{totalShippingCost.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder={t('운송번호, 주문번호, 상품명 검색...', '搜索运输单号、订单号、商品名...')}
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border-light)', fontSize: 13, background: 'var(--bg-base)', color: 'var(--text-primary)' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', ko: '전체', zh: '全部' },
            { id: 'in_transit', ko: '운송 중', zh: '运输中' },
            { id: 'customs_clearing', ko: '통관 중', zh: '清关中' },
            { id: 'arrived', ko: '입항 완료', zh: '已到港' },
            { id: 'delivered', ko: '완료', zh: '已完成' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterStatus(f.id)} style={{ padding: '8px 14px', borderRadius: '8px', border: `1.5px solid ${filterStatus === f.id ? '#0369a1' : 'var(--border-light)'}`, background: filterStatus === f.id ? '#0369a1' : 'var(--bg-base)', color: filterStatus === f.id ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {t(f.ko, f.zh)}
            </button>
          ))}
        </div>
      </div>

      {/* 운송 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--bg-base)', borderRadius: '16px', border: '2px dashed var(--border-light)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚢</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{t('진행 중인 운송이 없습니다', '暂无进行中的运输')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{t('검수 승인 및 결제가 완료된 주문이 이곳에 표시됩니다', '检验通过并完成付款的订单将显示在此处')}</div>
        </div>
      ) : (
        filtered.map(shipment => {
          const statusInfo = SHIPMENT_STATUS_MAP[shipment.status] || { ko: shipment.status, zh: shipment.status, color: '#94a3b8', icon: '📦', step: 0 };
          const isExpanded = expandedId === shipment.id;
          const totalQty = shipment.order?.order_items?.reduce((s, i) => s + i.quantity, 0) || 0;
          const totalCbm = shipment.order?.order_items?.reduce((s, i) => s + ((i.cbm_per_unit || 0) * i.quantity), 0) || 0;
          const firstItem = shipment.order?.order_items?.[0];

          return (
            <div key={shipment.id} style={{ background: 'var(--bg-base)', borderRadius: '16px', border: '1.5px solid var(--border-light)', marginBottom: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {/* 메인 행 */}
              <button onClick={() => setExpandedId(isExpanded ? null : shipment.id)} style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* 상품 썸네일 */}
                <div style={{ width: 52, height: 52, borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-subtle)', position: 'relative' }}>
                  {firstItem?.image_url ? (
                    <Image src={firstItem.image_url} alt="" fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📦</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {firstItem ? (lang === 'zh' ? firstItem.product_name_zh || firstItem.product_name : firstItem.product_name) : t('(상품 없음)', '(无商品)')}
                      {(shipment.order?.order_items?.length || 0) > 1 && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>+{(shipment.order.order_items.length - 1)}</span>
                      )}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: statusInfo.color + '18', color: statusInfo.color }}>
                      {statusInfo.icon} {t(statusInfo.ko, statusInfo.zh)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{shipment.shipment_no}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>📦 {totalQty.toLocaleString()}{t('개', '个')}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>📐 {totalCbm.toFixed(3)} m³</span>
                    {shipment.shipping_cost_cny && (
                      <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>🚢 ¥{shipment.shipping_cost_cny.toLocaleString()}</span>
                    )}
                    {shipment.shipped_at && (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {t('출발', '出发')}: {new Date(shipment.shipped_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--text-tertiary)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
              </button>

              {/* 진행 단계 바 */}
              <div style={{ padding: '0 20px 14px', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
                  {STEPS.map((step, idx) => {
                    const isDone = idx < statusInfo.step;
                    const isCurrent = idx === statusInfo.step;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? '#0369a1' : isCurrent ? '#0369a1cc' : 'var(--bg-subtle)', border: `2px solid ${isDone || isCurrent ? '#0369a1' : 'var(--border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: isDone || isCurrent ? '#fff' : 'var(--text-tertiary)', fontWeight: 700, flexShrink: 0 }}>
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span style={{ fontSize: 10, color: isCurrent ? '#0369a1' : 'var(--text-tertiary)', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>{t(step.ko, step.zh)}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div style={{ flex: 1, height: 2, background: isDone ? '#0369a1' : 'var(--border-light)', margin: '0 4px', marginBottom: 20 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 상세 펼치기 */}
              {isExpanded && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                  {/* 운송 정보 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: t('운송 방법', '运输方式'), value: shipment.shipping_method },
                      { label: t('운송장 번호', '运单号'), value: shipment.tracking_no || t('미입력', '未填写') },
                      { label: t('출발일', '出发日'), value: shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR') : '-' },
                      { label: t('입항일', '到港日'), value: shipment.arrived_at ? new Date(shipment.arrived_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR') : t('예정', '预计') },
                      { label: t('배송 완료일', '送达日'), value: shipment.delivered_at ? new Date(shipment.delivered_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR') : '-' },
                      { label: t('운송비', '运费'), value: shipment.shipping_cost_cny ? `¥${shipment.shipping_cost_cny.toLocaleString()}` : t('미확정', '待确认') },
                    ].map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-base)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 상품 목록 */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8 }}>{t('포함 상품', '包含商品')}</div>
                    <div style={{ background: 'var(--bg-base)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      {/* 테이블 헤더 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 80px 80px', gap: 0, padding: '8px 14px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                        {[t('사진', '图片'), t('상품명', '商品名'), t('수량', '数量'), t('CBM', 'CBM'), t('단가', '单价')].map((h, i) => (
                          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textAlign: i > 1 ? 'right' : 'left' }}>{h}</div>
                        ))}
                      </div>
                      {shipment.order?.order_items?.map((item, idx) => {
                        const cbm = (item.cbm_per_unit || 0) * item.quantity;
                        return (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 80px 80px', gap: 0, padding: '10px 14px', borderBottom: idx < (shipment.order.order_items.length - 1) ? '1px solid var(--border-light)' : 'none', alignItems: 'center' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-subtle)', position: 'relative' }}>
                              {item.image_url ? (
                                <Image src={item.image_url} alt="" fill style={{ objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)', paddingLeft: 8 }}>
                              {lang === 'zh' ? item.product_name_zh || item.product_name : item.product_name}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{item.quantity.toLocaleString()}</div>
                            <div style={{ fontSize: 12, color: '#0369a1', textAlign: 'right' }}>{cbm.toFixed(4)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>¥{item.unit_price_cny}</div>
                          </div>
                        );
                      })}
                      {/* 합계 행 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 80px 80px', gap: 0, padding: '10px 14px', background: 'var(--bg-subtle)', borderTop: '2px solid var(--border-light)' }}>
                        <div />
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', paddingLeft: 8 }}>{t('합계', '合计')}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>{totalQty.toLocaleString()}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textAlign: 'right' }}>{totalCbm.toFixed(4)}</div>
                        <div />
                      </div>
                    </div>
                  </div>

                  {/* 추적 링크 */}
                  {shipment.tracking_url && (
                    <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: '10px', background: '#0369a1', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      🔍 {t('운송 추적하기', '追踪运输')}
                    </a>
                  )}

                  {shipment.notes_zh && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('메모', '备注')}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{shipment.notes_zh}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
