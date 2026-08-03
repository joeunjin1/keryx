'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

// ============================================================
// 타입 정의
// ============================================================
interface ProductItem {
  id: string;
  name_ko: string;
  name_zh: string;
  price: string;
  moq: string;
  lead_time: string;
  weight: string;
  size: string;
  options: string;
  memo: string;
  photos: PhotoItem[];
}

interface PhotoItem {
  id: string;
  url: string;
  title: string;
  uploading?: boolean;
}

interface FactoryItem {
  id: string;
  factory_name_ko: string;
  factory_name_zh: string;
  factory_location: string;
  factory_established_year: string;
  factory_employees: string;
  factory_area_sqm: string;
  factory_certifications: string;
  production_capacity: string;
  lead_time_days: string;
  min_order_qty: string;
  development_capability: string;
  oem_odm: string;
  quality_control: string;
  defect_rate: string;
  factory_intro: string;
  is_recommended: boolean;
  recommendation_reason: string;
  factory_photos: PhotoItem[];
  equipment_photos: PhotoItem[];
  products: ProductItem[];
}

interface Buyer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
}

const newPhoto = (): PhotoItem => ({ id: crypto.randomUUID(), url: '', title: '' });
const newProduct = (): ProductItem => ({
  id: crypto.randomUUID(),
  name_ko: '', name_zh: '', price: '', moq: '', lead_time: '',
  weight: '', size: '', options: '', memo: '', photos: [newPhoto()],
});
const newFactory = (): FactoryItem => ({
  id: crypto.randomUUID(),
  factory_name_ko: '', factory_name_zh: '', factory_location: '',
  factory_established_year: '', factory_employees: '', factory_area_sqm: '',
  factory_certifications: '', production_capacity: '', lead_time_days: '',
  min_order_qty: '', development_capability: '', oem_odm: '',
  quality_control: '', defect_rate: '', factory_intro: '',
  is_recommended: false, recommendation_reason: '',
  factory_photos: [newPhoto()], equipment_photos: [newPhoto()],
  products: [newProduct()],
});

