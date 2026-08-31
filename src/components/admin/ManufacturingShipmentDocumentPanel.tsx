'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileText, FileUp, Loader2 } from 'lucide-react';
import { useLangContext } from '@/components/layout/LangContext';

type Shipment = { id: string; status: string; shipping_method: string | null; shipment_reference: string | null };
type Document = { id: string; document_type: string; product_name_ko: string | null; product_name_en: string | null; product_name_en_source: string; status: string; buyer_visible: boolean; created_at: string; project_file: { id: string; original_filename: string; mime_type: string; byte_size: number } | null };

const documentTypes = [
  ['bl', 'B/L', 'B/L'], ['co', '원산지증명서(C/O)', '原产地证(C/O)'], ['inland_freight_invoice', '내륙 운임 인보이스', '内陆运费发票'], ['ocean_freight_invoice', '해상 운임 인보이스', '海运费发票'], ['commercial_invoice', '상업송장', '商业发票'], ['packing_list', '패킹리스트', '装箱单'], ['other', '기타 서류', '其他文件'],
] as const;

export function ManufacturingShipmentDocumentPanel({ projectId, shipment, onChanged }: { projectId: string; shipment: Shipment; onChanged: () => void }) {
  const { lang } = useLangContext();
  const text = useCallback((ko: string, zh: string) => (lang === 'zh' ? zh : ko), [lang]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number][0]>('commercial_invoice');
  const [productNameKo, setProductNameKo] = useState('');
  const [productNameEn, setProductNameEn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/manufacturing-projects/${projectId}/shipments/${shipment.id}/documents`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('선적 서류를 불러오지 못했습니다.', '无法加载出货单据。'));
      setDocuments(payload.documents ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : text('선적 서류를 불러오지 못했습니다.', '无法加载出货单据。')); }
  }, [projectId, shipment.id, text]);
  useEffect(() => { void load(); }, [load]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !productNameKo.trim() || !productNameEn.trim()) return;
    if (file.size > 10 * 1024 * 1024) { setError(text('선적 서류는 10MB 이하여야 합니다.', '出货单据必须小于等于10MB。')); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('file', file); form.set('documentType', documentType); form.set('productNameKo', productNameKo); form.set('productNameEn', productNameEn);
      const response = await fetch(`/api/admin/manufacturing-projects/${projectId}/shipments/${shipment.id}/documents`, { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('선적 서류를 올리지 못했습니다.', '无法上传出货单据。'));
      setFile(null); setProductNameKo(''); setProductNameEn('');
      setNotice(text('선적 서류를 비공개 검토 대기 상태로 등록했습니다.', '出货单据已登记为私有审核等待状态。'));
      await load(); onChanged();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : text('선적 서류를 올리지 못했습니다.', '无法上传出货单据。')); }
    finally { setBusy(false); }
  }

  async function decide(documentId: string, decision: 'approve' | 'revision_requested' | 'reject', buyerVisible = false) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/manufacturing-projects/${projectId}/shipments/${shipment.id}/documents/${documentId}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, buyerVisible }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || text('선적 서류를 처리하지 못했습니다.', '无法处理出货单据。'));
      setNotice(decision === 'approve' ? text('선적 서류를 승인했습니다.', '出货单据已批准。') : text('선적 서류 검토 결과를 저장했습니다.', '已保存出货单据审核结果。'));
      await load(); onChanged();
    } catch (decisionError) { setError(decisionError instanceof Error ? decisionError.message : text('선적 서류를 처리하지 못했습니다.', '无法处理出货单据。')); }
    finally { setBusy(false); }
  }

  return <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold text-stone-400">{shipment.shipping_method || '—'} · {shipment.shipment_reference || text('참조번호 미등록', '未登记参考编号')}</p><h3 className="mt-1 flex items-center gap-2 font-black text-stone-950"><FileText className="size-5 text-indigo-700" />{text('선적 서류 검토', '出货单据审核')}</h3></div><span className="w-fit rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">{shipment.status}</span></div>{error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}{notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
  <form onSubmit={upload} className="mt-5 grid gap-3 rounded-2xl bg-stone-50 p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-stone-600">{text('서류 유형', '单据类型')}<select value={documentType} onChange={(event) => setDocumentType(event.target.value as typeof documentType)} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900">{documentTypes.map(([value, ko, zh]) => <option key={value} value={value}>{lang === 'zh' ? zh : ko}</option>)}</select></label><label className="text-xs font-bold text-stone-600">{text('서류 파일 (PDF·JPEG·PNG·WebP, 최대 10MB)', '单据文件（PDF·JPEG·PNG·WebP，最大10MB）')}<input type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-stone-600">{text('제품명 (한국어)', '产品名称（韩文）')}<input required value={productNameKo} onChange={(event) => setProductNameKo(event.target.value)} maxLength={500} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900" /></label><label className="text-xs font-bold text-stone-600">{text('제품명 (영문)', '产品名称（英文）')}<input required value={productNameEn} onChange={(event) => setProductNameEn(event.target.value)} maxLength={500} className="mt-2 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm text-stone-900" /></label></div><p className="text-xs leading-5 text-stone-500">{text('영문 제품명은 운영자가 문서 원문을 확인해 직접 입력합니다. 중국어 제품명은 선적 서류 필드에 저장하지 않습니다.', '英文产品名由运营人员核对单据原文后直接输入。中文产品名不会存入出货单据字段。')}</p><button disabled={busy || !file || !productNameKo.trim() || !productNameEn.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-black text-stone-900 hover:bg-stone-100 disabled:opacity-50">{busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}{text('비공개 검토로 등록', '登记为私有审核')}</button></form>
  <div className="mt-5 space-y-3">{documents.length ? documents.map((document) => <article key={document.id} className="rounded-2xl border border-stone-100 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-black text-stone-900">{document.project_file?.original_filename || text('비공개 선적 서류', '私有出货单据')}</p><p className="mt-1 text-xs text-stone-500">{document.document_type} · {document.product_name_en || '—'} · {document.status}</p></div>{document.status === 'submitted' ? <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void decide(document.id, 'revision_requested')} className="min-h-10 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900 disabled:opacity-50">{text('보완 요청', '请求补充')}</button><button disabled={busy} onClick={() => void decide(document.id, 'approve', true)} className="min-h-10 rounded-xl bg-indigo-700 px-3 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50"><CheckCircle2 className="mr-1 inline size-3.5" />{text('승인·바이어 공개', '批准·向买家公开')}</button></div> : null}</div></article>) : <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{text('등록된 선적 서류가 없습니다.', '尚未登记出货单据。')}</p>}</div></section>;
}
