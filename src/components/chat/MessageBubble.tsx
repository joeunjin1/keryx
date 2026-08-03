'use client';

// [solution-architecture-foundation + chat-app-builder 스킬 준수]
// 인라인 스타일 완전 제거 → Tailwind 조건부 클래스 사용
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

// [chat-app-builder 스킬 준수] 견적 카드 타입
export interface QuoteCard {
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  cbm?: number;
  hs_code?: string;
  moq?: number;
  lead_time_days?: number;
  valid_until?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'seller' | 'md' | 'factory' | 'system';
  body_original: string | null;
  source_lang: string | null;
  body_ko: string | null;
  body_zh: string | null;
  attachments: Array<{ url: string; type: string; caption?: string }> | null;
  quote_card?: QuoteCard | null;
  created_at: string;
  read_at: string | null;
}

// ── 견적 카드 뷰 ─────────────────────────────────────────────────────────
function QuoteCardView({ card, isOwn }: { card: QuoteCard; isOwn: boolean }) {
  return (
    <div className={cn(
      'rounded-xl p-3 mb-1.5 min-w-[220px]',
      isOwn
        ? 'bg-white/15 border border-white/30'
        : 'bg-white border border-neutral-200'
    )}>
      {/* 헤더 */}
      <div className={cn(
        'text-[10px] font-bold tracking-widest uppercase mb-1.5',
        isOwn ? 'text-white/60' : 'text-neutral-400'
      )}>
        📋 견적서 / 报价单
      </div>

      {/* 상품명 */}
      <div className={cn(
        'text-sm font-bold mb-2',
        isOwn ? 'text-white' : 'text-neutral-900'
      )}>
        {card.product_name}
      </div>

      {/* 상세 그리드 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <QuoteRow label="수량/数量" value={card.quantity.toLocaleString()} isOwn={isOwn} />
        <QuoteRow label="단가/单价" value={`${card.unit_price.toLocaleString()} ${card.currency}`} isOwn={isOwn} />
        {card.cbm && <QuoteRow label="CBM" value={`${card.cbm} m³`} isOwn={isOwn} />}
        {card.hs_code && <QuoteRow label="HS Code" value={card.hs_code} isOwn={isOwn} />}
        {card.moq && <QuoteRow label="MOQ" value={card.moq.toLocaleString()} isOwn={isOwn} />}
        {card.lead_time_days && <QuoteRow label="납기/交期" value={`${card.lead_time_days}일`} isOwn={isOwn} />}
      </div>

      {/* 유효기간 */}
      {card.valid_until && (
        <div className={cn(
          'text-[10px] mt-2',
          isOwn ? 'text-white/50' : 'text-neutral-400'
        )}>
          유효기간: {card.valid_until}
        </div>
      )}
    </div>
  );
}

function QuoteRow({ label, value, isOwn }: { label: string; value: string; isOwn: boolean }) {
  return (
    <div>
      <div className={cn('text-[9px]', isOwn ? 'text-white/50' : 'text-neutral-400')}>{label}</div>
      <div className={cn('text-xs font-semibold', isOwn ? 'text-white' : 'text-neutral-700')}>{value}</div>
    </div>
  );
}

// ── 메시지 버블 ──────────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: ChatMessage;
  viewerRole: 'seller' | 'md' | 'factory';
  sellerName: string;
  mdName: string;
  factoryName?: string;
}

export function MessageBubble({ message, viewerRole, sellerName, mdName, factoryName }: MessageBubbleProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (message.sender === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[10px] text-neutral-400 px-2 py-1 bg-neutral-50 rounded-full">
          {message.body_ko ?? message.body_original}
        </span>
      </div>
    );
  }

  const isOwnMessage = message.sender === viewerRole;
  const viewerLang = viewerRole === 'seller' ? 'ko' : 'zh';
  const displayedText =
    showOriginal
      ? message.body_original
      : viewerLang === 'ko'
      ? message.body_ko ?? message.body_original
      : message.body_zh ?? message.body_original;

  const wasTranslated = message.source_lang !== null && message.source_lang !== viewerLang;

  const senderName =
    message.sender === 'seller' ? sellerName :
    message.sender === 'factory' ? (factoryName ?? '공장') :
    mdName;

  const variant =
    message.sender === 'md' ? 'brand' :
    message.sender === 'factory' ? 'vip' :
    'neutral';

  return (
    <div className={cn('flex gap-2 mb-3', isOwnMessage ? 'flex-row-reverse' : '')}>
      {!isOwnMessage && <Avatar name={senderName} size="sm" variant={variant} />}
      <div className={cn('flex-1 max-w-[70%]', isOwnMessage ? 'items-end' : 'items-start')}>
        {!isOwnMessage && (
          <div className="text-[10px] text-neutral-500 mb-0.5">{senderName}</div>
        )}
        <div className={cn(
          'rounded-xl px-3 py-2',
          isOwnMessage ? 'bg-brand-600 text-white ml-auto' : 'bg-neutral-100 text-neutral-900'
        )}>
          {message.quote_card && <QuoteCardView card={message.quote_card} isOwn={isOwnMessage} />}
          {message.attachments && message.attachments.length > 0 && (
            <div className="grid grid-cols-2 gap-1 mb-2">
              {message.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.url}
                    alt={att.caption ?? ''}
                    className="rounded-md object-cover w-full h-32"
                  />
                </a>
              ))}
            </div>
          )}
          {displayedText && (
            <div className="text-sm whitespace-pre-wrap break-words">{displayedText}</div>
          )}
        </div>
        <div className={cn(
          'flex items-center gap-2 mt-1 text-[9px] text-neutral-400',
          isOwnMessage ? 'justify-end' : 'justify-start'
        )}>
          {wasTranslated && (
            <button
              onClick={() => setShowOriginal((s) => !s)}
              className="px-1 py-0.5 rounded bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors duration-150 active:scale-95"
            >
              {showOriginal ? '번역 보기' : '원문 보기'}
            </button>
          )}
          <time>{formatTime(message.created_at)}</time>
          {isOwnMessage && message.read_at && <span>읽음</span>}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
