import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '자주 묻는 질문 (FAQ)',
  description: 'KERYX 서비스 이용 방법, 요금, 공장 매칭 프로세스에 관한 자주 묻는 질문과 답변.',
};

import { redirect } from 'next/navigation';
export default function FaqPage() {
  redirect('/support');
}
