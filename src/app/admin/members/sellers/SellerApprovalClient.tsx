'use client';
import { useState, useEffect, useCallback } from 'react';
import { SearchHighlight } from '@/components/ui/SearchHighlight';
import { useLangContext } from '@/components/layout/LangContext';

type Seller = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  approval_status: string;
  current_membership: string | null;
  current_grade: string | null;
  created_at: string;
};

type Props = {
  sellers: Seller[];
};

function genPassword(): string {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let r = '';
  for (let i = 0; i < 12; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

export default function SellerApprovalClient({
  sellers: initialSellers
}: Props) {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [sellers, setSellers] = useState<Seller[]>(initialSellers);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ sellerId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 바이어 계정 직접 생성 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ business_name: '', contact_name: '', email: '', password: genPassword(), contact_phone: '', country: 'KR' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdBuyer, setCreatedBuyer] = useState<{ email: string; password: string; business_name: string } | null>(null);
  const [createCopied, setCreateCopied] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshSellers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sellers/list');
      if (res.ok) {
        const json = await res.json();
        if (json.sellers) setSellers(json.sellers);
      }
    } catch {
      // 새로고침 실패 시 무시
    }
  }, []);

  const updateLocalStatus = (sellerId: string, newStatus: string) => {
    setSellers(prev => prev.map(s =>
      s.id === sellerId ? { ...s, approval_status: newStatus } : s
    ));
  };

  const handleApprove = async (sellerId: string, name: string) => {
    setActionLoading(sellerId + '_approve');
    try {
      const res = await fetch('/api/admin/sellers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: sellerId, action: 'approve' }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast('✅ ' + name + ' 승인 완료', 'success');
        updateLocalStatus(sellerId, 'approved');
        await refreshSellers();
      } else {
        showToast('오류: ' + (json.error ?? '알 수 없는 오류'), 'error');
      }
    } catch {
      showToast('네트워크 오류가 발생했습니다', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.sellerId + '_reject');
    try {
      const res = await fetch('/api/admin/sellers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: rejectModal.sellerId,
          action: 'reject',
          reject_reason: rejectReason,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast('❌ ' + rejectModal.name + ' 반려 처리 완료', 'success');
        updateLocalStatus(rejectModal.sellerId, 'rejected');
        setRejectModal(null);
        setRejectReason('');
        await refreshSellers();
      } else {
        showToast('오류: ' + (json.error ?? '알 수 없는 오류'), 'error');
      }
    } catch {
      showToast('네트워크 오류가 발생했습니다', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateBuyer = async () => {
    setCreateError('');
    if (!createForm.business_name || !createForm.email || !createForm.password) {
      setCreateError('상호명, 이메일, 비밀번호는 필수입니다.');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'seller',
          email: createForm.email,
          password: createForm.password,
          display_name: createForm.contact_name || createForm.business_name,
          business_name: createForm.business_name,
          contact_name: createForm.contact_name || undefined,
          contact_phone: createForm.contact_phone || undefined,
          country: createForm.country,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || '계정 생성 실패');
        return;
      }
      setCreatedBuyer({ email: createForm.email, password: createForm.password, business_name: createForm.business_name });
      await refreshSellers();
    } catch (e: any) {
      setCreateError(e.message || '네트워크 오류');
    } finally {
      setCreateLoading(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreatedBuyer(null);
    setCreateError('');
    setCreateForm({ business_name: '', contact_name: '', email: '', password: genPassword(), contact_phone: '', country: 'KR' });
  };

  const statusLabel: Record<string, string> = { approved: lang === 'zh' ? '已批准' : '승인', pending: lang === 'zh' ? '待审核' : '대기', rejected: lang === 'zh' ? '已拒绝' : '반려' };
  const statusColor: Record<string, string> = { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444' };
  const tierColor: Record<string, string> = { vip: '#f59e0b', pro: '#0ea5e9', basic: '#94a3b8', free: '#94a3b8' };

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const pendingCount = sellers.filter(s => s.approval_status === 'pending').length;
  const approvedCount = sellers.filter(s => s.approval_status === 'approved').length;
  const vipCount = sellers.filter(s => s.current_grade === 'vip' || s.current_membership === 'vip_auto').length;

  // 검색 + 필터 적용
  const filteredSellers = sellers.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      (s.business_name ?? '').toLowerCase().includes(q) ||
      (s.contact_name ?? '').toLowerCase().includes(q) ||
      (s.contact_email ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.approval_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="kx-animate-in">
      {/* 토스트 알림 */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 20px', borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* 반려 확인 모달 */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1e293b' }}>회원 가입 반려</h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              <strong>{rejectModal.name}</strong> 회원의 가입을 반려하시겠습니까?
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요 (선택)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, resize: 'none', height: 80, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>취소</button>
              <button onClick={handleRejectConfirm} disabled={!!actionLoading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading ? '처리 중...' : '반려 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 바이어 계정 직접 생성 모달 */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'var(--bg-base)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>바이어 계정 직접 생성</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>관리자가 바이어 계정을 즉시 생성합니다.</p>
              </div>
              <button onClick={closeCreateModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--text-tertiary)', lineHeight: 1 }}>×</button>
            </div>
            {createdBuyer ? (
              <div style={{ padding: '28px' }}>
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
                  <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#065f46', textAlign: 'center', marginBottom: 16 }}>바이어 계정이 생성되었습니다!</div>
                  {[
                    { label: '상호명', value: createdBuyer.business_name },
                    { label: '이메일', value: createdBuyer.email },
                    { label: '초기 비밀번호', value: createdBuyer.password },
                    { label: '접속 주소', value: 'https://keryx.kr/login' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #d1fae5', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      const text = `상호명: ${createdBuyer.business_name}\n이메일: ${createdBuyer.email}\n초기 비밀번호: ${createdBuyer.password}\n접속 주소: https://keryx.kr/login`;
                      navigator.clipboard.writeText(text).then(() => { setCreateCopied(true); setTimeout(() => setCreateCopied(false), 2000); });
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #10b981', background: createCopied ? '#10b981' : '#fff', color: createCopied ? '#fff' : '#10b981', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                  >
                    {createCopied ? '✓ 복사됨' : '📋 계정 정보 복사'}
                  </button>
                  <button onClick={closeCreateModal} style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>닫기</button>
                </div>
                <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 12 }}>⚠️ 비밀번호는 이 화면에서만 확인 가능합니다.</p>
              </div>
            ) : (
              <div style={{ padding: '24px 28px' }}>
                {createError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{createError}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { key: 'business_name', label: '상호명 *', placeholder: '예: 핑크걸즈샵', type: 'text' },
                    { key: 'contact_name', label: '담당자명', placeholder: '예: 김수진', type: 'text' },
                    { key: 'email', label: '이메일 *', placeholder: 'buyer@example.com', type: 'email' },
                    { key: 'contact_phone', label: '연락처', placeholder: '+82 10-0000-0000', type: 'text' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
                      <input
                        type={type}
                        value={(createForm as any)[key]}
                        onChange={e => setCreateForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-light)', fontSize: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>초기 비밀번호 *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={createForm.password}
                        onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-light)', fontSize: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                      />
                      <button type="button" onClick={() => setCreateForm(p => ({ ...p, password: genPassword() }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-light)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>🔄 재생성</button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={closeCreateModal} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border-light)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>취소</button>
                  <button
                    onClick={handleCreateBuyer}
                    disabled={createLoading}
                    style={{ flex: 2, padding: '12px', borderRadius: 10, background: createLoading ? '#9ca3af' : '#0ea5e9', color: '#fff', border: 'none', cursor: createLoading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}
                  >
                    {createLoading ? '생성 중...' : '✓ 바이어 계정 생성'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold text-[var(--text-primary)] mb-1">바이어(고객) 회원 관리</h1>
          <p className="text-sm text-[var(--text-secondary)]">등록된 바이어(고객) 회원을 관리합니다. 대기 중인 회원을 승인하거나 반려할 수 있습니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pendingCount > 0 && (
            <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
              ⏳ 승인 대기 {pendingCount}명
            </div>
          )}
          <button
            onClick={() => { setCreateForm(p => ({ ...p, password: genPassword() })); setShowCreateModal(true); }}
            style={{ padding: '10px 18px', borderRadius: 10, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
          >
            + 바이어 계정 생성
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-light)] p-4 mb-5 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('회사명, 담당자, 이메일 검색…', '搜索公司名、负责人、邮箱…')}
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition"
          />
          {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                statusFilter === st
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-sky-300'
              }`}
            >
              {st === 'all' ? t('전체', '全部') : st === 'pending' ? t('대기', '待审核') : st === 'approved' ? t('승인', '已批准') : t('반려', '已拒绝')}
            </button>
          ))}
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-tertiary)] border border-[var(--border-light)] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
            >
              ✕ {t('초기화', '重置')}
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            {t(`'${searchQuery}' 검색 결과: ${filteredSellers.length}개사`, `'${searchQuery}' 搜索结果: ${filteredSellers.length}家`)}
          </p>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체 바이어', value: sellers.length, icon: '🛒', color: '#0ea5e9' },
          { label: '승인 완료', value: approvedCount, icon: '✅', color: '#10b981' },
          { label: '승인 대기', value: pendingCount, icon: '⏳', color: '#f59e0b' },
          { label: 'VIP 회원', value: vipCount, icon: '💎', color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-base)] rounded-2xl p-5 border-[1.5px] border-[var(--border-light)] shadow-sm">
            <div className="text-[28px] mb-2">{stat.icon}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] mb-1">{stat.label}</div>
            <div className="text-[32px] font-black" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* 회원 목록 */}
      <div className="bg-[var(--bg-base)] rounded-2xl border-[1.5px] border-[var(--border-light)] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
          <span className="text-[15px] font-bold">{t('바이어 목록', '买家列表')}</span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {filteredSellers.length !== sellers.length
              ? t(`${filteredSellers.length}개사 (전체 ${sellers.length}개사)`, `${filteredSellers.length}家（共${sellers.length}家）`)
              : t(`총 ${sellers.length}개사`, `共 ${sellers.length} 家`)}
          </span>
        </div>
        {filteredSellers.length === 0 ? (
          <div className="px-5 py-[60px] text-center text-[var(--text-tertiary)]">
            <div className="text-[48px] mb-3">🛒</div>
            <div className="text-[16px] font-semibold">등록된 바이어가 없습니다</div>
          </div>
        ) : (
          <div>
            <div className="px-5 py-[10px] bg-[var(--bg-muted)] grid gap-3 text-[11px] font-bold text-[var(--text-tertiary)] tracking-[0.05em]" style={{ gridTemplateColumns: '1.2fr 0.8fr 1.4fr 90px 80px 100px 160px' }}>
              <span>{t('회사명', '公司名')}</span><span>{t('담당자', '负责人')}</span><span>{t('이메일', '邮箱')}</span><span>{t('코드', '代码')}</span><span>{t('상태', '状态')}</span><span>{t('등급', '等级')}</span><span>{t('승인 관리', '审批管理')}</span>
            </div>
            {filteredSellers.map((seller, i) => {
              const isPending = seller.approval_status === 'pending';
              const isApproved = seller.approval_status === 'approved';
              const memberKey = seller.current_membership?.replace('_auto', '') ?? 'free';
              const displayName = seller.business_name ?? seller.contact_email ?? seller.id;
              return (
                <div key={seller.id} className="px-5 py-[14px] grid gap-3 items-center" style={{ gridTemplateColumns: '1.2fr 0.8fr 1.4fr 90px 80px 100px 160px', borderBottom: i < filteredSellers.length - 1 ? '1px solid var(--border-light)' : 'none', background: isPending ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                  <div className="text-sm font-semibold text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
                    <SearchHighlight text={seller.business_name ?? '-'} query={searchQuery} />
                  </div>
                  <div className="text-[13px] text-[var(--text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap">
                    <SearchHighlight text={seller.contact_name ?? '-'} query={searchQuery} />
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                    <SearchHighlight text={seller.contact_email ?? '-'} query={searchQuery} />
                  </div>
                  <div className="text-xs font-bold text-[#0ea5e9]">{seller.current_membership ?? '-'}</div>
                  <div className="px-[10px] py-[3px] rounded-full text-[11px] font-bold text-center" style={{ background: (statusColor[seller.approval_status] ?? '#94a3b8') + '20', color: statusColor[seller.approval_status] ?? '#94a3b8' }}>
                    {statusLabel[seller.approval_status] ?? seller.approval_status}
                  </div>
                  <div className="px-[10px] py-[3px] rounded-full text-[11px] font-bold text-center" style={{ background: (tierColor[memberKey] ?? '#94a3b8') + '20', color: tierColor[memberKey] ?? '#94a3b8' }}>
                    {(seller.current_membership ?? 'free').toUpperCase()}
                  </div>
                  <div className="flex gap-2">
                    {isPending && (
                      <>
                        <button onClick={() => handleApprove(seller.id, displayName)} disabled={!!actionLoading} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#10b981', color: 'white', fontSize: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading === seller.id + '_approve' ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                          {actionLoading === seller.id + '_approve' ? '처리 중' : '✓ 승인'}
                        </button>
                        <button onClick={() => setRejectModal({ sellerId: seller.id, name: displayName })} disabled={!!actionLoading} style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #ef4444', background: 'white', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>✕ 반려</button>
                      </>
                    )}
                    {isApproved && (
                      <button onClick={() => setRejectModal({ sellerId: seller.id, name: displayName })} disabled={!!actionLoading} style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: 'white', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>승인 취소</button>
                    )}
                    {seller.approval_status === 'rejected' && (
                      <button onClick={() => handleApprove(seller.id, displayName)} disabled={!!actionLoading} style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #10b981', background: 'white', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>재승인</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
