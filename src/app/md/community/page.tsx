export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MD 커뮤니티',
  description: 'MD 간 정보 공유, 공장 평가, 노하우를 교환하는 커뮤니티입니다.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';
import CommunityChat from '@/components/community/CommunityChat';

export default async function MdCommunityPage() {
  const brandColor = '#e11d48';
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=internal');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, display_name, preferred_language')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['md', 'admin'].includes(profile.kind)) redirect('/admin');

  const { data: me } = await supabase
    .from('internal_users')
    .select('id, name_ko, name_zh')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  const displayName = me?.name_ko ?? profile.display_name ?? 'MD';
  const lang = profile.preferred_language === 'zh' ? 'zh' : 'ko';

  return (
    <div>
          <div className="mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
          <LangText ko="커뮤니티 채팅" zh="社区聊天" />
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)]">
          <LangText ko="MD 및 바이어와 실시간으로 소통하세요" zh="与MD和买家实时沟通" />
        </p>
      </div>

      <CommunityChat
        userKind="md"
        userId={user.id}
        displayName={displayName}
        accentColor={brandColor}
        lang={lang}
      />
    </div>
  );
}
