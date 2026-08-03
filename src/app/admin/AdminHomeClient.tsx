"use client";
/**
 * AdminHomeClient — 관리자 대시보드 홈
 * solution-architecture-foundation 스킬 준수: 인라인 스타일 금지
 * mobile-first-design 스킬 준수: 모바일 우선 반응형
 */
import { useState } from 'react';
import Link from 'next/link';
import { useLangContext } from '@/components/layout/LangContext';
import { createClient } from '@/lib/supabase/client';

interface Props {
  displayName: string;
  role: string;
  roleLabel: string;
  totalPending: number;
  pendingOrders: number;
  pendingPayments: number;
  pendingInspections: number;
  pendingResearch: number;
  pendingIp: number;
  pendingDesign: number;
  activeSellers: number;
  activeFactories: number;
  totalOrders: number;
  recentOrders: any[];
  chartData?: { month: string; orders: number; revenue: number }[];
}

const STATUS_LABELS: Record<string, [string, string, string]> = {
  confirmed:      ['확인됨',   '已确认', '#667eea'],
  in_production:  ['생산중',   '生产中', '#f59e0b'],
  qc_pending:     ['검수대기', '待检验', '#e11d48'],
  shipped:        ['배송중',   '运输中', '#10b981'],
  pending:        ['대기중',   '待处理', '#94a3b8'],
  completed:      ['완료',     '已完成', '#22c55e'],
  pending_admin_approval: ['승인대기', '待审批', '#e11d48'],
};

