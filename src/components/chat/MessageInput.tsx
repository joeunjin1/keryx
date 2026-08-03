'use client';

import { useRef, useState, useCallback } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterMessage, reportSensitiveMessage } from '@/lib/chat-filter';

interface MessageInputProps {
  onSend: (text: string, attachments: File[]) => Promise<void>;
  /** Quick reply buttons that drop common phrases */
  quickReplies?: string[];
  placeholder?: string;
  disabled?: boolean;
  conversationId?: string;
}

export function MessageInput({
  onSend,
  quickReplies = [],
  placeholder = '메시지 입력 …',
  disabled,
  conversationId = 'unknown',
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  // [mobile-first-design 스킬] IME 한글/중국어 조합 중 Enter 전송 방지
  const [isComposing, setIsComposing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    if (sending || (!text.trim() && attachments.length === 0)) return;

    // [chat-app-builder 스킬 준수] 3-Tier 콘텐츠 필터링
    if (text.trim()) {
      const result = filterMessage(text.trim());
      if (!result.ok) {
        // Tier 1/2: 즉시 차단
        setFilterError(result.message);
        setTimeout(() => setFilterError(null), 4000);
        return;
      }
      if (result.flagged && result.reason === 'sensitive') {
        // Tier 3: silent flagging - 관리자 알림만, 메시지는 허용
        reportSensitiveMessage({
          conversationId,
          messageText: text.trim(),
          senderId: 'current_user',
          patterns: result.patterns,
        });
      }
    }

    setSending(true);
    try {
      await onSend(text.trim(), attachments);
      setText('');
      setAttachments([]);
      setFilterError(null);
    } finally {
      setSending(false);
    }
  }

  function handleQuickReply(t: string) {
    setText((cur) => (cur ? cur + ' ' + t : t));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments((cur) => [...cur, ...files].slice(0, 5)); // max 5
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeAttachment(idx: number) {
    setAttachments((cur) => cur.filter((_, i) => i !== idx));
  }

  // [mobile-first-design 스킬] 키보드 올라왔을 때 입력란 가림 방지
  const handleFocus = useCallback(() => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
  }, []);

  return (
    // [mobile-first-design 스킬] 채팅 입력창 safe-area 대응
    <div className="kx-chat-input-area border-t border-stone-200 bg-white">
      {/* 필터링 오류 메시지 */}
      {filterError && (
        <div className="px-3 pt-2">
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: '#dc2626',
          }}>
            ⚠️ {filterError}
          </div>
        </div>
      )}

      {quickReplies.length > 0 && (
        <div className="px-3 pt-2 flex gap-1.5 flex-wrap">
          {quickReplies.map((r) => (
            <button
              key={r}
              onClick={() => handleQuickReply(r)}
              // [mobile-first-design 스킬] 터치 타깃 최소 44px
              className="px-3 py-2 min-h-[44px] text-[11px] bg-stone-100 hover:bg-stone-200 rounded-full text-stone-700 transition active:scale-95"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="px-3 pt-2 flex gap-2 flex-wrap">
          {attachments.map((file, idx) => (
            <div key={idx} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="w-14 h-14 rounded-md object-cover border border-stone-200"
              />
              {/* [mobile-first-design 스킬] 삭제 버튼 터치 타깃 44px */}
              <button
                onClick={() => removeAttachment(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                aria-label="첨부 파일 제거"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
        {/* [mobile-first-design 스킬] 아이콘 버튼 터치 타깃 44px */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="kx-icon-btn text-stone-500 hover:text-stone-700 disabled:opacity-40"
          aria-label="사진 첨부"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* [mobile-first-design 스킬]
            - text-base(16px): iOS 자동 줌 방지
            - onCompositionStart/End: 한글/중국어 IME 조합 중 Enter 전송 방지
            - onFocus: 키보드 올라왔을 때 스크롤
        */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none border border-stone-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 max-h-24"
          style={{ minHeight: '44px' }}
        />

        {/* [mobile-first-design 스킬] 전송 버튼 터치 타깃 44px */}
        <button
          onClick={handleSend}
          disabled={disabled || sending || (!text.trim() && attachments.length === 0)}
          className={cn(
            'min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-medium transition',
            'bg-brand-600 text-white hover:bg-brand-800',
            'disabled:bg-stone-200 disabled:text-stone-400',
            'active:scale-95', // [web-performance-resilience 스킬 준수] 마이크로인터랙션
          )}
          aria-label="메시지 전송"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{sending ? '…' : '보내기'}</span>
        </button>
      </div>
    </div>
  );
}
