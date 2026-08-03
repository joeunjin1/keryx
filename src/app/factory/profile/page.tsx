'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useRouter } from 'next/navigation';


const brandColor = '#10b981';

const CERT_OPTIONS = ['ISO9001', 'ISO14001', 'BSCI', 'SEDEX', 'SGS', 'BV', 'ITS', 'CE', 'REACH', 'RoHS'];

export default function FactoryProfilePage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '공장 프로필 | KERYX';
  }, []);

  const supabase = createClient() as any;
  const router = useRouter();
  const [factory, setFactory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'trust' | 'gallery'>('basic');

  const [form, setForm] = useState({
    company_name: '',
    company_name_ko: '',
    city: '',
    province: '',
    founded_year: '',
    factory_area_sqm: '',
    employee_count: '',
    production_capacity: '',
    avg_lead_time_days: '',
    contact_name: '',
    contact_phone: '',
    contact_wechat: '',
    contact_email: '',
    website_url: '',
    intro_text_zh: '',
    intro_text_ko: '',
    certifications: [] as string[],
    main_products: [] as string[],
    cover_image_url: '',
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=factory'); return; }

      const { data: f } = await supabase
        .from('factories')
        .select('*')
        .eq('shared_login_user_id', user.id)
        .single();

      if (f) {
        setFactory(f);
        setForm({
          company_name: f.company_name || '',
          company_name_ko: f.company_name_ko || '',
          city: f.city || '',
          province: f.province || '',
          founded_year: f.founded_year?.toString() || '',
          factory_area_sqm: f.factory_area_sqm?.toString() || '',
          employee_count: f.employee_count?.toString() || '',
          production_capacity: f.production_capacity || '',
          avg_lead_time_days: f.avg_lead_time_days?.toString() || '',
          contact_name: f.contact_name || '',
          contact_phone: f.contact_phone || '',
          contact_wechat: f.contact_wechat || '',
          contact_email: f.contact_email || '',
          website_url: f.website_url || '',
          intro_text_zh: f.intro_text_zh || '',
          intro_text_ko: f.intro_text_ko || '',
          certifications: f.certifications || [],
          main_products: f.main_products || [],
          cover_image_url: f.cover_image_url || '',
        });
      }
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!factory) return;
    setSaving(true);
    setSaveError(null);
    try {
      // RLS 우회: 서버 API 라우트를 통해 service_role로 저장
      const res = await fetch('/api/factory/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          company_name_ko: form.company_name_ko,
          city: form.city,
          province: form.province,
          founded_year: form.founded_year || null,
          factory_area_sqm: form.factory_area_sqm || null,
          employee_count: form.employee_count || null,
          production_capacity: form.production_capacity,
          avg_lead_time_days: form.avg_lead_time_days || null,
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          contact_wechat: form.contact_wechat,
          contact_email: form.contact_email,
          website_url: form.website_url,
          intro_text_zh: form.intro_text_zh,
          intro_text_ko: form.intro_text_ko,
          certifications: form.certifications,
          main_products: form.main_products,
          cover_image_url: form.cover_image_url,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveError(data.error ?? '저장에 실패했습니다.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e: any) {
      setSaveError(e.message ?? '네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCert = (cert: string) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert],
    }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-light)',
    background: 'var(--bg-surface)', fontSize: 14, color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };
  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>로딩 중...
              </div>
    </div>
  );

  return (
    <div>
      

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            <LangText ko="공장 프로필 관리" zh="工厂简介管理" />
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            <LangText ko="바이어에게 보여지는 공장 정보를 관리합니다" zh="管理向买家展示的工厂信息" />
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="active:scale-95 transition-all" style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: saved ? '#10b981' : brandColor, color: '#fff', fontSize: 14, fontWeight: 700, transition: 'all 0.2s' }}
        >
          {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장'}
        </button>
      </div>
      {saveError && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
          ⚠️ {saveError}
        </div>
      )}


      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-surface)', borderRadius: 10, padding: 4 }}>
        {[
          { key: 'basic', ko: '기본 정보', zh: '基本信息' },
          { key: 'trust', ko: '신뢰도 정보', zh: '信誉信息' },
          { key: 'gallery', ko: '소개 & 갤러리', zh: '介绍 & 图库' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? brandColor : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            }}
          >
            <LangText ko={tab.ko} zh={tab.zh} />
          </button>
        ))}
      </div>


      {activeTab === 'basic' && (
        <div style={{ background: 'var(--bg-base)', borderRadius: 12, padding: 20, border: '1px solid var(--border-light)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="회사명 (중문)" zh="公司名称（中文）" /></label>
              <input style={inputStyle} value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="深圳XX有限公司" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="회사명 (한국어)" zh="公司名称（韩文）" /></label>
              <input style={inputStyle} value={form.company_name_ko} onChange={e => setForm(p => ({ ...p, company_name_ko: e.target.value }))} placeholder="XX 유한회사" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="도시" zh="城市" /></label>
              <input style={inputStyle} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="义乌" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="성/지역" zh="省/地区" /></label>
              <input style={inputStyle} value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} placeholder="浙江省" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="설립 연도" zh="成立年份" /></label>
              <input style={inputStyle} type="number" value={form.founded_year} onChange={e => setForm(p => ({ ...p, founded_year: e.target.value }))} placeholder="2010" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="공장 면적 (㎡)" zh="工厂面积（㎡）" /></label>
              <input style={inputStyle} type="number" value={form.factory_area_sqm} onChange={e => setForm(p => ({ ...p, factory_area_sqm: e.target.value }))} placeholder="5000" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="직원 수" zh="员工人数" /></label>
              <input style={inputStyle} type="number" value={form.employee_count} onChange={e => setForm(p => ({ ...p, employee_count: e.target.value }))} placeholder="200" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}><LangText ko="평균 납기일 (일)" zh="平均交货期（天）" /></label>
              <input style={inputStyle} type="number" value={form.avg_lead_time_days} onChange={e => setForm(p => ({ ...p, avg_lead_time_days: e.target.value }))} placeholder="30" />
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}><LangText ko="생산 능력" zh="生产能力" /></label>
            <input style={inputStyle} value={form.production_capacity} onChange={e => setForm(p => ({ ...p, production_capacity: e.target.value }))} placeholder="월 50만 개 / 月产50万个" />
          </div>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              <LangText ko="담당자 연락처" zh="联系人信息" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div style={fieldStyle}>
                <label style={labelStyle}><LangText ko="담당자명" zh="联系人姓名" /></label>
                <input style={inputStyle} value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="王小明" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}><LangText ko="연락처" zh="联系电话" /></label>
                <input style={inputStyle} value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="+86 138-XXXX-XXXX" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>WeChat</label>
                <input style={inputStyle} value={form.contact_wechat} onChange={e => setForm(p => ({ ...p, contact_wechat: e.target.value }))} placeholder="wechat_id" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="factory@example.com" />
              </div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'trust' && (
        <div style={{ background: 'var(--bg-base)', borderRadius: 12, padding: 20, border: '1px solid var(--border-light)' }}>
          <div className="mb-5">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              <LangText ko="보유 인증서" zh="持有认证" />
            </div>
            <div className="flex flex-wrap gap-2">
              {CERT_OPTIONS.map(cert => (
                <button
                  key={cert}
                  onClick={() => toggleCert(cert)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: `1px solid ${form.certifications.includes(cert) ? brandColor : 'var(--border-light)'}`,
                    background: form.certifications.includes(cert) ? `${brandColor}15` : 'var(--bg-surface)',
                    color: form.certifications.includes(cert) ? brandColor : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {form.certifications.includes(cert) ? '✓ ' : ''}{cert}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}><LangText ko="주요 생산 품목 (쉼표로 구분)" zh="主要生产品类（逗号分隔）" /></label>
            <input
              style={inputStyle}
              value={form.main_products.join(', ')}
              onChange={e => setForm(p => ({ ...p, main_products: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              placeholder="플러시 인형, 키링, 피규어 / 毛绒玩具, 钥匙扣, 手办"
            />
          </div>


          {factory && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: 16, border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                <LangText ko="KERYX 신뢰도 현황" zh="KERYX信誉状况" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: '평균 평점', labelZh: '平均评分', value: factory.avg_rating ? `★ ${factory.avg_rating}` : '미집계', color: '#f59e0b' },
                  { label: '총 주문', labelZh: '总订单', value: `${factory.total_orders || 0}건`, color: brandColor },
                  { label: '응답률', labelZh: '响应率', value: factory.response_rate ? `${factory.response_rate}%` : '미집계', color: '#8b5cf6' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: 12, background: 'var(--bg-base)', borderRadius: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      <LangText ko={stat.label} zh={stat.labelZh} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {activeTab === 'gallery' && (
        <div style={{ background: 'var(--bg-base)', borderRadius: 12, padding: 20, border: '1px solid var(--border-light)' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}><LangText ko="커버 이미지 URL" zh="封面图片URL" /></label>
            <input style={inputStyle} value={form.cover_image_url} onChange={e => setForm(p => ({ ...p, cover_image_url: e.target.value }))} placeholder="https://..." />
            {form.cover_image_url && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 120, background: '#f3f4f6' }}>
                <img src={form.cover_image_url} alt="커버" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as any).style.display = 'none'; }}
              />
              </div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}><LangText ko="공장 소개 (중문)" zh="工厂介绍（中文）" /></label>
            <textarea
              style={{ ...inputStyle, height: 100, resize: 'vertical' }}
              value={form.intro_text_zh}
              onChange={e => setForm(p => ({ ...p, intro_text_zh: e.target.value }))}
              placeholder="我们是专业生产毛绒玩具的工厂，成立于2010年..."
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}><LangText ko="공장 소개 (한국어)" zh="工厂介绍（韩文）" /></label>
            <textarea
              style={{ ...inputStyle, height: 100, resize: 'vertical' }}
              value={form.intro_text_ko}
              onChange={e => setForm(p => ({ ...p, intro_text_ko: e.target.value }))}
              placeholder="저희는 2010년 설립된 플러시 인형 전문 제조 공장입니다..."
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}><LangText ko="웹사이트 URL" zh="网站URL" /></label>
            <input style={inputStyle} value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://www.factory.com" />
          </div>


          {factory && (
            <div style={{ marginTop: 16, padding: 14, background: `${brandColor}10`, borderRadius: 10, border: `1px solid ${brandColor}30` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: brandColor, marginBottom: 6 }}>
                <LangText ko="🌐 공장 스토어프론트 미리보기" zh="🌐 工厂展示页预览" />
              </div>
              <a
                href={`/shop/factory/${factory.id}`}
                target="_blank"
                style={{ fontSize: 12, color: brandColor, textDecoration: 'underline' }}
              >
                /shop/factory/{factory.id}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
