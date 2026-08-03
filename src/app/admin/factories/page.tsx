import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공장 관리',
  description: '전체 파트너 공장 현황, 승인, 평가, 주문 이력을 관리합니다.',
};

import { createClient } from '@/lib/supabase/server';
import FactoriesClient from './FactoriesClient';

export default async function AdminFactoriesPage() {
  const supabase = createClient() as any;

  const { data: factories } = await supabase
    .from('factories')
    .select('id, factory_code, company_name, contact_name, contact_email, approval_status, avg_rating, total_orders, created_at')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false }) as { data: any[] };

  return <FactoriesClient factories={factories ?? []} />;
}
