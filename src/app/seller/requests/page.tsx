'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';
import Link from 'next/link';

// 의뢰 상태 정의 (전체 워크플로우)
const STATUS_MAP: Record<string, { ko: string; zh: string; color: string; step: number }> = {
  submitted:        { ko: '접수 완료',    zh: '已提交',    color: '#6b7280', step: 1 },
  reviewing:        { ko: '관리자 검토',  zh: '审核中',    color: '#4f46e5', step: 2 },
  assigned:         { ko: 'MD 배정 완료', zh: 'MD已分配',  color: '#8b5cf6', step: 3 },
  md_working:       { ko: 'MD 작업 중',   zh: 'MD工作中',  color: '#f59e0b', step: 4 },
  factory_replied:  { ko: '공장 답변 완료', zh: '工厂已回复', color: '#06b6d4', step: 5 },
  report_ready:     { ko: '보고서 작성 완료', zh: '报告已完成', color: '#10b981', step: 6 },
  report_sent:      { ko: '보고서 발송 완료', zh: '报告已发送', color: '#059669', step: 7 },
  completed:        { ko: '최종 완료',    zh: '已完成',    color: '#065f46', step: 8 },
  cancelled:        { ko: '취소',         zh: '已取消',    color: '#ef4444', step: 0 },
};

const STEPS = [
  { step: 1, ko: '접수', zh: '提交' },
  { step: 2, ko: '검토', zh: '审核' },
  { step: 3, ko: 'MD배정', zh: 'MD分配' },
  { step: 4, ko: 'MD작업', zh: 'MD工作' },
  { step: 5, ko: '공장답변', zh: '工厂回复' },
  { step: 6, ko: '보고서', zh: '报告' },
  { step: 7, ko: '발송', zh: '发送' },
];

