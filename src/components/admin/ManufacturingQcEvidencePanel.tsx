'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, ShieldCheck } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';

type Evidence = {
  id: string;
  evidence_type: string;
  caption: string | null;
  created_at: string;
  project_file: { id: string; original_filename: string; mime_type: string; byte_size: number } | null;
};

type QcReport = { id: string; round_no: number; inspection_stage: string; status: string; buyer_visible: boolean };

const evidenceTypes = [
  ['photo', '사진', '照片'], ['video', '영상', '视频'], ['document', '문서', '文件'], ['measurement', '측정값', '测量值'],
] as const;

export function ManufacturingQcEvidencePanel({ projectId, report, onChanged }: { projectId: string; report: QcReport; onChanged: () => void }) {
  const { lang } = useLangContext();
  const text = useCallback((ko: string, zh: string) => (lang === 'zh' ? zh : ko), [lang]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<(typeof evidenceTypes)[number][0]>('photo');
  const [caption, setCaption] = useState('');
  const [summaryKo, setSummaryKo] = useState('');
  const [summaryZh, setSummaryZh] = useState('');
  const [buyerVisible, setBuyerVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadEvidence = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/manufacturing-projects/${projectId}/qc-reports/${report.id}/evidence`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('QC 증빙을 불러오지 못했습니다.', '无法加载QC证据。'));
      setEvidence(payload.evidence ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : text('QC 증빙을 불러오지 못했습니다.', '无法加载QC证据。')); }
  }, [projectId, report.id, text]);

  useEffect(() => { void loadEvidence(); }, [loadEvidence]);

  async function uploadEvidence(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError(text('증빙 파일은 10MB 이하여야 합니다.', '证据文件必须小于等于10MB。')); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('file', file); form.set('evidenceType', evidenceType); form.set('caption', caption);
      const response = await fetch(`/api/admin/manufacturing-projects/${projectId}/qc-reports/${report.id}/evidence`, { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('QC 증빙을 올리지 못했습니다.', '无法上传QC证据。'));
      setFile(null); setCaption('');
      setNotice(text('QC 증빙을 비공개 저장소에 연결했습니다.', 'QC证据已连接至私有存储。'));
      await loadEvidence();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : text('QC 증빙을 올리지 못했습니다.', '无法上传QC证据。')); }
    finally { setBusy(false); }
  }

  async function decide(action: 'submit' | 'approve') {
    setBusy(true); setError(''); setNotice('');
    try {
      const body = action === 'submit' ? { action } : { action, buyerVisible, summaryKo, summaryZh };
      const response = await fetch(`/api/admin/manufacturing-projects/${projectId}/qc-reports/${report.id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('QC 상태를 변경하지 못했습니다.', '无法变更QC状态。'));
      setNotice(action === 'submit' ? text('QC 보고서를 제출했습니다. 이제 승인 여부를 결정할 수 있습니다.', 'QC报告已提交。现在可决定是否批准。') : text('QC 보고서를 승인했습니다. 바이어 공개 여부가 적용되었습니다.', 'QC报告已批准。买家公开设置已生效。'));
      onChanged();
    } catch (decisionError) { setError(decisionError instanceof Error ? decisionError.message : text('QC 상태를 변경하지 못했습니다.', '无法变更QC状态。')); }
    finally { setBusy(false); }
  }

  const canUpload = ['draft', 'revision_requested'].includes(report.status);
  return <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold text-stone-400">{text(`${report.round_no}차 · ${report.inspection_stage}`, `第${report.round_no}次 · ${report.inspection_stage}`)}</p><h3 className="mt-1 flex items-center gap-2 font-black text-stone-950"><ShieldCheck className="size-5 text-cyan-700" />{text('QC 증빙·승인', 'QC证据·批准')}</h3></div><span className="w-fit rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">{report.status}</span></div>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}{notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
    <div className="mt-5 rounded-2xl bg-stone-50 p-4"><p className="text-xs font-black text-stone-500">{text('연결된 증빙', '已连接证据')}</p><div className="mt-3 space-y-2">{evidence.length ? evidence.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm"><span className="min-w-0 truncate font-semibold text-stone-800">{item.project_file?.original_filename || text('비공개 증빙 파일', '私有证据文件')}</span><span className="shrink-0 text-xs font-bold text-stone-500">{item.evidence_type}</span></div>) : <p className="text-sm leading-6 text-stone-600">{text('아직 증빙이 없습니다. 제출 전 사진·영상·문서를 한 건 이상 연결해야 합니다.', '暂无证据。提交前至少需要连接一份照片、视频或文件。')}</p>}</div></div>
    {canUpload ? <form onSubmit={uploadEvidence} className="mt-5 grid gap-3"><label className="text-xs font-bold text-stone-600">{text('증빙 유형', '证据类型')}<select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as typeof evidenceType)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900">{evidenceTypes.map(([value, ko, zh]) => <option key={value} value={value}>{lang === 'zh' ? zh : ko}</option>)}</select></label><label className="text-xs font-bold text-stone-600">{text('파일 (JPEG·PNG·WebP·MP4·PDF, 최대 10MB)', '文件（JPEG·PNG·WebP·MP4·PDF，最大10MB）')}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-stone-600">{text('캡션', '说明')}<input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={1000} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900" /></label><button disabled={busy || !file} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-black text-stone-900 hover:bg-stone-50 disabled:opacity-50"><FileUp className="size-4" />{busy ? text('업로드 중', '上传中') : text('증빙 추가', '添加证据')}</button></form> : null}
    {report.status === 'draft' || report.status === 'revision_requested' ? <button disabled={busy || evidence.length === 0} onClick={() => void decide('submit')} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{text('증빙 검증 후 QC 제출', '验证证据后提交QC')}</button> : null}
    {report.status === 'submitted' ? <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4"><p className="text-sm font-black text-cyan-950">{text('바이어 공개 승인', '批准向买家公开')}</p><label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-cyan-950"><input type="checkbox" checked={buyerVisible} onChange={(event) => setBuyerVisible(event.target.checked)} className="size-4 accent-cyan-800" />{text('바이어 프로젝트룸에 QC 요약 공개', '在买家项目室公开QC摘要')}</label><textarea value={summaryKo} onChange={(event) => setSummaryKo(event.target.value)} placeholder={text('바이어 안내 (한국어)', '买家说明（韩文）')} maxLength={3000} rows={2} className="mt-3 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm text-stone-900" /><textarea value={summaryZh} onChange={(event) => setSummaryZh(event.target.value)} placeholder={text('바이어 안내 (중국어)', '买家说明（中文）')} maxLength={3000} rows={2} className="mt-3 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm text-stone-900" /><button disabled={busy} onClick={() => void decide('approve')} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-800 px-4 text-sm font-black text-white hover:bg-cyan-900 disabled:opacity-50"><CheckCircle2 className="size-4" />{text('QC 승인 저장', '保存QC批准')}</button></div> : null}
  </section>;
}
