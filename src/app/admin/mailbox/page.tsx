'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── 타입 정의 ───────────────────────────────────────────────
interface InboundEmail {
  id: string;
  message_id: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  text_body: string | null;
  html_body?: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  labels: string[];
  received_at: string;
}

interface MailboxResponse {
  emails: InboundEmail[];
  total: number;
  page: number;
  limit: number;
  unread_count: number;
}

// ─── 다국어 텍스트 ───────────────────────────────────────────
const TEXTS = {
  ko: {
    title: '메일함',
    subtitle: 'keryx.kr 수신 이메일 관리',
    inbox: '받은편지함',
    starred: '별표편지함',
    archived: '보관함',
    all: '전체',
    search: '발신자, 제목으로 검색...',
    noEmails: '이메일이 없습니다',
    noEmailsDesc: '수신된 이메일이 없습니다.',
    unread: '읽지 않음',
    from: '발신자',
    to: '수신자',
    subject: '제목',
    date: '수신일',
    loading: '불러오는 중...',
    markRead: '읽음 처리',
    markUnread: '읽지 않음',
    star: '별표',
    unstar: '별표 해제',
    archive: '보관',
    unarchive: '보관 해제',
    delete: '삭제',
    deleteConfirm: '이 이메일을 삭제하시겠습니까?',
    back: '목록으로',
    refresh: '새로고침',
    prev: '이전',
    next: '다음',
    page: '페이지',
    of: '/',
    total: '총',
    items: '건',
    noSubject: '(제목 없음)',
    noSender: '(발신자 없음)',
    htmlView: 'HTML 보기',
    textView: '텍스트 보기',
    setupGuide: '메일 수신 설정 안내',
    setupDesc: 'keryx.kr 도메인으로 이메일을 수신하려면 DNS MX 레코드 설정이 필요합니다.',
  },
  zh: {
    title: '邮件箱',
    subtitle: 'keryx.kr 收件邮件管理',
    inbox: '收件箱',
    starred: '星标邮件',
    archived: '归档',
    all: '全部',
    search: '按发件人、主题搜索...',
    noEmails: '没有邮件',
    noEmailsDesc: '暂无收到的邮件。',
    unread: '未读',
    from: '发件人',
    to: '收件人',
    subject: '主题',
    date: '收件日期',
    loading: '加载中...',
    markRead: '标为已读',
    markUnread: '标为未读',
    star: '星标',
    unstar: '取消星标',
    archive: '归档',
    unarchive: '取消归档',
    delete: '删除',
    deleteConfirm: '确定要删除此邮件吗？',
    back: '返回列表',
    refresh: '刷新',
    prev: '上一页',
    next: '下一页',
    page: '页',
    of: '/',
    total: '共',
    items: '封',
    noSubject: '(无主题)',
    noSender: '(无发件人)',
    htmlView: 'HTML视图',
    textView: '文本视图',
    setupGuide: '邮件接收设置指南',
    setupDesc: '要接收发送至 keryx.kr 域名的邮件，需要配置 DNS MX 记录。',
  },
};

