'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLangContext } from '@/components/layout/LangContext';

interface Factory {
  id: string;
  factory_code: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  approval_status: string;
  avg_rating: number;
  total_orders: number;
  created_at: string | null;
}

interface CreateAccountForm {
  email: string;
  password: string;
  company_name: string;
  company_name_ko: string;
  contact_name: string;
  contact_phone: string;
  contact_wechat: string;
  city: string;
  province: string;
}

interface CreatedAccount {
  user_id: string;
  email: string;
  password: string;
  factory_id: string;
  factory_code: string;
  company_name: string;
}

/** 랜덤 비밀번호 생성 (영문 대소문자 + 숫자, 12자) */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function FactoriesClient({ factories: initialFactories }: { factories: Factory[] }) {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  // 공장 목록 (새로 생성된 공장 포함)
  const [factories, setFactories] = useState<Factory[]>(initialFactories);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateAccountForm>({
    email: '',
    password: generatePassword(),
    company_name: '',
    company_name_ko: '',
    contact_name: '',
    contact_phone: '',
    contact_wechat: '',
    city: '',
    province: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (field: keyof CreateAccountForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password || !form.company_name) {
      setError(t('이메일, 비밀번호, 회사명(중국어)은 필수입니다.', '邮箱、密码、公司名称（中文）为必填项。'));
      return;
    }
    // 이메일 형식 검증 (xxx@xxx.xxx 형식 필수)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError(t('올바른 이메일 형식을 입력해주세요. (예: factory@example.com)', '请输入正确的邮箱格式。（例如：factory@example.com）'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('비밀번호는 최소 8자 이상이어야 합니다.', '密码至少需要8位字符。'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/factories/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          company_name: form.company_name,
          company_name_ko: form.company_name_ko || undefined,
          contact_name: form.contact_name || undefined,
          contact_phone: form.contact_phone || undefined,
          contact_wechat: form.contact_wechat || undefined,
          city: form.city || undefined,
          province: form.province || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('계정 생성 실패', '账号创建失败'));
        return;
      }
      setCreatedAccount(data.account);
      // 목록에 새 공장 추가
      setFactories(prev => [{
        id: data.account.factory_id,
        factory_code: data.account.factory_code,
        company_name: data.account.company_name,
        contact_name: form.contact_name || null,
        contact_email: data.account.email,
        approval_status: 'approved',
        avg_rating: 0,
        total_orders: 0,
        created_at: new Date().toISOString(),
      }, ...prev]);
    } catch (e: any) {
      setError(e.message || t('네트워크 오류', '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInfo = () => {
    if (!createdAccount) return;
    const text = [
      `${t('공장 코드', '工厂编号')}: ${createdAccount.factory_code}`,
      `${t('회사명', '公司名称')}: ${createdAccount.company_name}`,
      `${t('로그인 이메일', '登录邮箱')}: ${createdAccount.email}`,
      `${t('초기 비밀번호', '初始密码')}: ${createdAccount.password}`,
      `${t('접속 주소', '访问地址')}: https://keryx.kr/factory`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCreatedAccount(null);
    setError('');
    setForm({
      email: '',
      password: generatePassword(),
      company_name: '',
      company_name_ko: '',
      contact_name: '',
      contact_phone: '',
      contact_wechat: '',
      city: '',
      province: '',
    });
  };

  return (
    <div className="kx-animate-in">
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
            {t('공장 목록·상세', '工厂列表·详情')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {t('승인된 공급사(공장) 목록과 상세 정보를 관리합니다.', '管理已审批的供应商（工厂）列表及详细信息。')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* 공장 계정 직접 생성 버튼 */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 20px', borderRadius: 12, background: '#10b981', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            }}
          >
            {t('+ 공장 계정 생성', '+ 创建工厂账号')}
          </button>
          <Link href="/admin/factories/approvals" style={{
            padding: '10px 20px', borderRadius: 12, background: '#e11d48', color: '#fff',
            textDecoration: 'none', fontSize: 14, fontWeight: 700,
          }}>
            {t('가입 승인 관리 →', '入驻审批管理 →')}
          </Link>
        </div>
      </div>

      {/* 공장 목록 */}
      {!factories || factories.length === 0 ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-base)', borderRadius: 16, border: '1.5px solid var(--border-light)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏭</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('승인된 공장이 없습니다', '暂无已审批的工厂')}</div>
          <div style={{ fontSize: 14, marginBottom: 24 }}>{t('공장 계정을 직접 생성하거나 가입 승인 페이지에서 신청을 검토하세요.', '请直接创建工厂账号，或在入驻审批页面审核申请。')}</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setShowModal(true)} style={{
              display: 'inline-block', padding: '12px 24px', borderRadius: 12,
              background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            }}>
              {t('+ 공장 계정 생성', '+ 创建工厂账号')}
            </button>
            <Link href="/admin/factories/approvals" style={{
              display: 'inline-block', padding: '12px 24px', borderRadius: 12,
              background: '#e11d48', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            }}>
              {t('가입 승인 관리로 이동 →', '前往入驻审批管理 →')}
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {factories.map((factory) => (
            <div key={factory.id} style={{
              background: 'var(--bg-base)', borderRadius: 16, border: '1.5px solid var(--border-light)',
              overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s',
            }}>
              <div style={{
                padding: '20px', background: 'linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 100%)',
                color: '#fff', position: 'relative',
              }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4, letterSpacing: '0.08em' }}>
                  {factory.factory_code ?? '-'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                  {factory.company_name ?? '-'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{factory.contact_name ?? '-'}</div>
                {factory.avg_rating > 0 && (
                  <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                    ⭐ {factory.avg_rating.toFixed(1)}
                  </div>
                )}
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div className="flex-1">
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('총 주문', '总订单')}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#e11d48' }}>{factory.total_orders ?? 0}{t('건', '件')}</div>
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('등록일', '注册日期')}</div>
                    <div className="text-[13px] font-semibold">
                      {factory.created_at ? new Date(factory.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR') : '-'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                  {factory.contact_email ?? '-'}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/factory-ratings?factory=${factory.id}`} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, background: '#fff5f5',
                    color: '#e11d48', textDecoration: 'none', fontSize: 12, fontWeight: 600,
                    textAlign: 'center', border: '1px solid #fecaca',
                  }}>
                    {t('평가 보기', '查看评价')}
                  </Link>
                  <Link href={`/admin/inspections?factory=${factory.id}`} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, background: '#f0fdf4',
                    color: '#10b981', textDecoration: 'none', fontSize: 12, fontWeight: 600,
                    textAlign: 'center', border: '1px solid #bbf7d0',
                  }}>
                    {t('검수 내역', '验货记录')}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 공장 계정 생성 모달 ===== */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-base)', borderRadius: 20, width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '24px 28px 20px', borderBottom: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {t('공장 계정 직접 생성', '直接创建工厂账号')}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  {t('이메일과 초기 비밀번호로 공장 계정을 즉시 생성합니다.', '使用邮箱和初始密码立即创建工厂账号。')}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--text-tertiary)', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* 생성 완료 화면 */}
            {createdAccount ? (
              <div style={{ padding: '28px' }}>
                <div style={{
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 16,
                  padding: '20px', marginBottom: 20,
                }}>
                  <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#065f46', textAlign: 'center', marginBottom: 16 }}>
                    {t('공장 계정이 성공적으로 생성되었습니다!', '工厂账号创建成功！')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: t('공장 코드', '工厂编号'), value: createdAccount.factory_code },
                      { label: t('회사명', '公司名称'), value: createdAccount.company_name },
                      { label: t('로그인 이메일', '登录邮箱'), value: createdAccount.email },
                      { label: t('초기 비밀번호', '初始密码'), value: createdAccount.password },
                      { label: t('접속 주소', '访问地址'), value: 'https://keryx.kr/factory' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#fff', borderRadius: 8, padding: '10px 14px',
                        border: '1px solid #d1fae5',
                      }}>
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleCopyInfo}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #10b981',
                      background: copied ? '#10b981' : '#fff', color: copied ? '#fff' : '#10b981',
                      cursor: 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
                    }}
                  >
                    {copied ? t('✓ 복사됨', '✓ 已复制') : t('📋 계정 정보 복사', '📋 复制账号信息')}
                  </button>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10, background: '#e11d48',
                      color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                    }}
                  >
                    {t('닫기', '关闭')}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 12 }}>
                  {t('⚠️ 비밀번호는 이 화면에서만 확인 가능합니다. 반드시 복사하여 공장에 전달하세요.', '⚠️ 密码只能在此页面查看，请务必复制并告知工厂。')}
                </p>
              </div>
            ) : (
              /* 입력 폼 */
              <div style={{ padding: '24px 28px' }}>
                {error && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                    padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13,
                  }}>
                    {error}
                  </div>
                )}

                {/* 필수 입력 */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('필수 정보', '必填信息')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        {t('회사명 (중국어)', '公司名称（中文）')} <span style={{ color: '#e11d48' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.company_name}
                        onChange={e => handleChange('company_name', e.target.value)}
                        placeholder={t('예: 广州测试工厂', '例如: 广州测试工厂')}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10,
                          border: '1.5px solid var(--border-light)', fontSize: 14,
                          background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        {t('로그인 이메일', '登录邮箱')} <span style={{ color: '#e11d48' }}>*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => handleChange('email', e.target.value)}
                        placeholder="factory@example.com"
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10,
                          border: '1.5px solid var(--border-light)', fontSize: 14,
                          background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        {t('초기 비밀번호', '初始密码')} <span style={{ color: '#e11d48' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          value={form.password}
                          onChange={e => handleChange('password', e.target.value)}
                          style={{
                            flex: 1, padding: '10px 14px', borderRadius: 10,
                            border: '1.5px solid var(--border-light)', fontSize: 14,
                            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                            fontFamily: 'monospace',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleChange('password', generatePassword())}
                          style={{
                            padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-light)',
                            background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                          }}
                        >
                          {t('🔄 재생성', '🔄 重新生成')}
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {t('최소 8자. 공장에 전달 후 변경 권장.', '至少8位字符，建议告知工厂后更改。')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 선택 입력 */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('추가 정보 (선택)', '附加信息（可选）')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { field: 'company_name_ko' as const, label: t('회사명 (한국어)', '公司名称（韩文）'), placeholder: t('예: 광저우 테스트 공장', '例如: 广州测试工厂') },
                      { field: 'contact_name' as const, label: t('담당자명', '联系人'), placeholder: t('예: 张伟', '例如: 张伟') },
                      { field: 'contact_phone' as const, label: t('연락처', '联系电话'), placeholder: '+86 138-0000-0000' },
                      { field: 'contact_wechat' as const, label: t('위챗 ID', '微信号'), placeholder: 'wechat_id' },
                      { field: 'city' as const, label: t('도시', '城市'), placeholder: t('예: 广州', '例如: 广州') },
                      { field: 'province' as const, label: t('성/지역', '省份'), placeholder: t('예: 广东省', '例如: 广东省') },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                          {label}
                        </label>
                        <input
                          type="text"
                          value={form[field]}
                          onChange={e => handleChange(field, e.target.value)}
                          placeholder={placeholder}
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: 8,
                            border: '1.5px solid var(--border-light)', fontSize: 13,
                            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 버튼 */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10,
                      border: '1.5px solid var(--border-light)', background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    }}
                  >
                    {t('취소', '取消')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 10, background: loading ? '#9ca3af' : '#10b981',
                      color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 14, fontWeight: 700,
                    }}
                  >
                    {loading ? t('생성 중...', '创建中...') : t('✓ 공장 계정 생성', '✓ 创建工厂账号')}
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
