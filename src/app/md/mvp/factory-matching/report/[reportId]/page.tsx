'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploader from '@/components/report/ImageUploader';
import MultiImageUploader from '@/components/report/MultiImageUploader';

// ─── 타입 ───────────────────────────────────────────────────
interface MatchedFactory {
  rank: number; name: string; name_zh: string; location: string;
  founded_year: string; employee_count: string; monthly_capacity: string;
  main_products: string; certifications: string[]; kc_status: string;
  custom_ip: boolean; moq: string; price_range: string;
  lead_time: string; payment_terms: string;
  verified: boolean; contacted: boolean; sample_available: boolean;
  match_score: number; match_reason: string;
  cover_photo: string; photos: string[];
  strengths: string; weaknesses: string;
  contact_name: string; contact_wechat: string;
}
interface MatchReport {
  id: string; report_no: string; request_id: string | null; status: string;
  report_title: string; buyer_name: string; buyer_company: string;
  product_name: string; issued_at: string; cover_image: string;
  buyer_requirements: {
    product_desc: string; target_price: string; target_moq: string;
    required_certs: string; delivery_region: string; special_requirements: string;
  };
  factories: MatchedFactory[];
  comparison_notes: string;
  next_steps: string;
  risk_notes: string;
  internal_memo: string;
  sent_at: string | null; sent_to_email: string | null;
  created_at: string; updated_at: string;
}

const STEPS = [
  { id: 1, icon: '📋', label: '기본 정보' },
  { id: 2, icon: '📝', label: '바이어 요구사항' },
  { id: 3, icon: '🏭', label: '매칭 공장' },
  { id: 4, icon: '📊', label: '비교 분석' },
  { id: 5, icon: '🚀', label: '다음 단계' },
  { id: 6, icon: '👁️', label: '미리보기' },
];

const DEF_FACTORY: MatchedFactory = {
  rank: 1, name: '', name_zh: '', location: '', founded_year: '',
  employee_count: '', monthly_capacity: '', main_products: '',
  certifications: [], kc_status: '없음', custom_ip: false,
  moq: '', price_range: '', lead_time: '', payment_terms: '',
  verified: false, contacted: false, sample_available: false,
  match_score: 80, match_reason: '',
  cover_photo: '', photos: [],
  strengths: '', weaknesses: '',
  contact_name: '', contact_wechat: '',
};

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";
const cardCls = "bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm";