// ─── 날짜 포맷 ───────────────────────────────────────────────
function formatDate(dateStr: string, lang: 'ko' | 'zh'): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (diff < dayMs) {
    return date.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (diff < 7 * dayMs) {
    const days = lang === 'ko'
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['日', '一', '二', '三', '四', '五', '六'];
    return days[date.getDay()] + (lang === 'ko' ? '요일' : '');
  } else {
    return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
export default function AdminMailboxPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const t = TEXTS[lang];

  const [filter, setFilter] = useState<'inbox' | 'starred' | 'archived' | 'all'>('inbox');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [detailLoading, setDetailLoading] = useState(false);

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  // ─── 이메일 목록 조회 ───────────────────────────────────────
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/admin/mailbox?${params}`);
      if (!res.ok) throw new Error('조회 실패');
      const data: MailboxResponse = await res.json();
      setEmails(data.emails);
      setTotal(data.total);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('메일함 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // 필터/검색 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  // ─── 이메일 상세 조회 ───────────────────────────────────────
  const openEmail = async (email: InboundEmail) => {
    setDetailLoading(true);
    setSelectedEmail(email);
    try {
      const res = await fetch(`/api/admin/mailbox/${email.id}`);
      if (!res.ok) throw new Error('상세 조회 실패');
      const data = await res.json();
      setSelectedEmail(data.email);
      // 목록에서도 읽음 처리
      setEmails(prev =>
        prev.map(e => e.id === email.id ? { ...e, is_read: true } : e)
      );
      if (!email.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('이메일 상세 조회 오류:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── 상태 변경 (별표/아카이브/읽음) ─────────────────────────
  const updateEmail = async (id: string, updates: Partial<InboundEmail>) => {
    try {
      const res = await fetch(`/api/admin/mailbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('업데이트 실패');
      const data = await res.json();
      setEmails(prev => prev.map(e => e.id === id ? { ...e, ...data.email } : e));
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, ...data.email } : null);
      }
    } catch (err) {
      console.error('이메일 업데이트 오류:', err);
    }
  };

  // ─── 이메일 삭제 ─────────────────────────────────────────────
  const deleteEmail = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/admin/mailbox/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setEmails(prev => prev.filter(e => e.id !== id));
      setTotal(prev => prev - 1);
      if (selectedEmail?.id === id) setSelectedEmail(null);
    } catch (err) {
      console.error('이메일 삭제 오류:', err);
    }
  };

  // ─── 렌더링 ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 언어 전환 */}
            <button
              onClick={() => setLang(lang === 'ko' ? 'zh' : 'ko')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {lang === 'ko' ? '中文' : '한국어'}
            </button>
            {/* 새로고침 */}
            <button
              onClick={fetchEmails}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t.refresh}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바: 필터 메뉴 */}
        <div className="w-52 bg-white border-r border-gray-200 flex-shrink-0 p-4">
          <nav className="space-y-1">
            {(['inbox', 'starred', 'archived', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {f === 'inbox' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  )}
                  {f === 'starred' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                  {f === 'archived' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  )}
                  {f === 'all' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  )}
                  <span>{t[f]}</span>
                </div>
                {f === 'inbox' && unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* DNS 설정 안내 */}
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">{t.setupGuide}</p>
            <p className="text-xs text-amber-700 leading-relaxed">{t.setupDesc}</p>
            <div className="mt-2 text-xs text-amber-600 font-mono bg-amber-100 rounded p-1.5">
              MX: inbound-smtp.resend.com
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 이메일 목록 */}
          <div className={`flex flex-col ${selectedEmail ? 'w-80 flex-shrink-0' : 'flex-1'} border-r border-gray-200 bg-white overflow-hidden`}>
            {/* 검색 */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t.search}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 이메일 목록 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{t.loading}</span>
                  </div>
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 px-4">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">{t.noEmails}</p>
                  <p className="text-xs text-gray-400 mt-1 text-center">{t.noEmailsDesc}</p>
                </div>
              ) : (
                emails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => openEmail(email)}
                    className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedEmail?.id === email.id
                        ? 'bg-indigo-50 border-l-2 border-l-indigo-600'
                        : 'hover:bg-gray-50'
                    } ${!email.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {!email.is_read && (
                            <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0" />
                          )}
                          <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {email.from_name || email.from_email || t.noSender}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${!email.is_read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                          {email.subject || t.noSubject}
                        </p>
                        {email.text_body && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {email.text_body.substring(0, 60)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {formatDate(email.received_at, lang)}
                        </span>
                        {email.is_starred && (
                          <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500">
                  {t.total} {total}{t.items}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-600">
                    {page} {t.of} {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 이메일 상세 보기 */}
          {selectedEmail && (
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* 상세 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t.back}
                  </button>
                  <div className="flex items-center gap-2">
                    {/* 읽음/읽지않음 */}
                    <button
                      onClick={() => updateEmail(selectedEmail.id, { is_read: !selectedEmail.is_read })}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title={selectedEmail.is_read ? t.markUnread : t.markRead}
                    >
                      <svg className="w-4 h-4" fill={selectedEmail.is_read ? 'none' : 'currentColor'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {/* 별표 */}
                    <button
                      onClick={() => updateEmail(selectedEmail.id, { is_starred: !selectedEmail.is_starred })}
                      className={`p-2 rounded-lg hover:bg-gray-100 ${selectedEmail.is_starred ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}
                      title={selectedEmail.is_starred ? t.unstar : t.star}
                    >
                      <svg className="w-4 h-4" fill={selectedEmail.is_starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    {/* 보관 */}
                    <button
                      onClick={() => updateEmail(selectedEmail.id, { is_archived: !selectedEmail.is_archived })}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title={selectedEmail.is_archived ? t.unarchive : t.archive}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                    {/* 삭제 */}
                    <button
                      onClick={() => deleteEmail(selectedEmail.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                      title={t.delete}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 제목 */}
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {selectedEmail.subject || t.noSubject}
                </h2>

                {/* 발신자/수신자 정보 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-14 flex-shrink-0">{t.from}:</span>
                    <span className="text-gray-700 font-medium">
                      {selectedEmail.from_name
                        ? `${selectedEmail.from_name} <${selectedEmail.from_email}>`
                        : selectedEmail.from_email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-14 flex-shrink-0">{t.to}:</span>
                    <span className="text-gray-600">{selectedEmail.to_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-14 flex-shrink-0">{t.date}:</span>
                    <span className="text-gray-600">
                      {new Date(selectedEmail.received_at).toLocaleString(
                        lang === 'ko' ? 'ko-KR' : 'zh-CN',
                        { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </div>
                </div>

                {/* HTML/텍스트 전환 */}
                {selectedEmail.html_body && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setViewMode('html')}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        viewMode === 'html'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t.htmlView}
                    </button>
                    <button
                      onClick={() => setViewMode('text')}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        viewMode === 'text'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t.textView}
                    </button>
                  </div>
                )}
              </div>

              {/* 이메일 본문 */}
              <div className="flex-1 overflow-y-auto p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-32 text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">{t.loading}</span>
                    </div>
                  </div>
                ) : viewMode === 'html' && selectedEmail.html_body ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                    {selectedEmail.text_body || '(본문 없음)'}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
