import { redirect } from 'next/navigation';

// /membership 페이지는 삭제됨 - /pricing으로 리다이렉트
export default function MembershipPage() {
  redirect('/pricing');
}
