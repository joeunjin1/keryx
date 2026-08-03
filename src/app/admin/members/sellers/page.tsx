import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '바이어 회원 관리',
  description: '등록된 바이어 회원 목록, 등급, 구독 현황을 관리합니다.',
};

import { createClient } from '@/lib/supabase/server';
import SellerApprovalClient from './SellerApprovalClient';

export default async function SellerMembersPage() {
  const supabase = createClient() as any;

  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, business_name, contact_name, contact_email, approval_status, current_membership, current_grade, created_at')
    .order('created_at', { ascending: false }) as { data: any[] };

  return <SellerApprovalClient sellers={sellers ?? []} />;
}
