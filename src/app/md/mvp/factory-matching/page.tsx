'use client';
import { useState, useEffect, useRef } from 'react';
import { useLangContext } from '@/components/layout/LangContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

/* ─── 타입 정의 ─────────────────────────────────────────── */
interface MatchingRequest {
  id: string;
  product_name?: string;
  product_desc?: string;
  contact_name: string;
  company_name?: string;
  phone: string;
  email?: string;
  status: string;
  created_at: string;
  weight_price?: number;
  weight_quality?: number;
  weight_delivery?: number;
  weight_stability?: number;
  weight_communication?: number;
  weight_certification?: number;
  moq?: string | number;
  target_price?: string;
  desired_delivery?: string;
  required_certs?: string[];
  ref_images_product?: string[];
  final_factory_name?: string;
  final_conclusion?: string;
  report_sent_at?: string;
  buyer_approved?: boolean;
}

interface FactoryResponse {
  id: string;
  request_id: string;
  factory_name: string;
  location?: string;
  established_year?: number;
  employee_count?: number;
  monthly_capacity?: string;
  quote_500?: string;
  quote_1000?: string;
  quote_3000?: string;
  moq?: number;
  sample_cost?: string;
  sample_days?: number;
  lead_time_days?: number;
  has_kc?: boolean;
  has_ce?: boolean;
  has_fda?: boolean;
  has_en71?: boolean;
  has_ip_audit?: boolean;
  notes?: string;
  status?: string;
}

interface MDEvaluation {
  id?: string;
  request_id: string;
  factory_name: string;
  q_material?: number;
  q_sewing?: number;
  q_printing?: number;
  q_packaging?: number;
  q_consistency?: number;
  q_defect_rate?: number;
  q_sample_match?: number;
  q_improvement?: number;
  c_response_hours?: number;
  c_quote_days?: number;
  c_accuracy?: number;
  c_understanding?: number;
  c_photo?: number;
  c_negotiation?: number;
  r_ip_protection?: number;
  r_financial?: number;
  r_delivery?: number;
  r_quality_ctrl?: number;
  r_notes?: string;
  md_comment?: string;
  is_recommended?: boolean;
  recommendation_rank?: number;
  total_score?: number;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: '대기중',  color: '#92400e', bg: '#fef3c7' },
  in_progress: { label: '진행중',  color: '#1e40af', bg: '#dbeafe' },
  replied:     { label: 'MD답변',  color: '#065f46', bg: '#d1fae5' },
  completed:   { label: '완료',    color: '#374151', bg: '#f3f4f6' },
  cancelled:   { label: '취소',    color: '#991b1b', bg: '#fee2e2' },
};

const QUALITY_AXES = [
  { key: 'q_material',    label: '소재 품질',     desc: '원단·원료의 두께, 내구성, 촉감, 친환경 기준 충족 여부를 평가합니다. 1점: 기준 미달 소재 사용 / 10점: 최고급 소재, 친환경 인증 보유' },
  { key: 'q_sewing',      label: '봉제/가공 품질', desc: '봉제 마감, 재단 정밀도, 접착·용접 품질을 평가합니다. 1점: 뜯김·오염 다수 / 10점: 무결점 마감, 내구 테스트 통과' },
  { key: 'q_printing',    label: '인쇄/색상 품질', desc: '색상 재현도, 인쇄 선명도, 색 번짐·탈색 여부를 평가합니다. 1점: 색상 불일치, 번짐 심각 / 10점: Pantone 기준 ±2 이내, 세탁 후에도 유지' },
  { key: 'q_packaging',   label: '포장 품질',     desc: '개별 포장 완성도, 충격 보호, 브랜드 인쇄 품질을 평가합니다. 1점: 포장 파손·오염 / 10점: 맞춤 포장, 충격 테스트 통과' },
  { key: 'q_consistency', label: '품질 일관성',   desc: '로트(lot) 간 품질 편차, 동일 배치 내 균일성을 평가합니다. 1점: 로트마다 품질 차이 큼 / 10점: 전 로트 균일, SPC 관리 운영' },
  { key: 'q_defect_rate', label: '불량률 관리',   desc: '불량 발생률 및 불량 발견·처리 체계를 평가합니다. 1점: 불량률 5% 이상 / 10점: 불량률 0.5% 미만, 자동 검사 라인 보유' },
  { key: 'q_sample_match',label: '샘플 일치도',   desc: '승인 샘플과 양산품 간의 형태·색상·소재 일치 정도를 평가합니다. 1점: 샘플과 양산 차이 큼 / 10점: 샘플 100% 재현, 변경 시 사전 통보' },
  { key: 'q_improvement', label: '개선 대응력',   desc: '수정 요청에 대한 이해도와 재작업 속도·정확도를 평가합니다. 1점: 수정 반영 느리고 반복 오류 / 10점: 1회 수정으로 완결, 원인 분석 공유' },
];

