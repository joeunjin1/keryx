'use client';
import { useState, useEffect } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

interface StaffMember {
  id: string;
  display_name: string | null;
  kind: string;
  email: string | null;
  created_at: string | null;
}

interface CreateForm {
  role: 'md' | 'inspector';
  email: string;
  password: string;
  display_name: string;
  contact_phone: string;
}

interface CreatedAccount {
  user_id: string;
  role: string;
  email: string;
  password: string;
  display_name: string;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export default function StaffManagementPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '직원 관리 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    role: 'md',
    email: '',
    password: generatePassword(),
    display_name: '',
    contact_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 직원 목록 조회
    fetch('/api/admin/members/staff')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStaffList(data);
        setLoadingList(false);
      })
      .catch(() => setLoadingList(false));
  }, []);

  const kindLabel: Record<string, string> = {
    admin: t('관리자', '管理员'),
    md: 'MD',
    inspector: t('검수원', '验货员'),
  };
  const kindColor: Record<string, string> = {
    admin: '#0ea5e9',
    md: '#10b981',
    inspector: '#f59e0b',
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.email || !form.password || !form.display_name) {
      setFormError(t('이메일, 비밀번호, 이름은 필수입니다.', '邮箱、密码、姓名为必填项。'));
      return;
    }
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setFormError(t('올바른 이메일 형식을 입력해주세요. (예: md@keryx.kr)', '请输入正确的邮箱格式。（例：md@keryx.kr）'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role,
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          contact_phone: form.contact_phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || t('계정 생성 실패', '账号创建失败'));
        return;
      }
      setCreatedAccount(data.account);
      setStaffList(prev => [{
        id: data.account.user_id,
        display_name: data.account.display_name,
        kind: data.account.role,
        email: data.account.email,
        created_at: new Date().toISOString(),
      }, ...prev]);
    } catch (e: any) {
      setFormError(e.message || t('네트워크 오류', '网络错误'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setCreatedAccount(null);
    setFormError('');
    setForm({ role: 'md', email: '', password: generatePassword(), display_name: '', contact_phone: '' });
  };

  const handleCopy = () => {
    if (!createdAccount) return;
    const text = [
      `${t('역할', '角色')}: ${kindLabel[createdAccount.role] ?? createdAccount.role}`,
      `${t('이름', '姓名')}: ${createdAccount.display_name}`,
      `${t('이메일', '邮箱')}: ${createdAccount.email}`,
      `${t('초기 비밀번호', '初始密码')}: ${createdAccount.password}`,
      `${t('접속 주소', '访问地址')}: https://keryx.kr/login`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="kx-animate-in">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
            {t('직원 등록·관리', '员工注册·管理')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {t('내부 직원(MD, 검수원) 계정을 직접 생성하고 관리합니다.', '直接创建和管理内部员工（MD、验货员）账号。')}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 20px', borderRadius: 12, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
        >
          {t('+ 직원 계정 생성', '+ 创建员工账号')}
        </button>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: t('전체 직원', '全部员工'), value: staffList.length, icon: '👥', color: '#0ea5e9' },
          { label: 'MD', value: staffList.filter(s => s.kind === 'md').length, icon: '🤝', color: '#10b981' },
          { label: t('검수원', '验货员'), value: staffList.filter(s => s.kind === 'inspector').length, icon: '🔍', color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-base)', borderRadius: 16, padding: '20px', border: '1.5px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* 직원 목록 */}
      <div style={{ background: 'var(--bg-base)', borderRadius: 16, border: '1.5px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{t('직원 목록', '员工列表')}</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {t(`총 ${staffList.length}명`, `共 ${staffList.length} 人`)}
          </span>
        </div>
        {loadingList ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('불러오는 중...', '加载中...')}</div>
        ) : staffList.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('등록된 직원이 없습니다', '暂无员工')}</div>
            <div style={{ fontSize: 13 }}>{t('직원 계정 생성 버튼을 눌러 새 직원을 등록하세요.', '点击创建员工账号按钮添加新员工。')}</div>
          </div>
        ) : (
          <div>
            {staffList.map((staff, i) => (
              <div key={staff.id} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: i < staffList.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${kindColor[staff.kind] ?? '#94a3b8'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: kindColor[staff.kind] ?? '#94a3b8', flexShrink: 0 }}>
                  {(staff.display_name ?? '?')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{staff.display_name ?? t('(이름 없음)', '(无名称)')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{staff.email ?? '-'}</div>
                </div>
                <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${kindColor[staff.kind] ?? '#94a3b8'}15`, color: kindColor[staff.kind] ?? '#94a3b8', border: `1px solid ${kindColor[staff.kind] ?? '#94a3b8'}30` }}>
                  {kindLabel[staff.kind] ?? staff.kind}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  {staff.created_at ? new Date(staff.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR') : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 직원 계정 생성 모달 ===== */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'var(--bg-base)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t('직원 계정 생성', '创建员工账号')}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{t('MD 또는 검수원 계정을 즉시 생성합니다.', '立即创建MD或验货员账号。')}</p>
              </div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--text-tertiary)', lineHeight: 1 }}>×</button>
            </div>

            {createdAccount ? (
              <div style={{ padding: '28px' }}>
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
                  <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#065f46', textAlign: 'center', marginBottom: 16 }}>{t('계정이 성공적으로 생성되었습니다!', '账号创建成功！')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: t('역할', '角色'), value: kindLabel[createdAccount.role] ?? createdAccount.role },
                      { label: t('이름', '姓名'), value: createdAccount.display_name },
                      { label: t('이메일', '邮箱'), value: createdAccount.email },
                      { label: t('초기 비밀번호', '初始密码'), value: createdAccount.password },
                      { label: t('접속 주소', '访问地址'), value: 'https://keryx.kr/login' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #d1fae5' }}>
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleCopy} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #10b981', background: copied ? '#10b981' : '#fff', color: copied ? '#fff' : '#10b981', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                    {copied ? t('✓ 복사됨', '✓ 已复制') : t('📋 계정 정보 복사', '📋 复制账号信息')}
                  </button>
                  <button onClick={handleClose} style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                    {t('닫기', '关闭')}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 12 }}>
                  {t('⚠️ 비밀번호는 이 화면에서만 확인 가능합니다.', '⚠️ 密码只能在此页面查看。')}
                </p>
              </div>
            ) : (
              <div style={{ padding: '24px 28px' }}>
                {formError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{formError}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>{t('역할', '角色')} <span style={{ color: '#e11d48' }}>*</span></label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(['md', 'inspector'] as const).map(r => (
                        <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: `2px solid ${form.role === r ? kindColor[r] : 'var(--border-light)'}`, background: form.role === r ? `${kindColor[r]}15` : 'var(--bg-elevated)', color: form.role === r ? kindColor[r] : 'var(--text-secondary)', cursor: 'pointer' }}>
                          {r === 'md' ? 'MD' : t('검수원', '验货员')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('이름', '姓名')} <span style={{ color: '#e11d48' }}>*</span></label>
                    <input type="text" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder={t('예: 박지훈', '例如: 张伟')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-light)', fontSize: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('이메일', '邮箱')} <span style={{ color: '#e11d48' }}>*</span></label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="md@keryx.kr" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-light)', fontSize: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('초기 비밀번호', '初始密码')} <span style={{ color: '#e11d48' }}>*</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-light)', fontSize: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'monospace' }} />
                      <button type="button" onClick={() => setForm(p => ({ ...p, password: generatePassword() }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-light)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {t('🔄 재생성', '🔄 重新生成')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{t('연락처 (선택)', '联系电话（可选）')}</label>
                    <input type="text" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="+82 10-0000-0000" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-light)', fontSize: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button onClick={handleClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border-light)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{t('취소', '取消')}</button>
                  <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: 10, background: submitting ? '#9ca3af' : '#0ea5e9', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
                    {submitting ? t('생성 중...', '创建中...') : t('✓ 계정 생성', '✓ 创建账号')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
