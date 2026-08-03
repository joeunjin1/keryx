'use client';
/**
 * CommunityChat — MD 커뮤니티 채팅 컴포넌트
 * 실제 messages 스키마 사용: body_original, body_ko, body_zh, attachments, sender
 * chat-app-builder 스킬 준수 - 1:1 채팅 구조
 * 개선: 파일/이미지 첨부 기능 추가, 직관적 UI 개선 (2026-05-19)
 */
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { resizeImage } from "@/lib/image-resize";

interface Conversation {
  id: string;
  seller_id?: string;
  md_id?: string;
  seller_name?: string;
  md_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

interface Attachment {
  url: string;
  type: string;
  caption?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: "md" | "seller" | "factory" | "system";
  sender_user_id?: string;
  body_original: string | null;
  source_lang?: string | null;
  body_ko: string | null;
  body_zh: string | null;
  attachments: Attachment[] | null;
  created_at: string;
  read_at?: string | null;
}

interface CommunityChatProps {
  userKind: "md" | "seller" | "admin";
  userId: string;
  displayName: string;
  accentColor?: string;
  lang?: "ko" | "zh";
}

const T = {
  ko: {
    noConversations: "대화가 없습니다",
    selectConversation: "왼쪽에서 대화를 선택하세요",
    typeMessage: "메시지를 입력하세요...",
    send: "전송",
    loading: "로딩 중...",
    noMessages: "아직 메시지가 없습니다. 첫 메시지를 보내보세요!",
    attach: "파일 첨부",
    uploading: "업로드 중...",
    fileError: "파일 업로드에 실패했습니다.",
    fileSizeError: "파일은 10MB 이하만 업로드 가능합니다.",
    convList: "대화 목록",
    dmRoom: "1:1 대화방",
    readLabel: "읽음",
    backToList: "목록으로",
  },
  zh: {
    noConversations: "暂无对话",
    selectConversation: "请从左侧选择对话",
    typeMessage: "请输入消息...",
    send: "发送",
    loading: "加载中...",
    noMessages: "暂无消息，发送第一条消息吧！",
    attach: "附件",
    uploading: "上传中...",
    fileError: "文件上传失败。",
    fileSizeError: "文件大小不能超过10MB。",
    convList: "对话列表",
    dmRoom: "1对1对话",
    backToList: "返回列表",
    readLabel: "已读",
  },
};

function formatMessageTime(dateStr: string, lang: "ko" | "zh"): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const timeStr = date.toLocaleTimeString(lang === "ko" ? "ko-KR" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return timeStr;
  if (isYesterday) return (lang === "ko" ? "어제 " : "昨天 ") + timeStr;
  return date.toLocaleDateString(lang === "ko" ? "ko-KR" : "zh-CN", {
    month: "short",
    day: "numeric",
  }) + " " + timeStr;
}

export default function CommunityChat({
  userKind,
  userId,
  displayName,
  accentColor = "#e11d48",
  lang = "ko",
}: CommunityChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  // 모바일: 탭 상태 - 'list' | 'chat'
  const [mobileTab, setMobileTab] = useState<'list' | 'chat'>('list');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const t = T[lang];

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const partnerName = selectedConv
    ? (userKind === "md" ? selectedConv.seller_name : selectedConv.md_name) ?? "Unknown"
    : null;

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const field = userKind === "md" ? "md_id" : "seller_id";
        const { data } = await supabase
          .from("conversations")
          .select("*")
          .eq(field, userId)
          .order("last_message_at", { ascending: false });
        setConversations(data || []);
      } catch (err) {
        console.error("대화 목록 로드 오류:", err);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userKind]);

  useEffect(() => {
    if (!selectedConvId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, conversation_id, sender, sender_user_id, body_original, body_ko, body_zh, attachments, created_at, read_at")
        .eq("conversation_id", selectedConvId)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    loadMessages();
    const channel = supabase
      .channel(`community:${selectedConvId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvId]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedConvId || sending) return;
    setSending(true);
    try {
      const senderRole = userKind === "admin" ? "md" : userKind;
      await supabase.from("messages").insert({
        conversation_id: selectedConvId,
        sender: senderRole,
        sender_user_id: userId,
        body_original: input.trim(),
        source_lang: lang,
        body_ko: lang === "ko" ? input.trim() : null,
        body_zh: lang === "zh" ? input.trim() : null,
        attachments: null,
      });
      setInput("");
    } catch (err) {
      console.error("메시지 전송 오류:", err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConvId) return;
    setFileError(null);
    if (file.size > 10 * 1024 * 1024) {
      setFileError(t.fileSizeError);
      return;
    }
    setUploading(true);
    try {
      // 이미지인 경우 자동 리사이징 (최대 1200px, WebP 변환)
      const isImage = file.type.startsWith("image/");
      const processedFile = isImage ? await resizeImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 }) : file;
      const ext = processedFile.name.split(".").pop();
      const path = `chat/${selectedConvId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(path, processedFile, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      const fileUrl = urlData.publicUrl;
      const attachment: Attachment = {
        url: fileUrl,
        type: isImage ? "image" : "file",
        caption: file.name,
      };
      const senderRole = userKind === "admin" ? "md" : userKind;
      await supabase.from("messages").insert({
        conversation_id: selectedConvId,
        sender: senderRole,
        sender_user_id: userId,
        body_original: file.name,
        source_lang: lang,
        body_ko: file.name,
        body_zh: file.name,
        attachments: [attachment],
      });
    } catch (err) {
      console.error("파일 업로드 오류:", err);
      setFileError(t.fileError);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getDisplayText = (msg: Message): string => {
    if (lang === "ko") return msg.body_ko ?? msg.body_original ?? "";
    return msg.body_zh ?? msg.body_original ?? "";
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] border border-[var(--border-light)] rounded-2xl overflow-hidden bg-[var(--bg-base)] shadow-sm">
      {/* 모바일 탭 네비게이션 - sm 미만에서만 표시 */}
      <div className="sm:hidden absolute top-0 left-0 right-0 z-10 flex border-b border-[var(--border-light)] bg-[var(--bg-base)]">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mobileTab === 'list'
              ? 'text-[var(--text-primary)] border-b-2'
              : 'text-[var(--text-tertiary)]'
          }`}
          style={mobileTab === 'list' ? { borderBottomColor: accentColor } : {}}
        >
          {t.convList}
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mobileTab === 'chat'
              ? 'text-[var(--text-primary)] border-b-2'
              : 'text-[var(--text-tertiary)]'
          }`}
          style={mobileTab === 'chat' ? { borderBottomColor: accentColor } : {}}
        >
          {t.dmRoom}
        </button>
      </div>
      <div className={`w-64 border-r border-[var(--border-light)] flex flex-col flex-shrink-0 bg-[var(--bg-subtle)] sm:flex ${
        mobileTab === 'list' ? 'flex' : 'hidden'
      } sm:relative absolute inset-0 z-[5] sm:z-auto sm:w-64 sm:inset-auto`}>
        <div className="px-4 py-3 border-b border-[var(--border-light)]">
          <span className="text-sm font-bold text-[var(--text-primary)]">{t.convList}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">{t.loading}</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-xs text-[var(--text-tertiary)]">{t.noConversations}</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const name = userKind === "md" ? conv.seller_name : conv.md_name;
              const isSelected = conv.id === selectedConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => { setSelectedConvId(conv.id); setMobileTab('chat'); }}
                  className={`w-full px-4 py-3 text-left border-b border-[var(--border-light)] transition-colors ${
                    isSelected ? "bg-white border-l-2" : "hover:bg-white/60"
                  }`}
                  style={isSelected ? { borderLeftColor: accentColor } : {}}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-semibold truncate ${
                      isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                    }`}>
                      {name || "Unknown"}
                    </span>
                    {(conv.unread_count ?? 0) > 0 && (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold flex-shrink-0 ml-1"
                        style={{ background: accentColor }}
                      >
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{conv.last_message}</p>
                  )}
                  {conv.last_message_at && (
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                      {formatMessageTime(conv.last_message_at, lang)}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className={`flex-1 flex flex-col min-w-0 sm:flex ${
        mobileTab === 'chat' ? 'flex' : 'hidden'
      }`}>
        {!selectedConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-sm font-medium">{t.selectConversation}</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-[var(--border-light)] flex items-center gap-3 bg-[var(--bg-base)]">
              {/* 모바일 뒤로가기 버튼 */}
              <button
                onClick={() => setMobileTab('list')}
                className="sm:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition flex-shrink-0"
                aria-label={t.backToList}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: accentColor }}
              >
                {partnerName?.charAt(0) ?? "?"}
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{partnerName}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{t.dmRoom}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-subtle)]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
                  <div className="text-4xl mb-3">✉️</div>
                  <p className="text-sm">{t.noMessages}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_user_id === userId;
                  const displayText = getDisplayText(msg);
                  const hasAttachments = msg.attachments && msg.attachments.length > 0;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1"
                          style={{ background: accentColor }}
                        >
                          {partnerName?.charAt(0) ?? "?"}
                        </div>
                      )}
                      <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "text-white rounded-tr-sm"
                              : "bg-white text-[var(--text-primary)] rounded-tl-sm border border-[var(--border-light)]"
                          }`}
                          style={isMe ? { background: accentColor } : {}}
                        >
                          {hasAttachments && msg.attachments!.map((att, i) => (
                            att.type === "image" ? (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                                <Image
                                  src={att.url}
                                  alt={att.caption ?? "image"}
                                  width={200}
                                  height={150}
                                  className="rounded-lg max-w-[200px] object-cover cursor-pointer hover:opacity-90 transition"
                                />
                              </a>
                            ) : (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-sm font-medium underline mb-1 ${
                                  isMe ? "text-white/90" : "text-blue-600"
                                }`}
                              >
                                <span>📎</span>
                                <span className="truncate max-w-[160px]">{att.caption ?? displayText}</span>
                              </a>
                            )
                          ))}
                          {!hasAttachments && displayText && (
                            <p className="whitespace-pre-wrap">{displayText}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-tertiary)] px-1">
                          {formatMessageTime(msg.created_at, lang)}
                          {isMe && msg.read_at && <span className="ml-1">{t.readLabel}</span>}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            {fileError && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 flex items-center justify-between">
                <span>⚠️ {fileError}</span>
                <button onClick={() => setFileError(null)} className="text-red-400 hover:text-red-600">✕</button>
              </div>
            )}
            <div className="p-3 border-t border-[var(--border-light)] bg-[var(--bg-base)] flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title={t.attach}
                className="p-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition flex-shrink-0 disabled:opacity-50"
              >
                {uploading ? (
                  <span className="text-xs px-1">{lang === "ko" ? "업로드" : "上传"}</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                )}
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={t.typeMessage}
                rows={1}
                className="flex-1 px-3.5 py-2.5 border border-[var(--border-light)] rounded-xl text-sm resize-none focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 max-h-28 bg-[var(--bg-subtle)] transition"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="px-4 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
                style={{ background: accentColor }}
              >
                {sending ? "..." : t.send}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
