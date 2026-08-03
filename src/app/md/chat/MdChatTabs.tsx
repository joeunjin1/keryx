'use client';

import { useState } from 'react';
import Link from 'next/link';

const brandColor = '#6366f1';
const factoryColor = '#e11d48';

interface ConvoItem {
  id: string;
  seller_id: string | null;
  factory_id: string | null;
  md_id: string | null;
  last_message_at: string;
  unread_count_md: number;
  last_message: string;
  last_message_time: string;
  seller?: { id: string; business_name: string; current_grade: string } | null;
  factory?: { id: string; company_name: string; company_name_ko: string } | null;
}

interface Props {
  sellerConvos: ConvoItem[];
  factoryConvos: ConvoItem[];
  sellerUnread: number;
  factoryUnread: number;
  myMdId: string | null;
}

export default function MdChatTabs({ sellerConvos, factoryConvos, sellerUnread, factoryUnread, myMdId }: Props) {
  const [tab, setTab] = useState<'seller' | 'factory'>('seller');
  const currentConvos = tab === 'seller' ? sellerConvos : factoryConvos;
  const accentColor = tab === 'seller' ? brandColor : factoryColor;

  return (
    <>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('seller')}
          className="flex-1 px-4 py-2.5 rounded-[10px] text-sm cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `2px solid ${tab === 'seller' ? brandColor : 'var(--border-light)'}`, background: tab === 'seller' ? `${brandColor}10` : 'var(--bg-base)', color: tab === 'seller' ? brandColor : 'var(--text-secondary)', fontWeight: tab === 'seller' ? 700 : 400 }}
        >
          🏪 바이어 채팅
          {sellerUnread > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold py-[1px] px-[6px]" style={{ borderRadius: 99 }}>
              {sellerUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('factory')}
          className="flex-1 px-4 py-2.5 rounded-[10px] text-sm cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `2px solid ${tab === 'factory' ? factoryColor : 'var(--border-light)'}`, background: tab === 'factory' ? `${factoryColor}10` : 'var(--bg-base)', color: tab === 'factory' ? factoryColor : 'var(--text-secondary)', fontWeight: tab === 'factory' ? 700 : 400 }}
        >
          🏭 공장 채팅
          {factoryUnread > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold py-[1px] px-[6px]" style={{ borderRadius: 99 }}>
              {factoryUnread}
            </span>
          )}
        </button>
      </div>


      {currentConvos.length === 0 ? (
        <div className="text-center px-6 py-12 bg-[var(--bg-base)] rounded-xl border border-[var(--border-light)]">
          <div className="text-[40px] mb-3">💬</div>
          <div className="text-sm text-[var(--text-secondary)]">
            {tab === 'seller' ? '아직 바이어 채팅이 없습니다' : '아직 공장 채팅이 없습니다'}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">
            {tab === 'seller'
              ? '바이어가 가입하면 자동으로 채팅방이 생성됩니다'
              : '공장이 가입하면 자동으로 채팅방이 생성됩니다'
            }
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {currentConvos.map((c) => {
            const unread = c.unread_count_md ?? 0;
            const name = tab === 'seller'
              ? (c.seller?.business_name ?? '셀러')
              : (c.factory?.company_name_ko ?? c.factory?.company_name ?? '공장');
            const grade = tab === 'seller' ? c.seller?.current_grade : null;
            const href = tab === 'seller'
              ? `/md/chat/seller/${c.id}`
              : `/md/chat/factory/${c.id}`;
            const isMyConvo = c.md_id === myMdId;

            return (
              <Link key={c.id} href={href} className="no-underline">
                <div className="bg-[var(--bg-base)] rounded-xl cursor-pointer py-[14px] px-4 shadow-[var(--shadow-xs)]" style={{ border: `1px solid ${unread > 0 ? accentColor : 'var(--border-light)'}` }}>
                  <div className="flex items-center gap-3">

                    <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-xl shrink-0" style={{ background: grade === 'vip' ? '#fef3c7' : `${accentColor}20` }}>
                      {tab === 'seller' ? (grade === 'vip' ? '👑' : '🏪') : '🏭'}
                    </div>


                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {name}
                          </span>
                          {isMyConvo && (
                            <span className="text-[10px] font-semibold py-[1px] px-[6px]" style={{ color: accentColor, background: `${accentColor}15`, borderRadius: 99 }}>
                              내 담당
                            </span>
                          )}
                          {unread > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-bold py-[1px] px-[6px]" style={{ borderRadius: 99 }}>
                              {unread}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                          {c.last_message_time ? new Date(c.last_message_time).toLocaleDateString('ko') : ''}
                        </span>
                      </div>
                      {c.last_message ? (
                        <div className="text-xs text-[var(--text-tertiary)] overflow-hidden text-ellipsis whitespace-nowrap">
                          {c.last_message.slice(0, 60)}
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-tertiary)] italic">
                          메시지 없음 — 먼저 인사해보세요
                        </div>
                      )}
                    </div>


                    <div className="text-[var(--text-tertiary)] text-lg shrink-0">›
              </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
