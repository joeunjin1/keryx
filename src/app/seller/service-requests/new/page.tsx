'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const SERVICE_TYPES = [
  { id: 'sample-development', ko: '샘플 개발', zh: '样品开发', icon: '📦', desc_ko: '신제품 샘플 제작을 요청합니다', desc_zh: '申请新产品样品制作' },
  { id: 'factory-matching', ko: '공장 매칭', zh: '工厂匹配', icon: '🏭', desc_ko: '적합한 공장을 찾아드립니다', desc_zh: '为您寻找合适的工厂' },
  { id: 'market-research', ko: '시장 조사', zh: '市场调研', icon: '🔍', desc_ko: '시장 트렌드와 경쟁사를 분석합니다', desc_zh: '分析市场趋势和竞争对手' },
  { id: 'order-request', ko: '주문 요청', zh: '订单申请', icon: '🛒', desc_ko: '제품 주문을 요청합니다 (MD가 발주 처리)', desc_zh: '申请产品订单（由MD处理发单）' },
];

function NewServiceRequestPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const typeParam = params.get('type');
  const supabase = createClient() as any;

  const [selectedType, setSelectedType] = useState(
    typeParam === 'order' ? 'order-request' : (typeParam || '')
  );
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [moq, setMoq] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [wechatId, setWechatId] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seller, setSeller] = useState<any>(null);
  const { lang } = useLangContext();

  useEffect(() => {
    document.title = '서비스 신청 | KERYX';
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=seller'); return; }
      const { data: s } = await supabase.from('sellers').select('id, business_name, contact_name, phone, wechat_id, assigned_md_id').eq('user_id', user.id).single();
      if (s) {
        setSeller(s);
        setContactName(s.contact_name ?? '');
        setPhone(s.phone ?? '');
        setWechatId(s.wechat_id ?? '');
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !productName.trim()) {
      setError(lang === 'ko' ? '서비스 유형과 제품명을 입력해주세요.' : '请填写服务类型和产品名称。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다');

      const serviceType = selectedType === 'order-request' ? 'sample-development' : selectedType;
      const reqNo = `SR-${Date.now().toString().slice(-8)}`;

      const { error: insertError } = await supabase.from('service_requests').insert({
        request_no: reqNo,
        user_id: user.id,
        seller_id: seller?.id ?? null,
        service_type: serviceType,
        product_name: productName,
        product_desc: productDesc,
        moq: moq || null,
        target_price: targetPrice || null,
        contact_name: contactName,
        phone: phone,
        wechat_id: wechatId || null,
        is_urgent: isUrgent,
        status: 'pending',
        assigned_md_id: seller?.assigned_md_id ?? null,
        md_request_note: selectedType === 'order-request' ? `[주문 요청] ${productDesc}` : null,
      });

      if (insertError) throw insertError;
      router.push('/seller/service-requests?submitted=1');
    } catch (err: any) {
      setError(err.message || (lang === 'ko' ? '오류가 발생했습니다.' : '发生错误。'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/seller/service-requests" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] no-underline">
          ← <LangText ko="목록으로" zh="返回列表" />
        </Link>
      </div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
        <LangText ko="서비스 신청" zh="申请服务" />
      </h1>
      <p className="text-xs text-[var(--text-tertiary)] mb-5">
        <LangText ko="담당 MD가 확인 후 신속하게 처리해 드립니다." zh="专属MD确认后将尽快为您处理。" />
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 서비스 유형 선택 */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            <LangText ko="서비스 유형 *" zh="服务类型 *" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_TYPES.map(t => (
              <button key={t.id} type="button"
                onClick={() => setSelectedType(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${selectedType === t.id ? 'border-purple-500 bg-purple-50' : 'border-[var(--border-light)] bg-[var(--bg-base)] hover:border-gray-300'}`}>
                <div className="text-xl mb-1">{t.icon}</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  <LangText ko={t.ko} zh={t.zh} />
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  <LangText ko={t.desc_ko} zh={t.desc_zh} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 제품명 */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            <LangText ko="제품명 *" zh="产品名称 *" />
          </label>
          <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
            placeholder={lang === 'ko' ? '예: 뽑기용 미니 피규어' : '例：扭蛋用迷你手办'} required />
        </div>

        {/* 제품 설명 */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            <LangText ko="상세 내용" zh="详细说明" />
          </label>
          <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400 resize-none"
            placeholder={lang === 'ko' ? '사이즈, 재질, 수량, 특이사항 등을 입력해주세요' : '请输入尺寸、材质、数量、特殊要求等'} />
        </div>

        {/* MOQ / 목표 단가 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              <LangText ko="MOQ (최소 주문량)" zh="MOQ（最小起订量）" />
            </label>
            <input type="text" value={moq} onChange={e => setMoq(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
              placeholder="예: 500개" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              <LangText ko="목표 단가 (CNY)" zh="目标单价（元）" />
            </label>
            <input type="text" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
              placeholder="예: 3.5" />
          </div>
        </div>

        {/* 담당자 정보 */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            <LangText ko="담당자명 *" zh="联系人姓名 *" />
          </label>
          <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
            required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              <LangText ko="연락처" zh="联系电话" />
            </label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
              <LangText ko="위챗 ID" zh="微信号" />
            </label>
            <input type="text" value={wechatId} onChange={e => setWechatId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-400" />
          </div>
        </div>

        {/* 긴급 여부 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-purple-600" />
          <span className="text-sm text-[var(--text-primary)]">
            <LangText ko="🚨 긴급 처리 요청" zh="🚨 申请加急处理" />
          </span>
        </label>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#7c3aed' }}>
          {submitting
            ? <LangText ko="제출 중..." zh="提交中..." />
            : <LangText ko="서비스 신청하기" zh="提交申请" />
          }
        </button>
      </form>
    </div>
  );
}

export default function NewServiceRequestPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">로딩 중...</div>}>
      <NewServiceRequestPageInner />
    </Suspense>
  );
}
