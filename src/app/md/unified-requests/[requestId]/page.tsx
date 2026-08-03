'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const STATUS_KO: Record<string, string> = {
  submitted: '접수됨', reviewing: '검토 중', md_assigned: 'MD 배정',
  factory_contacted: '공장 연락 중', in_progress: '진행 중',
  report_ready: '보고서 완료', completed: '완료', cancelled: '취소됨',
};
const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700', reviewing: 'bg-yellow-100 text-yellow-700',
  md_assigned: 'bg-indigo-100 text-indigo-700', factory_contacted: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-green-100 text-green-700', report_ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700',
};

const WORKFLOW_STEPS = [
  { key: 'submitted', ko: '의뢰 접수', zh: '委托接收' },
  { key: 'reviewing', ko: 'MD 검토', zh: 'MD审核' },
  { key: 'factory_contacted', ko: '공장 연락', zh: '联系工厂' },
  { key: 'in_progress', ko: '진행 중', zh: '进行中' },
  { key: 'report_ready', ko: '보고서 완료', zh: '报告完成' },
  { key: 'completed', ko: '바이어 전달', zh: '传达买家' },
];

const STEP_ORDER = ['submitted', 'reviewing', 'factory_contacted', 'in_progress', 'report_ready', 'completed'];

type Request = Record<string, any>;

export default function MdUnifiedRequestDetailPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const { requestId } = useParams<{ requestId: string }>();
  const router = useRouter();
  const [req, setReq] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'factory' | 'report' | 'deliver'>('overview');
  const [saving, setSaving] = useState(false);

  // 보고서 작성 상태
  const [reportData, setReportData] = useState({
    summary: '',
    factory_name: '',
    factory_contact: '',
    factory_evaluation: '',
    price_quote: '',
    lead_time: '',
    moq: '',
    quality_notes: '',
    risk_notes: '',
    recommendation: '',
    next_steps: '',
    md_note: '',
  });

  // 상태 변경 상태
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (!requestId) return;
    fetch(`/api/unified-request?id=${requestId}`)
      .then(r => r.json())
      .then(d => {
        setReq(d.data);
        setNewStatus(d.data?.status || 'submitted');
        // 기존 보고서 데이터가 있으면 불러오기
        if (d.data?.md_report) {
          try { setReportData({ ...reportData, ...JSON.parse(d.data.md_report) }); } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [requestId]);

  const updateStatus = async () => {
    if (!req || !newStatus) return;
    setSaving(true);
    await fetch('/api/unified-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: req.id, status: newStatus, md_note: statusNote }),
    });
    setReq({ ...req, status: newStatus, md_note: statusNote });
    setSaving(false);
    alert('상태가 업데이트되었습니다.');
  };

  const saveReport = async () => {
    if (!req) return;
    setSaving(true);
    await fetch('/api/unified-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: req.id,
        md_report: JSON.stringify(reportData),
        status: 'report_ready',
      }),
    });
    setReq({ ...req, status: 'report_ready', md_report: JSON.stringify(reportData) });
    setSaving(false);
    alert('보고서가 저장되었습니다. 상태가 "보고서 완료"로 변경되었습니다.');
  };

  const deliverToSeller = async () => {
    if (!req) return;
    if (!confirm('바이어에게 보고서를 전달하시겠습니까? 상태가 "완료"로 변경됩니다.')) return;
    setSaving(true);
    await fetch('/api/unified-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: req.id, status: 'completed', delivered_at: new Date().toISOString() }),
    });
    setReq({ ...req, status: 'completed' });
    setSaving(false);
    alert('바이어에게 보고서가 전달되었습니다.');
  };

  if (loading) return <div className="p-6 text-center text-gray-400 text-sm">불러오는 중...</div>;
  if (!req) return <div className="p-6 text-center text-gray-400 text-sm">의뢰를 찾을 수 없습니다.</div>;

  const currentStepIdx = STEP_ORDER.indexOf(req.status);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-gray-900">{req.company_name || '(회사명 없음)'}</h1>
          <p className="text-xs text-gray-400 font-mono">{req.request_no}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[req.status] || 'bg-gray-100 text-gray-600'}`}>
          {STATUS_KO[req.status] || req.status}
        </span>
      </div>

      {/* 워크플로우 진행 표시 */}
      <div className="bg-gray-50 rounded-2xl p-3 mb-4">
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, i) => {
            const stepIdx = STEP_ORDER.indexOf(step.key);
            const isDone = stepIdx < currentStepIdx;
            const isCurrent = stepIdx === currentStepIdx;
            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1
                  ${isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <p className={`text-[9px] text-center leading-tight ${isCurrent ? 'text-orange-600 font-bold' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                  <LangText ko={step.ko} zh={step.zh} />
                </p>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className={`absolute h-0.5 w-full ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} style={{ display: 'none' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'overview', ko: '의뢰 내용', zh: '委托内容' },
          { key: 'factory', ko: '공장 연락', zh: '联系工厂' },
          { key: 'report', ko: '보고서 작성', zh: '撰写报告' },
          { key: 'deliver', ko: '전달', zh: '传达' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all
              ${activeTab === tab.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}>
            <LangText ko={tab.ko} zh={tab.zh} />
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-black text-gray-800 mb-3">📋 <LangText ko="의뢰 기본 정보" zh="委托基本信息" /></h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { ko: '담당자', zh: '负责人', val: req.contact_name },
                { ko: '연락처', zh: '联系方式', val: req.contact_phone },
                { ko: '이메일', zh: '邮箱', val: req.contact_email },
                { ko: '서비스 유형', zh: '服务类型', val: req.service_type },
                { ko: '제품 카테고리', zh: '产品类别', val: req.product_category },
                { ko: '목표 수량', zh: '目标数量', val: req.target_quantity ? `${Number(req.target_quantity).toLocaleString()}개` : '-' },
                { ko: '목표 단가', zh: '目标单价', val: req.target_unit_price ? `${req.target_unit_price} ${req.currency || 'KRW'}` : '-' },
                { ko: '납기 요구', zh: '交期要求', val: req.deadline_requirement },
                { ko: '긴급도', zh: '紧急程度', val: req.urgency },
                { ko: '제출일', zh: '提交日期', val: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : '-' },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-gray-400"><LangText ko={item.ko} zh={item.zh} /></p>
                  <p className="font-semibold text-gray-800">{item.val || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 상세 요구사항 */}
          {req.detailed_requirements && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="text-sm font-black text-gray-800 mb-2">📝 <LangText ko="상세 요구사항" zh="详细需求" /></h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{req.detailed_requirements}</p>
            </div>
          )}

          {/* 품목 목록 */}
          {req.unified_request_items?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="text-sm font-black text-gray-800 mb-3">📦 <LangText ko="품목 목록" zh="品目列表" /></h3>
              <div className="space-y-2">
                {req.unified_request_items.map((item: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs">
                    <p className="font-bold text-gray-800">{item.product_name}</p>
                    <div className="flex gap-3 mt-1 text-gray-500">
                      {item.category && <span>{item.category}</span>}
                      {item.quantity && <span>{Number(item.quantity).toLocaleString()}개</span>}
                      {item.target_price && <span>목표가: {item.target_price}</span>}
                    </div>
                    {item.notes && <p className="mt-1 text-gray-600">{item.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 상태 변경 */}
          <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
            <h3 className="text-sm font-black text-orange-800 mb-3">🔄 <LangText ko="상태 업데이트" zh="状态更新" /></h3>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-orange-300 rounded-xl text-sm bg-white mb-2 focus:outline-none">
              {Object.entries(STATUS_KO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)}
              placeholder="상태 변경 메모 (바이어에게 표시됩니다)..."
              className="w-full px-3 py-2 border border-orange-300 rounded-xl text-sm resize-none h-16 focus:outline-none mb-2" />
            <button onClick={updateStatus} disabled={saving}
              className="w-full py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? '저장 중...' : '상태 업데이트'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'factory' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-black text-gray-800 mb-3">🏭 <LangText ko="공장 연락 정보 입력" zh="填写工厂联系信息" /></h3>
            <p className="text-xs text-gray-500 mb-3">
              <LangText ko="바이어 의뢰를 검토하고 적합한 공장에 연락한 내용을 기록하세요." zh="审核买家委托，记录联系合适工厂的内容。" />
            </p>
            <div className="space-y-3">
              {[
                { key: 'factory_name', ko: '연락한 공장명', zh: '联系工厂名称', placeholder: '예: 광저우 XX 공장' },
                { key: 'factory_contact', ko: '공장 담당자 / 위챗', zh: '工厂负责人/微信', placeholder: '담당자명 및 연락처' },
                { key: 'price_quote', ko: '공장 견적가 (CNY)', zh: '工厂报价 (CNY)', placeholder: '예: 15.5 CNY/개' },
                { key: 'lead_time', ko: '납기 (Lead Time)', zh: '交货期', placeholder: '예: 30일 (샘플 7일)' },
                { key: 'moq', ko: 'MOQ (최소 주문 수량)', zh: 'MOQ (最低订购量)', placeholder: '예: 500개' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    <LangText ko={field.ko} zh={field.zh} />
                  </label>
                  <input type="text" value={reportData[field.key as keyof typeof reportData]}
                    onChange={e => setReportData({ ...reportData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  <LangText ko="공장 품질 평가 메모" zh="工厂质量评估备注" />
                </label>
                <textarea value={reportData.factory_evaluation}
                  onChange={e => setReportData({ ...reportData, factory_evaluation: e.target.value })}
                  placeholder="공장 방문 또는 샘플 검토 결과..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none h-20 focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <button onClick={() => {
              fetch('/api/unified-request', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: req.id, status: 'factory_contacted', md_report: JSON.stringify(reportData) }),
              }).then(() => { setReq({ ...req, status: 'factory_contacted' }); alert('공장 연락 정보가 저장되었습니다.'); });
            }}
              className="w-full mt-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold">
              <LangText ko="공장 연락 정보 저장" zh="保存工厂联系信息" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-black text-gray-800 mb-3">📊 <LangText ko="바이어 보고서 작성" zh="撰写买家报告" /></h3>
            <p className="text-xs text-gray-500 mb-3">
              <LangText ko="아래 내용을 작성하면 바이어에게 전달되는 공식 보고서가 생성됩니다." zh="填写以下内容后，将生成传达给买家的正式报告。" />
            </p>
            <div className="space-y-3">
              {[
                { key: 'summary', ko: '요약 (핵심 결론)', zh: '摘要（核心结论）', placeholder: '이 의뢰에 대한 핵심 결론을 2~3문장으로 요약하세요.', multiline: true },
                { key: 'quality_notes', ko: '품질 평가', zh: '质量评估', placeholder: '제품 품질, 소재, 마감 수준에 대한 평가...', multiline: true },
                { key: 'risk_notes', ko: '리스크 및 주의사항', zh: '风险及注意事项', placeholder: '납기 지연 가능성, 품질 편차, IP 관련 주의사항...', multiline: true },
                { key: 'recommendation', ko: 'MD 추천 의견', zh: 'MD推荐意见', placeholder: '이 공장과 진행을 추천하는지, 이유는 무엇인지...', multiline: true },
                { key: 'next_steps', ko: '다음 단계 안내', zh: '下一步指引', placeholder: '바이어가 다음에 해야 할 행동을 구체적으로 안내하세요...', multiline: true },
                { key: 'md_note', ko: 'MD 내부 메모 (바이어 비공개)', zh: 'MD内部备注（买家不可见）', placeholder: '내부 참고용 메모...', multiline: true },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    <LangText ko={field.ko} zh={field.zh} />
                    {field.key === 'md_note' && <span className="ml-1 text-red-400 text-[10px]">(비공개)</span>}
                  </label>
                  <textarea value={reportData[field.key as keyof typeof reportData]}
                    onChange={e => setReportData({ ...reportData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none h-20 focus:outline-none focus:border-orange-500" />
                </div>
              ))}
            </div>
            <button onClick={saveReport} disabled={saving}
              className="w-full mt-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? '저장 중...' : <LangText ko="보고서 저장 (상태: 보고서 완료)" zh="保存报告（状态：报告完成）" />}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'deliver' && (
        <div className="space-y-3">
          {/* 보고서 미리보기 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-black text-gray-800 mb-3">👁️ <LangText ko="바이어 전달 보고서 미리보기" zh="买家传达报告预览" /></h3>
            {!reportData.summary ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                <LangText ko="보고서 작성 탭에서 내용을 먼저 작성해 주세요." zh="请先在报告撰写标签中填写内容。" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="font-bold text-orange-800 mb-1">📋 요약</p>
                  <p className="text-gray-700">{reportData.summary}</p>
                </div>
                {reportData.factory_name && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-bold text-gray-700 mb-1">🏭 매칭 공장</p>
                    <p>공장명: {reportData.factory_name}</p>
                    {reportData.price_quote && <p>견적가: {reportData.price_quote}</p>}
                    {reportData.lead_time && <p>납기: {reportData.lead_time}</p>}
                    {reportData.moq && <p>MOQ: {reportData.moq}</p>}
                  </div>
                )}
                {reportData.quality_notes && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-bold text-gray-700 mb-1">⭐ 품질 평가</p>
                    <p className="text-gray-600">{reportData.quality_notes}</p>
                  </div>
                )}
                {reportData.risk_notes && (
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="font-bold text-red-700 mb-1">⚠️ 리스크 및 주의사항</p>
                    <p className="text-gray-600">{reportData.risk_notes}</p>
                  </div>
                )}
                {reportData.recommendation && (
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="font-bold text-green-700 mb-1">✅ MD 추천 의견</p>
                    <p className="text-gray-600">{reportData.recommendation}</p>
                  </div>
                )}
                {reportData.next_steps && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="font-bold text-blue-700 mb-1">➡️ 다음 단계</p>
                    <p className="text-gray-600">{reportData.next_steps}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 전달 버튼 */}
          <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
            <h3 className="text-sm font-black text-green-800 mb-2">🚀 <LangText ko="바이어에게 전달" zh="传达给买家" /></h3>
            <p className="text-xs text-gray-600 mb-3">
              <LangText ko="보고서를 최종 확인한 후 바이어에게 전달하세요. 전달 후 상태가 '완료'로 변경됩니다." zh="最终确认报告后传达给买家。传达后状态变更为'已完成'。" />
            </p>
            {req.status === 'completed' ? (
              <div className="text-center py-3 text-green-600 font-bold text-sm">
                ✅ <LangText ko="이미 바이어에게 전달되었습니다." zh="已传达给买家。" />
              </div>
            ) : (
              <button onClick={deliverToSeller} disabled={saving || !reportData.summary}
                className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {saving ? '처리 중...' : <LangText ko="바이어에게 보고서 전달" zh="向买家传达报告" />}
              </button>
            )}
            {!reportData.summary && (
              <p className="text-xs text-red-500 text-center mt-2">
                <LangText ko="보고서 요약을 먼저 작성해야 전달할 수 있습니다." zh="必须先撰写报告摘要才能传达。" />
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
