import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공장 입점 신청',
  description: 'KERYX 마켓에 공급사로 입점하여 한국 바이어와 직접 거래하세요.',
};

import { redirect } from 'next/navigation';
export default function RegisterPage() {
  redirect('/signup');
}
