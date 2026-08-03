'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLangContext } from '@/components/layout/LangContext';
import { SearchHighlight } from '@/components/ui/SearchHighlight';

export default function FactoryMembersPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '공장 회원 관리 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');  // 검색 상태
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/factories/list')
      .then(r => r.json())
      .then(data => { setFactories(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    approved: t('승인', '已批准'),
    pending: t('대기', '待审核'),
    rejected: t('반려', '已拒绝'),
  };
  const statusColor: Record<string, string> = {
    approved: '#10b981',
    pending: '#f59e0b',
    rejected: '#ef4444',
  };

  async function handleResetPassword() {
    if (!resetTarget || !newPassword) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/admin/factories/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factory_user_id: resetTarget.id, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResetMsg({ type: 'ok', text: t('비밀번호 재설정 완료!', '密码重置成功！') });
        setNewPassword('');
        setTimeout(() => { setResetTarget(null); setResetMsg(null); }, 3000);
      } else {
        setResetMsg({ type: 'err', text: data.error ?? t('재설정 실패', '重置失败') });
      }
    } catch (e: any) {
      setResetMsg({ type: 'err', text: e.message });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="kx-animate-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
            {t('공장 회원 관리', '工厂会员管理')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {t('등록된 공급사(공장) 회원을 관리합니다.', '管理已注册的供应商（工厂）会员。')}
          </p>
        </div>
        <Link href="/admin/factories/approvals" style={{
          padding: '10px 20px', borderRadius: 12, background: '#e11d48', color: '#fff',
          textDecoration: 'none', fontSize: 14, fontWeight: 700,
        }}>
          {t('가입 승인 관리 →', '入驻审核管理 →')}
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: t('전체 공장', '全部工厂'), value: factories?.length ?? 0, icon: '🏭', color: '#e11d48' },
          { label: t('승인 완료', '已批准'), value: factories?.filter(f => f.approval_status === 'approved').length ?? 0, icon: '✅', color: '#10b981' },
          { label: t('승인 대기', '待审核'), value: factories?.filter(f => f.approval_status === 'pending').length ?? 0, icon: '⏳', color: '#f59e0b' },
          { label: t('반려', '已拒绝'), value: factories?.filter(f => f.approval_status === 'rejected').length ?? 0, icon: '❌', color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-base)', borderRadius: 16, padding: '20px',
            border: '1.5px solid var(--border-light)', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* 비밀번호 재설정 모달 */}
      {resetTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setResetTarget(null); setResetMsg(null); }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 32, width: 400, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: '#1e293b' }}>
              🔑 {t('비밀번호 재설정', '重置密码')}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              {resetTarget.email}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                {t('새 비밀번호 (최소 6자)', '新密码（最少6位）')}
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('새 비밀번호 입력', '输入新密码')}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                  background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {resetMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 500,
                background: resetMsg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
                color: resetMsg.type === 'ok' ? '#16a34a' : '#dc2626',
                border: '1px solid ' + (resetMsg.type === 'ok' ? '#bbf7d0' : '#fecaca'),
              }}>
                {resetMsg.text}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading || !newPassword || newPassword.length < 6}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: (resetLoading || newPassword.length < 6) ? '#94a3b8' : '#4f46e5', color: '#fff',
                  fontSize: 14, fontWeight: 700,
                }}>
                {resetLoading ? t('처리 중...', '处理中...') : t('비밀번호 재설정', '重置密码')}
              </button>
              <button
                onClick={() => { setResetTarget(null); setResetMsg(null); setNewPassword(''); }}
                style={{
                  padding: '11px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                {t('취소', '取消')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공장 검색 필터 */}
      <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-light)] p-4 mb-5 shadow-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('공장명, 이메일 검색…', '搜索工厂名、邮箱…')}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition"
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
      </div>

      <div style={{ background: 'var(--bg-base)', borderRadius: 16, border: '1.5px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="text-[15px] font-bold">{t('공장 목록', '工厂列表')}</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('전체', '共')} {factories?.length ?? 0}{t('개사', '家')}</span>
        </div>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('로딩 중...', '加载中...')}</div>
        ) : !factories || factories.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏭</div>
            <div className="text-[16px] font-semibold">{t('등록된 공장이 없습니다', '暂无注册工厂')}</div>
          </div>
        ) : (
          <div>
            <div style={{ padding: '10px 20px', background: 'var(--bg-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 60px 80px 80px 100px', gap: 12, fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              <span>{t('공장명', '工厂名')}</span>
              <span>{t('담당자', '负责人')}</span>
              <span>{t('이메일', '邮箱')}</span>
              <span>{t('코드', '代码')}</span>
              <span>{t('평점', '评分')}</span>
              <span>{t('주문수', '订单数')}</span>
              <span>{t('상태', '状态')}</span>
              <span>{t('비밀번호', '密码')}</span>
            </div>
            {factories.filter((f: any) => {
              const q = searchQuery.toLowerCase().trim();
              if (!q) return true;
              return (
                (f.company_name ?? '').toLowerCase().includes(q) ||
                (f.contact_name ?? '').toLowerCase().includes(q) ||
                (f.contact_email ?? '').toLowerCase().includes(q) ||
                (f.factory_code ?? '').toLowerCase().includes(q)
              );
            }).map((factory: any, i: number, arr: any[]) => (
              <div key={factory.id} style={{
                padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 60px 80px 80px 100px', gap: 12, alignItems: 'center',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <SearchHighlight text={factory.company_name ?? '-'} query={searchQuery} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <SearchHighlight text={factory.contact_name ?? '-'} query={searchQuery} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <SearchHighlight text={factory.contact_email ?? '-'} query={searchQuery} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e11d48' }}>
                  {factory.factory_code ?? '-'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                  {factory.avg_rating ? '⭐ ' + factory.avg_rating.toFixed(1) : '-'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {factory.total_orders ?? 0}{t('건', '件')}
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textAlign: 'center',
                  background: (statusColor[factory.approval_status] ?? '#94a3b8') + '15',
                  color: statusColor[factory.approval_status] ?? '#94a3b8',
                }}>
                  {statusLabel[factory.approval_status] ?? factory.approval_status}
                </div>
                <button
                  onClick={() => {
                    if (factory.shared_login_user_id) {
                      setResetTarget({ id: factory.shared_login_user_id, email: factory.contact_email ?? factory.company_name });
                      setNewPassword('');
                      setResetMsg(null);
                    }
                  }}
                  disabled={!factory.shared_login_user_id}
                  style={{
                    padding: '5px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                    background: factory.shared_login_user_id ? '#f8fafc' : '#f1f5f9',
                    color: factory.shared_login_user_id ? '#4f46e5' : '#94a3b8',
                    fontSize: 11, fontWeight: 700, cursor: factory.shared_login_user_id ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                  }}>
                  🔑 {t('재설정', '重置')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
