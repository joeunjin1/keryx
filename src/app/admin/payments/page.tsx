'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

const ORDER_STATUS_LABELS: Record<string, [string, string, string]> = {
  pending_admin_approval: ['승인대기', '待审批', '#f59e0b'],
  awaiting_deposit:       ['선수금대기', '等待定金', '#f97316'],
  in_production:          ['제작중', '生产中', '#3b82f6'],
  production_completed:   ['제작완료', '生产完成', '#8b5cf6'],
  arrived_warehouse:      ['창고도착', '到达仓库', '#6366f1'],
  inspecting:             ['검수중', '检验中', '#ec4899'],
  inspection_admin_review:['검수검토', '检验审核', '#d946ef'],
  inspection_seller_review:['검수확인', '检验确认', '#a855f7'],
  awaiting_balance:       ['잔금대기', '等待尾款', '#f59e0b'],
  shipping_to_korea:      ['운송중', '运输中', '#10b981'],
  arrived_korea:          ['한국도착', '到达韩国', '#22c55e'],
  delivered:              ['납품완료', '已交付', '#16a34a'],
  cancelled:              ['취소', '已取消', '#ef4444'],
};

const PAYMENT_TYPE_LABELS: Record<string, [string, string, string]> = {
  deposit:        ['선수금', '定金', '#f97316'],
  balance:        ['잔금', '尾款', '#3b82f6'],
  inspection_fee: ['검수비', '检验费', '#8b5cf6'],
  sample_fee:     ['샘플비', '样品费', '#ec4899'],
};

interface OrderPayment {
  id: string;
  order_id: string;
  payment_type: string;
  amount_cny: number;
  is_paid: boolean;
  paid_at: string | null;
  confirmed_by: string | null;
  note: string | null;
  created_at: string;
}

interface Order {
  id: string;
  order_no: string;
  status: string;
  total_cny: number;
  created_at: string;
  seller_id: string;
  seller?: { business_name: string; current_grade: string };
  items?: { qty: number; product?: { name_ko: string } }[];
  order_payments?: OrderPayment[];
}

