'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const T = {
  ko: {
    title: '새 비밀번호 설정',
    subtitle: '새로운 비밀번호를 입력해 주세요.',
    newPassword: '새 비밀번호',
    confirmPassword: '비밀번호 확인',
    submitBtn: '비밀번호 변경',
    submitting: '변경 중...',
    successTitle: '비밀번호가 변경되었습니다!',
    successMsg: '새 비밀번호로 로그인해 주세요.',
    goLogin: '로그인 페이지로 이동 →',
    mismatch: '비밀번호가 일치하지 않습니다.',
    tooShort: '비밀번호는 8자 이상이어야 합니다.',
    error: '비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.',
    expiredLink: '링크가 만료되었거나 유효하지 않습니다.',
    requestNew: '비밀번호 찾기 다시 시도',
    langSwitch: '中文',
  },
  zh: {
    title: '设置新密码',
    subtitle: '请输入您的新密码。',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    submitBtn: '修改密码',
    submitting: '修改中...',
    successTitle: '密码已成功修改！',
    successMsg: '请使用新密码登录。',
    goLogin: '前往登录页面 →',
    mismatch: '两次输入的密码不一致。',
    tooShort: '密码长度不能少于8位。',
    error: '密码修改失败，链接可能已过期。',
    expiredLink: '链接已过期或无效。',
    requestNew: '重新申请密码重置',
    langSwitch: '한국어',
  },
};

function ResetPasswordInner() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const supabase = createClient();
  const t = T[lang];

  useEffect(() => {
    // Supabase가 URL 해시에서 세션을 자동으로 처리함
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) { setError(t.mismatch); return; }
    if (newPassword.length < 8) { setError(t.tooShort); return; }
    setLoading(true);
    // ⛔ 현재 로그인된 계정이 보호 계정인지 확인
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const PROTECTED_ACCOUNTS = ['jo@keryx.kr'];
    if (currentUser?.email && PROTECTED_ACCOUNTS.includes(currentUser.email.toLowerCase())) {
      setLoading(false);
      setError(lang === 'zh' ? '该账号不允许通过此页面修改密码。' : '해당 계정은 이 페이지에서 비밀번호 변경이 가능하지 않습니다.');
      try {
        await fetch('/api/admin/security-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'password_change_blocked', email: currentUser.email, timestamp: new Date().toISOString() }),
        });
      } catch (_) { /* 알림 실패해도 차단 유지 */ }
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError(t.error);
    } else {
      setSuccess(true);
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => router.push('/login'), 3000);
    }
  }

  if (hasSession === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="kx-spinner" style={{ width: 36, height: 36, borderWidth: 3, borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ position: 'fixed', top: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#ffffff',
        borderRadius: 24,
        boxShadow: '0 4px 40px rgba(99,102,241,0.10), 0 1px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* 언어 전환 버튼 */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <button
            onClick={() => setLang(lang === 'ko' ? 'zh' : 'ko')}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#6366f1',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.langSwitch}
          </button>
        </div>

        {/* 헤더 */}
        <div style={{ padding: '36px 36px 28px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>
            {success ? '✅' : hasSession ? '🔐' : '⚠️'}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            {success ? t.successTitle : t.title}
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontWeight: 400 }}>
            {success ? t.successMsg : !hasSession ? t.expiredLink : t.subtitle}
          </p>
        </div>

        {/* 폼 영역 */}
        <div style={{ padding: '28px 36px 32px' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '16px',
                marginBottom: 20,
                color: '#16a34a',
                fontSize: 14,
              }}>
                {t.successMsg}
              </div>
              <Link
                href="/login"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                }}
              >
                {t.goLogin}
              </Link>
            </div>
          ) : !hasSession ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '16px',
                marginBottom: 20,
                color: '#dc2626',
                fontSize: 14,
              }}>
                {t.expiredLink}
              </div>
              <Link
                href="/login"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                }}
              >
                {t.requestNew}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 18,
                  color: '#dc2626',
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  {t.newPassword}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 14,
                    color: '#1e293b',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  {t.confirmPassword}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 14,
                    color: '#1e293b',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                {loading ? (
                  <><span className="kx-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {t.submitting}</>
                ) : (
                  t.submitBtn
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="kx-spinner" style={{ width: 36, height: 36, borderWidth: 3, borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }} />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
