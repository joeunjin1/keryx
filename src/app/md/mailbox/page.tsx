'use client';

import { useState, useEffect, useCallback } from 'react';

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
    subtitle: 'MD 전용 수신 이메일',
    inbox: '받은편지함',
    starred: '별표편지함',
    archived: '보관함',
    search: '발신자, 제목으로 검색...',
    noEmails: '이메일이 없습니다',
    noEmailsDesc: '수신된 이메일이 없습니다.',
    unread: '읽지 않음',
    from: '발신자',
    subject: '제목',
    date: '수신일',
    loading: '불러오는 중...',
    markRead: '읽음 처리',
    star: '별표',
    unstar: '별표 해제',
    archive: '보관',
    unarchive: '보관 해제',
    back: '목록으로',
    refresh: '새로고침',
    prev: '이전',
    next: '다음',
    total: '총',
    items: '건',
    noSubject: '(제목 없음)',
    noSender: '(발신자 없음)',
    noMailAssigned: '배정된 메일 주소가 없습니다',
    noMailAssignedDesc: '관리자에게 @keryx.kr 메일 주소 배정을 요청하세요.',
  },
  zh: {
    title: '邮件箱',
    subtitle: 'MD专用收件邮件',
    inbox: '收件箱',
    starred: '星标邮件',
    archived: '归档',
    search: '按发件人、主题搜索...',
    noEmails: '没有邮件',
    noEmailsDesc: '暂无收到的邮件。',
    unread: '未读',
    from: '发件人',
    subject: '主题',
    date: '收件日期',
    loading: '加载中...',
    markRead: '标为已读',
    star: '星标',
    unstar: '取消星标',
    archive: '归档',
    unarchive: '取消归档',
    back: '返回列表',
    refresh: '刷新',
    prev: '上一页',
    next: '下一页',
    total: '共',
    items: '封',
    noSubject: '(无主题)',
    noSender: '(无发件人)',
    noMailAssigned: '未分配邮件地址',
    noMailAssignedDesc: '请联系管理员分配 @keryx.kr 邮件地址。',
  },
};

function formatDate(dateStr: string, lang: 'ko' | 'zh'): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff < dayMs) {
    return date.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 7 * dayMs) {
    const days = lang === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['日', '一', '二', '三', '四', '五', '六'];
    return days[date.getDay()] + (lang === 'ko' ? '요일' : '');
  } else {
    return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'zh-CN', { month: 'short', day: 'numeric' });
  }
}

export default function MdMailboxPage() {
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');
  const t = TEXTS[lang];

  const [filter, setFilter] = useState<'inbox' | 'starred' | 'archived'>('inbox');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [noMailAssigned, setNoMailAssigned] = useState(false);

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/my/mailbox?${params}`);
      if (res.status === 404) {
        setNoMailAssigned(true);
        return;
      }
      if (!res.ok) throw new Error('조회 실패');
      const data: MailboxResponse = await res.json();
      setEmails(data.emails);
      setTotal(data.total);
      setUnreadCount(data.unread_count);
      setNoMailAssigned(false);
    } catch (err) {
      console.error('메일함 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const openEmail = async (email: InboundEmail) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      await fetch(`/api/my/mailbox/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const updateEmail = async (id: string, updates: Partial<InboundEmail>) => {
    try {
      const res = await fetch(`/api/my/mailbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('업데이트 실패');
      const data = await res.json();
      setEmails(prev => prev.map(e => e.id === id ? { ...e, ...data.email } : e));
      if (selectedEmail?.id === id) setSelectedEmail(prev => prev ? { ...prev, ...data.email } : null);
    } catch (err) {
      console.error('이메일 업데이트 오류:', err);
    }
  };

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
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                {t.unread} {unreadCount}
              </span>
            )}
            <button
              onClick={() => setLang(lang === 'ko' ? 'zh' : 'ko')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {lang === 'ko' ? '中文' : '한국어'}
            </button>
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

      {/* 메일 주소 미배정 안내 */}
      {noMailAssigned && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t.noMailAssigned}</h3>
            <p className="text-sm text-gray-500">{t.noMailAssignedDesc}</p>
          </div>
        </div>
      )}

      {!noMailAssigned && (
        <div className="flex flex-1 overflow-hidden">
          {/* 사이드바: 필터 */}
          <div className="w-48 bg-white border-r border-gray-200 flex-shrink-0 p-4">
            <nav className="space-y-1">
              {(['inbox', 'starred', 'archived'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === f ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{t[f]}</span>
                  {f === 'inbox' && unreadCount > 0 && (
                    <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 메일 목록 */}
          <div className={`flex flex-col ${selectedEmail ? 'w-80 flex-shrink-0' : 'flex-1'} bg-white border-r border-gray-200`}>
            {/* 검색 */}
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.search}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <p className="text-sm">{t.noEmails}</p>
                  <p className="text-xs mt-1">{t.noEmailsDesc}</p>
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => openEmail(email)}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-indigo-50' : ''
                    } ${!email.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!email.is_read && (
                            <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0" />
                          )}
                          <p className={`text-sm truncate ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {email.from_name || email.from_email || t.noSender}
                          </p>
                        </div>
                        <p className={`text-sm truncate mt-0.5 ${!email.is_read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                          {email.subject || t.noSubject}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {email.text_body?.slice(0, 60)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">{formatDate(email.received_at, lang)}</span>
                        {email.is_starred && (
                          <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
                <span>{t.total} {total}{t.items}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    {t.prev}
                  </button>
                  <span>{page}/{totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    {t.next}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 메일 상세 */}
          {selectedEmail && (
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* 상세 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t.back}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateEmail(selectedEmail.id, { is_starred: !selectedEmail.is_starred })}
                    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${selectedEmail.is_starred ? 'text-yellow-500' : 'text-gray-400'}`}
                    title={selectedEmail.is_starred ? t.unstar : t.star}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => updateEmail(selectedEmail.id, { is_archived: !selectedEmail.is_archived })}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                    title={selectedEmail.is_archived ? t.unarchive : t.archive}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 메일 내용 */}
              <div className="flex-1 overflow-y-auto p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {selectedEmail.subject || t.noSubject}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <span className="font-medium text-gray-700">{t.from}: </span>
                    {selectedEmail.from_name
                      ? `${selectedEmail.from_name} <${selectedEmail.from_email}>`
                      : selectedEmail.from_email}
                  </div>
                  <div className="text-gray-400">
                    {new Date(selectedEmail.received_at).toLocaleString(lang === 'ko' ? 'ko-KR' : 'zh-CN')}
                  </div>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedEmail.text_body || '(내용 없음)'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
