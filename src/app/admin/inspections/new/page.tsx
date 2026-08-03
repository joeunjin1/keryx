'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

/* ─────────────────────────────────────────────────────────────
   검수 보고서 작성 페이지 v3 (전면 개편)
   - 바이어(셀러) 선택 → 해당 바이어 오더 목록 연동
   - 검수 사진: 제목 + 사진 등록 (여러 장)
   - 오더 수량 / 검수 완료 수량 명확히 구분
   - 불량 처리 방법: 추가제작(N일 이내) / 쇼티지(반품 금액 차감)
   - 샘플 vs 현재 비교 사진 나란히 표시
   - 검수원 현장 사진 전용 섹션
   - 바이어에게 보고서 발송 기능
   ───────────────────────────────────────────────────────────── */

type Buyer = {
  id: string;
  business_name: string;
  contact_name?: string;
};

type Order = {
  id: string;
  order_no: string;
  status: string;
  total_cny: number;
  qty_ordered?: number;
  seller?: { business_name: string };
};

type PhotoItem = {
  id: string;
  file?: File;
  preview: string;
  photoType: 'pass_sample' | 'fail_sample' | 'overview';
  caption: string;
};

// 검수 사진 (제목 + 사진 세트)
type InspectionPhotoSet = {
  id: string;
  title: string;
  photos: { id: string; file?: File; preview: string }[];
};

// 샘플 비교 사진
type SampleCompareSet = {
  id: string;
  itemName: string; // 비교 항목명
  samplePhotos: { id: string; file?: File; preview: string }[]; // 오더 확정 샘플
  currentPhotos: { id: string; file?: File; preview: string }[]; // 현재 검수 사진
};

// 검수원 현장 사진
type InspectorSitePhoto = {
  id: string;
  file?: File;
  preview: string;
  caption: string;
};

type CheckItem = {
  id: string;
  label_ko: string;
  label_zh: string;
  is_na: boolean;
  na_reason: string;
  qty_inspected: number;
  qty_passed: number;
  qty_failed: number;
  defect_grade: 'critical' | 'major' | 'minor' | '';
  defect_desc_ko: string;
  defect_desc_cn: string;
  action_ko: string;
  action_cn: string;
  photos: PhotoItem[];
};

// 고정 항목 제거 - 작성자가 자유롭게 항목을 추가하는 방식으로 변경

let idCounter = 0;
function makeId() { return `item_${++idCounter}_${Date.now()}`; }

