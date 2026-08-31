'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';
import { ProjectStageRail } from '@/components/manufacturing/ProjectStageRail';
import { BuyerManufacturingProjectNotifications } from '@/components/buyer/BuyerManufacturingProjectNotifications';

type RoomData = {
  project: { id: string; project_no: string; project_name: string; product_category: string | null; product_summary: string | null; current_status: string; created_at: string; submitted_at: string | null; cancellation_reason: string | null };
  briefs: Array<{ id: string; version_no: number; product_name: string; product_description: string | null; target_customer: string | null; target_quantity: number | null; target_market: string | null; required_by_date: string | null; material_preferences: string | null; dimensions_text: string | null; packaging_requirements: string | null; compliance_requirements: string | null; buyer_notes: string | null }>;
  stages: Array<{ id: string; stage_key: string; stage_order: number; stage_status: string; planned_start_on: string | null; planned_end_on: string | null; actual_start_at: string | null; actual_end_at: string | null; buyer_visible_note: string | null; updated_at: string }>;
  samples: Array<{ id: string; round_no: number; sample_type: string; status: string; buyer_visible_note: string | null; dispatched_at: string | null; received_at: string | null; approved_at: string | null }>;
  approvals: Array<{ id: string; approval_type: string; status: string; title: string; buyer_visible_snapshot: unknown; decision_note: string | null; requested_at: string; decided_at: string | null }>;
  quotes: Array<{ id: string; version_no: number; status: string; currency: string; buyer_visible_items: unknown; buyer_visible_total: unknown; issued_at: string | null; accepted_at: string | null }>;
  files: Array<{ id: string; sampleRoundId: string | null; kind: string; filename: string; mimeType: string; byteSize: number; createdAt: string; signedUrl: string }>;
  events: Array<{ id: string; event_type: string; detail: Record<string, unknown> | null; created_at: string }>;
};

const stageNames: Record<string, { ko: string; zh: string }> = {
  intake: { ko: '접수', zh: '接收' }, scoping: { ko: '기획', zh: '需求确认' }, matching: { ko: '방안 검토', zh: '方案审核' }, sampling: { ko: '샘플', zh: '样品' }, golden_sample: { ko: '골든샘플', zh: '大货样' }, production: { ko: '양산', zh: '量产' }, qc: { ko: '검수', zh: '验货' }, shipment: { ko: '출하', zh: '出货' },
};

const approvalNames: Record<string, { ko: string; zh: string }> = {
  sample: { ko: '샘플 확인', zh: '样品确认' }, golden_sample: { ko: '골든샘플 승인', zh: '大货样批准' }, quote: { ko: '견적 승인', zh: '报价批准' }, production_start: { ko: '양산 시작 승인', zh: '量产启动批准' }, qc_release: { ko: 'QC 출하 승인', zh: 'QC 出货批准' }, shipment: { ko: '출하 확인', zh: '出货确认' },
};

