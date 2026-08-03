'use client';
import { useEffect, useState } from 'react';
import { useLangContext } from '@/components/layout/LangContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Save, Send, CheckCircle, XCircle, AlertCircle,
  Camera, FileText, User, Package
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   MD 보고서 정리 페이지 (2단계)
   - 검수원이 입력한 데이터 확인
   - 보고서 한국어/중국어 요약 작성
   - 합격률 최종 확정
   - 관리자 승인 요청 (status: review → pending_approval)
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

const RESULT_LABELS: Record<string, { ko: string; zh: string; color: string }> = {
  pass:    { ko: '합격',    zh: '合格',    color: 'text-green-600 bg-green-50' },
  partial: { ko: '부분합격', zh: '部分合格', color: 'text-yellow-600 bg-yellow-50' },
  fail:    { ko: '불합격',  zh: '不合格',  color: 'text-red-600 bg-red-50' },
};

const STATUS_STEPS = [
  { key: 'draft',            label_ko: '검수 대기',   label_zh: '待检',     step: 1 },
  { key: 'in_progress',      label_ko: '검수 진행중', label_zh: '检验中',   step: 2 },
  { key: 'review',           label_ko: 'MD 검토중',   label_zh: 'MD审核中', step: 3 },
  { key: 'pending_approval', label_ko: '관리자 승인 대기', label_zh: '待管理员审批', step: 4 },
  { key: 'published',        label_ko: '발송 완료',   label_zh: '已发送',   step: 5 },
];

