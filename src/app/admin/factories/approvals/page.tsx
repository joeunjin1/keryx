'use client';
/**
 * 공장 가입 승인 관리 페이지
 * solution-architecture-foundation 스킬 준수: 인라인 스타일 금지
 */
import { useState, useEffect, useCallback } from 'react';
import { useLangContext } from '@/components/layout/LangContext';
import { createClient } from '@/lib/supabase/client';

type Factory = {
  id: string;
  factory_code: string | null;
  company_name: string;
  company_name_ko: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  approval_status: string;
  created_at: string;
  approved_at: string | null;
  internal_notes: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; labelZh: string; badgeCls: string }> = {
  pending:  { label: '승인 대기', labelZh: '待审核', badgeCls: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved: { label: '승인 완료', labelZh: '已批准', badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: '반려',      labelZh: '已拒绝', badgeCls: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export default function FactoryApprovalsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '공장 입점 승인 | KERYX';
  }, []);

  const supabase = createClient() as any;
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('user_profiles').select('kind, display_name').eq('id', user.id).single();
    })();
  }, []);

  const fetchFactories = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('factories')
        .select('id, factory_code, company_name, company_name_ko, contact_name, contact_email, contact_phone, city, approval_status, created_at, approved_at, internal_notes')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('approval_status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setFactories(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchFactories(); }, [fetchFactories]);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove(factoryId: string) {
    setActionLoading(factoryId);
    try {
      const res = await fetch('/api/admin/factories/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factory_id: factoryId, action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '승인 실패');
      showToast(data.message || '승인 완료', 'success');
      fetchFactories();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(factoryId: string) {
    setActionLoading(factoryId);
    try {
      const res = await fetch('/api/admin/factories/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factory_id: factoryId, action: 'reject', reject_reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '반려 실패');
      showToast(data.message || '반려 처리 완료', 'success');
      setRejectingId(null);
      setRejectReason('');
      fetchFactories();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const counts = {
    all: factories.length,
    pending: factories.filter(f => f.approval_status === 'pending').length,
    approved: factories.filter(f => f.approval_status === 'approved').length,
    rejected: factories.filter(f => f.approval_status === 'rejected').length,
  };

  return (
    <div>
      {/* 토스트 알림 */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-lg text-sm font-semibold text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="px-6 py-6 max-w-[1200px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-extrabold text-[#1a1a2e] mb-1">
              {t('공장 가입 승인 관리', '工厂入驻审核管理')}
            </h1>
            <p className="text-[13px] text-neutral-500">
              {t('공장 가입 신청을 검토하고 승인/반려 처리합니다.', '审核工厂入驻申请，进行批准或拒绝处理。')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchFactories}
              className="active:scale-95 transition-all px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-xs cursor-pointer hover:bg-neutral-50"
            >
              {t('새로고침', '刷新')}
            </button>
          </div>
        </div>

        {/* 상태 필터 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { key: 'all',      label: t('전체', '全部'),       color: 'indigo',  borderActive: 'border-indigo-500',  bgActive: 'bg-indigo-50' },
            { key: 'pending',  label: t('승인 대기', '待审核'), color: 'amber',   borderActive: 'border-amber-500',   bgActive: 'bg-amber-50' },
            { key: 'approved', label: t('승인 완료', '已批准'), color: 'emerald', borderActive: 'border-emerald-500', bgActive: 'bg-emerald-50' },
            { key: 'rejected', label: t('반려', '已拒绝'),      color: 'rose',    borderActive: 'border-rose-500',    bgActive: 'bg-rose-50' },
          ].map(item => {
            const isActive = statusFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${isActive ? `${item.borderActive} ${item.bgActive}` : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
              >
                <div className={`text-2xl font-extrabold text-${item.color}-500`}>
                  {counts[item.key as keyof typeof counts]}
                </div>
                <div className="text-xs text-neutral-500 mt-1">{item.label}</div>
              </button>
            );
          })}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="text-center py-16 text-neutral-400">{t('로딩 중...', '加载中...')}</div>
        ) : factories.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 bg-neutral-50 rounded-xl">
            <div className="text-5xl mb-3">🏭</div>
            <p className="text-base font-semibold">{t('해당 상태의 공장이 없습니다', '暂无该状态的工厂')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {factories.map(factory => {
              const statusCfg = STATUS_CONFIG[factory.approval_status];
              return (
                <div key={factory.id} className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* 공장 정보 */}
                    <div className="flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-xl">🏭</span>
                        <div>
                          <p className="text-base font-bold text-[#1a1a2e]">
                            {factory.company_name_ko || factory.company_name}
                          </p>
                          {factory.company_name_ko && (
                            <p className="text-xs text-neutral-500">{factory.company_name}</p>
                          )}
                        </div>
                        {statusCfg && (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.badgeCls}`}>
                            {lang === 'zh' ? statusCfg.labelZh : statusCfg.label}
                          </span>
                        )}
                        {factory.factory_code && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                            {factory.factory_code}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-neutral-500">
                        {factory.contact_name && (
                          <p>👤 {t('담당자', '联系人')}: <span className="text-[#1a1a2e] font-medium">{factory.contact_name}</span></p>
                        )}
                        {factory.contact_email && (
                          <p>📧 {t('이메일', '邮箱')}: <span className="text-[#1a1a2e] font-medium">{factory.contact_email}</span></p>
                        )}
                        {factory.contact_phone && (
                          <p>📱 {t('전화', '电话')}: <span className="text-[#1a1a2e] font-medium">{factory.contact_phone}</span></p>
                        )}
                        {factory.city && (
                          <p>📍 {t('도시', '城市')}: <span className="text-[#1a1a2e] font-medium">{factory.city}</span></p>
                        )}
                        <p>📅 {t('신청일', '申请日期')}: <span className="text-[#1a1a2e] font-medium">{new Date(factory.created_at).toLocaleDateString('ko-KR')}</span></p>
                        {factory.approved_at && (
                          <p>✅ {t('승인일', '批准日期')}: <span className="text-[#1a1a2e] font-medium">{new Date(factory.approved_at).toLocaleDateString('ko-KR')}</span></p>
                        )}
                      </div>

                      {factory.internal_notes && (
                        <div className="mt-2 px-3 py-2 bg-amber-50 rounded-md text-xs text-amber-800">
                          📝 {factory.internal_notes}
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    {factory.approval_status === 'pending' && (
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <button
                          onClick={() => handleApprove(factory.id)}
                          disabled={actionLoading === factory.id}
                          className={`px-5 py-2.5 rounded-lg border-none text-white text-sm font-bold cursor-pointer transition-colors ${actionLoading === factory.id ? 'bg-neutral-300 cursor-wait' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                        >
                          {actionLoading === factory.id ? '처리 중...' : t('✅ 승인', '✅ 批准')}
                        </button>
                        {rejectingId === factory.id ? (
                          <div className="flex flex-col gap-1">
                            <textarea
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder={t('반려 사유 (선택)', '拒绝原因（可选）')}
                              className="px-2.5 py-1.5 rounded-md border border-neutral-200 text-xs resize-none h-[60px]"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleReject(factory.id)}
                                disabled={actionLoading === factory.id}
                                className="flex-1 py-2 rounded-md border-none bg-rose-500 text-white text-xs font-bold cursor-pointer hover:bg-rose-600 transition-colors"
                              >
                                {t('반려 확인', '确认拒绝')}
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="flex-1 py-2 rounded-md border border-neutral-200 bg-white text-xs cursor-pointer hover:bg-neutral-50 transition-colors"
                              >
                                {t('취소', '取消')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRejectingId(factory.id)}
                            className="px-5 py-2.5 rounded-lg border border-rose-500 bg-white text-rose-500 text-sm font-semibold cursor-pointer hover:bg-rose-50 transition-colors"
                          >
                            {t('❌ 반려', '❌ 拒绝')}
                          </button>
                        )}
                      </div>
                    )}

                    {factory.approval_status === 'approved' && (
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <div className="px-4 py-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-[13px] font-semibold text-center">
                          {t('승인 완료', '已批准')}
                          {factory.factory_code && <p className="text-base font-extrabold mt-1">{factory.factory_code}</p>}
                        </div>
                      </div>
                    )}

                    {factory.approval_status === 'rejected' && (
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        <div className="px-4 py-2.5 rounded-lg bg-rose-100 text-rose-800 text-[13px] font-semibold text-center">
                          {t('반려됨', '已拒绝')}
                        </div>
                        <button
                          onClick={() => handleApprove(factory.id)}
                          disabled={actionLoading === factory.id}
                          className="px-4 py-2 rounded-lg border border-emerald-500 bg-white text-emerald-600 text-[13px] font-semibold cursor-pointer hover:bg-emerald-50 transition-colors"
                        >
                          {t('재승인', '重新批准')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
