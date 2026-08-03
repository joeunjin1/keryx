'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ServiceRequest {
  id: string;
  request_no: string;
  service_type: 'market-research' | 'factory-matching' | 'sample-development';
  status: string;
  product_name: string | null;
  contact_name: string;
  company_name: string | null;
  phone: string;
  created_at: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  author_name: string;
  author_role: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

const SERVICE_LABELS: Record<string, { ko: string; zh: string; icon: string; color: string }> = {
  'market-research':    { ko: '시장조사',  zh: '市场调研', icon: '🔍', color: '#4f46e5' },
  'factory-matching':   { ko: '공장매칭',  zh: '工厂匹配', icon: '🏭', color: '#0891b2' },
  'sample-development': { ko: '샘플개발',  zh: '样品开发', icon: '📦', color: '#059669' },
};

const STATUS_LABELS: Record<string, { ko: string; zh: string; color: string; bg: string; desc_ko: string; desc_zh: string }> = {
  pending:     { ko: '접수 대기', zh: '待接收', color: '#d97706', bg: '#fef3c7', desc_ko: '신청이 접수되었습니다. 담당 MD가 24시간 내 연락드립니다.', desc_zh: '申请已接收，专属MD将在24小时内联系您。' },
  in_progress: { ko: '처리 중',   zh: '处理中', color: '#4f46e5', bg: '#ede9fe', desc_ko: '담당 MD가 처리 중입니다.',                                   desc_zh: '专属MD正在处理中。' },
  replied:     { ko: 'MD 답변',   zh: 'MD回复', color: '#059669', bg: '#d1fae5', desc_ko: 'MD가 답변을 남겼습니다. 로그인하여 확인해 주세요.',            desc_zh: 'MD已回复，请登录查看。' },
  completed:   { ko: '완료',      zh: '已完成', color: '#6b7280', bg: '#f3f4f6', desc_ko: '서비스가 완료되었습니다.',                                    desc_zh: '服务已完成。' },
  cancelled:   { ko: '취소',      zh: '已取消', color: '#ef4444', bg: '#fee2e2', desc_ko: '신청이 취소되었습니다.',                                      desc_zh: '申请已取消。' },
};

const TIMELINE_STEPS = [
  { key: 'pending',     ko: '접수',    zh: '已接收' },
  { key: 'in_progress', ko: 'MD 처리', zh: 'MD处理' },
  { key: 'replied',     ko: 'MD 답변', zh: 'MD回复' },
  { key: 'completed',   ko: '완료',    zh: '已完成' },
];

