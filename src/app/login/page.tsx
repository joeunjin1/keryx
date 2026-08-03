'use client';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// 다국어 텍스트 정의
const T = {
  ko: {
    title: '로그인',
    subtitle: 'KERYX 무역 서비스에 오신 것을 환영합니다',
    email: '이메일',
    password: '비밀번호',
    loginBtn: '로그인',
    loggingIn: '로그인 중...',
    forgotPassword: '비밀번호를 잊으셨나요?',
    noAccount: '계정이 없으신가요?',
    signupLink: '무료 회원가입 →',
    resetTitle: '비밀번호 재설정',
    resetSubtitle: '가입하신 이메일 주소를 입력하시면\n재설정 링크를 보내드립니다.',
    resetBtn: '재설정 링크 발송',
    sending: '발송 중...',
    resetSuccess: '이메일을 확인해 주세요! 비밀번호 재설정 링크를 발송했습니다.',
    backToLogin: '← 로그인으로 돌아가기',
    loginError: '이메일 또는 비밀번호를 확인해 주세요.',
    resetError: '이메일 발송에 실패했습니다. 이메일 주소를 확인해 주세요.',
    langSwitch: '中文',
  },
  zh: {
    title: '登录',
    subtitle: '欢迎使用 KERYX 贸易服务',
    email: '邮箱',
    password: '密码',
    loginBtn: '登录',
    loggingIn: '登录中...',
    forgotPassword: '忘记密码？',
    noAccount: '还没有账号？',
    signupLink: '免费注册 →',
    resetTitle: '重置密码',
    resetSubtitle: '请输入您注册时使用的邮箱地址，\n我们将向您发送重置链接。',
    resetBtn: '发送重置链接',
    sending: '发送中...',
    resetSuccess: '请查看您的邮箱！已发送密码重置链接。',
    backToLogin: '← 返回登录',
    loginError: '请确认邮箱或密码是否正确。',
    resetError: '邮件发送失败，请确认邮箱地址。',
    langSwitch: '한국어',
  },
};

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get('role') ?? 'seller';
  const next = params.get('next') ?? roleDefaultLanding(role);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const supabase = createClient();
  const t = T[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError(t.loginError); return; }
    // 비로그인 신청 건 user_id 자동 연결 (이메일 일치 건)
    try { await fetch('/api/auth/link-requests', { method: 'POST' }); } catch (e) { console.warn('[login] link-requests:', e); }
    // next 파라미터가 명시된 경우 그대로 사용, 아니면 역할 기반 자동 리다이렉트
    if (params.get('next')) {
      router.push(next);
      router.refresh();
      return;
    }
    // user_profiles에서 역할 조회하여 올바른 대시보드로 이동
    try {
      const userId = authData?.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('kind')
          .eq('id', userId)
          .single();
        const kind = profile?.kind ?? 'seller';
        const roleRedirect: Record<string, string> = {
          admin: '/admin',
          md: '/md',
          inspector: '/md/inspections',
          factory: '/factory',
          seller: '/seller',
          designer: '/designer/tasks',
        };
        router.push(roleRedirect[kind] ?? '/seller');
        router.refresh();
        return;
      }
    } catch (profileErr) {
      console.warn('[login] profile role check:', profileErr);
    }
    router.push(next);
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    // ⛔ 최고관리자 계정은 이메일 비밀번호 재설정 차단 (보안 정책)
    const PROTECTED_ACCOUNTS = ['jo@keryx.kr'];
    if (PROTECTED_ACCOUNTS.includes(email.toLowerCase().trim())) {
      setLoading(false);
      setError(lang === 'zh' ? '该账号不支持邮件重置密码，请联系系统管理员。' : '해당 계정은 이메일 비밀번호 재설정이 지원되지 않습니다. 시스템 관리자에게 문의하세요.');
      // 보안 알림 - 관리자 계정 재설정 시도 기록
      try {
        await fetch('/api/admin/security-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'password_reset_attempt', email, timestamp: new Date().toISOString() }),
        });
      } catch (_) { /* 알림 실패해도 차단은 유지 */ }
      return;
    }
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (resetError) {
      setError(t.resetError);
    } else {
      setSuccess(t.resetSuccess);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'kakao') {
    setSocialLoading(provider);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&role=${role}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, queryParams: provider === 'kakao' ? { prompt: 'login' } : undefined },
    });
    if (authError) { setError(authError.message); setSocialLoading(null); }
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
      {/* 배경 장식 */}
      <div style={{ position: 'fixed', top: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', left: '5%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

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
        {/* 언어 전환 버튼 (우상단) */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <button
            onClick={() => { setLang(lang === 'ko' ? 'zh' : 'ko'); setError(null); setSuccess(null); }}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#6366f1',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.langSwitch}
          </button>
        </div>

        {/* 로고 헤더 */}
        <div style={{
          padding: '36px 36px 28px',
          textAlign: 'center',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
            <Image
              src="/logos/logo-horizontal.png"
              alt="KERYX"
              width={120}
              height={30}
              style={{ objectFit: 'contain' }}
              priority
            />
          </Link>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1e293b',
            margin: '0 0 6px',
            letterSpacing: '-0.03em',
          }}>
            {mode === 'login' ? t.title : t.resetTitle}
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontWeight: 400, whiteSpace: 'pre-line' }}>
            {mode === 'login' ? t.subtitle : t.resetSubtitle}
          </p>
        </div>

        {/* 폼 영역 */}
        <div style={{ padding: '28px 36px 32px' }}>
          {/* 에러 메시지 */}
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

          {/* 성공 메시지 */}
          {success && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 18,
              color: '#16a34a',
              fontSize: 13,
              fontWeight: 500,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {success}
            </div>
          )}

          {/* 로그인 폼 */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  {t.email}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
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
                    transition: 'border-color 0.15s',
                  }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  {t.password}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
                    transition: 'border-color 0.15s',
                  }}
                />
              </div>
              {/* 비밀번호 찾기 링크 */}
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textDecorationColor: 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#6366f1')}
                  onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                >
                  {t.forgotPassword}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !!socialLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  background: loading || socialLoading
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading || socialLoading ? 'not-allowed' : 'pointer',
                  boxShadow: loading || socialLoading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {loading ? (
                  <><span className="kx-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {t.loggingIn}</>
                ) : (
                  t.loginBtn
                )}
              </button>

              {/* 회원가입 링크 */}
              {role !== 'internal' && (
                <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
                  {t.noAccount}{' '}
                  <Link
                    href={`/signup?role=${role}`}
                    style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}
                  >
                    {t.signupLink}
                  </Link>
                </p>
              )}
            </form>
          )}

          {/* 비밀번호 재설정 폼 */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  {t.email}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
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
                    transition: 'border-color 0.15s',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !!success}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  background: loading || success ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading || success ? 'not-allowed' : 'pointer',
                  boxShadow: loading || success ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {loading ? (
                  <><span className="kx-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {t.sending}</>
                ) : (
                  t.resetBtn
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '10px',
                  borderRadius: 10,
                  border: '1.5px solid #e2e8f0',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t.backToLogin}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
      <LoginPageInner />
    </Suspense>
  );
}

function roleDefaultLanding(role: string): string {
  if (role === 'factory') return '/factory';
  if (role === 'internal') return '/admin';
  return '/seller'; // 기본: 바이어 대시보드
}
