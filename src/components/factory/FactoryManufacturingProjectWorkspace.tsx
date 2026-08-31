'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ClipboardList, Factory, FileText, PackageCheck, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';
import { ProjectStageRail } from '@/components/manufacturing/ProjectStageRail';

type Assignment = {
  id: string;
  status: string;
  assigned_at: string | null;
  selection_note: string | null;
  project: {
    id: string;
    project_no: string;
    project_name: string;
    product_category: string | null;
    product_summary: string | null;
    preferred_language: string | null;
    current_status: string;
    updated_at: string;
  } | null;
};

type Workspace = {
  assignment: { id: string; assigned_at: string | null; selection_note: string | null };
  project: Assignment['project'];
  brief: {
    product_name: string;
    product_description: string | null;
    target_quantity: number | null;
    target_market: string | null;
    required_by_date: string | null;
    material_preferences: string | null;
    dimensions_text: string | null;
    packaging_requirements: string | null;
    compliance_requirements: string | null;
  } | null;
  stages: Array<{ id: string; stage_key: string; stage_order: number; stage_status: string; buyer_visible_note?: string | null }>;
  updates: Array<{ id: string; update_type: string; factory_note: string; buyer_visible_note: string | null; buyer_visible: boolean; status: string; created_at: string; reviewed_at: string | null }>;
  qcReports: Array<{ id: string; round_no: number; inspection_stage: string; status: string; result: string | null; inspected_quantity: number | null; defect_summary: string | null; created_at: string }>;
  shipments: Array<{ id: string; status: string; shipping_method: string | null; shipment_reference: string | null; shipped_at: string | null; delivered_at: string | null }>;
};

const updateTypes = [
  { value: 'material', ko: '자재 준비', zh: '备料' },
  { value: 'sampling', ko: '샘플 작업', zh: '样品制作' },
  { value: 'production', ko: '양산 진행', zh: '量产进度' },
  { value: 'packing', ko: '포장 진행', zh: '包装进度' },
  { value: 'shipment_ready', ko: '출하 준비', zh: '待出货' },
  { value: 'issue', ko: '확인 필요 이슈', zh: '待确认问题' },
] as const;

