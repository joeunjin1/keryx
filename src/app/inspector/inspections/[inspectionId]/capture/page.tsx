'use client';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Camera, X, ChevronRight, ChevronLeft,
  CheckCircle, XCircle, AlertCircle, Send, Plus, Trash2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   검수원 현장 입력 페이지 (모바일 최적화)
   1단계: 검수원이 현장에서 수량/불량/사진 입력
   → 완료 시 status: 'in_progress' → 'review' (MD 검토 요청)
   ───────────────────────────────────────────────────────────── */

type InspectionItem = {
  id: string;
  label_zh: string;
  label_ko: string | null;
  result: string | null;
  qty_passed: number | null;
  qty_failed: number | null;
  notes: string | null;
  photos: Array<{ id: string; url: string; photo_kind: string }>;
};

const RESULT_OPTIONS = [
  { value: 'pass',    label_ko: '합격',   label_zh: '合格',   icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-300' },
  { value: 'partial', label_ko: '부분합격', label_zh: '部分合格', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-300' },
  { value: 'fail',    label_ko: '불합격',  label_zh: '不合格', icon: XCircle,     color: 'text-red-600 bg-red-50 border-red-300' },
];

export default function InspectorCapturePage({
  params,
}: {
  params: { inspectionId: string };
}) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [lang, setLang] = useState<'ko' | 'zh'>('zh');
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [outcome, setOutcome] = useState<'pass' | 'partial_pass' | 'fail'>('pass');
  const [inspectorComment, setInspectorComment] = useState('');
  const [totalMinutes, setTotalMinutes] = useState(60);
  const [uploadKind, setUploadKind] = useState<'normal' | 'defect'>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data: insp } = await supabase
      .from('inspections')
      .select('*, order:orders(order_no, items:order_items(qty))')
      .eq('id', params.inspectionId)
      .single();
    setInspection(insp);

    const { data: it } = await supabase
      .from('inspection_items')
      .select('*, photos:inspection_photos(id, url, photo_kind)')
      .eq('inspection_id', params.inspectionId)
      .order('display_order');
    setItems((it ?? []) as InspectionItem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.inspectionId]);

  const current = items[currentIdx];

  async function updateCurrent(patch: Partial<InspectionItem>) {
    if (!current) return;
    const updated = { ...current, ...patch };
    setItems(cur => cur.map((it, i) => (i === currentIdx ? updated : it)));
    setSaving(true);
    await fetch(`/api/inspection-items/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: updated.result,
        qty_passed: updated.qty_passed,
        qty_failed: updated.qty_failed,
        notes: updated.notes,
      }),
    });
    setSaving(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !current) return;
    const file = e.target.files[0];
    setSaving(true);

    const ext = file.name.split('.').pop();
    const path = `inspections/${params.inspectionId}/${current.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('inspection-photos')
      .upload(path, file, { upsert: false });

    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(path);

      await fetch('/api/inspection-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_item_id: current.id,
          inspection_id: params.inspectionId,
          url: publicUrl,
          photo_kind: uploadKind,
        }),
      });
      await load();
    }
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function deletePhoto(photoId: string) {
    await fetch(`/api/inspection-photos?id=${photoId}`, { method: 'DELETE' });
    await load();
  }

  async function handleFinalize() {
    setSubmitting(true);
    try {
      // 1단계 완료: status → review (MD 검토 요청)
      const res = await fetch(`/api/inspections/${params.inspectionId}/complete`, {
        // 실제 API 경로: /api/inspections/[inspectionId]/[action] → action=complete
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          inspector_comment: inspectorComment,
          total_minutes: totalMinutes,
        }),
      });
      if (res.ok) {
        router.push('/inspector');
      } else {
        const err = await res.json();
        alert(err.error ?? (lang === 'ko' ? '제출 실패' : '提交失败'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500">{lang === 'ko' ? '검수 정보를 찾을 수 없습니다' : '未找到检验信息'}</p>
          <Link href="/inspector" className="mt-4 inline-block text-blue-600 text-sm">
            {lang === 'ko' ? '← 목록으로' : '← 返回列表'}
          </Link>
        </div>
      </div>
    );
  }

  const totalItems = items.length;
  const completedItems = items.filter(i => i.result !== null).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/inspector" className="p-1 -ml-1 text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">{inspection.inspection_no}</p>
              <p className="font-semibold text-gray-900 text-sm truncate">
                {inspection.product_name ?? (lang === 'ko' ? '상품명 미입력' : '未填写商品名')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(l => l === 'ko' ? 'zh' : 'ko')}
                className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500"
              >
                {lang === 'ko' ? '中文' : '한국어'}
              </button>
              {saving && (
                <span className="text-xs text-blue-500 animate-pulse">
                  {lang === 'ko' ? '저장중' : '保存中'}
                </span>
              )}
            </div>
          </div>

          {/* 진행률 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {completedItems}/{totalItems}
            </span>
          </div>
        </div>
      </header>

      {/* 항목 네비게이션 */}
      {items.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIdx(idx)}
              className={`flex-shrink-0 w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                idx === currentIdx
                  ? 'bg-blue-600 text-white'
                  : item.result !== null
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* 현재 항목 입력 */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {current ? (
          <>
            {/* 항목 제목 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  {lang === 'ko' ? `항목 ${currentIdx + 1}/${totalItems}` : `项目 ${currentIdx + 1}/${totalItems}`}
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {lang === 'ko' ? (current.label_ko ?? current.label_zh) : current.label_zh}
              </p>
            </div>

            {/* 결과 선택 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {lang === 'ko' ? '검수 결과' : '检验结果'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {RESULT_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateCurrent({ result: opt.value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        current.result === opt.value
                          ? opt.color + ' border-current'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">
                        {opt[`label_${lang}` as 'label_ko' | 'label_zh']}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 수량 입력 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {lang === 'ko' ? '수량 입력' : '数量录入'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {lang === 'ko' ? '합격 수량' : '合格数量'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={current.qty_passed ?? ''}
                    onChange={e => updateCurrent({ qty_passed: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {lang === 'ko' ? '불량 수량' : '不合格数量'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={current.qty_failed ?? ''}
                    onChange={e => updateCurrent({ qty_failed: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* 메모 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {lang === 'ko' ? '특이사항 메모' : '备注说明'}
              </p>
              <textarea
                value={current.notes ?? ''}
                onChange={e => updateCurrent({ notes: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={lang === 'ko' ? '특이사항을 입력하세요...' : '请输入备注说明...'}
              />
            </div>

            {/* 사진 첨부 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {lang === 'ko' ? '사진 첨부' : '附加照片'}
              </p>

              {/* 사진 종류 선택 */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setUploadKind('normal')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    uploadKind === 'normal'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {lang === 'ko' ? '일반 사진' : '普通照片'}
                </button>
                <button
                  onClick={() => setUploadKind('defect')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    uploadKind === 'defect'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {lang === 'ko' ? '불량 사진' : '不良照片'}
                </button>
              </div>

              {/* 사진 목록 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {current.photos.map(photo => (
                  <div key={photo.id} className="relative aspect-square">
                    <Image
                      src={photo.url}
                      alt="inspection"
                      fill
                      className="object-cover rounded-lg"
                    />
                    {photo.photo_kind === 'defect' && (
                      <span className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 rounded">
                        {lang === 'ko' ? '불량' : '不良'}
                      </span>
                    )}
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* 사진 추가 버튼 */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">{lang === 'ko' ? '추가' : '添加'}</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* 이전/다음 네비게이션 */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm font-medium disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                {lang === 'ko' ? '이전' : '上一项'}
              </button>
              {currentIdx < totalItems - 1 ? (
                <button
                  onClick={() => setCurrentIdx(i => Math.min(totalItems - 1, i + 1))}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium"
                >
                  {lang === 'ko' ? '다음' : '下一项'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowFinalize(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  {lang === 'ko' ? 'MD에 전달' : '提交给MD'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <p className="text-gray-400 text-sm">
              {lang === 'ko' ? '검수 항목이 없습니다' : '暂无检验项目'}
            </p>
          </div>
        )}
      </div>

      {/* 최종 제출 모달 */}
      {showFinalize && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {lang === 'ko' ? 'MD에게 검수 결과 전달' : '向MD提交检验结果'}
            </h2>
            <p className="text-sm text-gray-500">
              {lang === 'ko'
                ? '검수 완료 후 MD가 보고서를 정리하고 관리자 승인을 받습니다.'
                : '检验完成后，MD将整理报告并提交管理员审批。'}
            </p>

            {/* 종합 결과 */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {lang === 'ko' ? '종합 결과' : '综合结论'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'pass' as const,         label_ko: '합격',       label_zh: '合格',     color: 'bg-green-600' },
                  { value: 'partial_pass' as const, label_ko: '조건부합격', label_zh: '有条件合格', color: 'bg-yellow-500' },
                  { value: 'fail' as const,         label_ko: '불합격',     label_zh: '不合格',   color: 'bg-red-600' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setOutcome(opt.value)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      outcome === opt.value
                        ? opt.color + ' text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {opt[`label_${lang}` as 'label_ko' | 'label_zh']}
                  </button>
                ))}
              </div>
            </div>

            {/* 검수원 코멘트 */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {lang === 'ko' ? '검수원 의견' : '检验员意见'}
              </p>
              <textarea
                value={inspectorComment}
                onChange={e => setInspectorComment(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={lang === 'ko' ? '전반적인 검수 의견을 입력하세요...' : '请输入总体检验意见...'}
              />
            </div>

            {/* 소요 시간 */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {lang === 'ko' ? `검수 소요 시간: ${totalMinutes}분` : `检验用时: ${totalMinutes}分钟`}
              </p>
              <input
                type="range"
                min="10"
                max="480"
                step="10"
                value={totalMinutes}
                onChange={e => setTotalMinutes(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowFinalize(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
              >
                {lang === 'ko' ? '취소' : '取消'}
              </button>
              <button
                onClick={handleFinalize}
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {submitting
                  ? (lang === 'ko' ? '전달중...' : '提交中...')
                  : (lang === 'ko' ? 'MD에 전달' : '提交给MD')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
