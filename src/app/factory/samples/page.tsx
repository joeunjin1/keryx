import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '샘플 요청',
  description: '바이어로부터 접수된 샘플 요청 목록과 발송 현황을 관리합니다.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FactorySamplesClient from './FactorySamplesClient';

export default async function FactorySamplesPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=factory');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind, display_name')
    .eq('id', user.id)
    .single() as { data: any };

  const isAdmin = profile?.kind === 'admin' || profile?.kind === 'md';

  const { data: factory } = await supabase
    .from('factories')
    .select('id, factory_code, company_name')
    .eq('shared_login_user_id', user.id)
    .single() as { data: any };

  if (!factory && !isAdmin) redirect('/factory');

  // 샘플 요청 목록 조회
  const { data: samples } = await supabase
    .from('sample_requests')
    .select('id, status, notes, created_at, product:products(name_ko, name_zh, image_url)')
    .eq('factory_id', factory?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('created_at', { ascending: false }) as { data: any[] };

  return (
    <FactorySamplesClient
      samples={samples ?? []}
      factory={factory}
      isAdmin={isAdmin}
    />
  );
}
