'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

// DB enum order_status 값과 정확히 일치
const STATUS_META: Record<string, { label: string; labelZh: string; color: string; next: string[] }> = {
  draft:                    { label: '초안',         labelZh: '草稿',     color: '#94a3b8', next: ['pending_admin_approval', 'cancelled'] },
  pending_admin_approval:   { label: '주문승인전',   labelZh: '待审批',   color: '#a855f7', next: ['awaiting_deposit', 'cancelled'] },
  awaiting_deposit:         { label: '선수금대기',   labelZh: '等待预付款', color: '#f59e0b', next: ['in_production', 'cancelled'] },
  in_production:            { label: '제작중',       labelZh: '生产中',   color: '#3b82f6', next: ['production_completed', 'cancelled'] },
  production_completed:     { label: '제작완료',     labelZh: '生产完成', color: '#0ea5e9', next: ['arrived_warehouse'] },
  arrived_warehouse:        { label: '창고도착',     labelZh: '已到仓库', color: '#8b5cf6', next: ['inspecting'] },
  inspecting:               { label: '검수중',       labelZh: '检验中',   color: '#e11d48', next: ['inspection_admin_review', 'inspection_seller_review'] },
  inspection_admin_review:  { label: '검수검토중',   labelZh: '审核检验', color: '#f97316', next: ['inspection_seller_review', 'inspecting'] },
  inspection_seller_review: { label: '검수확인요청', labelZh: '请确认检验', color: '#eab308', next: ['awaiting_balance', 'inspecting'] },
  awaiting_balance:         { label: '잔금대기',     labelZh: '等待尾款', color: '#f59e0b', next: ['shipping_to_korea', 'cancelled'] },
  shipping_to_korea:        { label: '운송중',       labelZh: '运输中',   color: '#06b6d4', next: ['arrived_korea'] },
  arrived_korea:            { label: '한국도착',     labelZh: '已到韩国', color: '#10b981', next: ['delivered'] },
  delivered:                { label: '납품완료',     labelZh: '已交付',   color: '#22c55e', next: [] },
  disputed:                 { label: '이의제기',     labelZh: '有争议',   color: '#ef4444', next: ['cancelled', 'awaiting_balance'] },
  cancelled:                { label: '취소됨',       labelZh: '已取消',   color: '#6b7280', next: [] },
};

const NEXT_LABEL: Record<string, { ko: string; zh: string }> = {
  pending_admin_approval:   { ko: '📋 승인 대기 등록', zh: '📋 登记待审批' },
  awaiting_deposit:         { ko: '✅ 주문 승인 (선수금 요청)', zh: '✅ 确认订单（请求预付款）' },
  in_production:            { ko: '🏭 제작 시작', zh: '🏭 开始生产' },
  production_completed:     { ko: '✔️ 제작 완료', zh: '✔️ 生产完成' },
  arrived_warehouse:        { ko: '🏠 창고 도착', zh: '🏠 到达仓库' },
  inspecting:               { ko: '🔍 검수 시작', zh: '🔍 开始检验' },
  inspection_admin_review:  { ko: '📝 검수 검토', zh: '📝 审核检验' },
  inspection_seller_review: { ko: '📨 검수 확인 요청', zh: '📨 请求确认检验' },
  awaiting_balance:         { ko: '✅ 검수 완료 (잔금 요청)', zh: '✅ 检验完成（请求尾款）' },
  shipping_to_korea:        { ko: '🚢 한국 운송 시작', zh: '🚢 开始运往韩国' },
  arrived_korea:            { ko: '🇰🇷 한국 도착', zh: '🇰🇷 到达韩国' },
  delivered:                { ko: '📦 납품 완료', zh: '📦 交付完成' },
  cancelled:                { ko: '❌ 취소', zh: '❌ 取消' },
  disputed:                 { ko: '⚠️ 이의 제기', zh: '⚠️ 提出争议' },
};

