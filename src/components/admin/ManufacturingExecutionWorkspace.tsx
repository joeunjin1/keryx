'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Factory, FileText, PackageCheck, RefreshCw, ShipWheel, UserRoundCheck } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';
import { ManufacturingQcEvidencePanel } from '@/components/admin/ManufacturingQcEvidencePanel';
import { ManufacturingShipmentDocumentPanel } from '@/components/admin/ManufacturingShipmentDocumentPanel';
import { ManufacturingProjectSlaPanel } from '@/components/admin/ManufacturingProjectSlaPanel';

type FactoryOption = { id: string; name: string | null; company_name_ko: string | null; city: string | null; primary_category: string | null; status: string | null };
type FactoryAssignment = { id: string; factory_id: string; status: string; selection_note: string | null; assigned_at: string | null; released_at: string | null };
type QcReport = { id: string; round_no: number; inspection_stage: string; status: string; result: string | null; inspected_quantity: number | null; defect_summary: string | null; buyer_visible: boolean; buyer_visible_summary_ko: string | null; buyer_visible_summary_zh: string | null; created_at: string };
type Shipment = { id: string; status: string; shipping_method: string | null; shipment_reference: string | null; buyer_visible: boolean; created_at: string };

const inspectionStages = [
  ['pre_production', '생산 전 검수', '产前检验'],
  ['during_production', '생산 중 검수', '生产中检验'],
  ['pre_shipment', '출하 전 검수', '出货前检验'],
  ['container_loading', '컨테이너 상차 검수', '装柜检验'],
] as const;
const shippingMethods = [
  ['parcel', '택배', '快递'], ['air', '항공', '空运'], ['sea_lcl', '해상 LCL', '海运拼箱'], ['sea_fcl', '해상 FCL', '海运整柜'], ['rail', '철도', '铁路'], ['other', '기타', '其他'],
] as const;

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function formatDate(value: string | null | undefined, locale: string) { return value ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : '—'; }

