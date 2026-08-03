'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LangText from '@/components/layout/LangText';

type Request = Record<string, any>;

export default function FactoryUnifiedRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const router = useRouter();
  const [req, setReq] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [response, setResponse] = useState({
    price_quote: '',
    lead_time: '',
    moq: '',
    quality_notes: '',
    can_do: true,
    factory_note: '',
  });

  useEffect(() => {
    if (!requestId) return;
    fetch(`/api/unified-request?id=${requestId}`)
      .then(r => r.json())
      .then(d => {
        setReq(d.data);
        // 기존 공장 답변 불러오기
        if (d.data?.factory_response) {
          try { setResponse({ ...response, ...JSON.parse(d.data.factory_response) }); } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [requestId]);

  const submitResponse = async () => {
    if (!req) return;
    setSaving(true);
    await fetch('/api/unified-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: req.id,
        factory_response: JSON.stringify(response),
        status: 'in_progress',
      }),
    });
    setReq({ ...req, status: 'in_progress', factory_response: JSON.stringify(response) });
    setSaving(false);
    alert('답변이 제출되었습니다. MD에게 전달됩니다.');
  };

  if (loading) return <div className="p-6 text-center text-gray-400 text-sm"><LangText ko="불러오는 중..." zh="加载中..." /></div>;
  if (!req) return <div className="p-6 text-center text-gray-400 text-sm"><LangText ko="의뢰를 찾을 수 없습니다." zh="找不到委托。" /></div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <div>
          <h1 className="text-lg font-black text-gray-900">
            <LangText ko="의뢰 상세 / 답변 제출" zh="委托详情 / 提交答复" />
          </h1>
          <p className="text-xs text-gray-400 font-mono">{req.request_no}</p>
        </div>
      </div>

      {/* 의뢰 내용 */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-black text-gray-700 mb-3">📋 <LangText ko="의뢰 내용" zh="委托内容" /></h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { ko: '제품 카테고리', zh: '产品类别', val: req.product_category },
            { ko: '서비스 유형', zh: '服务类型', val: req.service_type },
            { ko: '목표 수량', zh: '目标数量', val: req.target_quantity ? `${Number(req.target_quantity).toLocaleString()}개` : '-' },
            { ko: '목표 단가', zh: '目标单价', val: req.target_unit_price ? `${req.target_unit_price} ${req.currency || 'KRW'}` : '-' },
            { ko: '납기 요구', zh: '交期要求', val: req.deadline_requirement },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-gray-400"><LangText ko={item.ko} zh={item.zh} /></p>
              <p className="font-semibold text-gray-800">{item.val || '-'}</p>
            </div>
          ))}
        </div>
        {req.detailed_requirements && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-1"><LangText ko="상세 요구사항" zh="详细需求" /></p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{req.detailed_requirements}</p>
          </div>
        )}
      </div>

      {/* 공장 답변 폼 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-black text-gray-800 mb-3">✍️ <LangText ko="공장 답변 작성" zh="填写工厂答复" /></h3>

        {/* 수행 가능 여부 */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-600 mb-2">
            <LangText ko="이 의뢰를 수행할 수 있습니까?" zh="能否承接此委托？" />
          </label>
          <div className="flex gap-3">
            {[
              { val: true, ko: '가능', zh: '可以' },
              { val: false, ko: '불가능', zh: '不可以' },
            ].map(opt => (
              <button key={String(opt.val)} onClick={() => setResponse({ ...response, can_do: opt.val })}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all
                  ${response.can_do === opt.val
                    ? opt.val ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-500 border-gray-300'}`}>
                <LangText ko={opt.ko} zh={opt.zh} />
              </button>
            ))}
          </div>
        </div>

        {response.can_do && (
          <div className="space-y-3">
            {[
              { key: 'price_quote', ko: '견적가 (CNY/개)', zh: '报价 (CNY/个)', placeholder: '예: 15.5 CNY' },
              { key: 'lead_time', ko: '납기 (Lead Time)', zh: '交货期', placeholder: '예: 30일 (샘플 7일)' },
              { key: 'moq', ko: 'MOQ (최소 주문 수량)', zh: 'MOQ (最低订购量)', placeholder: '예: 500개' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  <LangText ko={field.ko} zh={field.zh} />
                </label>
                <input type="text" value={response[field.key as keyof typeof response] as string}
                  onChange={e => setResponse({ ...response, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                <LangText ko="품질 및 생산 능력 설명" zh="质量及生产能力说明" />
              </label>
              <textarea value={response.quality_notes}
                onChange={e => setResponse({ ...response, quality_notes: e.target.value })}
                placeholder="제품 생산 경험, 품질 관리 방식, 인증 보유 여부..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none h-20 focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        )}

        <div className="mt-3">
          <label className="block text-xs font-bold text-gray-600 mb-1">
            <LangText ko="추가 메모 (MD에게 전달)" zh="附加备注（传达给MD）" />
          </label>
          <textarea value={response.factory_note}
            onChange={e => setResponse({ ...response, factory_note: e.target.value })}
            placeholder="MD에게 전달할 추가 사항..."
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none h-16 focus:outline-none focus:border-orange-500" />
        </div>

        <button onClick={submitResponse} disabled={saving}
          className="w-full mt-4 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
          {saving ? <LangText ko="제출 중..." zh="提交中..." /> : <LangText ko="MD에게 답변 제출" zh="向MD提交答复" />}
        </button>

        {req.status === 'in_progress' && (
          <p className="text-xs text-green-600 text-center mt-2 font-bold">
            ✅ <LangText ko="이미 답변이 제출되었습니다." zh="已提交答复。" />
          </p>
        )}
      </div>
    </div>
  );
}