const statusCopy: Record<string, { ko: string; zh: string; className: string }> = {
  draft: { ko: '초안', zh: '草稿', className: 'bg-stone-100 text-stone-700' },
  intake_submitted: { ko: '접수 완료', zh: '已提交', className: 'bg-sky-50 text-sky-800' },
  scoping: { ko: '기획 확인', zh: '需求确认', className: 'bg-violet-50 text-violet-800' },
  matching: { ko: '공장 검토', zh: '工厂审核', className: 'bg-amber-50 text-amber-800' },
  sampling: { ko: '샘플 진행', zh: '样品进行中', className: 'bg-orange-50 text-orange-900' },
  golden_sample: { ko: '골든샘플', zh: '大货样', className: 'bg-fuchsia-50 text-fuchsia-800' },
  production: { ko: '양산 진행', zh: '量产中', className: 'bg-emerald-50 text-emerald-800' },
  qc: { ko: '검수 진행', zh: '验货中', className: 'bg-cyan-50 text-cyan-800' },
  shipment_planning: { ko: '출하 준비', zh: '出货准备', className: 'bg-indigo-50 text-indigo-800' },
  shipped: { ko: '출하 완료', zh: '已出货', className: 'bg-emerald-100 text-emerald-900' },
  completed: { ko: '완료', zh: '已完成', className: 'bg-stone-900 text-white' },
};

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function FactoryManufacturingProjectWorkspace() {
  const { lang } = useLangContext();
  const locale = lang === 'zh' ? 'zh-CN' : 'ko-KR';
  const text = useCallback((ko: string, zh: string) => (lang === 'zh' ? zh : ko), [lang]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [factoryName, setFactoryName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateType, setUpdateType] = useState<(typeof updateTypes)[number]['value']>('production');
  const [factoryNote, setFactoryNote] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/factory/manufacturing-projects', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('프로젝트를 불러오지 못했습니다.', '无法加载项目。'));
      const nextAssignments = (payload.assignments ?? []).filter((item: Assignment) => item.project);
      setAssignments(nextAssignments);
      setFactoryName(payload.factory?.name ?? '');
      setSelectedId((current) => current && nextAssignments.some((item: Assignment) => item.project?.id === current) ? current : nextAssignments[0]?.project?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text('프로젝트를 불러오지 못했습니다.', '无法加载项目。'));
    } finally {
      setLoading(false);
    }
  }, [text]);

  const loadWorkspace = useCallback(async (projectId: string) => {
    setDetailLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/factory/manufacturing-projects/${projectId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('프로젝트 실행 정보를 불러오지 못했습니다.', '无法加载项目执行信息。'));
      setWorkspace(payload);
    } catch (loadError) {
      setWorkspace(null);
      setError(loadError instanceof Error ? loadError.message : text('프로젝트 실행 정보를 불러오지 못했습니다.', '无法加载项目执行信息。'));
    } finally {
      setDetailLoading(false);
    }
  }, [text]);

  useEffect(() => { void loadAssignments(); }, [loadAssignments]);
  useEffect(() => { if (selectedId) void loadWorkspace(selectedId); else setWorkspace(null); }, [selectedId, loadWorkspace]);

  const selectedAssignment = useMemo(() => assignments.find((item) => item.project?.id === selectedId) ?? null, [assignments, selectedId]);
  const projectStatus = workspace?.project?.current_status ?? selectedAssignment?.project?.current_status ?? 'draft';
  const status = statusCopy[projectStatus] ?? statusCopy.draft;

  async function submitUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !factoryNote.trim()) return;
    setSubmitting(true);
    setSuccess('');
    setError('');
    try {
      const response = await fetch(`/api/factory/manufacturing-projects/${selectedId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateType, factoryNote, buyerVisibleNote: buyerNote }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('진행 업데이트를 제출하지 못했습니다.', '无法提交进度更新。'));
      setFactoryNote('');
      setBuyerNote('');
      setSuccess(text('진행 업데이트를 운영 검토 대기 상태로 제출했습니다.', '进度更新已提交，等待运营审核。'));
      await loadWorkspace(selectedId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : text('진행 업데이트를 제출하지 못했습니다.', '无法提交进度更新。'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-stone-200 bg-white p-8 text-sm text-stone-600">{text('배정된 제조 프로젝트를 불러오는 중입니다.', '正在加载已分配的制造项目。')}</div>;
  }

  return (
    <section className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-black tracking-widest text-orange-200"><Factory className="size-4" /> {text('제조 실행 데스크', '制造执行工作台')}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{factoryName || text('공장 프로젝트', '工厂项目')}</h1>
            <p className="mt-3 text-sm leading-6 text-stone-300">{text('배정된 프로젝트의 사양을 확인하고, 작업 진행 사항을 운영팀에 제출하세요. 바이어에게 보일 내용은 검토 후에만 공개됩니다.', '确认已分配项目的规格并提交执行进度。面向买家的内容仅在运营审核后发布。')}</p>
          </div>
          <button type="button" onClick={() => void loadAssignments()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20">
            <RefreshCw className="size-4" /> {text('새로 고침', '刷新')}
          </button>
        </div>
      </header>

      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}
      {success ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{success}</div> : null}

      {assignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <ClipboardList className="mx-auto size-10 text-stone-400" />
          <h2 className="mt-4 text-lg font-black text-stone-950">{text('현재 배정된 제조 프로젝트가 없습니다.', '当前没有已分配的制造项目。')}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">{text('운영팀이 공장 배정을 완료하면 이 화면에서 제품 사양과 실행 요청을 확인할 수 있습니다.', '运营团队完成工厂分配后，您可在此查看产品规格和执行请求。')}</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-stone-200 bg-white p-3 shadow-sm xl:sticky xl:top-6 xl:h-fit">
            <div className="flex items-center justify-between px-3 py-3">
              <h2 className="text-sm font-black text-stone-950">{text('배정 프로젝트', '已分配项目')}</h2>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-800">{assignments.length}</span>
            </div>
            <div className="space-y-2">
              {assignments.map((item) => {
                const itemStatus = statusCopy[item.project?.current_status ?? 'draft'] ?? statusCopy.draft;
                const isSelected = item.project?.id === selectedId;
                return (
                  <button key={item.id} type="button" onClick={() => setSelectedId(item.project?.id ?? null)} className={`w-full rounded-2xl border p-4 text-left transition ${isSelected ? 'border-orange-300 bg-orange-50 shadow-sm' : 'border-transparent bg-stone-50 hover:border-stone-200 hover:bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-black text-stone-950">{item.project?.project_name}</p>
                      <ArrowUpRight className="size-4 shrink-0 text-stone-400" />
                    </div>
                    <p className="mt-2 text-xs font-bold tracking-wide text-stone-500">{item.project?.project_no}</p>
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${itemStatus.className}`}>{lang === 'zh' ? itemStatus.zh : itemStatus.ko}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {detailLoading || !workspace?.project ? <div className="rounded-3xl border border-stone-200 bg-white p-8 text-sm text-stone-600">{text('프로젝트 실행 정보를 불러오는 중입니다.', '正在加载项目执行信息。')}</div> : (
              <>
                <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black tracking-widest text-stone-400">{workspace.project.project_no}</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950">{workspace.project.project_name}</h2>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{workspace.project.product_summary || text('제품 요약이 아직 등록되지 않았습니다.', '尚未登记产品摘要。')}</p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-black ${status.className}`}>{lang === 'zh' ? status.zh : status.ko}</span>
                  </div>
                  <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-stone-100 pt-5 sm:grid-cols-4">
                    <div><dt className="text-xs font-bold text-stone-400">{text('제품군', '产品类别')}</dt><dd className="mt-1 text-sm font-bold text-stone-900">{workspace.project.product_category || '—'}</dd></div>
                    <div><dt className="text-xs font-bold text-stone-400">{text('목표 수량', '目标数量')}</dt><dd className="mt-1 text-sm font-bold text-stone-900">{workspace.brief?.target_quantity?.toLocaleString(locale) || '—'}</dd></div>
                    <div><dt className="text-xs font-bold text-stone-400">{text('희망 시장', '目标市场')}</dt><dd className="mt-1 text-sm font-bold text-stone-900">{workspace.brief?.target_market || '—'}</dd></div>
                    <div><dt className="text-xs font-bold text-stone-400">{text('요청 납기', '期望交期')}</dt><dd className="mt-1 text-sm font-bold text-stone-900">{formatDate(workspace.brief?.required_by_date, locale)}</dd></div>
                  </dl>
                </article>

                <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3"><span className="rounded-xl bg-stone-100 p-2 text-stone-700"><PackageCheck className="size-5" /></span><div><h2 className="font-black text-stone-950">{text('제조 단계', '制造阶段')}</h2><p className="mt-1 text-sm text-stone-600">{text('현재 단계와 이후 준비 항목을 확인하세요.', '查看当前阶段和后续准备事项。')}</p></div></div>
                  <div className="mt-5"><ProjectStageRail stages={workspace.stages} lang={lang === 'zh' ? 'zh' : 'ko'} showNotes={false} /></div>
                </article>

                <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                  <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex items-center gap-3"><span className="rounded-xl bg-orange-50 p-2 text-orange-800"><ClipboardList className="size-5" /></span><div><h2 className="font-black text-stone-950">{text('제품 사양', '产品规格')}</h2><p className="mt-1 text-sm text-stone-600">{text('현장 실행 전 반드시 운영팀에 확인할 정보입니다.', '现场执行前请与运营团队确认。')}</p></div></div>
                    <dl className="mt-5 divide-y divide-stone-100 rounded-2xl border border-stone-100 px-4">
                      {[
                        [text('제품 설명', '产品说明'), workspace.brief?.product_description],
                        [text('소재 선호', '材料偏好'), workspace.brief?.material_preferences],
                        [text('규격', '尺寸规格'), workspace.brief?.dimensions_text],
                        [text('포장 요구사항', '包装要求'), workspace.brief?.packaging_requirements],
                        [text('인증·준수 사항', '认证与合规'), workspace.brief?.compliance_requirements],
                      ].map(([label, value]) => <div key={String(label)} className="py-3"><dt className="text-xs font-bold text-stone-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-800">{value || '—'}</dd></div>)}
                    </dl>
                  </article>

                  <form onSubmit={submitUpdate} className="rounded-3xl border border-stone-900 bg-stone-900 p-5 text-white shadow-sm sm:p-6">
                    <div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-2 text-orange-200"><Send className="size-5" /></span><div><h2 className="font-black">{text('진행 업데이트 제출', '提交进度更新')}</h2><p className="mt-1 text-sm text-stone-300">{text('운영 검토 후 바이어 공개 여부가 결정됩니다.', '运营审核后决定是否向买家公开。')}</p></div></div>
                    <label className="mt-5 block text-xs font-bold text-stone-300">{text('진행 유형', '进度类型')}<select value={updateType} onChange={(event) => setUpdateType(event.target.value as typeof updateType)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white px-3 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300">{updateTypes.map((item) => <option key={item.value} value={item.value}>{lang === 'zh' ? item.zh : item.ko}</option>)}</select></label>
                    <label className="mt-4 block text-xs font-bold text-stone-300">{text('공장 작업 메모', '工厂工作备注')}<textarea value={factoryNote} onChange={(event) => setFactoryNote(event.target.value)} required maxLength={3000} rows={5} className="mt-2 w-full rounded-xl border border-white/15 bg-white px-3 py-2.5 text-sm leading-6 text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder={text('실행 현황, 확인이 필요한 이슈, 다음 작업을 기록해 주세요.', '请记录执行现状、需要确认的问题和下一步工作。')} /></label>
                    <label className="mt-4 block text-xs font-bold text-stone-300">{text('바이어 공개 제안 문구', '建议向买家公开的说明')}<textarea value={buyerNote} onChange={(event) => setBuyerNote(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-white/15 bg-white px-3 py-2.5 text-sm leading-6 text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-300" placeholder={text('운영팀이 검토·수정 후 공개합니다.', '由运营团队审核和修改后公开。')} /></label>
                    <button disabled={submitting || !factoryNote.trim()} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-300 px-4 text-sm font-black text-stone-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"><Send className="size-4" />{submitting ? text('제출 중', '正在提交') : text('운영 검토로 제출', '提交运营审核')}</button>
                  </form>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-cyan-700" /><h2 className="font-black text-stone-950">{text('QC·검수', 'QC·验货')}</h2></div><div className="mt-4 space-y-3">{workspace.qcReports.length ? workspace.qcReports.map((report) => <div key={report.id} className="rounded-2xl bg-stone-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-stone-900">{text(`${report.round_no}차 ${report.inspection_stage}`, `第${report.round_no}次 ${report.inspection_stage}`)}</p><span className="text-xs font-bold text-stone-500">{report.status}</span></div><p className="mt-2 text-xs text-stone-600">{report.defect_summary || text('검수 의견이 등록되면 표시됩니다.', '登记验货意见后显示。')}</p></div>) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{text('등록된 검수 보고서가 없습니다.', '暂无验货报告。')}</p>}</div></article>
                  <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><FileText className="size-5 text-indigo-700" /><h2 className="font-black text-stone-950">{text('출하·서류', '出货·单据')}</h2></div><div className="mt-4 space-y-3">{workspace.shipments.length ? workspace.shipments.map((shipment) => <div key={shipment.id} className="rounded-2xl bg-stone-50 p-4"><p className="text-sm font-bold text-stone-900">{shipment.shipping_method || text('운송 방식 확인 중', '运输方式待确认')}</p><p className="mt-2 text-xs text-stone-600">{shipment.shipment_reference || text('참조번호 미등록', '未登记参考编号')} · {shipment.status}</p></div>) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{text('출하 계획이 등록되면 관련 상태와 서류를 확인할 수 있습니다.', '登记出货计划后可查看状态和相关单据。')}</p>}</div></article>
                </div>

                <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-black text-stone-950">{text('제출한 진행 업데이트', '已提交的进度更新')}</h2><div className="mt-4 space-y-3">{workspace.updates.length ? workspace.updates.map((update) => <div key={update.id} className="rounded-2xl border border-stone-100 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-stone-900">{updateTypes.find((item) => item.value === update.update_type)?.[lang === 'zh' ? 'zh' : 'ko'] || update.update_type}</p><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">{update.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{update.factory_note}</p><p className="mt-3 text-xs font-bold text-stone-400">{formatDate(update.created_at, locale)} · {update.buyer_visible ? text('바이어 공개됨', '已向买家公开') : text('운영 검토 중', '等待运营审核')}</p></div>) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{text('아직 제출한 진행 업데이트가 없습니다.', '尚未提交进度更新。')}</p>}</div></article>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
