'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATUS_MAP: Record<string, { ko: string; zh: string; color: string; bg: string }> = {
  draft:     { ko: '초안', zh: '草稿', color: '#6b7280', bg: '#f3f4f6' },
  sent:      { ko: '발송됨', zh: '已发送', color: '#2563eb', bg: '#eff6ff' },
  accepted:  { ko: '수락됨', zh: '已接受', color: '#16a34a', bg: '#f0fdf4' },
  rejected:  { ko: '반려됨', zh: '已拒绝', color: '#dc2626', bg: '#fef2f2' },
  expired:   { ko: '만료됨', zh: '已过期', color: '#9ca3af', bg: '#f9fafb' },
  converted: { ko: '주문전환', zh: '已转订单', color: '#7c3aed', bg: '#f5f3ff' },
};

interface QuotationItem {
  product_name_zh: string;
  product_name_ko: string;
  variant_desc: string;
  quantity: number;
  unit_price_cny: number;
  lead_time_days: number;
  notes: string;
}

export default function MdTradePage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '무역 서비스 관리 | KERYX';
  }, []);

  const brandColor = '#e11d48';
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // 견적서 작성 폼
  const [form, setForm] = useState({
    seller_id: '',
    factory_id: '',
    valid_until: '',
    notes: '',
    notes_zh: '',
  });
  const [items, setItems] = useState<QuotationItem[]>([
    { product_name_zh: '', product_name_ko: '', variant_desc: '', quantity: 0, unit_price_cny: 0, lead_time_days: 0, notes: '' }
  ]);

  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  useEffect(() => {
    const saved = localStorage.getItem('keryx_lang') as 'ko' | 'zh' | null;
    if (saved) setLang(saved);
    fetchQuotations();
    fetchSellers();
    fetchFactories();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trade/quotations?limit=50');
      const data = await res.json();
      setQuotations(data.quotations || []);
    } catch {}
    setLoading(false);
  };

  const fetchSellers = async () => {
    try {
      const res = await fetch('/api/admin/sellers?limit=100');
      const data = await res.json();
      setSellers(data.sellers || []);
    } catch {}
  };

  const fetchFactories = async () => {
    try {
      const res = await fetch('/api/public/factories?limit=100');
      const data = await res.json();
      setFactories(data.factories || []);
    } catch {}
  };

  const addItem = () => {
    setItems([...items, { product_name_zh: '', product_name_ko: '', variant_desc: '', quantity: 0, unit_price_cny: 0, lead_time_days: 0, notes: '' }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, key: keyof QuotationItem, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: value };
    setItems(updated);
  };

  const totalCny = items.reduce((s, item) => s + (item.quantity * item.unit_price_cny || 0), 0);

  const handleCreate = async () => {
    if (!form.seller_id) { alert(t('바이어(고객)를 선택하세요', '请选择买家')); return; }
    if (items.some(i => !i.product_name_zh || i.quantity <= 0 || i.unit_price_cny <= 0)) {
      alert(t('모든 아이템의 제품명, 수량, 단가를 입력하세요', '请填写所有商品的名称、数量和单价'));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/trade/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setForm({ seller_id: '', factory_id: '', valid_until: '', notes: '', notes_zh: '' });
        setItems([{ product_name_zh: '', product_name_ko: '', variant_desc: '', quantity: 0, unit_price_cny: 0, lead_time_days: 0, notes: '' }]);
        await fetchQuotations();
        alert(t('견적서가 생성되었습니다.', '报价单已创建。'));
      }
    } catch {}
    setCreating(false);
  };

  const handleSend = async (quotationId: string) => {
    if (!confirm(t('이 견적서를 바이어에게 발송하시겠습니까?', '确认将此报价单发送给买家(客户)？'))) return;
    setSending(quotationId);
    try {
      const res = await fetch(`/api/trade/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      });
      if (res.ok) {
        await fetchQuotations();
        alert(t('견적서가 발송되었습니다.', '报价单已发送。'));
      }
    } catch {}
    setSending(null);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
    fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
            🤝 {t('거래 센터', '交易中心')}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {t('견적서 작성 및 거래 관리', '创建报价单并管理交易')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 18px', borderRadius: 12,
            background: `linear-gradient(135deg, ${brandColor}, #764ba2)`,
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + {t('견적서 작성', '创建报价')}
        </button>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: t('전체', '全部'), value: quotations.length, color: '#667eea' },
          { label: t('발송됨', '已发送'), value: quotations.filter(q => q.status === 'sent').length, color: '#2563eb' },
          { label: t('수락됨', '已接受'), value: quotations.filter(q => q.status === 'accepted').length, color: '#16a34a' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
            border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>


      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          {t('불러오는 중...', '加载中...')}
        </div>
      ) : quotations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
            {t('작성된 견적서가 없습니다', '暂无报价单')}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              marginTop: 16, padding: '10px 24px', borderRadius: 10,
              background: brandColor, color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t('첫 견적서 작성', '创建第一份报价')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quotations.map((q: any) => {
            const statusInfo = STATUS_MAP[q.status] || STATUS_MAP.draft;
            return (
              <div key={q.id} style={{
                background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
              }}>
                <div style={{
                  padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                      {q.quotation_no || t('견적서', '报价单')}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      {t('바이어(고객)', '买家(客户)')}: {q.seller?.business_name || '-'} · {new Date(q.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20,
                    background: statusInfo.bg, color: statusInfo.color,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {lang === 'zh' ? statusInfo.zh : statusInfo.ko}
                  </span>
                </div>

                <div className="py-3 px-4">
                  <div className="text-[13px] text-neutral-700">
                    {(q.items || []).length}{t('개 품목', '个商品')} · ¥{q.total_cny?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </div>
                  {q.valid_until && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      {t(`유효기간: ${q.valid_until}`, `有效期至: ${q.valid_until}`)}
                    </div>
                  )}
                </div>

                {q.status === 'draft' && (
                  <div style={{ padding: '10px 16px', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleSend(q.id)}
                      disabled={sending === q.id}
                      style={{
                        padding: '8px 18px', borderRadius: 10,
                        background: `linear-gradient(135deg, ${brandColor}, #764ba2)`,
                        color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        opacity: sending === q.id ? 0.7 : 1,
                      }}
                    >
                      {sending === q.id ? t('발송 중...', '发送中...') : t('📤 바이어에게 발송', '📤 发送给买家(客户)')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600,
            maxHeight: '90vh', overflowY: 'auto', padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
                {t('견적서 작성', '创建报价单')}
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>


            <div className="mb-3">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('바이어 선택 *', '选择买家 *')}
              </label>
              <select value={form.seller_id} onChange={e => setForm({...form, seller_id: e.target.value})} style={inputStyle}>
                <option value="">{t('바이어(고객)를 선택하세요', '请选择买家')}</option>
                {sellers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.business_name}</option>
                ))}
              </select>
            </div>


            <div className="mb-3">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('공장 선택 (선택)', '选择工厂 (可选)')}
              </label>
              <select value={form.factory_id} onChange={e => setForm({...form, factory_id: e.target.value})} style={inputStyle}>
                <option value="">{t('공장 선택 (선택사항)', '选择工厂 (可选)')}</option>
                {factories.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.factory_name}</option>
                ))}
              </select>
            </div>


            <div className="mb-3">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('유효기간', '有效期')}
              </label>
              <input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} style={inputStyle} />
            </div>


            <div className="mb-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  {t('견적 품목 *', '报价商品 *')}
                </label>
                <button onClick={addItem} className="active:scale-95 transition-all" style={{
                  padding: '4px 10px', borderRadius: 8, border: `1px solid ${brandColor}`,
                  color: brandColor, background: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  + {t('품목 추가', '添加商品')}
                </button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} style={{
                  background: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 10,
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      {t(`품목 ${idx + 1}`, `商品 ${idx + 1}`)}
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} style={{ fontSize: 16, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input placeholder={t('중국어 제품명 *', '中文产品名 *')} value={item.product_name_zh}
                      onChange={e => updateItem(idx, 'product_name_zh', e.target.value)} style={inputStyle} />
                    <input placeholder={t('한국어 제품명', '韩文产品名')} value={item.product_name_ko}
                      onChange={e => updateItem(idx, 'product_name_ko', e.target.value)} style={inputStyle} />
                    <input placeholder={t('옵션 (색상/사이즈)', '规格 (颜色/尺寸)')} value={item.variant_desc}
                      onChange={e => updateItem(idx, 'variant_desc', e.target.value)} style={inputStyle} />
                    <input type="number" placeholder={t('수량 *', '数量 *')} value={item.quantity || ''}
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} style={inputStyle} />
                    <input type="number" step="0.01" placeholder={t('단가 (¥) *', '单价 (¥) *')} value={item.unit_price_cny || ''}
                      onChange={e => updateItem(idx, 'unit_price_cny', parseFloat(e.target.value) || 0)} style={inputStyle} />
                    <input type="number" placeholder={t('리드타임 (일)', '交货期 (天)')} value={item.lead_time_days || ''}
                      onChange={e => updateItem(idx, 'lead_time_days', parseInt(e.target.value) || 0)} style={inputStyle} />
                  </div>
                  {item.quantity > 0 && item.unit_price_cny > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#667eea', fontWeight: 600, textAlign: 'right' }}>
                      {t('소계', '小计')}: ¥{(item.quantity * item.unit_price_cny).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              ))}
            </div>


            <div className="mb-3">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('비고 (한국어)', '备注 (韩文)')}
              </label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder={t('바이어에게 전달할 메모', '给买家(客户)的备注')} />
            </div>
            <div className="mb-5">
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {t('비고 (중국어)', '备注 (中文)')}
              </label>
              <textarea value={form.notes_zh} onChange={e => setForm({...form, notes_zh: e.target.value})}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder={t('공장에 전달할 메모 (중국어)', '给工厂的备注 (中文)')} />
            </div>


            <div style={{
              background: '#f9fafb', borderRadius: 12, padding: '14px 16px', marginBottom: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{t('총 견적 금액', '总报价金额')}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>
                ¥{totalCny.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="active:scale-95 transition-all" style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: `linear-gradient(135deg, ${brandColor}, #764ba2)`,
                color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? t('생성 중...', '创建中...') : t('📋 견적서 초안 생성', '📋 创建报价草稿')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