export default function AdminInspectionNewPage() {
  useEffect(() => { document.title = '검수 보고서 작성 | KERYX'; }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ── 바이어 선택 ──
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ── 기본 정보 ──
  const [inspectorName, setInspectorName] = useState('');
  const [inspectedDate, setInspectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [inspectionLocation, setInspectionLocation] = useState('');
  const [productNameKo, setProductNameKo] = useState('');
  const [productNameCn, setProductNameCn] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState<number>(0);
  const [qtyCompleted, setQtyCompleted] = useState<number>(0);

  // ── 불량 처리 방법 ──
  const [defectAction, setDefectAction] = useState<'remanufacture' | 'shortage' | ''>('');
  const [defectActionDays, setDefectActionDays] = useState<number>(7);
  const [defectActionNotes, setDefectActionNotes] = useState('');

  // ── 체크리스트 (자유 작성 방식 - 초기 빈 항목 1개) ──
  const [checkItems, setCheckItems] = useState<CheckItem[]>([
    { id: makeId(), label_ko: '', label_zh: '', is_na: false, na_reason: '', qty_inspected: 0, qty_passed: 0, qty_failed: 0, defect_grade: '', defect_desc_ko: '', defect_desc_cn: '', action_ko: '', action_cn: '', photos: [] }
  ]);
  // newItemKo, newItemZh 제거 - 항목 추가 버튼 방식으로 변경

  // ── 검수 사진 (제목+사진 세트) ──
  const [inspectionPhotoSets, setInspectionPhotoSets] = useState<InspectionPhotoSet[]>([
    { id: makeId(), title: '', photos: [] }
  ]);

  // ── 샘플 비교 사진 ──
  const [sampleCompareSets, setSampleCompareSets] = useState<SampleCompareSet[]>([
    { id: makeId(), itemName: '', samplePhotos: [], currentPhotos: [] }
  ]);

  // ── 검수원 현장 사진 ──
  const [inspectorSitePhotos, setInspectorSitePhotos] = useState<InspectorSitePhoto[]>([]);

  // ── 통계 계산 ──
  const stats = (() => {
    const active = checkItems.filter(i => !i.is_na);
    const totalInspected = active.reduce((s, i) => s + (i.qty_inspected || 0), 0);
    const totalPassed = active.reduce((s, i) => s + (i.qty_passed || 0), 0);
    const totalFailedDedup = Math.max(0, totalInspected - totalPassed);
    const passRate = totalInspected > 0 ? Math.round((totalPassed / totalInspected) * 10000) / 100 : 0;
    const failRate = totalInspected > 0 ? Math.round((totalFailedDedup / totalInspected) * 10000) / 100 : 0;
    const defectItems = active.filter(i => i.qty_failed > 0);
    return { totalInspected, totalPassed, totalFailedDedup, passRate, failRate, defectItems };
  })();

  const finalVerdict = stats.passRate >= 99
    ? { value: 'pass', ko: '합격', zh: '合格', color: 'border-green-400 bg-green-50 text-green-800' }
    : stats.passRate >= 90
    ? { value: 'conditional_pass', ko: '조건부 합격', zh: '有条件合格', color: 'border-yellow-400 bg-yellow-50 text-yellow-800' }
    : { value: 'fail', ko: '불합격', zh: '不合格', color: 'border-red-400 bg-red-50 text-red-800' };

  // ── 초기 로딩 ──
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: me } = await supabase
        .from('user_profiles')
        .select('kind, display_name')
        .eq('id', user.id)
        .single();
      if (!me || !['admin', 'md', 'inspector'].includes(me.kind)) {
        router.push('/admin'); return;
      }
      setInspectorName(me.display_name ?? '');

      // 바이어(셀러) 목록 로드
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('id, business_name, contact_name')
        .order('business_name');
      setBuyers(sellerData ?? []);
      setLoading(false);
    })();
  }, []);

  // ── 바이어 선택 시 오더 목록 로드 ──
  const handleBuyerSelect = useCallback(async (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    setSelectedOrder(null);
    setBuyerOrders([]);
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('id, order_no, status, total_cny, qty_ordered')
      .eq('seller_id', buyer.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setBuyerOrders(data ?? []);
    setLoadingOrders(false);
  }, []);

  // ── 체크리스트 항목 업데이트 ──
  const updateItem = useCallback((id: string, field: keyof CheckItem, value: any) => {
    setCheckItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'qty_inspected' || field === 'qty_passed') {
        const qi = field === 'qty_inspected' ? Number(value) : Number(item.qty_inspected);
        const qp = field === 'qty_passed' ? Number(value) : Number(item.qty_passed);
        updated.qty_failed = Math.max(0, qi - qp);
      }
      return updated;
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setCheckItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const addItemPhotos = useCallback((itemId: string, files: FileList | null, photoType: PhotoItem['photoType']) => {
    if (!files) return;
    const newPhotos: PhotoItem[] = Array.from(files).map(f => ({
      id: makeId(), file: f, preview: URL.createObjectURL(f), photoType, caption: '',
    }));
    setCheckItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, photos: [...i.photos, ...newPhotos].slice(0, 20) } : i
    ));
  }, []);

  const removeItemPhoto = useCallback((itemId: string, pIdx: number) => {
    setCheckItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, photos: i.photos.filter((_, idx) => idx !== pIdx) } : i
    ));
  }, []);

  // ── 검수 사진 세트 관리 ──
  const addInspectionPhotoSet = () => {
    setInspectionPhotoSets(prev => [...prev, { id: makeId(), title: '', photos: [] }]);
  };
  const removeInspectionPhotoSet = (id: string) => {
    setInspectionPhotoSets(prev => prev.filter(s => s.id !== id));
  };
  const updateInspectionPhotoSetTitle = (id: string, title: string) => {
    setInspectionPhotoSets(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  };
  const addInspectionPhotos = (setId: string, files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).map(f => ({ id: makeId(), file: f, preview: URL.createObjectURL(f) }));
    setInspectionPhotoSets(prev => prev.map(s =>
      s.id === setId ? { ...s, photos: [...s.photos, ...newPhotos].slice(0, 20) } : s
    ));
  };
  const removeInspectionPhoto = (setId: string, photoId: string) => {
    setInspectionPhotoSets(prev => prev.map(s =>
      s.id === setId ? { ...s, photos: s.photos.filter(p => p.id !== photoId) } : s
    ));
  };

  // ── 샘플 비교 세트 관리 ──
  const addSampleCompareSet = () => {
    setSampleCompareSets(prev => [...prev, { id: makeId(), itemName: '', samplePhotos: [], currentPhotos: [] }]);
  };
  const removeSampleCompareSet = (id: string) => {
    setSampleCompareSets(prev => prev.filter(s => s.id !== id));
  };
  const updateSampleCompareItemName = (id: string, name: string) => {
    setSampleCompareSets(prev => prev.map(s => s.id === id ? { ...s, itemName: name } : s));
  };
  const addSampleComparePhotos = (setId: string, files: FileList | null, kind: 'sample' | 'current') => {
    if (!files) return;
    const newPhotos = Array.from(files).map(f => ({ id: makeId(), file: f, preview: URL.createObjectURL(f) }));
    setSampleCompareSets(prev => prev.map(s => {
      if (s.id !== setId) return s;
      if (kind === 'sample') return { ...s, samplePhotos: [...s.samplePhotos, ...newPhotos].slice(0, 10) };
      return { ...s, currentPhotos: [...s.currentPhotos, ...newPhotos].slice(0, 10) };
    }));
  };
  const removeSampleComparePhoto = (setId: string, photoId: string, kind: 'sample' | 'current') => {
    setSampleCompareSets(prev => prev.map(s => {
      if (s.id !== setId) return s;
      if (kind === 'sample') return { ...s, samplePhotos: s.samplePhotos.filter(p => p.id !== photoId) };
      return { ...s, currentPhotos: s.currentPhotos.filter(p => p.id !== photoId) };
    }));
  };

  // ── 검수원 현장 사진 ──
  const addInspectorSitePhotos = (files: FileList | null) => {
    if (!files) return;
    const newPhotos: InspectorSitePhoto[] = Array.from(files).map(f => ({
      id: makeId(), file: f, preview: URL.createObjectURL(f), caption: '',
    }));
    setInspectorSitePhotos(prev => [...prev, ...newPhotos].slice(0, 30));
  };
  const removeInspectorSitePhoto = (id: string) => {
    setInspectorSitePhotos(prev => prev.filter(p => p.id !== id));
  };
  const updateInspectorSiteCaption = (id: string, caption: string) => {
    setInspectorSitePhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  // ── 사진 업로드 헬퍼 ──
  const uploadPhoto = async (file: File, inspId: string, itemId: string | null, photoKind: string, category: string, title?: string, isSampleRef?: boolean) => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${inspId}/${category}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data: up } = await supabase.storage.from('inspection-photos').upload(path, file, { cacheControl: '3600', upsert: false });
    if (!up?.path) return;
    const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(up.path);
    await supabase.from('inspection_photos').insert({
      inspection_id: inspId,
      inspection_item_id: itemId,
      url: publicUrl,
      photo_kind: photoKind,
      item_photo_type: photoKind,
      photo_category: category,
      photo_title: title ?? null,
      is_sample_ref: isSampleRef ?? false,
    });
  };

  // ── 제출 ──
  const handleSubmit = useCallback(async () => {
    if (!selectedOrder) { setError(t('검수 대상 주문을 선택해주세요.', '请选择检验订单。')); return; }
    setSubmitting(true); setError('');
    try {
      // 1. 검수 시작
      const startRes = await fetch('/api/inspections/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: selectedOrder.id }),
      });
      if (!startRes.ok) throw new Error((await startRes.json()).error ?? t('검수 시작 실패', '检验启动失败'));
      const { inspection_id } = await startRes.json();

      // 2. 기본 정보 업데이트
      await supabase.from('inspections').update({
        product_name_ko: productNameKo || null,
        product_name_cn: productNameCn || null,
        qty_ordered: qtyOrdered || null,
        qty_completed: qtyCompleted || null,
        qty_inspected: stats.totalInspected || null,
        qty_passed: stats.totalPassed || null,
        qty_failed: stats.totalFailedDedup || null,
        pass_rate: stats.passRate || null,
        inspection_date: inspectedDate,
        inspector_name: inspectorName,
        inspection_location: inspectionLocation,
        inspector_comment: `검수원: ${inspectorName}, 장소: ${inspectionLocation}`,
        defect_action: defectAction || null,
        defect_action_days: defectAction === 'remanufacture' ? defectActionDays : null,
        defect_action_notes: defectActionNotes || null,
        seller_id: selectedBuyer?.id ?? null,
      }).eq('id', inspection_id);

      // 3. 체크리스트 항목 저장
      const itemsToSave = checkItems.map((item, idx) => ({
        inspection_id,
        label_ko: item.label_ko,
        label_zh: item.label_zh,
        is_na: item.is_na,
        na_reason: item.na_reason || null,
        qty_inspected: item.qty_inspected,
        qty_passed: item.qty_passed,
        qty_failed: item.qty_failed,
        pass_rate: item.qty_inspected > 0 ? Math.round((item.qty_passed / item.qty_inspected) * 100) : null,
        defect_grade: item.defect_grade || null,
        defect_desc_ko: item.defect_desc_ko || null,
        defect_desc_cn: item.defect_desc_cn || null,
        action_ko: item.action_ko || null,
        action_cn: item.action_cn || null,
        display_order: idx + 1,
      }));
      const { data: savedItems, error: itemErr } = await supabase
        .from('inspection_items')
        .insert(itemsToSave)
        .select('id');
      if (itemErr) throw new Error(t('항목 저장 실패: ', '项目保存失败: ') + itemErr.message);

      // 4. 체크리스트 항목별 사진 업로드
      for (let i = 0; i < checkItems.length; i++) {
        const item = checkItems[i];
        const savedId = savedItems?.[i]?.id ?? null;
        for (const p of item.photos) {
          if (p.file) await uploadPhoto(p.file, inspection_id, savedId, p.photoType, 'checklist');
        }
      }

      // 5. 검수 사진 세트 업로드
      for (const photoSet of inspectionPhotoSets) {
        for (const p of photoSet.photos) {
          if (p.file) await uploadPhoto(p.file, inspection_id, null, 'inspection', 'inspection', photoSet.title);
        }
      }

      // 6. 샘플 비교 사진 업로드
      for (const compareSet of sampleCompareSets) {
        for (const p of compareSet.samplePhotos) {
          if (p.file) await uploadPhoto(p.file, inspection_id, null, 'sample_compare', 'sample_compare', compareSet.itemName, true);
        }
        for (const p of compareSet.currentPhotos) {
          if (p.file) await uploadPhoto(p.file, inspection_id, null, 'sample_compare', 'sample_compare', compareSet.itemName, false);
        }
      }

      // 7. 검수원 현장 사진 업로드
      for (const p of inspectorSitePhotos) {
        if (p.file) await uploadPhoto(p.file, inspection_id, null, 'inspector_site', 'inspector_site', p.caption);
      }

      // 8. 검수 완료 처리
      const completeRes = await fetch(`/api/inspections/${inspection_id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: finalVerdict.value,
          pass_rate: stats.passRate,
          total_qty: stats.totalInspected || null,
          pass_qty: stats.totalPassed || null,
          notes: `검수일: ${inspectedDate}, 검수원: ${inspectorName}, 장소: ${inspectionLocation}`,
        }),
      });
      if (!completeRes.ok) throw new Error((await completeRes.json()).error ?? t('완료 처리 실패', '完成处理失败'));

      router.push('/admin/inspections/dashboard');
    } catch (e: any) {
      setError(e.message ?? t('오류가 발생했습니다.', '发生错误。'));
      setSubmitting(false);
    }
  }, [selectedOrder, selectedBuyer, checkItems, inspectionPhotoSets, sampleCompareSets, inspectorSitePhotos,
      stats, finalVerdict, inspectedDate, inspectorName, inspectionLocation,
      productNameKo, productNameCn, qtyOrdered, qtyCompleted,
      defectAction, defectActionDays, defectActionNotes]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  );

  const filteredBuyers = buyers.filter(b =>
    b.business_name.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    (b.contact_name ?? '').toLowerCase().includes(buyerSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/inspections/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
              ← {t('대시보드', '返回')}
            </Link>
            <h1 className="text-base font-bold text-gray-900">
              {t('검수 보고서 작성', '填写检验报告')}
            </h1>
          </div>
        </div>
        {/* 단계 표시 */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {[
            { n: 1 as const, ko: '① 바이어·오더 선택', zh: '① 选择客户·订单' },
            { n: 2 as const, ko: '② 검수 항목 입력', zh: '② 填写检验项目' },
            { n: 3 as const, ko: '③ 사진 등록', zh: '③ 上传照片' },
            { n: 4 as const, ko: '④ 최종 확인 및 제출', zh: '④ 最终确认提交' },
          ].map(s => (
            <div key={s.n}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                step === s.n ? 'bg-purple-600 text-white' : step > s.n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {step > s.n ? '✓ ' : ''}{t(s.ko, s.zh)}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        )}

        {/* ═══════════════════════════════════════
            STEP 1: 바이어 선택 + 오더 선택 + 기본 정보
            ═══════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            {/* 바이어 선택 */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">1</span>
                {t('바이어(고객사) 선택', '选择客户')}
              </h2>
              <input
                type="text"
                value={buyerSearch}
                onChange={e => setBuyerSearch(e.target.value)}
                placeholder={t('바이어명 검색...', '搜索客户名称...')}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {filteredBuyers.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400 text-center">{t('바이어가 없습니다', '暂无客户')}</div>
                ) : filteredBuyers.map(buyer => (
                  <button
                    key={buyer.id}
                    onClick={() => handleBuyerSelect(buyer)}
                    className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors ${selectedBuyer?.id === buyer.id ? 'bg-purple-50' : ''}`}
                  >
                    <div className="font-medium text-sm text-gray-900">{buyer.business_name}</div>
                    {buyer.contact_name && <div className="text-xs text-gray-400">{buyer.contact_name}</div>}
                  </button>
                ))}
              </div>
              {selectedBuyer && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-purple-900 text-sm">{selectedBuyer.business_name}</div>
                    {selectedBuyer.contact_name && <div className="text-xs text-purple-500">{selectedBuyer.contact_name}</div>}
                  </div>
                  <span className="text-green-600 text-xs font-medium">✓ {t('선택됨', '已选择')}</span>
                </div>
              )}
            </div>

            {/* 오더 선택 */}
            {selectedBuyer && (
              <div className="bg-white rounded-xl border p-5 space-y-4">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">2</span>
                  {t('오더 선택', '选择订单')}
                </h2>
                {loadingOrders ? (
                  <div className="text-center py-4 text-xs text-gray-400">{t('오더 불러오는 중...', '加载订单中...')}</div>
                ) : buyerOrders.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400">{t('해당 바이어의 오더가 없습니다.', '该客户暂无订单。')}</div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                    {buyerOrders.map(order => (
                      <button
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          if (order.qty_ordered) setQtyOrdered(order.qty_ordered);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors ${selectedOrder?.id === order.id ? 'bg-purple-50' : ''}`}
                      >
                        <div className="font-medium text-sm text-gray-900">{order.order_no}</div>
                        <div className="text-xs text-gray-500">
                          ¥{order.total_cny?.toLocaleString()} · {order.status}
                          {order.qty_ordered ? ` · ${t('발주수량', '订单数量')}: ${order.qty_ordered.toLocaleString()}${t('개', '个')}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedOrder && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-purple-900 text-sm">{selectedOrder.order_no}</div>
                      <div className="text-xs text-purple-500">¥{selectedOrder.total_cny?.toLocaleString()} · {selectedOrder.status}</div>
                    </div>
                    <span className="text-green-600 text-xs font-medium">✓ {t('선택됨', '已选择')}</span>
                  </div>
                )}
              </div>
            )}

            {/* 검수 기본 정보 */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900">{t('검수 기본 정보', '检验基本信息')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('상품명 (한국어)', '商品名称（韩语）')}</label>
                  <input type="text" value={productNameKo} onChange={e => setProductNameKo(e.target.value)}
                    placeholder={t('예: 핑크 마리캣 키링', '如：粉色猫咪钥匙扣')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('상품명 (중국어)', '商品名称（中文）')}</label>
                  <input type="text" value={productNameCn} onChange={e => setProductNameCn(e.target.value)}
                    placeholder={t('중국어 상품명', '中文商品名称')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('검수일', '检验日期')}</label>
                  <input type="date" value={inspectedDate} onChange={e => setInspectedDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('검수원', '检验员')}</label>
                  <input type="text" value={inspectorName} onChange={e => setInspectorName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('검수 장소 (공장명)', '检验地点（工厂名称）')}</label>
                  <input type="text" value={inspectionLocation} onChange={e => setInspectionLocation(e.target.value)}
                    placeholder={t('공장명 또는 주소', '工厂名称或地址')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('발주 수량', '订单数量')}</label>
                  <input type="number" min={0} value={qtyOrdered || ''} onChange={e => setQtyOrdered(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('검수 완료 수량', '检验完成数量')}</label>
                  <input type="number" min={0} value={qtyCompleted || ''} onChange={e => setQtyCompleted(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>

              {/* 수량 비교 표시 */}
              {(qtyOrdered > 0 || qtyCompleted > 0) && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">{qtyOrdered.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{t('발주 수량', '订单数量')}</div>
                  </div>
                  <div className="text-gray-300 text-xl">→</div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${qtyCompleted >= qtyOrdered ? 'text-green-600' : qtyCompleted > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {qtyCompleted.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{t('검수 완료', '检验完成')}</div>
                  </div>
                  {qtyOrdered > 0 && qtyCompleted > 0 && (
                    <>
                      <div className="text-gray-300 text-xl">=</div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${qtyOrdered - qtyCompleted <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {qtyOrdered - qtyCompleted > 0 ? `-${(qtyOrdered - qtyCompleted).toLocaleString()}` : '✓'}
                        </div>
                        <div className="text-xs text-gray-500">{t('차이', '差异')}</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { setError(''); setStep(2); }}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 text-sm"
              >
                {t('다음: 검수 항목 입력 →', '下一步：填写检验项目 →')}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 2: 체크리스트 항목별 입력 + 불량 처리 방법
            ═══════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">2</span>
                    {t('검수 항목 작성', '填写检验项目')}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 ml-8">
                    {t('검수 항목명과 내용을 직접 입력하고, 관련 사진과 합격 수량을 기록하세요.', '请直接填写检验项目名称和内容，并上传相关照片和合格数量。')}
                  </p>
                </div>
                <button
                  onClick={() => setCheckItems(prev => [...prev, { id: makeId(), label_ko: '', label_zh: '', is_na: false, na_reason: '', qty_inspected: 0, qty_passed: 0, qty_failed: 0, defect_grade: '', defect_desc_ko: '', defect_desc_cn: '', action_ko: '', action_cn: '', photos: [] }])}
                  className="flex-shrink-0 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 whitespace-nowrap">
                  + {t('항목 추가', '添加项目')}
                </button>
              </div>
            </div>

            {checkItems.map((item, idx) => (
              <div key={item.id} className={`bg-white rounded-xl border p-4 space-y-3 transition-opacity ${item.is_na ? 'opacity-60' : ''}`}>
                {/* 항목 헤더: 번호 + 항목명 입력 + 해당없음 + 삭제 */}
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-2">{idx + 1}</span>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={item.label_ko}
                      onChange={e => updateItem(item.id, 'label_ko', e.target.value)}
                      placeholder={t('검수 항목명 입력 (예: 외관 품질, 색상 확인, 포장 상태 등)', '请输入检验项目名称（如：外观质量、颜色确认、包装状态等）')}
                      className="w-full border-b-2 border-purple-200 focus:border-purple-500 px-2 py-1.5 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none placeholder-gray-300"
                    />
                    <textarea
                      value={item.defect_desc_ko}
                      onChange={e => updateItem(item.id, 'defect_desc_ko', e.target.value)}
                      placeholder={t('검수 내용 및 특이사항을 자유롭게 기록하세요.', '请自由记录检验内容及特殊情况。')}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-purple-300 resize-none placeholder-gray-300"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-xs px-1">{t('삭제', '删除')}</button>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={item.is_na} onChange={e => updateItem(item.id, 'is_na', e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-orange-500" />
                      <span className="text-xs text-orange-600 font-medium whitespace-nowrap">{t('해당없음', '不适用')}</span>
                    </label>
                  </div>
                </div>

                {item.is_na ? (
                  <input type="text" value={item.na_reason} onChange={e => updateItem(item.id, 'na_reason', e.target.value)}
                    placeholder={t('해당없음 사유 (선택)', '不适用原因（可选）')}
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 text-center">{t('검수 수량', '检验数量')}</label>
                        <input type="number" min={0} value={item.qty_inspected || ''}
                          onChange={e => updateItem(item.id, 'qty_inspected', Number(e.target.value))}
                          className="w-full border rounded-lg px-2 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs text-green-600 mb-1 text-center font-medium">{t('합격 수량', '合格数量')}</label>
                        <input type="number" min={0} max={item.qty_inspected} value={item.qty_passed || ''}
                          onChange={e => updateItem(item.id, 'qty_passed', Number(e.target.value))}
                          className="w-full border border-green-300 rounded-lg px-2 py-2 text-sm text-center font-bold text-green-700 focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs text-red-500 mb-1 text-center">{t('불량 (자동)', '不良（自动）')}</label>
                        <div className={`w-full border rounded-lg px-2 py-2 text-sm text-center font-bold ${item.qty_failed > 0 ? 'border-red-300 text-red-600 bg-red-50' : 'border-gray-200 text-gray-300 bg-gray-50'}`}>
                          {item.qty_failed}
                        </div>
                      </div>
                    </div>

                    {item.qty_inspected > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${item.qty_passed / item.qty_inspected >= 0.99 ? 'bg-green-500' : item.qty_passed / item.qty_inspected >= 0.9 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.round((item.qty_passed / item.qty_inspected) * 100))}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-10 text-right">
                          {Math.round((item.qty_passed / item.qty_inspected) * 100)}%
                        </span>
                      </div>
                    )}

                    {item.qty_failed > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-red-700">{t('불량 등급:', '不良等级:')}</span>
                          {[
                            { v: 'critical' as const, ko: '치명', zh: '致命', cls: 'bg-red-600 text-white' },
                            { v: 'major' as const, ko: '주요', zh: '主要', cls: 'bg-orange-500 text-white' },
                            { v: 'minor' as const, ko: '경미', zh: '轻微', cls: 'bg-yellow-400 text-white' },
                          ].map(g => (
                            <button key={g.v}
                              onClick={() => updateItem(item.id, 'defect_grade', item.defect_grade === g.v ? '' : g.v)}
                              className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${item.defect_grade === g.v ? g.cls : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                              {t(g.ko, g.zh)}
                            </button>
                          ))}
                        </div>
                        <input type="text"
                          value={lang === 'zh' ? item.defect_desc_cn : item.defect_desc_ko}
                          onChange={e => updateItem(item.id, lang === 'zh' ? 'defect_desc_cn' : 'defect_desc_ko', e.target.value)}
                          placeholder={t('불량 내용 설명', '不良内容说明')}
                          className="w-full border border-red-200 rounded px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-400" />
                        <input type="text"
                          value={lang === 'zh' ? item.action_cn : item.action_ko}
                          onChange={e => updateItem(item.id, lang === 'zh' ? 'action_cn' : 'action_ko', e.target.value)}
                          placeholder={t('조치사항 (예: 재작업 요청, 수량 보충 등)', '处理措施（如：返工、补货等）')}
                          className="w-full border border-red-200 rounded px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-400" />
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        {t('항목 사진 첨부', '附加项目照片')}
                        <span className="text-gray-400 font-normal ml-1">({item.photos.length}/20)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.photos.map((p, pIdx) => (
                          <div key={pIdx} className="relative w-14 h-14 group">
                            <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg border" />
                            <div className={`absolute bottom-0 left-0 right-0 text-center text-xs py-0.5 rounded-b-lg leading-tight ${p.photoType === 'pass_sample' ? 'bg-green-500 text-white' : p.photoType === 'fail_sample' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'}`}>
                              {p.photoType === 'pass_sample' ? t('합격', '合格') : p.photoType === 'fail_sample' ? t('불량', '不良') : t('전체', '全景')}
                            </div>
                            <button onClick={() => removeItemPhoto(item.id, pIdx)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-10">×</button>
                          </div>
                        ))}
                        <label className="w-14 h-14 border-2 border-dashed border-green-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition-colors">
                          <span className="text-green-500 text-base leading-none">+</span>
                          <span className="text-xs text-green-500 leading-tight">{t('합격', '合格')}</span>
                          <input type="file" accept="image/*" multiple className="hidden"
                            onChange={e => addItemPhotos(item.id, e.target.files, 'pass_sample')} />
                        </label>
                        <label className="w-14 h-14 border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-red-50 transition-colors">
                          <span className="text-red-500 text-base leading-none">+</span>
                          <span className="text-xs text-red-500 leading-tight">{t('불량', '不良')}</span>
                          <input type="file" accept="image/*" multiple className="hidden"
                            onChange={e => addItemPhotos(item.id, e.target.files, 'fail_sample')} />
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* 항목 추가 버튼 (하단) */}
            <button
              onClick={() => setCheckItems(prev => [...prev, { id: makeId(), label_ko: '', label_zh: '', is_na: false, na_reason: '', qty_inspected: 0, qty_passed: 0, qty_failed: 0, defect_grade: '', defect_desc_ko: '', defect_desc_cn: '', action_ko: '', action_cn: '', photos: [] }])}
              className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-medium text-sm hover:bg-purple-50 hover:border-purple-400 transition-colors">
              + {t('검수 항목 추가', '添加检验项目')}
            </button>

            {/* 불량 처리 방법 */}
            {stats.totalFailedDedup > 0 && (
              <div className="bg-white rounded-xl border-2 border-orange-200 p-5 space-y-4">
                <h2 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">!</span>
                  {t(`불량 ${stats.totalFailedDedup}개 처리 방법 선택`, `${stats.totalFailedDedup}个不良品处理方式`)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 추가제작 */}
                  <button
                    onClick={() => setDefectAction('remanufacture')}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${defectAction === 'remanufacture' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${defectAction === 'remanufacture' ? 'border-blue-500' : 'border-gray-300'}`}>
                        {defectAction === 'remanufacture' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <span className="font-bold text-sm text-gray-900">{t('공장 추가제작', '工厂补产')}</span>
                    </div>
                    <p className="text-xs text-gray-500">{t('불량 수량만큼 공장에서 추가 제작하여 납품', '工厂对不良品数量进行补产后交货')}</p>
                    {defectAction === 'remanufacture' && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-blue-700 font-medium whitespace-nowrap">{t('완료 예정:', '预计完成:')}</span>
                        <input
                          type="number" min={1} max={365} value={defectActionDays}
                          onChange={e => setDefectActionDays(Number(e.target.value))}
                          onClick={e => e.stopPropagation()}
                          className="w-20 border border-blue-300 rounded px-2 py-1 text-sm text-center font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="text-xs text-blue-700 font-medium">{t('일 이내', '日内')}</span>
                      </div>
                    )}
                  </button>

                  {/* 쇼티지 */}
                  <button
                    onClick={() => setDefectAction('shortage')}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${defectAction === 'shortage' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${defectAction === 'shortage' ? 'border-red-500' : 'border-gray-300'}`}>
                        {defectAction === 'shortage' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <span className="font-bold text-sm text-gray-900">{t('쇼티지 (반품 금액 차감)', '短缺（从货款中扣除）')}</span>
                    </div>
                    <p className="text-xs text-gray-500">{t('불량 수량에 해당하는 금액을 반품 처리하여 대금에서 차감', '对不良品数量对应金额进行扣款处理')}</p>
                  </button>
                </div>

                {defectAction && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('처리 메모 (선택)', '处理备注（可选）')}</label>
                    <textarea
                      value={defectActionNotes}
                      onChange={e => setDefectActionNotes(e.target.value)}
                      placeholder={t('불량 처리에 대한 추가 메모를 입력하세요.', '请输入关于不良品处理的补充说明。')}
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ← {t('이전', '上一步')}
              </button>
              <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 text-sm">
                {t('다음: 사진 등록 →', '下一步：上传照片 →')}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 3: 사진 등록 (검수 사진 / 샘플 비교 / 검수원 현장)
            ═══════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            {/* 검수 사진 (제목 + 사진) */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">A</span>
                  {t('검수 사진', '检验照片')}
                </h2>
                <button onClick={addInspectionPhotoSet}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200">
                  + {t('섹션 추가', '添加分组')}
                </button>
              </div>
              <p className="text-xs text-gray-400">{t('제목을 입력하고 해당 검수 사진을 등록하세요. 섹션을 추가하여 항목별로 구분할 수 있습니다.', '请输入标题并上传对应的检验照片。可添加分组按项目分类。')}</p>

              {inspectionPhotoSets.map((photoSet, setIdx) => (
                <div key={photoSet.id} className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{setIdx + 1}</span>
                    <input
                      type="text"
                      value={photoSet.title}
                      onChange={e => updateInspectionPhotoSetTitle(photoSet.id, e.target.value)}
                      placeholder={t('사진 제목 입력 (예: 외관 검수, 포장 상태, 라벨 확인 등)', '输入照片标题（如：外观检验、包装状态、标签确认等）')}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    {inspectionPhotoSets.length > 1 && (
                      <button onClick={() => removeInspectionPhotoSet(photoSet.id)}
                        className="text-red-400 hover:text-red-600 text-xs px-2">{t('삭제', '删除')}</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {photoSet.photos.map(p => (
                      <div key={p.id} className="relative w-20 h-20 group">
                        <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg border" />
                        <button onClick={() => removeInspectionPhoto(photoSet.id, p.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-10">×</button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-purple-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                      <span className="text-purple-400 text-2xl leading-none">+</span>
                      <span className="text-xs text-purple-400">{t('사진 추가', '添加照片')}</span>
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => addInspectionPhotos(photoSet.id, e.target.files)} />
                    </label>
                  </div>
                  {photoSet.photos.length > 0 && (
                    <div className="text-xs text-gray-400">{photoSet.photos.length}{t('장', '张')}</div>
                  )}
                </div>
              ))}
            </div>

            {/* 샘플 vs 현재 비교 */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">B</span>
                  {t('샘플 vs 현재 비교', '样品 vs 现货对比')}
                </h2>
                <button onClick={addSampleCompareSet}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">
                  + {t('비교 항목 추가', '添加对比项')}
                </button>
              </div>
              <p className="text-xs text-gray-400">{t('오더 확정 시 샘플 사진과 현재 검수 사진을 나란히 비교합니다.', '将订单确认时的样品照片与当前检验照片进行对比。')}</p>

              {sampleCompareSets.map((compareSet, setIdx) => (
                <div key={compareSet.id} className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{setIdx + 1}</span>
                    <input
                      type="text"
                      value={compareSet.itemName}
                      onChange={e => updateSampleCompareItemName(compareSet.id, e.target.value)}
                      placeholder={t('비교 항목명 (예: 색상, 인쇄, 사이즈 등)', '对比项目名称（如：颜色、印刷、尺寸等）')}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {sampleCompareSets.length > 1 && (
                      <button onClick={() => removeSampleCompareSet(compareSet.id)}
                        className="text-red-400 hover:text-red-600 text-xs px-2">{t('삭제', '删除')}</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 샘플 사진 */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded text-center">
                        {t('오더 확정 샘플', '订单确认样品')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {compareSet.samplePhotos.map(p => (
                          <div key={p.id} className="relative w-16 h-16 group">
                            <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg border-2 border-amber-300" />
                            <button onClick={() => removeSampleComparePhoto(compareSet.id, p.id, 'sample')}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-10">×</button>
                          </div>
                        ))}
                        <label className="w-16 h-16 border-2 border-dashed border-amber-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-colors">
                          <span className="text-amber-500 text-lg leading-none">+</span>
                          <input type="file" accept="image/*" multiple className="hidden"
                            onChange={e => addSampleComparePhotos(compareSet.id, e.target.files, 'sample')} />
                        </label>
                      </div>
                    </div>
                    {/* 현재 사진 */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded text-center">
                        {t('현재 검수 사진', '当前检验照片')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {compareSet.currentPhotos.map(p => (
                          <div key={p.id} className="relative w-16 h-16 group">
                            <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg border-2 border-green-300" />
                            <button onClick={() => removeSampleComparePhoto(compareSet.id, p.id, 'current')}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-10">×</button>
                          </div>
                        ))}
                        <label className="w-16 h-16 border-2 border-dashed border-green-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition-colors">
                          <span className="text-green-500 text-lg leading-none">+</span>
                          <input type="file" accept="image/*" multiple className="hidden"
                            onChange={e => addSampleComparePhotos(compareSet.id, e.target.files, 'current')} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 검수원 현장 사진 */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center">C</span>
                {t('검수원 현장 사진', '检验员现场照片')}
              </h2>
              <p className="text-xs text-gray-400">{t('검수원이 현장에서 찍은 사진을 등록하세요. 각 사진에 설명을 추가할 수 있습니다.', '上传检验员在现场拍摄的照片，可为每张照片添加说明。')}</p>
              <div className="flex flex-wrap gap-3">
                {inspectorSitePhotos.map(p => (
                  <div key={p.id} className="relative group">
                    <div className="w-24 h-24 relative">
                      <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg border" />
                      <button onClick={() => removeInspectorSitePhoto(p.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-10">×</button>
                    </div>
                    <input
                      type="text"
                      value={p.caption}
                      onChange={e => updateInspectorSiteCaption(p.id, e.target.value)}
                      placeholder={t('사진 설명', '照片说明')}
                      className="mt-1 w-24 border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-400 text-2xl leading-none">+</span>
                  <span className="text-xs text-gray-400">{t('사진 추가', '添加照片')}</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={e => addInspectorSitePhotos(e.target.files)} />
                </label>
              </div>
              {inspectorSitePhotos.length > 0 && (
                <div className="text-xs text-gray-400">{t('총', '共')} {inspectorSitePhotos.length}{t('장', '张')}</div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ← {t('이전', '上一步')}
              </button>
              <button onClick={() => setStep(4)} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 text-sm">
                {t('다음: 최종 확인 →', '下一步：最终确认 →')}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            STEP 4: 최종 확인 및 제출
            ═══════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">4</span>
                {t('검수 결과 요약', '检验结果汇总')}
              </h2>

              {/* 바이어 & 주문 정보 */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="font-bold text-gray-900">{selectedBuyer?.business_name}</div>
                <div className="font-medium text-gray-700">{selectedOrder?.order_no}</div>
                {productNameKo && <div className="text-gray-600 text-xs">{lang === 'zh' ? (productNameCn || productNameKo) : productNameKo}</div>}
                <div className="text-gray-400 text-xs">
                  {t(`검수일: ${inspectedDate} · 검수원: ${inspectorName} · 장소: ${inspectionLocation}`,
                     `检验日期: ${inspectedDate} · 检验员: ${inspectorName} · 地点: ${inspectionLocation}`)}
                </div>
              </div>

              {/* 수량 요약 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-gray-700">{qtyOrdered.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t('발주 수량', '订单数量')}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-blue-700">{qtyCompleted.toLocaleString()}</div>
                  <div className="text-xs text-blue-500 mt-0.5">{t('검수 완료', '检验完成')}</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-green-700">{stats.totalPassed}</div>
                  <div className="text-xs text-green-500 mt-0.5">{t('합격 수량', '合格数量')}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{stats.totalFailedDedup}</div>
                  <div className="text-xs text-red-400 mt-0.5">{t('불량 수량', '不良数量')}</div>
                </div>
              </div>

              {/* 합격률 */}
              <div className={`rounded-xl border-2 p-4 text-center ${finalVerdict.color}`}>
                <div className="text-lg font-bold">
                  {t(`최종 판정: ${finalVerdict.ko}`, `最终判定：${finalVerdict.zh}`)}
                </div>
                <div className="text-sm mt-1 opacity-80">
                  {t(`합격률 ${stats.passRate}% · 불량률 ${stats.failRate}%`, `合格率 ${stats.passRate}% · 不良率 ${stats.failRate}%`)}
                </div>
              </div>

              {/* 불량 처리 방법 요약 */}
              {defectAction && (
                <div className={`rounded-lg p-3 text-sm ${defectAction === 'remanufacture' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="font-bold text-sm mb-1">
                    {defectAction === 'remanufacture'
                      ? t(`불량 처리: 공장 추가제작 (${defectActionDays}일 이내)`, `不良处理：工厂补产（${defectActionDays}日内）`)
                      : t('불량 처리: 쇼티지 (반품 금액 차감)', '不良处理：短缺（从货款中扣除）')}
                  </div>
                  {defectActionNotes && <div className="text-xs text-gray-600">{defectActionNotes}</div>}
                </div>
              )}

              {/* 불량 항목 요약 */}
              {stats.defectItems.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">{t('불량 항목 요약', '不良项目汇总')}</div>
                  <div className="space-y-1.5">
                    {stats.defectItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 text-xs">
                        <span className="text-gray-700 font-medium">{item.label_ko}</span>
                        <div className="flex items-center gap-2">
                          {item.defect_grade && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${item.defect_grade === 'critical' ? 'bg-red-600 text-white' : item.defect_grade === 'major' ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-white'}`}>
                              {item.defect_grade === 'critical' ? t('치명', '致命') : item.defect_grade === 'major' ? t('주요', '主要') : t('경미', '轻微')}
                            </span>
                          )}
                          <span className="text-red-600 font-bold">{item.qty_failed}{t('개', '个')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 사진 등록 현황 */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600">
                <div className="font-medium text-gray-700 mb-1">{t('등록된 사진', '已上传照片')}</div>
                <div className="flex gap-4 flex-wrap">
                  <span>{t('검수 사진:', '检验照片:')} {inspectionPhotoSets.reduce((s, p) => s + p.photos.length, 0)}{t('장', '张')}</span>
                  <span>{t('샘플 비교:', '样品对比:')} {sampleCompareSets.reduce((s, p) => s + p.samplePhotos.length + p.currentPhotos.length, 0)}{t('장', '张')}</span>
                  <span>{t('현장 사진:', '现场照片:')} {inspectorSitePhotos.length}{t('장', '张')}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                {t('✓ 제출 후 MD가 검수 데이터를 검토하고 보고서를 작성합니다. 관리자 승인 후 바이어/공장에 발송됩니다.',
                   '✓ 提交后，MD将审核检验数据并撰写报告。管理员批准后将发送给买家/工厂。')}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ← {t('이전', '上一步')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {submitting
                  ? t('저장 중...', '保存中...')
                  : t('✓ 검수 보고서 제출 (MD 검토 요청)', '✓ 提交检验报告（请求MD审核）')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
