'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

// ─── IP 제안 상태 정의 ───────────────────────────────────────
const PROPOSAL_STATUSES = [
  { id: 'preparing', ko: '준비중', zh: '准备中', color: '#6366f1', icon: '📝' },
  { id: 'sent', ko: '발송 완료', zh: '已发送', color: '#8b5cf6', icon: '📤' },
  { id: 'reviewing', ko: '검토중', zh: '审核中', color: '#f59e0b', icon: '👀' },
  { id: 'accepted', ko: '수락', zh: '已接受', color: '#22c55e', icon: '✅' },
  { id: 'rejected', ko: '거절', zh: '已拒绝', color: '#ef4444', icon: '❌' },
];

// ─── KERYX 자체 IP 목록 ───────────────────────────────────────
const KERYX_IPS = [
  { id: 'puzzi', name: '뿌찌프랜즈', nameZh: '뿌찌Friends', emoji: '🐰', color: '#ec4899' },
  { id: 'duckle', name: '덕클', nameZh: '덕클', emoji: '🦆', color: '#f59e0b' },
  { id: 'dinomon', name: '디노몬', nameZh: '디노몬', emoji: '🦕', color: '#10b981' },
  { id: 'custom', name: '커스텀 IP', nameZh: '定制IP', emoji: '🎨', color: '#6366f1' },
];

interface IpProposal {
  id: string;
  seller_id: string;
  business_name: string;
  ip_character: string;
  ip_name: string;
  status: string;
  proposed_products: string[];
  sent_at?: string;
  responded_at?: string;
  seller_feedback?: string;
  created_at: string;
  proposed_by_name?: string;
}

