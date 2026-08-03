'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploader from '@/components/report/ImageUploader';
import MultiImageUploader from '@/components/report/MultiImageUploader';

// ─── 타입 ────────────────────────────────────────────────────
interface Factory {
  rank: number; name: string; name_zh: string; location: string;
  founded_year: string; employee_count: string; monthly_capacity: string;
  main_products: string; certifications: string[]; kc_status: string;
  custom_ip: boolean; moq: string; price_300: string; price_1000: string;
  lead_time: string; payment_terms: string; verified: boolean;
  photos: string[]; cover_photo: string;
}
interface SampleInfo {
  factory_rank: number; production_days: string; factory_cost: string;
  shipping_cost: string; total_cost: string; bulk_deduction: string;
}
interface RecommendedProduct {
  name: string; category: string; price_range: string; moq: string;
  features: string; reason: string; photo_url: string;
}
interface Report {
  id: string; report_no: string; request_id: string | null; status: string;
  report_title: string; buyer_name: string; buyer_company: string;
  product_name: string; issued_at: string;
  cover_image: string;
  market_summary: { one_liner: string; import_trend: string; market_size: string; gacha_ratio: string; growth_rate: string; };
  regions: { name: string; share: number; desc: string }[];
  factories: Factory[];
  sample_info: SampleInfo[];
  risk_assessment: { ip_risk: string; customs_risk: string; quality_risk: string; delivery_risk: string; };
  recommended_products: RecommendedProduct[];
  internal_memo: string; sent_at: string | null; sent_to_email: string | null;
  created_at: string; updated_at: string;
}

const STEPS = [
  { id: 1, icon: '📋', label: '기본 정보' },
  { id: 2, icon: '📊', label: '시장 현황' },
  { id: 3, icon: '🏭', label: '추천 공장' },
  { id: 4, icon: '📦', label: '샘플 안내' },
  { id: 5, icon: '⚠️', label: '리스크' },
  { id: 6, icon: '🛍️', label: '추천 상품' },
  { id: 7, icon: '👁️', label: '미리보기' },
];

const DEF_FACTORY: Factory = {
  rank: 1, name: '', name_zh: '', location: '', founded_year: '',
  employee_count: '', monthly_capacity: '', main_products: '',
  certifications: [], kc_status: '없음', custom_ip: false,
  moq: '', price_300: '', price_1000: '', lead_time: '', payment_terms: '',
  verified: false, photos: [], cover_photo: '',
};

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";
const cardCls = "bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm";

