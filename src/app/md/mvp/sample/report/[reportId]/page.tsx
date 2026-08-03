'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploader from '@/components/report/ImageUploader';
import MultiImageUploader from '@/components/report/MultiImageUploader';

// ─── 타입 ───────────────────────────────────────────────────
interface SampleSpec {
  item_name: string; material: string; size: string; color: string;
  printing_method: string; packaging: string; special_notes: string;
}
interface SampleQuote {
  factory_name: string; factory_name_zh: string; location: string;
  sample_cost: string; shipping_cost: string; total_cost: string;
  production_days: string; bulk_moq: string; bulk_price: string;
  bulk_lead_time: string; payment_terms: string; bulk_deduction: string;
  factory_cover: string; sample_photos: string[];
  strengths: string; weaknesses: string; recommendation: boolean;
}
interface SampleReport {
  id: string; report_no: string; request_id: string | null; status: string;
  report_title: string; buyer_name: string; buyer_company: string;
  product_name: string; issued_at: string; cover_image: string;
  spec: SampleSpec;
  reference_photos: string[];
  quotes: SampleQuote[];
  quality_check: { appearance: string; material_feel: string; printing: string; durability: string; overall: string; };
  delivery_timeline: string;
  risk_notes: string;
  recommended_quote_idx: number;
  internal_memo: string;
  sent_at: string | null; sent_to_email: string | null;
  created_at: string; updated_at: string;
}

const STEPS = [
  { id: 1, icon: '📋', label: '기본 정보' },
  { id: 2, icon: '🎨', label: '샘플 사양' },
  { id: 3, icon: '🏭', label: '공장 견적' },
  { id: 4, icon: '🔍', label: '품질 검수' },
  { id: 5, icon: '⚠️', label: '주의사항' },
  { id: 6, icon: '👁️', label: '미리보기' },
];

const DEF_QUOTE: SampleQuote = {
  factory_name: '', factory_name_zh: '', location: '',
  sample_cost: '', shipping_cost: '', total_cost: '', production_days: '',
  bulk_moq: '', bulk_price: '', bulk_lead_time: '', payment_terms: '',
  bulk_deduction: '본 발주 시 샘플비 50% 공제',
  factory_cover: '', sample_photos: [],
  strengths: '', weaknesses: '', recommendation: false,
};

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";
const cardCls = "bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm";