export default function IpProposalsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient() as any;

  const [proposals, setProposals] = useState<IpProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIp, setFilterIp] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    // ip_proposals 테이블에서 로드 시도
    const { data, error } = await supabase
      .from('ip_proposals')
      .select('*, seller:sellers(business_name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProposals(data.map((p: any) => ({
        id: p.id,
        seller_id: p.seller_id,
        business_name: p.seller?.business_name ?? p.business_name_override ?? '미지정',
        ip_character: p.ip_character ?? 'custom',
        ip_name: p.ip_name ?? '미지정',
        status: p.status ?? 'preparing',
        proposed_products: p.proposed_products ?? [],
        sent_at: p.sent_at,
        responded_at: p.responded_at,
        seller_feedback: p.seller_feedback,
        created_at: p.created_at,
        proposed_by_name: p.proposed_by_name,
      })));
    } else {
      // 테이블이 없거나 비어있을 경우 빈 상태 표시
      setProposals([]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadProposals(); }, [loadProposals]);

  // 필터링
  const filteredProposals = proposals.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterIp !== 'all' && p.ip_character !== filterIp) return false;
    return true;
  });

  // 통계
  const stats = {
    total: proposals.length,
    preparing: proposals.filter(p => p.status === 'preparing').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    reviewing: proposals.filter(p => p.status === 'reviewing').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };
  const conversionRate = stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;

  return (
    <div className="kx-animate-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)]">
            {t('IP 제안 보드', 'IP提案看板')}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {t('파트너에게 제안한 IP와 진행 상태를 관리합니다', '管理向合作伙伴提案的IP及进展状态')}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
        >
          + {t('새 IP 제안', '新IP提案')}
        </button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-[var(--border-light)] p-4 text-center">
          <div className="text-2xl font-black text-indigo-600">{stats.total}</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{t('총 제안', '总提案')}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border-light)] p-4 text-center">
          <div className="text-2xl font-black text-amber-500">{stats.sent + stats.reviewing}</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{t('진행중', '进行中')}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border-light)] p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">{stats.accepted}</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{t('수락', '已接受')}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border-light)] p-4 text-center">
          <div className="text-2xl font-black text-violet-600">{conversionRate}%</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{t('전환율', '转化率')}</div>
        </div>
      </div>

      {/* IP별 제안 현황 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {KERYX_IPS.map(ip => {
          const count = proposals.filter(p => p.ip_character === ip.id).length;
          const accepted = proposals.filter(p => p.ip_character === ip.id && p.status === 'accepted').length;
          return (
            <div
              key={ip.id}
              onClick={() => setFilterIp(filterIp === ip.id ? 'all' : ip.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterIp === ip.id ? 'ring-2 ring-offset-1' : ''}`}
              style={{ borderColor: `${ip.color}30`, backgroundColor: `${ip.color}05`, ...(filterIp === ip.id ? { ringColor: ip.color } : {}) }}
            >
              <div className="text-2xl mb-1">{ip.emoji}</div>
              <div className="text-xs font-bold" style={{ color: ip.color }}>{ip.name}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-1">
                {t(`${count}건 제안 / ${accepted}건 수락`, `${count}个提案 / ${accepted}个接受`)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-[var(--text-secondary)]'}`}
        >
          {t('전체', '全部')} ({stats.total})
        </button>
        {PROPOSAL_STATUSES.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === s.id ? 'text-white' : 'bg-gray-100 text-[var(--text-secondary)]'}`}
            style={filterStatus === s.id ? { backgroundColor: s.color } : {}}
          >
            {s.icon} {t(s.ko, s.zh)}
          </button>
        ))}
      </div>

      {/* 제안 목록 */}
      {loading ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">{t('로딩 중...', '加载中...')}</div>
      ) : filteredProposals.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📌</div>
          <p className="text-sm font-bold text-[var(--text-secondary)]">
            {t('아직 IP 제안이 없습니다', '暂无IP提案')}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            {t('"새 IP 제안" 버튼을 눌러 파트너에게 IP를 제안해보세요', '点击"新IP提案"按钮向合作伙伴提案IP')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map(proposal => {
            const statusDef = PROPOSAL_STATUSES.find(s => s.id === proposal.status);
            const ipDef = KERYX_IPS.find(ip => ip.id === proposal.ip_character);
            return (
              <div key={proposal.id} className="bg-white rounded-2xl border border-[var(--border-light)] p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{ipDef?.emoji ?? '🎨'}</div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{proposal.business_name}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {ipDef?.name ?? proposal.ip_name} · {new Date(proposal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: `${statusDef?.color}15`, color: statusDef?.color, border: `1px solid ${statusDef?.color}30` }}
                  >
                    {statusDef?.icon} {t(statusDef?.ko ?? '', statusDef?.zh ?? '')}
                  </span>
                </div>
                {proposal.proposed_products && proposal.proposed_products.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {proposal.proposed_products.map((product, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-medium text-[var(--text-secondary)]">
                        {product}
                      </span>
                    ))}
                  </div>
                )}
                {proposal.seller_feedback && (
                  <p className="text-xs text-[var(--text-secondary)] mt-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                    💬 {proposal.seller_feedback}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 새 IP 제안 모달 */}
      {showNewModal && (
        <NewProposalModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { setShowNewModal(false); loadProposals(); }}
          lang={lang}
        />
      )}
    </div>
  );
}

// ── 새 IP 제안 모달 ──
function NewProposalModal({ onClose, onCreated, lang }: { onClose: () => void; onCreated: () => void; lang: string }) {
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient() as any;

  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedIp, setSelectedIp] = useState('puzzi');
  const [products, setProducts] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('sellers').select('id, business_name').eq('approval_status', 'approved').order('business_name').then(({ data }: any) => {
      setSellers(data ?? []);
    });
  }, [supabase]);

  const submit = async () => {
    if (!selectedSeller) return;
    setSubmitting(true);

    await supabase.from('ip_proposals').insert({
      seller_id: selectedSeller,
      ip_character: selectedIp,
      ip_name: KERYX_IPS.find(ip => ip.id === selectedIp)?.name ?? '커스텀',
      status: 'preparing',
      proposed_products: products.split(',').map(s => s.trim()).filter(Boolean),
      notes: notes.trim() || null,
    });

    setSubmitting(false);
    onCreated();
  };

  return (
    <div className="kx-modal-backdrop" onClick={onClose}>
      <div className="kx-modal max-w-md" onClick={e => e.stopPropagation()}>
        <div className="kx-modal-header">
          <div className="kx-modal-title">📌 {t('새 IP 제안', '新IP提案')}</div>
          <button onClick={onClose} className="text-xl text-[var(--text-tertiary)]">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* 파트너 선택 */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('파트너 선택 *', '选择合作伙伴 *')}</label>
            <select
              value={selectedSeller}
              onChange={e => setSelectedSeller(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border-default)] bg-[var(--bg-base)] text-sm outline-none focus:border-indigo-400"
            >
              <option value="">{t('파트너를 선택하세요', '请选择合作伙伴')}</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.business_name}</option>
              ))}
            </select>
          </div>

          {/* IP 선택 */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('제안 IP *', '提案IP *')}</label>
            <div className="grid grid-cols-2 gap-2">
              {KERYX_IPS.map(ip => (
                <button
                  key={ip.id}
                  onClick={() => setSelectedIp(ip.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedIp === ip.id ? 'ring-2 ring-offset-1 shadow-sm' : ''}`}
                  style={{ borderColor: `${ip.color}30`, backgroundColor: selectedIp === ip.id ? `${ip.color}10` : 'white' }}
                >
                  <span className="text-lg">{ip.emoji}</span>
                  <p className="text-xs font-bold mt-1" style={{ color: ip.color }}>{ip.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 제안 상품 */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('제안 상품 (쉼표 구분)', '提案商品（逗号分隔）')}</label>
            <input
              value={products}
              onChange={e => setProducts(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border-default)] bg-[var(--bg-base)] text-sm outline-none focus:border-indigo-400"
              placeholder={t('인형, 가방고리, 키링', '玩偶, 包挂件, 钥匙扣')}
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('메모', '备注')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border-default)] bg-[var(--bg-base)] text-sm outline-none focus:border-indigo-400 resize-none"
              placeholder={t('제안 배경, 파트너 니즈 등', '提案背景、合作伙伴需求等')}
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting || !selectedSeller}
            className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-violet-700 transition-colors"
          >
            {submitting ? t('생성 중...', '创建中...') : t('IP 제안 생성', '创建IP提案')}
          </button>
        </div>
      </div>
    </div>
  );
}
