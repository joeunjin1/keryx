import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주문 관리',
  description: '진행 중인 주문 현황과 납기, 수량, 결제 상태를 관리합니다.',
};

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FactoryOrdersClient from './FactoryOrdersClient';

export default async function FactoryOrdersPage() {
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

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_no, status, total_amount_cny, quantity, created_at, product:products(name_ko, name_zh)')
    .eq('factory_id', factory?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('created_at', { ascending: false }) as { data: any[] };

  return (
    <FactoryOrdersClient
      orders={orders ?? []}
      factory={factory}
      isAdmin={isAdmin}
    />
  );
}