export function ManufacturingExecutionWorkspace({ projectId }: { projectId: string }) {
  const { lang } = useLangContext();
  const text = useCallback((ko: string, zh: string) => (lang === 'zh' ? zh : ko), [lang]);
  const locale = lang === 'zh' ? 'zh-CN' : 'ko-KR';
  const [project, setProject] = useState<{ project_no: string; project_name: string; current_status: string } | null>(null);
  const [factories, setFactories] = useState<FactoryOption[]>([]);
  const [assignments, setAssignments] = useState<FactoryAssignment[]>([]);
  const [reports, setReports] = useState<QcReport[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedFactoryId, setSelectedFactoryId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [roundNo, setRoundNo] = useState('1');
  const [inspectionStage, setInspectionStage] = useState<(typeof inspectionStages)[number][0]>('pre_shipment');
  const [defectSummary, setDefectSummary] = useState('');
  const [shippingMethod, setShippingMethod] = useState<(typeof shippingMethods)[number][0]>('sea_lcl');
  const [shipmentReference, setShipmentReference] = useState('');
  const [shipmentSummaryKo, setShipmentSummaryKo] = useState('');
  const [shipmentSummaryZh, setShipmentSummaryZh] = useState('');
  const [shipmentVisible, setShipmentVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isUuid(projectId)) { setError(text('유효하지 않은 제조 프로젝트 주소입니다.', '制造项目地址无效。')); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [projectResponse, factoryResponse, qcResponse, shipmentResponse] = await Promise.all([
        fetch(`/api/admin/manufacturing-projects/${projectId}`, { cache: 'no-store' }),
        fetch(`/api/admin/manufacturing-projects/${projectId}/factory-assignment`, { cache: 'no-store' }),
        fetch(`/api/admin/manufacturing-projects/${projectId}/qc-reports`, { cache: 'no-store' }),
        fetch(`/api/admin/manufacturing-projects/${projectId}/shipments`, { cache: 'no-store' }),
      ]);
      const [projectData, factoryData, qcData, shipmentData] = await Promise.all([projectResponse.json(), factoryResponse.json(), qcResponse.json(), shipmentResponse.json()]);
      if (!projectResponse.ok || !factoryResponse.ok || !qcResponse.ok || !shipmentResponse.ok) throw new Error(projectData.error || factoryData.error || qcData.error || shipmentData.error || text('프로젝트 실행 정보를 불러오지 못했습니다.', '无法加载项目执行信息。'));
      setProject(projectData.project ?? projectData);
      setFactories(factoryData.factories ?? []); setAssignments(factoryData.assignments ?? []); setReports(qcData.reports ?? []); setShipments(shipmentData.shipments ?? []);
      const active = (factoryData.assignments ?? []).find((item: FactoryAssignment) => item.status === 'active');
      setSelectedFactoryId((current) => current || active?.factory_id || '');
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : text('프로젝트 실행 정보를 불러오지 못했습니다.', '无法加载项目执行信息。')); }
    finally { setLoading(false); }
  }, [projectId, text]);

  useEffect(() => { void load(); }, [load]);
  const activeAssignment = useMemo(() => assignments.find((item) => item.status === 'active') ?? null, [assignments]);
  const factoryName = useMemo(() => factories.find((item) => item.id === activeAssignment?.factory_id)?.company_name_ko || factories.find((item) => item.id === activeAssignment?.factory_id)?.name || null, [factories, activeAssignment]);

  async function invoke(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || text('저장하지 못했습니다.', '无法保存。'));
    return payload;
  }
  async function assignFactory(event: React.FormEvent) { event.preventDefault(); if (!selectedFactoryId) return; setSaving(true); setError(''); setNotice(''); try { await invoke(`/api/admin/manufacturing-projects/${projectId}/factory-assignment`, { factoryId: selectedFactoryId, selectionNote: assignmentNote }); setNotice(text('활성 공장을 배정했습니다. 기존 활성 배정은 안전하게 해제됩니다.', '已分配执行工厂。原激活分配将被安全解除。')); setAssignmentNote(''); await load(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : text('공장 배정에 실패했습니다.', '工厂分配失败。')); } finally { setSaving(false); } }
  async function createQc(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { await invoke(`/api/admin/manufacturing-projects/${projectId}/qc-reports`, { roundNo: Number(roundNo), inspectionStage, defectSummary }); setNotice(text('QC 보고서 초안을 생성했습니다. 증빙 파일을 연결한 뒤 제출하세요.', '已创建QC报告草稿。请连接证据文件后提交。')); setDefectSummary(''); await load(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : text('QC 보고서 생성에 실패했습니다.', '创建QC报告失败。')); } finally { setSaving(false); } }
  async function createShipment(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(''); setNotice(''); try { await invoke(`/api/admin/manufacturing-projects/${projectId}/shipments`, { status: shipmentVisible ? 'buyer_visible' : 'documents_pending', shippingMethod, shipmentReference, buyerVisible: shipmentVisible, summaryKo: shipmentSummaryKo, summaryZh: shipmentSummaryZh }); setNotice(text('선적 정보를 등록했습니다. 바이어 공개 여부와 서류 상태는 운영 이력에 기록됩니다.', '已登记出货信息。买家公开状态和单据状态将记录在运营历史中。')); setShipmentReference(''); setShipmentSummaryKo(''); setShipmentSummaryZh(''); setShipmentVisible(false); await load(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : text('선적 정보 생성에 실패했습니다.', '创建出货信息失败。')); } finally { setSaving(false); } }

  if (loading) return <div className="rounded-3xl border border-stone-200 bg-white p-8 text-sm text-stone-600">{text('제조 프로젝트 실행 정보를 불러오는 중입니다.', '正在加载制造项目执行信息。')}</div>;

  return <section className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="flex items-center gap-2 text-xs font-black tracking-widest text-orange-700"><ClipboardCheck className="size-4" /> {text('제조 프로젝트 실행', '制造项目执行')}</p><h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950">{project?.project_name || text('제조 프로젝트', '制造项目')}</h1><p className="mt-2 text-sm font-bold text-stone-500">{project?.project_no || '—'} · {project?.current_status || '—'}</p></div><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50"><RefreshCw className="size-4" />{text('새로 고침', '刷新')}</button></div></header>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}{notice ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</div> : null}
    <div className="grid gap-6 xl:grid-cols-3"><form onSubmit={assignFactory} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-orange-50 p-2 text-orange-800"><Factory className="size-5" /></span><div><h2 className="font-black text-stone-950">{text('실행 공장 배정', '分配执行工厂')}</h2><p className="mt-1 text-sm text-stone-600">{text('프로젝트에는 활성 공장 한 곳만 유지됩니다.', '每个项目仅保留一家激活工厂。')}</p></div></div><p className="mt-5 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">{factoryName ? `${text('현재 활성 공장', '当前激活工厂')}: ${factoryName}` : text('아직 활성 공장이 배정되지 않았습니다.', '尚未分配激活工厂。')}</p><label className="mt-4 block text-xs font-bold text-stone-500">{text('공장 선택', '选择工厂')}<select required value={selectedFactoryId} onChange={(event) => setSelectedFactoryId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900">{!selectedFactoryId ? <option value="">{text('공장을 선택하세요', '请选择工厂')}</option> : null}{factories.map((factory) => <option key={factory.id} value={factory.id}>{factory.company_name_ko || factory.name || factory.id}{factory.city ? ` · ${factory.city}` : ''}</option>)}</select></label><label className="mt-4 block text-xs font-bold text-stone-500">{text('배정 사유·현장 메모', '分配原因·现场备注')}<textarea value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm leading-6 text-stone-900" /></label><button disabled={saving || !selectedFactoryId} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-black text-white disabled:opacity-50"><UserRoundCheck className="size-4" />{text('활성 공장 배정', '分配激活工厂')}</button></form>
    <form onSubmit={createQc} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-2 text-cyan-800"><ClipboardCheck className="size-5" /></span><div><h2 className="font-black text-stone-950">{text('QC 보고서 시작', '开始QC报告')}</h2><p className="mt-1 text-sm text-stone-600">{text('증빙 파일 연결 후에만 제출할 수 있습니다.', '连接证据文件后方可提交。')}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-stone-500">{text('회차', '轮次')}<input type="number" min="1" max="100" value={roundNo} onChange={(event) => setRoundNo(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-900" /></label><label className="text-xs font-bold text-stone-500">{text('검수 단계', '检验阶段')}<select value={inspectionStage} onChange={(event) => setInspectionStage(event.target.value as typeof inspectionStage)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900">{inspectionStages.map(([value, ko, zh]) => <option key={value} value={value}>{lang === 'zh' ? zh : ko}</option>)}</select></label></div><label className="mt-4 block text-xs font-bold text-stone-500">{text('검수 계획·확인 사항', '检验计划·确认事项')}<textarea value={defectSummary} onChange={(event) => setDefectSummary(event.target.value)} maxLength={5000} rows={4} className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm leading-6 text-stone-900" /></label><button disabled={saving} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-50"><ClipboardCheck className="size-4" />{text('QC 초안 만들기', '创建QC草稿')}</button></form>
    <form onSubmit={createShipment} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-2 text-indigo-800"><ShipWheel className="size-5" /></span><div><h2 className="font-black text-stone-950">{text('출하·서류 시작', '开始出货·单据')}</h2><p className="mt-1 text-sm text-stone-600">{text('바이어 공개는 검토된 정보만 선택합니다.', '仅选择已审核的信息向买家公开。')}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-stone-500">{text('운송 방식', '运输方式')}<select value={shippingMethod} onChange={(event) => setShippingMethod(event.target.value as typeof shippingMethod)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900">{shippingMethods.map(([value, ko, zh]) => <option key={value} value={value}>{lang === 'zh' ? zh : ko}</option>)}</select></label><label className="text-xs font-bold text-stone-500">{text('참조번호', '参考编号')}<input value={shipmentReference} onChange={(event) => setShipmentReference(event.target.value)} maxLength={300} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-900" /></label></div><label className="mt-4 block text-xs font-bold text-stone-500">{text('바이어 안내 (한국어)', '买家说明（韩文）')}<textarea value={shipmentSummaryKo} onChange={(event) => setShipmentSummaryKo(event.target.value)} maxLength={3000} rows={2} className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-900" /></label><label className="mt-3 block text-xs font-bold text-stone-500">{text('바이어 안내 (중국어)', '买家说明（中文）')}<textarea value={shipmentSummaryZh} onChange={(event) => setShipmentSummaryZh(event.target.value)} maxLength={3000} rows={2} className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-900" /></label><label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl bg-stone-50 px-3 text-sm font-bold text-stone-800"><input type="checkbox" checked={shipmentVisible} onChange={(event) => setShipmentVisible(event.target.checked)} className="size-4 accent-stone-950" />{text('바이어에게 안내 공개', '向买家公开说明')}</label><button disabled={saving} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-black text-white hover:bg-indigo-800 disabled:opacity-50"><ShipWheel className="size-4" />{text('출하 정보 등록', '登记出货信息')}</button></form></div>
    <div className="grid gap-6 lg:grid-cols-2"><article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><ClipboardCheck className="size-5 text-cyan-700" /><h2 className="font-black text-stone-950">{text('QC 처리 현황', 'QC处理状态')}</h2></div><div className="mt-4 space-y-3">{reports.length ? reports.map((report) => <div key={report.id} className="rounded-2xl border border-stone-100 p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold text-stone-900">{text(`${report.round_no}차 ${report.inspection_stage}`, `第${report.round_no}次 ${report.inspection_stage}`)}</p><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">{report.status}</span></div><p className="mt-2 text-sm text-stone-600">{report.defect_summary || text('검수 메모 없음', '无检验备注')}</p></div>) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{text('등록된 QC 보고서가 없습니다.', '尚无QC报告。')}</p>}</div></article><article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><PackageCheck className="size-5 text-indigo-700" /><h2 className="font-black text-stone-950">{text('출하·서류 현황', '出货·单据状态')}</h2></div><div className="mt-4 space-y-3">{shipments.length ? shipments.map((shipment) => <div key={shipment.id} className="rounded-2xl border border-stone-100 p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold text-stone-900">{shipment.shipping_method || '—'}</p><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">{shipment.status}</span></div><p className="mt-2 text-sm text-stone-600">{shipment.shipment_reference || text('참조번호 미등록', '未登记参考编号')} · {formatDate(shipment.created_at, locale)}</p></div>) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{text('등록된 출하 계획이 없습니다.', '尚无出货计划。')}</p>}</div></article></div>
    <ManufacturingProjectSlaPanel projectId={projectId} onChanged={() => void load()} />
    {reports.filter((report) => ['draft', 'revision_requested', 'submitted'].includes(report.status)).map((report) => <ManufacturingQcEvidencePanel key={report.id} projectId={projectId} report={report} onChanged={() => void load()} />)}
    {shipments.map((shipment) => <ManufacturingShipmentDocumentPanel key={shipment.id} projectId={projectId} shipment={shipment} onChanged={() => void load()} />)}
    <p className="flex items-center gap-2 px-1 text-xs leading-5 text-stone-500"><CheckCircle2 className="size-4 shrink-0 text-emerald-700" />{text('공장 후보·내부 원가·마진·미검토 파일은 바이어 화면에 노출되지 않습니다. 모든 변경은 운영 이력에 남습니다.', '工厂候选、内部成本、利润和未审核文件不会向买家公开。所有变更均记录在运营历史中。')}</p>
  </section>;
}
