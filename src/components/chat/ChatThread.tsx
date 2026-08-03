"use client";
/**
 * ChatThread — 채팅 스레드 컴포넌트
 * keryx-platform-dev 스킬 §1.2 준수 - 한국어/중국어 이중 언어 지원
 * chat-app-builder 스킬 준수 - 실시간 채팅 UI
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
// MessageBubble의 ChatMessage 타입을 재사용 (타입 일관성 유지)
import type { ChatMessage } from "@/components/chat/MessageBubble";

interface ChatThreadProps {
  conversationId: string;
  viewerRole: "seller" | "md" | "factory" | "admin";
  sellerName?: string;
  mdName?: string;
  factoryName?: string;
  initialMessages?: ChatMessage[];
  quickReplies?: string[];
  lang?: "ko" | "zh";
}

export function ChatThread({
  conversationId,
  viewerRole,
  sellerName,
  mdName,
  factoryName,
  initialMessages = [],
  quickReplies = [],
  lang = "ko",
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    // 실시간 구독
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender: viewerRole,
        body_original: content.trim(),
        source_lang: lang,
        body_ko: lang === "ko" ? content.trim() : null,
        body_zh: lang === "zh" ? content.trim() : null,
        attachments: null,
      });
      setInput("");
    } catch (err) {
      console.error("메시지 전송 오류:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-neutral-400 py-8">
            {lang === "ko" ? "메시지가 없습니다" : "暂无消息"}
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender === viewerRole;
          const displayContent = lang === "zh" && msg.body_zh
            ? msg.body_zh
            : msg.body_ko ?? msg.body_original ?? "";
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-neutral-100 text-neutral-800 rounded-tl-sm"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{displayContent}</p>
                <div className={`text-[10px] mt-1 ${isMe ? "text-indigo-200" : "text-neutral-400"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 빠른 답장 */}
      {quickReplies.length > 0 && (
        <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto border-t border-neutral-100">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => sendMessage(reply)}
              className="flex-shrink-0 px-2.5 py-1 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 text-neutral-600 rounded-full text-xs font-medium transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div className="p-3 border-t border-neutral-100 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "ko" ? "메시지 입력..." : "输入消息..."}
          rows={1}
          className="flex-1 px-3 py-2 border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-400 max-h-24 overflow-y-auto"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {sending ? "..." : lang === "ko" ? "전송" : "发送"}
        </button>
      </div>
    </div>
  );
}

export default ChatThread;
