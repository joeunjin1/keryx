'use client';
/**
 * 관리자 카테고리 관리 페이지
 * /admin/categories
 *
 * 기능: 카테고리 추가, 수정, 삭제(비활성화), 순서 변경, 활성/비활성 토글
 * 다국어: 한국어 / 중국어
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Category = {
  id: string;
  code: string;
  name_ko: string;
  name_zh: string | null;
  display_order: number;
  is_active: boolean;
  parent_id: string | null;
  created_at: string;
};

type Lang = 'ko' | 'zh';

const EMPTY_FORM = {
  code: '',
  name_ko: '',
  name_zh: '',
  display_order: '',
  is_active: true,
};

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ko');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/categories');
    if (res.status === 403) { router.push('/admin'); return; }
    const json = await res.json();
    setCategories(json.categories || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setShowModal(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setForm({
      code: cat.code,
      name_ko: cat.name_ko,
      name_zh: cat.name_zh || '',
      display_order: String(cat.display_order),
      is_active: cat.is_active,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name_ko.trim()) {
      setError(t('코드와 한국어 이름은 필수입니다', '代码和韩文名称为必填项'));
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      code: form.code.trim().toUpperCase(),
      name_ko: form.name_ko.trim(),
      name_zh: form.name_zh.trim() || null,
      display_order: form.display_order ? parseInt(form.display_order) : undefined,
      is_active: form.is_active,
    };

    const url = editTarget
      ? `/api/admin/categories/${editTarget.id}`
      : '/api/admin/categories';
    const method = editTarget ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error || t('저장 실패', '保存失败'));
      return;
    }

    setSuccess(editTarget ? t('수정되었습니다', '已修改') : t('추가되었습니다', '已添加'));
    setShowModal(false);
    fetchCategories();
    setTimeout(() => setSuccess(''), 3000);
  }

  async function handleToggleActive(cat: Category) {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cat.is_active }),
    });
    if (res.ok) {
      fetchCategories();
      setSuccess(cat.is_active
        ? t('비활성화되었습니다', '已停用')
        : t('활성화되었습니다', '已启用'));
      setTimeout(() => setSuccess(''), 3000);
    }
  }

  async function handleDelete(cat: Category) {
    setSaving(true);
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    const json = await res.json();
    setSaving(false);
    setDeleteTarget(null);

    if (!res.ok) {
      setError(json.error || t('삭제 실패', '删除失败'));
      return;
    }
    setSuccess(json.soft_deleted
      ? t(json.message, json.message)
      : t('삭제되었습니다', '已删除'));
    fetchCategories();
    setTimeout(() => setSuccess(''), 5000);
  }

  async function handleMoveOrder(cat: Category, direction: 'up' | 'down') {
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex(c => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swapCat = sorted[swapIdx];
    const tempOrder = cat.display_order;

    await Promise.all([
      fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: swapCat.display_order }),
      }),
      fetch(`/api/admin/categories/${swapCat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: tempOrder }),
      }),
    ]);
    fetchCategories();
  }

  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);
  const activeCount = categories.filter(c => c.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t('카테고리 관리', '类别管理')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t(
              `전체 ${categories.length}개 · 활성 ${activeCount}개`,
              `共 ${categories.length} 个 · 启用 ${activeCount} 个`
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(l => l === 'ko' ? 'zh' : 'ko')}
            className="px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
          >
            {lang === 'ko' ? '中文' : '한국어'}
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('카테고리 추가', '添加类别')}
          </button>
        </div>
      </div>

      {/* 알림 */}
      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* 카테고리 목록 */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">{t('불러오는 중...', '加载中...')}</div>
        ) : sortedCategories.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>{t('등록된 카테고리가 없습니다', '暂无类别')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium w-16">{t('순서', '排序')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium w-24">{t('코드', '代码')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">{t('한국어 이름', '韩文名称')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">{t('중국어 이름', '中文名称')}</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium w-20">{t('상태', '状态')}</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium w-32">{t('순서 변경', '调整顺序')}</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium w-32">{t('관리', '操作')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCategories.map((cat, idx) => (
                  <tr key={cat.id} className={`hover:bg-gray-50 transition-colors ${!cat.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.display_order}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                        {cat.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name_ko}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.name_zh || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          cat.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {cat.is_active ? t('활성', '启用') : t('비활성', '停用')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleMoveOrder(cat, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                          title={t('위로', '上移')}
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveOrder(cat, 'down')}
                          disabled={idx === sortedCategories.length - 1}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                          title={t('아래로', '下移')}
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          {t('수정', '编辑')}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                        >
                          {t('삭제', '删除')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editTarget ? t('카테고리 수정', '编辑类别') : t('새 카테고리 추가', '添加新类别')}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}

              {/* 코드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('카테고리 코드', '类别代码')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="PLU, KEY, OUT ..."
                  maxLength={10}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t('영문 대문자 약어 (예: PLU, KEY, OUT)', '英文大写缩写 (例: PLU, KEY, OUT)')}
                </p>
              </div>

              {/* 한국어 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('한국어 이름', '韩文名称')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name_ko}
                  onChange={e => setForm(f => ({ ...f, name_ko: e.target.value }))}
                  placeholder={t('예: 야외용품', '例: 户外用品')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 중국어 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('중국어 이름', '中文名称')}
                </label>
                <input
                  type="text"
                  value={form.name_zh}
                  onChange={e => setForm(f => ({ ...f, name_zh: e.target.value }))}
                  placeholder={t('예: 户外用品', '例: 户外用品')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 표시 순서 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('표시 순서', '显示顺序')}
                </label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))}
                  placeholder={t('비워두면 자동 설정', '留空则自动设置')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 활성 여부 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-gray-700">
                  {form.is_active ? t('활성 (공장 등록 시 표시됨)', '启用 (工厂注册时显示)') : t('비활성 (숨김)', '停用 (隐藏)')}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                {t('취소', '取消')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t('저장 중...', '保存中...') : (editTarget ? t('수정 저장', '保存修改') : t('추가', '添加'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t('카테고리 삭제', '删除类别')}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold text-blue-700">[{deleteTarget.code}] {deleteTarget.name_ko}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {t(
                  '연결된 상품이 있으면 비활성화 처리됩니다. 계속하시겠습니까?',
                  '如有关联商品，将停用该类别。确认继续？'
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  {t('취소', '取消')}
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? t('처리 중...', '处理中...') : t('삭제', '删除')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
