"use client";
/**
 * MD 포털 공장 등록 버튼 + 모달
 * MD도 공장 아이디/비번을 생성할 수 있도록 함
 * API에서 admin/md 모두 허용 (register-factory route.ts 참조)
 */
import { useState } from 'react';

const labelCls = "block text-xs font-semibold text-[var(--text-secondary)] mb-1";
const inputCls = "w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-muted)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 transition-all";

export default function FactoryRegisterButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="active:scale-95 transition-all inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold border-none cursor-pointer shadow-[0_4px_12px_rgba(225,29,72,0.3)] hover:bg-rose-700"
      >
        🏭 공장 등록 + 추가
      </button>
      {showModal && <FactoryRegisterModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function FactoryRegisterModal({ onClose }: { onClose: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [companyNameKo, setCompanyNameKo] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!companyName.trim() || !email.trim()) {
      setError('공장명(중문)과 이메일은 필수입니다.');
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/admin/register-factory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: companyName.trim(),
        company_name_ko: companyNameKo.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        skip_approval: false, // MD가 등록 시 관리자 승인 필요
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? '등록 실패. 다시 시도해 주세요.');
      return;
    }
    const result = await res.json().catch(() => ({}));
    setTempPassword(result.temp_password || '');
    setDone(true);
  }

  return (
    <div className="kx-modal-backdrop" onClick={onClose}>
      <div className="kx-modal" onClick={e => e.stopPropagation()}>
        <div className="kx-modal-header">
          <div>
            <div className="kx-modal-title">🏭 공장 등록</div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">새 공장 파트너를 등록합니다 (관리자 승인 후 활성화)</p>
          </div>
          <button onClick={onClose} className="active:scale-95 transition-all bg-[var(--bg-muted)] border-none rounded-full w-8 h-8 cursor-pointer text-base flex items-center justify-center">✕</button>
        </div>
        <div className="kx-modal-body">
          {done ? (
            <div className="text-center py-6">
              <div className="text-[48px] mb-3">✅</div>
              <p className="text-lg font-extrabold text-emerald-500 mb-2">등록 완료!</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">공장 계정이 생성되었습니다. 관리자 승인 후 활성화됩니다.</p>
              {tempPassword && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-4 text-left">
                  <p className="text-xs font-bold text-amber-700 mb-1">⚠️ 임시 비밀번호 (최초 로그인 후 변경 필요)</p>
                  <p className="text-base font-mono font-black text-amber-900 tracking-widest select-all">{tempPassword}</p>
                  <p className="text-xs text-amber-600 mt-1">이 화면을 닫으면 다시 확인할 수 없습니다.</p>
                </div>
              )}
              <button onClick={onClose} className="active:scale-95 transition-all px-8 py-3 rounded-xl bg-rose-600 text-white border-none text-sm font-bold cursor-pointer">확인 (저장 완료)</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>공장명 (中文) *</label>
                  <input className={inputCls} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="深圳市SENKANG工厂" />
                </div>
                <div>
                  <label className={labelCls}>공장명 (한국어)</label>
                  <input className={inputCls} value={companyNameKo} onChange={e => setCompanyNameKo(e.target.value)} placeholder="센캉 공장" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>담당자명</label>
                  <input className={inputCls} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="张伟" />
                </div>
                <div>
                  <label className={labelCls}>도시</label>
                  <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="深圳" />
                </div>
              </div>
              <div>
                <label className={labelCls}>이메일 *</label>
                <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="factory@example.com" />
              </div>
              <div>
                <label className={labelCls}>전화번호</label>
                <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+86-755-0000-0000" />
              </div>
              {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-sm text-rose-600">⚠️ {error}</div>}
              <button
                onClick={submit}
                disabled={submitting}
                className={`active:scale-95 transition-all w-full py-3.5 rounded-xl text-white border-none text-sm font-bold cursor-pointer mt-1 ${submitting ? 'bg-neutral-400 cursor-wait' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {submitting ? '등록 중…' : '공장 등록'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
