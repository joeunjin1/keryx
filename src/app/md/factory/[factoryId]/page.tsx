import { redirect } from 'next/navigation';
import { ArrowLeft, Factory } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { ChatThread } from '@/components/chat/ChatThread';
import LangText from '@/components/layout/LangText';

interface PageProps {
  params: { factoryId: string };
}

export default async function MdFactoryChatPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, role, name_ko, name_zh, staff_code')
    .eq('user_id', user.id)
    .single() as { data: any, error: any };
  if (!me || !['md', 'admin'].includes(me.role)) redirect('/admin');

  const { data: factory } = await supabase
    .from('factories')
    .select('id, factory_code, company_name, rating, total_orders, approval_status')
    .eq('id', params.factoryId)
    .single() as { data: any, error: any };

  if (!factory) {
    return <div className="p-8 text-center text-stone-500">공장을 찾을 수 없습니다.</div>;
  }

  // Get or create conversation
  const { data: conversationId } = await supabase.rpc('get_or_create_factory_conversation' as any, {
    p_md_internal_user_id: me.id,
    p_factory_id: factory.id,
  } as any);

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId as unknown as string)
    .order('created_at') as { data: any, error: any };

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-3xl mx-auto h-[calc(100vh-60px)]">
        <ChatThread
          conversationId={conversationId as unknown as string}
          viewerRole="md"
          mdName={me.name_ko ?? me.name_zh ?? me.staff_code}
          factoryName={`${factory.factory_code} ${factory.company_name}`}
          initialMessages={(messages ?? []) as any}
          quickReplies={[
            '请查看附件',
            '价格能再调整吗？',
            '打样多久？',
            '下周能确认订单吗？',
            '颜色能匹配这个吗？',
          ]}
        />
      </div>
    </main>
  );
}
