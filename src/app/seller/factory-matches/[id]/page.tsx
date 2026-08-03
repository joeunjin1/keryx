'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

interface FactoryItem {
  id: string;
  factory_name_ko: string;
  factory_name_zh: string;
  factory_location: string;
  factory_established_year: number;
  factory_employees: number;
  factory_area_sqm: number;
  factory_certifications: string[];
  production_capacity: string;
  lead_time_days: number;
  min_order_qty: number;
  development_capability: string;
  oem_odm: string;
  quality_control: string;
  defect_rate: string;
  factory_intro: string;
  is_recommended: boolean;
  recommendation_reason: string;
  factory_photos: { url: string; title: string }[];
  equipment_photos: { url: string; title: string }[];
  products: {
    id: string;
    name_ko: string;
    name_zh: string;
    price: string;
    moq: string;
    lead_time: string;
    weight: string;
    size: string;
    options: string;
    memo: string;
    photos: { url: string; title: string }[];
  }[];
  sort_order: number;
}

interface Report {
  id: string;
  title: string;
  buyer_name: string;
  inquiry_summary: string;
  created_by_name: string;
  created_at: string;
  sent_at: string;
  factory_match_report_items: FactoryItem[];
}

export default function SellerFactoryMatchReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFactoryIdx, setActiveFactoryIdx] = useState(0);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('factory_match_reports')
          .select(`
            id, title, buyer_name, inquiry_summary, created_by_name, created_at, sent_at,
            factory_match_report_items(
              id, factory_name_ko, factory_name_zh, factory_location,
              factory_established_year, factory_employees, factory_area_sqm,
              factory_certifications, production_capacity, lead_time_days, min_order_qty,
              development_capability, oem_odm, quality_control, defect_rate,
              factory_intro, is_recommended, recommendation_reason,
              factory_photos, equipment_photos, products, sort_order
            )
          `)
          .eq('id', id)
          .single();

        if (error || !data) throw error;

        // 조회 상태 업데이트
        await supabase
          .from('factory_match_reports')
          .update({ status: 'viewed' })
          .eq('id', id)
          .eq('status', 'sent');

        // 공장 정렬
        if (data.factory_match_report_items) {
          data.factory_match_report_items.sort((a: FactoryItem, b: FactoryItem) => {
            if (a.is_recommended && !b.is_recommended) return -1;
            if (!a.is_recommended && b.is_recommended) return 1;
            return (a.sort_order || 0) - (b.sort_order || 0);
          });
        }

        setReport(data as Report);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🏭</div>
          <p className="text-gray-500">{t('보고서를 불러오는 중...', '加载报告中...')}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-gray-700 font-semibold">{t('보고서를 찾을 수 없습니다.', '找不到报告。')}</p>
          <button onClick={() => router.back()} className="mt-4 text-indigo-600 text-sm hover:underline">
            ← {t('뒤로', '返回')}
          </button>
        </div>
      </div>
    );
  }

  const factories = report.factory_match_report_items || [];
  const activeFactory = factories[activeFactoryIdx];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 라이트박스 */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <img src={lightboxPhoto} alt="사진" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">×</button>
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm opacity-80">🏭 {t('공장 매칭 보고서', '工厂匹配报告')}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
          <div className="flex items-center gap-4 text-sm opacity-80">
            <span>👤 {t('담당 MD', '负责MD')}: {report.created_by_name}</span>
            <span>📅 {new Date(report.sent_at || report.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}</span>
            <span>🏭 {factories.length}{t('개 공장 매칭', '家工厂匹配')}</span>
          </div>
          {report.inquiry_summary && (
            <div className="mt-4 p-3 bg-white/10 rounded-lg text-sm">
              <p className="font-medium mb-1">📋 {t('문의 내용', '询价内容')}</p>
              <p className="opacity-90">{report.inquiry_summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* 공장 탭 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3">
            {factories.map((f, idx) => (
              <button
                key={f.id}
                onClick={() => setActiveFactoryIdx(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFactoryIdx === idx
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.is_recommended && <span>⭐</span>}
                {lang === 'zh' ? (f.factory_name_zh || f.factory_name_ko) : f.factory_name_ko}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 공장 상세 */}
      {activeFactory && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* 추천 배너 */}
          {activeFactory.is_recommended && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">⭐</span>
                <span className="font-bold text-yellow-800">{t('담당 MD 추천 공장', 'MD推荐工厂')}</span>
              </div>
              {activeFactory.recommendation_reason && (
                <p className="text-sm text-yellow-700">{activeFactory.recommendation_reason}</p>
              )}
            </div>
          )}

          {/* 공장 기본 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">
              🏭 {lang === 'zh' ? (activeFactory.factory_name_zh || activeFactory.factory_name_ko) : activeFactory.factory_name_ko}
              {activeFactory.factory_name_zh && lang !== 'zh' && (
                <span className="text-sm font-normal text-gray-400 ml-2">({activeFactory.factory_name_zh})</span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {activeFactory.factory_location && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">📍 {t('위치', '位置')}</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.factory_location}</p>
                </div>
              )}
              {activeFactory.factory_established_year && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">📅 {t('설립연도', '成立年份')}</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.factory_established_year}{t('년', '年')}</p>
                </div>
              )}
              {activeFactory.factory_employees && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">👥 {t('직원 수', '员工人数')}</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.factory_employees.toLocaleString()}{t('명', '人')}</p>
                </div>
              )}
              {activeFactory.factory_area_sqm && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">🏗 {t('공장 면적', '工厂面积')}</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.factory_area_sqm.toLocaleString()}㎡</p>
                </div>
              )}
              {activeFactory.production_capacity && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">⚙️ {t('생산 능력', '生产能力')}</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.production_capacity}</p>
                </div>
              )}
              {activeFactory.lead_time_days && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">⏱ {t('리드타임', '交货期')}</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.lead_time_days}{t('일', '天')}</p>
                </div>
              )}
              {activeFactory.min_order_qty && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">📦 MOQ</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.min_order_qty.toLocaleString()}{t('개', '件')}</p>
                </div>
              )}
              {activeFactory.defect_rate && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">✅ {t('불량률', '不良率')}</p>
                  <p className="font-semibold text-gray-800 text-sm">{activeFactory.defect_rate}</p>
                </div>
              )}
            </div>

            {/* 인증 */}
            {activeFactory.factory_certifications?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">🏅 {t('인증', '认证')}</p>
                <div className="flex flex-wrap gap-2">
                  {activeFactory.factory_certifications.map((cert, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{cert}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 공장 소개 */}
          {(activeFactory.factory_intro || activeFactory.development_capability || activeFactory.quality_control) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-bold text-gray-900">📝 {t('공장 소개', '工厂介绍')}</h2>
              {activeFactory.factory_intro && (
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{activeFactory.factory_intro}</p>
                </div>
              )}
              {activeFactory.development_capability && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">🔬 {t('개발 능력', '研发能力')}</p>
                  <p className="text-sm text-gray-700">{activeFactory.development_capability}</p>
                </div>
              )}
              {activeFactory.quality_control && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">🔍 {t('품질 관리', '质量管理')}</p>
                  <p className="text-sm text-gray-700">{activeFactory.quality_control}</p>
                </div>
              )}
            </div>
          )}

          {/* 공장 사진 */}
          {activeFactory.factory_photos?.some(p => p.url) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">📷 {t('공장 사진', '工厂照片')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {activeFactory.factory_photos.filter(p => p.url).map((photo, idx) => (
                  <div key={idx} className="cursor-pointer group" onClick={() => setLightboxPhoto(photo.url)}>
                    <div className="h-32 rounded-lg overflow-hidden bg-gray-100">
                      <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    {photo.title && <p className="text-xs text-gray-500 mt-1 text-center">{photo.title}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 설비 사진 */}
          {activeFactory.equipment_photos?.some(p => p.url) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">🔧 {t('설비 사진', '设备照片')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {activeFactory.equipment_photos.filter(p => p.url).map((photo, idx) => (
                  <div key={idx} className="cursor-pointer group" onClick={() => setLightboxPhoto(photo.url)}>
                    <div className="h-32 rounded-lg overflow-hidden bg-gray-100">
                      <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    {photo.title && <p className="text-xs text-gray-500 mt-1 text-center">{photo.title}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 제품 목록 */}
          {activeFactory.products?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">📦 {t('제품 목록', '产品列表')}</h2>
              <div className="space-y-6">
                {activeFactory.products.map((product, pIdx) => (
                  <div key={product.id || pIdx} className="border border-gray-100 rounded-xl p-5 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {lang === 'zh' ? (product.name_zh || product.name_ko) : product.name_ko}
                      {product.name_zh && lang !== 'zh' && (
                        <span className="text-sm font-normal text-gray-400 ml-2">({product.name_zh})</span>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      {product.price && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500">{t('가격', '价格')}</p>
                          <p className="font-bold text-indigo-600 text-lg">¥{product.price}</p>
                        </div>
                      )}
                      {product.moq && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500">MOQ</p>
                          <p className="font-semibold text-gray-800">{product.moq}{t('개', '件')}</p>
                        </div>
                      )}
                      {product.lead_time && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500">{t('리드타임', '交货期')}</p>
                          <p className="font-semibold text-gray-800">{product.lead_time}{t('일', '天')}</p>
                        </div>
                      )}
                      {product.weight && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500">{t('중량', '重量')}</p>
                          <p className="font-semibold text-gray-800">{product.weight}</p>
                        </div>
                      )}
                      {product.size && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500">{t('사이즈', '尺寸')}</p>
                          <p className="font-semibold text-gray-800">{product.size}</p>
                        </div>
                      )}
                      {product.options && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200 col-span-2 sm:col-span-1">
                          <p className="text-xs text-gray-500">{t('포장·옵션', '包装·选项')}</p>
                          <p className="font-semibold text-gray-800 text-sm">{product.options}</p>
                        </div>
                      )}
                    </div>
                    {product.memo && (
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200 mb-4">{product.memo}</p>
                    )}
                    {/* 제품 사진 */}
                    {product.photos?.some(p => p.url) && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {product.photos.filter(p => p.url).map((photo, phIdx) => (
                          <div key={phIdx} className="cursor-pointer group" onClick={() => setLightboxPhoto(photo.url)}>
                            <div className="h-24 rounded-lg overflow-hidden bg-gray-100">
                              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                            {photo.title && <p className="text-xs text-gray-400 mt-1 text-center truncate">{photo.title}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 문의 버튼 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 text-center">
            <h3 className="font-bold text-indigo-900 mb-2">
              {t('이 공장과 거래를 원하시나요?', '想与此工厂合作？')}
            </h3>
            <p className="text-sm text-indigo-600 mb-4">
              {t('담당 MD에게 문의하시면 빠르게 연결해 드립니다.', '请联系负责MD，我们将快速为您对接。')}
            </p>
            <button
              onClick={() => router.push('/seller/services/new')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-sm"
            >
              📩 {t('MD에게 문의하기', '联系MD')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
