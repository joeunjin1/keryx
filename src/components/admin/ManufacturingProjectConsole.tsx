'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

type Project = { id: string; project_no: string; project_name: string; product_category: string | null; current_status: string; submitted_at: string | null; updated_at: string; sellers: { business_name: string | null } | null };
type AssignableMember = { id: string; full_name: string | null; kind: 'admin' | 'md' };

const transitionOptions = [
  ['scoping', '기획 범위 확인', '需求范围确认'], ['matching', '공장·방안 검토', '工厂·方案审核'], ['sampling', '샘플 진행', '样品进行中'], ['buyer_sample_review', '바이어 샘플 확인 요청', '请求买家确认样品'], ['golden_sample', '골든샘플 확정', '大货样确认'], ['production_planning', '양산 준비', '量产准备'], ['production', '양산 진행', '量产进行中'], ['qc', '검수 진행', '验货进行中'], ['shipment_planning', '출하 준비', '出货准备'], ['shipped', '출하 완료', '已出货'], ['completed', '프로젝트 완료', '项目完成'], ['cancelled', '종료', '结束'],
] as const;

export function ManufacturingProjectConsole() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => (lang === 'zh' ? zh : ko);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [transition, setTransition] = useState('scoping');
  const [buyerNote, setBuyerNote] = useState('');
  const [sampleType, setSampleType] = useState('development');
  const [sampleNote, setSampleNote] = useState('');
  const [approvalType, setApprovalType] = useState('sample');
  const [approvalTitle, setApprovalTitle] = useState('');
  const [quoteItemName, setQuoteItemName] = useState('');
  const [quoteQuantity, setQuoteQuantity] = useState('');
  const [quoteUnitPrice, setQuoteUnitPrice] = useState('');
  const [assignableMembers, setAssignableMembers] = useState<AssignableMember[]>([]);
  const [assignedMdId, setAssignedMdId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/manufacturing-projects', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || '제조 프로젝트 목록을 불러오지 못했습니다.');
      setProjects(body.projects ?? []);
      setSelected((current) => (current ? (body.projects ?? []).find((project: Project) => project.id === current.id) ?? null : null));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('제조 프로젝트 목록을 불러오지 못했습니다.', '无法加载制造项目列表。'));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/admin/manufacturing-projects/assignable-members', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || '담당자 목록을 불러오지 못했습니다.');
        if (active) setAssignableMembers(body.members ?? []);
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : '담당자 목록을 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, []);

  const runAction = async (path: string, body: Record<string, unknown>) => {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || '운영 변경을 저장하지 못했습니다.');
      setNotice(t('변경이 저장되었고 운영 이력에 기록되었습니다.', '变更已保存并记录在运营日志中。'));
      await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : t('운영 변경을 저장하지 못했습니다.', '无法保存运营变更。')); }
    finally { setBusy(false); }
  };

  const assignMd = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/manufacturing-projects/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assign_md', memberUserId: assignedMdId || null }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || '제조 담당자를 배정하지 못했습니다.');
      setNotice(t('제조 담당자 배정이 저장되고 운영 이력에 기록되었습니다.', '制造负责人分配已保存并记录在运营日志中。'));
    } catch (assignError) { setError(assignError instanceof Error ? assignError.message : t('제조 담당자를 배정하지 못했습니다.', '无法分配制造负责人。')); }
    finally { setBusy(false); }
  };

  const issueSimpleQuote = async () => {
    const quantity = Number(quoteQuantity);
    const unitPrice = Number(quoteUnitPrice);
    if (!quoteItemName.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setError(t('견적 품명·수량·단가를 확인해 주세요.', '请确认报价品名、数量和单价。'));
      return;
    }
    const subtotal = quantity * unitPrice;
    await runAction(`/api/admin/manufacturing-projects/${selected?.id}/quotes`, {
      currency: 'CNY',
      buyerVisibleItems: [{ name: quoteItemName.trim(), quantity, unitPrice, subtotal }],
      buyerVisibleTotal: subtotal,
    });
    setQuoteItemName('');
    setQuoteQuantity('');
    setQuoteUnitPrice('');
  };

  const handleTransition = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/manufacturing-projects/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'transition', toStatus: transition, buyerVisibleNote: buyerNote }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || '상태를 변경하지 못했습니다.');
      setNotice(t('프로젝트 상태가 변경되었고 바이어 공개 이력이 생성되었습니다.', '项目状态已变更，并生成了买家可见记录。'));
      setBuyerNote(''); await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : t('상태를 변경하지 못했습니다.', '无法变更状态。')); }
    finally { setBusy(false); }
  };

  return <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8"><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-black tracking-[0.16em] text-orange-700">MANUFACTURING OPS</p><h1 className="mt-2 text-2xl font-black text-stone-950">{t('제조 프로젝트 운영', '制造项目运营')}</h1><p className="mt-2 text-sm leading-6 text-stone-600">{t('바이어 접수부터 샘플·승인·양산·검수·출하까지 상태를 관리합니다. 비용·마진 원문은 이 화면에 노출하지 않습니다.', '管理从买家提交到样品、批准、量产、验货和出货的流程。本页面不显示成本和利润原始数据。')}</p></section>
    {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{notice && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]"><section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"><div className="border-b border-stone-200 px-5 py-4"><h2 className="font-black text-stone-950">{t('프로젝트 대기열', '项目队列')}</h2></div>{loading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-stone-100" />)}</div> : <div className="divide-y divide-stone-100">{projects.map((project) => <button key={project.id} onClick={() => setSelected(project)} className={`block min-h-20 w-full px-5 py-4 text-left transition hover:bg-stone-50 ${selected?.id === project.id ? 'bg-orange-50' : 'bg-white'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-stone-400">{project.project_no}</p><p className="mt-1 truncate text-sm font-black text-stone-900">{project.project_name}</p><p className="mt-1 text-xs text-stone-500">{project.sellers?.business_name || t('회사명 비공개', '公司名称不公开')}</p></div><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">{project.current_status}</span></div></button>)}{projects.length === 0 && <div className="p-10 text-center text-sm text-stone-500">{t('접수된 제조 프로젝트가 없습니다.', '暂无已提交的制造项目。')}</div>}</div>}</section>
      <aside className="space-y-6">{selected ? <><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-stone-400">{selected.project_no}</p><h2 className="mt-1 text-lg font-black text-stone-950">{selected.project_name}</h2><p className="mt-2 text-sm text-stone-600">{t('현재 상태: ', '当前状态：')}{selected.current_status}</p></section><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h3 className="font-black text-stone-950">{t('제조 담당자 배정', '分配制造负责人')}</h3><select value={assignedMdId} onChange={(event) => setAssignedMdId(event.target.value)} className="mt-4 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base"><option value="">{t('미배정', '未分配')}</option>{assignableMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name || t('이름 미등록', '未登记姓名')} · {member.kind}</option>)}</select><button disabled={busy} onClick={assignMd} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-black text-stone-800 hover:bg-stone-50 disabled:opacity-50">{t('담당자 저장', '保存负责人')}</button></section><form onSubmit={handleTransition} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h3 className="font-black text-stone-950">{t('단계 전환', '阶段转换')}</h3><label className="mt-4 block text-sm font-bold text-stone-800">{t('다음 상태', '下一状态')}<select value={transition} onChange={(event) => setTransition(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base"><option value="">{t('선택', '请选择')}</option>{transitionOptions.map(([value, ko, zh]) => <option key={value} value={value}>{t(ko, zh)}</option>)}</select></label><label className="mt-4 block text-sm font-bold text-stone-800">{t('바이어 공개 안내', '面向买家的说明')}<textarea value={buyerNote} onChange={(event) => setBuyerNote(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-3 text-base" rows={3} maxLength={2000} /></label><button disabled={busy || !transition} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-black text-white disabled:bg-stone-400">{busy ? t('저장 중…', '保存中…') : t('상태 변경', '变更状态')}</button></form><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h3 className="font-black text-stone-950">{t('샘플 회차 등록', '登记样品轮次')}</h3><select value={sampleType} onChange={(event) => setSampleType(event.target.value)} className="mt-4 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base"><option value="development">{t('개발 샘플', '开发样品')}</option><option value="revision">{t('수정 샘플', '修改样品')}</option><option value="golden_sample">{t('골든샘플', '大货样')}</option></select><textarea value={sampleNote} onChange={(event) => setSampleNote(event.target.value)} className="mt-3 w-full rounded-xl border border-stone-300 px-3 py-3 text-base" rows={3} maxLength={2000} placeholder={t('바이어에게 공개할 샘플 안내', '向买家公开的样品说明')} /><button disabled={busy} onClick={() => runAction(`/api/admin/manufacturing-projects/${selected.id}/samples`, { sampleType, buyerVisibleNote: sampleNote })} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-black text-stone-800 hover:bg-stone-50 disabled:opacity-50">{t('샘플 회차 등록', '登记样品轮次')}</button></section><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h3 className="font-black text-stone-950">{t('바이어 공개 견적', '面向买家的报价')}</h3><p className="mt-2 text-xs leading-5 text-stone-500">{t('CNY 기준의 바이어 공개 금액만 발행합니다. 공장 원가와 내부 마진은 별도 격리됩니다.', '仅发布面向买家的 CNY 金额。工厂成本与内部利润将独立隔离。')}</p><input value={quoteItemName} onChange={(event) => setQuoteItemName(event.target.value)} className="mt-4 min-h-12 w-full rounded-xl border border-stone-300 px-3 text-base" maxLength={200} placeholder={t('바이어 공개 품명', '面向买家公开的品名')} /><div className="mt-3 grid grid-cols-2 gap-3"><input value={quoteQuantity} onChange={(event) => setQuoteQuantity(event.target.value)} type="number" min="1" className="min-h-12 rounded-xl border border-stone-300 px-3 text-base" placeholder={t('수량', '数量')} /><input value={quoteUnitPrice} onChange={(event) => setQuoteUnitPrice(event.target.value)} type="number" min="0" step="0.01" className="min-h-12 rounded-xl border border-stone-300 px-3 text-base" placeholder={t('단가(CNY)', '单价(CNY)')} /></div><button disabled={busy || !quoteItemName.trim() || !quoteQuantity || !quoteUnitPrice} onClick={issueSimpleQuote} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-orange-300 bg-orange-50 px-4 text-sm font-black text-orange-800 hover:bg-orange-100 disabled:opacity-50">{t('견적 스냅샷 발행', '发布报价快照')}</button></section><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h3 className="font-black text-stone-950">{t('바이어 승인 요청', '买家批准请求')}</h3><select value={approvalType} onChange={(event) => setApprovalType(event.target.value)} className="mt-4 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base"><option value="sample">{t('샘플 확인', '样品确认')}</option><option value="golden_sample">{t('골든샘플 승인', '大货样批准')}</option><option value="quote">{t('견적 승인', '报价批准')}</option><option value="production_start">{t('양산 시작 승인', '量产启动批准')}</option><option value="qc_release">{t('QC 출하 승인', 'QC 出货批准')}</option><option value="shipment">{t('출하 확인', '出货确认')}</option></select><input value={approvalTitle} onChange={(event) => setApprovalTitle(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-stone-300 px-3 text-base" maxLength={200} placeholder={t('바이어에게 보일 요청 제목', '向买家显示的请求标题')} /><button disabled={busy || !approvalTitle.trim()} onClick={() => runAction(`/api/admin/manufacturing-projects/${selected.id}/approvals`, { approvalType, title: approvalTitle.trim(), buyerVisibleSnapshot: {} })} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-orange-600 px-4 text-sm font-black text-white hover:bg-orange-700 disabled:bg-orange-300">{t('승인 요청 발송', '发送批准请求')}</button></section></> : <section className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">{t('왼쪽에서 제조 프로젝트를 선택하세요.', '请从左侧选择制造项目。')}</section>}</aside></div></main>;
}
