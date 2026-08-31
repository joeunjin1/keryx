'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

type Project = {
  id: string;
  project_no: string;
  project_name: string;
  product_category: string | null;
  product_summary: string | null;
  current_status: string;
  created_at: string;
  updated_at: string;
};

const statusMeta: Record<string, { ko: string; zh: string; className: string }> = {
  draft: { ko: '초안', zh: '草稿', className: 'bg-stone-100 text-stone-700' },
  intake_submitted: { ko: '접수 검토', zh: '接收审核', className: 'bg-violet-100 text-violet-700' },
  scoping: { ko: '기획 범위 확인', zh: '需求范围确认', className: 'bg-blue-100 text-blue-700' },
  matching: { ko: '공장·방안 검토', zh: '工厂·方案审核', className: 'bg-cyan-100 text-cyan-700' },
  sampling: { ko: '샘플 진행', zh: '样品进行中', className: 'bg-amber-100 text-amber-800' },
  buyer_sample_review: { ko: '샘플 확인 요청', zh: '样品确认请求', className: 'bg-orange-100 text-orange-800' },
  golden_sample: { ko: '골든샘플 확정', zh: '大货样确认', className: 'bg-emerald-100 text-emerald-800' },
  production_planning: { ko: '양산 준비', zh: '量产准备', className: 'bg-sky-100 text-sky-800' },
  production: { ko: '양산 진행', zh: '量产进行中', className: 'bg-indigo-100 text-indigo-800' },
  qc: { ko: '검수 진행', zh: '验货进行中', className: 'bg-rose-100 text-rose-800' },
  shipment_planning: { ko: '출하 준비', zh: '出货准备', className: 'bg-fuchsia-100 text-fuchsia-800' },
  shipped: { ko: '출하 완료', zh: '已出货', className: 'bg-teal-100 text-teal-800' },
  completed: { ko: '프로젝트 완료', zh: '项目完成', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { ko: '종료', zh: '已结束', className: 'bg-stone-200 text-stone-600' },
};

export function ManufacturingProjectList() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => (lang === 'zh' ? zh : ko);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/buyer/projects', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || '제조 프로젝트를 불러오지 못했습니다.');
        if (active) setProjects(data.projects ?? []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : t('제조 프로젝트를 불러오지 못했습니다.', '无法加载制造项目。'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [lang]);

  const filtered = useMemo(() => projects.filter((project) => {
    if (filter === 'active') return !['draft', 'completed', 'cancelled'].includes(project.current_status);
    if (filter === 'pending') return ['draft', 'intake_submitted', 'buyer_sample_review'].includes(project.current_status);
    if (filter === 'completed') return ['completed', 'cancelled'].includes(project.current_status);
    return true;
  }), [filter, projects]);

  const count = (id: typeof filter) => {
    if (id === 'all') return projects.length;
    if (id === 'active') return projects.filter((project) => !['draft', 'completed', 'cancelled'].includes(project.current_status)).length;
    if (id === 'pending') return projects.filter((project) => ['draft', 'intake_submitted', 'buyer_sample_review'].includes(project.current_status)).length;
    return projects.filter((project) => ['completed', 'cancelled'].includes(project.current_status)).length;
  };

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-orange-700">MY MANUFACTURING</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">{t('제조 프로젝트', '制造项目')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{t('제품 요청부터 샘플·견적·양산·검수·출하까지, 바이어에게 공개되는 진행 상황과 승인 요청을 한 곳에서 확인합니다.', '从产品需求到样品、报价、量产、验货和出货，在此统一查看向买家公开的进度和确认请求。')}</p>
        </div>
        <Link href="/buyer/projects/new" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white no-underline transition hover:bg-stone-800">
          {t('새 제품 요청', '新增产品需求')}
        </Link>
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {([
          ['all', t('전체', '全部')],
          ['pending', t('확인 필요', '需要确认')],
          ['active', t('진행 중', '进行中')],
          ['completed', t('완료·종료', '完成·结束')],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold transition ${filter === id ? 'bg-orange-600 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'}`}>
            {label}<span className="ml-2 text-xs opacity-80">{count(id)}</span>
          </button>
        ))}
      </div>

      {loading && <div className="mt-6 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-3xl bg-stone-200" />)}</div>}
      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!loading && !error && filtered.length === 0 && <div className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><p className="text-lg font-black text-stone-900">{t('표시할 제조 프로젝트가 없습니다.', '暂无可显示的制造项目。')}</p><p className="mt-2 text-sm text-stone-500">{t('첫 제품 요청을 접수하면 이곳에서 진행 상황을 확인할 수 있습니다.', '提交首个产品需求后，可在此查看进度。')}</p><Link href="/buyer/projects/new" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-bold text-white no-underline">{t('제품 요청 시작', '开始提交需求')}</Link></div>}

      {!loading && !error && filtered.length > 0 && <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((project) => {
          const status = statusMeta[project.current_status] ?? { ko: project.current_status, zh: project.current_status, className: 'bg-stone-100 text-stone-700' };
          return <Link key={project.id} href={`/buyer/projects/${project.id}`} className="block rounded-3xl border border-stone-200 bg-white p-5 no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-stone-400">{project.project_no}</p><h2 className="mt-1 truncate text-lg font-black text-stone-950">{project.project_name}</h2></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{lang === 'zh' ? status.zh : status.ko}</span></div>
            {project.product_category && <p className="mt-4 text-xs font-bold text-orange-700">{project.product_category}</p>}
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{project.product_summary || t('제품 기획 정보를 정리하는 중입니다.', '正在整理产品需求信息。')}</p>
            <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-xs text-stone-500"><span>{t('최근 업데이트', '最近更新')} {new Date(project.updated_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}</span><span className="font-bold text-stone-900">{t('프로젝트룸 열기', '进入项目室')} →</span></div>
          </Link>;
        })}
      </div>}
    </main>
  );
}
