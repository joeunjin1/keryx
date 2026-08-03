'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

// ─── 파이프라인 단계 정의 ───────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'new_inquiry', ko: '신규 문의', zh: '新咨询', color: '#6366f1', bgColor: 'bg-indigo-50 border-indigo-200' },
  { id: 'ip_proposal_prep', ko: 'IP 제안 준비', zh: 'IP提案准备', color: '#8b5cf6', bgColor: 'bg-violet-50 border-violet-200' },
  { id: 'ip_proposal_sent', ko: 'IP 제안 발송', zh: 'IP提案已发', color: '#a855f7', bgColor: 'bg-purple-50 border-purple-200' },
  { id: 'plan_discussion', ko: '사업플랜 협의', zh: '事业规划协商', color: '#f59e0b', bgColor: 'bg-amber-50 border-amber-200' },
  { id: 'sample_dev', ko: '샘플 개발', zh: '样品开发', color: '#3b82f6', bgColor: 'bg-blue-50 border-blue-200' },
  { id: 'production', ko: '생산 진행', zh: '生产进行', color: '#10b981', bgColor: 'bg-emerald-50 border-emerald-200' },
  { id: 'inspection_delivery', ko: '검수·납품', zh: '检验·交货', color: '#06b6d4', bgColor: 'bg-cyan-50 border-cyan-200' },
  { id: 'long_term', ko: '장기 파트너', zh: '长期合作伙伴', color: '#22c55e', bgColor: 'bg-green-50 border-green-200' },
];

interface PipelineCard {
  id: string;
  seller_id: string;
  business_name: string;
  contact_name?: string;
  current_stage: string;
  assigned_md_name?: string;
  stage_entered_at: string;
  expected_order_amount_cny?: number;
  next_action?: string;
  next_action_due?: string;
  notes?: string;
  ip_name?: string;
}

