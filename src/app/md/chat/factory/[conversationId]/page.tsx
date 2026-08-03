import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ChatThread } from '@/components/chat/ChatThread';
import type { ChatMessage } from '@/components/chat/MessageBubble';

export default async function MdFactoryChatPage({ params }: { params: { conversationId: string } }) {
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
      id, factory_id, md_id, last_message_at,
      factory:factories(id, company_name, company_name_ko)
    `)
    .eq('id', params.conversationId)
    .not('factory_id', 'is', null)
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
  const factoryName = conversation.factory?.company_name_ko ?? conversation.factory?.company_name ?? '공장';
  const mdName = me?.name_ko ?? profile.display_name ?? 'MD';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>

      <div className="flex items-center gap-3 mb-3 border-b border-[var(--border-light)] py-3 px-0">
        <Link href="/md/chat" className="flex items-center gap-1.5 text-[var(--text-secondary)] no-underline text-[13px]">
          ← 채팅 목록
        </Link>
        <div className="flex-1">
          <div className="text-[15px] font-bold text-[var(--text-primary)]">
            🏭 {factoryName}
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)]">공장 1:1 채팅
              </div>
        </div>
      </div>


      <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border-light)]">
        <ChatThread
          conversationId={params.conversationId}
          viewerRole="md"
          factoryName={factoryName}
          mdName={mdName}
          initialMessages={initialMessages}
          quickReplies={['확인했습니다', '잠시 후 답변드리겠습니다', '샘플 검토 중입니다', '감사합니다']}
        />
      </div>
    </div>
  );
}
