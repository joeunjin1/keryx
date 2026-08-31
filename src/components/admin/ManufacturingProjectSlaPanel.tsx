'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlarmClock, Loader2, Save } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';

type Target = { id: string; current_action_key: string; due_at: string; owner_user_id: string | null; owner_role: 'admin' | 'md' | 'factory' | 'seller'; buyer_notice_enabled: boolean; status: 'active' | 'paused' | 'completed' | 'cancelled' };
type Member = { id: string; full_name: string | null; kind: 'admin' | 'md' };
const actionOptions = [
  ['scoping', '기획 범위 확인', '需求范围确认'], ['factory_matching', '공장·방안 검토', '工厂·方案审核'], ['sample_review', '샘플 확인', '样品确认'], ['golden_sample', '골든샘플 확정', '大货样确认'], ['production_start', '양산 시작 승인', '量产启动批准'], ['qc_review', 'QC 검토', 'QC审核'], ['shipment_documents', '출하 서류 확인', '出货单据确认'], ['delivery_followup', '도착·후속 확인', '到货·后续确认'],
] as const;

function localDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ManufacturingProjectSlaPanel({ projectId, onChanged }: { projectId: string; onChanged: () => void }) {
  const { lang } = useLangContext();
  const text = useCallback((ko: string, zh: string) => (lang === 'zh' ? zh : ko), [lang]);
  const [target, setTarget] = useState<Target | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [actionKey, setActionKey] = useState<(typeof actionOptions)[number][0]>('scoping');
  const [dueAt, setDueAt] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [buyerNotice, setBuyerNotice] = useState(false);
  const [status, setStatus] = useState<Target['status']>('active');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [targetResponse, membersResponse] = await Promise.all([
        fetch(`/api/admin/manufacturing-projects/${projectId}/sla`, { cache: 'no-store' }),
        fetch('/api/admin/manufacturing-projects/assignable-members', { cache: 'no-store' }),
      ]);
      const [targetData, membersData] = await Promise.all([targetResponse.json(), membersResponse.json()]);
      if (!targetResponse.ok || !membersResponse.ok) throw new Error(targetData.error || membersData.error || text('SLA 설정을 불러오지 못했습니다.', '无法加载SLA设置。'));
      const loaded = targetData.target as Target | null;
      setTarget(loaded); setMembers(membersData.members ?? []);
      if (loaded) { setActionKey(loaded.current_action_key as typeof actionKey); setDueAt(localDateTime(loaded.due_at)); setOwnerId(loaded.owner_user_id ?? ''); setBuyerNotice(loaded.buyer_notice_enabled); setStatus(loaded.status); }
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : text('SLA 설정을 불러오지 못했습니다.', '无法加载SLA设置。')); }
  }, [projectId, text]);
  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dueAt || !ownerId) { setError(text('다음 행동 기한과 내부 담당자를 지정해 주세요.', '请指定下一工作期限和内部负责人。')); return; }
    const owner = members.find((member) => member.id === ownerId);
    if (!owner) { setError(text('유효한 내부 담당자를 선택해 주세요.', '请选择有效的内部负责人。')); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/manufacturing-projects/${projectId}/sla`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionKey, dueAt: new Date(dueAt).toISOString(), ownerUserId: ownerId, ownerRole: owner.kind, buyerNoticeEnabled: buyerNotice, status }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('SLA 설정을 저장하지 못했습니다.', '无法保存SLA设置。'));
      setTarget(payload.target); setNotice(text('다음 행동 기한과 담당자·바이어 알림 설정을 저장했습니다.', '已保存下一工作期限、负责人和买家通知设置。')); onChanged();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : text('SLA 설정을 저장하지 못했습니다.', '无法保存SLA设置。')); }
    finally { setBusy(false); }
  }

  return <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black tracking-wider text-amber-800"><AlarmClock className="size-4" />{text('SLA · 다음 행동 관리', 'SLA · 下一工作管理')}</p><h3 className="mt-2 font-black text-stone-950">{text('기한 전에 행동을 확정합니다', '在期限前确定行动')}</h3><p className="mt-1 text-sm leading-6 text-stone-600">{text('3일 전·1일 전·기한 경과 알림은 같은 대상에 하루 한 번만 기록됩니다.', '提前3天、提前1天和逾期提醒对同一对象每天只记录一次。')}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${target?.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{target?.status || text('미설정', '未设置')}</span></div>
  {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}{notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
  <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-stone-600">{text('다음 행동', '下一工作')}<select value={actionKey} onChange={(event) => setActionKey(event.target.value as typeof actionKey)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900">{actionOptions.map(([value, ko, zh]) => <option key={value} value={value}>{lang === 'zh' ? zh : ko}</option>)}</select></label><label className="text-xs font-bold text-stone-600">{text('완료 기한', '完成期限')}<input required type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-900" /></label><label className="text-xs font-bold text-stone-600">{text('내부 담당자', '内部负责人')}<select required value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900"><option value="">{text('담당자를 선택하세요', '请选择负责人')}</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name || text('이름 미등록', '未登记姓名')} · {member.kind}</option>)}</select></label><label className="text-xs font-bold text-stone-600">{text('관리 상태', '管理状态')}<select value={status} onChange={(event) => setStatus(event.target.value as Target['status'])} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900"><option value="active">{text('활성', '激活')}</option><option value="paused">{text('일시 중지', '暂停')}</option><option value="completed">{text('완료', '完成')}</option><option value="cancelled">{text('종료', '结束')}</option></select></label><label className="sm:col-span-2 flex min-h-11 items-center gap-3 rounded-xl bg-amber-50 px-3 text-sm font-bold text-amber-950"><input type="checkbox" checked={buyerNotice} onChange={(event) => setBuyerNotice(event.target.checked)} className="size-4 accent-amber-700" />{text('기한 임박·경과 안내를 바이어 프로젝트룸 알림함에도 표시', '在买家项目室通知中心也显示临期·逾期提醒')}</label><button disabled={busy} className="sm:col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-black text-white hover:bg-amber-800 disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{text('SLA 설정 저장', '保存SLA设置')}</button></form></section>;
}