export default function MdReportPage({
  params,
}: {
  params: { inspectionId: string };
}) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [me, setMe] = useState<any>(null);

  // MD 편집 필드
  const [summaryKo, setSummaryKo] = useState('');
  const [summaryCn, setSummaryCn] = useState('');
  const [passRate, setPassRate] = useState<number>(0);
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }

      const { data: internalUser } = await supabase
        .from('internal_users')
        .select('id, role, name_ko, name_zh')
        .eq('user_id', user.id)
        .single();

      if (!internalUser || !['md', 'admin'].includes(internalUser.role)) {
        router.push('/md');
        return;
      }
      setMe(internalUser);

      const { data: insp } = await supabase
        .from('inspections')
        .select('*, order:orders(order_no, seller:sellers(business_name))')
        .eq('id', params.inspectionId)
        .single();

      if (insp) {
        setInspection(insp);
        setSummaryKo(insp.summary_ko ?? '');
        setSummaryCn(insp.summary_cn ?? '');
        setPassRate(insp.pass_rate ?? 0);
        setResult(insp.result ?? '');
      }

      const { data: it } = await supabase
        .from('inspection_items')
        .select('*, photos:inspection_photos(id, url, photo_kind)')
        .eq('inspection_id', params.inspectionId)
        .order('display_order');
      setItems((it ?? []) as InspectionItem[]);
      setLoading(false);
    })();
  }, [params.inspectionId]);

  // 검수원 데이터 기반 합격률 자동 계산
  function calcAutoPassRate() {
    const totalPassed = items.reduce((s, i) => s + (i.qty_passed ?? 0), 0);
    const totalFailed = items.reduce((s, i) => s + (i.qty_failed ?? 0), 0);
    const total = totalPassed + totalFailed;
    if (total === 0) return 0;
    return Math.round((totalPassed / total) * 10000) / 100;
  }

  async function handleSaveDraft() {
    setSaving(true);
    await supabase.rpc('md_save_report_draft', {
      p_inspection_id: params.inspectionId,
      p_summary_ko: summaryKo,
      p_summary_cn: summaryCn,
      p_pass_rate: passRate,
      p_result: result,
    });
    setSaving(false);
    alert(lang === 'ko' ? '임시 저장 완료' : '草稿已保存');
  }

  async function handleSubmitForApproval() {
    if (!summaryKo && !summaryCn) {
      alert(lang === 'ko' ? '보고서 요약을 입력해주세요' : '请填写报告摘要');
      return;
    }
    if (!result) {
      alert(lang === 'ko' ? '최종 결과를 선택해주세요' : '请选择最终结论');
      return;
    }
    setSubmitting(true);
    // 먼저 초안 저장
    await supabase.rpc('md_save_report_draft', {
      p_inspection_id: params.inspectionId,
      p_summary_ko: summaryKo,
      p_summary_cn: summaryCn,
      p_pass_rate: passRate,
      p_result: result,
    });
    // 관리자 승인 요청
    await supabase.rpc('md_submit_for_approval', {
      p_inspection_id: params.inspectionId,
      p_md_internal_user_id: me.id,
    });
    setSubmitting(false);
    alert(lang === 'ko' ? '관리자에게 승인 요청을 보냈습니다' : '已向管理员发送审批请求');
    router.push('/md/inspections');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500">검수 정보를 찾을 수 없습니다</p>
          <Link href="/md/inspections" className="mt-4 inline-block text-purple-600 text-sm">← 목록으로</Link>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.find(s => s.key === inspection.status)?.step ?? 1;
  const autoPassRate = calcAutoPassRate();
  const totalPhotos = items.reduce((s, i) => s + i.photos.length, 0);
  const completedItems = items.filter(i => i.result !== null).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/md/inspections" className="p-1 -ml-1 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">{inspection.inspection_no}</p>
              <p className="font-semibold text-gray-900 text-sm truncate">
                {inspection.product_name ?? (lang === 'ko' ? '상품명 미입력' : '未填写商品名')}
              </p>
            </div>
            <button
              onClick={() => setLang(l => l === 'ko' ? 'zh' : 'ko')}
              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500"
            >
              {lang === 'ko' ? '中文' : '한국어'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 4단계 진행 상태 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-3">
            {lang === 'ko' ? '검수 진행 단계' : '检验进度'}
          </p>
          <div className="flex items-center">
            {STATUS_STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.step < currentStep ? 'bg-green-500 text-white' :
                    step.step === currentStep ? 'bg-purple-600 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {step.step < currentStep ? '✓' : step.step}
                  </div>
                  <p className={`text-xs mt-1 text-center leading-tight ${
                    step.step === currentStep ? 'text-purple-600 font-medium' : 'text-gray-400'
                  }`} style={{ fontSize: '10px' }}>
                    {step[`label_${lang}` as 'label_ko' | 'label_zh']}
                  </p>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${step.step < currentStep ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 검수원 입력 요약 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            {lang === 'ko' ? '검수원 입력 데이터' : '检验员录入数据'}
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{completedItems}/{items.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lang === 'ko' ? '항목 완료' : '完成项目'}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${autoPassRate >= 95 ? 'text-green-600' : autoPassRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {autoPassRate}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{lang === 'ko' ? '자동 계산 합격률' : '自动计算合格率'}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{totalPhotos}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lang === 'ko' ? '첨부 사진' : '附加照片'}</p>
            </div>
          </div>

          {/* 검수원 코멘트 */}
          {inspection.inspector_comment && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-blue-500 mb-1">{lang === 'ko' ? '검수원 의견' : '检验员意见'}</p>
              <p className="text-sm text-gray-700">{inspection.inspector_comment}</p>
            </div>
          )}

          {/* 항목별 결과 */}
          <div className="space-y-2">
            {items.map((item, idx) => {
              const resultInfo = item.result ? RESULT_LABELS[item.result] : null;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      {lang === 'ko' ? (item.label_ko ?? item.label_zh) : item.label_zh}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {item.qty_passed !== null && (
                        <span className="text-xs text-green-600">
                          {lang === 'ko' ? `합격 ${item.qty_passed}개` : `合格 ${item.qty_passed}件`}
                        </span>
                      )}
                      {item.qty_failed !== null && item.qty_failed > 0 && (
                        <span className="text-xs text-red-600">
                          {lang === 'ko' ? `불량 ${item.qty_failed}개` : `不合格 ${item.qty_failed}件`}
                        </span>
                      )}
                      {item.photos.length > 0 && (
                        <span className="text-xs text-blue-500">
                          📷 {item.photos.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {resultInfo && (
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${resultInfo.color}`}>
                      {resultInfo[lang]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 사진 갤러리 */}
        {totalPhotos > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-500" />
              {lang === 'ko' ? '검수 사진' : '检验照片'} ({totalPhotos})
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {items.flatMap(item =>
                item.photos.map(photo => (
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
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MD 보고서 작성 */}
        <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            {lang === 'ko' ? 'MD 보고서 작성' : 'MD报告撰写'}
          </h2>

          {/* 최종 결과 선택 */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {lang === 'ko' ? '최종 결과 *' : '最终结论 *'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'pass',             label_ko: '합격',       label_zh: '合格',     color: 'bg-green-600' },
                { value: 'conditional_pass', label_ko: '조건부 합격', label_zh: '有条件合格', color: 'bg-yellow-500' },
                { value: 'fail',             label_ko: '불합격',     label_zh: '不合格',   color: 'bg-red-600' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setResult(opt.value)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    result === opt.value
                      ? opt.color + ' text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt[`label_${lang}` as 'label_ko' | 'label_zh']}
                </button>
              ))}
            </div>
          </div>

          {/* 합격률 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                {lang === 'ko' ? '최종 합격률' : '最终合格率'}
              </p>
              <button
                onClick={() => setPassRate(autoPassRate)}
                className="text-xs text-blue-600 hover:underline"
              >
                {lang === 'ko' ? `자동 계산값 적용 (${autoPassRate}%)` : `应用自动计算值 (${autoPassRate}%)`}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={passRate}
                onChange={e => setPassRate(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-bold text-gray-700 w-14 text-right">{passRate.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${passRate >= 95 ? 'bg-green-500' : passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>

          {/* 한국어 요약 */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {lang === 'ko' ? '보고서 요약 (한국어)' : '报告摘要（韩语）'}
            </p>
            <textarea
              value={summaryKo}
              onChange={e => setSummaryKo(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="바이어에게 전달할 한국어 보고서 요약을 작성하세요..."
            />
          </div>

          {/* 중국어 요약 */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {lang === 'ko' ? '보고서 요약 (중국어)' : '报告摘要（中文）'}
            </p>
            <textarea
              value={summaryCn}
              onChange={e => setSummaryCn(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="向工厂发送的中文报告摘要..."
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? (lang === 'ko' ? '저장중...' : '保存中...') : (lang === 'ko' ? '임시 저장' : '保存草稿')}
            </button>
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting || inspection.status === 'pending_approval' || inspection.status === 'published'}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting
                ? (lang === 'ko' ? '요청중...' : '请求中...')
                : inspection.status === 'pending_approval'
                ? (lang === 'ko' ? '승인 대기중' : '等待审批')
                : inspection.status === 'published'
                ? (lang === 'ko' ? '발송 완료' : '已发送')
                : (lang === 'ko' ? '관리자 승인 요청' : '申请管理员审批')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