export default function FactoryMatchingReportEditor() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<MatchReport | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchReport(); }, [reportId]);

  async function fetchReport() {
    setLoading(true);
    const { data, error } = await supabase
      .from('factory_match_reports').select('*').eq('id', reportId).single() as any;
    if (error || !data) {
      alert('보고서를 찾을 수 없습니다.');
      router.push('/md/mvp/factory-matching');
      return;
    }
    const r = data as MatchReport;
    if (!r.factories?.length) r.factories = [
      { ...DEF_FACTORY, rank: 1 }, { ...DEF_FACTORY, rank: 2 }, { ...DEF_FACTORY, rank: 3 }
    ];
    if (!r.buyer_requirements) r.buyer_requirements = {
      product_desc: '', target_price: '', target_moq: '',
      required_certs: '', delivery_region: '', special_requirements: ''
    };
    if (!r.cover_image) r.cover_image = '';
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
      buyer_requirements: report.buyer_requirements,
      factories: report.factories,
      comparison_notes: report.comparison_notes,
      next_steps: report.next_steps,
      risk_notes: report.risk_notes,
      internal_memo: report.internal_memo,
    };
    if (newStatus) payload.status = newStatus;
    const { error } = await supabase.from('factory_match_reports').update(payload).eq('id', reportId);
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

  function updFactory(idx: number, field: keyof MatchedFactory, value: any) {
    setReport(prev => {
      if (!prev) return prev;
      const factories = JSON.parse(JSON.stringify(prev.factories));
      factories[idx] = { ...factories[idx], [field]: value };
      return { ...prev, factories };
    });
  }

  if (loading || !report) {
    return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-5xl mb-3 animate-pulse">🏭</div><p className="text-gray-400 text-sm">{t('보고서 불러오는 중...', '报告加载中...')}</p></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
            <Link href="/md/mvp/factory-matching" className="hover:text-gray-600">{t('← 공장매칭 목록', '← 工厂匹配列表')}</Link>
            <span>/</span>
            <span className="font-mono text-xs">{report.report_no}</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            🏭 공장매칭 보고서 작성
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
                await supabase.from('factory_match_reports').update({ status: 'sent', sent_at: new Date().toISOString(), sent_to_email: email }).eq('id', reportId);
                setReport(prev => prev ? { ...prev, status: 'sent', sent_to_email: email } : prev);
                alert(`${email}로 발송 완료!\n바이어 링크: ${window.location.origin}/report/factory/${reportId}`);
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
              folder="reports/factory/covers"
              aspectRatio="aspect-[3/1]"
              placeholder={t('공장 또는 제품 대표 이미지', '工厂或产品代表图片')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>{t('보고서 제목 *', '报告标题 *')}</label>
              <input className={inputCls} value={report.report_title}
                onChange={e => upd(['report_title'], e.target.value)}
                placeholder={t('예: 봉제인형 공장매칭 보고서', '示例：缝制玩偶工厂匹配报告')} />
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
              <label className={labelCls}>{t('매칭 제품명 *', '匹配产品名 *')}</label>
              <input className={inputCls} value={report.product_name}
                onChange={e => upd(['product_name'], e.target.value)} placeholder={t('예: 뽑기용 봉제인형 (15cm)', '示例：抓娃娃用缝制玩偶（15cm）')} />
            </div>
            <div>
              <label className={labelCls}>{t('발행일', '发布日期')}</label>
              <input type="date" className={inputCls} value={report.issued_at || ''}
                onChange={e => upd(['issued_at'], e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>{t('내부 메모 (바이어 비공개)', '内部备注（买家不可见）')}</label>
              <textarea className={inputCls} rows={2} value={report.internal_memo || ''}
                onChange={e => upd(['internal_memo'], e.target.value)} placeholder={t('내부 참고사항...', '内部参考事项...')} />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: 바이어 요구사항 ─── */}
      {step === 2 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('📝 바이어 요구사항 정리', '📝 买家需求整理')}</h2>
          <p className="text-xs text-gray-400 mb-4">{t('바이어가 신청 시 제출한 요구사항을 정리하여 보고서에 포함합니다.', '整理买方申请时提交的需求并包含在报告中。')}</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t('제품 상세 설명', '产品详细说明')}</label>
              <textarea className={inputCls} rows={3} value={report.buyer_requirements.product_desc}
                onChange={e => upd(['buyer_requirements', 'product_desc'], e.target.value)}
                placeholder={t('예: 15cm 봉제 캐릭터 인형, 자체 IP 적용, KC 인증 필수, 뽑기 기계 규격 준수', '示例：15cm缝制角色玩偶，自有IP，必需KC认证，符合抓娃娃机规格')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t('목표 단가', '目标单价')}</label>
                <input className={inputCls} value={report.buyer_requirements.target_price}
                  onChange={e => upd(['buyer_requirements', 'target_price'], e.target.value)}
                  placeholder={t('예: $2.0~$2.5 (FOB)', '示例：$2.0~$2.5（FOB）')} />
              </div>
              <div>
                <label className={labelCls}>{t('목표 MOQ', '目标最小订量')}</label>
                <input className={inputCls} value={report.buyer_requirements.target_moq}
                  onChange={e => upd(['buyer_requirements', 'target_moq'], e.target.value)}
                  placeholder={t('예: 500개 이하', '示例：少于500个')} />
              </div>
              <div>
                <label className={labelCls}>{t('필수 인증', '必需认证')}</label>
                <input className={inputCls} value={report.buyer_requirements.required_certs}
                  onChange={e => upd(['buyer_requirements', 'required_certs'], e.target.value)}
                  placeholder={t('예: KC 인증 필수, CE 우대', '示例：必需KC认证，优先CE认证')} />
              </div>
              <div>
                <label className={labelCls}>{t('납품 지역', '交货地区')}</label>
                <input className={inputCls} value={report.buyer_requirements.delivery_region}
                  onChange={e => upd(['buyer_requirements', 'delivery_region'], e.target.value)}
                  placeholder={t('예: 한국 (인천항 또는 부산항)', '示例：韩国（仁川港或釜山港）')} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>{t('특별 요구사항', '特殊要求')}</label>
                <textarea className={inputCls} rows={2} value={report.buyer_requirements.special_requirements}
                  onChange={e => upd(['buyer_requirements', 'special_requirements'], e.target.value)}
                  placeholder={t('예: 자체 IP 캐릭터 적용 가능 공장, 소량 다품종 대응 가능, 빠른 샘플 제작', '示例：支持自有IP角色，支持小批多样，快速样品制作')} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: 매칭 공장 ─── */}
      {step === 3 && (
        <div className="space-y-5">
          {report.factories.map((factory, idx) => (
            <div key={idx} className={cardCls}>
              <div className="flex items-center gap-3 mb-5">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{idx + 1}</span>
                <h2 className="text-base font-bold text-gray-900">
                  {idx === 0 ? '🥇 1순위 매칭 공장' : idx === 1 ? '🥈 2순위 매칭 공장' : '🥉 3순위 매칭 공장'}
                </h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('매칭 점수', '匹配分数')}</span>
                  <input type="number" min="0" max="100"
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center font-bold text-indigo-700"
                    value={factory.match_score}
                    onChange={e => updFactory(idx, 'match_score', Number(e.target.value))} />
                  <span className="text-xs text-gray-500">/ 100</span>
                </div>
              </div>

              {/* 공장 사진 */}
              <div className="mb-4">
                <ImageUploader
                  label="공장 대표 사진"
                  value={factory.cover_photo || ''}
                  onChange={v => updFactory(idx, 'cover_photo', v)}
                  folder="reports/factory/photos"
                  aspectRatio="aspect-video"
                  placeholder={t('공장 외관 또는 생산라인 사진', '工厂外观或生产线照片')}
                />
              </div>
              <div className="mb-4">
                <MultiImageUploader
                  label="공장 추가 사진 (최대 6장)"
                  values={factory.photos || []}
                  onChange={v => updFactory(idx, 'photos', v)}
                  folder="reports/factory/photos"
                  maxCount={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('공장명 (한국어) *', '工厂名称（韩文）*')}</label>
                  <input className={inputCls} value={factory.name}
                    onChange={e => updFactory(idx, 'name', e.target.value)} placeholder={t('예: 이우 봉제 공장', '示例：义乌缝制工厂')} />
                </div>
                <div>
                  <label className={labelCls}>{t('공장명 (중국어)', '工厂名称（中文）')}</label>
                  <input className={inputCls} value={factory.name_zh}
                    onChange={e => updFactory(idx, 'name_zh', e.target.value)} placeholder="例: 义乌毛绒玩具厂" />
                </div>
                <div>
                  <label className={labelCls}>{t('위치', '位置')}</label>
                  <input className={inputCls} value={factory.location}
                    onChange={e => updFactory(idx, 'location', e.target.value)} placeholder={t('예: 저장성 이우시', '示例：浙江省义乌市')} />
                </div>
                <div>
                  <label className={labelCls}>{t('설립연도', '成立年份')}</label>
                  <input className={inputCls} value={factory.founded_year}
                    onChange={e => updFactory(idx, 'founded_year', e.target.value)} placeholder={t('예: 2010년', '示例：2010年')} />
                </div>
                <div>
                  <label className={labelCls}>{t('직원 수', '员工数')}</label>
                  <input className={inputCls} value={factory.employee_count}
                    onChange={e => updFactory(idx, 'employee_count', e.target.value)} placeholder={t('예: 150명', '示例：150人')} />
                </div>
                <div>
                  <label className={labelCls}>{t('월 생산 캐파', '月产能')}</label>
                  <input className={inputCls} value={factory.monthly_capacity}
                    onChange={e => updFactory(idx, 'monthly_capacity', e.target.value)} placeholder={t('예: 30만개/월', '示例：30万件/月')} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{t('주력 제품', '主打产品')}</label>
                  <input className={inputCls} value={factory.main_products}
                    onChange={e => updFactory(idx, 'main_products', e.target.value)} placeholder={t('예: 봉제인형, 캐릭터 굿즈, 키링', '示例：缝制玩偶，角色周边，钥匙扣')} />
                </div>
                <div>
                  <label className={labelCls}>{t('인증 (쉼표 구분)', '认证（逗号分隔）')}</label>
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

                {/* 견적 */}
                <div className="md:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-800 mb-3">{t('💰 견적 정보', '💰 报价信息')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls}>MOQ</label>
                      <input className={inputCls} value={factory.moq}
                        onChange={e => updFactory(idx, 'moq', e.target.value)} placeholder={t('예: 300개', '示例：300个')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('단가 범위', '单价范围')}</label>
                      <input className={inputCls} value={factory.price_range}
                        onChange={e => updFactory(idx, 'price_range', e.target.value)} placeholder={t('예: $2.0~$2.5', '示例：$2.0~$2.5')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('리드타임', '交期')}</label>
                      <input className={inputCls} value={factory.lead_time}
                        onChange={e => updFactory(idx, 'lead_time', e.target.value)} placeholder={t('예: 20일', '示例：20天')} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('결제 조건', '付款条件')}</label>
                      <input className={inputCls} value={factory.payment_terms}
                        onChange={e => updFactory(idx, 'payment_terms', e.target.value)} placeholder={t('예: T/T 30/70', '示例：电汇30/70')} />
                    </div>
                  </div>
                </div>

                {/* 매칭 이유 */}
                <div className="md:col-span-2 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <label className="block text-sm font-bold text-indigo-800 mb-2">{t('🎯 매칭 이유 (바이어에게 표시)', '🎯 匹配理由（买家可见）')}</label>
                  <textarea className={inputCls} rows={2} value={factory.match_reason}
                    onChange={e => updFactory(idx, 'match_reason', e.target.value)}
                    placeholder={t('예: KC 인증 보유, 자체 IP 제작 경험 풍부, 소량 주문 대응 가능, 한국 수출 경험 다수', '示例：持有KC认证，丰富自有IP制作经验，支持小批量订单，多次出口韩国')} />
                </div>

                <div>
                  <label className={labelCls}>{t('장점', '优势')}</label>
                  <textarea className={inputCls} rows={2} value={factory.strengths}
                    onChange={e => updFactory(idx, 'strengths', e.target.value)} placeholder={t('예: 품질 우수, 납기 준수율 높음', '示例：质量优良，交期遵守率高')} />
                </div>
                <div>
                  <label className={labelCls}>{t('단점 / 주의사항', '缺点 / 注意事项')}</label>
                  <textarea className={inputCls} rows={2} value={factory.weaknesses}
                    onChange={e => updFactory(idx, 'weaknesses', e.target.value)} placeholder={t('예: MOQ 높음, 성수기 납기 지연', '示例：最低订量高，旺季交期延迟')} />
                </div>

                {/* 담당자 정보 */}
                <div>
                  <label className={labelCls}>{t('담당자명', '负责人姓名')}</label>
                  <input className={inputCls} value={factory.contact_name}
                    onChange={e => updFactory(idx, 'contact_name', e.target.value)} placeholder={t('예: 왕샤오밍 (王小明)', '示例：王小明')} />
                </div>
                <div>
                  <label className={labelCls}>{t('위챗 ID', '微信ID')}</label>
                  <input className={inputCls} value={factory.contact_wechat}
                    onChange={e => updFactory(idx, 'contact_wechat', e.target.value)} placeholder={t('예: wangxm_factory', '示例：wangxm_factory')} />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={factory.verified}
                      onChange={e => updFactory(idx, 'verified', e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="text-sm text-gray-700">{t('✅ 영업 가능 확인', '✅ 确认可营业')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={factory.contacted}
                      onChange={e => updFactory(idx, 'contacted', e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="text-sm text-gray-700">{t('📞 연락 완료', '📞 联系完成')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={factory.sample_available}
                      onChange={e => updFactory(idx, 'sample_available', e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="text-sm text-gray-700">{t('📦 샘플 제작 가능', '📦 可制作样品')}</span>
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

      {/* ─── STEP 4: 비교 분석 ─── */}
      {step === 4 && (
        <div className={cardCls}>
          <h2 className="text-base font-bold text-gray-900 mb-5">{t('📊 공장 비교 분석', '📊 工厂对比分析')}</h2>

          {/* 비교표 미리보기 */}
          {report.factories.filter(f => f.name).length > 0 && (
            <div className="overflow-x-auto mb-5">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-indigo-50">
                    {['항목', ...report.factories.filter(f => f.name).map((f, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${f.name}`)].map(h => (
                      <th key={h} className="border border-indigo-100 px-2 py-2 text-left text-indigo-700 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: '매칭 점수', fn: (f: MatchedFactory) => `${f.match_score}점` },
                    { label: 'MOQ', fn: (f: MatchedFactory) => f.moq },
                    { label: '단가', fn: (f: MatchedFactory) => f.price_range },
                    { label: '리드타임', fn: (f: MatchedFactory) => f.lead_time },
                    { label: 'KC 인증', fn: (f: MatchedFactory) => f.kc_status },
                    { label: '샘플 가능', fn: (f: MatchedFactory) => f.sample_available ? '✅' : '❌' },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-2 py-2 font-medium text-gray-600">{row.label}</td>
                      {report.factories.filter(f => f.name).map((f, i) => (
                        <td key={i} className="border border-gray-200 px-2 py-2 text-center">{row.fn(f)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className={labelCls}>{t('비교 분석 코멘트 (MD 의견)', '比较分析评论（负责人意见）')}</label>
            <textarea className={inputCls} rows={6} value={report.comparison_notes || ''}
              onChange={e => upd(['comparison_notes'], e.target.value)}
              placeholder={`예:\n• 1순위 공장은 KC 인증 보유 및 자체 IP 제작 경험이 풍부하여 가장 적합합니다.\n• 2순위 공장은 단가가 낮지만 MOQ가 높아 초기 발주에 부담이 있습니다.\n• 3순위 공장은 납기가 빠르지만 KC 인증이 없어 추가 비용이 발생할 수 있습니다.`}
            />
          </div>
        </div>
      )}

      {/* ─── STEP 5: 다음 단계 ─── */}
      {step === 5 && (
        <div className="space-y-5">
          <div className={cardCls}>
            <h2 className="text-base font-bold text-gray-900 mb-5">{t('🚀 다음 단계 안내', '🚀 下一步指南')}</h2>
            <textarea className={inputCls} rows={8} value={report.next_steps || ''}
              onChange={e => upd(['next_steps'], e.target.value)}
              placeholder={`예:\n1. 추천 공장 1순위 선택 확인 (바이어 회신 요청)\n2. 샘플 제작 진행 — 샘플비 결제 후 7일 내 발송\n3. 샘플 수령 후 품질 확인 및 수정 요청\n4. 최종 공장 확정 후 본 발주 계약 진행\n5. 발주 후 20일 생산 → 검수 → 해운 → 한국 도착\n\n문의사항은 담당 MD에게 연락 주세요.`}
            />
          </div>
          <div className={cardCls}>
            <h2 className="text-base font-bold text-gray-900 mb-4">{t('⚠️ 주의사항 및 리스크', '⚠️ 注意事项及风险')}</h2>
            <textarea className={inputCls} rows={6} value={report.risk_notes || ''}
              onChange={e => upd(['risk_notes'], e.target.value)}
              placeholder={`예:\n• IP 이슈: 캐릭터 디자인 사용 전 저작권 확인 필수\n• KC 인증: 14세 이하 완구는 KC 인증 없이 통관 불가\n• 춘절 기간(1~2월): 공장 가동 중단으로 납기 지연 가능\n• 환율 변동: 견적은 USD 기준이며 환율에 따라 원화 금액 변동`}
            />
          </div>
        </div>
      )}

      {/* ─── STEP 6: 미리보기 ─── */}
      {step === 6 && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">{t('👁️ 보고서 미리보기', '👁️ 报告预览')}</h2>
            <div className="flex gap-2">
              <button onClick={() => window.open(`/report/factory/${reportId}`, '_blank')}
                className="text-sm bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-gray-200">{t('🖥️ 전체화면', '🖥️ 全屏')}</button>
              {report.status === 'published' && (
                <button onClick={async () => {
                  const email = prompt('발송할 바이어 이메일:');
                  if (email) {
                    await supabase.from('factory_match_reports').update({ status: 'sent', sent_at: new Date().toISOString(), sent_to_email: email }).eq('id', reportId);
                    setReport(prev => prev ? { ...prev, status: 'sent', sent_to_email: email } : prev);
                    alert(`📤 ${email}로 발송 완료!\n바이어 링크: ${window.location.origin}/report/factory/${reportId}`);
                  }
                }} className="text-sm bg-green-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-green-700">{t('📤 바이어에게 발송', '📤 发送给买家')}</button>
              )}
            </div>
          </div>

          {report.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.cover_image} alt={t('커버', '封面')} className="w-full h-40 object-cover rounded-2xl mb-4" />
          )}
          <div className="bg-gradient-to-r from-orange-900 to-amber-800 rounded-2xl p-6 text-white mb-4">
            <div className="text-xs text-orange-300 mb-1">KERYX FACTORY MATCHING REPORT · CONFIDENTIAL</div>
            <div className="text-2xl font-black mb-1">{report.report_title || '(제목 없음)'}</div>
            <div className="text-sm text-orange-200">{report.buyer_company && `${report.buyer_company} · `}{report.buyer_name} 귀중</div>
            <div className="text-xs text-orange-300 mt-2">{report.issued_at} · {report.report_no}</div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { n: report.factories.filter(f => f.name).length, l: '매칭 공장', c: 'text-orange-600' },
              { n: report.factories.filter(f => f.verified).length, l: '영업 확인', c: 'text-green-600' },
              { n: report.factories.filter(f => f.kc_status === '보유').length, l: 'KC 보유', c: 'text-blue-600' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-black ${item.c}`}>{item.n}</div>
                <div className="text-xs text-gray-400">{item.l}</div>
              </div>
            ))}
          </div>

          {report.factories.filter(f => f.name).length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-orange-50">
                    {['순위', '공장명', '매칭점수', 'MOQ', '단가', 'KC인증', '샘플'].map(h => (
                      <th key={h} className="border border-orange-100 px-2 py-2 text-left text-orange-700 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.factories.filter(f => f.name).map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-2 py-2 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</td>
                      <td className="border border-gray-200 px-2 py-2 font-medium">{f.name}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">
                        <span className={`font-black ${f.match_score >= 85 ? 'text-green-600' : f.match_score >= 70 ? 'text-amber-600' : 'text-red-500'}`}>{f.match_score}점</span>
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{f.moq}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{f.price_range}</td>
                      <td className="border border-gray-200 px-2 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${f.kc_status === '보유' ? 'bg-green-100 text-green-700' : f.kc_status === '신청중' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{f.kc_status}</span>
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center">{f.sample_available ? '✅' : '❌'}</td>
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
