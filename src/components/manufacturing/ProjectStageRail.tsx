type Lang = 'ko' | 'zh';

type ProjectStage = {
  id: string;
  stage_key: string;
  stage_order: number;
  stage_status: string;
  buyer_visible_note?: string | null;
};

const stageLabel: Record<string, { ko: string; zh: string }> = {
  intake: { ko: '접수', zh: '接收' },
  scoping: { ko: '기획 확인', zh: '需求确认' },
  matching: { ko: '방안 검토', zh: '方案审核' },
  sampling: { ko: '샘플', zh: '样品' },
  golden_sample: { ko: '골든샘플', zh: '大货样' },
  production: { ko: '양산', zh: '量产' },
  qc: { ko: '검수', zh: '验货' },
  shipment: { ko: '출하', zh: '出货' },
};

const stageStatus: Record<string, { ko: string; zh: string; className: string }> = {
  completed: { ko: '완료', zh: '已完成', className: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  active: { ko: '진행 중', zh: '进行中', className: 'border-orange-300 bg-orange-50 text-orange-950 ring-1 ring-orange-200' },
  blocked: { ko: '확인 필요', zh: '需要确认', className: 'border-amber-300 bg-amber-50 text-amber-950' },
  pending: { ko: '대기', zh: '待处理', className: 'border-stone-200 bg-stone-50 text-stone-700' },
};

export function ProjectStageRail({ stages, lang, showNotes = true }: { stages: ProjectStage[]; lang: Lang; showNotes?: boolean }) {
  const text = (ko: string, zh: string) => (lang === 'zh' ? zh : ko);

  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label={text('제조 프로젝트 진행 단계', '制造项目阶段')}>
      {stages.map((stage) => {
        const status = stageStatus[stage.stage_status] ?? stageStatus.pending;
        return (
          <li key={stage.id} className={`min-h-28 rounded-2xl border p-4 ${status.className}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black tracking-widest text-stone-400">{String(stage.stage_order).padStart(2, '0')}</p>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold">{lang === 'zh' ? status.zh : status.ko}</span>
            </div>
            <p className="mt-3 text-sm font-black">{stageLabel[stage.stage_key]?.[lang] ?? stage.stage_key}</p>
            {showNotes && stage.buyer_visible_note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">{stage.buyer_visible_note}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