export default function AdminHomeClient({
  displayName, role, roleLabel, totalPending,
  pendingOrders, pendingPayments, pendingInspections, pendingResearch,
  pendingIp, pendingDesign, activeSellers, activeFactories, totalOrders, recentOrders, chartData,
}: Props) {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [showFactoryModal, setShowFactoryModal] = useState(false);

  return (
    <div className="kx-animate-in">

      {/* ── 히어로 배너 ── */}
      <div className="relative rounded-[20px] overflow-hidden mb-6 bg-gradient-to-br from-[#0a0a1a] via-[#1e293b] to-[#0f3460] px-6 py-8 text-white min-h-[200px]">
        {/* 배경 장식 */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-indigo-600/30 pointer-events-none" />
        <div className="absolute top-5 right-5 text-[80px] opacity-5 pointer-events-none select-none">⚙️</div>

        <div className="relative z-10">
          <span className="inline-block bg-indigo-600/30 border border-indigo-500/50 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-3">
            {t('관리 대시보드', '管理仪表板')}
          </span>
          <h1 className="text-[clamp(1.3rem,5vw,1.8rem)] font-black tracking-tight leading-tight mb-1.5">
            {t(`안녕하세요, ${displayName}님 👋`, `你好，${displayName} 👋`)}
          </h1>
          <span className="inline-block bg-indigo-600/25 border border-indigo-400/40 rounded-full px-2.5 py-0.5 text-[11px] font-bold mb-3">
            {lang === 'zh' ? (role === 'admin' ? '最高管理员' : role === 'md' ? 'MD' : '检验员') : roleLabel}
          </span>
          <p className="text-sm opacity-80 mb-5">
            {totalPending > 0
              ? t(`오늘 처리할 업무 ${totalPending}건`, `今日待处理 ${totalPending}件`)
              : t('오늘 처리할 긴급 업무가 없습니다 ✅', '今日无紧急待处理事项 ✅')
            }
          </p>
          <div className="flex gap-2.5 flex-wrap">
            {totalPending > 0 && (
              <Link
                href={pendingOrders > 0 ? '/admin/payments?tab=orders' : '/admin/payments'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold shadow-[0_4px_16px_rgba(225,29,72,0.5)] hover:bg-rose-700 transition-colors"
              >
                ⚡ {t(`${totalPending}건 처리`, `处理 ${totalPending}件`)}
              </Link>
            )}
            <Link
              href="/admin/partner-pipeline"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/10 border border-white/25 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              📊 {t('파트너 파이프라인', '合作伙伴管道')}
            </Link>
            <Link
              href="/admin/ip-proposals"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/10 border border-white/25 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              📌 {t('IP 제안 보드', 'IP提案看板')}
            </Link>
          </div>
        </div>
      </div>

      {/* ── 빠른 등록 ── */}
      <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
        {t('빠른 등록', '快速注册')}
      </p>
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { label: t('파트너 등록', '注册合作伙伴'), icon: '🤝', color: 'text-indigo-500', bg: 'bg-indigo-500/8', border: 'border-indigo-500/15', onClick: () => setShowSellerModal(true) },
          { label: t('카테고리 등록', '注册类别'), icon: '🏷️', color: 'text-violet-500', bg: 'bg-violet-500/8', border: 'border-violet-500/15', onClick: () => setShowCategoryModal(true) },
          { label: t('공장 등록', '注册工厂'), icon: '🏭', color: 'text-rose-500', bg: 'bg-rose-500/8', border: 'border-rose-500/15', onClick: () => setShowFactoryModal(true) },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`active:scale-95 transition-all flex flex-col items-center gap-2 p-4 rounded-2xl border ${item.bg} ${item.border} cursor-pointer text-center`}
          >
            <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center text-[22px]`}>
              {item.icon}
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">{item.label}</span>
            <span className={`text-[10px] font-semibold ${item.color}`}>+ {t('추가', '添加')}</span>
          </button>
        ))}
      </div>

      {/* ── 긴급 처리 현황 ── */}
      <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
        {t('긴급 처리 현황', '紧急处理状况')}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: t('주문 승인 대기', '订单待审批'), value: pendingOrders, href: '/admin/payments', icon: '📋', urgent: pendingOrders > 0 },
          { label: t('결제 승인 대기', '付款待审批'), value: pendingPayments, href: '/admin/payments', icon: '💳', urgent: pendingPayments > 0 },
          { label: t('검수 보고서', '检验报告'), value: pendingInspections, href: '/admin/inspections', icon: '🔍', urgent: pendingInspections > 0 },
          { label: t('시장조사 승인', '市场调研审批'), value: pendingResearch, href: '/admin/research', icon: '📊', urgent: pendingResearch > 0 },
        ].map((stat) => (
          <Link
            key={stat.href + stat.label}
            href={stat.href}
            className={`block p-4 rounded-2xl border no-underline shadow-[var(--shadow-sm)] ${
              stat.urgent
                ? 'bg-rose-50 border-rose-200'
                : 'bg-[var(--bg-base)] border-[var(--border-light)]'
            }`}
          >
            <div className="text-[28px] mb-2">{stat.icon}</div>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-1 font-medium">{stat.label}</p>
            <div className={`text-[32px] font-black tracking-tighter leading-none ${stat.urgent ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>
              {stat.value}
            </div>
            <p className={`text-[11px] font-medium mt-1.5 ${stat.urgent ? 'text-rose-600' : 'text-indigo-600'}`}>
              {stat.urgent ? t('처리 필요 →', '需要处理 →') : t('확인 →', '查看 →')}
            </p>
          </Link>
        ))}
      </div>

      {/* ── 플랫폼 현황 ── */}
      <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
        {t('플랫폼 현황', '平台状况')}
      </p>
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { label: t('활성 파트너', '活跃合作伙伴'), value: activeSellers, icon: '🤝', color: 'text-indigo-500', href: '/admin/partner-pipeline' },
          { label: t('활성 공장', '活跃工厂'), value: activeFactories, icon: '🏭', color: 'text-rose-500', href: '/admin/factories' },
          { label: t('총 주문', '总订单'), value: totalOrders, icon: '📦', color: 'text-emerald-500', href: '/admin/payments' },
        ].map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="block p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-light)] no-underline text-center shadow-[var(--shadow-sm)]"
          >
            <div className="text-[24px] mb-1.5">{stat.icon}</div>
            <div className={`text-[22px] font-black tracking-tight ${stat.color}`}>{stat.value}</div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-medium">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* ── 업무 도구 ── */}
      <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
        {t('업무 도구', '工作工具')}
      </p>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {[
          { label: t('IP 제안 보드', 'IP提案看板'), value: pendingIp, href: '/admin/ip-proposals', icon: '📌', colorClass: 'text-pink-500', bgClass: 'bg-pink-500/10' },
          { label: t('IP Studio', 'IP工作室'), value: pendingDesign, href: '/admin/ip-studio', icon: '🌟', colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10' },
          { label: t('MD 실적 비교', 'MD业绩比较'), value: t('전체 비교', '全面比较'), href: '/admin/md-performance', icon: '📈', colorClass: 'text-sky-500', bgClass: 'bg-sky-500/10' },
          { label: t('공장 평가 관리', '工厂评价管理'), value: t('평점 관리', '评分管理'), href: '/admin/factory-ratings', icon: '⭐', colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
        ].map((s) => (
          <Link
            key={s.href + s.label}
            href={s.href}
            className="block p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-light)] no-underline shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-[10px] ${s.bgClass} flex items-center justify-center text-lg shrink-0`}>
                {s.icon}
              </div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] leading-tight">{s.label}</p>
            </div>
            <div className={`text-xl font-bold tracking-tight ${typeof s.value === 'number' && s.value > 0 ? s.colorClass : 'text-[var(--text-primary)]'}`}>
              {s.value}
            </div>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">{t('열기 →', '打开 →')}</p>
          </Link>
        ))}
      </div>

      {/* ── 최근 주문 ── */}
      {recentOrders.length > 0 && (
        <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-light)] mb-6 overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="px-4 py-3.5 border-b border-[var(--border-light)] flex items-center justify-between">
            <span className="text-sm font-bold">{t('최근 주문', '最近订单')}</span>
            <Link href="/admin/payments" className="text-xs text-indigo-600 no-underline font-semibold">{t('전체 보기', '查看全部')}</Link>
          </div>
          {recentOrders.map((o: any, i: number) => {
            const [koLabel, zhLabel, statusColor] = STATUS_LABELS[o.status] ?? ['처리중', '处理中', '#94a3b8'];
            return (
              <Link
                key={o.id}
                href="/admin/payments"
                className={`px-4 py-3 flex items-center justify-between no-underline ${i < recentOrders.length - 1 ? 'border-b border-[var(--border-light)]' : ''}`}
              >
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{o.order_no}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{o.seller?.business_name ?? '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-indigo-600">¥{(o.total_cny ?? 0).toLocaleString()}</p>
                  <span
                    className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
                  >
                    {lang === 'zh' ? zhLabel : koLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── 포털 바로가기 ── */}
      <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-light)] p-4 shadow-[var(--shadow-sm)] mb-6">
        <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3.5">
          {t('포털 바로가기', '门户快捷入口')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { href: '/md', label: t('MD 대시보드', 'MD仪表板'), icon: '📊', colorClass: 'text-indigo-600', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/20', desc: t('MD 업무 관리', 'MD工作管理') },
            { href: '/seller', label: t('파트너 포털', '合作伙伴门户'), icon: '🤝', colorClass: 'text-blue-600', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/20', desc: t('파트너 뷰 미리보기', '合作伙伴视图预览') },
            { href: '/factory', label: t('공장 포털', '工厂门户'), icon: '🏭', colorClass: 'text-rose-600', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20', desc: t('공장 뷰 미리보기', '工厂视图预览') },
            { href: '/designer/tasks', label: t('디자이너', '设计师'), icon: '🎨', colorClass: 'text-violet-600', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/20', desc: t('디자인 작업', '设计任务') },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-3.5 rounded-xl ${item.bgClass} border ${item.borderClass} no-underline`}
            >
              <div className={`w-10 h-10 rounded-[10px] ${item.bgClass} flex items-center justify-center text-xl shrink-0`}>
                {item.icon}
              </div>
              <div>
                <p className="text-[13px] font-bold text-[var(--text-primary)]">{item.label}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 월별 주문 차트 ── */}
      {chartData && chartData.length > 0 && (
        <div className="bg-[var(--bg-base)] rounded-[20px] border border-[var(--border-light)] p-5 mb-6 shadow-[var(--shadow-xs)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {t('📊 월별 주문 현황 (최근 6개월)', '📊 月度订单情况（近6个月）')}
            </p>
          </div>

          {/* 바 차트 */}
          <div className="flex items-end gap-2 h-[120px] mb-2">
            {chartData.map((d, i) => {
              const maxOrders = Math.max(...chartData.map(x => x.orders), 1);
              const barH = Math.max((d.orders / maxOrders) * 100, d.orders > 0 ? 8 : 0);
              const isLast = i === chartData.length - 1;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-bold ${isLast ? 'text-indigo-600' : 'text-[var(--text-tertiary)]'}`}>
                    {d.orders > 0 ? d.orders : ''}
                  </span>
                  <div
                    className={`w-full rounded-t-sm transition-all duration-500 ${isLast ? 'bg-indigo-600' : 'bg-indigo-600/40'}`}
                    style={{ height: `${barH}%`, minHeight: d.orders > 0 ? 8 : 0 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            {chartData.map((d, i) => (
              <div
                key={d.month}
                className={`flex-1 text-center text-[10px] ${i === chartData.length - 1 ? 'text-indigo-600 font-bold' : 'text-[var(--text-tertiary)]'}`}
              >
                {d.month}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-indigo-600/8 rounded-xl p-3 text-center border border-indigo-600/20">
              <p className="text-lg font-extrabold text-indigo-600">{chartData[chartData.length - 1]?.orders ?? 0}</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{t('이번달 주문', '本月订单')}</p>
            </div>
            <div className="bg-emerald-500/8 rounded-xl p-3 text-center border border-emerald-500/20">
              <p className="text-lg font-extrabold text-emerald-600">¥{chartData[chartData.length - 1]?.revenue ?? 0}만</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{t('이번달 매출', '本月销售额')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── IP Studio 배너 ── */}
      <div className="relative rounded-[20px] overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] px-6 py-7 mb-8 text-white">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-violet-500/20 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[11px] font-semibold tracking-[0.1em] opacity-60 mb-2.5 uppercase">
            {t('KERYX IP Studio', 'KERYX IP工作室')}
          </p>
          <h2 className="text-lg font-black mb-2">
            🌟 {t('AI 캐릭터 IP 생성', 'AI角色IP生成')}
          </h2>
          <p className="text-sm opacity-75 mb-5 leading-relaxed">
            {t(
              '뿌찌프랜즈, 덕클, 디노몬 등 자체 IP를 AI로 생성하고 관리합니다.',
              '通过AI生成和管理自有IP，如뿌찌프랜즈、덕클、디노몬等。'
            )}
          </p>
          <Link
            href="/admin/ip-studio"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-bold shadow-[0_4px_16px_rgba(139,92,246,0.5)] hover:opacity-90 transition-opacity no-underline"
          >
            {t('IP Studio 열기 →', '打开IP工作室 →')}
          </Link>
        </div>
      </div>

      {/* ── 모달 ── */}
      {showCategoryModal && (
        <CategoryModal onClose={() => setShowCategoryModal(false)} lang={lang} />
      )}
      {showSellerModal && (
        <SellerRegisterModal onClose={() => setShowSellerModal(false)} lang={lang} />
      )}
      {showFactoryModal && (
        <FactoryRegisterModal onClose={() => setShowFactoryModal(false)} lang={lang} />
      )}
    </div>
  );
}

// ── 공통 인풋 클래스 ──
const inputCls = "w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border-default)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] outline-none box-border focus:border-indigo-400 transition-colors";
const labelCls = "block text-xs font-semibold text-[var(--text-secondary)] mb-1.5";

// ── 카테고리 등록 모달 ──
function CategoryModal({ onClose, lang }: { onClose: () => void; lang: string }) {
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient() as any;
  const [nameKo, setNameKo] = useState('');
  const [nameZh, setNameZh] = useState('');
  const [code, setCode] = useState('');
  const [icon, setIcon] = useState('📦');
  const [sortOrder, setSortOrder] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!nameKo.trim() || !nameZh.trim() || !code.trim()) {
      setError(t('한국어명, 중국어명, 코드는 필수입니다.', '韩文名、中文名、代码为必填项。'));
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('categories').insert({
      name_ko: nameKo.trim(),
      name_zh: nameZh.trim(),
      code: code.trim().toUpperCase(),
      icon: icon.trim() || '📦',
      display_order: parseInt(sortOrder) || 10,
      is_active: true,
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  return (
    <div className="kx-modal-backdrop" onClick={onClose}>
      <div className="kx-modal" onClick={e => e.stopPropagation()}>
        <div className="kx-modal-header">
          <div>
            <div className="kx-modal-title">🏷️ {t('카테고리 등록', '注册类别')}</div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{t('제품 분류 카테고리를 추가합니다', '添加产品分类类别')}</p>
          </div>
          <button onClick={onClose} className="active:scale-95 transition-all bg-[var(--bg-muted)] border-none rounded-full w-8 h-8 cursor-pointer text-base flex items-center justify-center">✕</button>
        </div>
        <div className="kx-modal-body">
          {done ? (
            <div className="text-center py-6">
              <div className="text-[64px] mb-4">✅</div>
              <p className="text-lg font-extrabold text-emerald-500 mb-2">{t('등록 완료!', '注册成功！')}</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-6">{t('카테고리가 추가되었습니다.', '类别已添加。')}</p>
              <button onClick={onClose} className="active:scale-95 transition-all px-8 py-3 rounded-xl bg-violet-600 text-white border-none text-sm font-bold cursor-pointer">{t('확인', '确认')}</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('한국어명 *', '韩文名 *')}</label>
                  <input className={inputCls} value={nameKo} onChange={e => setNameKo(e.target.value)} placeholder="인형" />
                </div>
                <div>
                  <label className={labelCls}>{t('중국어명 *', '中文名 *')}</label>
                  <input className={inputCls} value={nameZh} onChange={e => setNameZh(e.target.value)} placeholder="玩偶" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('코드 *', '代码 *')}</label>
                  <input className={inputCls} value={code} onChange={e => setCode(e.target.value)} placeholder="DOLL" />
                </div>
                <div>
                  <label className={labelCls}>{t('아이콘', '图标')}</label>
                  <input className={inputCls} value={icon} onChange={e => setIcon(e.target.value)} placeholder="🧸" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('정렬 순서', '排序顺序')}</label>
                <input className={inputCls} type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="10" />
              </div>
              {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-sm text-rose-600">⚠️ {error}</div>}
              <button
                onClick={submit}
                disabled={submitting}
                className={`active:scale-95 transition-all w-full py-3.5 rounded-xl text-white border-none text-sm font-bold cursor-pointer mt-1 ${submitting ? 'bg-neutral-400 cursor-wait' : 'bg-violet-600 hover:bg-violet-700'}`}
              >
                {submitting ? t('등록 중…', '注册中…') : t('카테고리 등록', '注册类别')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 바이어 등록 모달 ──
function SellerRegisterModal({ onClose, lang }: { onClose: () => void; lang: string }) {
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('KR');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!businessName.trim() || !email.trim()) {
      setError(t('상호명과 이메일은 필수입니다.', '公司名和邮箱为必填项。'));
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/admin/register-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name: businessName.trim(), contact_name: contactName.trim(), email: email.trim(), phone: phone.trim(), country }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? t('등록 실패. 다시 시도해 주세요.', '注册失败，请重试。'));
      return;
    }
    setDone(true);
  }

  return (
    <div className="kx-modal-backdrop" onClick={onClose}>
      <div className="kx-modal" onClick={e => e.stopPropagation()}>
        <div className="kx-modal-header">
          <div>
            <div className="kx-modal-title">🛍️ {t('바이어 등록', '注册买家')}</div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{t('새 바이어 계정을 생성합니다', '创建新买家账户')}</p>
          </div>
          <button onClick={onClose} className="active:scale-95 transition-all bg-[var(--bg-muted)] border-none rounded-full w-8 h-8 cursor-pointer text-base flex items-center justify-center">✕</button>
        </div>
        <div className="kx-modal-body">
          {done ? (
            <div className="text-center py-6">
              <div className="text-[64px] mb-4">✅</div>
              <p className="text-lg font-extrabold text-emerald-500 mb-2">{t('등록 완료!', '注册成功！')}</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-6">{t('바이어 계정이 생성되었습니다.', '买家账户已创建。')}</p>
              <button onClick={onClose} className="active:scale-95 transition-all px-8 py-3 rounded-xl bg-indigo-600 text-white border-none text-sm font-bold cursor-pointer">{t('확인', '确认')}</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>{t('상호명 *', '公司名 *')}</label>
                <input className={inputCls} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={t('예: 가자트레이드', '例如：가자트레이드')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('담당자명', '负责人姓名')}</label>
                  <input className={inputCls} value={contactName} onChange={e => setContactName(e.target.value)} placeholder={t('홍길동', '홍길동')} />
                </div>
                <div>
                  <label className={labelCls}>{t('국가', '国家')}</label>
                  <select className={inputCls} value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="KR">🇰🇷 한국</option>
                    <option value="JP">🇯🇵 일본</option>
                    <option value="US">🇺🇸 미국</option>
                    <option value="CN">🇨🇳 중국</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('이메일 *', '邮箱 *')}</label>
                <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seller@example.com" />
              </div>
              <div>
                <label className={labelCls}>{t('전화번호', '电话号码')}</label>
                <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+82-10-0000-0000" />
              </div>
              {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-sm text-rose-600">⚠️ {error}</div>}
              <button
                onClick={submit}
                disabled={submitting}
                className={`active:scale-95 transition-all w-full py-3.5 rounded-xl text-white border-none text-sm font-bold cursor-pointer mt-1 ${submitting ? 'bg-neutral-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {submitting ? t('등록 중…', '注册中…') : t('바이어 등록', '注册买家')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 공장 등록 모달 ──
function FactoryRegisterModal({ onClose, lang }: { onClose: () => void; lang: string }) {
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const [companyName, setCompanyName] = useState('');
  const [companyNameKo, setCompanyNameKo] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!companyName.trim() || !email.trim()) {
      setError(t('공장명(중문)과 이메일은 필수입니다.', '工厂名(中文)和邮筱为必填项。'));
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/admin/register-factory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName.trim(), company_name_ko: companyNameKo.trim(), contact_name: contactName.trim(), email: email.trim(), phone: phone.trim(), city: city.trim(), skip_approval: true }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? t('등록 실패. 다시 시도해 주세요.', '注册失败，请重试。'));
      return;
    }
    const result = await res.json().catch(() => ({}));
    setTempPassword(result.temp_password || '');
    setDone(true);
  }

  return (
    <div className="kx-modal-backdrop" onClick={onClose}>
      <div className="kx-modal" onClick={e => e.stopPropagation()}>
        <div className="kx-modal-header">
          <div>
            <div className="kx-modal-title">🏭 {t('공장 등록', '注册工厂')}</div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{t('새 공장 파트너를 등록합니다', '添加新工厂合作伙伴')}</p>
          </div>
          <button onClick={onClose} className="active:scale-95 transition-all bg-[var(--bg-muted)] border-none rounded-full w-8 h-8 cursor-pointer text-base flex items-center justify-center">✕</button>
        </div>
        <div className="kx-modal-body">
          {done ? (
            <div className="text-center py-6">
              <div className="text-[48px] mb-3">✅</div>
              <p className="text-lg font-extrabold text-emerald-500 mb-2">{t('등록 완료!', '注册成功！')}</p>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">{t('공장 계정이 생성되었습니다.', '工厂账户已创建。')}</p>
              {tempPassword && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-4 text-left">
                  <p className="text-xs font-bold text-amber-700 mb-1">⚠️ {t('임시 비밀번호 (최초 로그인 후 변경 필요)', '临时密码（首次登录后请修改）')}</p>
                  <p className="text-base font-mono font-black text-amber-900 tracking-widest select-all">{tempPassword}</p>
                  <p className="text-xs text-amber-600 mt-1">{t('이 화면을 닫으면 다시 확인할 수 없습니다.', '关闭此窗口后将无法再次查看。')}</p>
                </div>
              )}
              <button onClick={onClose} className="active:scale-95 transition-all px-8 py-3 rounded-xl bg-rose-600 text-white border-none text-sm font-bold cursor-pointer">{t('확인 (저장 완료)', '确认（已保存）')}</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('공장명 (中文) *', '工厂名 (中文) *')}</label>
                  <input className={inputCls} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="深圳市SENKANG工厂" />
                </div>
                <div>
                  <label className={labelCls}>{t('공장명 (한국어)', '工厂名 (韩文)')}</label>
                  <input className={inputCls} value={companyNameKo} onChange={e => setCompanyNameKo(e.target.value)} placeholder="센캉 공장" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('담당자명', '负责人姓名')}</label>
                  <input className={inputCls} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="张伟" />
                </div>
                <div>
                  <label className={labelCls}>{t('도시', '城市')}</label>
                  <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="深圳" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('이메일 *', '邮箱 *')}</label>
                <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="factory@example.com" />
              </div>
              <div>
                <label className={labelCls}>{t('전화번호', '电话号码')}</label>
                <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+86-755-0000-0000" />
              </div>
              {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 text-sm text-rose-600">⚠️ {error}</div>}
              <button
                onClick={submit}
                disabled={submitting}
                className={`active:scale-95 transition-all w-full py-3.5 rounded-xl text-white border-none text-sm font-bold cursor-pointer mt-1 ${submitting ? 'bg-neutral-400 cursor-wait' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {submitting ? t('등록 중…', '注册中…') : t('공장 등록', '注册工厂')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
