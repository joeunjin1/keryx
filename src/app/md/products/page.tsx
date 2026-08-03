'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const STATUS_LABELS: Record<string, { ko: string; zh: string; color: string }> = {
  pending_review: { ko: '검토대기', zh: '待审核',   color: '#f59e0b' },
  under_review:   { ko: '검토중',   zh: '审核中',   color: '#3b82f6' },
  md_approved:    { ko: 'MD승인',   zh: 'MD通过',   color: '#8b5cf6' },
  approved:       { ko: '최종승인', zh: '最终通过', color: '#10b981' },
  rejected:       { ko: '반려',     zh: '拒绝',     color: '#ef4444' },
};

type Product = {
  id: string;
  product_code: string;
  name_ko: string;
  name_zh: string;
  category: string;
  price_cny: number;
  sell_price_cny: number;
  supply_price_cny: number;
  moq: number;
  approval_status: string;
  is_active: boolean;
  stock_qty: number;
  image_url: string;
  created_at: string;
  factory: { id: string; company_name: string; company_name_ko: string } | null;
  _edit_name_ko: string;
  _edit_name_zh: string;
  _edit_category: string;
  _edit_sell_price: string;
  _edit_moq: string;
  _dirty: boolean;
};

type Category = { id: string; name_ko: string; name_zh: string };