// ============================================================
// 메인 컴포넌트
// ============================================================
export default function FactoryMatchReportNewPage() {
  const router = useRouter();
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient();

  // 단계 관리 (1: 기본정보, 2: 공장 정보, 3: 발송)
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  // 기본 정보
  const [title, setTitle] = useState('');
  const [inquirySummary, setInquirySummary] = useState('');
  const [internalMemo, setInternalMemo] = useState('');

  // 바이어 선택
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // 공장 목록
  const [factories, setFactories] = useState<FactoryItem[]>([newFactory()]);
  const [activeFactoryIdx, setActiveFactoryIdx] = useState(0);

  // 발송 옵션
  const [sendEmailOpt, setSendEmailOpt] = useState(true);
  const [sendSmsOpt, setSendSmsOpt] = useState(false);
  const [sendLang, setSendLang] = useState<'ko' | 'zh'>('ko');
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // 바이어 목록 로드
  useEffect(() => {
    const loadBuyers = async () => {
      const { data } = await supabase
        .from('sellers')
        .select('id, company_name, contact_name, email, phone')
        .order('company_name');
      if (data) setBuyers(data);
    };
    loadBuyers();
  }, []);

  const filteredBuyers = buyers.filter(b =>
    b.company_name?.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    b.contact_name?.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    b.email?.toLowerCase().includes(buyerSearch.toLowerCase())
  );

  const selectBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    setBuyerEmail(buyer.email || '');
    setBuyerPhone(buyer.phone || '');
    setBuyerSearch('');
  };

  // 이미지 업로드
  const uploadPhoto = useCallback(async (file: File, path: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(data.path);
    return urlData.publicUrl;
  }, [supabase]);

  // 공장 필드 업데이트
  const updateFactory = (idx: number, field: keyof FactoryItem, value: unknown) => {
    setFactories(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  // 공장 사진 업로드
  const handlePhotoUpload = async (
    factoryIdx: number,
    photoType: 'factory_photos' | 'equipment_photos',
    photoIdx: number,
    file: File
  ) => {
    // 업로드 중 표시
    setFactories(prev => prev.map((f, fi) => {
      if (fi !== factoryIdx) return f;
      const photos = [...(f[photoType] as PhotoItem[])];
      photos[photoIdx] = { ...photos[photoIdx], uploading: true };
      return { ...f, [photoType]: photos };
    }));

    try {
      const url = await uploadPhoto(file, `factory-match/${factoryIdx}`);
      setFactories(prev => prev.map((f, fi) => {
        if (fi !== factoryIdx) return f;
        const photos = [...(f[photoType] as PhotoItem[])];
        photos[photoIdx] = { ...photos[photoIdx], url, uploading: false };
        return { ...f, [photoType]: photos };
      }));
    } catch {
      setFactories(prev => prev.map((f, fi) => {
        if (fi !== factoryIdx) return f;
        const photos = [...(f[photoType] as PhotoItem[])];
        photos[photoIdx] = { ...photos[photoIdx], uploading: false };
        return { ...f, [photoType]: photos };
      }));
      alert(t('사진 업로드 실패', '图片上传失败'));
    }
  };

  // 제품 사진 업로드
  const handleProductPhotoUpload = async (
    factoryIdx: number,
    productIdx: number,
    photoIdx: number,
    file: File
  ) => {
    setFactories(prev => prev.map((f, fi) => {
      if (fi !== factoryIdx) return f;
      const products = [...f.products];
      const photos = [...products[productIdx].photos];
      photos[photoIdx] = { ...photos[photoIdx], uploading: true };
      products[productIdx] = { ...products[productIdx], photos };
      return { ...f, products };
    }));

    try {
      const url = await uploadPhoto(file, `factory-match/${factoryIdx}/products`);
      setFactories(prev => prev.map((f, fi) => {
        if (fi !== factoryIdx) return f;
        const products = [...f.products];
        const photos = [...products[productIdx].photos];
        photos[photoIdx] = { ...photos[photoIdx], url, uploading: false };
        products[productIdx] = { ...products[productIdx], photos };
        return { ...f, products };
      }));
    } catch {
      alert(t('사진 업로드 실패', '图片上传失败'));
    }
  };

  // 임시 저장
  const handleSave = async (asDraft = true) => {
    if (!title.trim()) { alert(t('보고서 제목을 입력해주세요.', '请输入报告标题。')); return; }
    if (!selectedBuyer && !buyerEmail) { alert(t('바이어를 선택하거나 이메일을 입력해주세요.', '请选择买家或输入邮箱。')); return; }

    setSaving(true);
    try {
      const payload = {
        title,
        seller_id: selectedBuyer?.id || null,
        buyer_name: selectedBuyer?.company_name || selectedBuyer?.contact_name || '바이어',
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        inquiry_summary: inquirySummary,
        internal_memo: internalMemo,
        items: factories.map((f, idx) => ({
          sort_order: idx,
          factory_name_ko: f.factory_name_ko,
          factory_name_zh: f.factory_name_zh,
          factory_location: f.factory_location,
          factory_established_year: f.factory_established_year ? parseInt(f.factory_established_year) : null,
          factory_employees: f.factory_employees ? parseInt(f.factory_employees) : null,
          factory_area_sqm: f.factory_area_sqm ? parseInt(f.factory_area_sqm) : null,
          factory_certifications: f.factory_certifications ? f.factory_certifications.split(',').map(s => s.trim()) : [],
          production_capacity: f.production_capacity,
          lead_time_days: f.lead_time_days ? parseInt(f.lead_time_days) : null,
          min_order_qty: f.min_order_qty ? parseInt(f.min_order_qty) : null,
          development_capability: f.development_capability,
          oem_odm: f.oem_odm,
          quality_control: f.quality_control,
          defect_rate: f.defect_rate,
          factory_intro: f.factory_intro,
          is_recommended: f.is_recommended,
          recommendation_reason: f.recommendation_reason,
          factory_photos: f.factory_photos.filter(p => p.url),
          equipment_photos: f.equipment_photos.filter(p => p.url),
          products: f.products.map(p => ({
            ...p,
            photos: p.photos.filter(ph => ph.url),
          })),
        })),
      };

      const res = await fetch('/api/admin/factory-match-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const { data } = await res.json();
      setSavedReportId(data.id);

      if (!asDraft) {
        setStep(3);
      } else {
        alert(t('임시 저장되었습니다.', '已临时保存。'));
      }
    } catch (err) {
      alert(t('저장 실패: ' + String(err), '保存失败: ' + String(err)));
    } finally {
      setSaving(false);
    }
  };

  // 발송
  const handleSend = async () => {
    let reportId = savedReportId;
    if (!reportId) {
      await handleSave(false);
      reportId = savedReportId;
    }
    if (!reportId) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/factory-match-reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          send_email: sendEmailOpt,
          send_sms: sendSmsOpt,
          lang: sendLang,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSendResult({ success: true, message: t('발송이 완료되었습니다!', '发送成功！') });
      } else {
        setSendResult({ success: false, message: t('발송 실패: ' + JSON.stringify(data), '发送失败') });
      }
    } catch (err) {
      setSendResult({ success: false, message: String(err) });
    } finally {
      setSending(false);
    }
  };

  const activeFactory = factories[activeFactoryIdx];

  // ============================================================
  // 렌더링
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm">
              ← {t('뒤로', '返回')}
            </button>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="text-lg font-bold text-gray-900">
              🏭 {t('공장 매칭 보고서 작성', '工厂匹配报告')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? t('저장 중...', '保存中...') : t('💾 임시저장', '💾 临时保存')}
            </button>
            {step < 3 && (
              <button
                onClick={() => step === 1 ? setStep(2) : handleSave(false)}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {step === 1 ? t('다음: 공장 정보 →', '下一步: 工厂信息 →') : t('다음: 발송 →', '下一步: 发送 →')}
              </button>
            )}
          </div>
        </div>

        {/* 스텝 표시 */}
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: t('기본 정보', '基本信息') },
              { n: 2, label: t('공장 정보', '工厂信息') },
              { n: 3, label: t('발송', '发送') },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  step === n ? 'bg-indigo-100 text-indigo-700' :
                  step > n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span>{step > n ? '✓' : n}</span>
                  <span>{label}</span>
                </div>
                {n < 3 && <div className="w-6 h-px bg-gray-300" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ========== STEP 1: 기본 정보 ========== */}
        {step === 1 && (
          <div className="space-y-6">
            {/* 보고서 기본 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                📋 {t('보고서 기본 정보', '报告基本信息')}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('보고서 제목', '报告标题')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={t('예: 판촉용 보냉백 공장 매칭 보고서', '例：促销保冷袋工厂匹配报告')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('문의 내용 요약', '询价内容摘要')}
                  </label>
                  <textarea
                    value={inquirySummary}
                    onChange={e => setInquirySummary(e.target.value)}
                    placeholder={t('바이어의 문의 내용을 간략히 요약해주세요.', '请简要概述买家的询价内容。')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('내부 메모 (바이어에게 미표시)', '内部备注（买家不可见）')}
                  </label>
                  <textarea
                    value={internalMemo}
                    onChange={e => setInternalMemo(e.target.value)}
                    placeholder={t('내부 참고용 메모를 입력하세요.', '输入内部参考备注。')}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-yellow-400 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 바이어 선택 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                👤 {t('바이어 선택', '选择买家')} <span className="text-red-500">*</span>
              </h2>

              {selectedBuyer ? (
                <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-indigo-900">{selectedBuyer.company_name || selectedBuyer.contact_name}</p>
                    <p className="text-sm text-indigo-600">{selectedBuyer.email}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedBuyer(null); setBuyerEmail(''); setBuyerPhone(''); }}
                    className="text-sm text-indigo-500 hover:text-indigo-700"
                  >
                    {t('변경', '更改')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={buyerSearch}
                    onChange={e => setBuyerSearch(e.target.value)}
                    placeholder={t('바이어명, 회사명, 이메일로 검색...', '搜索买家名、公司名、邮箱...')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  {buyerSearch && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredBuyers.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          {t('검색 결과 없음', '无搜索结果')}
                        </div>
                      ) : filteredBuyers.map(buyer => (
                        <button
                          key={buyer.id}
                          onClick={() => selectBuyer(buyer)}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium text-gray-900 text-sm">{buyer.company_name || buyer.contact_name}</p>
                          <p className="text-xs text-gray-500">{buyer.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 이메일/전화 직접 입력 */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('이메일', '邮箱')}
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)}
                    placeholder="buyer@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('전화번호 (문자 발송용)', '电话（短信发送用）')}
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 2: 공장 정보 ========== */}
        {step === 2 && (
          <div className="space-y-4">
            {/* 공장 탭 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {factories.map((f, idx) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFactoryIdx(idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFactoryIdx === idx
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🏭 {f.factory_name_ko || t(`공장 ${idx + 1}`, `工厂 ${idx + 1}`)}
                    {f.is_recommended && <span className="text-yellow-300">⭐</span>}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setFactories(prev => [...prev, newFactory()]);
                    setActiveFactoryIdx(factories.length);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                >
                  + {t('공장 추가', '添加工厂')}
                </button>
                {factories.length > 1 && (
                  <button
                    onClick={() => {
                      setFactories(prev => prev.filter((_, i) => i !== activeFactoryIdx));
                      setActiveFactoryIdx(Math.max(0, activeFactoryIdx - 1));
                    }}
                    className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50"
                  >
                    🗑 {t('현재 공장 삭제', '删除当前工厂')}
                  </button>
                )}
              </div>
            </div>

            {/* 공장 상세 정보 */}
            {activeFactory && (
              <div className="space-y-4">
                {/* 공장 기본 정보 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">
                      🏭 {t('공장 기본 정보', '工厂基本信息')}
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFactory.is_recommended}
                        onChange={e => updateFactory(activeFactoryIdx, 'is_recommended', e.target.checked)}
                        className="w-4 h-4 text-yellow-500 rounded"
                      />
                      <span className="text-sm font-medium text-yellow-600">⭐ {t('추천 공장', '推荐工厂')}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('공장명 (한국어)', '工厂名（韩文）')} *</label>
                      <input type="text" value={activeFactory.factory_name_ko}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_name_ko', e.target.value)}
                        placeholder={t('예: 광저우 우수 제조 공장', '例：广州优秀制造工厂')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('공장명 (중국어)', '工厂名（中文）')}</label>
                      <input type="text" value={activeFactory.factory_name_zh}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_name_zh', e.target.value)}
                        placeholder="例：广州优秀制造工厂"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('위치', '位置')}</label>
                      <input type="text" value={activeFactory.factory_location}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_location', e.target.value)}
                        placeholder={t('예: 광저우, 이우, 닝보', '例：广州、义乌、宁波')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('설립연도', '成立年份')}</label>
                      <input type="number" value={activeFactory.factory_established_year}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_established_year', e.target.value)}
                        placeholder="2010"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('직원 수', '员工人数')}</label>
                      <input type="number" value={activeFactory.factory_employees}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_employees', e.target.value)}
                        placeholder="200"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('공장 면적 (㎡)', '工厂面积 (㎡)')}</label>
                      <input type="number" value={activeFactory.factory_area_sqm}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_area_sqm', e.target.value)}
                        placeholder="5000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('인증 (쉼표로 구분)', '认证（逗号分隔）')}</label>
                      <input type="text" value={activeFactory.factory_certifications}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_certifications', e.target.value)}
                        placeholder="ISO9001, BSCI, SGS"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>

                  {activeFactory.is_recommended && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-yellow-600 mb-1">⭐ {t('추천 이유', '推荐理由')}</label>
                      <textarea value={activeFactory.recommendation_reason}
                        onChange={e => updateFactory(activeFactoryIdx, 'recommendation_reason', e.target.value)}
                        placeholder={t('이 공장을 추천하는 이유를 입력하세요.', '请输入推荐此工厂的原因。')}
                        rows={2}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-sm resize-none focus:ring-2 focus:ring-yellow-400" />
                    </div>
                  )}
                </div>

                {/* 생산·개발 능력 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">⚙️ {t('생산·개발 능력', '生产·研发能力')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('생산 능력', '生产能力')}</label>
                      <input type="text" value={activeFactory.production_capacity}
                        onChange={e => updateFactory(activeFactoryIdx, 'production_capacity', e.target.value)}
                        placeholder={t('예: 월 50만개', '例：月产50万件')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('리드타임 (일)', '交货期（天）')}</label>
                      <input type="number" value={activeFactory.lead_time_days}
                        onChange={e => updateFactory(activeFactoryIdx, 'lead_time_days', e.target.value)}
                        placeholder="25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">MOQ</label>
                      <input type="number" value={activeFactory.min_order_qty}
                        onChange={e => updateFactory(activeFactoryIdx, 'min_order_qty', e.target.value)}
                        placeholder="1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('불량률', '不良率')}</label>
                      <input type="text" value={activeFactory.defect_rate}
                        onChange={e => updateFactory(activeFactoryIdx, 'defect_rate', e.target.value)}
                        placeholder="0.5%"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('개발 능력', '研发能力')}</label>
                      <textarea value={activeFactory.development_capability}
                        onChange={e => updateFactory(activeFactoryIdx, 'development_capability', e.target.value)}
                        placeholder={t('OEM/ODM 개발 경험, 디자인 팀 보유 여부 등', 'OEM/ODM开发经验、设计团队等')}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('품질 관리', '质量管理')}</label>
                      <textarea value={activeFactory.quality_control}
                        onChange={e => updateFactory(activeFactoryIdx, 'quality_control', e.target.value)}
                        placeholder={t('품질 검사 방법, 검사 장비, QC 체계 등', '质量检验方法、检验设备、QC体系等')}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('공장 소개 (자유 작성)', '工厂介绍（自由填写）')}</label>
                      <textarea value={activeFactory.factory_intro}
                        onChange={e => updateFactory(activeFactoryIdx, 'factory_intro', e.target.value)}
                        placeholder={t('공장의 강점, 주요 거래처, 특이사항 등을 자유롭게 작성하세요.', '请自由填写工厂优势、主要客户、特点等。')}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>

                {/* 공장 사진 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">📷 {t('공장 사진', '工厂照片')}</h3>
                  <PhotoUploadGrid
                    photos={activeFactory.factory_photos}
                    onPhotoTitleChange={(idx, title) => {
                      const photos = [...activeFactory.factory_photos];
                      photos[idx] = { ...photos[idx], title };
                      updateFactory(activeFactoryIdx, 'factory_photos', photos);
                    }}
                    onPhotoUpload={(idx, file) => handlePhotoUpload(activeFactoryIdx, 'factory_photos', idx, file)}
                    onAddPhoto={() => updateFactory(activeFactoryIdx, 'factory_photos', [...activeFactory.factory_photos, newPhoto()])}
                    onRemovePhoto={(idx) => updateFactory(activeFactoryIdx, 'factory_photos', activeFactory.factory_photos.filter((_, i) => i !== idx))}
                    t={t}
                  />
                </div>

                {/* 설비 사진 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">🔧 {t('설비 사진', '设备照片')}</h3>
                  <PhotoUploadGrid
                    photos={activeFactory.equipment_photos}
                    onPhotoTitleChange={(idx, title) => {
                      const photos = [...activeFactory.equipment_photos];
                      photos[idx] = { ...photos[idx], title };
                      updateFactory(activeFactoryIdx, 'equipment_photos', photos);
                    }}
                    onPhotoUpload={(idx, file) => handlePhotoUpload(activeFactoryIdx, 'equipment_photos', idx, file)}
                    onAddPhoto={() => updateFactory(activeFactoryIdx, 'equipment_photos', [...activeFactory.equipment_photos, newPhoto()])}
                    onRemovePhoto={(idx) => updateFactory(activeFactoryIdx, 'equipment_photos', activeFactory.equipment_photos.filter((_, i) => i !== idx))}
                    t={t}
                  />
                </div>

                {/* 제품 목록 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">📦 {t('제품 목록', '产品列表')}</h3>
                    <button
                      onClick={() => updateFactory(activeFactoryIdx, 'products', [...activeFactory.products, newProduct()])}
                      className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium"
                    >
                      + {t('제품 추가', '添加产品')}
                    </button>
                  </div>

                  <div className="space-y-6">
                    {activeFactory.products.map((product, pIdx) => (
                      <div key={product.id} className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-800 text-sm">
                            {t(`제품 ${pIdx + 1}`, `产品 ${pIdx + 1}`)}
                            {product.name_ko && ` — ${product.name_ko}`}
                          </h4>
                          {activeFactory.products.length > 1 && (
                            <button
                              onClick={() => updateFactory(activeFactoryIdx, 'products', activeFactory.products.filter((_, i) => i !== pIdx))}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              🗑 {t('삭제', '删除')}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('제품명 (한국어)', '产品名（韩文）')}</label>
                            <input type="text" value={product.name_ko}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], name_ko: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('제품명 (중국어)', '产品名（中文）')}</label>
                            <input type="text" value={product.name_zh}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], name_zh: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('가격 (¥)', '价格 (¥)')}</label>
                            <input type="text" value={product.price}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], price: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              placeholder="¥12.5"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">MOQ</label>
                            <input type="text" value={product.moq}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], moq: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              placeholder="1000"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('리드타임 (일)', '交货期（天）')}</label>
                            <input type="text" value={product.lead_time}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], lead_time: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              placeholder="25"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('중량', '重量')}</label>
                            <input type="text" value={product.weight}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], weight: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              placeholder="200g"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('사이즈', '尺寸')}</label>
                            <input type="text" value={product.size}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], size: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              placeholder="20x15x10cm"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('포장·옵션', '包装·选项')}</label>
                            <input type="text" value={product.options}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], options: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              placeholder={t('예: 색상 5종, OPP포장/선물박스 선택', '例：5色可选，OPP袋/礼盒可选')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('메모', '备注')}</label>
                            <textarea value={product.memo}
                              onChange={e => {
                                const products = [...activeFactory.products];
                                products[pIdx] = { ...products[pIdx], memo: e.target.value };
                                updateFactory(activeFactoryIdx, 'products', products);
                              }}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                        </div>

                        {/* 제품 사진 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">📸 {t('제품 사진', '产品照片')}</label>
                          <PhotoUploadGrid
                            photos={product.photos}
                            onPhotoTitleChange={(idx, title) => {
                              const products = [...activeFactory.products];
                              const photos = [...products[pIdx].photos];
                              photos[idx] = { ...photos[idx], title };
                              products[pIdx] = { ...products[pIdx], photos };
                              updateFactory(activeFactoryIdx, 'products', products);
                            }}
                            onPhotoUpload={(idx, file) => handleProductPhotoUpload(activeFactoryIdx, pIdx, idx, file)}
                            onAddPhoto={() => {
                              const products = [...activeFactory.products];
                              products[pIdx] = { ...products[pIdx], photos: [...products[pIdx].photos, newPhoto()] };
                              updateFactory(activeFactoryIdx, 'products', products);
                            }}
                            onRemovePhoto={(idx) => {
                              const products = [...activeFactory.products];
                              products[pIdx] = { ...products[pIdx], photos: products[pIdx].photos.filter((_, i) => i !== idx) };
                              updateFactory(activeFactoryIdx, 'products', products);
                            }}
                            t={t}
                            compact
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== STEP 3: 발송 ========== */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-6">
            {sendResult ? (
              <div className={`rounded-xl p-8 text-center ${sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="text-5xl mb-4">{sendResult.success ? '✅' : '❌'}</div>
                <h2 className={`text-xl font-bold mb-2 ${sendResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {sendResult.message}
                </h2>
                {sendResult.success && (
                  <p className="text-sm text-green-600 mb-6">
                    {t('바이어 대시보드에서 보고서를 확인할 수 있습니다.', '买家可在控制台查看报告。')}
                  </p>
                )}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => router.push('/admin/factory-match-reports')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    {t('보고서 목록으로', '返回报告列表')}
                  </button>
                  <button
                    onClick={() => { setSendResult(null); setStep(1); setFactories([newFactory()]); setTitle(''); setSelectedBuyer(null); setSavedReportId(null); }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    {t('새 보고서 작성', '新建报告')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 요약 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-bold text-gray-900 mb-4">📋 {t('발송 전 확인', '发送前确认')}</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">{t('보고서 제목', '报告标题')}</span>
                      <span className="text-sm font-medium text-gray-900">{title}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">{t('수신 바이어', '接收买家')}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedBuyer?.company_name || selectedBuyer?.contact_name || t('직접 입력', '手动输入')}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">{t('이메일', '邮箱')}</span>
                      <span className="text-sm font-medium text-gray-900">{buyerEmail || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">{t('전화번호', '电话')}</span>
                      <span className="text-sm font-medium text-gray-900">{buyerPhone || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-500">{t('매칭 공장 수', '匹配工厂数')}</span>
                      <span className="text-sm font-bold text-indigo-600">{factories.length}{t('개', '家')}</span>
                    </div>
                  </div>
                </div>

                {/* 발송 옵션 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-bold text-gray-900 mb-4">📤 {t('발송 방법 선택', '选择发送方式')}</h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={sendEmailOpt} onChange={e => setSendEmailOpt(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded" />
                      <div>
                        <p className="font-medium text-gray-900">📧 {t('이메일 발송', '发送邮件')}</p>
                        <p className="text-xs text-gray-500">{buyerEmail || t('이메일 없음', '无邮箱')}</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={sendSmsOpt} onChange={e => setSendSmsOpt(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded" />
                      <div>
                        <p className="font-medium text-gray-900">📱 {t('문자 발송 (SMS)', '发送短信 (SMS)')}</p>
                        <p className="text-xs text-gray-500">{buyerPhone || t('전화번호 없음', '无电话号码')}</p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('발송 언어', '发送语言')}</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" value="ko" checked={sendLang === 'ko'} onChange={() => setSendLang('ko')}
                          className="text-indigo-600" />
                        <span className="text-sm">🇰🇷 {t('한국어', '韩文')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" value="zh" checked={sendLang === 'zh'} onChange={() => setSendLang('zh')}
                          className="text-indigo-600" />
                        <span className="text-sm">🇨🇳 {t('중국어', '中文')}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 발송 버튼 */}
                <button
                  onClick={handleSend}
                  disabled={sending || (!sendEmailOpt && !sendSmsOpt)}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-base font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {sending
                    ? t('발송 중...', '发送中...')
                    : t('🚀 바이어에게 보고서 발송', '🚀 向买家发送报告')}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  {t('발송 후 바이어 대시보드에서 "매칭된 공장 보고서를 확인하실 수 있습니다" 메시지가 표시됩니다.', '发送后，买家控制台将显示"可查看匹配工厂报告"提示。')}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 사진 업로드 그리드 컴포넌트
// ============================================================
interface PhotoUploadGridProps {
  photos: PhotoItem[];
  onPhotoTitleChange: (idx: number, title: string) => void;
  onPhotoUpload: (idx: number, file: File) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (idx: number) => void;
  t: (ko: string, zh: string) => string;
  compact?: boolean;
}

function PhotoUploadGrid({ photos, onPhotoTitleChange, onPhotoUpload, onAddPhoto, onRemovePhoto, t, compact }: PhotoUploadGridProps) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
      {photos.map((photo, idx) => (
        <div key={photo.id} className="relative group">
          <div className={`${compact ? 'h-24' : 'h-32'} border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 relative`}>
            {photo.url ? (
              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
            ) : (
              <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-gray-100 transition-colors">
                <span className="text-2xl">{photo.uploading ? '⏳' : '📷'}</span>
                <span className="text-xs text-gray-400 mt-1">{photo.uploading ? t('업로드 중...', '上传中...') : t('사진 추가', '添加照片')}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && onPhotoUpload(idx, e.target.files[0])} />
              </label>
            )}
            {photo.url && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-white text-xs font-medium">🔄 {t('변경', '更换')}</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && onPhotoUpload(idx, e.target.files[0])} />
              </label>
            )}
          </div>
          <input
            type="text"
            value={photo.title}
            onChange={e => onPhotoTitleChange(idx, e.target.value)}
            placeholder={t('사진 제목', '照片标题')}
            className="w-full mt-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400"
          />
          {photos.length > 1 && (
            <button
              onClick={() => onRemovePhoto(idx)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAddPhoto}
        className={`${compact ? 'h-24' : 'h-32'} border-2 border-dashed border-indigo-200 rounded-lg flex flex-col items-center justify-center text-indigo-400 hover:bg-indigo-50 transition-colors`}
      >
        <span className="text-xl">+</span>
        <span className="text-xs mt-1">{t('추가', '添加')}</span>
      </button>
    </div>
  );
}