const T = {
  ko: {
    title: '📋 주문 관리',
    loading: '⏳ 로딩 중...',
    empty: '해당 상태의 주문이 없습니다.',
    orderItems: '📦 주문 상품',
    unit: '개',
    requests: '요청:',
    packaging: '포장:',
    statusChange: '🔄 상태 변경',
    statusMemo: '상태 변경 메모 (선택)',
    paymentTitle: '💳 결제 정보 전송',
    prevPayment: '이전 발송 내용:',
    paymentPlaceholder: '결제 링크 또는 계좌 정보를 입력하세요\n예) 계좌: 공상은행 6222-xxxx-xxxx / 수취인: SENKANG CO.\n또는 결제 링크: https://pay.example.com/...',
    sending: '전송 중...',
    sendBtn: '📤 바이어에게 결제 정보 전송',
    paymentSent: '💳 결제정보 발송됨',
    statusFail: '상태 변경 실패',
    networkErr: '네트워크 오류',
    sendSuccess: '결제 정보가 바이어에게 전송되었습니다.',
    sendFail: '전송 실패',
    tabs: {
      pending_admin_approval: '승인대기',
      awaiting_deposit:       '선수금대기',
      in_production:          '제작중',
      inspecting:             '검수중',
      awaiting_balance:       '잔금대기',
      shipping_to_korea:      '운송중',
      delivered:              '납품완료',
      all:                    '전체',
    },
  },
  zh: {
    title: '📋 订单管理',
    loading: '⏳ 加载中...',
    empty: '该状态下暂无订单。',
    orderItems: '📦 订单商品',
    unit: '件',
    requests: '备注:',
    packaging: '包装:',
    statusChange: '🔄 状态变更',
    statusMemo: '状态变更备注（选填）',
    paymentTitle: '💳 发送付款信息',
    prevPayment: '上次发送内容:',
    paymentPlaceholder: '请输入付款链接或账户信息\n例) 账户: 工商银行 6222-xxxx-xxxx / 收款方: SENKANG CO.\n或付款链接: https://pay.example.com/...',
    sending: '发送中...',
    sendBtn: '📤 向买家发送付款信息',
    paymentSent: '💳 已发送付款信息',
    statusFail: '状态变更失败',
    networkErr: '网络错误',
    sendSuccess: '付款信息已发送给买家。',
    sendFail: '发送失败',
    tabs: {
      pending_admin_approval: '待审批',
      awaiting_deposit:       '等待预付款',
      in_production:          '生产中',
      inspecting:             '检验中',
      awaiting_balance:       '等待尾款',
      shipping_to_korea:      '运输中',
      delivered:              '已交付',
      all:                    '全部',
    },
  },
};