const COMM_AXES = [
  { key: 'c_accuracy',     label: '답변 정확도',  desc: '문의에 대한 답변이 질문의 핵심을 정확히 짚고 있는지 평가합니다. 1점: 엉뚱한 답변, 누락 다수 / 10점: 모든 항목에 수치·근거 포함한 정확한 답변' },
  { key: 'c_understanding',label: '수정 이해도',  desc: '디자인·사양 변경 요청을 얼마나 정확히 이해하고 반영하는지 평가합니다. 1점: 수정 지시 반복 필요 / 10점: 1회 전달로 완전 이해, 추가 확인 질문 적절' },
  { key: 'c_photo',        label: '사진 적극성',  desc: '생산 현장, 진행 상황, 불량 사례 등을 사진·영상으로 자발적으로 공유하는 정도를 평가합니다. 1점: 요청해도 사진 미제공 / 10점: 공정별 사진 자발 공유, 영상 투어 제공' },
  { key: 'c_negotiation',  label: '협상 태도',   desc: '단가·조건 협상 시 유연성과 상호 이익을 고려하는 태도를 평가합니다. 1점: 일방적 조건 고수, 협상 거부 / 10점: 합리적 근거 제시, 장기 파트너십 지향' },
];

const RISK_AXES = [
  { key: 'r_ip_protection', label: 'IP 보호 수준',   desc: '디자인·캐릭터 IP 유출 방지를 위한 NDA 체결, 내부 보안 절차, 과거 유출 이력을 평가합니다. 1점: NDA 거부, 유출 이력 있음 / 10점: NDA 체결, 내부 보안 감사 통과, 유출 이력 없음' },
  { key: 'r_financial',     label: '재무 안정성',   desc: '공장의 재무 건전성, 갑작스러운 폐업·부도 가능성을 평가합니다. 1점: 재무 정보 미공개, 결제 지연 이력 / 10점: 재무제표 공개, 3년 이상 안정적 운영' },
  { key: 'r_delivery',      label: '납기 준수율',   desc: '과거 주문에서 약속된 납기일을 얼마나 준수했는지 평가합니다. 1점: 납기 지연 50% 이상 / 10점: 납기 준수율 98% 이상, 지연 시 사전 통보 및 보상' },
  { key: 'r_quality_ctrl',  label: '품질 관리 체계', desc: 'ISO 인증, 자체 QC 인력, 검수 프로세스 등 체계적 품질 관리 시스템 보유 여부를 평가합니다. 1점: QC 인력 없음, 무작위 검수 / 10점: ISO 9001 인증, 전담 QC팀, 출하 전 전수 검사' },
];

function calcTotalScore(ev: Partial<MDEvaluation>, req: Partial<MatchingRequest>): number {
  const wQ = (req.weight_quality ?? 3);
  const wC = (req.weight_communication ?? 3);
  const wR = (req.weight_stability ?? 3);
  const total = wQ + wC + wR || 1;
  const qScore = QUALITY_AXES.reduce((s, a) => s + (((ev as unknown as Record<string,number>)[a.key]) ?? 5), 0) / QUALITY_AXES.length;
  const cScore = COMM_AXES.reduce((s, a) => s + (((ev as unknown as Record<string,number>)[a.key]) ?? 5), 0) / COMM_AXES.length;
  const rScore = RISK_AXES.reduce((s, a) => s + (((ev as unknown as Record<string,number>)[a.key]) ?? 5), 0) / RISK_AXES.length;
  return Math.round(((qScore * wQ + cScore * wC + rScore * wR) / total) * 10);
}

