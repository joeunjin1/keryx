import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ChatThread } from '@/components/chat/ChatThread';
import type { ChatMessage } from '@/components/chat/MessageBubble';

export default async function MdSellerChatPage({ params }: { params: { conversationId: string } }) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['md', 'admin', 'inspector'].includes(profile.kind)) redirect('/admin');

  const { data: me } = await supabase
    .from('internal_users').select('id, name_ko').eq('user_id', user.id).single() as { data: any; error: any };

  // 대화방 정보 조회
  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      id, seller_id, md_id, last_message_at,
      seller:sellers(id, business_name, current_grade,
        user:user_profiles(display_name))
    `)
    .eq('id', params.conversationId)
    .not('seller_id', 'is', null)
    .single() as { data: any; error: any };

  if (!conversation) redirect('/md/chat');

  // 메시지 목록 조회
  const { data: msgs } = await supabase
    .from('messages')
    .select('id, conversation_id, sender, sender_user_id, body_original, body_ko, body_zh, attachments, quick_reply, read_at, created_at')
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: true })
    .limit(100) as { data: any[]; error: any };

  const initialMessages: ChatMessage[] = msgs ?? [];
  const sellerName = conversation.seller?.business_name ?? '바이어(고객)';
  const mdName = me?.name_ko ?? profile.display_name ?? 'MD';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>

      <div className="flex items-center gap-3 mb-3 border-b border-[var(--border-light)] py-3 px-0">
        <Link href="/md/chat" className="flex items-center gap-1.5 text-[var(--text-secondary)] no-underline text-[13px]">
          ← 채팅 목록
        </Link>
        <div className="flex-1">
          <div className="text-[15px] font-bold text-[var(--text-primary)]">
            🏪 {sellerName}
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)]">바이어 1:1 채팅
              </div>
        </div>
        {conversation.seller?.current_grade === 'vip' && (
          <span className="text-[10px] text-amber-500 font-bold px-2 py-0.5 bg-[#fef3c715] border border-[#f59e0b40]" style={{ borderRadius: 99 }}>
            VIP
          </span>
        )}
      </div>


      <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border-light)]">
        <ChatThread
          conversationId={params.conversationId}
          viewerRole="md"
          sellerName={sellerName}
          mdName={mdName}
          initialMessages={initialMessages}
          quickReplies={['확인했습니다', '잠시 후 답변드리겠습니다', '샘플 준비 중입니다', '감사합니다']}
        />
      </div>
    </div>
  );
}
