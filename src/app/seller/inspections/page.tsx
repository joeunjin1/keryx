'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';


const STATUS_TABS = [
  { key: 'all', ko: '전체', zh: '全部' },
  { key: 'passed', ko: '합격', zh: '合格' },
  { key: 'failed', ko: '불합격', zh: '不合格' },
  { key: 'pending', ko: '진행중', zh: '进行中' },
];

const STATUS_LABELS: Record<string, [string, string, string]> = {
  passed:  ['합격', '合格', '#22c55e'],
  failed:  ['불합격', '不合格', '#ef4444'],
  pending: ['진행중', '进行中', '#f59e0b'],
  in_progress: ['검수중', '检验中', '#3b82f6'],
};

export default function SellerInspectionsPage() {
  const { lang } = useLangContext();

  const [tab, setTab] = useState('all');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  useEffect(() => {
    setLoading(true);
    fetch('/api/seller/inspections')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setReports(d.data ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? reports : reports.filter(r => r.result === tab || r.status === tab);

  return (
      <div style={{ padding: '0 0 80px' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px 20px 16px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
            🔍 {t('검수 보고서', '检验报告')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {t('주문 상품의 품질 검수 결과를 확인하세요', '查看订单商品的质量检验结果')}
          </p>
        </div>

        {/* 탭 필터 */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', overflowX: 'auto' }}>
          {STATUS_TABS.map(s => (
            <button key={s.key} onClick={() => setTab(s.key)} style={{
              padding: '8px 16px', borderRadius: '99px', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              background: tab === s.key ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'var(--bg-base)',
              color: tab === s.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: tab === s.key ? '0 4px 12px rgba(102,126,234,0.35)' : 'var(--shadow-sm)',
              border: tab === s.key ? 'none' : '1px solid var(--border-light)',
            }}>
              {lang === 'zh' ? s.zh : s.ko}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div style={{ padding: '0 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
              {t('불러오는 중...', '加载中...')}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              background: 'var(--bg-base)', borderRadius: '20px',
              border: '1px solid var(--border-light)',
            }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {t('검수 보고서가 없습니다', '暂无检验报告')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.7, marginBottom: 24 }}>
                {t('주문 완료 후 검수가 진행되면\n보고서가 이곳에 표시됩니다', '订单完成后进行检验时\n报告将显示在此处')}
              </div>
              <Link href="/seller/orders" style={{
                display: 'inline-block', padding: '12px 24px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
                {t('주문 확인하기 →', '查看订单 →')}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((r: any) => {
                const [koLabel, zhLabel, color] = STATUS_LABELS[r.result ?? r.status] ?? ['진행중', '进行中', '#f59e0b'];
                return (
                  <Link key={r.id} href={`/seller/inspections/${r.id}/report`} style={{
                    display: 'block', textDecoration: 'none',
                    background: 'var(--bg-base)', borderRadius: '16px',
                    border: `1.5px solid ${color}25`,
                    padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
                    borderLeft: `4px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {r.order_no ?? r.inspection_no ?? `#${r.id?.slice(0, 8)}`}
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: '99px', fontSize: 11, fontWeight: 700,
                        background: `${color}15`, color, border: `1px solid ${color}30`,
                      }}>
                        {lang === 'zh' ? zhLabel : koLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                      {r.product_name ?? t('제품명 미지정', '未指定产品名称')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {r.inspected_at ? new Date(r.inspected_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR') : t('날짜 미정', '日期未定')}
                      </div>
                      {r.pass_rate !== undefined && (
                        <div style={{ fontSize: 12, fontWeight: 700, color }}>
                          {t('합격률', '合格率')} {r.pass_rate}%
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}
