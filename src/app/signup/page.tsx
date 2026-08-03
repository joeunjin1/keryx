'use client';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User, Building2, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

function SignupPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = (params.get('role') ?? 'seller') as 'seller' | 'factory';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { kind: role, display_name: businessName || contactName || email.split('@')[0], contact_name: contactName, business_name: businessName } },
    });
    if (authError) { setLoading(false); setError(authError.message); return; }
    // 회원가입 성공 후 user_profiles 자동 생성 (API 호출)
    if (signUpData?.user?.id) {
      try {
        await fetch('/api/auth/register-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: signUpData.user.id,
            email,
            kind: role,
            display_name: businessName || contactName || email.split('@')[0],
            business_name: businessName,
            contact_name: contactName,
          }),
        });
      } catch (profileErr) {
        // 프로필 생성 실패는 로그인 시 자동 복구되므로 무시
        console.warn('Profile creation warning (non-fatal):', profileErr);
      }
    }
    setLoading(false);
    setSuccess(true);
  }


  const isSeller = role === 'seller';
  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, color: '#1e293b', background: '#f8fafc', outline: 'none', minHeight: 50, boxSizing: 'border-box' };
  const iconStyle: React.CSSProperties = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' };

  if (success) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f8f9ff 0%,#f0f0ff 50%,#f8f9ff 100%)', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 24, padding: '40px 32px', boxShadow: '0 8px 32px rgba(102,126,234,0.15)', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>가입 신청 완료!</div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
            이메일 인증 후 서비스를 이용하실 수 있습니다.<br />
            <strong style={{ color: '#667eea' }}>{email}</strong>로 인증 메일을 발송했습니다.
          </div>
          <Link href={`/login?role=${role}`} style={{ display: 'block', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 14px rgba(102,126,234,0.4)' }}>
            로그인 페이지로 이동 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', background: 'linear-gradient(135deg,#f8f9ff 0%,#f0f0ff 50%,#f8f9ff 100%)' }}>
      <div className="signup-brand-panel" style={{ flex: 1, background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', padding: '48px 40px', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', display: 'none' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Image src="/logos/logo-horizontal.png" alt="KERYX" width={160} height={40} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: 32 }} />
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
            {isSeller ? '중국 공장과 직접 연결되는\nB2B 무역 플랫폼' : '글로벌 바이어와 연결되는\n공급사 포털'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, marginBottom: 32 }}>
            {isSeller ? '시장조사부터 공장매칭, 검수, 물류까지\n원스톱으로 해결하세요.' : '제품을 등록하고 전 세계 바이어에게\n노출하세요.'}
          </div>
          {[isSeller ? '🔍 시장조사 & 공장 매칭' : '🏭 제품 등록 & 노출', isSeller ? '📦 전수검수 & 물류대행' : '📊 주문 관리 & 정산', isSeller ? '👤 전담 MD 배정' : '💬 전담 MD 소통'].map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', minHeight: '100dvh' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div className="signup-mobile-logo" style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link href="/"><Image src="/logos/logo-horizontal.png" alt="KERYX" width={140} height={35} style={{ objectFit: 'contain' }} priority /></Link>
          </div>
          <div style={{ background: '#fff', borderRadius: 24, padding: 'clamp(24px,5vw,36px)', boxShadow: '0 8px 32px rgba(102,126,234,0.12)', border: '1px solid rgba(102,126,234,0.1)' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#f0f0ff,#faf5ff)', border: '1px solid #c4c4fd', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#667eea', marginBottom: 10 }}>
                {isSeller ? '🛒 바이어 회원가입' : '🏭 공장 가입 신청'}
              </div>
              <div style={{ fontSize: 'clamp(1.2rem,4vw,1.5rem)', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.03em' }}>
                {isSeller ? 'KERYX 바이어로 시작하세요' : 'KERYX 공급사로 등록하세요'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                {isSeller ? '무료로 가입하고 공장 매칭 서비스를 경험하세요' : '제품을 등록하고 글로벌 바이어와 연결하세요'}
              </div>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{isSeller ? '회사명 (브랜드명)' : '공장 회사명'} <span style={{ color: '#e11d48' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={iconStyle} />
                  <input type="text" required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={isSeller ? '예: 핑크걸즈샵' : '예: 광저우 ABC 공장'} autoComplete="organization" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>담당자명 <span style={{ color: '#e11d48' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={iconStyle} />
                  <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>이메일 <span style={{ color: '#e11d48' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={iconStyle} />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" inputMode="email" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>비밀번호 (8자 이상) <span style={{ color: '#e11d48' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={iconStyle} />
                  <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />
                </div>
              </div>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, color: '#be123c', fontSize: 13 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, boxShadow: '0 4px 14px rgba(102,126,234,0.4)' }}>
                {loading ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> 가입 중…</> : <>가입 신청 <ArrowRight size={16} /></>}
              </button>
              <div style={{ textAlign: 'center' }}>
                <Link href={`/login?role=${role}`} style={{ fontSize: 13, color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
                  이미 계정이 있으신가요? <span style={{ textDecoration: 'underline' }}>로그인</span>
                </Link>
              </div>
            </form>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{isSeller ? '공급사(공장)이신가요? ' : '구매자(바이어)이신가요? '}</span>
              <Link href={`/signup?role=${isSeller ? 'factory' : 'seller'}`} style={{ fontSize: 12, color: '#667eea', fontWeight: 700, textDecoration: 'none' }}>
                {isSeller ? '공장 가입 →' : '바이어 가입 →'}
              </Link>
            </div>
          </div>
          <p style={{ marginTop: 16, fontSize: 11, textAlign: 'center', color: '#94a3b8' }}>본 서비스는 (주)가자트레이드가 운영합니다</p>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media(min-width:768px){.signup-brand-panel{display:flex!important} .signup-mobile-logo{display:none!important}}`}</style>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh',background:'linear-gradient(135deg,#f8f9ff,#f0f0ff)' }}><div style={{ width:40,height:40,border:'3px solid rgba(102,126,234,0.3)',borderTopColor:'#667eea',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} /></div>}>
      <SignupPageInner />
    </Suspense>
  );
}