export default function SampleReportEditor() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<SampleReport | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchReport(); }, [reportId]);

  async function fetchReport() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sample_reports').select('*').eq('id', reportId).single() as any;
    if (error || !data) {
      alert('보고서를 찾을 수 없습니다.');
      router.push('/md/mvp/sample');
      return;
    }
    const r = data as SampleReport;
    if (!r.spec) r.spec = { item_name: '', material: '', size: '', color: '', printing_method: '', packaging: '', special_notes: '' };
    if (!r.quotes?.length) r.quotes = [{ ...DEF_QUOTE }, { ...DEF_QUOTE }, { ...DEF_QUOTE }];
    if (!r.quality_check) r.quality_check = { appearance: '', material_feel: '', printing: '', durability: '', overall: '' };
    if (!r.reference_photos) r.reference_photos = [];
    if (!r.cover_image) r.cover_image = '';
    if (r.recommended_quote_idx === undefined) r.recommended_quote_idx = 0;
    setReport(r);
    setLoading(false);
  }

  const save = useCallback(async (newStatus?: string, silent = false) => {
    if (!report) return;
    setSaving(true);
    const payload: any = {
      report_title: report.report_title, buyer_name: report.buyer_name,
      buyer_company: report.buyer_company, product_name: report.product_name,
      issued_at: report.issued_at, cover_image: report.cover_image,
      spec: report.spec, reference_photos: report.reference_photos,
      quotes: report.quotes, quality_check: report.quality_check,
      delivery_timeline: report.delivery_timeline, risk_notes: report.risk_notes,
      recommended_quote_idx: report.recommended_quote_idx,
      internal_memo: report.internal_memo,
    };
    if (newStatus) payload.status = newStatus;
    const { error } = await supabase.from('sample_reports').update(payload).eq('id', reportId);
    setSaving(false);
    if (!silent) {
      if (error) setSaveMsg('❌ 저장 실패');
      else { setSaveMsg('✅ 저장됨'); setTimeout(() => setSaveMsg(''), 2500); }
    }
    if (newStatus && !error) setReport(prev => prev ? { ...prev, status: newStatus } : prev);
  }, [report, reportId, supabase]);

  useEffect(() => {
    if (!report || loading) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(undefined, true), 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [report]);

  function upd(path: (string | number)[], value: any) {
    setReport(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return next;
    });
  }

  function updQuote(idx: number, field: keyof SampleQuote, value: any) {
    setReport(prev => {
      if (!prev) return prev;
      const quotes = JSON.parse(JSON.stringify(prev.quotes));
      quotes[idx] = { ...quotes[idx], [field]: value };
      return { ...prev, quotes };
    });
  }

  if (loading || !report) {
    return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-5xl mb-3 animate-pulse">📦</div><p className="text-gray-400 text-sm">{t('보고서 불러오는 중...', '报告加载中...')}</p></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
            <Link href="/md/mvp/sample" className="hover:text-gray-600">{t('← 샘플제작 목록', '← 样品制作列表')}</Link>
            <span>/</span>
            <span className="font-mono text-xs">{report.report_no}</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            📦 샘플제작 보고서 작성
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              report.status === 'sent' ? 'bg-green-100 text-green-700' :
              report.status === 'published' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {report.status === 'draft' ? '✏️ 작성중' : report.status === 'published' ? '✅ 완성' : '📤 발송완료'}
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('자동저장 활성화 · 변경 3초 후 자동 저장됩니다', '自动保存已启用·3秒后自动保存更改')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveMsg && <span className="text-xs text-gray-500">{saveMsg}</span>}
          {saving && <span className="text-xs text-indigo-500 animate-pulse">{t('저장중...', '保存中...')}</span>}
          <button onClick={() => save()} className="text-sm bg-gray-100 text-gray-700 font-medium px-3 py-2 rounded-lg hover:bg-gray-200">{t('💾 저장', '💾 保存')}</button>
          {report.status === 'draft' && (
            <button onClick={() => save('published')} className="text-sm bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-700">{t('✅ 완성', '✅ 完成')}</button>
          )}
          {report.status === 'published' && (
            <button onClick={async () => {
              const email = prompt('발송할 바이어 이메일:');
              if (email) {
                await supabase.from('sample_reports').update({ status: 'sent', sent_at: new Date().toISOString(), sent_to_email: email }).eq('id', reportId);
                setReport(prev => prev ? { ...prev, status: 'sent', sent_to_email: email } : prev);
                alert(`${email}로 발송 완료!\n바이어 링크: ${window.location.origin}/report/sample/${reportId}`);
              }
            }} className="text-sm bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-700">{t('📤 발송', '📤 发送')}</button>
          )}
        </div>
      </div>

      {/* 스텝 탭 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-2xl p-1.5 overflow-x-auto">
        {STEPS.map(s => (
          <button key={s.id} onClick={() => setStep(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              step === s.id ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span>{s.icon}</span><span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ─── STEP 1: 기본 정보 ─── */}
      {step === 1 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('📋 기본 정보', '📋 基本信息')}</h2>
          <div className="mb-5">
            <ImageUploader
              label="커버 이미지 (보고서 표지)"
              value={report.cover_image || ''}
              onChange={v => upd(['cover_image'], v)}
              folder="reports/sample/covers"
              aspectRatio="aspect-[3/1]"
              placeholder={t('샘플 제품 또는 참고 이미지를 업로드하세요', '请上传样品或参考图片')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>{t('보고서 제목 *', '报告标题 *')}</label>
              <input className={inputCls} value={report.report_title}
                onChange={e => upd(['report_title'], e.target.value)}
                placeholder={t('예: 봉제인형 샘플제작 견적 보고서', '示例：缝制玩偶样品制作报价报告')} />
            </div>
            <div>
              <label className={labelCls}>{t('바이어 담당자명', '买方负责人姓名')}</label>
              <input className={inputCls} value={report.buyer_name}
                onChange={e => upd(['buyer_name'], e.target.value)} placeholder={t('예: 김철수', '示例：金哲洙')} />
            </div>
            <div>
              <label className={labelCls}>{t('바이어 회사명', '买方公司名')}</label>
              <input className={inputCls} value={report.buyer_company}
                onChange={e => upd(['buyer_company'], e.target.value)} placeholder={t('예: (주)ABC무역', '示例：(株)ABC贸易')} />
            </div>
            <div>
              <label className={labelCls}>{t('제품명 *', '产品名称 *')}</label>
              <input className={inputCls} value={report.product_name}
                onChange={e => upd(['product_name'], e.target.value)} placeholder={t('예: 뽑기용 봉제인형 (15cm)', '示例：抓娃娃用缝制玩偶（15cm）')} />
            </div>
            <div>
              <label className={labelCls}>{t('발행일', '发布日期')}</label>
              <input type="date" className={inputCls} value={report.issued_at || ''}
                onChange={e => upd(['issued_at'], e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <MultiImageUploader
                label="참고 이미지 (바이어 제공 또는 유사 제품)"
                values={report.reference_photos || []}
                onChange={v => upd(['reference_photos'], v)}
                folder="reports/sample/references"
                maxCount={8}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>{t('내부 메모 (바이어 비공개)', '内部备注（买家不可见）')}</label>
              <textarea className={inputCls} rows={2} value={report.internal_memo || ''}
                onChange={e => upd(['internal_memo'], e.target.value)} placeholder={t('내부 참고사항...', '内部参考事项...')} />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: 샘플 사양 ─── */}
      {step === 2 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('🎨 샘플 사양 정의', '🎨 样品规格定义')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>{t('품목명 *', '品项名 *')}</label>
              <input className={inputCls} value={report.spec.item_name}
                onChange={e => upd(['spec', 'item_name'], e.target.value)}
                placeholder={t('예: 봉제 캐릭터 인형 (뽑기용, 15cm)', '示例：缝制角色玩偶（抓娃娃用，15cm）')} />
            </div>
            <div>
              <label className={labelCls}>{t('소재', '材质')}</label>
              <input className={inputCls} value={report.spec.material}
                onChange={e => upd(['spec', 'material'], e.target.value)}
                placeholder={t('예: PP면 + 폴리에스터 충전재', '示例：PP面料+聚酯填充物')} />
            </div>
            <div>
              <label className={labelCls}>{t('사이즈', '尺寸')}</label>
              <input className={inputCls} value={report.spec.size}
                onChange={e => upd(['spec', 'size'], e.target.value)}
                placeholder={t('예: 높이 15cm (±1cm 허용)', '示例：高度15cm（±1cm允许）')} />
            </div>
            <div>
              <label className={labelCls}>{t('색상', '颜色')}</label>
              <input className={inputCls} value={report.spec.color}
                onChange={e => upd(['spec', 'color'], e.target.value)}
                placeholder={t('예: 화이트/핑크/블루 3종', '示例：白色/粉色/蓝色三款')} />
            </div>
            <div>
              <label className={labelCls}>{t('인쇄/자수 방식', '印刷/刺绣方式')}</label>
              <input className={inputCls} value={report.spec.printing_method}
                onChange={e => upd(['spec', 'printing_method'], e.target.value)}
                placeholder={t('예: 자수 + 열전사 눈코입', '示例：刺绣+热转印眼鼻口')} />
            </div>
            <div>
              <label className={labelCls}>{t('포장 방식', '包装方式')}</label>
              <input className={inputCls} value={report.spec.packaging}
                onChange={e => upd(['spec', 'packaging'], e.target.value)}
                placeholder={t('예: OPP 개별 포장 + 행택', '示例：OPP单独包装+吊牌')} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>{t('특이사항 / 추가 요구사항', '特殊事项/附加要求')}</label>
              <textarea className={inputCls} rows={3} value={report.spec.special_notes}
                onChange={e => upd(['spec', 'special_notes'], e.target.value)}
                placeholder={t('예: KC 인증 필수, 자체 IP 캐릭터 적용, 뽑기 기계 사이즈 규격 준수...', '示例：必需KC认证，自有IP角色，符合抓娃娃机尺寸规格...')} />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: 공장 견적 ─── */}
      {step === 3 && (
        <div className="space-y-5">
          {report.quotes.map((quote, idx) => (
            <div key={idx} className={cardCls}>
              <div className="flex items-center gap-3 mb-5">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{idx + 1}</span>
                <h2 className="text-base font-bold text-gray-900">공장 견적 #{idx + 1}</h2>
                <label className="ml-auto flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="recommended" checked={report.recommended_quote_idx === idx}
                    onChange={() => upd(['recommended_quote_idx'], idx)}
                    className="accent-green-600 w-4 h-4" />
                  <span className="text-xs font-bold text-green-700">{t('⭐ 추천 공장', '⭐ 推荐工厂')}</span>
                </label>
              </div>

              <div className="mb-4">
                <ImageUploader
                  label="공장 대표 사진"
                  value={quote.factory_cover || ''}
                  onChange={v => updQuote(idx, 'factory_cover', v)}
                  folder="reports/sample/factories"
                  aspectRatio="aspect-video"
                  placeholder={t('공장 외관 또는 생산라인 사진', '工厂外观或生产线照片')}
                />
              </div>
              <div className="mb-4">
                <MultiImageUploader
                  label="샘플 사진 (실제 제작된 샘플 사진 업로드)"
                  values={quote.sample_photos || []}
                  onChange={v => updQuote(idx, 'sample_photos', v)}
                  folder="reports/sample/samples"
                  maxCount={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('공장명 (한국어) *', '工厂名称（韩文）*')}</label>
                  <input className={inputCls} value={quote.factory_name}
                    onChange={e => updQuote(idx, 'factory_name', e.target.value)} placeholder={t('예: 이우 봉제 공장', '示例：义乌缝制工厂')} />
                </div>
                <div>
                  <label className={labelCls}>{t('공장명 (중국어)', '工厂名称（中文）')}</label>
                  <input className={inputCls} value={quote.factory_name_zh}
                    onChange={e => updQuote(idx, 'factory_name_zh', e.target.value)} placeholder="例: 义乌毛绒玩具厂" />
                </div>
                <div>
                  <label className={labelCls}>{t('위치', '位置')}</label>
                  <input className={inputCls} value={quote.location}
                    onChange={e => updQuote(idx, 'location', e.target.value)} placeholder={t('예: 저장성 이우시', '示例：浙江省义乌市')} />
                </div>
                <div>
                  <label className={labelCls}>{t('샘플 제작 기간', '样品制作周期')}</label>
                  <input className={inputCls} value={quote.production_days}
                    onChange={e => updQuote(idx, 'production_days', e.target.value)} placeholder={t('예: 7일', '示例：7天')} />
                </div>

                {/* 샘플 비용 */}
                <div className="md:col-span-2 bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h3 className="text-sm font-bold text-amber-800 mb-3">{t('💰 샘플 비용 (바이어 청구)', '💰 样品费用（向买家收费）')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">{t('🟡 샘플 제작비', '🟡 样品制作费')}</label>
                      <input className="w-full border-2 border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50 font-bold focus:outline-none focus:border-amber-400"
                        value={quote.sample_cost}
                        onChange={e => updQuote(idx, 'sample_cost', e.target.value)}
                        placeholder={t('예: ¥150', '示例：¥150')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">{t('🟡 배송비', '🟡 运费')}</label>
                      <input className="w-full border-2 border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50 font-bold focus:outline-none focus:border-amber-400"
                        value={quote.shipping_cost}
                        onChange={e => updQuote(idx, 'shipping_cost', e.target.value)}
                        placeholder={t('예: ¥80', '示例：¥80')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">{t('🔵 총 청구금액', '🔵 总计金额')}</label>
                      <input className="w-full border-2 border-blue-400 rounded-lg px-3 py-2 text-sm bg-blue-50 font-black text-blue-800 focus:outline-none focus:border-blue-500"
                        value={quote.total_cost}
                        onChange={e => updQuote(idx, 'total_cost', e.target.value)}
                        placeholder={t('예: ¥230', '示例：¥230')} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={labelCls}>{t('본 발주 시 공제 조건', '本订单扣除条件')}</label>
                    <input className={inputCls} value={quote.bulk_deduction}
                      onChange={e => updQuote(idx, 'bulk_deduction', e.target.value)}
                      placeholder={t('예: 본 발주 진행 시 샘플비 50% 공제', '示例：正式下单时样品费抵扣50%')} />
                  </div>
                </div>

                {/* 본 발주 견적 */}
                <div className="md:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-800 mb-3">{t('📦 본 발주 견적 (참고)', '📦 本订单报价（参考）')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>MOQ</label>
                      <input className={inputCls} value={quote.bulk_moq}
                        onChange={e => updQuote(idx, 'bulk_moq', e.target.value)} placeholder={t('예: 500개', '示例：500个')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('단가', '单价')}</label>
                      <input className={inputCls} value={quote.bulk_price}
                        onChange={e => updQuote(idx, 'bulk_price', e.target.value)} placeholder={t('예: $2.3', '示例：$2.3')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('리드타임', '交期')}</label>
                      <input className={inputCls} value={quote.bulk_lead_time}
                        onChange={e => updQuote(idx, 'bulk_lead_time', e.target.value)} placeholder={t('예: 20일', '示例：20天')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('결제 조건', '付款条件')}</label>
                      <input className={inputCls} value={quote.payment_terms}
                        onChange={e => updQuote(idx, 'payment_terms', e.target.value)} placeholder={t('예: T/T 30/70', '示例：电汇30/70')} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t('장점', '优势')}</label>
                  <textarea className={inputCls} rows={2} value={quote.strengths}
                    onChange={e => updQuote(idx, 'strengths', e.target.value)}
                    placeholder={t('예: 자수 품질 우수, KC 인증 보유, 빠른 납기', '示例：刺绣质量优良，持有KC认证，交期快')} />
                </div>
                <div>
                  <label className={labelCls}>{t('단점 / 주의사항', '缺点 / 注意事项')}</label>
                  <textarea className={inputCls} rows={2} value={quote.weaknesses}
                    onChange={e => updQuote(idx, 'weaknesses', e.target.value)}
                    placeholder={t('예: MOQ 높음, 색상 편차 가능성', '示例：最低订量高，颜色可能有差异')} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── STEP 4: 품질 검수 ─── */}
      {step === 4 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('🔍 품질 검수 결과', '🔍 质量检验结果')}</h2>
          <div className="space-y-4">
            {[
              { key: 'appearance', label: '외관 / 마감', placeholder: '봉제 마감 상태, 솔기 처리, 형태 균일성 등' },
              { key: 'material_feel', label: '소재 / 촉감', placeholder: '원단 품질, 충전재 밀도, 촉감 등' },
              { key: 'printing', label: '인쇄 / 자수', placeholder: '색상 선명도, 자수 품질, 인쇄 내구성 등' },
              { key: 'durability', label: '내구성', placeholder: '봉제 강도, 세탁 테스트 결과, 안전성 등' },
              { key: 'overall', label: '종합 평가', placeholder: '전반적인 품질 수준 및 발주 권고 여부' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2">🔎 {label}</label>
                <textarea className={inputCls} rows={3}
                  value={(report.quality_check as any)[key] || ''}
                  onChange={e => upd(['quality_check', key], e.target.value)}
                  placeholder={placeholder} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className={labelCls}>{t('납기 일정 안내', '交期安排说明')}</label>
            <textarea className={inputCls} rows={3} value={report.delivery_timeline || ''}
              onChange={e => upd(['delivery_timeline'], e.target.value)}
              placeholder={t('예: 샘플 승인 후 본 발주 → 20일 생산 → 5일 검수 → 7일 해운 → 총 32일 소요 예상', '示例：样品确认后正式下单→20天生产→5天检验→7天海运→预计共32天')} />
          </div>
        </div>
      )}

      {/* ─── STEP 5: 주의사항 ─── */}
      {step === 5 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('⚠️ 주의사항 및 리스크', '⚠️ 注意事项及风险')}</h2>
          <textarea
            className={`${inputCls} text-sm`}
            rows={10}
            value={report.risk_notes || ''}
            onChange={e => upd(['risk_notes'], e.target.value)}
            placeholder={`아래 항목을 참고하여 작성하세요:\n\n• IP 이슈: 캐릭터 디자인 저작권 확인 필요\n• KC 인증: 14세 이하 완구 KC 필수 — 공장 #1 보유, #2 신청 중\n• 품질 편차: 첫 발주 시 전수검수 권장\n• 납기 리스크: 춘절(1~2월) 기간 생산 중단 주의\n• 색상 편차: 화면 색상과 실물 차이 가능성 안내`}
          />
        </div>
      )}

      {/* ─── STEP 6: 미리보기 ─── */}
      {step === 6 && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">{t('👁️ 보고서 미리보기', '👁️ 报告预览')}</h2>
            <div className="flex gap-2">
              <button onClick={() => window.open(`/report/sample/${reportId}`, '_blank')}
                className="text-sm bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-gray-200">{t('🖥️ 전체화면', '🖥️ 全屏')}</button>
              {report.status === 'published' && (
                <button onClick={async () => {
                  const email = prompt('발송할 바이어 이메일:');
                  if (email) {
                    await supabase.from('sample_reports').update({ status: 'sent', sent_at: new Date().toISOString(), sent_to_email: email }).eq('id', reportId);
                    setReport(prev => prev ? { ...prev, status: 'sent', sent_to_email: email } : prev);
                    alert(`📤 ${email}로 발송 완료!\n바이어 링크: ${window.location.origin}/report/sample/${reportId}`);
                  }
                }} className="text-sm bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700">{t('📤 바이어에게 발송', '📤 发送给买家')}</button>
              )}
            </div>
          </div>

          {report.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.cover_image} alt={t('커버', '封面')} className="w-full h-40 object-cover rounded-2xl mb-4" />
          )}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-2xl p-6 text-white mb-4">
            <div className="text-xs text-emerald-300 mb-1">KERYX SAMPLE REPORT · CONFIDENTIAL</div>
            <div className="text-2xl font-black mb-1">{report.report_title || '(제목 없음)'}</div>
            <div className="text-sm text-emerald-200">{report.buyer_company && `${report.buyer_company} · `}{report.buyer_name} 귀중</div>
            <div className="text-xs text-emerald-300 mt-2">{report.issued_at} · {report.report_no}</div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { n: report.quotes.filter(q => q.factory_name).length, l: '견적 공장', c: 'text-teal-600' },
              { n: report.quotes.reduce((a, q) => a + (q.sample_photos?.length || 0), 0), l: '샘플 사진', c: 'text-blue-600' },
              { n: report.recommended_quote_idx + 1, l: '추천 공장 순위', c: 'text-amber-600' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-black ${item.c}`}>{item.n}</div>
                <div className="text-xs text-gray-400">{item.l}</div>
              </div>
            ))}
          </div>

          {report.spec.item_name && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
              <div className="text-xs font-bold text-gray-600 mb-2">{t('🎨 샘플 사양', '🎨 样品规格')}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[['품목', report.spec.item_name], ['소재', report.spec.material], ['사이즈', report.spec.size], ['색상', report.spec.color]].map(([k, v]) => v ? (
                  <div key={k}><span className="text-gray-400">{k}: </span><span className="font-medium">{v}</span></div>
                ) : null)}
              </div>
            </div>
          )}

          {report.quotes.filter(q => q.factory_name).length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-teal-50">
                    {['', '공장명', '샘플비', '제작기간', '본발주 MOQ', '추천'].map(h => (
                      <th key={h} className="border border-teal-100 px-2 py-2 text-left text-teal-700 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.quotes.filter(q => q.factory_name).map((q, i) => (
                    <tr key={i} className={i === report.recommended_quote_idx ? 'bg-green-50' : 'hover:bg-gray-50'}>
                      <td className="border border-gray-200 px-2 py-2 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</td>
                      <td className="border border-gray-200 px-2 py-2 font-medium">{q.factory_name}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center font-bold text-amber-700">{q.total_cost}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{q.production_days}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{q.bulk_moq}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">
                        {i === report.recommended_quote_idx && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">{t('⭐ 추천', '⭐ 推荐')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="text-xs font-bold text-amber-700 mb-1">{t('💡 완성 후 발송 방법', '💡 完成后发货方式')}</div>
            <p className="text-xs text-amber-700">{t('1. 상단', '1. 顶部')} <strong>{t('✅ 완성', '✅ 完成')}</strong> {t('버튼 → 2.', '按钮 → 2.')} <strong>{t('📤 바이어에게 발송', '📤 发送给买家')}</strong> {t('→ 3. 이메일 입력 → 바이어 열람 링크 자동 생성', '→ 3. 输入邮箱 → 自动生成买家查看链接')}</p>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="flex justify-between mt-4">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-30">{t('← 이전', '← 上一页')}</button>
        {step < 6 ? (
          <button onClick={() => setStep(s => Math.min(6, s + 1))}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">{t('다음 →', '下一步 →')}</button>
        ) : (
          <button onClick={() => save('published')} disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50">{t('✅ 보고서 완성', '✅ 报告完成')}</button>
        )}
      </div>
    </div>
  );
}
