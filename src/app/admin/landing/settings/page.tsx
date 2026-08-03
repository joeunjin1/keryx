'use client';
import { useState, useEffect, useCallback } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

interface LandingPage {
  id: string;
  slug: string;
  title_ko: string;
  title_zh: string;
  banner_title_ko: string;
  banner_title_zh: string;
  banner_subtitle_ko: string;
  banner_subtitle_zh: string;
  factory_ids: string[];
  is_active: boolean;
  view_count: number;
  inquiry_count: number;
}
interface Factory {
  id: string;
  company_name: string;
  company_name_ko: string;
  city: string;
  avg_rating: number;
}

type AccordionSection = 'factory' | 'banner' | null;

export default function LandingSettingsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const [pages, setPages] = useState<LandingPage[]>([]);
  const [allFactories, setAllFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);

  // 아코디언: { pageId: 'factory' | 'banner' | null }
  const [openSection, setOpenSection] = useState<Record<string, AccordionSection>>({});
  // 편집 중인 페이지 데이터 (pageId별로 독립 관리)
  const [editData, setEditData] = useState<Record<string, LandingPage>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveMsg, setSaveMsg] = useState<Record<string, string>>({});
  const [factorySearch, setFactorySearch] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/landing-settings').then(r => r.json()),
      fetch('/api/public/factories?limit=100').then(r => r.json()),
    ]).then(([pData, fData]) => {
      const pageList: LandingPage[] = pData.pages || [];
      setPages(pageList);
      setAllFactories(fData.factories || []);
      const initEdit: Record<string, LandingPage> = {};
      pageList.forEach(p => { initEdit[p.id] = { ...p }; });
      setEditData(initEdit);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getFactoryName = useCallback((id: string) => {
    const f = allFactories.find(f => f.id === id);
    if (!f) return id.slice(0, 8) + '...';
    return f.company_name_ko || f.company_name || id.slice(0, 8);
  }, [allFactories]);

  const getFilteredFactories = (pageId: string) => {
    const q = (factorySearch[pageId] || '').toLowerCase().trim();
    if (!q) return allFactories;
    return allFactories.filter(f =>
      (f.company_name_ko || '').toLowerCase().includes(q) ||
      (f.company_name || '').toLowerCase().includes(q) ||
      (f.city || '').toLowerCase().includes(q)
    );
  };

  const toggleSection = (pageId: string, section: AccordionSection) => {
    setOpenSection(prev => ({
      ...prev,
      [pageId]: prev[pageId] === section ? null : section,
    }));
  };

  const toggleFactory = (pageId: string, factoryId: string) => {
    setEditData(prev => {
      const page = prev[pageId];
      if (!page) return prev;
      const ids = page.factory_ids || [];
      const next = ids.includes(factoryId)
        ? ids.filter(id => id !== factoryId)
        : [...ids, factoryId];
      return { ...prev, [pageId]: { ...page, factory_ids: next } };
    });
  };

  const removeFactory = (pageId: string, factoryId: string) => {
    setEditData(prev => {
      const page = prev[pageId];
      if (!page) return prev;
      return { ...prev, [pageId]: { ...page, factory_ids: (page.factory_ids || []).filter(id => id !== factoryId) } };
    });
  };

  const updateField = (pageId: string, field: keyof LandingPage, value: string | boolean) => {
    setEditData(prev => {
      const page = prev[pageId];
      if (!page) return prev;
      return { ...prev, [pageId]: { ...page, [field]: value } };
    });
  };

  const handleSave = async (pageId: string) => {
    const data = editData[pageId];
    if (!data) return;
    setSaving(prev => ({ ...prev, [pageId]: true }));
    try {
      const resp = await fetch('/api/admin/landing-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (resp.ok) {
        setPages(prev => prev.map(p => p.id === pageId ? { ...data } : p));
        setSaveMsg(prev => ({ ...prev, [pageId]: 'success' }));
        setTimeout(() => setSaveMsg(prev => ({ ...prev, [pageId]: '' })), 4000);
      } else {
        setSaveMsg(prev => ({ ...prev, [pageId]: 'error' }));
        setTimeout(() => setSaveMsg(prev => ({ ...prev, [pageId]: '' })), 3000);
      }
    } finally {
      setSaving(prev => ({ ...prev, [pageId]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        {t('로딩 중...', '加载中...')}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
          {t('랜딩 페이지 설정', '落地页设置')}
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>
          {t(
            '광고 랜딩 페이지의 공장 연결 및 배너 콘텐츠를 관리합니다. 공장을 연결하면 해당 공장의 상품이 랜딩 페이지에 즉시 자동 노출됩니다.',
            '管理广告落地页的工厂关联及横幅内容。关联工厂后，该工厂的产品将立即自动显示在落地页上。'
          )}
        </p>
      </div>

      {/* 페이지 목록 카운트 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ background: '#667eea', color: '#fff', borderRadius: 8, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
          {pages.length}{t('개', '个')}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>
          {t('랜딩 페이지 목록', '落地页列表')}
        </span>
      </div>

      {/* 페이지 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pages.map(page => {
          const ed = editData[page.id] || page;
          const connectedNames = (ed.factory_ids || []).map(id => getFactoryName(id));
          const isFactoryOpen = openSection[page.id] === 'factory';
          const isBannerOpen = openSection[page.id] === 'banner';
          const isSaving = saving[page.id];
          const msg = saveMsg[page.id];

          return (
            <div key={page.id} style={{
              background: '#fff',
              borderRadius: 16,
              border: (isFactoryOpen || isBannerOpen) ? '2px solid #667eea' : '1px solid #e5e7eb',
              boxShadow: (isFactoryOpen || isBannerOpen)
                ? '0 4px 24px rgba(102,126,234,0.12)'
                : '0 1px 4px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}>
              {/* ── 카드 헤더 ── */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
                      {lang === 'zh' ? page.title_zh : page.title_ko}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>/landing/{page.slug}</div>
                  </div>
                  <span style={{
                    background: page.is_active ? '#d1fae5' : '#fee2e2',
                    color: page.is_active ? '#065f46' : '#991b1b',
                    borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
                  }}>
                    {page.is_active ? t('활성', '已激活') : t('비활성', '未激活')}
                  </span>
                </div>

                {/* 통계 */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>
                    👁 {t('조회', '浏览')} <strong>{page.view_count || 0}</strong>
                  </span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>
                    📩 {t('문의', '咨询')} <strong>{page.inquiry_count || 0}</strong>
                  </span>
                </div>

                {/* 연결된 공장 태그 (요약) */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    {t(`연결된 공장 (${connectedNames.length}개)`, `已关联工厂 (${connectedNames.length}个)`)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {connectedNames.length === 0 ? (
                      <span style={{
                        fontSize: 12, color: '#f59e0b', background: '#fffbeb',
                        borderRadius: 8, padding: '4px 10px',
                      }}>
                        ⚠️ {t('연결된 공장 없음 — 상품이 노출되지 않습니다', '未关联工厂 — 产品将不会显示')}
                      </span>
                    ) : connectedNames.map((name, i) => (
                      <span key={i} style={{
                        background: '#ede9fe', color: '#6d28d9',
                        borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                      }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ── 액션 버튼 행 ── */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* 공장 연결 관리 버튼 (핵심 CTA) */}
                  <button
                    onClick={() => toggleSection(page.id, 'factory')}
                    style={{
                      background: isFactoryOpen ? '#667eea' : '#f0f0ff',
                      color: isFactoryOpen ? '#fff' : '#667eea',
                      border: '2px solid #667eea',
                      borderRadius: 10, padding: '9px 20px',
                      fontSize: 13, fontWeight: 800, cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    🏭 {t('공장 연결 관리', '工厂关联管理')}
                    <span style={{ fontSize: 12 }}>{isFactoryOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* 배너 설정 버튼 */}
                  <button
                    onClick={() => toggleSection(page.id, 'banner')}
                    style={{
                      background: isBannerOpen ? '#10b981' : '#f0fdf4',
                      color: isBannerOpen ? '#fff' : '#10b981',
                      border: '2px solid #10b981',
                      borderRadius: 10, padding: '9px 20px',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    ✏️ {t('배너 설정', '横幅设置')}
                    <span style={{ fontSize: 12 }}>{isBannerOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* 페이지 보기 */}
                  <a
                    href={`/landing/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#f9fafb', color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: 10, padding: '9px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    🔗 {t('페이지 보기', '查看页面')}
                  </a>

                  {/* 문의 보기 */}
                  <a
                    href="/admin/landing"
                    style={{
                      background: '#f9fafb', color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: 10, padding: '9px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    💬 {t('문의 보기', '查看咨询')}
                  </a>
                </div>
              </div>

              {/* ── 공장 연결 관리 아코디언 (카드 아래로 펼침) ── */}
              {isFactoryOpen && (
                <div style={{
                  borderTop: '2px solid #667eea',
                  background: '#f8f7ff',
                  padding: '24px',
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#4c1d95', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🏭 {t('공장 연결 관리', '工厂关联管理')}
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
                      — {t('공장을 선택하면 해당 공장의 상품이 랜딩 페이지에 자동 노출됩니다', '选择工厂后，该工厂的产品将自动显示在落地页上')}
                    </span>
                  </h3>

                  {/* 현재 연결된 공장 */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                      ✅ {t(`현재 연결된 공장 (${(ed.factory_ids || []).length}개)`, `当前已关联工厂 (${(ed.factory_ids || []).length}个)`)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(ed.factory_ids || []).length === 0 ? (
                        <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', padding: '8px 0' }}>
                          {t('연결된 공장이 없습니다. 아래에서 공장을 선택하세요.', '暂无关联工厂，请在下方选择工厂。')}
                        </span>
                      ) : (ed.factory_ids || []).map(fid => (
                        <span key={fid} style={{
                          background: '#ede9fe', color: '#6d28d9',
                          borderRadius: 20, padding: '5px 12px',
                          fontSize: 13, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {getFactoryName(fid)}
                          <button
                            onClick={() => removeFactory(page.id, fid)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#6d28d9', fontSize: 16, padding: 0, lineHeight: 1,
                              fontWeight: 700,
                            }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 공장 검색 */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                      🔍 {t('공장 검색 및 추가', '搜索并添加工厂')}
                    </div>
                    <input
                      type="text"
                      placeholder={t('공장명 또는 도시명으로 검색...', '输入工厂名或城市名搜索...')}
                      value={factorySearch[page.id] || ''}
                      onChange={e => setFactorySearch(prev => ({ ...prev, [page.id]: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px',
                        border: '1.5px solid #c4b5fd', borderRadius: 10,
                        fontSize: 14, outline: 'none',
                        background: '#fff',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 공장 목록 */}
                  <div style={{
                    maxHeight: 280,
                    overflowY: 'auto',
                    border: '1px solid #ddd6fe',
                    borderRadius: 10,
                    background: '#fff',
                    marginBottom: 16,
                  }}>
                    {getFilteredFactories(page.id).length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                        {t('검색 결과가 없습니다.', '没有搜索结果。')}
                      </div>
                    ) : getFilteredFactories(page.id).map(factory => {
                      const isLinked = (ed.factory_ids || []).includes(factory.id);
                      return (
                        <div
                          key={factory.id}
                          onClick={() => toggleFactory(page.id, factory.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            background: isLinked ? '#f5f3ff' : '#fff',
                            transition: 'background 0.15s',
                          }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 6,
                            border: isLinked ? '2px solid #667eea' : '2px solid #d1d5db',
                            background: isLinked ? '#667eea' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isLinked && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                              {factory.company_name_ko || factory.company_name}
                            </div>
                            {factory.company_name && factory.company_name_ko && (
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{factory.company_name}</div>
                            )}
                          </div>
                          {factory.city && (
                            <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 6, padding: '2px 8px' }}>
                              {factory.city}
                            </span>
                          )}
                          {isLinked && (
                            <span style={{ fontSize: 11, color: '#667eea', fontWeight: 700 }}>
                              ✓ {t('연결됨', '已关联')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 저장 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => handleSave(page.id)}
                      disabled={isSaving}
                      style={{
                        background: isSaving ? '#9ca3af' : '#667eea',
                        color: '#fff', border: 'none',
                        borderRadius: 10, padding: '11px 32px',
                        fontSize: 14, fontWeight: 800, cursor: isSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSaving ? t('저장 중...', '保存中...') : t('💾 공장 연결 저장', '💾 保存工厂关联')}
                    </button>
                    {msg === 'success' && (
                      <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                        ✓ {t('저장되었습니다! 랜딩 페이지에 즉시 반영됩니다.', '已保存！将立即在落地页上显示。')}
                      </span>
                    )}
                    {msg === 'error' && (
                      <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                        ✗ {t('저장 실패. 다시 시도해주세요.', '保存失败，请重试。')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── 배너 설정 아코디언 (카드 아래로 펼침) ── */}
              {isBannerOpen && (
                <div style={{
                  borderTop: '2px solid #10b981',
                  background: '#f0fdf4',
                  padding: '24px',
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#065f46', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    ✏️ {t('배너 콘텐츠 설정', '横幅内容设置')}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                    {/* 한국어 */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                        🇰🇷 {t('한국어', '韩语')}
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                          {t('배너 제목', '横幅标题')}
                        </label>
                        <input
                          type="text"
                          value={ed.banner_title_ko || ''}
                          onChange={e => updateField(page.id, 'banner_title_ko', e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1fae5', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                          {t('배너 부제목', '横幅副标题')}
                        </label>
                        <textarea
                          value={ed.banner_subtitle_ko || ''}
                          onChange={e => updateField(page.id, 'banner_subtitle_ko', e.target.value)}
                          rows={3}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1fae5', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                    </div>

                    {/* 중국어 */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                        🇨🇳 {t('중국어', '中文')}
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                          {t('배너 제목 (중국어)', '横幅标题（中文）')}
                        </label>
                        <input
                          type="text"
                          value={ed.banner_title_zh || ''}
                          onChange={e => updateField(page.id, 'banner_title_zh', e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1fae5', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                          {t('배너 부제목 (중국어)', '横幅副标题（中文）')}
                        </label>
                        <textarea
                          value={ed.banner_subtitle_zh || ''}
                          onChange={e => updateField(page.id, 'banner_subtitle_zh', e.target.value)}
                          rows={3}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1fae5', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 활성화 토글 */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={ed.is_active}
                        onChange={e => updateField(page.id, 'is_active', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#10b981' }}
                      />
                      {t('페이지 활성화 (체크 해제 시 랜딩 페이지 비공개)', '激活页面（取消勾选则隐藏落地页）')}
                    </label>
                  </div>

                  {/* 저장 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => handleSave(page.id)}
                      disabled={isSaving}
                      style={{
                        background: isSaving ? '#9ca3af' : '#10b981',
                        color: '#fff', border: 'none',
                        borderRadius: 10, padding: '11px 32px',
                        fontSize: 14, fontWeight: 800, cursor: isSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSaving ? t('저장 중...', '保存中...') : t('💾 배너 설정 저장', '💾 保存横幅设置')}
                    </button>
                    {msg === 'success' && (
                      <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                        ✓ {t('저장되었습니다!', '已保存！')}
                      </span>
                    )}
                    {msg === 'error' && (
                      <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                        ✗ {t('저장 실패. 다시 시도해주세요.', '保存失败，请重试。')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
