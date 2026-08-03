'use client';
/**
 * MD 포털 통합 소통 관리 페이지
 * - 모든 바이어의 conversations 통합 관리
 * - messages 테이블 실제 컬럼: sender(enum), sender_user_id, body_original, body_ko, body_zh
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

const TOPIC_TYPES = [
  { id: 'general', ko: '일반 문의', zh: '一般咨询', icon: '💬' },
  { id: 'market_research', ko: '시장조사', zh: '市场调研', icon: '🔬' },
  { id: 'factory_matching', ko: '공장매칭', zh: '工厂匹配', icon: '🏭' },
  { id: 'sample_development', ko: '샘플개발', zh: '样品开发', icon: '🧪' },
  { id: 'order_inquiry', ko: '주문 문의', zh: '订单咨询', icon: '📦' },
  { id: 'inspection', ko: '검수 문의', zh: '检验咨询', icon: '🔍' },
];

const STATUS_OPTIONS = [
  { value: 'open', ko: '진행 중', zh: '进行中', cls: 'bg-green-100 text-green-700' },
  { value: 'closed', ko: '완료', zh: '已完成', cls: 'bg-gray-100 text-gray-500' },
  { value: 'archived', ko: '보관됨', zh: '已归档', cls: 'bg-gray-100 text-gray-400' },
];

interface Conversation {
  id: string;
  seller_id: string;
  md_id: string | null;
  topic_type: string;
  title: string;
  status: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_md: number;
  unread_count_seller: number;
  metadata: Record<string, unknown>;
  md_note: string | null;
  created_at: string;
  updated_at: string | null;
  buyer_info?: { company_name: string; contact_name: string } | null;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
  is_image: boolean;
}
interface Message {
  id: string;
  conversation_id: string;
  sender: 'seller' | 'md' | 'system' | 'factory';
  sender_user_id: string;
  body_original: string;
  body_ko: string | null;
  body_zh: string | null;
  message_type: string;
  metadata: Record<string, unknown>;
  attachments: Attachment[] | null;
  created_at: string;
}

interface BuyerProfile {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  country: string;
  current_grade: string;
  assigned_md_id: string | null;
}

export default function MdCommunicationsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as ReturnType<typeof createClient>;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mdNote, setMdNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [authed, setAuthed] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeChannelRef = useRef<any>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: unknown } }) => {
      if (!data.user) router.push('/login');
      else setAuthed(true);
    });
  }, [router, supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTopic !== 'all') params.set('topic_type', filterTopic);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch('/api/md-communication?' + params.toString());
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations as Conversation[]);
    } finally {
      setLoading(false);
    }
  }, [filterTopic, filterStatus]);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);
  // Realtime 구독 설정
  const setupRealtime = (conversationId: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    const channel = supabase
      .channel('md-comms-' + conversationId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.' + conversationId,
      }, (payload: any) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some((m: Message) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        loadData();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: 'id=eq.' + conversationId,
      }, (payload: any) => {
        setSelectedConv(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe((status: string) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });
    realtimeChannelRef.current = channel;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [supabase]);

  const openConversation = async (conv: Conversation) => {
    setLoading(true);
    try {
      const res = await fetch('/api/md-communication?id=' + conv.id);
      const data = await res.json();
      setSelectedConv(data.conversation as Conversation);
      setMessages((data.messages || []) as Message[]);
      setBuyerProfile(data.buyerProfile as BuyerProfile | null);
      setMdNote((data.conversation as Conversation)?.md_note || '');
      setView('chat');
      setupRealtime(conv.id);
    } finally {
      setLoading(false);
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  const addPendingFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024);
    setPendingFiles(prev => [...prev, ...arr].slice(0, 5));
  };
  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };
  const sendMessage = async () => {
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    if (!selectedConv) return;
    setSending(true);
    setUploading(pendingFiles.length > 0);
    try {
      const uploadedAttachments: any[] = [];
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/md-communication/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) uploadedAttachments.push(uploadData.attachment);
      }
      const body: any = {
        action: 'send_message',
        conversation_id: selectedConv.id,
        content: newMessage.trim() || (uploadedAttachments.length > 0 ? `[파일 ${uploadedAttachments.length}개 첨부]` : ''),
      };
      if (uploadedAttachments.length > 0) {
        body.attachments = uploadedAttachments;
        body.message_type = 'file';
      }
      const res = await fetch('/api/md-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        setPendingFiles([]);
        const res2 = await fetch('/api/md-communication?id=' + selectedConv.id);
        const data2 = await res2.json();
        setMessages((data2.messages || []) as Message[]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedConv) return;
    await fetch('/api/md-communication', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selectedConv.id, status }),
    });
    setSelectedConv(prev => prev ? { ...prev, status } : null);
    await loadData();
  };

  const saveMdNote = async () => {
    if (!selectedConv) return;
    setSavingNote(true);
    try {
      await fetch('/api/md-communication', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selectedConv.id, md_note: mdNote }),
      });
    } finally {
      setSavingNote(false);
    }
  };

  const getTopicInfo = (id: string) => TOPIC_TYPES.find(tp => tp.id === id);
  const getStatusInfo = (s: string) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return t('방금 전', '刚刚');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('분 전', '分钟前')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('시간 전', '小时前')}`;
    return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR');
  };

  const getDisplayBody = (msg: Message) => {
    if (lang === 'zh') return msg.body_zh || msg.body_ko || msg.body_original;
    return msg.body_ko || msg.body_original;
  };

  const filtered = conversations.filter(conv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.title?.toLowerCase().includes(q) ||
      conv.buyer_info?.company_name?.toLowerCase().includes(q) ||
      conv.buyer_info?.contact_name?.toLowerCase().includes(q) ||
      (conv.last_message || '').toLowerCase().includes(q)
    );
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count_md || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view === 'chat' && (
              <button
                onClick={() => { setView('list'); setSelectedConv(null); setMessages([]); loadData(); }}
                className="text-gray-500 hover:text-gray-700 p-1 text-lg"
              >
                ←
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  {view === 'list' ? t('소통 관리', '沟通管理') : (selectedConv?.title || t('대화', '对话'))}
                </h1>
                {view === 'list' && totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{totalUnread}</span>
                )}
              </div>
              {view === 'list' && (
                <p className="text-sm text-gray-500 mt-0.5">{t('바이어와의 모든 소통을 통합 관리합니다', '统一管理与买家的所有沟通')}</p>
              )}
            </div>
          </div>
          {view === 'list' && (
            <div className="text-sm text-gray-500">{t('총', '共')} {filtered.length}{t('건', '条')}</div>
          )}
        </div>
      </div>

      {/* 대화 목록 */}
      {view === 'list' && (
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex gap-2 mb-4 flex-wrap">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('바이어명, 제목으로 검색...', '按买家名、标题搜索...')}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white flex-1 min-w-40"
            />
            <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="all">{t('전체 유형', '全部类型')}</option>
              {TOPIC_TYPES.map(tp => (
                <option key={tp.id} value={tp.id}>{tp.icon} {lang === 'zh' ? tp.zh : tp.ko}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="all">{t('전체 상태', '全部状态')}</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{lang === 'zh' ? s.zh : s.ko}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">{t('로딩 중...', '加载中...')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-500">{t('소통 내역이 없습니다', '暂无沟通记录')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(conv => {
                const topicInfo = getTopicInfo(conv.topic_type);
                const statusInfo = getStatusInfo(conv.status);
                const buyerName = conv.buyer_info?.company_name || conv.buyer_info?.contact_name || (conv.metadata?.buyer_company as string) || t('바이어', '买家');
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">{topicInfo?.icon || '💬'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm truncate">{conv.title}</span>
                            {(conv.unread_count_md || 0) > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 flex-shrink-0">{conv.unread_count_md}</span>
                            )}
                          </div>
                          <div className="text-xs text-indigo-600 font-medium mt-0.5">🏢 {buyerName}</div>
                          {conv.last_message && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{conv.last_message}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
                              {lang === 'zh' ? statusInfo.zh : statusInfo.ko}
                            </span>
                            {topicInfo && (
                              <span className="text-xs text-gray-400">{lang === 'zh' ? topicInfo.zh : topicInfo.ko}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(conv.last_message_at || conv.created_at)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 대화 화면 */}
      {view === 'chat' && selectedConv && (
        <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4" style={{ height: 'calc(100vh - 120px)' }}>
          {/* 메인 채팅 영역 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 바이어 정보 헤더 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{getTopicInfo(selectedConv.topic_type)?.icon}</span>
                    <span className="font-semibold text-gray-900">{selectedConv.title}</span>
                  </div>
                  {buyerProfile && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                      <div>🏢 <span className="font-medium">{buyerProfile.company_name}</span></div>
                      <div>👤 {buyerProfile.contact_name}</div>
                      <div>📞 {buyerProfile.contact_phone}</div>
                      <div>📧 {buyerProfile.contact_email}</div>
                      <div>🌍 {buyerProfile.country}</div>
                      <div>⭐ {t('등급', '等级')}: {buyerProfile.current_grade}</div>
                    </div>
                  )}
                  {selectedConv.metadata && Object.keys(selectedConv.metadata).filter(k => !['buyer_company', 'buyer_name', 'buyer_grade'].includes(k) && selectedConv.metadata[k]).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-indigo-600 cursor-pointer hover:underline">
                        📋 {t('의뢰 상세 정보', '委托详情')}
                      </summary>
                      <div className="mt-2 bg-indigo-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                        {Object.entries(selectedConv.metadata)
                          .filter(([k, v]) => !['buyer_company', 'buyer_name', 'buyer_grade'].includes(k) && v)
                          .map(([k, v]) => (
                            <div key={k}><span className="font-medium text-indigo-700">{k}:</span> {String(v)}</div>
                          ))}
                      </div>
                    </details>
                  )}
                </div>
                <select
                  value={selectedConv.status}
                  onChange={e => updateStatus(e.target.value)}
                  className={`text-xs px-2 py-1 rounded-lg border cursor-pointer ${getStatusInfo(selectedConv.status).cls}`}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{lang === 'zh' ? s.zh : s.ko}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3 bg-white rounded-xl border border-gray-200 p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">{t('메시지가 없습니다', '暂无消息')}</div>
              ) : (
                messages.map(msg => {
                  const isMd = msg.sender === 'md';
                  const displayBody = getDisplayBody(msg);
                  return (
                    <div key={msg.id} className={`flex ${isMd ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${isMd ? 'items-end' : 'items-start'}`}>
                        {!isMd && (
                          <div className="text-xs text-gray-500 px-1">
                            {msg.sender === 'seller' ? (buyerProfile?.contact_name || t('바이어', '买家')) : t('시스템', '系统')}
                          </div>
                        )}
                        {msg.message_type === 'file' && msg.attachments?.length ? (
                          <div className={`rounded-xl px-3 py-2 text-sm ${isMd ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                            {displayBody && displayBody !== `[파일 ${msg.attachments.length}개 첨부]` && <p className="mb-2">{displayBody}</p>}
                            <div className="space-y-2">
                              {msg.attachments.map((att: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 rounded-lg p-2 ${isMd ? 'bg-indigo-500' : 'bg-gray-50'}`}>
                                  {att.is_image ? (
                                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                                      <img src={att.url} alt={att.name} className="max-w-48 max-h-48 rounded-lg object-cover hover:opacity-90" />
                                    </a>
                                  ) : (
                                    <a href={att.url} target="_blank" rel="noopener noreferrer"
                                      className={`flex items-center gap-2 text-xs hover:underline ${isMd ? 'text-white' : 'text-indigo-600'}`}>
                                      <span className="text-lg">{att.type?.includes('pdf') ? '📄' : att.type?.includes('sheet') ? '📊' : '📎'}</span>
                                      <div><div className="font-medium">{att.name}</div><div className="opacity-60">{formatFileSize(att.size)}</div></div>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : msg.message_type === 'form_submission' ? (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-gray-700 max-w-sm">
                            <div className="font-semibold text-indigo-700 mb-2">📋 {t('의뢰 내용', '委托内容')}</div>
                            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{displayBody}</pre>
                          </div>
                        ) : (
                          <div className={`rounded-xl px-4 py-2.5 text-sm ${
                            isMd
                              ? 'bg-indigo-600 text-white'
                              : msg.sender === 'system'
                              ? 'bg-gray-100 text-gray-600 text-xs'
                              : 'bg-white border border-gray-200 text-gray-800'
                          }`}>
                            {displayBody}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 px-1">{formatDate(msg.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 메시지 입력 */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex-shrink-0">
              <div className="flex items-center gap-1 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-400' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-400">{realtimeConnected ? t('실시간 연결됨', '实时连接') : t('연결 중...', '连接中...')}</span>
              </div>
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700">
                      <span>{file.type.startsWith('image/') ? '🖼️' : file.type.includes('pdf') ? '📄' : '📎'}</span>
                      <span className="max-w-24 truncate">{file.name}</span>
                      <span className="text-gray-400">({formatFileSize(file.size)})</span>
                      <button onClick={() => removePendingFile(i)} className="text-gray-400 hover:text-red-500 ml-1 font-bold">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.docx,.doc" className="hidden"
                  onChange={e => addPendingFiles(e.target.files)} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex-none w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                  title={t('파일 첨부', '附件')}>
                  📎
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={t('바이어에게 메시지 전송...', '发送消息给买家...')}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || (!newMessage.trim() && pendingFiles.length === 0)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? '⬆️' : sending ? '...' : t('전송', '发送')}
                </button>
              </div>
            </div>
          </div>

          {/* 사이드 패널 */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 {t('MD 메모', 'MD备注')}</h3>
              <textarea
                value={mdNote}
                onChange={e => setMdNote(e.target.value)}
                rows={8}
                placeholder={t('내부 메모 (바이어에게 보이지 않음)', '内部备注（买家不可见）')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={saveMdNote}
                disabled={savingNote}
                className="w-full mt-2 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {savingNote ? t('저장 중...', '保存中...') : t('메모 저장', '保存备注')}
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡ {t('빠른 답변', '快速回复')}</h3>
              <div className="space-y-2">
                {[
                  { ko: '확인했습니다. 검토 후 연락드리겠습니다.', zh: '已收到，审核后联系您。' },
                  { ko: '추가 정보를 보내주시면 진행하겠습니다.', zh: '请提供更多信息，我们将继续处理。' },
                  { ko: '처리가 완료되었습니다.', zh: '处理已完成。' },
                ].map((tmpl, i) => (
                  <button
                    key={i}
                    onClick={() => setNewMessage(lang === 'zh' ? tmpl.zh : tmpl.ko)}
                    className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg px-3 py-2 transition-colors"
                  >
                    {lang === 'zh' ? tmpl.zh : tmpl.ko}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