function StatusPageInner() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const [requestNo, setRequestNo] = useState(searchParams.get('no') || '');
  const [inputNo, setInputNo] = useState(searchParams.get('no') || '');
  const [result, setResult] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const t = (ko: string, zh: string) => lang === 'ko' ? ko : zh;

  useEffect(() => {
    const no = searchParams.get('no');
    if (no) {
      setInputNo(no);
      setRequestNo(no);
    }
  }, [searchParams]);

  useEffect(() => {
    if (requestNo) {
      handleSearch(requestNo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNo]);

  const handleSearch = async (no?: string) => {
    const target = (no || inputNo).trim().toUpperCase();
    if (!target) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/apply/status?no=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult(null);
        setError(data.error || t('신청 내역을 찾을 수 없습니다.', '未找到申请记录。'));
      } else {
        setResult(data.data);
      }
    } catch {
      setError(t('조회 중 오류가 발생했습니다.', '查询时发生错误。'));
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: string) => TIMELINE_STEPS.findIndex(s => s.key === status);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      {/* 언어 전환 */}
      <div className="flex justify-end max-w-2xl mx-auto mb-4">
        <button
          onClick={() => setLang(l => l === 'ko' ? 'zh' : 'ko')}
          className="text-sm text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 transition-all bg-white"
        >
          {lang === 'ko' ? '中文' : '한국어'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            {t('서비스 신청 현황 조회', '服务申请状态查询')}
          </h1>
          <p className="text-gray-500 text-sm">
            {t('신청번호를 입력하면 로그인 없이 현황을 확인할 수 있습니다.', '输入申请编号即可无需登录查看申请状态。')}
          </p>
        </div>

        {/* 검색 박스 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            {t('신청번호', '申请编号')}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputNo}
              onChange={e => setInputNo(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={t('예: SR-20260506-ABCDEF', '例: SR-20260506-ABCDEF')}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-mono"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !inputNo.trim()}
              className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {loading ? t('조회 중...', '查询中...') : t('조회', '查询')}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {t('신청 완료 후 받은 신청번호(SR-로 시작)를 입력하세요.', '请输入申请完成后收到的申请编号（以SR-开头）。')}
          </p>
        </div>

        {/* 에러 */}
        {searched && error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-6">
            <div className="text-3xl mb-3">😕</div>
            <p className="text-red-700 font-bold mb-1">{t('신청 내역을 찾을 수 없습니다', '未找到申请记录')}</p>
            <p className="text-red-500 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-3">
              {t('신청번호를 다시 확인해 주세요. (SR-로 시작하는 번호)', '请重新确认申请编号（以SR-开头）。')}
            </p>
          </div>
        )}

        {/* 결과 */}
        {result && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* 상태 배너 */}
            {(() => {
              const st = STATUS_LABELS[result.status] || STATUS_LABELS['pending'];
              return (
                <div className="p-5" style={{ background: st.bg, borderBottom: `2px solid ${st.color}20` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: st.color, color: '#fff' }}>
                        {lang === 'ko' ? st.ko : st.zh}
                      </span>
                      <p className="text-sm mt-2 font-medium" style={{ color: st.color }}>
                        {lang === 'ko' ? st.desc_ko : st.desc_zh}
                      </p>
                    </div>
                    <div className="text-3xl">
                      {SERVICE_LABELS[result.service_type]?.icon || '📋'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 진행 타임라인 */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-1">
                {TIMELINE_STEPS.map((step, i) => {
                  const currentIdx = getStepIndex(result.status);
                  const isDone = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                          style={{
                            background: isDone ? '#4f46e5' : '#e5e7eb',
                            color: isDone ? '#fff' : '#9ca3af',
                            transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: isCurrent ? '0 0 0 3px rgba(79,70,229,0.2)' : 'none',
                          }}
                        >
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span className="text-xs mt-1 text-center" style={{ color: isDone ? '#4f46e5' : '#9ca3af', fontWeight: isCurrent ? 700 : 400 }}>
                          {lang === 'ko' ? step.ko : step.zh}
                        </span>
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className="h-0.5 flex-1 mb-4 mx-1 rounded" style={{ background: i < currentIdx ? '#4f46e5' : '#e5e7eb' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 신청 정보 */}
            <div className="p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">{t('신청 정보', '申请信息')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">{t('신청번호', '申请编号')}</span>
                  <p className="font-mono font-bold text-gray-800 text-xs mt-0.5">{result.request_no}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">{t('서비스 유형', '服务类型')}</span>
                  <p className="font-bold text-gray-800 text-xs mt-0.5">
                    {SERVICE_LABELS[result.service_type]?.icon} {lang === 'ko' ? SERVICE_LABELS[result.service_type]?.ko : SERVICE_LABELS[result.service_type]?.zh}
                  </p>
                </div>
                {result.product_name && (
                  <div className="col-span-2">
                    <span className="text-gray-400 text-xs">{t('상품명', '商品名称')}</span>
                    <p className="font-medium text-gray-800 text-xs mt-0.5">{result.product_name}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-xs">{t('신청자', '申请人')}</span>
                  <p className="font-medium text-gray-800 text-xs mt-0.5">{result.contact_name}</p>
                </div>
                {result.company_name && (
                  <div>
                    <span className="text-gray-400 text-xs">{t('회사명', '公司名称')}</span>
                    <p className="font-medium text-gray-800 text-xs mt-0.5">{result.company_name}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-xs">{t('신청일', '申请日期')}</span>
                  <p className="font-medium text-gray-800 text-xs mt-0.5">
                    {new Date(result.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'zh-CN')}
                  </p>
                </div>
              </div>
            </div>

            {/* MD 답변 (공개 답변만) */}
            {result.replies && result.replies.filter(r => !r.is_internal).length > 0 && (
              <div className="px-5 pb-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">{t('MD 답변', 'MD回复')}</h3>
                <div className="space-y-3">
                  {result.replies.filter(r => !r.is_internal).map(reply => (
                    <div key={reply.id} className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-blue-700">{reply.author_name}</span>
                        <span className="text-xs text-blue-400">
                          {new Date(reply.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'zh-CN')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{reply.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 로그인 유도 */}
            <div className="mx-5 mb-5 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
              <p className="text-sm font-bold text-purple-800 mb-1">
                {t('💡 더 자세한 내용은 로그인 후 확인하세요', '💡 登录后可查看更多详细信息')}
              </p>
              <p className="text-xs text-purple-600 mb-3">
                {t('회원 가입 시 MD와 실시간 소통, 신청 이력 관리가 가능합니다.', '注册会员后可与MD实时沟通，管理申请历史。')}
              </p>
              <div className="flex gap-2">
                <Link href="/login?role=seller" className="flex-1 text-center bg-purple-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-purple-700 transition-all">
                  {t('로그인', '登录')}
                </Link>
                <Link href="/signup?role=seller" className="flex-1 text-center bg-white text-purple-600 text-xs font-bold py-2 rounded-lg border border-purple-200 hover:border-purple-400 transition-all">
                  {t('회원가입', '注册')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 하단 링크 */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            {t('← KERYX 홈으로', '← 返回KERYX首页')}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ApplyStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    }>
      <StatusPageInner />
    </Suspense>
  );
}