export default function PartnerPipelinePage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient() as any;

  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null);

  // 파이프라인 데이터 로드 (sellers 테이블 기반 + pipeline_stage 필드 활용)
  const loadPipeline = useCallback(async () => {
    setLoading(true);
    // partner_pipeline 테이블이 있으면 사용, 없으면 sellers 테이블에서 시뮬레이션
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('partner_pipeline')
      .select('*, seller:sellers(business_name, contact_name)')
      .order('stage_entered_at', { ascending: false });

    if (!pipelineError && pipelineData && pipelineData.length > 0) {
      setCards(pipelineData.map((p: any) => ({
        id: p.id,
        seller_id: p.seller_id,
        business_name: p.seller?.business_name ?? '미지정',
        contact_name: p.seller?.contact_name,
        current_stage: p.current_stage,
        assigned_md_name: p.assigned_md_name,
        stage_entered_at: p.stage_entered_at,
        expected_order_amount_cny: p.expected_order_amount_cny,
        next_action: p.next_action,
        next_action_due: p.next_action_due,
        notes: p.notes,
        ip_name: p.ip_name,
      })));
    } else {
      // 폴백: sellers 테이블에서 승인된 바이어를 기본 파이프라인으로 표시
      const { data: sellers } = await supabase
        .from('sellers')
        .select('id, business_name, contact_name, approval_status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (sellers) {
        setCards(sellers.map((s: any) => ({
          id: s.id,
          seller_id: s.id,
          business_name: s.business_name ?? '미지정',
          contact_name: s.contact_name,
          current_stage: s.approval_status === 'approved' ? 'plan_discussion' : 'new_inquiry',
          stage_entered_at: s.created_at,
        })));
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);

  // 단계별 카드 그룹핑
  const getCardsByStage = (stageId: string) => cards.filter(c => c.current_stage === stageId);

  // 단계 이동
  const moveCard = async (cardId: string, newStage: string) => {
    // partner_pipeline 테이블 업데이트 시도
    await supabase
      .from('partner_pipeline')
      .update({ current_stage: newStage, stage_entered_at: new Date().toISOString() })
      .eq('id', cardId);

    // 로컬 상태 업데이트
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, current_stage: newStage, stage_entered_at: new Date().toISOString() } : c));
    setSelectedCard(null);
  };

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="kx-animate-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)]">
            {t('파트너 파이프라인', '合作伙伴管道')}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {t('파트너의 전체 라이프사이클을 한눈에 관리합니다', '一目了然地管理合作伙伴的全生命周期')}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
        >
          + {t('파트너 추가', '添加合作伙伴')}
        </button>
      </div>

      {/* 파이프라인 요약 카드 */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
        {PIPELINE_STAGES.map(stage => {
          const count = getCardsByStage(stage.id).length;
          return (
            <div key={stage.id} className={`p-3 rounded-xl border text-center ${stage.bgColor}`}>
              <div className="text-lg font-black" style={{ color: stage.color }}>{count}</div>
              <div className="text-[10px] font-medium text-[var(--text-tertiary)] mt-0.5 leading-tight">
                {t(stage.ko, stage.zh)}
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">
          {t('로딩 중...', '加载中...')}
        </div>
      ) : (
        /* 칸반 보드 */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-[1400px]">
            {PIPELINE_STAGES.map(stage => {
              const stageCards = getCardsByStage(stage.id);
              return (
                <div key={stage.id} className="flex-1 min-w-[170px]">
                  {/* 컬럼 헤더 */}
                  <div className={`rounded-t-xl px-3 py-2.5 border-b-2`} style={{ borderBottomColor: stage.color, backgroundColor: `${stage.color}08` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: stage.color }}>
                        {t(stage.ko, stage.zh)}
                      </span>
                      <span className="text-[10px] font-bold bg-white rounded-full px-2 py-0.5 border" style={{ color: stage.color }}>
                        {stageCards.length}
                      </span>
                    </div>
                  </div>

                  {/* 카드 목록 */}
                  <div className="space-y-2 mt-2 min-h-[200px]">
                    {stageCards.map(card => (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="bg-white rounded-xl border border-[var(--border-light)] p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {card.business_name}
                        </p>
                        {card.contact_name && (
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{card.contact_name}</p>
                        )}
                        {card.ip_name && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-700">
                            IP: {card.ip_name}
                          </span>
                        )}
                        {card.expected_order_amount_cny && (
                          <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                            ¥{card.expected_order_amount_cny.toLocaleString()}
                          </p>
                        )}
                        {card.assigned_md_name && (
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                            MD: {card.assigned_md_name}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[9px] text-[var(--text-tertiary)]">
                            {daysSince(card.stage_entered_at)}{t('일 경과', '天')}
                          </span>
                          {card.next_action_due && (
                            <span className={`text-[9px] font-bold ${new Date(card.next_action_due) < new Date() ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {card.next_action_due.slice(5)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageCards.length === 0 && (
                      <div className="text-center py-8 text-[10px] text-[var(--text-tertiary)] opacity-50">
                        {t('비어있음', '空')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 카드 상세 모달 */}
      {selectedCard && (
        <div className="kx-modal-backdrop" onClick={() => setSelectedCard(null)}>
          <div className="kx-modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="kx-modal-header">
              <div>
                <div className="kx-modal-title">{selectedCard.business_name}</div>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {t('현재 단계:', '当前阶段:')} {PIPELINE_STAGES.find(s => s.id === selectedCard.current_stage)?.[lang === 'zh' ? 'zh' : 'ko']}
                </p>
              </div>
              <button onClick={() => setSelectedCard(null)} className="text-xl text-[var(--text-tertiary)]">×</button>
            </div>
            <div className="p-5 space-y-4">
              {selectedCard.contact_name && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-tertiary)]">{t('담당자', '联系人')}</label>
                  <p className="text-sm font-semibold">{selectedCard.contact_name}</p>
                </div>
              )}
              {selectedCard.assigned_md_name && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-tertiary)]">{t('담당 MD', '负责MD')}</label>
                  <p className="text-sm font-semibold">{selectedCard.assigned_md_name}</p>
                </div>
              )}
              {selectedCard.ip_name && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-tertiary)]">{t('제안 IP', '提案IP')}</label>
                  <p className="text-sm font-semibold">{selectedCard.ip_name}</p>
                </div>
              )}
              {selectedCard.expected_order_amount_cny && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-tertiary)]">{t('예상 주문액', '预计订单额')}</label>
                  <p className="text-sm font-bold text-indigo-600">¥{selectedCard.expected_order_amount_cny.toLocaleString()}</p>
                </div>
              )}
              {selectedCard.next_action && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-tertiary)]">{t('다음 액션', '下一步')}</label>
                  <p className="text-sm">{selectedCard.next_action}</p>
                </div>
              )}
              {selectedCard.notes && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-tertiary)]">{t('메모', '备注')}</label>
                  <p className="text-sm text-[var(--text-secondary)]">{selectedCard.notes}</p>
                </div>
              )}

              {/* 단계 이동 버튼 */}
              <div>
                <label className="text-[11px] font-bold text-[var(--text-tertiary)] mb-2 block">{t('단계 이동', '阶段移动')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {PIPELINE_STAGES.filter(s => s.id !== selectedCard.current_stage).map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => moveCard(selectedCard.id, stage.id)}
                      className="text-[11px] px-3 py-2 rounded-lg border font-medium hover:shadow-sm transition-shadow text-left"
                      style={{ borderColor: `${stage.color}40`, color: stage.color }}
                    >
                      → {t(stage.ko, stage.zh)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 파트너 추가 모달 (간단 버전) */}
      {showAddModal && (
        <AddPartnerModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); loadPipeline(); }}
          lang={lang}
        />
      )}
    </div>
  );
}

// ── 파트너 추가 모달 ──
function AddPartnerModal({ onClose, onAdded, lang }: { onClose: () => void; onAdded: () => void; lang: string }) {
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient() as any;
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!businessName.trim()) return;
    setSubmitting(true);

    // partner_pipeline에 직접 추가
    await supabase.from('partner_pipeline').insert({
      seller_id: null, // 아직 sellers 테이블에 없는 잠재 파트너
      business_name_override: businessName.trim(),
      contact_name_override: contactName.trim(),
      current_stage: 'new_inquiry',
      stage_entered_at: new Date().toISOString(),
      notes: notes.trim() || null,
    });

    setSubmitting(false);
    onAdded();
  };

  return (
    <div className="kx-modal-backdrop" onClick={onClose}>
      <div className="kx-modal max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="kx-modal-header">
          <div className="kx-modal-title">{t('파트너 추가', '添加合作伙伴')}</div>
          <button onClick={onClose} className="text-xl text-[var(--text-tertiary)]">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('회사명 *', '公司名 *')}</label>
            <input
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border-default)] bg-[var(--bg-base)] text-sm outline-none focus:border-indigo-400"
              placeholder={t('파트너 회사명', '合作伙伴公司名')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('담당자명', '联系人')}</label>
            <input
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border-default)] bg-[var(--bg-base)] text-sm outline-none focus:border-indigo-400"
              placeholder={t('담당자 이름', '联系人姓名')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('메모', '备注')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border-default)] bg-[var(--bg-base)] text-sm outline-none focus:border-indigo-400 resize-none"
              placeholder={t('문의 내용, 관심 IP 등', '咨询内容、感兴趣的IP等')}
            />
          </div>
          <button
            onClick={submit}
            disabled={submitting || !businessName.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {submitting ? t('추가 중...', '添加中...') : t('파이프라인에 추가', '添加到管道')}
          </button>
        </div>
      </div>
    </div>
  );
}
