import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공장 파트너 소개',
  description: 'KERYX 파트너 공장 네트워크 — 검증된 중국 공급사 목록과 전문 분야.',
};

import { redirect } from 'next/navigation';
export default function FactoryPartnerPage() {
  redirect('/signup?role=factory');
}