export default function SellerRequestsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const supabase = createClient() as any;
  const [requests, setRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<Record<string, any[]>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'notifications'>('requests');

  useEffect(() => {
    loadData();
    // 실시간 알림 구독
    const channel = supabase
      .channel('seller-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => loadNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // unified_requests 조회
    const { data: reqs } = await supabase
      .from('unified_requests')
      .select(`
        id, request_no, status, company_name, product_category,
        submitted_at, created_at, updated_at, assigned_md_id,
        report_url, report_sent_at, md_note
      `)
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    setRequests(reqs ?? []);

    // 각 의뢰의 보고서 조회
    if (reqs && reqs.length > 0) {
      const ids = reqs.map((r: any) => r.id);
      const { data: rpts } = await supabase
        .from('request_reports')
        .select('id, request_id, title, summary, status, sent_at, pdf_url, report_type')
        .in('request_id', ids)
        .in('status', ['sent', 'viewed']);

      const rptMap: Record<string, any[]> = {};
      (rpts ?? []).forEach((r: any) => {
        if (!rptMap[r.request_id]) rptMap[r.request_id] = [];
        rptMap[r.request_id].push(r);
      });
      setReports(rptMap);
    }

    await loadNotifications(user.id);
    setLoading(false);
  }

  async function loadNotifications(uid?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = uid ?? user?.id;
    if (!userId) return;
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(notifs ?? []);
  }

  async function markNotifRead(id: string) {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markReportViewed(reportId: string) {
    await supabase.from('request_reports').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', reportId);
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500"><LangText ko="의뢰 현황을 불러오는 중..." zh="加载委托状态中..." /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900">
            <LangText ko="의뢰 현황 & 보고서" zh="委托状态 & 报告" />
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            <LangText ko={`총 ${requests.length}건`} zh={`共 ${requests.length} 件`} />
          </p>
        </div>
        <Link
          href="/seller/unified-request"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
        >
          <LangText ko="+ 새 의뢰" zh="+ 新委托" />
        </Link>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'requests' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          <LangText ko="의뢰 목록" zh="委托列表" />
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'notifications' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          <LangText ko="알림" zh="通知" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 의뢰 목록 탭 */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500 text-sm font-medium mb-4">
                <LangText ko="아직 의뢰 내역이 없습니다." zh="暂无委托记录。" />
              </p>
              <Link href="/seller/unified-request" className="inline-block px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors">
                <LangText ko="첫 의뢰 신청하기" zh="申请第一个委托" />
              </Link>
            </div>
          ) : (
            requests.map((req: any) => {
              const st = STATUS_MAP[req.status] ?? STATUS_MAP['submitted'];
              const reqReports = reports[req.id] ?? [];
              const hasReport = reqReports.length > 0;
              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedReq(selectedReq?.id === req.id ? null : req)}
                >
                  {/* 카드 헤더 */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 font-mono">{req.request_no ?? req.id.slice(0, 8).toUpperCase()}</span>
                          {hasReport && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">
                              <LangText ko="보고서 도착" zh="报告已到" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {req.company_name || <LangText ko="의뢰 접수" zh="委托申请" />}
                        </p>
                        {req.product_category && (
                          <p className="text-xs text-gray-500 mt-0.5">{req.product_category}</p>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white shrink-0" style={{ background: st.color }}>
                        <LangText ko={st.ko} zh={st.zh} />
                      </span>
                    </div>

                    {/* 진행 단계 바 */}
                    <div className="flex items-center gap-0.5 mt-3">
                      {STEPS.map((s, i) => (
                        <div key={s.step} className="flex items-center flex-1">
                          <div className={`flex-1 h-1.5 rounded-full transition-colors ${st.step >= s.step ? 'bg-orange-500' : 'bg-gray-200'}`} />
                          {i < STEPS.length - 1 && <div className="w-0.5" />}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400"><LangText ko={STEPS[0].ko} zh={STEPS[0].zh} /></span>
                      <span className="text-[10px] text-gray-400"><LangText ko={STEPS[STEPS.length - 1].ko} zh={STEPS[STEPS.length - 1].zh} /></span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(req.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {selectedReq?.id === req.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* 상세 패널 (펼쳐짐) */}
                  {selectedReq?.id === req.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      {/* MD 메모 */}
                      {req.md_note && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-xs font-bold text-blue-700 mb-1">
                            <LangText ko="담당 MD 메시지" zh="负责MD留言" />
                          </p>
                          <p className="text-sm text-blue-800">{req.md_note}</p>
                        </div>
                      )}

                      {/* 보고서 목록 */}
                      {hasReport ? (
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-2">
                            <LangText ko="받은 보고서" zh="收到的报告" />
                          </p>
                          <div className="space-y-2">
                            {reqReports.map((rpt: any) => (
                              <div key={rpt.id} className="p-3 bg-white rounded-xl border border-emerald-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 mr-2">
                                    <p className="text-sm font-bold text-gray-900">{rpt.title}</p>
                                    {rpt.summary && (
                                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{rpt.summary}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {rpt.sent_at ? new Date(rpt.sent_at).toLocaleDateString('ko-KR') : ''}
                                    </p>
                                  </div>
                                  {rpt.pdf_url && (
                                    <a
                                      href={rpt.pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => markReportViewed(rpt.id)}
                                      className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg font-bold hover:bg-emerald-600 transition-colors shrink-0"
                                    >
                                      <LangText ko="PDF 열기" zh="打开PDF" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-400">
                            <LangText
                              ko={`현재 "${st.ko}" 단계입니다. MD가 작업 완료 후 보고서를 발송해 드립니다.`}
                              zh={`当前状态为"${st.zh}"。MD完成工作后将发送报告。`}
                            />
                          </p>
                        </div>
                      )}

                      {/* MD 소통 링크 */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Link
                          href="/seller/messages"
                          className="flex items-center justify-center gap-2 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <LangText ko="담당 MD에게 문의" zh="联系负责MD" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 알림 탭 */}
      {activeTab === 'notifications' && (
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-4xl mb-3">🔔</div>
              <p className="text-gray-500 text-sm"><LangText ko="새 알림이 없습니다." zh="暂无新通知。" /></p>
            </div>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border cursor-pointer transition-colors ${n.is_read ? 'bg-white border-gray-200' : 'bg-orange-50 border-orange-200'}`}
                onClick={() => markNotifRead(n.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${n.is_read ? 'text-gray-700' : 'text-orange-800'}`}>
                      <LangText ko={n.title} zh={n.title_zh ?? n.title} />
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-600 mt-1">
                        <LangText ko={n.body} zh={n.body_zh ?? n.body} />
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1 shrink-0 ml-2" />
                  )}
                </div>
                {n.action_url && (
                  <Link
                    href={n.action_url}
                    className="mt-2 inline-block text-xs text-orange-600 font-bold hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <LangText ko="바로 가기 →" zh="直接前往 →" />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