export default function MDFactoryMatchingPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient();
  const [requests, setRequests] = useState<MatchingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<MatchingRequest | null>(null);
  const [factories, setFactories] = useState<FactoryResponse[]>([]);
  const [evaluations, setEvaluations] = useState<MDEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'detail' | 'eval' | 'report'>('detail');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddFactory, setShowAddFactory] = useState(false);
  const [newFactory, setNewFactory] = useState<Partial<FactoryResponse>>({});
  const [editEval, setEditEval] = useState<Partial<MDEvaluation> & { factory_name: string }>({ factory_name: '' });
  const [savingEval, setSavingEval] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [finalConclusion, setFinalConclusion] = useState('');
  const [recommendedFactory, setRecommendedFactory] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadRequests(); }, [statusFilter, search]);

  async function loadRequests() {
    setLoading(true);
    let q = supabase.from('factory_matching_requests').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (search) q = q.ilike('contact_name', `%${search}%`);
    const { data } = await q;
    setRequests(data || []);
    setLoading(false);
  }

  async function loadDetail(req: MatchingRequest) {
    setSelectedReq(req);
    setActiveTab('detail');
    setFinalConclusion(req.final_conclusion || '');
    setRecommendedFactory(req.final_factory_name || '');
    setReportSaved(!!req.report_sent_at);
    const { data: facs } = await supabase.from('factory_matching_factory_responses').select('*').eq('request_id', req.id);
    setFactories(facs || []);
    const { data: evals } = await supabase.from('factory_matching_md_evaluations').select('*').eq('request_id', req.id);
    setEvaluations(evals || []);
  }

  async function addFactory() {
    if (!selectedReq || !newFactory.factory_name) return;
    const { error } = await supabase.from('factory_matching_factory_responses').insert({ ...newFactory, request_id: selectedReq.id, status: 'submitted' });
    if (!error) { setShowAddFactory(false); setNewFactory({}); loadDetail(selectedReq); }
  }

  async function saveEvaluation() {
    if (!selectedReq || !editEval.factory_name) return;
    setSavingEval(true);
    const score = calcTotalScore(editEval, selectedReq);
    const payload = { ...editEval, request_id: selectedReq.id, total_score: score };
    if (editEval.id) {
      await supabase.from('factory_matching_md_evaluations').update(payload).eq('id', editEval.id);
    } else {
      await supabase.from('factory_matching_md_evaluations').insert(payload);
    }
    setSavingEval(false);
    setEditEval({ factory_name: '' });
    loadDetail(selectedReq);
    setActiveTab('eval');
  }

  async function generateAndSaveReport() {
    if (!selectedReq) return;
    setGeneratingReport(true);
    const reportNo = `KX-FM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const section_summary = {
      report_no: reportNo,
      product: selectedReq.product_name || selectedReq.product_desc,
      contact: selectedReq.contact_name,
      company: selectedReq.company_name,
      moq: selectedReq.moq,
      target_price: selectedReq.target_price,
      desired_delivery: selectedReq.desired_delivery,
      created_at: new Date().toISOString(),
    };
    const weights = {
      price: selectedReq.weight_price ?? 3,
      quality: selectedReq.weight_quality ?? 3,
      delivery: selectedReq.weight_delivery ?? 3,
      stability: selectedReq.weight_stability ?? 3,
      communication: selectedReq.weight_communication ?? 3,
      certification: selectedReq.weight_certification ?? 3,
    };
    const totalW = Object.values(weights).reduce((s, v) => s + v, 0) || 1;
    const section_weights = Object.entries(weights).map(([k, v]) => ({ key: k, score: v, pct: Math.round((v / totalW) * 100) }));
    const section_basics = factories.map(f => ({ name: f.factory_name, location: f.location, established: f.established_year, employees: f.employee_count, capacity: f.monthly_capacity, notes: f.notes }));
    const section_quotes = factories.map(f => ({ name: f.factory_name, quote_500: f.quote_500, quote_1000: f.quote_1000, quote_3000: f.quote_3000, moq: f.moq, sample_cost: f.sample_cost, sample_days: f.sample_days, lead_time: f.lead_time_days }));
    const section_quality = evaluations.map(ev => ({ factory: ev.factory_name, scores: QUALITY_AXES.map(a => ({ label: a.label, score: (ev as unknown as Record<string,number>)[a.key] ?? '-' })) }));
    const section_certs = factories.map(f => ({ name: f.factory_name, kc: f.has_kc, ce: f.has_ce, fda: f.has_fda, en71: f.has_en71, ip: f.has_ip_audit }));
    const section_comm = evaluations.map(ev => ({ factory: ev.factory_name, response_hours: ev.c_response_hours, quote_days: ev.c_quote_days, scores: COMM_AXES.map(a => ({ label: a.label, score: (ev as unknown as Record<string,number>)[a.key] ?? '-' })) }));
    const section_risk = evaluations.map(ev => ({ factory: ev.factory_name, scores: RISK_AXES.map(a => ({ label: a.label, score: (ev as unknown as Record<string,number>)[a.key] ?? '-' })), notes: ev.r_notes }));
    const section_scores = evaluations.map(ev => ({ factory: ev.factory_name, total: ev.total_score ?? calcTotalScore(ev, selectedReq), rank: ev.recommendation_rank, recommended: ev.is_recommended })).sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    const topFactory = section_scores[0];
    const section_final = { factory: recommendedFactory || topFactory?.factory || '', conclusion: finalConclusion, conditions: '샘플 확인 / 인증 확인 / 단가 재협상', process: '샘플 → 수정 → 최종견적 → 계약 → 양산전 검수기준 확정 → 중간검수 → 출고검수' };
    const section_action = [
      { step: 1, task: '샘플 제작 의뢰', owner: 'KERYX / 공장', duration: '3일', output: '샘플 견적서' },
      { step: 2, task: '샘플비 결제', owner: '고객', duration: '1일', output: '결제 확인서' },
      { step: 3, task: '1차 샘플 제작', owner: '공장', duration: '10~14일', output: '샘플 사진/영상' },
      { step: 4, task: '샘플 검토', owner: '고객 / KERYX', duration: '3~5일', output: '수정 요청서' },
      { step: 5, task: '최종 견적 확정', owner: 'KERYX / 공장', duration: '3일', output: '최종 견적서' },
      { step: 6, task: '양산 계약', owner: '고객 / 공장', duration: '3일', output: '계약서 / PI' },
      { step: 7, task: '생산 중간 점검', owner: 'KERYX', duration: '1일', output: '점검 리포트' },
      { step: 8, task: '출고 전 검수', owner: 'KERYX', duration: '2일', output: '검수 리포트' },
      { step: 9, task: '출고 / 물류', owner: '물류사', duration: '7~14일', output: '선적 서류' },
    ];
    const { error: repErr } = await supabase.from('factory_matching_final_reports').upsert({
      request_id: selectedReq.id, report_no: reportNo,
      section_summary, section_weights, section_photos: {},
      section_basics, section_quotes, section_quality, section_certs,
      section_comm, section_risk, section_scores, section_final, section_action,
      status: 'draft', updated_at: new Date().toISOString(),
    }, { onConflict: 'request_id' });
    await supabase.from('factory_matching_requests').update({
      status: 'replied', final_factory_name: section_final.factory,
      final_conclusion: finalConclusion, updated_at: new Date().toISOString(),
    }).eq('id', selectedReq.id);
    setGeneratingReport(false);
    if (!repErr) { setReportSaved(true); setActiveTab('report'); loadRequests(); }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/md/mvp" className="text-gray-400 hover:text-white text-sm">← MD 홈</Link>
          <span className="text-gray-600">|</span>
          <h1 className="text-lg font-bold text-amber-400">공장 매칭 워크스페이스</h1>
        </div>
        <div className="text-xs text-gray-500">Factory Matching Workspace · 工厂匹配工作台</div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* 사이드바 */}
        <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
          {/* TOP 매칭 통계 위젯 */}
          <TopMatchingWidget />
          <div className="p-4 border-b border-gray-800">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름/회사 검색..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400" />
            <div className="flex gap-1 mt-2 flex-wrap">
              {['all', 'pending', 'in_progress', 'replied', 'completed'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${statusFilter === s ? 'bg-amber-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {s === 'all' ? '전체' : STATUS_META[s]?.label ?? s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">로딩 중...</div>
            ) : requests.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">의뢰가 없습니다</div>
            ) : requests.map(req => (
              <button key={req.id} onClick={() => loadDetail(req)} className={`w-full text-left p-4 border-b border-gray-800 hover:bg-gray-800 transition-colors ${selectedReq?.id === req.id ? 'bg-gray-800 border-l-2 border-l-amber-400' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-white truncate">{req.product_name || req.product_desc?.slice(0, 20) || '제품명 없음'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{req.contact_name}{req.company_name ? ` · ${req.company_name}` : ''}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{new Date(req.created_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: STATUS_META[req.status]?.color ?? '#fff', background: STATUS_META[req.status]?.bg ?? '#333' }}>
                    {STATUS_META[req.status]?.label ?? req.status}
                  </span>
                </div>
                {req.final_factory_name && <div className="text-xs text-amber-400 mt-1">✓ {req.final_factory_name}</div>}
              </button>
            ))}
          </div>
        </aside>

        {/* 메인 */}
        <main className="flex-1 overflow-y-auto">
          {!selectedReq ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-5xl mb-4 opacity-30">🏭</div>
                <p>의뢰를 선택하면 상세 내용이 표시됩니다</p>
              </div>
            </div>
          ) : (
            <div>
              {/* 탭 */}
              <div className="bg-gray-900 border-b border-gray-800 px-6 flex gap-1">
                {([
                  { key: 'detail', label: '의뢰 상세' },
                  { key: 'eval',   label: '공장 평가' },
                  { key: 'report', label: '보고서 생성' },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-amber-400 text-amber-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 탭1: 의뢰 상세 */}
              {activeTab === 'detail' && (
                <div className="p-6 space-y-5">
                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h2 className="text-amber-400 font-bold mb-4">§1. 프로젝트 요약</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {[
                        ['제품명', selectedReq.product_name || '-'],
                        ['의뢰인', selectedReq.contact_name],
                        ['회사명', selectedReq.company_name || '-'],
                        ['연락처', selectedReq.phone],
                        ['이메일', selectedReq.email || '-'],
                        ['MOQ', String(selectedReq.moq || '-')],
                        ['목표 단가', selectedReq.target_price || '-'],
                        ['납기 희망', selectedReq.desired_delivery || '-'],
                        ['필요 인증', (selectedReq.required_certs || []).join(', ') || '-'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                          <div className="text-white">{value}</div>
                        </div>
                      ))}
                    </div>
                    {selectedReq.product_desc && (
                      <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-300">{selectedReq.product_desc}</div>
                    )}
                  </div>

                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h2 className="text-amber-400 font-bold mb-4">§2. 고객 우선순위 가중치</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { key: 'weight_price', label: '가격' },
                        { key: 'weight_quality', label: '품질' },
                        { key: 'weight_delivery', label: '납기' },
                        { key: 'weight_stability', label: '안정성' },
                        { key: 'weight_communication', label: '소통' },
                        { key: 'weight_certification', label: '인증' },
                      ].map(w => {
                        const val = (selectedReq as unknown as Record<string, number>)[w.key] ?? 3;
                        return (
                          <div key={w.key} className="bg-gray-800 rounded-lg p-3">
                            <div className="text-xs text-gray-400 mb-1">{w.label}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-700 rounded-full h-2">
                                <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${(val / 5) * 100}%` }} />
                              </div>
                              <span className="text-amber-400 font-bold text-sm">{val}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-amber-400 font-bold">§4. 후보 공장 ({factories.length}개)</h2>
                      <button onClick={() => setShowAddFactory(true)} className="bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-300">+ 공장 추가</button>
                    </div>
                    {factories.length === 0 ? (
                      <p className="text-gray-500 text-sm">아직 등록된 공장이 없습니다.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              {['공장명', '위치', 'MOQ', '1000개 단가', '납기'].map(h => (
                                <th key={h} className="text-left py-2 pr-4 text-gray-400 font-medium last:text-right">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {factories.map(f => (
                              <tr key={f.id} className="border-b border-gray-800 hover:bg-gray-800">
                                <td className="py-2 pr-4 font-medium">{f.factory_name}</td>
                                <td className="py-2 pr-4 text-gray-400">{f.location || '-'}</td>
                                <td className="py-2 pr-4 text-gray-400">{f.moq || '-'}</td>
                                <td className="py-2 pr-4 text-amber-400">{f.quote_1000 || '-'}</td>
                                <td className="py-2 text-right text-gray-400">{f.lead_time_days ? `${f.lead_time_days}일` : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {showAddFactory && (
                      <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
                        <h3 className="text-sm font-bold text-white mb-3">공장 정보 입력</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            ['공장명 *', 'factory_name', 'text'],
                            ['위치', 'location', 'text'],
                            ['설립연도', 'established_year', 'number'],
                            ['직원 수', 'employee_count', 'number'],
                            ['월 생산량', 'monthly_capacity', 'text'],
                            ['MOQ', 'moq', 'number'],
                            ['500개 단가', 'quote_500', 'text'],
                            ['1000개 단가', 'quote_1000', 'text'],
                            ['3000개 단가', 'quote_3000', 'text'],
                            ['샘플비', 'sample_cost', 'text'],
                            ['샘플 기간(일)', 'sample_days', 'number'],
                            ['납기(일)', 'lead_time_days', 'number'],
                          ].map(([label, field]) => (
                            <div key={field}>
                              <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                              <input
                                value={String((newFactory as Record<string,unknown>)[field] || '')}
                                onChange={e => setNewFactory(p => ({ ...p, [field]: e.target.value }))}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-3">
                          {[['has_kc','KC'],['has_ce','CE'],['has_fda','FDA'],['has_en71','EN71']].map(([k,l]) => (
                            <label key={k} className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
                              <input type="checkbox" checked={(newFactory as Record<string,boolean>)[k] || false} onChange={e => setNewFactory(p => ({ ...p, [k]: e.target.checked }))} className="accent-amber-400" />
                              {l}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={addFactory} className="bg-amber-400 text-gray-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-300">저장</button>
                          <button onClick={() => { setShowAddFactory(false); setNewFactory({}); }} className="bg-gray-700 text-white text-xs px-4 py-2 rounded-lg hover:bg-gray-600">취소</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 큂2: 공장 평가 */}
              {activeTab === 'eval' && (
                <div className="p-6 space-y-5">

                  {/* 평가 기준 안내 패널 */}
                  <div className="bg-gray-900 rounded-xl border border-amber-400/20 overflow-hidden">
                    <button
                      onClick={() => setActiveTooltip(activeTooltip === '__guide__' ? null : '__guide__')}
                      className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold flex items-center justify-center">i</span>
                        <span className="text-sm font-bold text-amber-400">평가 기준 안내 — 16개 항목 상세 설명</span>
                      </div>
                      <span className="text-gray-400 text-xs">{activeTooltip === '__guide__' ? '접기' : '펼치기'}</span>
                    </button>
                    {activeTooltip === '__guide__' && (
                      <div className="px-5 pb-5 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-green-400 mb-2">품질 평가 (8축) — 가중치: 바이어 설정값</h4>
                          <div className="space-y-1.5">
                            {QUALITY_AXES.map(a => (
                              <div key={a.key} className="flex gap-2">
                                <span className="text-xs text-gray-300 w-24 flex-shrink-0 font-medium">{a.label}</span>
                                <span className="text-xs text-gray-500">{a.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-blue-400 mb-2">소통 평가 (4축) — 가중치: 바이어 설정값</h4>
                          <div className="space-y-1.5">
                            {COMM_AXES.map(a => (
                              <div key={a.key} className="flex gap-2">
                                <span className="text-xs text-gray-300 w-24 flex-shrink-0 font-medium">{a.label}</span>
                                <span className="text-xs text-gray-500">{a.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-red-400 mb-2">리스크 평가 (4축) — 가중치: 바이어 설정값</h4>
                          <div className="space-y-1.5">
                            {RISK_AXES.map(a => (
                              <div key={a.key} className="flex gap-2">
                                <span className="text-xs text-gray-300 w-24 flex-shrink-0 font-medium">{a.label}</span>
                                <span className="text-xs text-gray-500">{a.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-400">
                            <span className="text-amber-400 font-bold">점수 기준:</span> 1점(최하) ~ 10점(최상)으로 평가하며, 각 항목의 ‘?’ 버튼을 클릭하면 개별 평가 기준을 확인할 수 있습니다.
                            종합 점수는 바이어가 설정한 가중치(중요도)를 반영하여 자동 계산됩니다.
                            <span className="text-green-400"> 80점 이상</span>: 최우선 추천, <span className="text-amber-400"> 60~79점</span>: 차선 검토, <span className="text-red-400"> 60점 미만</span>: 신중 검토 필요.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {evaluations.length > 0 && (
                    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                      <h2 className="text-amber-400 font-bold mb-4">완료된 평가 ({evaluations.length}개)</h2>
                      <div className="space-y-3">
                        {evaluations.map(ev => {
                          const score = ev.total_score ?? 0;
                          const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
                          const scoreBg = score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400';
                          const qAvg = QUALITY_AXES.reduce((s, a) => s + (((ev as unknown as Record<string,number>)[a.key]) ?? 5), 0) / QUALITY_AXES.length;
                          const cAvg = COMM_AXES.reduce((s, a) => s + (((ev as unknown as Record<string,number>)[a.key]) ?? 5), 0) / COMM_AXES.length;
                          const rAvg = RISK_AXES.reduce((s, a) => s + (((ev as unknown as Record<string,number>)[a.key]) ?? 5), 0) / RISK_AXES.length;
                          return (
                            <div key={ev.id} className="bg-gray-800 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="font-medium text-sm">{ev.factory_name}</div>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {ev.is_recommended && <span className="text-green-400 mr-2">● 추천</span>}
                                    {ev.recommendation_rank ? <span className="text-amber-400">{ev.recommendation_rank}위 선택</span> : ''}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className={`text-2xl font-bold ${scoreColor}`}>{score}</div>
                                    <div className="text-xs text-gray-500">/ 100점</div>
                                  </div>
                                  <button onClick={() => setEditEval({ ...ev })} className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600">수정</button>
                                </div>
                              </div>
                              {/* 세부 점수 미니 바 */}
                              <div className="grid grid-cols-3 gap-2">
                                {[{ label: '품질', avg: qAvg }, { label: '소통', avg: cAvg }, { label: '리스크', avg: rAvg }].map(item => (
                                  <div key={item.label}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-gray-500">{item.label}</span>
                                      <span className="text-gray-300">{item.avg.toFixed(1)}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                      <div className={`h-full ${scoreBg} rounded-full transition-all`} style={{ width: `${(item.avg / 10) * 100}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {ev.md_comment && (
                                <div className="mt-3 text-xs text-gray-400 bg-gray-900 rounded-lg p-2 border-l-2 border-amber-400/40">
                                  "{ev.md_comment}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h2 className="text-amber-400 font-bold mb-4">{editEval.id ? '평가 수정' : '새 공장 평가 입력'}</h2>
                    <div className="mb-4">
                      <label className="text-xs text-gray-400 mb-1 block">공장명 *</label>
                      <select value={editEval.factory_name} onChange={e => setEditEval(p => ({ ...p, factory_name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400">
                        <option value="">공장 선택...</option>
                        {factories.map(f => <option key={f.id} value={f.factory_name}>{f.factory_name}</option>)}
                      </select>
                    </div>

                    {/* 품질 8축 */}
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-gray-300 mb-3">품질 평가 (8축)</h3>
                      <p className="text-xs text-gray-500 mb-3">각 항목의 <span className="text-amber-400">?</span> 아이콘을 클릭하면 평가 기준 상세 설명을 확인할 수 있습니다.</p>
                      <div className="space-y-3">
                        {QUALITY_AXES.map(a => {
                          const val = ((editEval as unknown as Record<string,number>)[a.key]) ?? 5;
                          const isOpen = activeTooltip === a.key;
                          return (
                            <div key={a.key}>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-36 flex-shrink-0">
                                  <span className="text-xs text-gray-300">{a.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTooltip(isOpen ? null : a.key)}
                                    className="w-4 h-4 rounded-full bg-gray-700 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 hover:bg-gray-600 transition-colors"
                                    title="평가 기준 보기"
                                  >?</button>
                                </div>
                                <input type="range" min="1" max="10" value={val} onChange={e => setEditEval(p => ({ ...p, [a.key]: parseInt(e.target.value) }))} className="flex-1 accent-amber-400 cursor-pointer" />
                                <span className={`font-bold text-sm w-6 text-center ${
                                  val >= 8 ? 'text-green-400' : val >= 5 ? 'text-amber-400' : 'text-red-400'
                                }`}>{val}</span>
                              </div>
                              {isOpen && (
                                <div ref={tooltipRef} className="mt-1 ml-36 bg-gray-700 border border-amber-400/30 rounded-lg p-3 text-xs text-gray-200 leading-relaxed">
                                  {a.desc}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 커뮤니케이션 */}
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-gray-300 mb-3">커뮤니케이션 평가</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">최초 응답(시간)</label>
                          <input value={String(editEval.c_response_hours || '')} onChange={e => setEditEval(p => ({ ...p, c_response_hours: parseInt(e.target.value) || undefined }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">견적 제출(일)</label>
                          <input value={String(editEval.c_quote_days || '')} onChange={e => setEditEval(p => ({ ...p, c_quote_days: parseInt(e.target.value) || undefined }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        {COMM_AXES.map(a => {
                          const val = ((editEval as unknown as Record<string,number>)[a.key]) ?? 5;
                          const isOpen = activeTooltip === a.key;
                          return (
                            <div key={a.key}>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-36 flex-shrink-0">
                                  <span className="text-xs text-gray-300">{a.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTooltip(isOpen ? null : a.key)}
                                    className="w-4 h-4 rounded-full bg-gray-700 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 hover:bg-gray-600 transition-colors"
                                    title="평가 기준 보기"
                                  >?</button>
                                </div>
                                <input type="range" min="1" max="10" value={val} onChange={e => setEditEval(p => ({ ...p, [a.key]: parseInt(e.target.value) }))} className="flex-1 accent-amber-400 cursor-pointer" />
                                <span className={`font-bold text-sm w-6 text-center ${
                                  val >= 8 ? 'text-green-400' : val >= 5 ? 'text-amber-400' : 'text-red-400'
                                }`}>{val}</span>
                              </div>
                              {isOpen && (
                                <div className="mt-1 ml-36 bg-gray-700 border border-amber-400/30 rounded-lg p-3 text-xs text-gray-200 leading-relaxed">
                                  {a.desc}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 리스크 */}
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-gray-300 mb-3">리스크 평가</h3>
                      <div className="space-y-3">
                        {RISK_AXES.map(a => {
                          const val = ((editEval as unknown as Record<string,number>)[a.key]) ?? 5;
                          const isOpen = activeTooltip === a.key;
                          return (
                            <div key={a.key}>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-36 flex-shrink-0">
                                  <span className="text-xs text-gray-300">{a.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTooltip(isOpen ? null : a.key)}
                                    className="w-4 h-4 rounded-full bg-gray-700 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 hover:bg-gray-600 transition-colors"
                                    title="평가 기준 보기"
                                  >?</button>
                                </div>
                                <input type="range" min="1" max="10" value={val} onChange={e => setEditEval(p => ({ ...p, [a.key]: parseInt(e.target.value) }))} className="flex-1 accent-amber-400 cursor-pointer" />
                                <span className={`font-bold text-sm w-6 text-center ${
                                  val >= 8 ? 'text-green-400' : val >= 5 ? 'text-amber-400' : 'text-red-400'
                                }`}>{val}</span>
                              </div>
                              {isOpen && (
                                <div className="mt-1 ml-36 bg-gray-700 border border-amber-400/30 rounded-lg p-3 text-xs text-gray-200 leading-relaxed">
                                  {a.desc}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <textarea placeholder="리스크 특이사항..." value={editEval.r_notes || ''} onChange={e => setEditEval(p => ({ ...p, r_notes: e.target.value }))} rows={2} className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400 resize-none" />
                    </div>

                    {/* 종합 의견 */}
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-300 mb-2">MD 종합 의견</h3>
                      <textarea placeholder="이 공장에 대한 종합 의견..." value={editEval.md_comment || ''} onChange={e => setEditEval(p => ({ ...p, md_comment: e.target.value }))} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400 resize-none" />
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={editEval.is_recommended || false} onChange={e => setEditEval(p => ({ ...p, is_recommended: e.target.checked }))} className="accent-amber-400" />
                        이 공장 추천
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">추천 순위</label>
                        <select value={editEval.recommendation_rank || ''} onChange={e => setEditEval(p => ({ ...p, recommendation_rank: parseInt(e.target.value) || undefined }))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none">
                          <option value="">-</option>
                          <option value="1">1위 (최우선)</option>
                          <option value="2">2위 (차선)</option>
                          <option value="3">3위 (대안)</option>
                        </select>
                      </div>
                    </div>

                    {editEval.factory_name && (
                      <div className="p-3 bg-gray-800 rounded-lg flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-400">예상 종합 점수</span>
                        <span className="text-2xl font-bold text-amber-400">{calcTotalScore(editEval, selectedReq)}점</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={saveEvaluation} disabled={savingEval || !editEval.factory_name} className="bg-amber-400 text-gray-900 font-bold px-6 py-2.5 rounded-xl hover:bg-amber-300 disabled:opacity-50">
                        {savingEval ? '저장 중...' : '평가 저장'}
                      </button>
                      <button onClick={() => setEditEval({ factory_name: '' })} className="bg-gray-700 text-white px-4 py-2.5 rounded-xl hover:bg-gray-600">초기화</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 탭3: 보고서 생성 */}
              {activeTab === 'report' && (
                <div className="p-6 space-y-5">
                  {evaluations.length > 0 && (
                    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                      <h2 className="text-amber-400 font-bold mb-4">§10. 종합 점수표</h2>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-2 pr-4 text-gray-400">공장명</th>
                            <th className="text-right py-2 pr-4 text-gray-400">종합 점수</th>
                            <th className="text-right py-2 text-gray-400">추천</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...evaluations].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0)).map((ev, i) => (
                            <tr key={ev.id} className="border-b border-gray-800">
                              <td className="py-2 pr-4">
                                {i === 0 && <span className="mr-1">🥇</span>}
                                {i === 1 && <span className="mr-1">🥈</span>}
                                {i === 2 && <span className="mr-1">🥉</span>}
                                {ev.factory_name}
                              </td>
                              <td className="py-2 pr-4 text-right">
                                <span className={`font-bold text-lg ${(ev.total_score ?? 0) >= 80 ? 'text-green-400' : (ev.total_score ?? 0) >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                  {ev.total_score ?? calcTotalScore(ev, selectedReq)}
                                </span>
                                <span className="text-gray-500 text-xs ml-1">/ 100</span>
                              </td>
                              <td className="py-2 text-right">{ev.is_recommended ? <span className="text-green-400 text-xs">✅</span> : <span className="text-gray-600 text-xs">-</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-2 flex gap-3 text-xs text-gray-500 flex-wrap">
                        <span>90~100: 즉시 추천</span><span>80~89: 추천 가능</span><span>70~79: 조건부</span><span>60~69: 리스크</span><span>{'<60'}: 보류</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h2 className="text-amber-400 font-bold mb-4">§11. 최종 추천</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">최종 추천 공장</label>
                        <select value={recommendedFactory} onChange={e => setRecommendedFactory(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400">
                          <option value="">공장 선택...</option>
                          {factories.map(f => <option key={f.id} value={f.factory_name}>{f.factory_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">최종 결론 및 추천 근거</label>
                        <textarea value={finalConclusion} onChange={e => setFinalConclusion(e.target.value)} placeholder="바이어에게 전달할 최종 매칭 결론을 작성해 주세요..." rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400 resize-none" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <h2 className="text-amber-400 font-bold mb-4">§12. 다음 단계 액션 플랜</h2>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          {['#','단계','담당','기간','산출물'].map(h => <th key={h} className="text-left py-2 pr-3 text-gray-400">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          [1,'샘플 제작 의뢰','KERYX / 공장','3일','샘플 견적서'],
                          [2,'샘플비 결제','고객','1일','결제 확인서'],
                          [3,'1차 샘플 제작','공장','10~14일','샘플 사진/영상'],
                          [4,'샘플 검토','고객 / KERYX','3~5일','수정 요청서'],
                          [5,'최종 견적 확정','KERYX / 공장','3일','최종 견적서'],
                          [6,'양산 계약','고객 / 공장','3일','계약서 / PI'],
                          [7,'생산 중간 점검','KERYX','1일','점검 리포트'],
                          [8,'출고 전 검수','KERYX','2일','검수 리포트'],
                          [9,'출고 / 물류','물류사','7~14일','선적 서류'],
                        ].map(([n,task,owner,dur,out]) => (
                          <tr key={n} className="border-b border-gray-800">
                            <td className="py-1.5 pr-3 text-amber-400 font-bold">{n}</td>
                            <td className="py-1.5 pr-3 text-white">{task}</td>
                            <td className="py-1.5 pr-3 text-gray-400">{owner}</td>
                            <td className="py-1.5 pr-3 text-gray-400">{dur}</td>
                            <td className="py-1.5 text-gray-400">{out}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white">보고서 생성 및 저장</h3>
                        <p className="text-xs text-gray-400 mt-1">12섹션 보고서를 DB에 저장하고 관리자 검토 대기 상태로 전환합니다</p>
                        {reportSaved && <p className="text-xs text-green-400 mt-1">✅ 보고서가 저장되었습니다</p>}
                      </div>
                      <button onClick={generateAndSaveReport} disabled={generatingReport || !recommendedFactory || !finalConclusion} className="bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-amber-300 disabled:opacity-50 whitespace-nowrap">
                        {generatingReport ? '생성 중...' : reportSaved ? '보고서 재생성' : '보고서 생성 →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── TOP 매칭 통계 위젯 ────────────────────────────────────────────────────
function TopMatchingWidget() {
  const [stats, setStats] = useState<{ top_factories?: Array<{id:string;name:string;count:number}>; top_buyers?: Array<{id:string;name:string;count:number}> } | null>(null)
  useEffect(() => {
    fetch('/api/matching/stats').then(r => r.json()).then(d => setStats(d)).catch(() => {})
  }, [])
  if (!stats) return null
  const hasData = (stats.top_factories && stats.top_factories.length > 0) || (stats.top_buyers && stats.top_buyers.length > 0)
  if (!hasData) return null
  return (
    <div className="p-3 border-b border-gray-800 space-y-3">
      {stats.top_factories && stats.top_factories.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-400 mb-2">🏭 매칭 많은 공장 TOP 5</p>
          {stats.top_factories.map((f, i) => (
            <div key={f.id} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-yellow-400 text-gray-900' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{i+1}</span>
                <span className="text-xs text-gray-300 truncate max-w-[140px]">{f.name}</span>
              </div>
              <span className="text-xs font-bold text-amber-400">{f.count}건</span>
            </div>
          ))}
        </div>
      )}
      {stats.top_buyers && stats.top_buyers.length > 0 && (
        <div>
          <p className="text-xs font-bold text-blue-400 mb-2">🛒 매칭 많은 바이어 TOP 5</p>
          {stats.top_buyers.map((b, i) => (
            <div key={b.id || b.name} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-yellow-400 text-gray-900' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{i+1}</span>
                <span className="text-xs text-gray-300 truncate max-w-[140px]">{b.name}</span>
              </div>
              <span className="text-xs font-bold text-blue-400">{b.count}건</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
