'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, Eye, FileText, Clock, CheckCircle2,
  Building2, Package, ChevronDown, ChevronUp, X, Send,
  BarChart3, AlertCircle, Download
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'submitted', label: '접수됨' },
  { value: 'reviewing', label: '검토 중' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'report_ready', label: '보고서 완료' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소됨' },
];

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-green-100 text-green-700',
  report_ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  submitted: '접수됨',
  reviewing: '검토 중',
  in_progress: '진행 중',
  report_ready: '보고서 완료',
  completed: '완료',
  cancelled: '취소됨',
};

type Request = Record<string, unknown>;

export default function AdminUnifiedRequestsPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '통합 의뢰서 관리 | KERYX';
  }, []);

  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filtered, setFiltered] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReq, setSelectedReq] = useState<Request | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    let result = requests;
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        (r.company_name as string)?.toLowerCase().includes(q) ||
        (r.contact_name as string)?.toLowerCase().includes(q) ||
        (r.request_no as string)?.toLowerCase().includes(q) ||
        (r.product_category as string)?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [requests, search, statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    const res = await fetch('/api/unified-request');
    const data = await res.json();
    setRequests(data.data || []);
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/unified-request?id=${id}`);
    const data = await res.json();
    setSelectedReq(data.data);
    setAdminNote((data.data?.admin_notes as string) || '');
    setDetailLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    await fetch('/api/unified-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    await loadRequests();
    if (selectedReq) {
      await loadDetail(id);
    }
    setUpdatingStatus(false);
  };

  const saveNote = async () => {
    if (!selectedReq) return;
    setSavingNote(true);
    await fetch('/api/unified-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedReq.id, admin_notes: adminNote }),
    });
    setSavingNote(false);
  };

  const toggleItem = (idx: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const generateReport = (req: Request) => {
    // 보고서 생성 - 새 탭에서 인쇄 가능한 HTML 생성
    const items = (req.unified_request_items as Record<string, unknown>[]) || [];
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>KERYX 매칭 의뢰 보고서 - ${req.request_no}</title>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 20px; border-bottom: 2px solid #16a34a; padding-bottom: 10px; }
  h2 { font-size: 16px; color: #16a34a; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f0fdf4; text-align: left; padding: 8px 12px; font-size: 13px; border: 1px solid #d1fae5; }
  td { padding: 8px 12px; font-size: 13px; border: 1px solid #e5e7eb; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 12px; background: #dcfce7; color: #166534; }
  .section { margin-bottom: 24px; }
  .item-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>📋 공장 매칭 & 시장조사 의뢰서</h1>
<p style="color:#6b7280;font-size:13px;">의뢰번호: <strong>${req.request_no}</strong> · 접수일: ${new Date(req.created_at as string).toLocaleDateString('ko-KR')}</p>

<div class="section">
<h2>1. 의뢰인 정보</h2>
<table>
<tr><th>회사명</th><td>${req.company_name}</td><th>대표자</th><td>${req.ceo_name || '-'}</td></tr>
<tr><th>담당자</th><td>${req.contact_name}</td><th>연락처</th><td>${req.contact_phone}</td></tr>
<tr><th>이메일</th><td>${req.contact_email}</td><th>카카오톡</th><td>${req.kakao_id || '-'}</td></tr>
<tr><th>WeChat</th><td>${req.wechat_id || '-'}</td><td colspan="2"></td></tr>
</table>
</div>

<div class="section">
<h2>2. 사업 정보</h2>
<table>
<tr><th>사업 단계</th><td>${req.business_stage || '-'}</td><th>연 매출</th><td>${req.annual_revenue || '-'}</td></tr>
<tr><th>주력 채널</th><td colspan="3">${(req.main_channels as string[])?.join(', ') || '-'}</td></tr>
<tr><th>현재 어려움</th><td colspan="3">${req.current_challenges || '-'}</td></tr>
</table>
</div>

<div class="section">
<h2>3. 의뢰 일반 사항</h2>
<table>
<tr><th>제품 카테고리</th><td>${req.product_category || '-'}</td><th>예상 발주량</th><td>${req.expected_order_qty}${req.expected_order_unit}</td></tr>
<tr><th>우선 조사 내용</th><td colspan="3">${req.priority_research || '-'}</td></tr>
</table>
</div>

<div class="section">
<h2>4. 파일럿 품목 (${items.length}개)</h2>
${items.map((item, i) => `
<div class="item-card">
<strong>#${i + 1} ${item.product_name}</strong> <span class="badge">${item.category || ''}</span>
<table style="margin-top:8px;">
<tr><th>설명</th><td colspan="3">${item.description || '-'}</td></tr>
<tr><th>목표 단가</th><td>CNY ${item.target_unit_price_min || '-'} ~ ${item.target_unit_price_max || '-'}</td><th>희망 수량</th><td>${item.target_qty || '-'}${item.qty_unit || ''}</td></tr>
<tr><th>소재</th><td>${item.material_spec || '-'}</td><th>사이즈</th><td>${item.size_spec || '-'}</td></tr>
<tr><th>색상</th><td>${item.color_spec || '-'}</td><th>인증</th><td>${item.certification_req || '-'}</td></tr>
<tr><th>샘플</th><td colspan="3">${item.wants_sample ? `필요 (${item.sample_qty}개)` : '불필요'}</td></tr>
${item.additional_notes ? `<tr><th>메모</th><td colspan="3">${item.additional_notes}</td></tr>` : ''}
</table>
</div>`).join('')}
</div>

<div class="section">
<h2>5. 추가 사항</h2>
<table>
<tr><th>공장 요구사항</th><td colspan="3">${req.factory_requirements || '-'}</td></tr>
<tr><th>희망 공장 유형</th><td>${req.preferred_factory_type || '-'}</td><th>희망 지역</th><td>${req.preferred_region || '-'}</td></tr>
<tr><th>기타 메모</th><td colspan="3">${req.additional_notes || '-'}</td></tr>
</table>
</div>

${adminNote ? `<div class="section">
<h2>MD 메모</h2>
<p style="background:#f9fafb;padding:12px;border-radius:6px;font-size:13px;">${adminNote}</p>
</div>` : ''}

<p style="margin-top:40px;font-size:12px;color:#9ca3af;text-align:center;">KERYX (케릭스) · keryx.kr · 본 문서는 기밀입니다.</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.focus();
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* 목록 패널 */}
      <div className={`${selectedReq ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 border-r bg-white`}>
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-gray-900 mb-3">공장 매칭 & 시장조사 의뢰 관리</h1>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="회사명, 담당자, 의뢰번호 검색..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === opt.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">의뢰 내역이 없습니다.</p>
            </div>
          ) : (
            filtered.map(req => (
              <button
                key={req.id as string}
                onClick={() => loadDetail(req.id as string)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedReq?.id === req.id ? 'bg-green-50 border-l-2 border-green-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[req.status as string] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[req.status as string] || req.status as string}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 truncate">{req.company_name as string}</p>
                    <p className="text-xs text-gray-500 truncate">{req.product_category as string} · {req.contact_name as string}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{req.request_no as string}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(req.created_at as string).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center">
          총 {filtered.length}건
        </div>
      </div>

      {/* 상세 패널 */}
      {selectedReq ? (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6">
              {/* 상단 액션 바 */}
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReq(null)}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="font-bold text-gray-900">{selectedReq.company_name as string}</h2>
                    <p className="text-xs text-gray-500 font-mono">{selectedReq.request_no as string}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateReport(selectedReq)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    보고서
                  </button>
                  <select
                    value={selectedReq.status as string}
                    onChange={e => updateStatus(selectedReq.id as string, e.target.value)}
                    disabled={updatingStatus}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-green-500 ${STATUS_COLOR[selectedReq.status as string] || ''}`}
                  >
                    {STATUS_OPTIONS.filter(o => o.value !== 'all').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 의뢰인 정보 */}
              <DetailSection title="의뢰인 정보" icon={<Building2 className="w-4 h-4" />}>
                <InfoGrid items={[
                  { label: '회사명', value: selectedReq.company_name as string },
                  { label: '대표자', value: selectedReq.ceo_name as string || '-' },
                  { label: '담당자', value: selectedReq.contact_name as string },
                  { label: '연락처', value: selectedReq.contact_phone as string },
                  { label: '이메일', value: selectedReq.contact_email as string },
                  { label: '카카오톡', value: selectedReq.kakao_id as string || '-' },
                  { label: 'WeChat', value: selectedReq.wechat_id as string || '-' },
                ]} />
              </DetailSection>

              {/* 사업 정보 */}
              <DetailSection title="사업 정보" icon={<BarChart3 className="w-4 h-4" />}>
                <InfoGrid items={[
                  { label: '사업 단계', value: selectedReq.business_stage as string || '-' },
                  { label: '연 매출', value: selectedReq.annual_revenue as string || '-' },
                  { label: '주력 채널', value: (selectedReq.main_channels as string[])?.join(', ') || '-' },
                  { label: '현재 어려움', value: selectedReq.current_challenges as string || '-', full: true },
                ]} />
              </DetailSection>

              {/* 의뢰 일반 사항 */}
              <DetailSection title="의뢰 일반 사항" icon={<FileText className="w-4 h-4" />}>
                <InfoGrid items={[
                  { label: '제품 카테고리', value: selectedReq.product_category as string || '-' },
                  { label: '예상 발주량', value: `${selectedReq.expected_order_qty}${selectedReq.expected_order_unit}` },
                  { label: '우선 조사 내용', value: selectedReq.priority_research as string || '-', full: true },
                ]} />
              </DetailSection>

              {/* 파일럿 품목 */}
              {(() => {
                const items = (selectedReq.unified_request_items as Record<string, unknown>[]) || [];
                return items.length > 0 ? (
                  <DetailSection title={`파일럿 품목 (${items.length}개)`} icon={<Package className="w-4 h-4" />}>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleItem(idx)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-sm">{item.product_name as string}</span>
                              {(item.category as string) && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                  {item.category as string}
                                </span>
                              )}
                            </div>
                            {expandedItems.has(idx) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </button>
                          {expandedItems.has(idx) && (
                            <div className="p-3">
                              <InfoGrid items={[
                                { label: '설명', value: item.description as string || '-', full: true },
                                { label: '목표 단가', value: `CNY ${item.target_unit_price_min || '-'} ~ ${item.target_unit_price_max || '-'}` },
                                { label: '희망 수량', value: `${item.target_qty || '-'}${item.qty_unit || ''}` },
                                { label: '소재', value: item.material_spec as string || '-' },
                                { label: '사이즈', value: item.size_spec as string || '-' },
                                { label: '색상', value: item.color_spec as string || '-' },
                                { label: '인증', value: item.certification_req as string || '-' },
                                { label: '샘플', value: item.wants_sample ? `필요 (${item.sample_qty}개)` : '불필요' },
                                { label: '메모', value: item.additional_notes as string || '-', full: true },
                              ]} />
                              {/* 참고 이미지 */}
                              {(item.reference_image_urls as string[])?.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-gray-500 mb-1.5">참고 이미지</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {(item.reference_image_urls as string[]).map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                ) : null;
              })()}

              {/* 추가 사항 */}
              <DetailSection title="추가 사항" icon={<AlertCircle className="w-4 h-4" />}>
                <InfoGrid items={[
                  { label: '공장 요구사항', value: selectedReq.factory_requirements as string || '-', full: true },
                  { label: '희망 공장 유형', value: selectedReq.preferred_factory_type as string || '-' },
                  { label: '희망 지역', value: selectedReq.preferred_region as string || '-' },
                  { label: '기타 메모', value: selectedReq.additional_notes as string || '-', full: true },
                ]} />
              </DetailSection>

              {/* MD 메모 */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 mt-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-green-600" />
                  MD 내부 메모
                </h3>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={4}
                  placeholder="의뢰에 대한 내부 메모를 작성하세요..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  className="mt-2 flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {savingNote ? '저장 중...' : '메모 저장'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">좌측 목록에서 의뢰를 선택하세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 재사용 컴포넌트 ───────────────────────────────────────────────
function DetailSection({ title, icon, children }: { title: string; icon: React.ReactElement; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-1.5 text-green-700">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; value: string; full?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {items.map((item, i) => (
        <div key={i} className={item.full ? 'col-span-2' : ''}>
          <span className="text-xs text-gray-400">{item.label}</span>
          <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
