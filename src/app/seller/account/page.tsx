'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

export default function SellerAccountPage() {
  const router = useRouter();
  const { lang, setLang } = useLangContext();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [seller, setSeller] = useState<any>(null);
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    business_type: '',
    memo: '',
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }
      const { data: profile } = await supabase
        .from('user_profiles').select('kind').eq('id', user.id).single();
      if (!profile || !['seller', 'admin', 'md'].includes(profile.kind)) {
        router.push('/login?role=seller'); return;
      }
      const { data: s } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (s) {
        setSeller(s);
        setForm({
          business_name: s.business_name ?? '',
          contact_name: s.contact_name ?? '',
          contact_email: s.contact_email ?? '',
          contact_phone: s.contact_phone ?? '',
          business_address: s.business_address ?? '',
          business_type: s.business_type ?? '',
          memo: s.memo ?? '',
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!seller) return;
    setSaving(true);
    const { error } = await supabase
      .from('sellers')
      .update({
        business_name: form.business_name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        business_address: form.business_address,
        business_type: form.business_type,
        memo: form.memo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seller.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) return (
    <div className="text-center px-6 py-20 text-[var(--text-tertiary)]">
      <div className="text-[32px] mb-3">⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  const brandColor = '#667eea';

  return (
    <div className="kx-animate-in max-w-xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
          <LangText ko="계정 관리" zh="账户管理" />
        </h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          <LangText ko="바이어 기본 정보를 수정합니다." zh="修改买家基本信息。" />
        </p>
      </div>

      {/* 언어 토글 */}
      <div className="flex gap-2 mb-6">
        {(['ko', 'zh'] as const).map(l => (
          <button
            key={l}
            onClick={() => { setLang(l); localStorage.setItem('kx_lang', l); }}
            className="kx-btn-sm px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={lang === l
              ? { background: brandColor, color: '#fff' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          >
            {l === 'ko' ? '한국어' : '中文'}
          </button>
        ))}
      </div>

      {/* 멤버십 상태 카드 */}
      {seller && (
        <div className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ background: `${brandColor}10`, border: `1px solid ${brandColor}30` }}>
          <span className="text-2xl">👑</span>
          <div>
            <p className="text-sm font-bold" style={{ color: brandColor }}>
              {seller.current_membership?.toUpperCase() ?? 'FREE'} {lang === 'ko' ? '멤버십' : '会员'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {lang === 'ko' ? `승인 상태: ${seller.approval_status ?? '-'}` : `审核状态: ${seller.approval_status ?? '-'}`}
            </p>
          </div>
        </div>
      )}

      {/* 폼 */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
        {[
          { key: 'business_name', ko: '상호명', zh: '公司名称', type: 'text' },
          { key: 'contact_name', ko: '담당자 이름', zh: '联系人姓名', type: 'text' },
          { key: 'contact_email', ko: '이메일', zh: '电子邮件', type: 'email' },
          { key: 'contact_phone', ko: '전화번호', zh: '联系电话', type: 'tel' },
          { key: 'business_address', ko: '사업장 주소', zh: '营业地址', type: 'text' },
          { key: 'business_type', ko: '업종', zh: '行业类型', type: 'text' },
        ].map(({ key, ko, zh, type }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              {lang === 'ko' ? ko : zh}
            </label>
            <input
              type={type}
              value={(form as any)[key]}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              className="kx-input w-full rounded-lg px-3 text-sm"
              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-base)' }}
              placeholder={lang === 'ko' ? ko : zh}
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            <LangText ko="메모 (내부용)" zh="备注（内部）" />
          </label>
          <textarea
            value={form.memo}
            onChange={e => setForm(prev => ({ ...prev, memo: e.target.value }))}
            rows={3}
            className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-base)', minHeight: 80 }}
            placeholder={lang === 'ko' ? '메모를 입력하세요' : '请输入备注'}
          />
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="mt-5 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="kx-btn flex-1 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: saving ? 'var(--bg-muted)' : brandColor }}
        >
          {saving
            ? <LangText ko="저장 중..." zh="保存中..." />
            : saved
              ? <LangText ko="✅ 저장 완료!" zh="✅ 保存成功！" />
              : <LangText ko="변경사항 저장" zh="保存更改" />}
        </button>
        <button
          onClick={() => router.push('/seller')}
          className="kx-btn px-5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
        >
          <LangText ko="취소" zh="取消" />
        </button>
      </div>

      {/* 비밀번호 변경 안내 */}
      <div className="mt-6 rounded-xl p-4 text-center"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          <LangText ko="비밀번호 변경은 이메일 재설정을 통해 진행하세요." zh="密码更改请通过邮件重置进行。" />
        </p>
        <a
          href="/forgot-password"
          className="text-xs font-semibold no-underline"
          style={{ color: brandColor }}
        >
          <LangText ko="비밀번호 재설정 →" zh="重置密码 →" />
        </a>
      </div>
    </div>
  );
}
