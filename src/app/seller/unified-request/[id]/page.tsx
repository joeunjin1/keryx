'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const STATUS_KO: Record<string, string> = {
  submitted: '접수됨', reviewing: 'MD 검토 중', md_assigned: 'MD 배정됨',
  factory_contacted: '공장 연락 중', in_progress: '진행 중',
  report_ready: '보고서 완료', completed: '완료', cancelled: '취소됨',
};
const STATUS_ZH: Record<string, string> = {
  submitted: '已接收', reviewing: 'MD审核中', md_assigned: 'MD已分配',
  factory_contacted: '联系工厂中', in_progress: '进行中',
  report_ready: '报告完成', completed: '已完成', cancelled: '已取消',
};
const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700', reviewing: 'bg-yellow-100 text-yellow-700',
  md_assigned: 'bg-indigo-100 text-indigo-700', factory_contacted: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-green-100 text-green-700', report_ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700',
};

const WORKFLOW_STEPS = [
  { key: 'submitted', ko: '접수', zh: '接收' },
  { key: 'reviewing', ko: 'MD검토', zh: 'MD审核' },
  { key: 'factory_contacted', ko: '공장연락', zh: '联系工厂' },
  { key: 'in_progress', ko: '진행중', zh: '进行中' },
  { key: 'report_ready', ko: '보고서완료', zh: '报告完成' },
  { key: 'completed', ko: '완료', zh: '已完成' },
];
const STEP_ORDER = ['submitted', 'reviewing', 'md_assigned', 'factory_contacted', 'in_progress', 'report_ready', 'completed'];

type Request = Record<string, any>;

export default function SellerUnifiedRequestDetailPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'report'>('status');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/unified-request?id=${id}`)
      .then(r => r.json())
      .then(d => {
        setReq(d.data);
        // 보고서가 완료되면 자동으로 보고서 탭 활성화
        if (['report_ready', 'completed'].includes(d.data?.status)) {
          setActiveTab('report');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center text-gray-400 text-sm"><LangText ko="불러오는 중..." zh="加载中..." /></div>;
  if (!req) return <div className="p-6 text-center text-gray-400 text-sm"><LangText ko="의뢰를 찾을 수 없습니다." zh="找不到委托。" /></div>;

  const currentStepIdx = STEP_ORDER.indexOf(req.status);
  let reportData: Record<string, string> = {};
  try { if (req.md_report) reportData = JSON.parse(req.md_report); } catch {}

  const hasReport = reportData.summary && (req.status === 'report_ready' || req.status === 'completed');

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-gray-900">
            <LangText ko="의뢰 진행 현황" zh="委托进度状态" />
          </h1>
          <p className="text-xs text-gray-400 font-mono">{req.request_no}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[req.status] || 'bg-gray-100 text-gray-600'}`}>
          <LangText ko={STATUS_KO[req.status] || req.status} zh={STATUS_ZH[req.status] || req.status} />
        </span>
      </div>

      {/* 워크플로우 진행 표시 */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 mb-4 border border-orange-100">
        <p className="text-xs font-bold text-orange-700 mb-3">
          <LangText ko="처리 단계" zh="处理阶段" />
        </p>
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, i) => {
            const stepIdx = STEP_ORDER.indexOf(step.key);
            const isDone = stepIdx < currentStepIdx;
            const isCurrent = stepIdx === currentStepIdx;
            return (
              <div key={step.key} className="flex flex-col items-center flex-1 relative">
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className={`absolute top-3 left-1/2 w-full h-0.5 ${isDone ? 'bg-orange-400' : 'bg-gray-200'}`} />
                )}
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1
                  ${isDone ? 'bg-orange-500 text-white' : isCurrent ? 'bg-orange-600 text-white ring-2 ring-orange-300' : 'bg-gray-200 text-gray-400'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <p className={`text-[9px] text-center leading-tight ${isCurrent ? 'text-orange-700 font-bold' : isDone ? 'text-orange-500' : 'text-gray-400'}`}>
                  <LangText ko={step.ko} zh={step.zh} />
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* MD 메모 표시 */}
      {req.md_note && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3 mb-4">
          <p className="text-xs font-bold text-blue-700 mb-1">💬 <LangText ko="MD 메시지" zh="MD消息" /></p>
          <p className="text-xs text-gray-700">{req.md_note}</p>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveTab('status')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all
            ${activeTab === 'status' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}>
          <LangText ko="의뢰 내용" zh="委托内容" />
        </button>
        <button onClick={() => setActiveTab('report')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all relative
            ${activeTab === 'report' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}
            ${hasReport ? 'after:content-[""] after:absolute after:top-1 after:right-2 after:w-2 after:h-2 after:bg-orange-500 after:rounded-full' : ''}`}>
          <LangText ko="MD 보고서" zh="MD报告" />
          {hasReport && <span className="ml-1 text-orange-500">●</span>}
        </button>
      </div>

      {activeTab === 'status' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-black text-gray-800 mb-3">📋 <LangText ko="의뢰 정보" zh="委托信息" /></h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { ko: '서비스 유형', zh: '服务类型', val: req.service_type },
                { ko: '제품 카테고리', zh: '产品类别', val: req.product_category },
                { ko: '목표 수량', zh: '目标数量', val: req.target_quantity ? `${Number(req.target_quantity).toLocaleString()}개` : '-' },
                { ko: '목표 단가', zh: '目标单价', val: req.target_unit_price || '-' },
                { ko: '납기 요구', zh: '交期要求', val: req.deadline_requirement || '-' },
                { ko: '제출일', zh: '提交日期', val: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : '-' },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-gray-400"><LangText ko={item.ko} zh={item.zh} /></p>
                  <p className="font-semibold text-gray-800">{item.val}</p>
                </div>
              ))}
            </div>
            {req.detailed_requirements && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1"><LangText ko="상세 요구사항" zh="详细需求" /></p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{req.detailed_requirements}</p>
              </div>
            )}
          </div>

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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'report' && (
        <div className="space-y-3">
          {!hasReport ? (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-sm font-bold text-gray-600">
                <LangText ko="보고서 준비 중입니다." zh="报告准备中。" />
              </p>
              <p className="text-xs text-gray-400 mt-1">
                <LangText ko="MD가 공장과 협의 후 보고서를 작성하고 있습니다. 완료되면 알림을 보내드립니다." zh="MD正在与工厂协商后撰写报告。完成后将通知您。" />
              </p>
              <div className="mt-4 flex justify-center">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-orange-300 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 보고서 헤더 */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
                <p className="text-xs font-bold opacity-80 mb-1">KERYX MD 공식 보고서</p>
                <p className="text-lg font-black">{req.company_name}</p>
                <p className="text-xs opacity-80 mt-1">{req.request_no} · {req.delivered_at ? new Date(req.delivered_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              </div>

              {/* 요약 */}
              {reportData.summary && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">📋 <LangText ko="핵심 요약" zh="核心摘要" /></p>
                  <p className="text-sm text-gray-800 leading-relaxed">{reportData.summary}</p>
                </div>
              )}

              {/* 공장 정보 */}
              {reportData.factory_name && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-3">🏭 <LangText ko="매칭 공장 정보" zh="匹配工厂信息" /></p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { ko: '공장명', zh: '工厂名称', val: reportData.factory_name },
                      { ko: '견적가', zh: '报价', val: reportData.price_quote },
                      { ko: '납기', zh: '交货期', val: reportData.lead_time },
                      { ko: 'MOQ', zh: 'MOQ', val: reportData.moq },
                    ].filter(i => i.val).map((item, i) => (
                      <div key={i}>
                        <p className="text-gray-400"><LangText ko={item.ko} zh={item.zh} /></p>
                        <p className="font-bold text-gray-800">{item.val}</p>
                      </div>
                    ))}
                  </div>
                  {reportData.factory_evaluation && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1"><LangText ko="공장 평가" zh="工厂评估" /></p>
                      <p className="text-xs text-gray-700">{reportData.factory_evaluation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 품질 평가 */}
              {reportData.quality_notes && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">⭐ <LangText ko="품질 평가" zh="质量评估" /></p>
                  <p className="text-xs text-gray-700 leading-relaxed">{reportData.quality_notes}</p>
                </div>
              )}

              {/* 리스크 */}
              {reportData.risk_notes && (
                <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
                  <p className="text-xs font-bold text-red-600 mb-2">⚠️ <LangText ko="리스크 및 주의사항" zh="风险及注意事项" /></p>
                  <p className="text-xs text-gray-700 leading-relaxed">{reportData.risk_notes}</p>
                </div>
              )}

              {/* MD 추천 의견 */}
              {reportData.recommendation && (
                <div className="bg-green-50 rounded-2xl border border-green-100 p-4">
                  <p className="text-xs font-bold text-green-700 mb-2">✅ <LangText ko="MD 추천 의견" zh="MD推荐意见" /></p>
                  <p className="text-xs text-gray-700 leading-relaxed">{reportData.recommendation}</p>
                </div>
              )}

              {/* 다음 단계 */}
              {reportData.next_steps && (
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
                  <p className="text-xs font-bold text-blue-700 mb-2">➡️ <LangText ko="다음 단계 안내" zh="下一步指引" /></p>
                  <p className="text-xs text-gray-700 leading-relaxed">{reportData.next_steps}</p>
                </div>
              )}

              {/* 문의 CTA */}
              <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4 text-center">
                <p className="text-sm font-bold text-orange-800 mb-1">
                  <LangText ko="보고서에 대해 궁금한 점이 있으신가요?" zh="对报告有疑问吗？" />
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  <LangText ko="담당 MD에게 직접 문의하세요." zh="请直接联系负责MD。" />
                </p>
                <a href="/seller/messages"
                  className="inline-block px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold">
                  <LangText ko="MD에게 메시지 보내기" zh="向MD发送消息" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
