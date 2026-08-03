'use client';
import { useState, useEffect, useCallback } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

export default function AdminLandingInquiriesPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:     { label: t('대기중', '待处理'), color: '#f59e0b' },
    in_progress: { label: t('처리중', '处理中'), color: '#3b82f6' },
    replied:     { label: t('답변완료', '已回复'), color: '#10b981' },
    closed:      { label: t('종료', '已关闭'), color: '#9ca3af' },
  };

  const TYPE_LABELS: Record<string, string> = {
    general:        t('일반 문의', '一般咨询'),
    sample_request: t('샘플 요청', '样品申请'),
    quote:          t('견적 요청', '报价申请'),
  };

  const [inquiries, setInquiries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSlug, setFilterSlug] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterSlug) params.set('slug', filterSlug);
      if (filterType) params.set('type', filterType);
      const resp = await fetch(`/api/admin/landing-inquiries?${params}`);
      const data = await resp.json();
      setInquiries(data.inquiries || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterSlug, filterType]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  const handleReply = async (id: string, status: string) => {
    setSaving(true);
    try {
      await fetch('/api/admin/landing-inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reply_message: replyText || undefined }),
      });
      setSelected(null);
      setReplyText('');
      fetchInquiries();
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
          {t('랜딩 페이지 문의 관리', '落地页咨询管理')}
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>
          {t('광고 랜딩 페이지를 통해 접수된 문의 및 샘플 요청을 관리합니다.', '管理通过广告落地页提交的咨询及样品申请。')}
        </p>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: t('전체', '全部'), value: total, color: '#6b7280' },
          { label: t('대기중', '待处理'), value: inquiries.filter(i => i.status === 'pending').length, color: '#f59e0b' },
          { label: t('처리중', '处理中'), value: inquiries.filter(i => i.status === 'in_progress').length, color: '#3b82f6' },
          { label: t('답변완료', '已回复'), value: inquiries.filter(i => i.status === 'replied').length, color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff' }}>
          <option value="">{t('전체 상태', '全部状态')}</option>
          <option value="pending">{t('대기중', '待处理')}</option>
          <option value="in_progress">{t('처리중', '处理中')}</option>
          <option value="replied">{t('답변완료', '已回复')}</option>
          <option value="closed">{t('종료', '已关闭')}</option>
        </select>
        <select value={filterSlug} onChange={e => { setFilterSlug(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff' }}>
          <option value="">{t('전체 페이지', '全部页面')}</option>
          <option value="storage">{t('수납용품', '收纳用品')}</option>
          <option value="travel">{t('여행·캠핑', '旅行·露营')}</option>
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff' }}>
          <option value="">{t('전체 유형', '全部类型')}</option>
          <option value="general">{t('일반 문의', '一般咨询')}</option>
          <option value="sample_request">{t('샘플 요청', '样品申请')}</option>
          <option value="quote">{t('견적 요청', '报价申请')}</option>
        </select>
        <button onClick={fetchInquiries} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          {t('새로고침', '刷新')}
        </button>
      </div>

      {/* 목록 테이블 */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {[
                t('접수일', '接收日'),
                t('유형', '类型'),
                t('페이지', '页面'),
                t('이름', '姓名'),
                t('이메일', '邮箱'),
                t('회사', '公司'),
                t('관심 제품', '关注产品'),
                t('상태', '状态'),
                '',
              ].map((h, i) => (
                <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>{t('로딩 중...', '加载中...')}</td></tr>
            ) : inquiries.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>{t('문의가 없습니다', '暂无咨询')}</td></tr>
            ) : inquiries.map(inq => {
              const st = STATUS_LABELS[inq.status] || { label: inq.status, color: '#9ca3af' };
              return (
                <tr key={inq.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                    {new Date(inq.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: inq.inquiry_type === 'sample_request' ? '#fef3c7' : inq.inquiry_type === 'quote' ? '#ede9fe' : '#f3f4f6', color: inq.inquiry_type === 'sample_request' ? '#92400e' : inq.inquiry_type === 'quote' ? '#5b21b6' : '#374151' }}>
                      {TYPE_LABELS[inq.inquiry_type] || inq.inquiry_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                    {inq.landing_slug === 'storage' ? t('수납용품', '收纳用品') : inq.landing_slug === 'travel' ? t('여행·캠핑', '旅行·露营') : inq.landing_slug || '–'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#111827' }}>{inq.requester_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{inq.requester_email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{inq.requester_company || '–'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inq.product_name_snapshot || '–'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: `${st.color}20`, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => { setSelected(inq); setReplyText(inq.reply_message || ''); }}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
                    >
                      {t('상세', '详情')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            {t('이전', '上一页')}
          </button>
          <span style={{ padding: '8px 16px', fontSize: 13, color: '#374151' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            {t('다음', '下一页')}
          </button>
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{t('문의 상세', '咨询详情')}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            {/* 문의자 정보 */}
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: t('이름', '姓名'), value: selected.requester_name },
                  { label: t('이메일', '邮箱'), value: selected.requester_email },
                  { label: t('연락처', '联系方式'), value: selected.requester_phone || '–' },
                  { label: t('회사', '公司'), value: selected.requester_company || '–' },
                  { label: t('국가', '国家'), value: selected.requester_country || '–' },
                  { label: t('유형', '类型'), value: TYPE_LABELS[selected.inquiry_type] || selected.inquiry_type },
                  { label: t('랜딩 페이지', '落地页'), value: selected.landing_slug === 'storage' ? t('수납용품', '收纳用品') : selected.landing_slug === 'travel' ? t('여행·캠핑', '旅行·露营') : selected.landing_slug || '–' },
                  { label: t('접수일', '接收日'), value: new Date(selected.created_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'ko-KR') },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 관심 제품 */}
            {selected.product_name_snapshot && (
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                {selected.product_image_snapshot && (
                  <img src={selected.product_image_snapshot} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                )}
                <div>
                  <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>{t('관심 제품', '关注产品')}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{selected.product_name_snapshot}</div>
                  {selected.sample_quantity && <div style={{ fontSize: 12, color: '#6b7280' }}>{t('수량', '数量')}: {selected.sample_quantity}{t('개', '件')}</div>}
                  {selected.target_price_cny && <div style={{ fontSize: 12, color: '#6b7280' }}>{t('희망 단가', '目标单价')}: ¥{selected.target_price_cny}</div>}
                </div>
              </div>
            )}

            {/* 문의 내용 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{t('문의 내용', '咨询内容')}</div>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px', fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {selected.message}
              </div>
            </div>

            {/* 답변 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{t('답변 작성', '撰写回复')}</div>
              <textarea
                rows={5} value={replyText}
                onChange={e => setReplyText(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                placeholder={t('답변 내용을 입력하세요...', '请输入回复内容...')}
              />
            </div>

            {/* 상태 변경 버튼 */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => handleReply(selected.id, 'in_progress')} disabled={saving}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('처리중으로 변경', '标记为处理中')}
              </button>
              <button onClick={() => handleReply(selected.id, 'replied')} disabled={saving || !replyText}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving || !replyText ? 'not-allowed' : 'pointer', opacity: !replyText ? 0.5 : 1 }}>
                {t('답변 완료', '回复完成')}
              </button>
              <button onClick={() => handleReply(selected.id, 'closed')} disabled={saving}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#9ca3af', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('종료', '关闭')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