export default function MarketResearchReportEditor() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<Report | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchReport(); }, [reportId]);

  async function fetchReport() {
    setLoading(true);
    const { data, error } = await supabase
      .from('market_research_reports').select('*').eq('id', reportId).single() as any;
    if (error || !data) {
      alert('보고서를 찾을 수 없습니다.');
      router.push('/md/mvp/market-research');
      return;
    }
    const r = data as Report;
    if (!r.factories?.length) r.factories = [{ ...DEF_FACTORY, rank: 1 }, { ...DEF_FACTORY, rank: 2 }, { ...DEF_FACTORY, rank: 3 }];
    if (!r.sample_info?.length) r.sample_info = [{ factory_rank: 1, production_days: '', factory_cost: '', shipping_cost: '', total_cost: '', bulk_deduction: '본 발주 시 50% 공제' }, { factory_rank: 2, production_days: '', factory_cost: '', shipping_cost: '', total_cost: '', bulk_deduction: '본 발주 시 50% 공제' }, { factory_rank: 3, production_days: '', factory_cost: '', shipping_cost: '', total_cost: '', bulk_deduction: '본 발주 시 50% 공제' }];
    if (!r.regions?.length) r.regions = [{ name: '이우(义乌)', share: 0, desc: '' }, { name: '광저우(广州)', share: 0, desc: '' }, { name: '션전(深圳)', share: 0, desc: '' }];
    if (!r.recommended_products?.length) r.recommended_products = [{ name: '', category: '', price_range: '', moq: '', features: '', reason: '', photo_url: '' }, { name: '', category: '', price_range: '', moq: '', features: '', reason: '', photo_url: '' }];
    if (!r.market_summary) r.market_summary = { one_liner: '', import_trend: '', market_size: '', gacha_ratio: '', growth_rate: '' };
    if (!r.risk_assessment) r.risk_assessment = { ip_risk: '', customs_risk: '', quality_risk: '', delivery_risk: '' };
    if (!r.cover_image) r.cover_image = '';
    setReport(r);
    setLoading(false);
  }

  // ─── 추천 상품 → products DB 자동 등록 ───────────────────────
  const registerProductsToDB = useCallback(async (currentReport: Report): Promise<number> => {
    const validProducts = currentReport.recommended_products.filter(p => p.name && p.name.trim());
    if (!validProducts.length) return 0;
    // seller_id 조회 (request_id 기반)
    let sellerId: string | null = null;
    if (currentReport.request_id) {
      const { data: reqData } = await supabase
        .from('market_research_requests').select('seller_id').eq('id', currentReport.request_id).single() as any;
      if (reqData) sellerId = reqData.seller_id;
    }
    // 기본 공장 ID 조회
    const { data: factoryData } = await supabase.from('factories').select('id').limit(1).single() as any;
    const factoryId = factoryData?.id;
    if (!factoryId) return 0;
    const productsToInsert = validProducts.map(p => {
      const priceMatch = p.price_range?.match(/([\d.]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      const moqNum = p.moq ? parseInt(p.moq.replace(/[^0-9]/g, '')) || 1 : 1;
      return {
        factory_id: factoryId,
        name_zh: p.name,
        name_ko: p.name,
        description_zh: p.features || '',
        description_ko: p.features || '',
        category: p.category || '기타',
        price_cny: price,
        supply_price_cny: price,
        moq: moqNum,
        image_url: p.photo_url || null,
        approval_status: 'approved',
        source: 'market_research',
        market_research_report_id: currentReport.id,
        recommended_for_seller_id: sellerId,
        is_orderable: true,
        is_active: true,
        is_new: true,
      };
    });
    const { data: inserted, error: insertErr } = await supabase.from('products').insert(productsToInsert).select('id');
    if (insertErr) { console.error('상품 등록 오류:', insertErr); return 0; }
    await supabase.from('market_research_reports').update({
      products_created: true,
      products_created_at: new Date().toISOString(),
      products_created_count: inserted?.length || 0,
    }).eq('id', currentReport.id);
    return inserted?.length || 0;
  }, [supabase]);

  const save = useCallback(async (newStatus?: string, silent = false) => {
    if (!report) return;
    setSaving(true);
    const payload: any = {
      report_title: report.report_title, buyer_name: report.buyer_name,
      buyer_company: report.buyer_company, product_name: report.product_name,
      issued_at: report.issued_at, cover_image: report.cover_image,
      market_summary: report.market_summary, regions: report.regions,
      factories: report.factories, sample_info: report.sample_info,
      risk_assessment: report.risk_assessment,
      recommended_products: report.recommended_products,
      internal_memo: report.internal_memo,
    };
    if (newStatus) payload.status = newStatus;
    const { error } = await supabase.from('market_research_reports').update(payload).eq('id', reportId);
    // 보고서 완성 시 추천 상품 자동 등록
    if (newStatus === 'published' && !error) {
      const count = await registerProductsToDB(report);
      setSaving(false);
      if (!silent) {
        if (count > 0) {
          setSaveMsg(`✅ 완성 · 추천 상품 ${count}건 DB 등록 완료`);
        } else {
          setSaveMsg('✅ 보고서 완성');
        }
        setTimeout(() => setSaveMsg(''), 4000);
      }
      setReport(prev => prev ? { ...prev, status: newStatus } : prev);
      return;
    }
    setSaving(false);
    if (!silent) {
      if (error) setSaveMsg('❌ 저장 실패');
      else { setSaveMsg('✅ 저장됨'); setTimeout(() => setSaveMsg(''), 2500); }
    }
    if (newStatus && !error) setReport(prev => prev ? { ...prev, status: newStatus } : prev);
  }, [report, reportId, supabase, registerProductsToDB]);

  // 자동저장 (3초 디바운스)
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

  function updFactory(idx: number, field: keyof Factory, value: any) {
    setReport(prev => {
      if (!prev) return prev;
      const factories = JSON.parse(JSON.stringify(prev.factories));
      factories[idx] = { ...factories[idx], [field]: value };
      return { ...prev, factories };
    });
  }

  if (loading || !report) {
    return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-5xl mb-3 animate-pulse">📄</div><p className="text-gray-400 text-sm">{t('보고서 불러오는 중...', '报告加载中...')}</p></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
            <Link href="/md/mvp/market-research" className="hover:text-gray-600">{t('← 시장조사 목록', '← 市场调研列表')}</Link>
            <span>/</span>
            <span className="font-mono text-xs">{report.report_no}</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            📄 시장조사 보고서 작성
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
          <button onClick={() => save()} className="text-sm bg-gray-100 text-gray-700 font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">{t('💾 저장', '💾 保存')}</button>
          {report.status === 'draft' && (
            <button onClick={() => save('published')} className="text-sm bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">{t('✅ 완성', '✅ 完成')}</button>
          )}
          {report.status === 'published' && (
            <button
              onClick={async () => {
                const email = prompt('발송할 바이어 이메일:');
                if (email) {
                  await supabase.from('market_research_reports').update({ status: 'sent', sent_at: new Date().toISOString(), sent_to_email: email }).eq('id', reportId);
                  setReport(prev => prev ? { ...prev, status: 'sent', sent_to_email: email } : prev);
                  alert(`${email}로 발송 완료 처리되었습니다.\n바이어 링크: ${window.location.origin}/report/${reportId}`);
                }
              }}
              className="text-sm bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >{t('📤 발송', '📤 发送')}</button>
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
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">{t('📋 기본 정보', '📋 基本信息')} <span className="text-xs text-gray-400 font-normal">{t('— 보고서 표지에 표시됩니다', '— 显示在报告封面')}</span></h2>
          
          {/* 커버 이미지 */}
          <div className="mb-5">
            <ImageUploader
              label="커버 이미지 (선택 · 표지 배경)"
              value={report.cover_image || ''}
              onChange={v => upd(['cover_image'], v)}
              folder="reports/covers"
              aspectRatio="aspect-[3/1]"
              placeholder={t('보고서 표지에 사용할 대표 이미지를 업로드하세요', '上传用于报告封面的代表图片')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>{t('보고서 제목 *', '报告标题 *')}</label>
              <input className={inputCls} value={report.report_title}
                onChange={e => upd(['report_title'], e.target.value)}
                placeholder={t('예: 뽑기용 봉제인형 굿즈 시장조사 보고서', '示例：抓娃娃缝制玩偶周边市场调研报告')} />
            </div>
            <div>
              <label className={labelCls}>{t('바이어 담당자명 *', '买方负责人姓名 *')}</label>
              <input className={inputCls} value={report.buyer_name}
                onChange={e => upd(['buyer_name'], e.target.value)} placeholder={t('예: 김철수', '示例：金哲洙')} />
            </div>
            <div>
              <label className={labelCls}>{t('바이어 회사명', '买方公司名')}</label>
              <input className={inputCls} value={report.buyer_company}
                onChange={e => upd(['buyer_company'], e.target.value)} placeholder={t('예: (주)ABC무역', '示例：(株)ABC贸易')} />
            </div>
            <div>
              <label className={labelCls}>{t('조사 제품명 *', '调研产品名 *')}</label>
              <input className={inputCls} value={report.product_name}
                onChange={e => upd(['product_name'], e.target.value)} placeholder={t('예: 봉제인형 (10~15cm, 뽑기용)', '示例：缝制玩偶（10~15cm，抓娃娃用）')} />
            </div>
            <div>
              <label className={labelCls}>{t('발행일', '发布日期')}</label>
              <input type="date" className={inputCls} value={report.issued_at || ''}
                onChange={e => upd(['issued_at'], e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>{t('내부 메모 (바이어에게 비공개)', '内部备注（买家不可见）')}</label>
              <textarea className={inputCls} rows={2} value={report.internal_memo || ''}
                onChange={e => upd(['internal_memo'], e.target.value)}
                placeholder={t('내부 참고사항, 특이사항...', '内部参考事项，特殊事项...')} />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: 시장 현황 ─── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className={cardCls}>
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">{t('📊 시장 현황 요약', '📊 市场现状总结')}</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>{t('핵심 한 줄 요약 *', '核心一句话总结 *')}</label>
                <input className={`${inputCls} font-medium`} value={report.market_summary.one_liner}
                  onChange={e => upd(['market_summary', 'one_liner'], e.target.value)}
                  placeholder={t('예: 한국 봉제인형 수입시장은 연 12% 성장 중이며 이우 산지 제품이 70%를 차지합니다.', '示例：韩国缝制玩偶进口市场年增长12%，义乌产占70%')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>{t('시장 규모', '市场规模')}</label>
                  <input className={inputCls} value={report.market_summary.market_size}
                    onChange={e => upd(['market_summary', 'market_size'], e.target.value)}
                    placeholder={t('예: 연간 약 3,200억 원', '示例：年约3200亿韩元')} />
                </div>
                <div>
                  <label className={labelCls}>{t('뽑기/굿즈 비중', '抽选/赠品比重')}</label>
                  <input className={inputCls} value={report.market_summary.gacha_ratio}
                    onChange={e => upd(['market_summary', 'gacha_ratio'], e.target.value)}
                    placeholder={t('예: 전체 시장의 약 35%', '示例：约占整体市场35%')} />
                </div>
                <div>
                  <label className={labelCls}>{t('연간 성장률', '年增长率')}</label>
                  <input className={inputCls} value={report.market_summary.growth_rate}
                    onChange={e => upd(['market_summary', 'growth_rate'], e.target.value)}
                    placeholder={t('예: YoY +12%', '示例：同比增长+12%')} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('한국 수입 동향 (상세)', '韩国进口趋势（详细）')}</label>
                <textarea className={inputCls} rows={5} value={report.market_summary.import_trend}
                  onChange={e => upd(['market_summary', 'import_trend'], e.target.value)}
                  placeholder={t('한국 수입 동향, 주요 수입국, 관세율, 통관 특이사항, 트렌드 변화 등을 상세히 기재하세요...', '请详细填写韩国进口趋势、主要进口国、关税率、通关注意事项、趋势变化等...')} />
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">{t('🗺️ 중국 산지 분포', '🗺️ 中国产地分布')}</h2>
            <div className="space-y-3">
              {report.regions.map((region, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-xl p-3">
                  <div className="col-span-3">
                    <label className={labelCls}>{t('산지명', '产地名称')}</label>
                    <input className={inputCls} value={region.name}
                      onChange={e => { const r = [...report.regions]; r[idx] = { ...r[idx], name: e.target.value }; upd(['regions'], r); }}
                      placeholder={t('예: 이우(义乌)', '示例：义乌(义乌)')} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>{t('비중(%)', '比重(%)')}</label>
                    <input type="number" min="0" max="100" className={inputCls} value={region.share}
                      onChange={e => { const r = [...report.regions]; r[idx] = { ...r[idx], share: Number(e.target.value) }; upd(['regions'], r); }} />
                  </div>
                  <div className="col-span-6">
                    <label className={labelCls}>{t('특징 설명', '特点说明')}</label>
                    <input className={inputCls} value={region.desc}
                      onChange={e => { const r = [...report.regions]; r[idx] = { ...r[idx], desc: e.target.value }; upd(['regions'], r); }}
                      placeholder={t('예: 소형 완구 세계 최대 집산지, 저가~중가 제품 강점', '示例：全球最大小型玩具集散地，低中价产品优势')} />
                  </div>
                  <div className="col-span-1 pt-5">
                    <button onClick={() => upd(['regions'], report.regions.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 text-lg">✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => upd(['regions'], [...report.regions, { name: '', share: 0, desc: '' }])}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">{t('+ 산지 추가', '+ 添加产地')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: 추천 공장 ─── */}
      {step === 3 && (
        <div className="space-y-5">
          {report.factories.map((factory, idx) => (
            <div key={idx} className={cardCls}>
              <div className="flex items-center gap-3 mb-5">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'
                }`}>{idx + 1}</span>
                <h2 className="text-base font-bold text-gray-900">
                  {idx === 0 ? '🥇 1순위 추천 공장' : idx === 1 ? '🥈 2순위 추천 공장' : '🥉 3순위 추천 공장'}
                </h2>
              </div>

              {/* 공장 커버 사진 */}
              <div className="mb-5">
                <ImageUploader
                  label="공장 대표 사진"
                  value={factory.cover_photo || ''}
                  onChange={v => updFactory(idx, 'cover_photo', v)}
                  folder={`reports/factories`}
                  aspectRatio="aspect-video"
                  placeholder={t('공장 외관 또는 생산라인 사진을 업로드하세요', '上传工厂外观或生产线照片')}
                />
              </div>

              {/* 공장 추가 사진들 */}
              <div className="mb-5">
                <MultiImageUploader
                  label="공장 추가 사진 (최대 6장)"
                  values={factory.photos || []}
                  onChange={v => updFactory(idx, 'photos', v)}
                  folder={`reports/factories`}
                  maxCount={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('공장명 (한국어) *', '工厂名称（韩文）*')}</label>
                  <input className={inputCls} value={factory.name}
                    onChange={e => updFactory(idx, 'name', e.target.value)}
                    placeholder={t('예: 이우 소프트토이 공장', '示例：义乌软玩具工厂')} />
                </div>
                <div>
                  <label className={labelCls}>{t('공장명 (중국어)', '工厂名称（中文）')}</label>
                  <input className={inputCls} value={factory.name_zh}
                    onChange={e => updFactory(idx, 'name_zh', e.target.value)}
                    placeholder="例: 义乌软玩具厂" />
                </div>
                <div>
                  <label className={labelCls}>{t('위치', '位置')}</label>
                  <input className={inputCls} value={factory.location}
                    onChange={e => updFactory(idx, 'location', e.target.value)}
                    placeholder={t('예: 저장성 이우시 청하이구', '示例：浙江省义乌市青海区')} />
                </div>
                <div>
                  <label className={labelCls}>{t('설립연도', '成立年份')}</label>
                  <input className={inputCls} value={factory.founded_year}
                    onChange={e => updFactory(idx, 'founded_year', e.target.value)}
                    placeholder={t('예: 2008년', '示例：2008年')} />
                </div>
                <div>
                  <label className={labelCls}>{t('직원 수', '员工数')}</label>
                  <input className={inputCls} value={factory.employee_count}
                    onChange={e => updFactory(idx, 'employee_count', e.target.value)}
                    placeholder={t('예: 280명', '示例：280人')} />
                </div>
                <div>
                  <label className={labelCls}>{t('월 생산 캐파', '月产能')}</label>
                  <input className={inputCls} value={factory.monthly_capacity}
                    onChange={e => updFactory(idx, 'monthly_capacity', e.target.value)}
                    placeholder={t('예: 50만개/월', '示例：50万件/月')} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{t('주력 제품', '主打产品')}</label>
                  <input className={inputCls} value={factory.main_products}
                    onChange={e => updFactory(idx, 'main_products', e.target.value)}
                    placeholder={t('예: 소형 봉제인형, 캐릭터 굿즈, 키링, 뽑기용 완구', '示例：小型缝制玩偶，角色周边，钥匙扣，抓娃娃玩具')} />
                </div>
                <div>
                  <label className={labelCls}>{t('인증 보유 (쉼표 구분)', '持有认证（逗号分隔）')}</label>
                  <input className={inputCls}
                    value={factory.certifications.join(', ')}
                    onChange={e => updFactory(idx, 'certifications', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder={t('예: KC, CE, ISO 9001', '示例：KC，CE，ISO 9001')} />
                </div>
                <div>
                  <label className={labelCls}>{t('KC 인증 상태', 'KC认证状态')}</label>
                  <select className={inputCls} value={factory.kc_status}
                    onChange={e => updFactory(idx, 'kc_status', e.target.value)}>
                    <option value="보유">{t('✅ 보유', '✅ 持有')}</option>
                    <option value="신청중">{t('🔄 신청중', '🔄 申请中')}</option>
                    <option value="없음">{t('❌ 없음', '❌ 无')}</option>
                  </select>
                </div>

                {/* 견적 정보 */}
                <div className="md:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-800 mb-3">{t('💰 견적 정보', '💰 报价信息')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>{t('MOQ (최소주문)', 'MOQ（最小订量）')}</label>
                      <input className={inputCls} value={factory.moq}
                        onChange={e => updFactory(idx, 'moq', e.target.value)}
                        placeholder={t('예: 300개', '示例：300个')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('단가 (300개)', '单价（300个）')}</label>
                      <input className={inputCls} value={factory.price_300}
                        onChange={e => updFactory(idx, 'price_300', e.target.value)}
                        placeholder={t('예: $2.5 / ¥18', '示例：$2.5 / ¥18')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('단가 (1,000개)', '单价（1000个）')}</label>
                      <input className={inputCls} value={factory.price_1000}
                        onChange={e => updFactory(idx, 'price_1000', e.target.value)}
                        placeholder={t('예: $2.1 / ¥15', '示例：$2.1 / ¥15')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('리드타임', '交期')}</label>
                      <input className={inputCls} value={factory.lead_time}
                        onChange={e => updFactory(idx, 'lead_time', e.target.value)}
                        placeholder={t('예: 15일 (샘플 7일)', '示例：15天（样品7天）')} />
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <label className={labelCls}>{t('결제 조건', '付款条件')}</label>
                      <input className={inputCls} value={factory.payment_terms}
                        onChange={e => updFactory(idx, 'payment_terms', e.target.value)}
                        placeholder={t('예: T/T 30% 선금, 70% 선적 전', '示例：电汇30%定金，70%装运前付清')} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={factory.verified}
                      onChange={e => updFactory(idx, 'verified', e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="text-sm text-gray-700">{t('✅ 영업 가능 확인 완료', '✅ 已确认可营业')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={factory.custom_ip}
                      onChange={e => updFactory(idx, 'custom_ip', e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="text-sm text-gray-700">{t('🎨 자체 IP 제작 가능', '🎨 可自制IP')}</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── STEP 4: 샘플 안내 ─── */}
      {step === 4 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">{t('📦 샘플 안내 및 비용', '📦 样品说明及费用')}</h2>
          <p className="text-xs text-gray-400 mb-5">{t('💡 노란 입력란에 샘플비를 입력하면 바이어에게 결제 요청 버튼이 표시됩니다.', '💡 在黄色输入框填写样品费后，买家将显示付款请求按钮。')}</p>
          <div className="space-y-5">
            {report.sample_info.map((si, idx) => {
              const factory = report.factories[idx];
              return (
                <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{idx + 1}</span>
                    <h3 className="font-bold text-gray-800 text-sm">{factory?.name || `공장 ${idx + 1}`}</h3>
                    {factory?.cover_photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={factory.cover_photo} alt="" className="w-8 h-8 rounded-lg object-cover ml-auto" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>{t('제작 기간', '制作周期')}</label>
                      <input className={inputCls} value={si.production_days}
                        onChange={e => { const s = [...report.sample_info]; s[idx] = { ...s[idx], production_days: e.target.value }; upd(['sample_info'], s); }}
                        placeholder={t('예: 7일', '示例：7天')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">{t('🟡 샘플 제작비 *', '🟡 样品制作费 *')}</label>
                      <input className="w-full border-2 border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-amber-50 font-bold"
                        value={si.factory_cost}
                        onChange={e => { const s = [...report.sample_info]; s[idx] = { ...s[idx], factory_cost: e.target.value }; upd(['sample_info'], s); }}
                        placeholder={t('예: ¥150 / $21', '示例：¥150 / $21')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-700 mb-1">{t('🟡 배송비 *', '🟡 运费 *')}</label>
                      <input className="w-full border-2 border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-amber-50 font-bold"
                        value={si.shipping_cost}
                        onChange={e => { const s = [...report.sample_info]; s[idx] = { ...s[idx], shipping_cost: e.target.value }; upd(['sample_info'], s); }}
                        placeholder={t('예: ¥80 / $11', '示例：¥80 / $11')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">{t('🔵 총 청구 금액 *', '🔵 总计金额 *')}</label>
                      <input className="w-full border-2 border-blue-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-blue-50 font-black text-blue-800"
                        value={si.total_cost}
                        onChange={e => { const s = [...report.sample_info]; s[idx] = { ...s[idx], total_cost: e.target.value }; upd(['sample_info'], s); }}
                        placeholder={t('예: ¥230 / $32', '示例：¥230 / $32')} />
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <label className={labelCls}>{t('본 발주 시 공제 조건', '本订单扣除条件')}</label>
                      <input className={inputCls} value={si.bulk_deduction}
                        onChange={e => { const s = [...report.sample_info]; s[idx] = { ...s[idx], bulk_deduction: e.target.value }; upd(['sample_info'], s); }}
                        placeholder={t('예: 본 발주 진행 시 샘플비 50% 공제', '示例：正式下单时样品费抵扣50%')} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── STEP 5: 리스크 체크 ─── */}
      {step === 5 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">{t('⚠️ 리스크 체크', '⚠️ 风险检查')}</h2>
          <div className="space-y-4">
            {[
              { key: 'ip_risk', icon: '🎨', label: 'IP 이슈', color: 'purple', placeholder: '예: 해당 제품 유사 캐릭터 IP 침해 가능성 있음. 자체 디자인 제작 권장. 특허 출원 여부 확인 필요.' },
              { key: 'customs_risk', icon: '🛃', label: '통관 이슈', color: 'orange', placeholder: '예: KC 인증 필수 품목. 공장 #1, #2는 KC 보유, #3은 신청 중으로 통관 지연 가능성 있음.' },
              { key: 'quality_risk', icon: '🔍', label: '품질 이슈', color: 'red', placeholder: '예: 봉제 마감 품질 편차 주의. 첫 발주 시 전수검수 권장. 원단 소재 확인 필요.' },
              { key: 'delivery_risk', icon: '🚚', label: '납기 이슈', color: 'blue', placeholder: '예: 춘절(1~2월) 기간 생산 중단. 해당 기간 발주 시 리드타임 +20일 예상.' },
            ].map(({ key, icon, label, color, placeholder }) => (
              <div key={key} className={`bg-${color}-50 rounded-2xl p-4 border border-${color}-100`}>
                <label className={`block text-sm font-bold text-${color}-800 mb-2`}>{icon} {label}</label>
                <textarea
                  className={`w-full border border-${color}-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-${color}-400 bg-white`}
                  rows={3}
                  value={(report.risk_assessment as any)[key] || ''}
                  onChange={e => upd(['risk_assessment', key], e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP 6: 추천 상품 ─── */}
      {step === 6 && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">{t('🛍️ 추천 상품 리스트', '🛍️ 推荐商品列表')}</h2>
            <button
              onClick={() => upd(['recommended_products'], [...report.recommended_products, { name: '', category: '', price_range: '', moq: '', features: '', reason: '', photo_url: '' }])}
              className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >{t('+ 상품 추가', '+ 添加商品')}</button>
          </div>
          <div className="space-y-5">
            {report.recommended_products.map((prod, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-700">추천 상품 #{idx + 1}</span>
                  {report.recommended_products.length > 1 && (
                    <button onClick={() => upd(['recommended_products'], report.recommended_products.filter((_, i) => i !== idx))}
                      className="text-xs text-red-400 hover:text-red-600">{t('삭제', '删除')}</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <ImageUploader
                      label="상품 사진"
                      value={prod.photo_url || ''}
                      onChange={v => { const p = [...report.recommended_products]; p[idx] = { ...p[idx], photo_url: v }; upd(['recommended_products'], p); }}
                      folder="reports/products"
                      aspectRatio="aspect-square"
                      placeholder={t('상품 사진 업로드', '上传商品图片')}
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>{t('상품명 *', '商品名称 *')}</label>
                      <input className={inputCls} value={prod.name}
                        onChange={e => { const p = [...report.recommended_products]; p[idx] = { ...p[idx], name: e.target.value }; upd(['recommended_products'], p); }}
                        placeholder={t('예: 미니 봉제 키링', '示例：迷你缝制钥匙扣')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('카테고리', '类别')}</label>
                      <input className={inputCls} value={prod.category}
                        onChange={e => { const p = [...report.recommended_products]; p[idx] = { ...p[idx], category: e.target.value }; upd(['recommended_products'], p); }}
                        placeholder={t('예: 봉제 소품', '示例：缝制配件')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('가격대', '价格区间')}</label>
                      <input className={inputCls} value={prod.price_range}
                        onChange={e => { const p = [...report.recommended_products]; p[idx] = { ...p[idx], price_range: e.target.value }; upd(['recommended_products'], p); }}
                        placeholder={t('예: $0.8~$1.2', '示例：$0.8~$1.2')} />
                    </div>
                    <div>
                      <label className={labelCls}>MOQ</label>
                      <input className={inputCls} value={prod.moq}
                        onChange={e => { const p = [...report.recommended_products]; p[idx] = { ...p[idx], moq: e.target.value }; upd(['recommended_products'], p); }}
                        placeholder={t('예: 500개', '示例：500个')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('사이즈/특징', '尺寸/特点')}</label>
                      <input className={inputCls} value={prod.features}
                        onChange={e => { const p = [...report.recommended_products]; p[idx] = { ...p[idx], features: e.target.value }; upd(['recommended_products'], p); }}
                        placeholder={t('예: 5~8cm, 스트랩 포함', '示例：5~8cm，含挂绳')} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>{t('추천 이유', '推荐理由')}</label>
                      <input className={inputCls} value={prod.reason}
                        onChange={e => { const p = [...report.recommended_products]; p[idx] = { ...p[idx], reason: e.target.value }; upd(['recommended_products'], p); }}
                        placeholder={t('예: 물류비 절감, 뽑기 기계 호환 최적 사이즈', '示例：降低物流成本，抓娃娃机兼容最佳尺寸')} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP 7: 미리보기 ─── */}
      {step === 7 && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">{t('👁️ 보고서 미리보기', '👁️ 报告预览')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/report/${reportId}`, '_blank')}
                className="text-sm bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
              >{t('🖥️ 전체화면', '🖥️ 全屏')}</button>
              {report.status === 'published' && (
                <button
                  onClick={async () => {
                    const email = prompt('발송할 바이어 이메일:');
                    if (email) {
                      await supabase.from('market_research_reports').update({ status: 'sent', sent_at: new Date().toISOString(), sent_to_email: email }).eq('id', reportId);
                      setReport(prev => prev ? { ...prev, status: 'sent', sent_to_email: email } : prev);
                      alert(`📤 ${email}로 발송 완료!\n바이어 열람 링크: ${window.location.origin}/report/${reportId}`);
                    }
                  }}
                  className="text-sm bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
                >{t('📤 바이어에게 발송', '📤 发送给买家')}</button>
              )}
            </div>
          </div>

          {/* 미리보기 카드 */}
          {report.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.cover_image} alt={t('커버', '封面')} className="w-full h-40 object-cover rounded-2xl mb-4" />
          )}
          <div className="bg-gradient-to-r from-indigo-900 to-blue-800 rounded-2xl p-6 text-white mb-4">
            <div className="text-xs text-indigo-300 mb-1">KERYX MARKET RESEARCH REPORT · CONFIDENTIAL</div>
            <div className="text-2xl font-black mb-1">{report.report_title || '(제목 없음)'}</div>
            <div className="text-sm text-indigo-200">{report.buyer_company && `${report.buyer_company} · `}{report.buyer_name} 귀중</div>
            <div className="text-xs text-indigo-300 mt-2">{report.issued_at} · {report.report_no}</div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { n: report.factories.filter(f => f.name).length, l: '추천 공장', c: 'text-indigo-600' },
              { n: report.regions.filter(r => r.name).length, l: '산지 분포', c: 'text-green-600' },
              { n: report.recommended_products.filter(p => p.name).length, l: '추천 상품', c: 'text-orange-600' },
              { n: [report.risk_assessment.ip_risk, report.risk_assessment.customs_risk, report.risk_assessment.quality_risk, report.risk_assessment.delivery_risk].filter(Boolean).length, l: '리스크 항목', c: 'text-red-500' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-black ${item.c}`}>{item.n}</div>
                <div className="text-xs text-gray-400">{item.l}</div>
              </div>
            ))}
          </div>

          {report.market_summary.one_liner && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
              <div className="text-xs font-bold text-blue-700 mb-1">{t('📊 시장 핵심 요약', '📊 市场核心总结')}</div>
              <p className="text-sm text-blue-900">{report.market_summary.one_liner}</p>
            </div>
          )}

          {report.factories.filter(f => f.name).length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-indigo-50">
                    {['순위', '공장명', 'MOQ', '단가(300개)', '리드타임', 'KC인증'].map(h => (
                      <th key={h} className="border border-indigo-100 px-2 py-2 text-left text-indigo-700 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.factories.filter(f => f.name).map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-2 py-2 text-center font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</td>
                      <td className="border border-gray-200 px-2 py-2 font-medium">{f.name}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{f.moq}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{f.price_300}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{f.lead_time}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${f.kc_status === '보유' ? 'bg-green-100 text-green-700' : f.kc_status === '신청중' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{f.kc_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="text-xs font-bold text-amber-700 mb-1">{t('💡 완성 후 발송 방법', '💡 完成后发货方式')}</div>
            <p className="text-xs text-amber-700">{t('1. 상단', '1. 顶部')} <strong>{t('✅ 완성', '✅ 完成')}</strong> {t('버튼 클릭 → 2.', '点击按钮 → 2.')} <strong>{t('📤 바이어에게 발송', '📤 发送给买家')}</strong> {t('버튼 클릭 → 3. 이메일 입력 → 바이어 열람 링크 자동 생성', '点击按钮 → 3. 输入邮箱 → 自动生成买方查看链接')}</p>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="flex justify-between mt-4">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-colors">
          {t('← 이전', '← 上一页')}
        </button>
        {step < 7 ? (
          <button onClick={() => setStep(s => Math.min(7, s + 1))}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
            {t('다음 →', '下一步 →')}
          </button>
        ) : (
          <button onClick={() => save('published')} disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
            {t('✅ 보고서 완성', '✅ 报告完成')}
          </button>
        )}
      </div>
    </div>
  );
}