export default function MdProductsQueuePage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  useEffect(() => { document.title = '상품 검토 | KERYX MD'; }, []);

  const supabase = createClient() as any;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending_review');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const statuses = filterStatus === 'all'
      ? ['pending_review', 'under_review', 'md_approved', 'approved', 'rejected']
      : [filterStatus];

    const { data } = await supabase
      .from('products')
      .select(`id, product_code, name_ko, name_zh, category,
               price_cny, sell_price_cny, supply_price_cny, moq,
               approval_status, is_active, stock_qty, image_url, created_at,
               factory:factories(id, company_name, company_name_ko)`)
      .in('approval_status', statuses)
      .order('created_at', { ascending: true })
      .limit(100);

    setProducts((data ?? []).map((p: any) => ({
      ...p,
      _edit_name_ko: p.name_ko ?? '',
      _edit_name_zh: p.name_zh ?? '',
      _edit_category: p.category ?? '',
      _edit_sell_price: String(p.sell_price_cny ?? p.price_cny ?? ''),
      _edit_moq: String(p.moq ?? ''),
      _dirty: false,
    })));
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('categories').select('id, name_ko, name_zh').eq('is_active', true).order('display_order')
      .then(({ data }: any) => setCategories(data ?? []));
  }, []);

  const handleEdit = (id: string, field: string, value: string) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, [`_edit_${field}`]: value, _dirty: true } : p
    ));
  };

  const handleAction = async (product: Product, action: 'md_approve' | 'md_reject') => {
    setSaving(product.id);
    try {
      const res = await fetch('/api/admin/products/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          action,
          fields: product._dirty ? {
            name_ko: product._edit_name_ko,
            name_zh: product._edit_name_zh,
            category: product._edit_category,
            sell_price_cny: product._edit_sell_price ? parseFloat(product._edit_sell_price) : undefined,
            moq: product._edit_moq ? parseInt(product._edit_moq) : undefined,
          } : undefined,
        }),
      });
      if (!res.ok) throw new Error('API 오류');
      showToast(action === 'md_approve' ? 'MD 승인 완료' : '반려 처리 완료');
      setProducts(prev => prev.filter(p => p.id !== product.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(product.id); return n; });
    } catch {
      showToast('처리 실패. 다시 시도해 주세요.', 'err');
    }
    setSaving(null);
  };

  const handleSaveOnly = async (product: Product) => {
    if (!product._dirty) return;
    setSaving(product.id);
    try {
      const res = await fetch('/api/admin/products/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          action: 'update_only',
          fields: {
            name_ko: product._edit_name_ko,
            name_zh: product._edit_name_zh,
            category: product._edit_category,
            sell_price_cny: product._edit_sell_price ? parseFloat(product._edit_sell_price) : undefined,
            moq: product._edit_moq ? parseInt(product._edit_moq) : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error('API 오류');
      showToast('수정 저장 완료');
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, _dirty: false } : p));
    } catch {
      showToast('저장 실패', 'err');
    }
    setSaving(null);
  };

  const handleBulkApprove = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    const res = await fetch('/api/admin/products/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: Array.from(selectedIds), action: 'md_approve' }),
    });
    if (res.ok) {
      showToast(`${selectedIds.size}건 MD 승인 완료`);
      setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } else {
      showToast('일괄 처리 실패', 'err');
    }
    setBulkLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold text-white transition-all
          ${toast.type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="px-4 py-5 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              <LangText ko="공장 상품 검토" zh="工厂产品审核" />
            </h1>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
              <LangText ko="셀 클릭으로 바로 수정 · 저장 후 MD승인/반려" zh="点击单元格直接编辑 · 保存后MD通过/拒绝" />
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'pending_review', ko: '검토대기', zh: '待审核' },
              { id: 'under_review',   ko: '검토중',   zh: '审核中' },
              { id: 'all',            ko: '전체',     zh: '全部' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all
                  ${filterStatus === s.id
                    ? 'bg-[#6366f1] text-white border-[#6366f1]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border-light)] hover:border-[#6366f1]'}`}
              >
                <LangText ko={s.ko} zh={s.zh} />
              </button>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="text-[13px] font-semibold text-indigo-700">
              <LangText ko={`${selectedIds.size}건 선택됨`} zh={`已选 ${selectedIds.size} 件`} />
            </span>
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-emerald-500 text-white text-[12px] font-semibold rounded-md disabled:opacity-50"
            >
              <LangText ko="일괄 MD승인" zh="批量MD通过" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-[var(--text-tertiary)] text-sm">
            <LangText ko="로딩 중..." zh="加载中..." />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[var(--border-light)] rounded-xl">
            <div className="text-4xl mb-3 text-emerald-400">✓</div>
            <div className="text-sm text-[var(--text-secondary)]">
              <LangText ko="검토할 상품이 없습니다" zh="没有需要审核的产品" />
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-light)] shadow-sm bg-white">
            <table className="w-full border-collapse text-[13px]" style={{ minWidth: 1100 }}>
              <thead>
                <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-light)]">
                  <th className="w-9 px-3 py-2.5 text-center">
                    <input type="checkbox"
                      checked={selectedIds.size === products.length && products.length > 0}
                      onChange={toggleAll} className="cursor-pointer" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--text-secondary)] w-14">
                    <LangText ko="이미지" zh="图片" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--text-secondary)] w-24">
                    <LangText ko="코드" zh="编号" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--text-secondary)] min-w-[140px]">
                    <LangText ko="제품명(한)" zh="产品名(韩)" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--text-secondary)] min-w-[140px]">
                    <LangText ko="제품명(중)" zh="产品名(中)" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--text-secondary)] min-w-[130px]">
                    <LangText ko="카테고리" zh="分类" />
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[var(--text-secondary)] w-24">
                    <LangText ko="판매가(¥)" zh="售价(¥)" />
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[var(--text-secondary)] w-20">MOQ</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[var(--text-secondary)] w-28">
                    <LangText ko="공장" zh="工厂" />
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[var(--text-secondary)] w-20">
                    <LangText ko="상태" zh="状态" />
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[var(--text-secondary)] w-[200px]">
                    <LangText ko="액션" zh="操作" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => {
                  const status = STATUS_LABELS[p.approval_status] ?? { ko: p.approval_status, zh: p.approval_status, color: '#9ca3af' };
                  const isSaving = saving === p.id;
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]';

                  return (
                    <tr key={p.id} className={`${rowBg} border-b border-[var(--border-light)] hover:bg-indigo-50/30 transition-colors`}>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="cursor-pointer" />
                      </td>
                      <td className="px-3 py-2">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-10 h-10 object-cover rounded-md border border-[var(--border-light)]" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-light)] flex items-center justify-center text-[10px] text-[var(--text-tertiary)]">
                            <LangText ko="없음" zh="无" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-tertiary)] font-mono text-[11px]">{p.product_code}</td>

                      {/* 제품명 한국어 인라인 편집 */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={p._edit_name_ko}
                          onChange={e => handleEdit(p.id, 'name_ko', e.target.value)}
                          className={`w-full px-2 py-1 text-[13px] border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all
                            ${p._dirty ? 'border-amber-400 bg-amber-50' : 'border-transparent bg-transparent hover:border-[var(--border-light)] hover:bg-white'}`}
                          placeholder="제품명(한)"
                        />
                      </td>

                      {/* 제품명 중국어 인라인 편집 */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={p._edit_name_zh}
                          onChange={e => handleEdit(p.id, 'name_zh', e.target.value)}
                          className={`w-full px-2 py-1 text-[13px] border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all
                            ${p._dirty ? 'border-amber-400 bg-amber-50' : 'border-transparent bg-transparent hover:border-[var(--border-light)] hover:bg-white'}`}
                          placeholder="产品名(中)"
                        />
                      </td>

                      {/* 카테고리 드롭다운 */}
                      <td className="px-2 py-1.5">
                        <select
                          value={p._edit_category}
                          onChange={e => handleEdit(p.id, 'category', e.target.value)}
                          className={`w-full px-2 py-1 text-[13px] border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all
                            ${p._dirty ? 'border-amber-400 bg-amber-50' : 'border-transparent bg-transparent hover:border-[var(--border-light)] hover:bg-white'}`}
                        >
                          <option value=""><LangText ko="-- 선택 --" zh="-- 选择 --" /></option>
                          {categories.map(c => (
                            <option key={c.id} value={c.name_ko}>{c.name_ko}</option>
                          ))}
                          {p._edit_category && !categories.find(c => c.name_ko === p._edit_category) && (
                            <option value={p._edit_category}>{p._edit_category}</option>
                          )}
                        </select>
                      </td>

                      {/* 판매가 인라인 편집 */}
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={p._edit_sell_price}
                          onChange={e => handleEdit(p.id, 'sell_price', e.target.value)}
                          className={`w-full px-2 py-1 text-[13px] text-right border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all
                            ${p._dirty ? 'border-amber-400 bg-amber-50' : 'border-transparent bg-transparent hover:border-[var(--border-light)] hover:bg-white'}`}
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </td>

                      {/* MOQ 인라인 편집 */}
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={p._edit_moq}
                          onChange={e => handleEdit(p.id, 'moq', e.target.value)}
                          className={`w-full px-2 py-1 text-[13px] text-right border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all
                            ${p._dirty ? 'border-amber-400 bg-amber-50' : 'border-transparent bg-transparent hover:border-[var(--border-light)] hover:bg-white'}`}
                          placeholder="0"
                          min="1"
                        />
                      </td>

                      <td className="px-3 py-2 text-[var(--text-secondary)] text-[12px]">
                        {p.factory?.company_name_ko ?? p.factory?.company_name ?? '-'}
                      </td>

                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                          style={{ backgroundColor: status.color }}>
                          <LangText ko={status.ko} zh={status.zh} />
                        </span>
                      </td>

                      <td className="px-2 py-2">
                        <div className="flex gap-1.5 justify-center flex-wrap">
                          {p._dirty && (
                            <button
                              onClick={() => handleSaveOnly(p)}
                              disabled={isSaving}
                              className="px-2.5 py-1 bg-amber-500 text-white text-[11px] font-semibold rounded disabled:opacity-50 whitespace-nowrap"
                            >
                              <LangText ko="저장" zh="保存" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(p, 'md_approve')}
                            disabled={isSaving}
                            className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-semibold rounded disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSaving ? '...' : <LangText ko="MD승인" zh="MD通过" />}
                          </button>
                          <button
                            onClick={() => handleAction(p, 'md_reject')}
                            disabled={isSaving}
                            className="px-2.5 py-1 bg-red-100 text-red-600 text-[11px] font-semibold rounded disabled:opacity-50 whitespace-nowrap"
                          >
                            <LangText ko="반려" zh="拒绝" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex gap-3 flex-wrap text-[11px] text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400" />
            <LangText ko="수정된 셀 (저장 필요)" zh="已修改单元格（需保存）" />
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded bg-purple-500" />
            <LangText ko="MD승인 → 관리자 최종 승인 대기" zh="MD通过 → 等待管理员最终审批" />
          </span>
        </div>
      </div>
    </div>
  );
}