export function BuyerManufacturingProjectRoom({ projectId }: { projectId: string }) {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => (lang === 'zh' ? zh : ko);
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decisionId, setDecisionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/buyer/projects/${projectId}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || '제조 프로젝트 정보를 불러오지 못했습니다.');
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('제조 프로젝트 정보를 불러오지 못했습니다.', '无法加载制造项目信息。'));
    } finally {
      setLoading(false);
    }
  }, [projectId, lang]);

  useEffect(() => { load(); }, [load]);

  const latestBrief = data?.briefs?.[0];
  const pendingApprovals = useMemo(() => data?.approvals?.filter((approval) => approval.status === 'pending') ?? [], [data]);

  const decide = async (approvalId: string, decision: 'approved' | 'revision_requested' | 'rejected') => {
    const messages = {
      approved: t('이 승인 요청을 확정하시겠습니까? 확정 후 다음 제조 단계가 진행될 수 있습니다.', '确认批准此请求吗？批准后可进入下一制造阶段。'),
      revision_requested: t('수정 요청으로 전달하시겠습니까?', '确认提交修改请求吗？'),
      rejected: t('이 요청을 반려하시겠습니까?', '确认拒绝此请求吗？'),
    };
    if (!window.confirm(messages[decision])) return;
    const note = window.prompt(t('운영팀에 전달할 메모가 있으면 입력해 주세요. 없으면 비워 두세요.', '如有给运营团队的说明，请输入；没有可留空。')) ?? '';
    setDecisionId(approvalId);
    setError('');
    try {
      const response = await fetch(`/api/buyer/projects/${projectId}/approvals/${approvalId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, note }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || '승인 결정을 저장하지 못했습니다.');
      setNotice(t('결정이 저장되었습니다. 프로젝트 진행 상황을 새로 고쳤습니다.', '决定已保存，项目进度已刷新。'));
      await load();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : t('승인 결정을 저장하지 못했습니다.', '无法保存批准决定。'));
    } finally {
      setDecisionId(null);
    }
  };

  if (loading) return <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8"><div className="h-56 animate-pulse rounded-3xl bg-stone-200" /></main>;
  if (error && !data) return <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8"><div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}<Link href="/buyer/projects" className="mt-4 block font-bold text-red-800">{t('프로젝트 목록으로 돌아가기', '返回项目列表')}</Link></div></main>;
  if (!data) return null;

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-6 pb-16 sm:px-6 lg:px-8">
      <Link href="/buyer/projects" className="inline-flex min-h-11 items-center text-sm font-bold text-stone-600 no-underline hover:text-stone-950">← {t('제조 프로젝트 목록', '制造项目列表')}</Link>
      <section className="mt-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold text-stone-400">{data.project.project_no}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">{data.project.project_name}</h1>{data.project.product_category && <p className="mt-3 text-sm font-bold text-orange-700">{data.project.product_category}</p>}<p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{data.project.product_summary || t('운영팀이 제품 기획을 검토하고 있습니다.', '运营团队正在审核产品需求。')}</p></div><div className="rounded-2xl bg-stone-950 px-4 py-3 text-center text-white"><p className="text-xs font-medium text-stone-300">{t('현재 상태', '当前状态')}</p><p className="mt-1 text-sm font-black">{stageNames[data.project.current_status]?.[lang] || data.project.current_status}</p></div></div>
        {data.project.cancellation_reason && <p className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{t('종료 안내: ', '结束说明：')}{data.project.cancellation_reason}</p>}
      </section>

      {notice && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-stone-950">{t('진행 단계', '项目阶段')}</h2><p className="text-xs text-stone-500">{t('바이어 공개 기준', '面向买家公开')}</p></div><div className="mt-5"><ProjectStageRail stages={data.stages} lang={lang} /></div></section>

      {pendingApprovals.length > 0 && <section className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5 sm:p-7"><h2 className="text-lg font-black text-stone-950">{t('확인이 필요한 요청', '需要确认的请求')}</h2><p className="mt-2 text-sm leading-6 text-stone-700">{t('결정은 기록으로 남으며, 승인된 요청만 다음 핵심 제조 단계로 진행됩니다.', '您的决定会留下记录；只有获批准的事项才能进入下一关键制造阶段。')}</p><div className="mt-5 space-y-3">{pendingApprovals.map((approval) => <article key={approval.id} className="rounded-2xl border border-orange-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-stone-950">{approval.title || approvalNames[approval.approval_type]?.[lang] || approval.approval_type}</p><p className="mt-1 text-xs text-stone-500">{new Date(approval.requested_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}</p></div><div className="flex flex-wrap gap-2"><button disabled={decisionId === approval.id} onClick={() => decide(approval.id, 'revision_requested')} className="min-h-11 rounded-xl border border-stone-300 px-3 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50">{t('수정 요청', '要求修改')}</button><button disabled={decisionId === approval.id} onClick={() => decide(approval.id, 'approved')} className="min-h-11 rounded-xl bg-stone-950 px-4 text-sm font-black text-white hover:bg-stone-800 disabled:opacity-50">{decisionId === approval.id ? t('저장 중…', '保存中…') : t('승인', '批准')}</button></div></div></article>)}</div></section>}

      <div className="mt-6"><BuyerManufacturingProjectNotifications projectId={projectId} /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-black text-stone-950">{t('제품 기획', '产品需求')}</h2>{latestBrief ? <dl className="mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><dt className="text-xs font-bold text-stone-400">{t('제품명', '产品名称')}</dt><dd className="mt-1 text-base font-black text-stone-900">{latestBrief.product_name}</dd></div>{[['목표 고객', '目标客户', latestBrief.target_customer], ['예상 수량', '预计数量', latestBrief.target_quantity ? `${latestBrief.target_quantity.toLocaleString()}${t('개', '个')}` : null], ['판매·유통 시장', '销售·流通市场', latestBrief.target_market], ['희망 일정', '期望时间', latestBrief.required_by_date], ['사이즈·규격', '尺寸·规格', latestBrief.dimensions_text], ['소재·색상', '材质·颜色', latestBrief.material_preferences]].map(([ko, zh, value]) => value ? <div key={ko as string}><dt className="text-xs font-bold text-stone-400">{t(ko as string, zh as string)}</dt><dd className="mt-1 text-sm leading-6 text-stone-700">{value as string}</dd></div> : null)}{latestBrief.product_description && <div className="sm:col-span-2"><dt className="text-xs font-bold text-stone-400">{t('상세 설명', '详细说明')}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{latestBrief.product_description}</dd></div>}</dl> : <p className="mt-4 text-sm text-stone-500">{t('제품 기획을 불러오는 중입니다.', '正在加载产品需求。')}</p>}</section>
        <aside className="space-y-6"><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-stone-950">{t('첨부 파일', '附件')}</h2>{data.files.length ? <ul className="mt-4 space-y-2">{data.files.map((file) => <li key={file.id}><a href={file.signedUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 text-sm font-bold text-stone-700 no-underline hover:bg-stone-100"><span className="min-w-0 truncate">{file.filename}</span><span className="shrink-0 text-xs text-orange-700">{t('열기', '打开')}</span></a></li>)}</ul> : <p className="mt-4 text-sm text-stone-500">{t('공개된 파일이 없습니다.', '暂无公开文件。')}</p>}</section>
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-stone-950">{t('샘플·견적', '样品·报价')}</h2><div className="mt-4 space-y-3">{data.samples.map((sample) => <div key={sample.id} className="rounded-xl bg-stone-50 p-3"><p className="text-sm font-bold text-stone-900">{t(`샘플 ${sample.round_no}차`, `第 ${sample.round_no} 次样品`)}</p><p className="mt-1 text-xs text-stone-600">{sample.buyer_visible_note || t('운영팀이 샘플 진행 내용을 업데이트합니다.', '运营团队将更新样品进度。')}</p></div>)}{data.quotes.map((quote) => <div key={quote.id} className="rounded-xl bg-stone-50 p-3"><p className="text-sm font-bold text-stone-900">{t(`견적 ${quote.version_no}차`, `第 ${quote.version_no} 版报价`)}</p><p className="mt-1 text-xs text-stone-600">{quote.status}</p></div>)}{data.samples.length === 0 && data.quotes.length === 0 && <p className="text-sm text-stone-500">{t('샘플 또는 견적이 준비되면 이곳에 표시됩니다.', '样品或报价准备后将在此显示。')}</p>}</div></section></aside>
      </div>

      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-black text-stone-950">{t('진행 이력', '进度记录')}</h2>{data.events.length ? <ol className="mt-5 space-y-3">{data.events.map((event) => <li key={event.id} className="border-l-2 border-stone-200 pl-4"><p className="text-sm font-bold text-stone-800">{event.event_type.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-stone-500">{new Date(event.created_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}</p></li>)}</ol> : <p className="mt-4 text-sm text-stone-500">{t('표시할 진행 이력이 없습니다.', '暂无可显示的进度记录。')}</p>}</section>
    </main>
  );
}