export default function AdminOrdersPage() {
  const supabase = createClient() as any;
  const { lang } = useLangContext();
  const t = T[lang];
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending_admin_approval');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<Record<string, string>>({});
  const [sendingPayment, setSendingPayment] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`id, order_no, status, total_cny, created_at, buyer_order_note, packaging_request, payment_info, payment_info_sent_at,
        seller:sellers(id, business_name),
        items:order_items(id, qty, unit_price_cny, subtotal_cny, product:products(name_ko, name_zh, sku))`)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) console.error('[admin/orders] fetchOrders error:', JSON.stringify(error));
    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const tabs = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    // 승인대기: draft + pending_admin_approval 합산
    const pendingCount = (counts['draft'] ?? 0) + (counts['pending_admin_approval'] ?? 0);
    return [
      { id: 'pending_admin_approval', label: t.tabs.pending_admin_approval, count: pendingCount },
      { id: 'awaiting_deposit',       label: t.tabs.awaiting_deposit,       count: counts['awaiting_deposit'] ?? 0 },
      { id: 'in_production',          label: t.tabs.in_production,          count: (counts['in_production'] ?? 0) + (counts['production_completed'] ?? 0) + (counts['arrived_warehouse'] ?? 0) },
      { id: 'inspecting',             label: t.tabs.inspecting,             count: (counts['inspecting'] ?? 0) + (counts['inspection_admin_review'] ?? 0) + (counts['inspection_seller_review'] ?? 0) },
      { id: 'awaiting_balance',       label: t.tabs.awaiting_balance,       count: counts['awaiting_balance'] ?? 0 },
      { id: 'shipping_to_korea',      label: t.tabs.shipping_to_korea,      count: (counts['shipping_to_korea'] ?? 0) + (counts['arrived_korea'] ?? 0) },
      { id: 'delivered',              label: t.tabs.delivered,              count: counts['delivered'] ?? 0 },
      { id: 'all',                    label: t.tabs.all,                    count: orders.length },
    ];
  }, [orders, lang]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return orders;
    if (activeTab === 'pending_admin_approval') return orders.filter(o => ['draft', 'pending_admin_approval'].includes(o.status));
    if (activeTab === 'in_production') return orders.filter(o => ['in_production', 'production_completed', 'arrived_warehouse'].includes(o.status));
    if (activeTab === 'inspecting') return orders.filter(o => ['inspecting', 'inspection_admin_review', 'inspection_seller_review'].includes(o.status));
    if (activeTab === 'shipping_to_korea') return orders.filter(o => ['shipping_to_korea', 'arrived_korea'].includes(o.status));
    return orders.filter(o => o.status === activeTab);
  }, [orders, activeTab]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setChangingStatus(orderId);
    try {
      const res = await fetch(`/api/buyer/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: statusNote[orderId] }),
      });
      if (res.ok) {
        const meta = STATUS_META[newStatus];
        const label = lang === 'zh' ? (meta?.labelZh ?? newStatus) : (meta?.label ?? newStatus);
        setMsg({ id: orderId, text: lang === 'zh' ? `状态已变更为"${label}"。` : `상태가 "${label}"으로 변경되었습니다.`, ok: true });
        await fetchOrders();
      } else {
        const err = await res.json();
        setMsg({ id: orderId, text: err.error ?? t.statusFail, ok: false });
      }
    } catch {
      setMsg({ id: orderId, text: t.networkErr, ok: false });
    } finally {
      setChangingStatus(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleSendPaymentInfo = async (orderId: string) => {
    const info = paymentInfo[orderId];
    if (!info?.trim()) return;
    setSendingPayment(orderId);
    try {
      const res = await fetch(`/api/buyer/orders/${orderId}/payment-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_info: info }),
      });
      if (res.ok) {
        setMsg({ id: orderId, text: t.sendSuccess, ok: true });
        await fetchOrders();
      } else {
        setMsg({ id: orderId, text: t.sendFail, ok: false });
      }
    } catch {
      setMsg({ id: orderId, text: t.networkErr, ok: false });
    } finally {
      setSendingPayment(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t.loading}</div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 }}>{t.title}</h1>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? '#667eea' : '#f3f4f6',
              color: activeTab === tab.id ? '#fff' : '#374151',
            }}
          >
            {tab.label} <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 4, background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : '#e5e7eb', borderRadius: 99, padding: '1px 6px' }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* 주문 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>{t.empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(order => {
            const meta = STATUS_META[order.status] ?? { label: order.status, labelZh: order.status, color: '#94a3b8', next: [] };
            const statusLabel = lang === 'zh' ? (meta.labelZh ?? meta.label) : meta.label;
            const isExpanded = expandedId === order.id;
            const nextStatuses = meta.next ?? [];
            return (
              <div key={order.id} style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${isExpanded ? meta.color : '#e5e7eb'}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {/* 헤더 */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `4px solid ${meta.color}` }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{order.order_no || order.id.slice(0, 8)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${meta.color}20`, color: meta.color }}>{statusLabel}</span>
                      {order.payment_info && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e' }}>{t.paymentSent}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {order.seller?.business_name} · ¥{(order.total_cny ?? 0).toLocaleString()} · {new Date(order.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: '#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* 상세 펼침 */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 18px', borderTop: '1px solid #f3f4f6' }}>
                    {/* 주문 상품 */}
                    {order.items?.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{t.orderItems}</div>
                        {order.items.map((item: any) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                            <span>{(lang === 'zh' ? item.product?.name_zh : item.product?.name_ko) ?? item.product?.name_ko ?? '-'} ({item.product?.sku ?? '-'})</span>
                            <span style={{ color: '#667eea', fontWeight: 600 }}>{item.qty?.toLocaleString()}{t.unit} × ¥{item.unit_price_cny} = ¥{item.subtotal_cny?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 요청사항 */}
                    {(order.buyer_order_note || order.packaging_request) && (
                      <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
                        {order.buyer_order_note && <div>{t.requests} {order.buyer_order_note}</div>}
                        {order.packaging_request && <div>{t.packaging} {order.packaging_request}</div>}
                      </div>
                    )}

                    {/* 상태 변경 */}
                    {nextStatuses.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{t.statusChange}</div>
                        <textarea
                          value={statusNote[order.id] ?? ''}
                          onChange={e => setStatusNote(p => ({ ...p, [order.id]: e.target.value }))}
                          placeholder={t.statusMemo}
                          rows={2}
                          style={{ width: '100%', fontSize: 12, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {nextStatuses.map(ns => {
                            const nl = NEXT_LABEL[ns];
                            const btnLabel = nl ? (lang === 'zh' ? nl.zh : nl.ko) : ns;
                            const isCancelBtn = ns === 'cancelled';
                            return (
                              <button
                                key={ns}
                                onClick={() => handleStatusChange(order.id, ns)}
                                disabled={changingStatus === order.id}
                                style={{
                                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                  background: isCancelBtn ? '#fee2e2' : '#667eea',
                                  color: isCancelBtn ? '#ef4444' : '#fff',
                                  opacity: changingStatus === order.id ? 0.6 : 1,
                                }}
                              >
                                {changingStatus === order.id ? '...' : btnLabel}
                              </button>
                            );
                          })}
                        </div>
                        {msg?.id === order.id && (
                          <div style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', borderRadius: 6, background: msg?.ok ? '#d1fae5' : '#fee2e2', color: msg?.ok ? '#065f46' : '#b91c1c' }}>
                            {msg?.text}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 결제 정보 전송 */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{t.paymentTitle}</div>
                      {order.payment_info && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, padding: '6px 8px', background: '#f9fafb', borderRadius: 6 }}>
                          {t.prevPayment} {order.payment_info}
                        </div>
                      )}
                      <textarea
                        value={paymentInfo[order.id] ?? ''}
                        onChange={e => setPaymentInfo(p => ({ ...p, [order.id]: e.target.value }))}
                        placeholder={t.paymentPlaceholder}
                        rows={3}
                        style={{ width: '100%', fontSize: 12, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
                      />
                      <button
                        onClick={() => handleSendPaymentInfo(order.id)}
                        disabled={sendingPayment === order.id || !paymentInfo[order.id]?.trim()}
                        style={{
                          padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: '#667eea', color: '#fff',
                          opacity: (sendingPayment === order.id || !paymentInfo[order.id]?.trim()) ? 0.5 : 1,
                        }}
                      >
                        {sendingPayment === order.id ? t.sending : t.sendBtn}
                      </button>
                      {msg?.id === order.id && msg?.text === t.sendSuccess && (
                        <div style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', borderRadius: 6, background: '#d1fae5', color: '#065f46' }}>
                          {msg?.text}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
