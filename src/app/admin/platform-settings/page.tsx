"use client";
import { useState, useEffect } from 'react';
import { useLangContext } from '@/components/layout/LangContext';

interface Setting {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by?: string;
}

const SETTING_LABELS: Record<string, { ko: string; zh: string; desc_ko: string; desc_zh: string; type: 'number' | 'boolean' | 'text' }> = {
  matched_factory_discount_rate: {
    ko: '매칭공장 할인율 (%)',
    zh: '匹配工厂折扣率 (%)',
    desc_ko: '매칭공장 상품을 Shop 가격 대비 몇 % 할인하여 바이어에게 표시할지 설정합니다.',
    desc_zh: '设置匹配工厂商品相对于Shop价格的折扣百分比，展示给买家。',
    type: 'number',
  },
  matched_factory_discount_enabled: {
    ko: '매칭공장 할인 활성화',
    zh: '启用匹配工厂折扣',
    desc_ko: '매칭공장 할인 기능을 켜거나 끕니다.',
    desc_zh: '开启或关闭匹配工厂折扣功能。',
    type: 'boolean',
  },
};

export default function AdminPlatformSettingsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform-settings');
      const json = await res.json();
      const data: Setting[] = json.data || [];
      setSettings(data);
      const vals: Record<string, string> = {};
      data.forEach((s) => { vals[s.key] = s.value; });
      // 기본값 설정 (DB에 없는 경우)
      if (!vals['matched_factory_discount_rate']) vals['matched_factory_discount_rate'] = '5';
      if (!vals['matched_factory_discount_enabled']) vals['matched_factory_discount_enabled'] = 'true';
      setEditValues(vals);
    } catch (e) {
      setError(t('설정을 불러오는 중 오류가 발생했습니다.', '加载设置时发生错误。'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    setError(null);
    try {
      const res = await fetch('/api/platform-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: editValues[key] }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || '저장 실패');
      setSavedKeys((prev) => [...prev, key]);
      setTimeout(() => setSavedKeys((prev) => prev.filter((k) => k !== key)), 3000);
      await fetchSettings();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSaving(null);
    }
  };

  const getSettingInfo = (key: string) => SETTING_LABELS[key] || {
    ko: key, zh: key,
    desc_ko: '', desc_zh: '',
    type: 'text' as const,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
          ⚙️ {t('플랫폼 설정', '平台设置')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {t('바이어 대시보드 할인율 등 플랫폼 전반의 설정을 관리합니다.', '管理买家仪表板折扣率等平台整体设置。')}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          {t('설정 불러오는 중...', '加载设置中...')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.keys(SETTING_LABELS).map((key) => {
            const info = getSettingInfo(key);
            const currentSetting = settings.find((s) => s.key === key);
            const isSaved = savedKeys.includes(key);
            const isSaving = saving === key;

            return (
              <div key={key} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 16,
                padding: '20px 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {lang === 'zh' ? info.zh : info.ko}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                    {lang === 'zh' ? info.desc_zh : info.desc_ko}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {info.type === 'boolean' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['true', 'false'].map((val) => (
                        <button
                          key={val}
                          onClick={() => setEditValues((prev) => ({ ...prev, [key]: val }))}
                          style={{
                            padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                            border: editValues[key] === val ? 'none' : '1px solid var(--border-default)',
                            background: editValues[key] === val
                              ? (val === 'true' ? 'linear-gradient(135deg, #10b981, #059669)' : '#ef4444')
                              : 'var(--bg-base)',
                            color: editValues[key] === val ? '#fff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          {val === 'true' ? t('활성화', '启用') : t('비활성화', '禁用')}
                        </button>
                      ))}
                    </div>
                  ) : info.type === 'number' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={editValues[key] || ''}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        style={{
                          width: 100, padding: '8px 12px', borderRadius: 10, fontSize: 16, fontWeight: 700,
                          border: '2px solid var(--border-default)', background: 'var(--bg-base)',
                          color: 'var(--text-primary)', textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>%</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={editValues[key] || ''}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 14,
                        border: '1px solid var(--border-default)', background: 'var(--bg-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  )}

                  <button
                    onClick={() => handleSave(key)}
                    disabled={isSaving}
                    style={{
                      padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: isSaved ? '#10b981' : 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: '#fff', border: 'none', cursor: isSaving ? 'wait' : 'pointer',
                      opacity: isSaving ? 0.7 : 1,
                      minWidth: 72,
                    }}
                  >
                    {isSaving ? t('저장 중...', '保存中...') : isSaved ? `✅ ${t('저장됨', '已保存')}` : t('저장', '保存')}
                  </button>
                </div>

                {currentSetting && (
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {t('마지막 수정', '最后修改')}: {new Date(currentSetting.updated_at).toLocaleString(lang === 'zh' ? 'zh-CN' : 'ko-KR')}
                    {currentSetting.updated_by && ` · ${currentSetting.updated_by}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: 28, background: 'linear-gradient(135deg, #f0f4ff, #faf5ff)',
        border: '1px solid #e0e7ff', borderRadius: 16, padding: '16px 20px',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95', marginBottom: 6 }}>
          💡 {t('할인율 적용 방식', '折扣率应用方式')}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.8 }}>
          {t(
            '매칭공장 할인율은 Shop에 등록된 상품의 판매가(sell_price_cny)를 기준으로 계산됩니다. 예: Shop 가격 ¥10.00, 할인율 5% → 매칭공장 가격 ¥9.50',
            '匹配工厂折扣率基于Shop中注册商品的销售价格(sell_price_cny)计算。例：Shop价格¥10.00，折扣率5% → 匹配工厂价格¥9.50'
          )}
        </div>
      </div>
    </div>
  );
}
