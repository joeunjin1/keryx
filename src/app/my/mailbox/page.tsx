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
    title: '내 메일함',
    subtitle: '나에게 배정된 수신 이메일',
    inbox: '받은편지함',
    starred: '별표편지함',
    archived: '보관함',
    search: '발신자, 제목으로 검색...',
    noEmails: '이메일이 없습니다',
    noEmailsDesc: '배정된 이메일이 없습니다.',
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
    backToAdmin: '관리자 페이지로',
  },
  zh: {
    title: '我的邮件箱',
    subtitle: '分配给我的收件邮件',
    inbox: '收件箱',
    starred: '星标邮件',
    archived: '归档',
    search: '按发件人、主题搜索...',
    noEmails: '没有邮件',
    noEmailsDesc: '没有分配的邮件。',
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
    back: '返回列表',
    refresh: '刷新',
    prev: '上一页',
    next: '下一页',
    page: '页',
    of: '/',
    total: '共',
    items: '条',
    noSubject: '(无主题)',
    noSender: '(无发件人)',
    htmlView: 'HTML视图',
    textView: '文本视图',
    backToAdmin: '返回管理页面',
  },
};

export default function MyMailboxPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'zh'>('zh');
  const t = TEXTS[lang];

  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'inbox' | 'starred' | 'archived'>('inbox');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const LIMIT = 20;

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        filter,
        search,
      });
      const res = await fetch(`/api/my/mailbox?${params}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data: MailboxResponse = await res.json();
      setEmails(data.emails || []);
      setTotal(data.total || 0);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search, router]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const handleEmailClick = async (email: InboundEmail) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      await fetch(`/api/my/mailbox/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      });
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleAction = async (emailId: string, action: 'star' | 'unstar' | 'archive' | 'unarchive' | 'unread') => {
    await fetch(`/api/my/mailbox/${emailId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    fetchEmails();
    if (action === 'archive' || action === 'unarchive') {
      setSelectedEmail(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
            >
              ← {t.backToAdmin}
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-sm text-gray-500">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {t.unread} {unreadCount}
              </span>
            )}
            <button
              onClick={fetchEmails}
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1"
            >
              {t.refresh}
            </button>
            <button
              onClick={() => setLang(lang === 'ko' ? 'zh' : 'ko')}
              className="text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-3 py-1"
            >
              {lang === 'ko' ? '中文' : '한국어'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex h-[calc(100vh-80px)]">
        {/* 사이드바 */}
        <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0 p-4">
          <div className="space-y-1">
            {(['inbox', 'starred', 'archived'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); setSelectedEmail(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'inbox' && `📥 ${t.inbox}`}
                {f === 'starred' && `⭐ ${t.starred}`}
                {f === 'archived' && `📦 ${t.archived}`}
                {f === 'inbox' && unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 이메일 목록 */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
          {/* 검색 */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder={t.search}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                {t.loading}
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <div className="text-3xl mb-2">📭</div>
                <div className="text-sm">{t.noEmails}</div>
                <div className="text-xs mt-1">{t.noEmailsDesc}</div>
              </div>
            ) : (
              emails.map(email => (
                <div
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  } ${!email.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {email.from_name || email.from_email || t.noSender}
                      </div>
                      <div className={`text-sm truncate mt-0.5 ${!email.is_read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                        {email.subject || t.noSubject}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">
                        {email.text_body?.substring(0, 60) || ''}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">{formatDate(email.received_at)}</span>
                      {email.is_starred && <span className="text-yellow-400">⭐</span>}
                      {!email.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                {t.prev}
              </button>
              <span className="text-gray-500">
                {t.page} {page} {t.of} {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >
                {t.next}
              </button>
            </div>
          )}
        </div>

        {/* 이메일 본문 */}
        <div className="flex-1 bg-white overflow-y-auto">
          {selectedEmail ? (
            <div className="p-6">
              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  ← {t.back}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleAction(selectedEmail.id, selectedEmail.is_starred ? 'unstar' : 'star')}
                  className={`text-sm px-3 py-1.5 rounded border ${
                    selectedEmail.is_starred
                      ? 'border-yellow-400 text-yellow-600 bg-yellow-50'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {selectedEmail.is_starred ? `⭐ ${t.unstar}` : `☆ ${t.star}`}
                </button>
                <button
                  onClick={() => handleAction(selectedEmail.id, selectedEmail.is_archived ? 'unarchive' : 'archive')}
                  className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  {selectedEmail.is_archived ? `📤 ${t.unarchive}` : `📦 ${t.archive}`}
                </button>
                <button
                  onClick={() => handleAction(selectedEmail.id, 'unread')}
                  className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  {t.markUnread}
                </button>
              </div>

              {/* 메일 헤더 */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {selectedEmail.subject || t.noSubject}
                </h2>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700 w-12">{t.from}:</span>
                    <span>{selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` : selectedEmail.from_email}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700 w-12">{t.to}:</span>
                    <span>{selectedEmail.to_email}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-gray-700 w-12">{t.date}:</span>
                    <span>{new Date(selectedEmail.received_at).toLocaleString('ko-KR')}</span>
                  </div>
                </div>
              </div>

              {/* 본문 뷰 모드 토글 */}
              {selectedEmail.html_body && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setViewMode('html')}
                    className={`text-xs px-3 py-1 rounded ${viewMode === 'html' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {t.htmlView}
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className={`text-xs px-3 py-1 rounded ${viewMode === 'text' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {t.textView}
                  </button>
                </div>
              )}

              {/* 본문 */}
              <div className="bg-gray-50 rounded-lg p-4">
                {viewMode === 'html' && selectedEmail.html_body ? (
                  <div
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                  />
                ) : (
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                    {selectedEmail.text_body || '(내용 없음)'}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-6xl mb-4">📧</div>
              <div className="text-lg font-medium">{t.title}</div>
              <div className="text-sm mt-1">{t.noEmailsDesc}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
