import { redirect } from 'next/navigation';
// /md/matching → /md/mvp/factory-matching으로 영구 리다이렉트
export default function MdMatchingRedirect() {
  redirect('/md/mvp/factory-matching');
}