export default function AdminPaymentsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as any;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');  // 검색 상태
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [addPaymentModal, setAddPaymentModal] = useState<{ orderId: string; orderNo: string } | null>(null);
  const [newPayment, setNewPayment] = useState({ payment_type: 'deposit', amount_cny: '', note: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      load();
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          id, order_no, status, total_cny, created_at, seller_id,
          seller:sellers!seller_id(business_name, current_grade),
          items:order_items(qty, product:products(name_ko)),
          order_payments(id, order_id, payment_type, amount_cny, is_paid, paid_at, confirmed_by, note, created_at)
        `)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) throw err;
      setOrders(data || []);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const getTabOrders = () => {
    if (tab === 'pending') return orders.filter(o => ['pending_admin_approval', 'awaiting_deposit'].includes(o.status));
    if (tab === 'active') return orders.filter(o => ['in_production', 'production_completed', 'arrived_warehouse', 'inspecting', 'inspection_admin_review', 'inspection_seller_review', 'awaiting_balance', 'shipping_to_korea', 'arrived_korea'].includes(o.status));
    return orders.filter(o => o.status === 'delivered');
  };

  const handleConfirmPayment = async (paymentId: string, orderId: string) => {
    setActionId(paymentId);
    try {
      const { error: err } = await supabase
        .from('order_payments')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('id', paymentId);
      if (err) throw err;
      await load();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setActionId(null);
    }
  };

  const handleAddPayment = async () => {
    if (!addPaymentModal || !newPayment.amount_cny) return;
    setActionId('adding');
    try {
      const { error: err } = await supabase
        .from('order_payments')
        .insert({
          order_id: addPaymentModal.orderId,
          payment_type: newPayment.payment_type,
          amount_cny: parseFloat(newPayment.amount_cny),
          is_paid: false,
          note: newPayment.note || null,
        });
      if (err) throw err;
      setAddPaymentModal(null);
      setNewPayment({ payment_type: 'deposit', amount_cny: '', note: '' });
      await load();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setActionId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const info = ORDER_STATUS_LABELS[status];
    return info ? { label: lang === 'zh' ? info[1] : info[0], color: info[2] } : { label: status, color: '#94a3b8' };
  };

  const getPaymentTypeLabel = (type: string) => {
    const info = PAYMENT_TYPE_LABELS[type];
    return info ? { label: lang === 'zh' ? info[1] : info[0], color: info[2] } : { label: type, color: '#94a3b8' };
  };

  const tabList = [
    { id: 'pending', ko: '승인대기/선수금', zh: '待审批/定金', count: orders.filter(o => ['pending_admin_approval', 'awaiting_deposit'].includes(o.status)).length, color: '#f97316' },
    { id: 'active', ko: '진행중', zh: '进行中', count: orders.filter(o => ['in_production', 'production_completed', 'arrived_warehouse', 'inspecting', 'inspection_admin_review', 'inspection_seller_review', 'awaiting_balance', 'shipping_to_korea', 'arrived_korea'].includes(o.status)).length, color: '#3b82f6' },
    { id: 'completed', ko: '납품완료', zh: '已完成', count: orders.filter(o => o.status === 'delivered').length, color: '#10b981' },
  ];

  // 검색 필터 적용
  const tabOrders = getTabOrders().filter(o => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      o.order_no.toLowerCase().includes(q) ||
      (o.seller?.business_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
          💰 {t('결제 관리', '付款管理')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {t('주문별 선수금·잔금·검수비·샘플비 입금 확인 및 관리', '按订单管理定金·尾款·检验费·样品费的收款确认')}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          ⚠️ {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
        </div>
      )}

      {/* 검색 */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('주문번호, 바이어명 검색…', '搜索订单号、买家名…')}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-tertiary)] border border-[var(--border-light)] hover:bg-red-50 hover:text-red-500 transition"
            >
              ✕ {t('초기화', '重置')}
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
            {t(`'${searchQuery}' 검색 결과: ${tabOrders.length}건`, `'${searchQuery}' 搜索结果: ${tabOrders.length}件`)}
          </p>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {tabList.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: tab === tb.id ? tb.color : 'var(--bg-subtle)',
              color: tab === tb.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}
          >
            {lang === 'zh' ? tb.zh : tb.ko}
            {tb.count > 0 && (
              <span style={{
                background: tab === tb.id ? 'rgba(255,255,255,0.3)' : tb.color,
                color: tab === tb.id ? '#fff' : '#fff',
                fontSize: 10, fontWeight: 800,
                padding: '1px 6px', borderRadius: 99,
              }}>{tb.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          {t('로딩 중...', '加载中...')}
        </div>
      ) : tabOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-subtle)', borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            {t('해당 항목이 없습니다', '没有相关项目')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tabOrders.map((order) => {
            const statusInfo = getStatusLabel(order.status);
            const isExpanded = expandedId === order.id;
            const payments = order.order_payments || [];
            const paidCount = payments.filter(p => p.is_paid).length;
            const totalPaymentCny = payments.reduce((sum, p) => sum + (p.amount_cny || 0), 0);
            const paidCny = payments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.amount_cny || 0), 0);

            return (
              <div key={order.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                {/* 주문 헤더 */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{order.order_no}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: statusInfo.color + '20', color: statusInfo.color,
                      }}>{statusInfo.label}</span>
                      {order.seller?.current_grade === 'vip' && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e' }}>👑 VIP</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {order.seller?.business_name || t('바이어', '买家')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}
                      {order.items && order.items.length > 0 && ` · ${order.items[0]?.product?.name_ko || ''}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#f97316' }}>¥{(order.total_cny || 0).toLocaleString()}</div>
                    {payments.length > 0 && (
                      <div style={{ fontSize: 11, color: paidCount === payments.length ? '#10b981' : 'var(--text-tertiary)', fontWeight: 600, marginTop: 2 }}>
                        {paidCount}/{payments.length} {t('입금', '已收')} · ¥{paidCny.toLocaleString()}/{totalPaymentCny.toLocaleString()}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{isExpanded ? '▲' : '▼'}</div>
                  </div>
                </div>

                {/* 결제 항목 상세 */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-light)', padding: '16px 20px', background: 'var(--bg-subtle)' }}>
                    {payments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
                        {t('등록된 결제 항목이 없습니다. 아래 버튼으로 추가하세요.', '暂无付款项目，请点击下方按钮添加。')}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        {payments.map((payment) => {
                          const ptInfo = getPaymentTypeLabel(payment.payment_type);
                          return (
                            <div key={payment.id} style={{
                              background: payment.is_paid ? '#f0fdf4' : 'var(--bg-card)',
                              border: `1px solid ${payment.is_paid ? '#bbf7d0' : 'var(--border-default)'}`,
                              borderRadius: 12,
                              padding: '12px 16px',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                    background: ptInfo.color + '20', color: ptInfo.color,
                                  }}>{ptInfo.label}</span>
                                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>¥{(payment.amount_cny || 0).toLocaleString()}</span>
                                </div>
                                {payment.note && (
                                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{payment.note}</div>
                                )}
                                {payment.is_paid && payment.paid_at && (
                                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 2 }}>
                                    ✅ {t('입금확인', '已确认收款')} · {new Date(payment.paid_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}
                                  </div>
                                )}
                              </div>
                              {!payment.is_paid && (
                                <button
                                  onClick={() => handleConfirmPayment(payment.id, order.id)}
                                  disabled={actionId === payment.id}
                                  style={{
                                    padding: '8px 16px', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    opacity: actionId === payment.id ? 0.7 : 1,
                                    flexShrink: 0,
                                  }}
                                >
                                  {actionId === payment.id ? t('처리중...', '处理中...') : `✅ ${t('입금확인', '确认收款')}`}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 결제 항목 추가 버튼 */}
                    <button
                      onClick={() => setAddPaymentModal({ orderId: order.id, orderNo: order.order_no })}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 10,
                        border: '2px dashed var(--border-default)',
                        background: 'transparent', color: 'var(--text-secondary)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      + {t('결제 항목 추가 (선수금/잔금/검수비/샘플비)', '添加付款项目（定金/尾款/检验费/样品费）')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 결제 항목 추가 모달 */}
      {addPaymentModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '28px 24px',
            maxWidth: 440, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>
              💳 {t('결제 항목 추가', '添加付款项目')}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
              {addPaymentModal.orderNo}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('결제 유형', '付款类型')}
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([key, [ko, zh, color]]) => (
                  <button
                    key={key}
                    onClick={() => setNewPayment(prev => ({ ...prev, payment_type: key }))}
                    style={{
                      padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      border: newPayment.payment_type === key ? 'none' : '1px solid #e5e7eb',
                      background: newPayment.payment_type === key ? color : '#f9fafb',
                      color: newPayment.payment_type === key ? '#fff' : '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    {lang === 'zh' ? zh : ko}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('금액 (CNY)', '金额 (CNY)')}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>¥</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPayment.amount_cny}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount_cny: e.target.value }))}
                  placeholder="0.00"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 16, fontWeight: 700,
                    border: '2px solid #e5e7eb', background: '#f9fafb', color: '#111827',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('메모 (선택)', '备注（可选）')}
              </label>
              <input
                type="text"
                value={newPayment.note}
                onChange={(e) => setNewPayment(prev => ({ ...prev, note: e.target.value }))}
                placeholder={t('예: 1차 선수금 50%', '例：首期定金50%')}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                  border: '1px solid #e5e7eb', background: '#f9fafb', color: '#111827',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleAddPayment}
                disabled={!newPayment.amount_cny || actionId === 'adding'}
                style={{
                  flex: 2, padding: '12px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  opacity: !newPayment.amount_cny ? 0.5 : 1,
                }}
              >
                {actionId === 'adding' ? t('추가 중...', '添加中...') : t('추가하기', '添加')}
              </button>
              <button
                onClick={() => { setAddPaymentModal(null); setNewPayment({ payment_type: 'deposit', amount_cny: '', note: '' }); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: '#f3f4f6', color: '#6b7280',
                  border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('취소', '取消')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
