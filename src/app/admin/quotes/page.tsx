'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface QuoteRequest {
  id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  company_name: string | null;
  lang: string;
  product_category: string;
  product_name: string;
  product_desc: string | null;
  quantity: number | null;
  unit: string;
  size_spec: string | null;
  material: string | null;
  color_count: number;
  custom_packaging: boolean;
  ip_design_needed: boolean;
  services_needed: string[];
  delivery_country: string | null;
  target_price: string | null;
  deadline: string | null;
  reference_url: string | null;
  memo: string | null;
  status: string;
  admin_memo: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  reviewing: 'bg-blue-100 text-blue-700',
  quoted:    'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  closed:    'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending:   '대기중',
  reviewing: '검토중',
  quoted:    '견적발송',
  rejected:  '거절',
  closed:    '완료',
};

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuoteRequest | null>(null);
  const [adminMemo, setAdminMemo] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const q = supabase
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (filterStatus !== 'all') q.eq('status', filterStatus);
    const { data } = await q;
    setQuotes(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openDetail = (q: QuoteRequest) => {
    setSelected(q);
    setAdminMemo(q.admin_memo || '');
    setNewStatus(q.status);
  };

  const saveUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase
      .from('quote_requests')
      .update({ status: newStatus, admin_memo: adminMemo, quoted_at: newStatus === 'quoted' ? new Date().toISOString() : null })
      .eq('id', selected.id);
    setSaving(false);
    setSelected(null);
    load();
  };

  const filtered = quotes;

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">견적 요청 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">바이어로부터 접수된 견적 요청을 관리합니다</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'reviewing', 'quoted', 'rejected', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '전체' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const count = quotes.filter(q => q.status === key).length;
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <div className="text-2xl font-black text-gray-900">{count}</div>
              <div className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-full ${STATUS_COLORS[key]}`}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">견적 요청이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">접수일</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">요청자</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">제품</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">수량</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">서비스</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">언어</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">상태</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600 whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(q.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{q.requester_name}</div>
                      <div className="text-xs text-gray-400">{q.requester_email}</div>
                      {q.company_name && <div className="text-xs text-gray-400">{q.company_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 max-w-[160px] truncate">{q.product_name}</div>
                      <div className="text-xs text-gray-400">{q.product_category}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {q.quantity ? `${q.quantity.toLocaleString()} ${q.unit}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(q.services_needed || []).slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 font-semibold">{s}</span>
                        ))}
                        {(q.services_needed || []).length > 3 && (
                          <span className="text-xs text-gray-400">+{q.services_needed.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-gray-500 uppercase">{q.lang}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[q.status]}`}>
                        {STATUS_LABELS[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(q)}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">견적 요청 상세</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* 요청자 정보 */}
              <Section title="요청자 정보">
                <Row label="이름" value={selected.requester_name} />
                <Row label="이메일" value={selected.requester_email} />
                {selected.requester_phone && <Row label="연락처" value={selected.requester_phone} />}
                {selected.company_name && <Row label="회사명" value={selected.company_name} />}
                <Row label="언어" value={selected.lang.toUpperCase()} />
              </Section>

              {/* 제품 정보 */}
              <Section title="제품 정보">
                <Row label="카테고리" value={selected.product_category} />
                <Row label="제품명" value={selected.product_name} />
                {selected.product_desc && <Row label="설명" value={selected.product_desc} />}
                {selected.reference_url && <Row label="참고 URL" value={selected.reference_url} />}
              </Section>

              {/* 수량/사양 */}
              <Section title="수량 · 사양">
                {selected.quantity && <Row label="수량" value={`${selected.quantity.toLocaleString()} ${selected.unit}`} />}
                {selected.size_spec && <Row label="사이즈" value={selected.size_spec} />}
                {selected.material && <Row label="소재" value={selected.material} />}
                <Row label="색상 수" value={`${selected.color_count}색`} />
                <Row label="커스텀 패키지" value={selected.custom_packaging ? '필요' : '불필요'} />
                <Row label="IP 디자인" value={selected.ip_design_needed ? '필요' : '불필요'} />
                {selected.target_price && <Row label="희망 단가" value={selected.target_price} />}
                {selected.deadline && <Row label="희망 납기" value={selected.deadline} />}
              </Section>

              {/* 서비스 */}
              <Section title="요청 서비스">
                <div className="flex flex-wrap gap-2">
                  {(selected.services_needed || []).map(s => (
                    <span key={s} className="text-sm bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 font-semibold">{s}</span>
                  ))}
                </div>
                {selected.delivery_country && <Row label="납품 국가" value={selected.delivery_country} />}
                {selected.memo && <Row label="메모" value={selected.memo} />}
              </Section>

              {/* 관리자 처리 */}
              <Section title="관리자 처리">
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">상태 변경</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">관리자 메모</label>
                  <textarea
                    value={adminMemo}
                    onChange={e => setAdminMemo(e.target.value)}
                    rows={3}
                    placeholder="내부 메모, 견적 발송 내용 등..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                  />
                </div>
              </Section>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setSelected(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={saveUpdate}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="font-semibold text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-gray-800 break-all">{value}</span>
    </div>
  );
}
